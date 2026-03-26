const { Pool } = require("pg");

let pool;

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_order_id VARCHAR(66),
  sell_order_id VARCHAR(66),
  token_in VARCHAR(42),
  token_out VARCHAR(42),
  amount NUMERIC,
  settlement_price NUMERIC,
  buy_wallet VARCHAR(42),
  sell_wallet VARCHAR(42),
  tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  wallet VARCHAR(42) PRIMARY KEY,
  points NUMERIC DEFAULT 0,
  volume_usd NUMERIC DEFAULT 0,
  trades_count INTEGER DEFAULT 0,
  tier VARCHAR(20) DEFAULT 'Bronze',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  events TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function connect() {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  await pool.query("SELECT 1");
  await pool.query(schemaSql);

  return pool;
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error("PostgreSQL is not connected.");
  }

  return pool.query(text, params);
}

async function healthCheck() {
  await query("SELECT NOW()");
  return true;
}

module.exports = {
  connect,
  healthCheck,
  query
};

