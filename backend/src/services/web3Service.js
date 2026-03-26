const fs = require("fs");
const path = require("path");
const { Contract, JsonRpcProvider, Wallet } = require("ethers");

const zeroTraceAbi = [
  "function getOrder(bytes32 orderId) view returns (address trader, address tokenBase, address tokenQuote, bool isBuy, bool cancelled, bool closed, uint8 baseTokenDecimals, uint256 timestamp)",
  "function executeMatch(bytes32 buyOrderId, bytes32 sellOrderId, bool buyFilled, bool sellFilled)"
];

let provider;
let readContract;
let writeContract;

function loadDeploymentAddress() {
  const deploymentsPath = path.resolve(__dirname, "../../../deployments.json");
  const deployments = fs.existsSync(deploymentsPath)
    ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8"))
    : {};

  return (
    process.env.ZEROTRACE_CONTRACT_ADDRESS ||
    deployments["eth-sepolia"]?.ZeroTrace ||
    deployments["arb-sepolia"]?.ZeroTrace ||
    deployments.hardhat?.ZeroTrace ||
    ""
  );
}

function getProvider() {
  if (provider) {
    return provider;
  }

  const rpcUrl = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing RPC_URL or SEPOLIA_RPC_URL.");
  }

  provider = new JsonRpcProvider(rpcUrl);
  return provider;
}

function getReadContract() {
  if (readContract) {
    return readContract;
  }

  const contractAddress = loadDeploymentAddress();
  if (!contractAddress) {
    throw new Error("Missing ZeroTrace contract address.");
  }

  readContract = new Contract(contractAddress, zeroTraceAbi, getProvider());
  return readContract;
}

function getWriteContract() {
  if (writeContract) {
    return writeContract;
  }

  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = loadDeploymentAddress();

  if (!privateKey || !contractAddress) {
    throw new Error("Missing operator signer configuration.");
  }

  const signer = new Wallet(privateKey, getProvider());
  writeContract = new Contract(contractAddress, zeroTraceAbi, signer);
  return writeContract;
}

async function withRetry(action) {
  try {
    return await action();
  } catch (firstError) {
    try {
      return await action();
    } catch (_secondError) {
      throw firstError;
    }
  }
}

async function getOrder(orderId) {
  return withRetry(async () => {
    const order = await getReadContract().getOrder(orderId);
    return {
      trader: order.trader.toLowerCase(),
      tokenBase: order.tokenBase.toLowerCase(),
      tokenQuote: order.tokenQuote.toLowerCase(),
      isBuy: order.isBuy,
      cancelled: order.cancelled,
      closed: order.closed,
      baseTokenDecimals: Number(order.baseTokenDecimals),
      timestamp: Number(order.timestamp)
    };
  });
}

async function executeMatch(buyOrderId, sellOrderId, buyFilled, sellFilled) {
  return withRetry(async () => {
    const tx = await getWriteContract().executeMatch(
      buyOrderId,
      sellOrderId,
      buyFilled,
      sellFilled
    );
    await tx.wait();
    return tx.hash;
  });
}

module.exports = {
  executeMatch,
  getOrder
};
