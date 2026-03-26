const express = require("express");
const rewardsService = require("../services/rewardsService");
const { rewardStatsQuerySchema } = require("../models/trade");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

function anonymizeWallet(wallet) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

router.get("/leaderboard", async (_req, res, next) => {
  try {
    const rows = await rewardsService.getLeaderboard(20);
    const data = rows.map((entry, index) => ({
      rank: index + 1,
      wallet: anonymizeWallet(entry.wallet),
      points: Number(entry.points),
      volume: Number(entry.volume_usd),
      tier: entry.tier
    }));

    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
});

router.get("/my-stats", async (req, res, next) => {
  try {
    const { wallet } = rewardStatsQuerySchema.parse(req.query);
    const stats = await rewardsService.getUserStats(wallet);
    const leaderboard = await rewardsService.getLeaderboard(100);
    const rankIndex = leaderboard.findIndex((entry) => entry.wallet === wallet.toLowerCase());

    return sendSuccess(res, {
      points: Number(stats.points),
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      tier: stats.tier,
      volumeToday: Number(stats.volume_usd),
      tradesTotal: Number(stats.trades_count)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

