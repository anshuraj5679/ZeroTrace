"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { ParticleNetwork } from "@/components/ParticleNetwork";
import { StatsBar } from "@/components/StatsBar";
import { TiltCard } from "@/components/TiltCard";

const steps = [
  {
    title: "Submit encrypted intent",
    copy: "Wallet-signed orders enter the system without a public orderbook leak.",
    icon: "🔐"
  },
  {
    title: "Private matching engine",
    copy: "The operator matches compatible flow off-chain and only settles final intent.",
    icon: "⚡"
  },
  {
    title: "On-chain settlement",
    copy: "Escrowed assets clear on-chain once a counterparty is locked and revealed.",
    icon: "🔗"
  }
];

const features = [
  {
    title: "Zero MEV",
    copy: "Orders stay dark until settlement, starving mempool predators of a trail.",
    accent: "from-cyan to-electric"
  },
  {
    title: "API-First",
    copy: "REST endpoints let brokers, bots, and consumer apps embed private execution fast.",
    accent: "from-purple to-cyan"
  },
  {
    title: "Earn Rewards",
    copy: "ZT points compound with volume, unlocking tier progression and leaderboard pressure.",
    accent: "from-electric to-purple"
  }
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-white/[0.04] bg-[rgba(10,15,30,0.5)] px-6 py-16 backdrop-blur-sm sm:px-10 lg:px-14">
        {/* 3D Particle Network Background */}
        <ParticleNetwork />

        {/* Extra glow orbs behind particles */}
        <div className="absolute -left-32 -top-32 z-[1] h-96 w-96 rounded-full bg-cyan/5 blur-[120px] animate-float" />
        <div className="absolute -right-32 top-1/3 z-[1] h-72 w-72 rounded-full bg-purple/5 blur-[100px] animate-float" style={{ animationDelay: "2s" }} />

        {/* Scanline Effect */}
        <div className="scanline absolute inset-0 z-[2] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex min-h-[calc(100vh-14rem)] flex-col justify-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-[var(--font-mono)] text-xs uppercase tracking-[0.4em] text-cyan glow-text"
          >
            ZeroTrace / Private Routing Terminal
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 max-w-4xl text-5xl font-bold leading-[1.05] sm:text-7xl"
          >
            <span className="gradient-text">Trade Without</span>
            <br />
            <span className="text-text-bright">a Trail</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg"
          >
            MEV-resistant private order matching. Your trades stay invisible until executed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link href="/trade" className="btn-primary text-center">
              Launch Terminal
            </Link>
            <Link href="/docs" className="btn-secondary text-center">
              Read the Docs
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-14"
          >
            <StatsBar />
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: index * 0.1 }}
          >
            <TiltCard className="h-full">
              <div className="glass-card group h-full p-6 transition-all duration-300 hover:border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan/10 to-purple/10 text-lg">
                    {step.icon}
                  </div>
                  <span className="font-[var(--font-mono)] text-3xl font-bold text-cyan/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold text-text-bright">{step.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{step.copy}</p>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </section>

      {/* ── Features ─────────────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-3">
        {features.map((feature) => (
          <TiltCard key={feature.title} className="h-full">
            <div className="glass-card group relative h-full overflow-hidden p-6 transition-all duration-300 hover:border-white/[0.08]">
              <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${feature.accent} opacity-[0.06] blur-2xl transition group-hover:opacity-[0.12]`} />
              <h2 className="relative text-xl font-semibold text-text-bright">{feature.title}</h2>
              <p className="relative mt-3 text-sm leading-6 text-muted">{feature.copy}</p>
            </div>
          </TiltCard>
        ))}
      </section>

      {/* ── API Preview + CTA ────────────────────── */}
      <section className="mt-12 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <TiltCard tiltIntensity={5}>
          <div className="glass-card h-full p-6">
            <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
              API Preview
            </p>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-white/[0.04] bg-[rgba(0,0,0,0.4)] p-5 font-[var(--font-mono)] text-sm leading-6 text-cyan">
              <code>{`POST /api/v1/order/submit
{
  "walletAddress": "0x...",
  "tokenIn": "ZUSDC",
  "tokenOut": "ZETH",
  "amount": "250000000",
  "price": 3125,
  "isBuy": true,
  "signature": "0x...",
  "nonce": "session-42",
  "timestamp": 1720000000000,
  "secret": "operator-only"
}`}</code>
            </pre>
          </div>
        </TiltCard>

        <TiltCard tiltIntensity={5}>
          <div className="glass-card flex h-full flex-col justify-center p-6">
            <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
              Interface Control
            </p>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-text-bright lg:text-3xl">
              Route private liquidity into your stack.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              ZeroTrace ships with REST endpoints, wallet-authenticated order flow, and a reward system
              that makes private routing sticky for power users.
            </p>
            <Link href="/docs" className="btn-secondary mt-8 w-fit">
              View Full API Docs
            </Link>
          </div>
        </TiltCard>
      </section>
    </div>
  );
}
