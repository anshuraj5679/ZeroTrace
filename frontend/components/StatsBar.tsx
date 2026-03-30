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

const accentColors = [
  { border: "border-t-cyan", glow: "group-hover:shadow-glow" },
  { border: "border-t-purple", glow: "group-hover:shadow-glow-purple" },
  { border: "border-t-electric", glow: "group-hover:shadow-glow" }
];

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
    { label: "Active Orders", value: stats.activeOrders.toString(), icon: "⚡" },
    { label: "Volume 24H", value: `$${formatCompactNumber(stats.totalVolume24h)}`, icon: "📊" },
    { label: "Trades Today", value: stats.totalTrades24h.toString(), icon: "🔄" }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item, index) => {
        const accent = accentColors[index % accentColors.length];
        return (
          <div
            key={item.label}
            className={`group glass-card ${accent.border} border-t-2 p-4 transition-all duration-300 ${accent.glow}`}
          >
            <div className="flex items-center justify-between">
              <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-muted">
                {item.label}
              </p>
              <span className="text-sm opacity-60">{item.icon}</span>
            </div>
            <p className="mt-3 font-[var(--font-mono)] text-2xl font-bold text-text-bright glow-text">
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
