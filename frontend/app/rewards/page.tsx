"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { getLeaderboard, getMyRewards, type LeaderboardEntry, type RewardStats } from "@/lib/api";
import { TiltCard } from "@/components/TiltCard";

const tiers = [
  { name: "Bronze", points: 0, perks: "Base routing access", color: "text-amber", borderColor: "border-t-amber", bg: "bg-amber/5" },
  { name: "Silver", points: 500, perks: "Priority event access", color: "text-slate-400", borderColor: "border-t-slate-400", bg: "bg-slate-400/5" },
  { name: "Gold", points: 2000, perks: "Execution fee rebates", color: "text-yellow-400", borderColor: "border-t-yellow-400", bg: "bg-yellow-400/5" },
  { name: "Platinum", points: 10000, perks: "Operator desk access", color: "text-cyan", borderColor: "border-t-cyan", bg: "bg-cyan/5" }
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
    <div className="mx-auto grid max-w-7xl gap-4">
      {/* Header */}
      <section className="glass-card glass-card-accent relative overflow-hidden p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple/5 blur-[80px]" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan/5 blur-[60px]" />
        <div className="relative">
          <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.38em] text-cyan glow-text">
            Incentives
          </p>
          <h1 className="mt-4 text-4xl font-bold text-text-bright sm:text-5xl">
            Earn ZT Points.{" "}
            <span className="gradient-text">Every Trade Counts.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Private execution volume feeds the ZeroTrace reward engine. Climb tiers, unlock perks, and
            stay invisible while you do it.
          </p>
        </div>
      </section>

      {/* User Stats */}
      {stats ? (
        <section className="glass-card p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr,0.9fr]">
            <div>
              <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
                Your Stats
              </p>
              <p className="mt-4 font-[var(--font-mono)] text-5xl font-bold text-cyan glow-text">
                {stats.points}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] text-text">
                <span className={`h-2 w-2 rounded-full ${tiers.find((t) => t.name === stats.tier)?.bg || "bg-cyan/20"} ${tiers.find((t) => t.name === stats.tier)?.color || "text-cyan"}`} style={{ backgroundColor: "currentColor" }} />
                {stats.tier}
              </div>

              {/* Progress Bar */}
              <div className="mt-6 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan to-purple transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {nextTier.name === stats.tier
                  ? "You are at the highest tier."
                  : `${nextTier.points - stats.points} points to ${nextTier.name}.`}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
              {[
                { label: "Rank", value: stats.rank ?? "-" },
                { label: "Volume Today", value: `$${stats.volumeToday.toFixed(0)}` },
                { label: "Trades Total", value: stats.tradesTotal }
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                  <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 font-[var(--font-mono)] text-2xl font-bold text-text-bright">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Tier Ladder */}
      <section className="glass-card p-6">
        <h2 className="text-xl font-semibold text-text-bright">Tier Ladder</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <TiltCard key={tier.name} tiltIntensity={12}>
              <div
                className={`rounded-xl border ${tier.borderColor} border-t-2 border-white/[0.04] ${tier.bg} p-4 transition-all duration-300 hover:border-white/[0.08]`}
              >
                <p className={`font-[var(--font-mono)] text-lg font-bold ${tier.color}`}>
                  {tier.name}
                </p>
                <p className="mt-1 font-[var(--font-mono)] text-xs text-muted">
                  {tier.points.toLocaleString()} pts
                </p>
                <p className="mt-3 text-xs leading-5 text-muted">{tier.perks}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-bright">Weekly Leaderboard</h2>
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
            <span className="live-dot" />
            <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted">
              Live
            </span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-muted">
              <tr>
                <th className="pb-3 pl-3">Rank</th>
                <th className="pb-3">Wallet</th>
                <th className="pb-3">Points</th>
                <th className="pb-3">Volume</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isTopThree = (entry.rank ?? 0) <= 3;
                return (
                  <tr
                    key={`${entry.rank}-${entry.wallet}`}
                    className={`border-t border-white/[0.04] text-sm transition-colors hover:bg-white/[0.02] ${
                      isTopThree ? "bg-cyan/[0.02]" : ""
                    }`}
                  >
                    <td className="py-3.5 pl-3 font-[var(--font-mono)]">
                      <span className={isTopThree ? "text-cyan glow-text font-bold" : "text-muted"}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="py-3.5 font-[var(--font-mono)] text-text">
                      {entry.wallet}
                    </td>
                    <td className="py-3.5 font-[var(--font-mono)] text-text-bright font-medium">
                      {entry.points}
                    </td>
                    <td className="py-3.5 font-[var(--font-mono)] text-muted">
                      ${entry.volume.toFixed(0)}
                    </td>
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
