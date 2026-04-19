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

async function getOrderHandles(orderId) {
  try {
    const handles = await web3Service.getOrderCiphertexts(orderId);

    return {
      remainingBaseHandle: handles.remainingBase.toString(),
      limitPriceHandle: handles.limitPrice.toString()
    };
  } catch {
    return {
      remainingBaseHandle: null,
      limitPriceHandle: null
    };
  }
}

function sanitizeOrder(order, handles) {
  return {
    orderId: order.orderId,
    status: order.status,
    tokenIn: order.tokenBase,
    tokenOut: order.tokenQuote,
    pair: order.pair,
    amount: null,
    isBuy: order.isBuy,
    timestamp: order.timestamp,
    txHash: order.txHash || null,
    remainingBaseHandle: handles.remainingBaseHandle,
    limitPriceHandle: handles.limitPriceHandle,
    baseTokenDecimals: order.baseTokenDecimals,
    quoteTokenDecimals: order.quoteTokenDecimals
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
      isBuy: payload.isBuy,
      status: "pending",
      timestamp,
      pair: toPairLabel(tokenBase, tokenQuote),
      nonce: payload.nonce,
      baseTokenDecimals,
      quoteTokenDecimals,
      baseAmountRaw: payload.baseAmountRaw || null,
      limitPriceRaw: payload.limitPriceRaw || null
    };

    await redisService.setOrder(payload.orderId, encryptPayload(order));
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

    const order = decryptPayload(serialized);
    return sendSuccess(res, sanitizeOrder(order, await getOrderHandles(order.orderId)));
  } catch (error) {
    next(error);
  }
});

router.get("/my-orders", async (req, res, next) => {
  try {
    const { wallet } = walletQuerySchema.parse(req.query);
    const orderIds = await redisService.getWalletOrders(wallet);
    const orders = (
      await Promise.all(
        orderIds.map(async (orderId) => {
          const serialized = await redisService.getOrder(orderId);
          if (!serialized) {
            return null;
          }

          const order = decryptPayload(serialized);
          return sanitizeOrder(order, await getOrderHandles(order.orderId));
        })
      )
    ).filter(Boolean);

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

    await redisService.setOrder(payload.orderId, encryptPayload(order));
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
