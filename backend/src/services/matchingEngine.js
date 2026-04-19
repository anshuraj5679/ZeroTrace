const postgresService = require("./postgresService");
const redisService = require("./redisService");
const rewardsService = require("./rewardsService");
const webhookService = require("./webhookService");
const web3Service = require("./web3Service");
const cofheService = require("./cofheService");
const { formatUnits: formatTokenUnits, id: hashId } = require("ethers");
const { decryptPayload, encryptPayload } = require("../utils/crypto");
const { getTokenDecimals, toPairLabel } = require("../config/tokens");

let intervalHandle;
let cycleInProgress = false;
const softMatchesEnabled = process.env.DEMO_SOFT_MATCHES === "true";

function quoteForBase(baseAmountRaw, limitPriceRaw, baseTokenDecimals) {
  return (
    (BigInt(baseAmountRaw) * BigInt(limitPriceRaw)) /
    10n ** BigInt(baseTokenDecimals)
  ).toString();
}

function formatDisplayUnits(rawValue, decimals) {
  return formatTokenUnits(BigInt(rawValue), decimals);
}

function formatUnitsAsNumber(rawValue, decimals) {
  return Number(formatDisplayUnits(rawValue, decimals));
}

async function loadOrder(orderId) {
  const serialized = await redisService.getOrder(orderId);
  if (!serialized) {
    return null;
  }

  return decryptPayload(serialized);
}

async function persistOrder(order) {
  const { matchState, ...persistedOrder } = order;
  await redisService.setOrder(order.orderId, encryptPayload(persistedOrder));
}

function buildSoftMatchHash(buyOrderId, sellOrderId) {
  return hashId(`${buyOrderId}:${sellOrderId}:${Date.now()}`);
}

async function removeInactiveOrder(order, nextStatus) {
  order.status = nextStatus;
  if (nextStatus === "cancelled" && !order.cancelledAt) {
    order.cancelledAt = new Date().toISOString();
  }
  if (nextStatus === "executed" && !order.executedAt) {
    order.executedAt = new Date().toISOString();
  }
  if (nextStatus === "empty" && !order.emptyAt) {
    order.emptyAt = new Date().toISOString();
  }

  await persistOrder(order);
  await redisService.removeFromPendingSet(
    order.tokenBase,
    order.tokenQuote,
    order.isBuy,
    order.orderId
  );
}

async function loadActiveOrder(orderId) {
  const order = await loadOrder(orderId);
  if (!order || (order.status !== "pending" && order.status !== "matched")) {
    return null;
  }

  const onchainOrder = await web3Service.getOrder(orderId);
  if (onchainOrder.cancelled) {
    await removeInactiveOrder(order, "cancelled");
    return null;
  }

  if (onchainOrder.closed) {
    await removeInactiveOrder(order, "executed");
    return null;
  }

  return order;
}

function sortBuys(left, right) {
  if (BigInt(left.matchState.limitPriceRaw) === BigInt(right.matchState.limitPriceRaw)) {
    return 0;
  }

  return BigInt(left.matchState.limitPriceRaw) < BigInt(right.matchState.limitPriceRaw) ? 1 : -1;
}

function sortSells(left, right) {
  if (BigInt(left.matchState.limitPriceRaw) === BigInt(right.matchState.limitPriceRaw)) {
    return 0;
  }

  return BigInt(left.matchState.limitPriceRaw) > BigInt(right.matchState.limitPriceRaw) ? 1 : -1;
}

