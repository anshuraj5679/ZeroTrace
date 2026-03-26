const express = require("express");
const { historyQuerySchema } = require("../models/trade");
const postgresService = require("../services/postgresService");
const redisService = require("../services/redisService");
const { sendSuccess } = require("../utils/response");
const { toPairLabel } = require("../config/tokens");

const router = express.Router();

router.get("/history", async (req, res, next) => {
  try {
    const { wallet, limit, page } = historyQuerySchema.parse(req.query);
    const offset = (page - 1) * limit;

    const params = [];
    let whereClause = "";
    if (wallet) {
      params.push(wallet.toLowerCase());
      whereClause = "WHERE buy_wallet = $1 OR sell_wallet = $1";
    }

    params.push(limit, offset);

    const query = `
      SELECT id, token_in, token_out, amount, settlement_price, created_at
      FROM trades
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const result = await postgresService.query(query, params);
    const data = result.rows.map((trade) => ({
      tradeId: trade.id,
      pair: toPairLabel(trade.token_in, trade.token_out),
      tokenIn: trade.token_in,
      tokenOut: trade.token_out,
      amount: Number(trade.amount),
      settlementPrice: Number(trade.settlement_price),
      timestamp: trade.created_at
    }));

    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const volumeResult = await postgresService.query(
      `
        SELECT
          COALESCE(SUM(amount * settlement_price), 0) AS total_volume_24h,
          COUNT(*) AS total_trades_24h
        FROM trades
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `
    );
    const topPairsResult = await postgresService.query(
      `
        SELECT token_in, token_out, COALESCE(SUM(amount * settlement_price), 0) AS volume
        FROM trades
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY token_in, token_out
        ORDER BY volume DESC
        LIMIT 5
      `
    );
    const totalStatsResult = await postgresService.query(
      `
        SELECT
          COALESCE(SUM(amount * settlement_price), 0) AS total_volume_all_time,
          COUNT(*) AS total_trades_all_time,
          COUNT(DISTINCT buy_wallet) + COUNT(DISTINCT sell_wallet) AS unique_wallets
        FROM trades
      `
    );
    const activeOrders = await redisService.getActiveOrdersCount();

    const data = {
      totalVolume24h: Number(volumeResult.rows[0]?.total_volume_24h || 0),
      totalTrades24h: Number(volumeResult.rows[0]?.total_trades_24h || 0),
      activeOrders: Number(activeOrders),
      totalVolumeAllTime: Number(totalStatsResult.rows[0]?.total_volume_all_time || 0),
      totalTradesAllTime: Number(totalStatsResult.rows[0]?.total_trades_all_time || 0),
      uniqueWallets: Number(totalStatsResult.rows[0]?.unique_wallets || 0),
      topPairs: topPairsResult.rows.map((row) => ({
        pair: toPairLabel(row.token_in, row.token_out),
        volume: Number(row.volume)
      }))
    };

    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
