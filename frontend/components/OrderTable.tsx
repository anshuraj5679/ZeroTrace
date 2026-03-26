"use client";

import { Contract } from "ethers";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { initializeCofhe } from "@/lib/cofhe";
import { zeroTraceAbi } from "@/lib/contracts";
import { cancelOrder, getMyOrders, type OrderStatus } from "@/lib/api";

function buildAuthMessage(nonce: string, timestamp: number) {
  return `ZeroTrace Order Request\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

const statusClasses: Record<string, string> = {
  pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  matched: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  executed: "border-buy/40 bg-buy/10 text-buy",
  cancelled: "border-border bg-border/20 text-muted"
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
    <section className="terminal-card rounded-sharp p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
            My Orders
          </p>
          <h3 className="mt-2 font-[var(--font-heading)] text-2xl text-text">Open Surveillance Gap</h3>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted">
              <th className="pb-2">Pair</th>
              <th className="pb-2">Side</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Time</th>
              <th className="pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId} className="rounded-sharp bg-elevated text-sm">
                <td className="rounded-l-sharp px-3 py-3 font-mono">{order.pair}</td>
                <td className={`px-3 py-3 font-mono uppercase ${order.isBuy ? "text-buy" : "text-sell"}`}>
                  {order.isBuy ? "Buy" : "Sell"}
                </td>
                <td className="px-3 py-3 font-mono">{order.amount}</td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-sharp border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${
                      statusClasses[order.status] || statusClasses.pending
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-muted">
                  {new Date(order.timestamp).toLocaleTimeString()}
                </td>
                <td className="rounded-r-sharp px-3 py-3 text-right">
                  {order.status === "pending" || order.status === "matched" ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(order.orderId)}
                      className="font-mono text-xs uppercase tracking-[0.24em] text-sell transition hover:text-text"
                    >
                      Cancel
                    </button>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                      Closed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!orders.length ? (
          <div className="rounded-sharp border border-dashed border-border px-4 py-6 text-sm text-muted">
            Connect a wallet and submit an order to see activity here.
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-sell">{error}</p> : null}
    </section>
  );
}
