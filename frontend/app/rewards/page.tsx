"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { getLeaderboard, getMyRewards, type LeaderboardEntry, type RewardStats } from "@/lib/api";

const tiers = [
  { name: "Bronze", points: 0, perks: "Base routing access" },
  { name: "Silver", points: 500, perks: "Priority event access" },
  { name: "Gold", points: 2000, perks: "Execution fee rebates" },
  { name: "Platinum", points: 10000, perks: "Operator desk access" }
];

function getNextTier(points: number) {
  return tiers.find((tier) => tier.points > points) ?? tiers[tiers.length - 1];
}

export default function RewardsPage() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<RewardStats | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextLeaderboard = await getLeaderboard();
        const nextStats = address ? await getMyRewards(address) : null;

        if (active) {
          setLeaderboard(nextLeaderboard);
          setStats(nextStats);
        }
      } catch (_error) {
        if (active) {
          setLeaderboard([]);
          setStats(null);
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

  const nextTier = useMemo(() => getNextTier(stats?.points || 0), [stats?.points]);
  const progress = stats
    ? Math.min(100, ((stats.points - (tiers.find((tier) => tier.name === stats.tier)?.points || 0)) /
        Math.max(nextTier.points - (tiers.find((tier) => tier.name === stats.tier)?.points || 0), 1)) *
        100)
    : 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <section className="terminal-card rounded-sharp p-8">
        <p className="font-mono text-xs uppercase tracking-[0.38em] text-cyan">Incentives</p>
        <h1 className="mt-4 font-[var(--font-heading)] text-5xl text-text">
          Earn ZT Points. Every Trade Counts.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">
          Private execution volume feeds the ZeroTrace reward engine. Climb tiers, unlock perks, and
          stay invisible while you do it.
        </p>
      </section>

      {stats ? (
        <section className="terminal-card rounded-sharp p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr,0.9fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
                Your Stats
              </p>
              <p className="mt-4 font-mono text-5xl text-cyan">{stats.points}</p>
              <div className="mt-4 inline-flex rounded-sharp border border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.24em] text-text">
                {stats.tier}
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-cyan" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm text-muted">
                {nextTier.name === stats.tier
                  ? "You are at the highest tier."
                  : `${nextTier.points - stats.points} points to ${nextTier.name}.`}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-sharp border border-border bg-elevated p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                  Rank
                </p>
                <p className="mt-3 font-mono text-3xl text-text">{stats.rank ?? "-"}</p>
              </div>
              <div className="rounded-sharp border border-border bg-elevated p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                  Volume Today
                </p>
                <p className="mt-3 font-mono text-3xl text-text">${stats.volumeToday.toFixed(0)}</p>
              </div>
              <div className="rounded-sharp border border-border bg-elevated p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                  Trades Total
                </p>
                <p className="mt-3 font-mono text-3xl text-text">{stats.tradesTotal}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="terminal-card rounded-sharp p-6">
        <h2 className="font-[var(--font-heading)] text-3xl text-text">Tier Ladder</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              <tr>
                <th className="pb-3">Tier</th>
                <th className="pb-3">Points Needed</th>
                <th className="pb-3">Perks</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.name} className="border-t border-border text-sm">
                  <td className="py-4 font-mono text-text">{tier.name}</td>
                  <td className="py-4 font-mono text-cyan">{tier.points}</td>
                  <td className="py-4 text-muted">{tier.perks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="terminal-card rounded-sharp p-6">
        <h2 className="font-[var(--font-heading)] text-3xl text-text">Weekly Leaderboard</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
              <tr>
                <th className="pb-3">Rank</th>
                <th className="pb-3">Wallet</th>
                <th className="pb-3">Points</th>
                <th className="pb-3">Volume</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={`${entry.rank}-${entry.wallet}`} className="border-t border-border text-sm">
                  <td className="py-4 font-mono text-cyan">{entry.rank}</td>
                  <td className="py-4 font-mono text-text">{entry.wallet}</td>
                  <td className="py-4 font-mono text-text">{entry.points}</td>
                  <td className="py-4 font-mono text-muted">${entry.volume.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
