const { createClient } = require("redis");

let client;

function ensureClient() {
  if (!client) {
    throw new Error("Redis is not connected.");
  }

  return client;
}

function pairKey(tokenA, tokenB) {
  return `${tokenA.toLowerCase()}|${tokenB.toLowerCase()}`;
}

function directionalKey(tokenBase, tokenQuote, side) {
  return `orders:pending:${tokenBase.toLowerCase()}:${tokenQuote.toLowerCase()}:${side}`;
}

async function connect() {
  if (client?.isOpen) {
    return client;
  }

  client = createClient({
    url: process.env.REDIS_URL
  });

  client.on("error", (error) => {
    console.error("[Redis]", error.message);
  });

  await client.connect();
  return client;
}

async function setOrder(orderId, encryptedData, ttl) {
  if (ttl == null) {
    await ensureClient().set(`order:${orderId}`, encryptedData);
    return;
  }

  await ensureClient().set(`order:${orderId}`, encryptedData, { EX: ttl });
}

async function getOrder(orderId) {
  return ensureClient().get(`order:${orderId}`);
}

async function deleteOrder(orderId) {
  await ensureClient().del(`order:${orderId}`);
}

async function addToPendingSet(tokenBase, tokenQuote, isBuy, orderId) {
  const redis = ensureClient();
  await redis.sAdd(directionalKey(tokenBase, tokenQuote, isBuy ? "buy" : "sell"), orderId);
  await redis.sAdd("orders:pairs", pairKey(tokenBase, tokenQuote));
  await redis.sAdd("orders:active", orderId);
}

async function getPendingOrders(tokenBase, tokenQuote, isBuy) {
  return ensureClient().sMembers(
    directionalKey(tokenBase, tokenQuote, isBuy ? "buy" : "sell")
  );
}

async function removeFromPendingSet(tokenBase, tokenQuote, isBuy, orderId) {
  const redis = ensureClient();
  await redis.sRem(directionalKey(tokenBase, tokenQuote, isBuy ? "buy" : "sell"), orderId);
  await redis.sRem("orders:active", orderId);
}

async function addWalletOrder(wallet, orderId) {
  await ensureClient().sAdd(`orders:wallet:${wallet.toLowerCase()}`, orderId);
}

async function getWalletOrders(wallet) {
  return ensureClient().sMembers(`orders:wallet:${wallet.toLowerCase()}`);
}

async function getAllPairs() {
  const pairs = await ensureClient().sMembers("orders:pairs");
  return pairs
    .map((pair) => pair.split("|"))
    .filter((pair) => pair.length === 2)
    .map(([tokenA, tokenB]) => ({ tokenA, tokenB }));
}

async function getActiveOrdersCount() {
  return ensureClient().sCard("orders:active");
}

module.exports = {
  addToPendingSet,
  addWalletOrder,
  connect,
  deleteOrder,
  getActiveOrdersCount,
  getAllPairs,
  getOrder,
  getPendingOrders,
  getWalletOrders,
  removeFromPendingSet,
  setOrder
};
