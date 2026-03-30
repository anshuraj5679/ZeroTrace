"use client";

import { Contract } from "ethers";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { initializeCofhe } from "@/lib/cofhe";
import { zeroTraceAbi } from "@/lib/contracts";
import { cancelOrder, getMyOrders, type OrderStatus } from "@/lib/api";
import { isZeroAddress } from "@/lib/tokens";

function buildAuthMessage(nonce: string, timestamp: number) {
  return `ZeroTrace Order Request\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

const badgeClass: Record<string, string> = {
  pending: "badge badge-pending",
  matched: "badge badge-matched",
  executed: "badge badge-executed",
  cancelled: "badge badge-cancelled"
};

const zeroTraceAddress = (process.env.NEXT_PUBLIC_ZEROTRACE_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export function OrderTable() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!address) {
        setOrders([]);
        return;
      }

      try {
        const nextOrders = await getMyOrders(address);
        if (active) {
          setOrders(nextOrders);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load orders.");
        }
      }
    }

    load();
    const interval = window.setInterval(load, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [address]);

  async function handleCancel(orderId: string) {
    if (!address) {
      return;
    }

    try {
      if (isZeroAddress(zeroTraceAddress)) {
        throw new Error("ZeroTrace contract address is not configured in frontend/.env.local.");
      }

      const { signer } = await initializeCofhe();
      const contract = new Contract(zeroTraceAddress, zeroTraceAbi, signer);
      const tx = await contract.cancelOrder(orderId);
      await tx.wait();

      const nonce = crypto.randomUUID();
      const timestamp = Date.now();
      const signature = await signMessageAsync({
        message: buildAuthMessage(nonce, timestamp)
      });

      await cancelOrder({
        orderId,
        txHash: tx.hash,
        walletAddress: address,
        signature,
        nonce,
        timestamp
      });

      const refreshed = await getMyOrders(address);
      setOrders(refreshed);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel order.");
    }
  }

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
            My Orders
          </p>
          <h3 className="mt-1.5 text-lg font-semibold text-text-bright">Open Positions</h3>
        </div>
        {orders.length > 0 && (
          <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-[var(--font-mono)] text-[10px] text-muted">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-1 text-left">
          <thead>
            <tr className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted">
              <th className="pb-2 pl-3">Pair</th>
              <th className="pb-2">Side</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Time</th>
              <th className="pb-2 pr-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.orderId}
                className="group rounded-lg text-sm transition-colors hover:bg-white/[0.02]"
              >
                <td className="rounded-l-lg py-2.5 pl-3 font-[var(--font-mono)] text-text">
                  {order.pair}
                </td>
                <td className={`py-2.5 font-[var(--font-mono)] text-xs uppercase ${order.isBuy ? "text-buy" : "text-sell"}`}>
                  {order.isBuy ? "Buy" : "Sell"}
                </td>
                <td className="py-2.5 font-[var(--font-mono)] text-text">{order.amount}</td>
                <td className="py-2.5">
                  <span className={badgeClass[order.status] || badgeClass.pending}>
                    {order.status}
                  </span>
                </td>
                <td className="py-2.5 font-[var(--font-mono)] text-xs text-muted">
                  {new Date(order.timestamp).toLocaleTimeString()}
                </td>
                <td className="rounded-r-lg py-2.5 pr-3 text-right">
                  {order.status === "pending" || order.status === "matched" ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(order.orderId)}
                      className="rounded-md border border-transparent px-2.5 py-1 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-sell transition-all hover:border-sell/30 hover:bg-sell/10 hover:shadow-glow-sell"
                    >
                      Cancel
                    </button>
                  ) : (
                    <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted/50">
                      Closed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!orders.length ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/[0.06] px-4 py-8 text-sm text-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/50">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            Connect a wallet and submit an order to see activity here.
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 animate-slide-in text-sm text-sell">{error}</p>
      ) : null}
    </section>
  );
}
