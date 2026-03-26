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
      label: "Total Volume All Time",
      value: `$${Math.round(stats?.totalVolumeAllTime || 0).toLocaleString()}`
    },
    {
      label: "Total Trades",
      value: `${stats?.totalTradesAllTime || 0}`
    },
    {
      label: "Unique Wallets",
      value: `${stats?.uniqueWallets || 0}`
    },
    {
      label: "Active Orders",
      value: `${stats?.activeOrders || 0}`
    }
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="terminal-card rounded-sharp p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
              {card.label}
            </p>
            <p className="mt-4 font-mono text-3xl text-cyan">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="terminal-card rounded-sharp p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
            Volume / 7 Days
          </p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1a1a1a" />
                <XAxis dataKey="label" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Area type="monotone" dataKey="volume" stroke="#00f5ff" fill="url(#volumeFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="terminal-card rounded-sharp p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
            Trades / 24 Hours
          </p>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlySeries}>
                <CartesianGrid stroke="#1a1a1a" />
                <XAxis dataKey="label" stroke="#666666" hide />
                <YAxis stroke="#666666" />
                <Tooltip />
                <Bar dataKey="trades" fill="#00f5ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="terminal-card rounded-sharp p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
              Top Pairs
            </p>
            <h2 className="mt-2 font-[var(--font-heading)] text-3xl text-text">Flow Concentration</h2>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              <tr>
                <th className="pb-3">Pair</th>
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
                  <tr key={pair.pair} className="border-t border-border text-sm">
                    <td className="py-4 font-mono text-text">{pair.pair}</td>
                    <td className="py-4 font-mono text-cyan">${pair.volume.toFixed(0)}</td>
                    <td className="py-4 font-mono text-muted">{relatedTrades.length}</td>
                    <td className="py-4 font-mono text-muted">${averagePrice.toFixed(2)}</td>
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

