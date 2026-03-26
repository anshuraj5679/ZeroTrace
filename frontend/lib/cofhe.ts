"use client";

import { BrowserProvider, type JsonRpcSigner, solidityPackedKeccak256 } from "ethers";
import type { CoFheInUint128 } from "cofhejs/web";

type BrowserEthereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: BrowserEthereum;
  }
}

function getEnvironment(chainId: bigint) {
  if (chainId === 31337n || chainId === 1337n) {
    return "MOCK" as const;
  }

  return "TESTNET" as const;
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

export async function initializeCofhe() {
  if (!window.ethereum) {
    throw new Error("Wallet provider not found.");
  }

  const { cofhejs } = await import("cofhejs/web");
  const provider = new BrowserProvider(window.ethereum as never);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const result = await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: signer,
    environment: getEnvironment(network.chainId),
    generatePermit: true
  });

  if (!result.success) {
    throw result.error;
  }

  return { provider, signer };
}

export async function encryptUint128Pair(
  first: bigint,
  second: bigint
): Promise<[CoFheInUint128, CoFheInUint128]> {
  const { cofhejs, Encryptable } = await import("cofhejs/web");
  const result = await cofhejs.encrypt([
    Encryptable.uint128(first),
    Encryptable.uint128(second)
  ]);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

export async function encryptUint128(value: bigint): Promise<CoFheInUint128> {
  const { cofhejs, Encryptable } = await import("cofhejs/web");
  const result = await cofhejs.encrypt([Encryptable.uint128(value)]);

  if (!result.success) {
    throw result.error;
  }

  return result.data[0];
}

export async function unsealUint128(ctHash: bigint) {
  const { cofhejs, FheTypes } = await import("cofhejs/web");
  const result = await cofhejs.unseal(ctHash, FheTypes.Uint128);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

export type CofheWalletContext = {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
};
