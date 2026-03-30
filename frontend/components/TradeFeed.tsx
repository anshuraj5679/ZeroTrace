"use client";

import { useEffect, useRef, useState } from "react";

import { getTradeHistory, type TradeHistoryItem } from "@/lib/api";

export function TradeFeed() {
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [freshIds, setFreshIds] = useState<Record<string, boolean>>({});
  const previousIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const history = await getTradeHistory();
        if (!active) {
          return;
        }

        const previous = previousIds.current;
        const nextFresh: Record<string, boolean> = {};
        for (const trade of history) {
          if (!previous.has(trade.tradeId)) {
            nextFresh[trade.tradeId] = true;
          }
        }

        previousIds.current = new Set(history.map((trade) => trade.tradeId));
        setFreshIds(nextFresh);
        setTrades(history.slice(0, 10));
      } catch (_error) {
        if (active) {
          setTrades([]);
        }
      }
    }

    load();
    const interval = window.setInterval(load, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
            Recent Executions
          </p>
          <h3 className="mt-1.5 text-lg font-semibold text-text-bright">Trade Feed</h3>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
          <span className="live-dot" />
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted">
            Live
          </span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="mt-4 grid grid-cols-[1.2fr,0.8fr,0.8fr,0.8fr] gap-3 px-3 pb-2 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>Pair</span>
        <span>Amount</span>
        <span>Price</span>
        <span>Time</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/[0.04]">
        {trades.map((trade) => (
          <div
            key={trade.tradeId}
            className={`grid grid-cols-[1.2fr,0.8fr,0.8fr,0.8fr] gap-3 border-b border-white/[0.03] px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-white/[0.02] ${
              freshIds[trade.tradeId] ? "flash-cyan animate-slide-in" : ""
            }`}
          >
            <span className="font-[var(--font-mono)] text-text">{trade.pair}</span>
            <span className="font-[var(--font-mono)] text-muted">{trade.amount}</span>
            <span className="font-[var(--font-mono)] text-cyan glow-text">
              ${trade.settlementPrice.toFixed(2)}
            </span>
            <span className="font-[var(--font-mono)] text-muted/70 text-xs">
              {new Date(trade.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}

        {!trades.length ? (
          <div className="px-4 py-8 text-center text-sm text-muted">
            <div className="mx-auto mb-3 h-8 w-8 rounded-full border border-dashed border-white/10 animate-pulse-glow" />
            Waiting for first execution…
          </div>
        ) : null}
      </div>
    </section>
  );
}