async function hydrateMatchState(order) {
  try {
    const handles = await web3Service.getOrderCiphertexts(order.orderId);
    const [remainingBaseResult, limitPriceResult] = await Promise.all([
      cofheService.decryptUint128ForTx(handles.remainingBase),
      cofheService.decryptUint128ForTx(handles.limitPrice)
    ]);

    return {
      ...order,
      matchState: {
        remainingBaseRaw: remainingBaseResult.decryptedValue.toString(),
        remainingBaseSig: remainingBaseResult.signature,
        limitPriceRaw: limitPriceResult.decryptedValue.toString(),
        limitPriceSig: limitPriceResult.signature,
        fromCoFHE: true
      }
    };
  } catch (error) {
    if (!softMatchesEnabled) {
      throw error;
    }

    // Soft-match fallback: use the order's submitted values from Redis
    if (order.baseAmountRaw && order.limitPriceRaw) {
      console.warn(
        `[MatchEngine] CoFHE unavailable for ${order.orderId.slice(0, 10)}…, using soft-match fallback`
      );
      return {
        ...order,
        matchState: {
          remainingBaseRaw: order.baseAmountRaw,
          remainingBaseSig: null,
          limitPriceRaw: order.limitPriceRaw,
          limitPriceSig: null,
          fromCoFHE: false
        }
      };
    }

    console.error(`[MatchEngine] decrypt failed and no fallback data for ${order.orderId.slice(0, 10)}…: ${error.message}`);
    return null;
  }
}

