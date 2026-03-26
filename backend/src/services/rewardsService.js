const postgresService = require("./postgresService");

function getTier(points) {
  if (points >= 10000) {
    return "Platinum";
  }
  if (points >= 2000) {
    return "Gold";
  }
  if (points >= 500) {
    return "Silver";
  }
  return "Bronze";
}

async function recordSingleTrade(wallet, volumeUSD) {
  const normalizedVolume = Number(volumeUSD);
  const currentResult = await postgresService.query(
    "SELECT points, volume_usd, trades_count FROM rewards WHERE wallet = $1",
    [wallet.toLowerCase()]
  );

  const todayTradesResult = await postgresService.query(
    `
      SELECT COUNT(*)::int AS count
      FROM trades
      WHERE (buy_wallet = $1 OR sell_wallet = $1)
        AND created_at::date = CURRENT_DATE
    `,
    [wallet.toLowerCase()]
  );

  const currentPoints = Number(currentResult.rows[0]?.points || 0);
  const currentVolume = Number(currentResult.rows[0]?.volume_usd || 0);
  const currentTrades = Number(currentResult.rows[0]?.trades_count || 0);
  const todayTrades = Number(todayTradesResult.rows[0]?.count || 0);
  const bonusMultiplier = todayTrades < 100 ? 3 : 1;
  const pointsEarned = Math.floor(normalizedVolume / 10) * bonusMultiplier;
  const updatedPoints = currentPoints + pointsEarned;

  await postgresService.query(
    `
      INSERT INTO rewards (wallet, points, volume_usd, trades_count, tier, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (wallet)
      DO UPDATE SET
        points = $2,
        volume_usd = $3,
        trades_count = $4,
        tier = $5,
        updated_at = NOW()
    `,
    [
      wallet.toLowerCase(),
      updatedPoints,
      currentVolume + normalizedVolume,
      currentTrades + 1,
      getTier(updatedPoints)
    ]
  );
}

async function recordTrade(buyWallet, sellWallet, volumeUSD) {
  await recordSingleTrade(buyWallet, volumeUSD);
  await recordSingleTrade(sellWallet, volumeUSD);
}

async function getLeaderboard(limit = 20) {
  const result = await postgresService.query(
    `
      SELECT wallet, points, volume_usd, trades_count, tier
      FROM rewards
      ORDER BY points DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

async function getUserStats(wallet) {
  const result = await postgresService.query(
    `
      SELECT wallet, points, volume_usd, trades_count, tier
      FROM rewards
      WHERE wallet = $1
    `,
    [wallet.toLowerCase()]
  );

  return (
    result.rows[0] || {
      wallet: wallet.toLowerCase(),
      points: 0,
      volume_usd: 0,
      trades_count: 0,
      tier: "Bronze"
    }
  );
}

module.exports = {
  getLeaderboard,
  getTier,
  getUserStats,
  recordTrade
};

