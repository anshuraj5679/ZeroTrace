"use client";

import { Contract, parseUnits } from "ethers";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { submitOrder } from "@/lib/api";
import {
  buildOrderId,
  encryptUint128,
  encryptUint128Pair,
  initializeCofhe,
  quoteForBase
} from "@/lib/cofhe";
import { privateTokenAbi, zeroTraceAbi } from "@/lib/contracts";
import { tradingPairs } from "@/lib/tokens";

type SubmissionState =
  | "idle"
  | "funding"
  | "approving"
  | "submitting"
  | "syncing"
  | "success"
  | "error";

const zeroTraceAddress = (process.env.NEXT_PUBLIC_ZEROTRACE_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

function buildAuthMessage(nonce: string, timestamp: number) {
  return `ZeroTrace Order Request\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

export function OrderForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [pairId, setPairId] = useState(tradingPairs[0]?.id ?? "");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [cofheReady, setCofheReady] = useState(false);

  const pair = tradingPairs.find((entry) => entry.id === pairId) ?? tradingPairs[0];

  if (!pair) {
    return null;
  }

  async function withSigner() {
    const { signer } = await initializeCofhe();
    setCofheReady(true);
    return signer;
  }

  function parseOrderValues() {
    if (!pair) {
      throw new Error("Select a token pair.");
    }
    if (!amount || !price) {
      throw new Error("Fill out amount and limit price.");
    }

    const baseAmountRaw = parseUnits(amount, pair.base.decimals);
    const limitPriceRaw = parseUnits(price, pair.quote.decimals);

    return {
      baseAmountRaw,
      limitPriceRaw
    };
  }

  async function handleMintDemoBalance() {
    try {
      if (!isConnected || !address || !pair) {
        throw new Error("Connect a wallet first.");
      }

      const signer = await withSigner();
      const token = side === "buy" ? pair.quote : pair.base;
      const demoAmount =
        side === "buy"
          ? parseUnits("10000", pair.quote.decimals)
          : parseUnits("5", pair.base.decimals);
      const encryptedAmount = await encryptUint128(demoAmount);
      const tokenContract = new Contract(token.address, privateTokenAbi, signer);

      setStatus("funding");
      const tx = await tokenContract.mintEncrypted(address, encryptedAmount);
      setTxHash(tx.hash);
      await tx.wait();

      setStatus("idle");
      setMessage(
        side === "buy"
          ? `Private demo balance minted: 10,000 ${pair.quote.symbol}.`
          : `Private demo balance minted: 5 ${pair.base.symbol}.`
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to mint demo balance.");
    }
  }

  async function handleApprove() {
    try {
      if (!isConnected || !address || !pair) {
        throw new Error("Connect a wallet before approving.");
      }

      const { baseAmountRaw, limitPriceRaw } = parseOrderValues();
      const approvalAmount =
        side === "buy"
          ? quoteForBase(baseAmountRaw, limitPriceRaw, pair.base.decimals)
          : baseAmountRaw;
      const approvalToken = side === "buy" ? pair.quote : pair.base;

      const signer = await withSigner();
      const encryptedApproval = await encryptUint128(approvalAmount);
      const tokenContract = new Contract(approvalToken.address, privateTokenAbi, signer);

      setStatus("approving");
      const tx = await tokenContract.approveEncrypted(zeroTraceAddress, encryptedApproval);
      setTxHash(tx.hash);
      await tx.wait();

      setStatus("idle");
      setMessage(`Encrypted approval confirmed for ${approvalToken.symbol}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Approval failed.");
    }
  }

  async function handleSubmit() {
    try {
      if (!isConnected || !address || !pair) {
        throw new Error("Connect a wallet before submitting an order.");
      }

      const { baseAmountRaw, limitPriceRaw } = parseOrderValues();
      const nonce = crypto.randomUUID();
      const timestamp = Date.now();
      const orderId = buildOrderId(
        address,
        pair.base.address,
        pair.quote.address,
        baseAmountRaw,
        limitPriceRaw,
        side === "buy",
        nonce,
        timestamp
      );

      const signer = await withSigner();
      const zeroTraceContract = new Contract(zeroTraceAddress, zeroTraceAbi, signer);
      const [encryptedBaseAmount, encryptedLimitPrice] = await encryptUint128Pair(
        baseAmountRaw,
        limitPriceRaw
      );

      setStatus("submitting");
      const tx = await zeroTraceContract.submitOrder(
        orderId,
        pair.base.address,
        pair.quote.address,
        encryptedBaseAmount,
        encryptedLimitPrice,
        side === "buy"
      );
      setTxHash(tx.hash);
      await tx.wait();

      setStatus("syncing");
      const signature = await signMessageAsync({
        message: buildAuthMessage(nonce, timestamp)
      });

      await submitOrder({
        walletAddress: address,
        orderId,
        txHash: tx.hash,
        tokenBase: pair.base.address,
        tokenQuote: pair.quote.address,
        baseAmount: baseAmountRaw.toString(),
        limitPrice: limitPriceRaw.toString(),
        isBuy: side === "buy",
        signature,
        nonce,
        timestamp
      });

      setStatus("success");
      setMessage("Order submitted. Waiting for match.");
      setAmount("");
      setPrice("");
      onSubmitted?.();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Order submission failed."
      );
    }
  }

  return (
    <section className="terminal-card rounded-sharp p-5 scanline">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
            New Order
          </p>
          <h2 className="mt-2 font-[var(--font-heading)] text-3xl text-text">
            Submit Encrypted Order
          </h2>
        </div>
        <div className="rounded-sharp border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
          {cofheReady ? "CoFHE Direct" : "CoFHE Wallet"}
        </div>
      </div>

      <div className="mt-3 rounded-sharp border border-border bg-elevated/70 px-4 py-3 text-sm text-muted">
        Orders are encrypted in your wallet, submitted directly on-chain, and only indexed by the API after the
        transaction confirms.
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Pair
          </span>
          <select
            value={pairId}
            onChange={(event) => setPairId(event.target.value)}
            className="rounded-sharp border border-border bg-elevated px-3 py-3 outline-none transition focus:border-cyan"
          >
            {tradingPairs.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.base.symbol}/{entry.quote.symbol}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide("buy")}
            className={`rounded-sharp border px-4 py-3 font-mono text-sm uppercase tracking-[0.25em] ${
              side === "buy"
                ? "border-buy bg-buy/10 text-buy shadow-glow"
                : "border-border bg-elevated text-muted"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide("sell")}
            className={`rounded-sharp border px-4 py-3 font-mono text-sm uppercase tracking-[0.25em] ${
              side === "sell"
                ? "border-sell bg-sell/10 text-sell shadow-glow"
                : "border-border bg-elevated text-muted"
            }`}
          >
            Sell
          </button>
        </div>

        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Amount ({pair.base.symbol})
          </span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.10"
            className="rounded-sharp border border-border bg-elevated px-3 py-3 outline-none transition focus:border-cyan"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            Limit Price ({pair.quote.symbol})
          </span>
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="2400"
            className="rounded-sharp border border-border bg-elevated px-3 py-3 outline-none transition focus:border-cyan"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={handleMintDemoBalance}
          className="rounded-sharp border border-border bg-elevated px-4 py-3 font-mono text-xs uppercase tracking-[0.3em] text-text transition hover:border-cyan hover:text-cyan"
        >
          {status === "funding"
            ? "Minting..."
            : side === "buy"
              ? `Mint Private ${pair.quote.symbol}`
              : `Mint Private ${pair.base.symbol}`}
        </button>

        <button
          type="button"
          onClick={handleApprove}
          className="rounded-sharp border border-border bg-elevated px-4 py-3 font-mono text-xs uppercase tracking-[0.3em] text-text transition hover:border-cyan hover:text-cyan"
        >
          {status === "approving"
            ? "Approving..."
            : side === "buy"
              ? `Approve ${pair.quote.symbol}`
              : `Approve ${pair.base.symbol}`}
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-sharp border border-cyan bg-cyan px-4 py-4 font-mono text-xs uppercase tracking-[0.35em] text-black transition hover:shadow-glow"
        >
          {status === "submitting"
            ? "Submitting..."
            : status === "syncing"
              ? "Syncing..."
              : "Submit Order"}
        </button>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-sharp border px-4 py-3 text-sm ${
            status === "error"
              ? "border-sell/60 bg-sell/10 text-sell"
              : "border-cyan/40 bg-cyan/10 text-text"
          }`}
        >
          <p>{message}</p>
          {txHash ? (
            <p className="mt-2 break-all font-mono text-xs text-muted">{txHash}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
