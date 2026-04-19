const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env")
});

const axios = require("axios");
const {
  Encryptable,
  createCofheClient,
  createCofheConfig
} = require("@cofhe/sdk/node");
const { Ethers6Adapter } = require("@cofhe/sdk/adapters");
const { arbSepolia, hardhat, sepolia } = require("@cofhe/sdk/chains");
const {
  Contract,
  JsonRpcProvider,
  Wallet,
  parseEther,
  parseUnits,
  solidityPackedKeccak256
} = require("ethers");

const { buildAuthMessage } = require("../middleware/auth");

const apiBaseUrl = process.env.MARKET_MAKER_API_URL || "http://localhost:4000";
const coingeckoApi = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
const orderSize = Number(process.env.MM_ORDER_SIZE || "0.1");
const spreadBps = Number(process.env.MM_SPREAD_BPS || "10");
const tickMs = Number(process.env.MM_TICK_MS || "30000");
const fallbackReferencePrice = 3000;

const zeroTraceAbi = [
  "function submitOrder(bytes32 orderId, address tokenBase, address tokenQuote, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedBaseAmount, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedLimitPrice, bool isBuy)"
];

const privateTokenAbi = [
  "function approveEncrypted(address spender, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedAmount) returns (bool)",
  "function mintEncrypted(address to, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedAmount)"
];

let provider;
let cofheContextPromise;
let tickInProgress = false;

function loadDeploymentConfig() {
  const deploymentsPath = path.resolve(__dirname, "../../../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    return {};
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  return deployments["eth-sepolia"] || deployments.hardhat || {};
}

const deploymentConfig = loadDeploymentConfig();

const runtimeConfig = {
  apiBaseUrl,
  coingeckoApi,
  orderSize,
  rpcUrl: process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "",
  mmPrivateKey: process.env.MM_PRIVATE_KEY || "",
  zeroTraceAddress: process.env.ZEROTRACE_CONTRACT_ADDRESS || deploymentConfig.ZeroTrace || "",
  zusdcAddress: process.env.ZUSDC_ADDRESS || deploymentConfig.ZUSDC || "",
  zethAddress: process.env.ZETH_ADDRESS || deploymentConfig.ZETH || ""
};

function describeError(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    String(error)
  );
}

