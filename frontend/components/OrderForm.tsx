"use client";

import { Contract, Interface, parseUnits } from "ethers";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { submitOrder, type SubmitOrderPayload } from "@/lib/api";
import {
  buildOrderId,
  encryptUint128,
  encryptUint128Pair,
  initializeCofhe,
  quoteForBase
} from "@/lib/cofhe";
import { privateTokenAbi, zeroTraceAbi } from "@/lib/contracts";
import { isZeroAddress, tradingPairs } from "@/lib/tokens";

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
const pendingOrderStorageKey = "zerotrace.pendingOrderSync";

type PendingOrderSync = Omit<SubmitOrderPayload, "signature" | "nonce" | "timestamp"> & {
  baseAmountRaw?: string;
  limitPriceRaw?: string;
};

function buildAuthMessage(nonce: string, timestamp: number) {
  return `ZeroTrace Order Request\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

const statusLabels: Record<string, string> = {
  funding: "Minting...",
  approving: "Approving...",
  submitting: "Submitting...",
  syncing: "Syncing..."
};

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
  const [pendingOrderSync, setPendingOrderSync] = useState<PendingOrderSync | null>(null);

  const pair = tradingPairs.find((entry) => entry.id === pairId) ?? tradingPairs[0];

  useEffect(() => {
    if (!address || typeof window === "undefined") {
      return;
    }

    const serialized = window.localStorage.getItem(pendingOrderStorageKey);
    if (!serialized) {
      return;
    }

    try {
      const saved = JSON.parse(serialized) as PendingOrderSync;
      if (saved.walletAddress.toLowerCase() !== address.toLowerCase()) {
        return;
      }

      setPendingOrderSync(saved);
      setTxHash(saved.txHash);
      setStatus("error");
      setMessage("Found an on-chain order that still needs API sync. Click Retry Order Sync.");
    } catch {
      window.localStorage.removeItem(pendingOrderStorageKey);
    }
  }, [address]);

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

  function assertConfiguredContracts() {
    if (
      isZeroAddress(zeroTraceAddress) ||
      isZeroAddress(pair.base.address) ||
      isZeroAddress(pair.quote.address)
    ) {
      throw new Error("Contract addresses are not configured in frontend/.env.local.");
    }
  }

  function savePendingOrderSync(payload: PendingOrderSync) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(pendingOrderStorageKey, JSON.stringify(payload));
  }

  function clearPendingOrderSync() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(pendingOrderStorageKey);
    }

    setPendingOrderSync(null);
  }

  async function syncPendingOrder(payload: PendingOrderSync) {
    const nonce = crypto.randomUUID();
    const authTimestamp = Date.now();
    const signature = await signMessageAsync({
      message: buildAuthMessage(nonce, authTimestamp)
    });

    await submitOrder({
      ...payload,
      signature,
      nonce,
      timestamp: authTimestamp
    });

    clearPendingOrderSync();
    setStatus("success");
    setMessage("Order submitted. Waiting for match.");
    setAmount("");
    setPrice("");
    onSubmitted?.();
  }

  async function buildPendingOrderFromTransaction(hash: string): Promise<PendingOrderSync> {
    if (!address) {
      throw new Error("Connect a wallet before retrying sync.");
    }

    const signer = await withSigner();
    const provider = signer.provider;

    if (!provider) {
      throw new Error("Wallet provider not available.");
    }

    const transaction = await provider.getTransaction(hash);
    if (!transaction) {
      throw new Error("Unable to load the order transaction.");
    }

    const contractInterface = new Interface(zeroTraceAbi);
    const parsed = contractInterface.parseTransaction({
      data: transaction.data,
      value: transaction.value
    });

    if (!parsed || parsed.name !== "submitOrder") {
      throw new Error("Transaction is not a ZeroTrace order submit.");
    }

    const [orderId, tokenBase, tokenQuote, _encryptedBaseAmount, _encryptedLimitPrice, isBuy] =
      parsed.args;

    return {
      walletAddress: address,
      orderId,
      txHash: hash,
      tokenBase,
      tokenQuote,
      isBuy
    };
  }

  async function handleMintDemoBalance() {
    try {
      if (!isConnected || !address || !pair) {
        throw new Error("Connect a wallet first.");
      }

      assertConfiguredContracts();
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

      assertConfiguredContracts();
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

      assertConfiguredContracts();
      const { baseAmountRaw, limitPriceRaw } = parseOrderValues();
      const nonce = crypto.randomUUID();
      const orderTimestamp = Date.now();
      const orderId = buildOrderId(
        address,
        pair.base.address,
        pair.quote.address,
        baseAmountRaw,
        limitPriceRaw,
        side === "buy",
        nonce,
        orderTimestamp
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

      const { baseAmountRaw: rawBase, limitPriceRaw: rawPrice } = parseOrderValues();
      const pendingSyncPayload: PendingOrderSync = {
        walletAddress: address,
        orderId,
        txHash: tx.hash,
        tokenBase: pair.base.address,
        tokenQuote: pair.quote.address,
        isBuy: side === "buy",
        baseAmountRaw: rawBase.toString(),
        limitPriceRaw: rawPrice.toString()
      };

      setPendingOrderSync(pendingSyncPayload);
      savePendingOrderSync(pendingSyncPayload);

      setStatus("syncing");
      await syncPendingOrder(pendingSyncPayload);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Order submission failed."
      );
    }
  }

  async function handleRetryOrderSync() {
    try {
      const nextPendingOrder =
        pendingOrderSync || (txHash ? await buildPendingOrderFromTransaction(txHash) : null);

      if (!nextPendingOrder) {
        throw new Error("No on-chain order found to sync.");
      }

      setPendingOrderSync(nextPendingOrder);
      savePendingOrderSync(nextPendingOrder);
      setTxHash(nextPendingOrder.txHash);
      setStatus("syncing");
      await syncPendingOrder(nextPendingOrder);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to sync the on-chain order."
      );
    }
  }

  const isProcessing = ["funding", "approving", "submitting", "syncing"].includes(status);
  const canRetryOrderSync = Boolean(pendingOrderSync || (status === "error" && txHash));

  return (
    <section className="glass-card glass-card-accent relative overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
            New Order
          </p>
          <h2 className="mt-1.5 text-lg font-semibold text-text-bright">
            Submit Encrypted Order
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${cofheReady ? "bg-buy" : "bg-amber"}`} />
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-muted">
            {cofheReady ? "CoFHE Ready" : "CoFHE Wallet"}
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-2.5 text-xs leading-relaxed text-muted">
        Orders are encrypted in your wallet, submitted directly on-chain, and only indexed by the API after confirmation.
      </div>

      {/* Form Fields */}
      <div className="mt-5 grid gap-4">
        {/* Pair Selector */}
        <label className="grid gap-1.5">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-muted">
            Pair
          </span>
          <select
            value={pairId}
            onChange={(event) => setPairId(event.target.value)}
            className="input-glass cursor-pointer"
          >
            {tradingPairs.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.base.symbol}/{entry.quote.symbol}
              </option>
            ))}
          </select>
        </label>

        {/* Buy / Sell Toggle */}
        <div className="relative grid grid-cols-2 gap-0 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setSide("buy")}
            className={`relative z-10 rounded-md px-4 py-2.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.25em] transition-all duration-250 ${
              side === "buy"
                ? "bg-buy/15 text-buy shadow-glow-buy border border-buy/30"
                : "text-muted hover:text-text border border-transparent"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide("sell")}
            className={`relative z-10 rounded-md px-4 py-2.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.25em] transition-all duration-250 ${
              side === "sell"
                ? "bg-sell/15 text-sell shadow-glow-sell border border-sell/30"
                : "text-muted hover:text-text border border-transparent"
            }`}
          >
            Sell
          </button>
        </div>

        {/* Amount */}
        <label className="grid gap-1.5">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-muted">
            Amount ({pair.base.symbol})
          </span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.10"
            className="input-glass"
          />
        </label>

        {/* Limit Price */}
        <label className="grid gap-1.5">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-muted">
            Limit Price ({pair.quote.symbol})
          </span>
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="2400"
            className="input-glass"
          />
        </label>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid gap-2.5">
        <button
          type="button"
          onClick={handleMintDemoBalance}
          disabled={isProcessing}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
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
          disabled={isProcessing}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
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
          disabled={isProcessing}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {statusLabels[status] || "Submit Order"}
        </button>

        {canRetryOrderSync ? (
          <button
            type="button"
            onClick={handleRetryOrderSync}
            disabled={isProcessing}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Retry Order Sync
          </button>
        ) : null}
      </div>

      {/* Status Message */}
      {message ? (
        <div
          className={`mt-4 animate-slide-in rounded-lg border px-4 py-3 text-sm ${
            status === "error"
              ? "border-sell/30 bg-sell/5 text-sell"
              : "border-cyan/20 bg-cyan/5 text-text"
          }`}
        >
          <p>{message}</p>
          {txHash ? (
            <p className="mt-1.5 break-all font-[var(--font-mono)] text-[11px] text-muted">{txHash}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
