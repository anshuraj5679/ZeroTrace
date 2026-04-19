"use client";

import { BrowserProvider, type JsonRpcSigner, solidityPackedKeccak256 } from "ethers";
import {
  Encryptable,
  FheTypes,
  type CofheClient,
  type DecryptForTxResult,
  type EncryptedUint128Input
} from "@cofhe/sdk";
import { Ethers6Adapter } from "@cofhe/sdk/adapters";
import { arbSepolia, hardhat, sepolia } from "@cofhe/sdk/chains";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";

type BrowserEthereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: BrowserEthereum;
  }
}

let cofheClient: CofheClient | null = null;

function getCofheClient() {
  if (typeof window === "undefined" || !window.document) {
    throw new Error("CoFHE client is only available in the browser.");
  }

  if (!cofheClient) {
    cofheClient = createCofheClient(
      createCofheConfig({
        supportedChains: [hardhat, sepolia, arbSepolia],
        mocks: {
          decryptDelay: 0
        }
      })
    );
  }

  return cofheClient;
}

export function buildOrderId(
  walletAddress: string,
  tokenBase: string,
  tokenQuote: string,
  baseAmountRaw: bigint,
  limitPriceRaw: bigint,
  isBuy: boolean,
  nonce: string,
  timestamp: number
) {
  return solidityPackedKeccak256(
    ["address", "address", "address", "uint256", "uint256", "bool", "string", "uint256"],
    [
      walletAddress,
      tokenBase,
      tokenQuote,
      baseAmountRaw,
      limitPriceRaw,
      isBuy,
      nonce,
      BigInt(timestamp)
    ]
  );
}

export function quoteForBase(
  baseAmountRaw: bigint,
  limitPriceRaw: bigint,
  baseTokenDecimals: number
) {
  return (baseAmountRaw * limitPriceRaw) / 10n ** BigInt(baseTokenDecimals);
}

async function connectCofheClient(): Promise<CofheWalletContext> {
  if (!window.ethereum) {
    throw new Error("Wallet provider not found.");
  }

  const provider = new BrowserProvider(window.ethereum as never);
  const signer = await provider.getSigner();
  const { publicClient, walletClient } = await Ethers6Adapter(provider, signer);
  const client = getCofheClient();

  await client.connect(publicClient, walletClient);

  return {
    client,
    provider,
    signer,
    account: (await signer.getAddress()) as `0x${string}`
  };
}

async function ensureSelfPermit(client: CofheClient, issuer: `0x${string}`) {
  return client.permits.getOrCreateSelfPermit(undefined, undefined, {
    issuer,
    name: "ZeroTrace Self Permit"
  });
}

export async function initializeCofhe() {
  const { provider, signer } = await connectCofheClient();
  return { provider, signer };
}

export async function encryptUint128Pair(
  first: bigint,
  second: bigint
): Promise<[EncryptedUint128Input, EncryptedUint128Input]> {
  const { client } = await connectCofheClient();
  const encrypted = await client
    .encryptInputs([Encryptable.uint128(first), Encryptable.uint128(second)])
    .execute();

  return [encrypted[0], encrypted[1]];
}

export async function encryptUint128(value: bigint): Promise<EncryptedUint128Input> {
  const { client } = await connectCofheClient();
  const [encrypted] = await client.encryptInputs([Encryptable.uint128(value)]).execute();
  return encrypted;
}

export async function decryptUint128ForView(ctHash: bigint | string) {
  const { client, account } = await connectCofheClient();
  const permit = await ensureSelfPermit(client, account);

  return client
    .decryptForView(ctHash, FheTypes.Uint128)
    .withPermit(permit)
    .execute();
}

export async function decryptUint128ForTx(
  ctHash: bigint | string
): Promise<DecryptForTxResult> {
  const { client, account } = await connectCofheClient();
  const permit = await ensureSelfPermit(client, account);

  return client.decryptForTx(ctHash).withPermit(permit).execute();
}

export type CofheWalletContext = {
  client: CofheClient;
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  account: `0x${string}`;
};
