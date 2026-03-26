require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env")
});

const axios = require("axios");
const {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  Wallet,
  parseEther,
  parseUnits,
  solidityPackedKeccak256
} = require("ethers");
const { cofhejs, Encryptable } = require("cofhejs/node");

const { buildAuthMessage } = require("../middleware/auth");

const apiBaseUrl = process.env.MARKET_MAKER_API_URL || "http://localhost:4000";
const coingeckoApi = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
const orderSize = Number(process.env.MM_ORDER_SIZE || "0.1");

const zeroTraceAbi = [
  "function submitOrder(bytes32 orderId, address tokenBase, address tokenQuote, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedBaseAmount, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedLimitPrice, bool isBuy)"
];

const privateTokenAbi = [
  "function approveEncrypted(address spender, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedAmount) returns (bool)",
  "function mintEncrypted(address to, tuple(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encryptedAmount)"
];

function quoteForBase(baseAmountRaw, limitPriceRaw, baseTokenDecimals) {
  return (baseAmountRaw * limitPriceRaw) / 10n ** BigInt(baseTokenDecimals);
}

async function encryptUint128(value) {
  const result = await cofhejs.encrypt([Encryptable.uint128(value)]);
  if (!result.success) {
    throw result.error;
  }
  return result.data[0];
}

async function initializeCofhe(wallet) {
  const provider = new JsonRpcProvider(process.env.RPC_URL || process.env.SEPOLIA_RPC_URL);
  const signer = wallet.connect(provider);
  const network = await provider.getNetwork();
  const result = await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: signer,
    environment: network.chainId === 31337n ? "MOCK" : "TESTNET",
    generatePermit: true
  });

  if (!result.success) {
    throw result.error;
  }

  return signer;
}

async function placeOrder(wallet, side, price) {
  const signer = await initializeCofhe(wallet);
  const zeroTrace = new Contract(process.env.ZEROTRACE_CONTRACT_ADDRESS, zeroTraceAbi, signer);
  const zusdc = new Contract(process.env.ZUSDC_ADDRESS, privateTokenAbi, signer);
  const zeth = new Contract(process.env.ZETH_ADDRESS, privateTokenAbi, signer);
  const nonce = `${side}-${Date.now()}`;
  const timestamp = Date.now();
  const baseAmountRaw = parseEther(orderSize.toString());
  const limitPriceRaw = parseUnits(price.toFixed(6), 6);
  const approvalAmount =
    side === "buy"
      ? quoteForBase(baseAmountRaw, limitPriceRaw, 18)
      : baseAmountRaw;
  const orderId = solidityPackedKeccak256(
    ["address", "address", "address", "uint256", "uint256", "bool", "string", "uint256"],
    [
      wallet.address,
      process.env.ZETH_ADDRESS,
      process.env.ZUSDC_ADDRESS,
      baseAmountRaw,
      limitPriceRaw,
      side === "buy",
      nonce,
      BigInt(timestamp)
    ]
  );

  const encryptedFundingAmount = await encryptUint128(approvalAmount);
  const encryptedApprovalAmount = await encryptUint128(approvalAmount);
  const encryptedBaseAmount = await encryptUint128(baseAmountRaw);
  const encryptedLimitPrice = await encryptUint128(limitPriceRaw);

  if (side === "buy") {
    await (await zusdc.mintEncrypted(wallet.address, encryptedFundingAmount)).wait();
    await (await zusdc.approveEncrypted(process.env.ZEROTRACE_CONTRACT_ADDRESS, encryptedApprovalAmount)).wait();
  } else {
    await (await zeth.mintEncrypted(wallet.address, encryptedFundingAmount)).wait();
    await (await zeth.approveEncrypted(process.env.ZEROTRACE_CONTRACT_ADDRESS, encryptedApprovalAmount)).wait();
  }

  const tx = await zeroTrace.submitOrder(
    orderId,
    process.env.ZETH_ADDRESS,
    process.env.ZUSDC_ADDRESS,
    encryptedBaseAmount,
    encryptedLimitPrice,
    side === "buy"
  );
  await tx.wait();

  const signature = await wallet.signMessage(buildAuthMessage(nonce, timestamp));
  const body = {
    walletAddress: wallet.address,
    orderId,
    txHash: tx.hash,
    tokenBase: process.env.ZETH_ADDRESS,
    tokenQuote: process.env.ZUSDC_ADDRESS,
    baseAmount: baseAmountRaw.toString(),
    limitPrice: limitPriceRaw.toString(),
    isBuy: side === "buy",
    signature,
    nonce,
    timestamp
  };

  const response = await axios.post(`${apiBaseUrl}/api/v1/order/submit`, body);
  return response.data.data;
}

async function fetchEthPrice() {
  const response = await axios.get(`${coingeckoApi}/simple/price`, {
    params: {
      ids: "ethereum",
      vs_currencies: "usd"
    }
  });

  return Number(response.data.ethereum.usd);
}

async function tick(wallet) {
  try {
    const referencePrice = await fetchEthPrice();
    const buyPrice = Number((referencePrice * 0.997).toFixed(6));
    const sellPrice = Number((referencePrice * 1.003).toFixed(6));

    await placeOrder(wallet, "buy", buyPrice);
    console.log(`[MarketMaker] placed BUY at ${buyPrice}`);

    await placeOrder(wallet, "sell", sellPrice);
    console.log(`[MarketMaker] placed SELL at ${sellPrice}`);
  } catch (error) {
    console.error("[MarketMaker]", error.message);
  }
}

async function main() {
  if (!process.env.MM_PRIVATE_KEY) {
    throw new Error("MM_PRIVATE_KEY is required.");
  }

  const wallet = new Wallet(process.env.MM_PRIVATE_KEY);
  await tick(wallet);
  setInterval(() => {
    tick(wallet);
  }, 30_000);
}

main().catch((error) => {
  console.error("[MarketMaker]", error.message);
});
