const express = require("express");
const rateLimit = require("express-rate-limit");
const { getAddress } = require("ethers");

const { cancelOrderSchema, submitOrderSchema, walletQuerySchema } = require("../models/order");
const redisService = require("../services/redisService");
const web3Service = require("../services/web3Service");
const { verifySignature } = require("../middleware/auth");
const { decryptPayload, encryptPayload } = require("../utils/crypto");
const { getTokenDecimals, toPairLabel } = require("../config/tokens");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

function quoteForBase(baseAmountRaw, limitPriceRaw, baseTokenDecimals) {
  return (
    (BigInt(baseAmountRaw) * BigInt(limitPriceRaw)) /
    10n ** BigInt(baseTokenDecimals)
  ).toString();
}

function formatUnits(rawValue, decimals) {
  return Number(rawValue) / 10 ** decimals;
}

function sanitizeOrder(order) {
  return {
    orderId: order.orderId,
    status: order.status,
    tokenIn: order.tokenBase,
    tokenOut: order.tokenQuote,
    pair: order.pair,
    amount: order.displayRemainingBase,
    isBuy: order.isBuy,
    timestamp: order.timestamp,
    txHash: order.txHash || null
  };
}

router.post("/submit", submitLimiter, verifySignature, async (req, res, next) => {
  try {
    const payload = submitOrderSchema.parse(req.body);
    const walletAddress = getAddress(payload.walletAddress).toLowerCase();
    const tokenBase = getAddress(payload.tokenBase).toLowerCase();
    const tokenQuote = getAddress(payload.tokenQuote).toLowerCase();
    const onchainOrder = await web3Service.getOrder(payload.orderId);

    if (onchainOrder.trader !== walletAddress) {
      throw Object.assign(new Error("On-chain order trader mismatch."), {
        statusCode: 403,
        code: "ORDER_OWNER_MISMATCH"
      });
    }
    if (
      onchainOrder.tokenBase !== tokenBase ||
      onchainOrder.tokenQuote !== tokenQuote ||
      onchainOrder.isBuy !== payload.isBuy
    ) {
      throw Object.assign(new Error("On-chain order payload mismatch."), {
        statusCode: 400,
        code: "ORDER_CHAIN_MISMATCH"
      });
    }

    const baseTokenDecimals = getTokenDecimals(tokenBase);
    const quoteTokenDecimals = getTokenDecimals(tokenQuote);
    const timestamp = onchainOrder.timestamp
      ? new Date(onchainOrder.timestamp * 1000).toISOString()
      : new Date(payload.timestamp).toISOString();

    const order = {
      orderId: payload.orderId,
      txHash: payload.txHash,
      walletAddress,
      tokenBase,
      tokenQuote,
      baseAmountRaw: payload.baseAmount,
      remainingBaseRaw: payload.baseAmount,
      limitPriceRaw: payload.limitPrice,
      reservedQuoteRaw: payload.isBuy
        ? quoteForBase(payload.baseAmount, payload.limitPrice, baseTokenDecimals)
        : "0",
      displayBaseAmount: formatUnits(payload.baseAmount, baseTokenDecimals),
      displayRemainingBase: formatUnits(payload.baseAmount, baseTokenDecimals),
      displayLimitPrice: formatUnits(payload.limitPrice, quoteTokenDecimals),
      isBuy: payload.isBuy,
      status: "pending",
      timestamp,
      pair: toPairLabel(tokenBase, tokenQuote),
      nonce: payload.nonce,
      baseTokenDecimals,
      quoteTokenDecimals
    };

    await redisService.setOrder(payload.orderId, encryptPayload(order), 3600);
    await redisService.addToPendingSet(tokenBase, tokenQuote, payload.isBuy, payload.orderId);
    await redisService.addWalletOrder(walletAddress, payload.orderId);

    return sendSuccess(
      res,
      {
        orderId: payload.orderId,
        txHash: payload.txHash,
        status: "pending",
        timestamp
      },
      201
    );
  } catch (error) {
    next(error);
  }
});

router.get("/status/:orderId", async (req, res, next) => {
  try {
    const serialized = await redisService.getOrder(req.params.orderId);
    if (!serialized) {
      throw Object.assign(new Error("Order not found."), {
        statusCode: 404,
        code: "ORDER_NOT_FOUND"
      });
    }

    return sendSuccess(res, sanitizeOrder(decryptPayload(serialized)));
  } catch (error) {
    next(error);
  }
});

router.get("/my-orders", async (req, res, next) => {
  try {
    const { wallet } = walletQuerySchema.parse(req.query);
    const orderIds = await redisService.getWalletOrders(wallet);
    const orders = [];

    for (const orderId of orderIds) {
      const serialized = await redisService.getOrder(orderId);
      if (serialized) {
        orders.push(sanitizeOrder(decryptPayload(serialized)));
      }
    }

    orders.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));

    return sendSuccess(res, orders);
  } catch (error) {
    next(error);
  }
});

router.post("/cancel", verifySignature, async (req, res, next) => {
  try {
    const payload = cancelOrderSchema.parse(req.body);
    const serialized = await redisService.getOrder(payload.orderId);
    if (!serialized) {
      throw Object.assign(new Error("Order not found."), {
        statusCode: 404,
        code: "ORDER_NOT_FOUND"
      });
    }

    const order = decryptPayload(serialized);
    if (order.walletAddress !== getAddress(payload.walletAddress).toLowerCase()) {
      throw Object.assign(new Error("Order owner mismatch."), {
        statusCode: 403,
        code: "ORDER_OWNER_MISMATCH"
      });
    }

    const onchainOrder = await web3Service.getOrder(payload.orderId);
    if (!onchainOrder.cancelled) {
      throw Object.assign(new Error("On-chain order is not cancelled yet."), {
        statusCode: 409,
        code: "ORDER_NOT_CANCELLED_ONCHAIN"
      });
    }

    order.status = "cancelled";
    order.txHash = payload.txHash;
    order.cancelledAt = new Date().toISOString();

    await redisService.setOrder(payload.orderId, encryptPayload(order), 3600);
    await redisService.removeFromPendingSet(
      order.tokenBase,
      order.tokenQuote,
      order.isBuy,
      payload.orderId
    );

    return sendSuccess(res, { success: true, txHash: payload.txHash });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
