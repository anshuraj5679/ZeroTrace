"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useEffect, useState } from "react";

import { TiltCard } from "@/components/TiltCard";

import { getMarketStats, getTradeHistory, type MarketStats, type TradeHistoryItem } from "@/lib/api";

type DailyPoint = { label: string; volume: number };
type HourlyPoint = { label: string; trades: number };

function buildDailySeries(trades: TradeHistoryItem[]): DailyPoint[] {
  const buckets = new Map<string, number>();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    buckets.set(label, 0);
  }

  for (const trade of trades) {
    const tradeDate = new Date(trade.timestamp);
    const label = `${tradeDate.getMonth() + 1}/${tradeDate.getDate()}`;
    if (buckets.has(label)) {
      buckets.set(label, (buckets.get(label) || 0) + trade.amount * trade.settlementPrice);
    }
  }

  return [...buckets.entries()].map(([label, volume]) => ({ label, volume }));
}

function buildHourlySeries(trades: TradeHistoryItem[]): HourlyPoint[] {
  const buckets = new Map<string, number>();

  for (let index = 23; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(date.getHours() - index);
    const label = `${date.getHours()}:00`;
    buckets.set(label, 0);
  }

  for (const trade of trades) {
    const tradeDate = new Date(trade.timestamp);
    const label = `${tradeDate.getHours()}:00`;
    if (buckets.has(label)) {
      buckets.set(label, (buckets.get(label) || 0) + 1);
    }
  }

  return [...buckets.entries()].map(([label, trades]) => ({ label, trades }));
}

const customTooltipStyle = {
  backgroundColor: "rgba(10, 15, 30, 0.9)",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  borderRadius: "8px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 32px rgba(0, 245, 255, 0.05)",
  color: "#e2e8f0",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  padding: "8px 12px"
};

export default function DashboardPage() {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [nextStats, tradeHistory] = await Promise.all([
          getMarketStats(),
          getTradeHistory()
        ]);

        if (active) {
          setStats(nextStats);
          setTrades(tradeHistory);
        }
      } catch (_error) {
        if (active) {
          setStats(null);
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

  const dailySeries = buildDailySeries(trades);
  const hourlySeries = buildHourlySeries(trades);

  const cards = [
    {
      label: "Total Volume",
      value: `$${Math.round(stats?.totalVolumeAllTime || 0).toLocaleString()}`,
      accent: "border-t-cyan",
      icon: "📈"
    },
    {
      label: "Total Trades",
      value: `${stats?.totalTradesAllTime || 0}`,
      accent: "border-t-purple",
      icon: "🔄"
    },
    {
      label: "Unique Wallets",
      value: `${stats?.uniqueWallets || 0}`,
      accent: "border-t-electric",
      icon: "👛"
    },
    {
      label: "Active Orders",
      value: `${stats?.activeOrders || 0}`,
      accent: "border-t-buy",
      icon: "⚡"
    }
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-4">
      {/* Stat Cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <TiltCard key={card.label} tiltIntensity={10}>
            <div className={`glass-card ${card.accent} border-t-2 p-5 transition-all duration-300 hover:shadow-glow`}>
              <div className="flex items-center justify-between">
                <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
                  {card.label}
                </p>
                <span className="text-sm opacity-50">{card.icon}</span>
              </div>
              <p className="mt-4 font-[var(--font-mono)] text-3xl font-bold text-text-bright glow-text">
                {card.value}
              </p>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-card glass-card-accent overflow-hidden p-6">
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
            Volume / 7 Days
          </p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} fontFamily="var(--font-mono)" />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="var(--font-mono)" />
                <Tooltip contentStyle={customTooltipStyle} />
                <Area type="monotone" dataKey="volume" stroke="#00f5ff" strokeWidth={2} fill="url(#volumeFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card glass-card-accent overflow-hidden p-6">
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
            Trades / 24 Hours
          </p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlySeries}>
                <CartesianGrid stroke="rgba(148,163,184,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} fontFamily="var(--font-mono)" hide />
                <YAxis stroke="#64748b" fontSize={11} fontFamily="var(--font-mono)" />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="trades" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Top Pairs Table */}
      <section className="glass-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
              Top Pairs
            </p>
            <h2 className="mt-1.5 text-xl font-semibold text-text-bright">Flow Concentration</h2>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-muted">
              <tr>
                <th className="pb-3 pl-3">Pair</th>
                <th className="pb-3">Volume</th>
                <th className="pb-3">Trades</th>
                <th className="pb-3">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topPairs.map((pair) => {
                const relatedTrades = trades.filter((trade) => trade.pair === pair.pair);
                const averagePrice =
                  relatedTrades.reduce((sum, trade) => sum + trade.settlementPrice, 0) /
                  Math.max(relatedTrades.length, 1);

                return (
                  <tr key={pair.pair} className="border-t border-white/[0.04] text-sm transition-colors hover:bg-white/[0.02]">
                    <td className="py-3.5 pl-3 font-[var(--font-mono)] text-text">{pair.pair}</td>
                    <td className="py-3.5 font-[var(--font-mono)] text-cyan glow-text">${pair.volume.toFixed(0)}</td>
                    <td className="py-3.5 font-[var(--font-mono)] text-muted">{relatedTrades.length}</td>
                    <td className="py-3.5 font-[var(--font-mono)] text-muted">${averagePrice.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
