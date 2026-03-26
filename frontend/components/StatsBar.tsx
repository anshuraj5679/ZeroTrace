"use client";

import { useEffect, useState } from "react";

import { getMarketStats, type MarketStats } from "@/lib/api";

const defaultStats: MarketStats = {
  totalVolume24h: 0,
  totalTrades24h: 0,
  activeOrders: 0,
  totalVolumeAllTime: 0,
  totalTradesAllTime: 0,
  uniqueWallets: 0,
  topPairs: []
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function StatsBar() {
  const [stats, setStats] = useState<MarketStats>(defaultStats);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextStats = await getMarketStats();
        if (active) {
          setStats(nextStats);
        }
      } catch (_error) {
        if (active) {
          setStats(defaultStats);
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

  const items = [
    { label: "Active Orders", value: stats.activeOrders.toString() },
    { label: "Volume 24H", value: `$${formatCompactNumber(stats.totalVolume24h)}` },
    { label: "Trades Today", value: stats.totalTrades24h.toString() }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="terminal-card rounded-sharp px-4 py-4 scanline">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">
            {item.label}
          </p>
          <p className="mt-3 font-mono text-2xl text-cyan">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