function validateConfig() {
  const missing = [
    ["MM_PRIVATE_KEY", runtimeConfig.mmPrivateKey],
    ["RPC_URL", runtimeConfig.rpcUrl],
    ["ZEROTRACE_CONTRACT_ADDRESS", runtimeConfig.zeroTraceAddress],
    ["ZUSDC_ADDRESS", runtimeConfig.zusdcAddress],
    ["ZETH_ADDRESS", runtimeConfig.zethAddress]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  if (!Number.isFinite(runtimeConfig.orderSize) || runtimeConfig.orderSize <= 0) {
    throw new Error("MM_ORDER_SIZE must be a positive number.");
  }

  if (!Number.isFinite(spreadBps) || spreadBps <= 0 || spreadBps >= 10_000) {
    throw new Error("MM_SPREAD_BPS must be between 1 and 9999.");
  }

  if (!Number.isFinite(tickMs) || tickMs < 5_000) {
    throw new Error("MM_TICK_MS must be at least 5000.");
  }
}

function getProvider() {
  if (!provider) {
    provider = new JsonRpcProvider(runtimeConfig.rpcUrl);
  }

  return provider;
}

function quoteForBase(baseAmountRaw, limitPriceRaw, baseTokenDecimals) {
  return (baseAmountRaw * limitPriceRaw) / 10n ** BigInt(baseTokenDecimals);
}

function createNodeCofheConfig() {
  return createCofheConfig({
    supportedChains: [hardhat, sepolia, arbSepolia],
    fheKeyStorage: null,
    mocks: {
      decryptDelay: 0,
      encryptDelay: 0
    }
  });
}

async function createCofheContext(wallet) {
  const nextProvider = getProvider();
  const signer = wallet.connect(nextProvider);
  const client = createCofheClient(createNodeCofheConfig());
  const { publicClient, walletClient } = await Ethers6Adapter(nextProvider, signer);

  await client.connect(publicClient, walletClient);

  return { client, signer };
}

async function getCofheContext(wallet) {
  if (!cofheContextPromise) {
    cofheContextPromise = createCofheContext(wallet).catch((error) => {
      cofheContextPromise = undefined;
      throw error;
    });
  }

  return cofheContextPromise;
}

async function encryptUint128(client, value) {
  const [encrypted] = await client.encryptInputs([Encryptable.uint128(value)]).execute();
  return encrypted;
}

async function ensureApiAvailable() {
  await axios.get(`${runtimeConfig.apiBaseUrl}/api/v1/status`, {
    timeout: 5000
  });
}

async function placeOrder(wallet, side, price) {
  const { client, signer } = await getCofheContext(wallet);
  const zeroTrace = new Contract(runtimeConfig.zeroTraceAddress, zeroTraceAbi, signer);
  const zusdc = new Contract(runtimeConfig.zusdcAddress, privateTokenAbi, signer);
  const zeth = new Contract(runtimeConfig.zethAddress, privateTokenAbi, signer);
  const nonce = `${side}-${Date.now()}`;
  const orderTimestamp = Date.now();
  const baseAmountRaw = parseEther(runtimeConfig.orderSize.toString());
  const limitPriceRaw = parseUnits(price.toFixed(6), 6);
  const approvalAmount =
    side === "buy"
      ? quoteForBase(baseAmountRaw, limitPriceRaw, 18)
      : baseAmountRaw;
  const orderId = solidityPackedKeccak256(
    ["address", "address", "address", "uint256", "uint256", "bool", "string", "uint256"],
    [
      wallet.address,
      runtimeConfig.zethAddress,
      runtimeConfig.zusdcAddress,
      baseAmountRaw,
      limitPriceRaw,
      side === "buy",
      nonce,
      BigInt(orderTimestamp)
    ]
  );

  const encryptedFundingAmount = await encryptUint128(client, approvalAmount);
  const encryptedApprovalAmount = await encryptUint128(client, approvalAmount);
  const encryptedBaseAmount = await encryptUint128(client, baseAmountRaw);
  const encryptedLimitPrice = await encryptUint128(client, limitPriceRaw);

  if (side === "buy") {
    await (await zusdc.mintEncrypted(wallet.address, encryptedFundingAmount)).wait();
    await (
      await zusdc.approveEncrypted(runtimeConfig.zeroTraceAddress, encryptedApprovalAmount)
    ).wait();
  } else {
    await (await zeth.mintEncrypted(wallet.address, encryptedFundingAmount)).wait();
    await (
      await zeth.approveEncrypted(runtimeConfig.zeroTraceAddress, encryptedApprovalAmount)
    ).wait();
  }

  const tx = await zeroTrace.submitOrder(
    orderId,
    runtimeConfig.zethAddress,
    runtimeConfig.zusdcAddress,
    encryptedBaseAmount,
    encryptedLimitPrice,
    side === "buy"
  );
  await tx.wait();

  const authTimestamp = Date.now();
  const signature = await wallet.signMessage(buildAuthMessage(nonce, authTimestamp));
  const body = {
    walletAddress: wallet.address,
    orderId,
    txHash: tx.hash,
    tokenBase: runtimeConfig.zethAddress,
    tokenQuote: runtimeConfig.zusdcAddress,
    isBuy: side === "buy",
    signature,
    nonce,
    timestamp: authTimestamp
  };

  const response = await axios.post(`${runtimeConfig.apiBaseUrl}/api/v1/order/submit`, body, {
    timeout: 10000
  });
  return response.data.data;
}

async function fetchEthPrice() {
  try {
    const response = await axios.get(`${runtimeConfig.coingeckoApi}/simple/price`, {
      params: {
        ids: "ethereum",
        vs_currencies: "usd"
      },
      timeout: 5000
    });
    const price = Number(response.data?.ethereum?.usd);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Invalid ETH price response.");
    }

    return price;
  } catch (error) {
    console.warn(
      `[MarketMaker] price feed unavailable, using fallback ${fallbackReferencePrice}: ${describeError(error)}`
    );
    return fallbackReferencePrice;
  }
}

async function tick(wallet) {
  if (tickInProgress) {
    return;
  }

  tickInProgress = true;

  try {
    await ensureApiAvailable();

    const referencePrice = await fetchEthPrice();
    const spread = spreadBps / 10_000;
    const buyPrice = Number((referencePrice * (1 - spread)).toFixed(6));
    const sellPrice = Number((referencePrice * (1 + spread)).toFixed(6));

    await placeOrder(wallet, "buy", buyPrice);
    console.log(`[MarketMaker] placed BUY at ${buyPrice}`);

    await placeOrder(wallet, "sell", sellPrice);
    console.log(`[MarketMaker] placed SELL at ${sellPrice}`);
  } catch (error) {
    console.error("[MarketMaker]", describeError(error));
  } finally {
    tickInProgress = false;
  }
}

function scheduleNextTick(wallet) {
  setTimeout(() => {
    void tick(wallet).finally(() => {
      scheduleNextTick(wallet);
    });
  }, tickMs);
}

async function main() {
  validateConfig();

  const wallet = new Wallet(runtimeConfig.mmPrivateKey);
  console.log(
    `[MarketMaker] starting for ${runtimeConfig.zethAddress}/${runtimeConfig.zusdcAddress} via ${runtimeConfig.apiBaseUrl}`
  );

  await tick(wallet);
  scheduleNextTick(wallet);
}

main().catch((error) => {
  console.error("[MarketMaker]", describeError(error));
});
