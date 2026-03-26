"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { StatsBar } from "@/components/StatsBar";

const steps = [
  {
    title: "Submit encrypted intent",
    copy: "Wallet-signed orders enter the system without a public orderbook leak."
  },
  {
    title: "Private matching engine",
    copy: "The operator matches compatible flow off-chain and only settles final intent."
  },
  {
    title: "On-chain settlement",
    copy: "Escrowed assets clear on-chain once a counterparty is locked and revealed."
  }
];

const features = [
  {
    title: "Zero MEV",
    copy: "Orders stay dark until settlement, starving mempool predators of a trail."
  },
  {
    title: "API-First",
    copy: "REST endpoints let brokers, bots, and consumer apps embed private execution fast."
  },
  {
    title: "Earn Rewards",
    copy: "ZT points compound with volume, unlocking tier progression and leaderboard pressure."
  }
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-sharp border border-border bg-surface px-6 py-12 sm:px-10 lg:px-12">
        <div className="absolute inset-0 grid-fade opacity-40" />
        <div className="relative z-10 flex min-h-[calc(100vh-14rem)] flex-col justify-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs uppercase tracking-[0.4em] text-cyan"
          >
            ZeroTrace / Private Routing Terminal
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 max-w-4xl font-[var(--font-heading)] text-5xl leading-none text-text sm:text-7xl"
          >
            Trade Without a Trail
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
            className="mt-8 flex flex-col gap-4 sm:flex-row"
          >
            <Link
              href="/trade"
              className="rounded-sharp border border-cyan bg-cyan px-6 py-4 text-center font-mono text-xs uppercase tracking-[0.34em] text-black shadow-glow transition hover:opacity-90"
            >
              Launch Terminal
            </Link>
            <Link
              href="/docs"
              className="rounded-sharp border border-border px-6 py-4 text-center font-mono text-xs uppercase tracking-[0.34em] text-text transition hover:border-cyan hover:text-cyan"
            >
              Read the Docs
            </Link>
          </motion.div>

          <div className="mt-12">
            <StatsBar />
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: index * 0.08 }}
            className="terminal-card rounded-sharp p-6"
          >
            <div className="font-mono text-4xl text-cyan">{index + 1}</div>
            <h2 className="mt-5 font-[var(--font-heading)] text-2xl text-text">{step.title}</h2>
            <p className="mt-3 leading-7 text-muted">{step.copy}</p>
          </motion.div>
        ))}
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="terminal-card rounded-sharp p-6">
            <h2 className="font-[var(--font-heading)] text-2xl text-text">{feature.title}</h2>
            <p className="mt-3 leading-7 text-muted">{feature.copy}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="terminal-card rounded-sharp p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
            API Preview
          </p>
          <pre className="mt-5 overflow-x-auto rounded-sharp border border-border bg-black p-5 text-sm text-cyan">
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

        <div className="terminal-card rounded-sharp p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">
            Interface Control
          </p>
          <h2 className="mt-5 font-[var(--font-heading)] text-3xl text-text">
            Route private liquidity into your stack.
          </h2>
          <p className="mt-4 leading-7 text-muted">
            ZeroTrace ships with REST endpoints, wallet-authenticated order flow, and a reward system
            that makes private routing sticky for power users.
          </p>
          <Link
            href="/docs"
            className="mt-8 inline-flex rounded-sharp border border-border px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] text-text transition hover:border-cyan hover:text-cyan"
          >
            View Full API Docs
          </Link>
        </div>
      </section>
    </div>
  );
}