async function processPair(tokenBase, tokenQuote) {
  const buyOrderIds = await redisService.getPendingOrders(tokenBase, tokenQuote, true);
  const sellOrderIds = await redisService.getPendingOrders(tokenBase, tokenQuote, false);

  const buys = [];
  const sells = [];

  for (const orderId of buyOrderIds) {
    const order = await loadActiveOrder(orderId);
    if (order) {
      const hydrated = await hydrateMatchState(order);
      if (!hydrated) continue;
      if (BigInt(hydrated.matchState.remainingBaseRaw) === 0n) {
        await removeInactiveOrder(hydrated, "empty");
      } else {
        buys.push(hydrated);
      }
    }
  }

  for (const orderId of sellOrderIds) {
    const order = await loadActiveOrder(orderId);
    if (order) {
      const hydrated = await hydrateMatchState(order);
      if (!hydrated) continue;
      if (BigInt(hydrated.matchState.remainingBaseRaw) === 0n) {
        await removeInactiveOrder(hydrated, "empty");
      } else {
        sells.push(hydrated);
      }
    }
  }

  buys.sort(sortBuys);
  sells.sort(sortSells);

  let matches = 0;

  while (buys.length > 0 && sells.length > 0) {
    const buyOrder = buys[0];
    const sellOrder = sells[0];

    if (BigInt(buyOrder.matchState.limitPriceRaw) < BigInt(sellOrder.matchState.limitPriceRaw)) {
      break;
    }

    const baseDecimals = getTokenDecimals(tokenBase);
    const quoteDecimals = getTokenDecimals(tokenQuote);
    const matchedBaseRaw =
      BigInt(buyOrder.matchState.remainingBaseRaw) < BigInt(sellOrder.matchState.remainingBaseRaw)
        ? BigInt(buyOrder.matchState.remainingBaseRaw)
        : BigInt(sellOrder.matchState.remainingBaseRaw);
    const settlementPriceRaw =
      (BigInt(buyOrder.matchState.limitPriceRaw) + BigInt(sellOrder.matchState.limitPriceRaw)) / 2n;
    const quoteSpentRaw = quoteForBase(
      matchedBaseRaw.toString(),
      settlementPriceRaw.toString(),
      baseDecimals
    );
    const buyRemainingAfterRaw = (
      BigInt(buyOrder.matchState.remainingBaseRaw) - matchedBaseRaw
    ).toString();
    const sellRemainingAfterRaw = (
      BigInt(sellOrder.matchState.remainingBaseRaw) - matchedBaseRaw
    ).toString();
    const buyFilled = BigInt(buyRemainingAfterRaw) === 0n;
    const sellFilled = BigInt(sellRemainingAfterRaw) === 0n;

    let txHash;
    try {
      txHash = await web3Service.executeMatch(
        buyOrder.orderId,
        sellOrder.orderId,
        {
          buyRemainingBase: buyOrder.matchState.remainingBaseRaw,
          buyRemainingBaseSig: buyOrder.matchState.remainingBaseSig,
          sellRemainingBase: sellOrder.matchState.remainingBaseRaw,
          sellRemainingBaseSig: sellOrder.matchState.remainingBaseSig,
          buyLimitPrice: buyOrder.matchState.limitPriceRaw,
          buyLimitPriceSig: buyOrder.matchState.limitPriceSig,
          sellLimitPrice: sellOrder.matchState.limitPriceRaw,
          sellLimitPriceSig: sellOrder.matchState.limitPriceSig
        }
      );
    } catch (error) {
      const [activeBuy, activeSell] = await Promise.all([
        loadActiveOrder(buyOrder.orderId),
        loadActiveOrder(sellOrder.orderId)
      ]);

      if (!activeBuy) {
        buys.shift();
      }
      if (!activeSell) {
        sells.shift();
      }
      if (activeBuy && activeSell) {
        if (!softMatchesEnabled) {
          throw error;
        }

        txHash = buildSoftMatchHash(buyOrder.orderId, sellOrder.orderId);
        console.warn(
          `[MatchEngine] using demo soft match for ${buyOrder.orderId}/${sellOrder.orderId}: ${error.message}`
        );
      } else {
        continue;
      }
    }

    buyOrder.matchState.remainingBaseRaw = buyRemainingAfterRaw;
    sellOrder.matchState.remainingBaseRaw = sellRemainingAfterRaw;

    buyOrder.status = buyFilled ? "executed" : "matched";
    buyOrder.txHash = txHash;
    buyOrder.executedAt = new Date().toISOString();

    sellOrder.status = sellFilled ? "executed" : "matched";
    sellOrder.txHash = txHash;
    sellOrder.executedAt = new Date().toISOString();

    await persistOrder(buyOrder);
    await persistOrder(sellOrder);

    if (buyFilled) {
      await redisService.removeFromPendingSet(
        buyOrder.tokenBase,
        buyOrder.tokenQuote,
        true,
        buyOrder.orderId
      );
    }

    if (sellFilled) {
      await redisService.removeFromPendingSet(
        sellOrder.tokenBase,
        sellOrder.tokenQuote,
        false,
        sellOrder.orderId
      );
    }

    const matchedBase = formatUnitsAsNumber(matchedBaseRaw.toString(), baseDecimals);
    const settlementPrice = formatUnitsAsNumber(settlementPriceRaw.toString(), quoteDecimals);
    const volumeUsd = matchedBase * settlementPrice;

    const tradeData = {
      buyOrderId: buyOrder.orderId,
      sellOrderId: sellOrder.orderId,
      tokenIn: tokenBase,
      tokenOut: tokenQuote,
      amount: matchedBase,
      settlementPrice,
      buyWallet: buyOrder.walletAddress.toLowerCase(),
      sellWallet: sellOrder.walletAddress.toLowerCase(),
      txHash
    };

    await postgresService.query(
      `
        INSERT INTO trades (
          buy_order_id,
          sell_order_id,
          token_in,
          token_out,
          amount,
          settlement_price,
          buy_wallet,
          sell_wallet,
          tx_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        tradeData.buyOrderId,
        tradeData.sellOrderId,
        tradeData.tokenIn,
        tradeData.tokenOut,
        tradeData.amount,
        tradeData.settlementPrice,
        tradeData.buyWallet,
        tradeData.sellWallet,
        tradeData.txHash
      ]
    );

    await rewardsService.recordTrade(buyOrder.walletAddress, sellOrder.walletAddress, volumeUsd);
    await webhookService.fire("trade.executed", tradeData);

    if (buyFilled) {
      buys.shift();
    }
    if (sellFilled) {
      sells.shift();
    }
    if (!buyFilled) {
      buys.sort(sortBuys);
    }
    if (!sellFilled) {
      sells.sort(sortSells);
    }

    matches += 1;
  }

  if (matches > 0) {
    console.log(`[MatchEngine] Matched ${matches} trades for pair ${toPairLabel(tokenBase, tokenQuote)}`);
  }
}

async function runCycle() {
  if (cycleInProgress) {
    return;
  }

  cycleInProgress = true;

  try {
    const pairs = await redisService.getAllPairs();
    for (const pair of pairs) {
      await processPair(pair.tokenA, pair.tokenB);
    }
  } catch (error) {
    console.error("[MatchEngine]", error.message);
  } finally {
    cycleInProgress = false;
  }
}

function startMatchingEngine() {
  if (intervalHandle) {
    return intervalHandle;
  }

  intervalHandle = setInterval(runCycle, 5000);
  return intervalHandle;
}

module.exports = {
  runCycle,
  startMatchingEngine
};
