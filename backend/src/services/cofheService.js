const { Encryptable } = require("@cofhe/sdk");
const { Ethers6Adapter } = require("@cofhe/sdk/adapters");
const { arbSepolia, hardhat, sepolia } = require("@cofhe/sdk/chains");
const { createCofheClient, createCofheConfig } = require("@cofhe/sdk/node");
const { JsonRpcProvider, Wallet } = require("ethers");

let contextPromise;

function createConfig() {
  return createCofheConfig({
    supportedChains: [hardhat, sepolia, arbSepolia],
    fheKeyStorage: null,
    mocks: {
      decryptDelay: 0,
      encryptDelay: 0
    }
  });
}

function getRpcUrl() {
  const rpcUrl = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL;

  if (!rpcUrl) {
    throw new Error("Missing RPC_URL or SEPOLIA_RPC_URL.");
  }

  return rpcUrl;
}

function getPrivateKey() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY for operator CoFHE access.");
  }

  return process.env.PRIVATE_KEY;
}

async function createContext() {
  const provider = new JsonRpcProvider(getRpcUrl());
  const signer = new Wallet(getPrivateKey(), provider);
  const client = createCofheClient(createConfig());
  const { publicClient, walletClient } = await Ethers6Adapter(provider, signer);

  await client.connect(publicClient, walletClient);

  const permit = await client.permits.getOrCreateSelfPermit(undefined, undefined, {
    issuer: signer.address,
    name: "ZeroTrace Operator Permit"
  });

  return {
    client,
    permit
  };
}

async function getContext() {
  if (!contextPromise) {
    contextPromise = createContext().catch((error) => {
      contextPromise = undefined;
      throw error;
    });
  }

  return contextPromise;
}

async function decryptUint128ForTx(ctHash) {
  const { client, permit } = await getContext();
  return client.decryptForTx(ctHash).withPermit(permit).execute();
}

async function encryptUint128(value) {
  const { client } = await getContext();
  const [encrypted] = await client.encryptInputs([Encryptable.uint128(BigInt(value))]).execute();
  return encrypted;
}

module.exports = {
  decryptUint128ForTx,
  encryptUint128,
  getContext
};
