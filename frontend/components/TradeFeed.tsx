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
    <section className="terminal-card rounded-sharp p-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
          Recent Executions
        </p>
        <h3 className="mt-2 font-[var(--font-heading)] text-2xl text-text">Trade Feed</h3>
      </div>

      <div className="mt-5 overflow-hidden rounded-sharp border border-border">
        {trades.map((trade) => (
          <div
            key={trade.tradeId}
            className={`grid grid-cols-[1.2fr,0.8fr,0.8fr,0.8fr] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0 ${
              freshIds[trade.tradeId] ? "flash-cyan" : ""
            }`}
          >
            <span className="font-mono text-text">{trade.pair}</span>
            <span className="font-mono text-muted">{trade.amount}</span>
            <span className="font-mono text-cyan">${trade.settlementPrice.toFixed(2)}</span>
            <span className="font-mono text-muted">
              {new Date(trade.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}

        {!trades.length ? (
          <div className="px-4 py-6 text-sm text-muted">Execution feed is waiting for the first match.</div>
        ) : null}
      </div>
    </section>
  );
}
