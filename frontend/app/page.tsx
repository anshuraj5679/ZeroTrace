"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CinematicBackground } from "@/components/CinematicBackground";
import { LiveTradingGraph } from "@/components/LiveTradingGraph";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TypeWriter } from "@/components/TypeWriter";

const apiCode = `POST /api/v1/order/submit
{
  "walletAddress": "0x...",
  "orderId":       "0x...",
  "txHash":        "0x...",
  "tokenBase":     "0x...",
  "tokenQuote":    "0x...",
  "isBuy":         true,
  "signature":     "0x...",
  "nonce":         "session-42",
  "timestamp":     1720000000000
}`;

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Scroll progress bar */}
      <div
        className="scroll-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Cinematic Canvas Background */}
      <CinematicBackground />

      {/* ═══════════════════════════════════════════
          SECTION 1 — HERO + LIVE TRADING GRAPH
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="hero">
        <div className="story-section-inner">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left: Headline + CTA */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-8"
              >
                {/* Brand mark */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-block h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
                  <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-muted/60">
                    Private Trading Protocol
                  </span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.4 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight"
              >
                <span className="text-text-bright">Trade Without</span>
                <br />
                <span className="gradient-heading">a Trace.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="mt-6 max-w-lg text-base sm:text-lg leading-7 text-muted"
              >
                MEV-resistant private order matching powered by Fully Homomorphic
                Encryption on the Fhenix CoFHE network. Your trades stay invisible.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.0 }}
                className="mt-8 flex flex-col sm:flex-row gap-4"
              >
                <Link href="/trade" className="btn-hero text-center">
                  Launch Terminal
                </Link>
                <Link href="/docs" className="btn-secondary text-center">
                  Read the Docs
                </Link>
              </motion.div>
            </div>

            {/* Right: Live Trading Graph — UNTOUCHED */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="relative hidden lg:block"
            >
              <div className="glass-panel p-4 h-[420px] relative overflow-hidden">
                {/* Terminal header */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                  <div className="live-dot" />
                  <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.3em] text-buy/80">Live</span>
                </div>
                <LiveTradingGraph />
              </div>
              {/* Subtle glow under the chart */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-cyan/5 blur-2xl rounded-full" />
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="mt-12 flex items-center gap-3"
          >
            <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center p-1">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-2 rounded-full bg-cyan/60"
              />
            </div>
            <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted/50">
              Scroll to explore
            </span>
          </motion.div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — THE PROBLEM
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="problem">
        <div className="story-section-inner">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <ScrollReveal variant="fadeUp" delay={0}>
                <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5em] text-sell mb-4">
                  ⚠ The Threat
                </p>
              </ScrollReveal>

              <ScrollReveal variant="fadeUp" delay={0.1}>
                <h2 className="text-4xl sm:text-5xl font-bold leading-[1.05] text-text-bright">
                  Every trade you make
                  <br />
                  <span className="gradient-text">leaves a trail</span>
                </h2>
              </ScrollReveal>

              <ScrollReveal variant="fadeUp" delay={0.2}>
                <p className="mt-6 text-lg leading-8 text-muted max-w-lg">
                  Front-runners extract billions yearly. MEV bots scan mempools in milliseconds.
                  Surveillance systems reconstruct your entire trading pattern before you
                  even see a confirmation.
                </p>
              </ScrollReveal>

              <ScrollReveal variant="fadeUp" delay={0.3}>
                <div className="mt-6 flex flex-wrap gap-3">
                  {["Sandwich Attacks", "Frontrunning", "Backrunning", "Mempool Sniping"].map((tag) => (
                    <span key={tag} className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.2em] text-sell/70 bg-sell/[0.06] px-3 py-1.5 rounded-[var(--radius)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </ScrollReveal>
            </div>

            <div className="space-y-4">
              {[
                { label: "MEV Extracted in 2024", val: "$1.2B+", color: "text-sell", desc: "Stolen from regular traders by MEV bots" },
                { label: "Avg. Frontrun Latency", val: "~12ms", color: "text-amber-400", desc: "Bots execute faster than block confirmation" },
                { label: "Trades Vulnerable", val: "94%", color: "text-sell", desc: "Of all DEX trades are exposed to extraction" },
              ].map((item, i) => (
                <ScrollReveal key={item.label} variant="fadeRight" delay={0.1 * i}>
                  <div className="glass-panel p-6 flex items-center justify-between group">
                    <div>
                      <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
                        {item.label}
                      </p>
                      <p className={`mt-1.5 text-2xl font-bold ${item.color}`}>
                        {item.val}
                      </p>
                      <p className="text-[11px] text-muted/60 mt-1">{item.desc}</p>
                    </div>
                    <div className="w-2 h-14 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors" />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — THE SOLUTION
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="solution">
        <div className="story-section-inner">
          <div className="text-center max-w-4xl mx-auto">
            <ScrollReveal variant="scale">
              <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5em] text-cyan mb-6">
                The Answer
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.0] text-text-bright">
                ZeroTrace
                <br />
                <span className="gradient-heading">encrypts your intent</span>
              </h2>
              <p className="mt-8 text-lg leading-8 text-muted max-w-2xl mx-auto">
                Powered by Fully Homomorphic Encryption on the Fhenix CoFHE network,
                ZeroTrace processes encrypted orders without ever decrypting them.
                No one sees your trade — not even us.
              </p>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.3}>
              <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {[
                  { icon: "🔐", label: "Encrypted Intent", desc: "Orders encrypted client-side before submission" },
                  { icon: "⚡", label: "FHE Matching", desc: "Computation on ciphertext — no decryption needed" },
                  { icon: "🔗", label: "On-chain Settle", desc: "Only final settlement visible on blockchain" },
                ].map((item) => (
                  <div key={item.label} className="glass-panel p-6 text-center">
                    <span className="text-2xl block mb-3">{item.icon}</span>
                    <p className="font-semibold text-text-bright text-sm">{item.label}</p>
                    <p className="text-muted text-xs mt-2 leading-5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — ABOUT ZEROTRACE (FIXED LAYOUT)
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="about">
        <div className="story-section-inner">
          <ScrollReveal variant="fadeUp">
            <div className="text-center mb-12">
              <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5em] text-cyan mb-4">
                Deep Dive
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-bright">
                Inside <span className="gradient-heading">ZeroTrace</span>
              </h2>
              <p className="mt-3 text-muted max-w-xl mx-auto leading-7 text-sm">
                A privacy-first trading protocol — encrypted from intent to settlement.
              </p>
            </div>
          </ScrollReveal>

          {/* Row 1: Architecture + Technical Specs side by side */}
          <div className="grid lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {/* Left Column (3/5): Architecture & FHE */}
            <div className="lg:col-span-3 space-y-5">
              <ScrollReveal variant="fadeUp" delay={0.1}>
                <div className="glass-panel p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="feature-icon" style={{ width: 32, height: 32, fontSize: 14 }}>🏗️</div>
                    <h3 className="text-base font-semibold text-text-bright">Architecture</h3>
                  </div>
                  <p className="text-muted leading-7 text-[13px]">
                    ZeroTrace is a full-stack private trading protocol built on the{" "}
                    <span className="text-cyan">Fhenix CoFHE network</span> (Ethereum L2).
                    It uses <span className="text-text-bright font-medium">Fully Homomorphic Encryption (TFHE)</span> to enable
                    computation on encrypted data. Orders are encrypted client-side, submitted to a relayer,
                    matched off-chain in ciphertext, and settled on-chain through escrow smart contracts —
                    all without revealing order details to anyone.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fadeUp" delay={0.15}>
                <div className="glass-panel p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="feature-icon purple" style={{ width: 32, height: 32, fontSize: 14 }}>🔒</div>
                    <h3 className="text-base font-semibold text-text-bright">How FHE Works</h3>
                  </div>
                  <p className="text-muted leading-7 text-[13px]">
                    Unlike zero-knowledge proofs that prove statements about data, FHE allows{" "}
                    <span className="text-text-bright font-medium">actual computation on encrypted data</span>.
                    The matching engine compares encrypted buy and sell orders, calculates settlement amounts,
                    and determines execution eligibility — all while the data remains fully encrypted.
                    Only the final settlement is selectively decrypted by authorized parties through wallet-signed permits.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fadeUp" delay={0.2}>
                <div className="glass-panel p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="feature-icon electric" style={{ width: 32, height: 32, fontSize: 14 }}>💰</div>
                    <h3 className="text-base font-semibold text-text-bright">ZT Points & Rewards</h3>
                  </div>
                  <p className="text-muted leading-7 text-[13px]">
                    Every private trade earns <span className="text-cyan">ZT Points</span> based on volume and frequency.
                    Points unlock tier progression (Bronze → Silver → Gold → Diamond), leaderboard rankings,
                    and protocol governance rights. The reward system is designed to make
                    privacy-first routing the default behavior for sophisticated traders.
                  </p>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Column (2/5): Tech Specs + Pipeline */}
            <div className="lg:col-span-2 space-y-5">
              <ScrollReveal variant="fadeRight" delay={0.1}>
                <div className="glass-panel p-6 glass-card-accent">
                  <h3 className="text-sm font-semibold text-text-bright mb-4 uppercase tracking-wider">
                    Technical Specs
                  </h3>
                  <div className="space-y-0">
                    {[
                      { key: "Network", val: "Fhenix CoFHE (L2)" },
                      { key: "Encryption", val: "TFHE" },
                      { key: "Settlement", val: "Escrow Contracts" },
                      { key: "Auth", val: "EIP-712 Permits" },
                      { key: "Matching", val: "Off-chain FHE" },
                      { key: "API", val: "REST + WebSocket" },
                      { key: "Tokens", val: "ZETH, ZUSDC, ZDAI" },
                    ].map((spec) => (
                      <div key={spec.key} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                        <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.2em] text-muted/70">{spec.key}</span>
                        <span className="font-[var(--font-mono)] text-[11px] text-text-bright">{spec.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fadeRight" delay={0.2}>
                <div className="glass-panel p-6">
                  <h3 className="text-sm font-semibold text-text-bright mb-4 uppercase tracking-wider">
                    Privacy Pipeline
                  </h3>
                  <div className="space-y-2.5">
                    {[
                      { step: "1", label: "Sign order with wallet" },
                      { step: "2", label: "Encrypt via FHE public key" },
                      { step: "3", label: "Submit to relayer" },
                      { step: "4", label: "FHE match on ciphertext" },
                      { step: "5", label: "Send to escrow contract" },
                      { step: "6", label: "On-chain settlement" },
                    ].map((item, idx) => {
                      const colors = ["text-cyan", "text-cyan", "text-purple-400", "text-purple-400", "text-blue-400", "text-blue-400"];
                      const bgColors = ["bg-cyan/10 border-cyan/20", "bg-cyan/10 border-cyan/20", "bg-purple-400/10 border-purple-400/20", "bg-purple-400/10 border-purple-400/20", "bg-blue-400/10 border-blue-400/20", "bg-blue-400/10 border-blue-400/20"];
                      return (
                        <div key={item.step} className="flex items-center gap-3">
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full ${bgColors[idx]} border flex items-center justify-center font-[var(--font-mono)] text-[8px] ${colors[idx]}`}>
                            {item.step}
                          </span>
                          <span className="text-[12px] text-muted leading-5">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 5 — HOW IT WORKS
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="how-it-works">
        <div className="story-section-inner">
          <ScrollReveal variant="fadeUp">
            <div className="text-center mb-12">
              <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5em] text-cyan mb-4">
                Protocol Flow
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-bright">
                Three steps to <span className="gradient-text">invisible execution</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="relative max-w-3xl mx-auto">
            <div className="timeline-line" />

            {[
              {
                step: "01",
                icon: "🔐",
                title: "Submit encrypted intent",
                desc: "Your wallet-signed orders enter the system fully encrypted via FHE. No mempool leak, no orderbook exposure.",
                accent: "text-cyan/20",
                detail: "TFHE encryption with Fhenix CoFHE network public key"
              },
              {
                step: "02",
                icon: "⚡",
                title: "Private matching engine",
                desc: "The operator matches encrypted flows off-chain using FHE computation. Price, quantity, and direction remain hidden throughout.",
                accent: "text-purple-400/20",
                detail: "Homomorphic comparison + arithmetic on encrypted order data"
              },
              {
                step: "03",
                icon: "🔗",
                title: "On-chain settlement",
                desc: "Escrowed assets clear on-chain after counterparty lock. The blockchain sees only final amounts, not your strategy.",
                accent: "text-blue-400/20",
                detail: "Smart contract escrow with permit-based selective decryption"
              }
            ].map((item, i) => (
              <ScrollReveal key={item.step} variant="fadeLeft" delay={i * 0.15}>
                <div className="flex gap-6 mb-8 pl-0 relative">
                  <div className="timeline-dot">
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <div className="glass-panel p-5 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-[var(--font-mono)] text-2xl font-bold ${item.accent}`}>
                        {item.step}
                      </span>
                      <h3 className="text-lg font-semibold text-text-bright">{item.title}</h3>
                    </div>
                    <p className="text-muted leading-7 text-sm">{item.desc}</p>
                    <p className="mt-2 font-[var(--font-mono)] text-[9px] text-cyan/40 tracking-wider">
                      → {item.detail}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 6 — FEATURES
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="features">
        <div className="story-section-inner">
          <ScrollReveal variant="fadeUp">
            <div className="text-center mb-12">
              <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5em] text-cyan mb-4">
                Core Capabilities
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-bright">
                Built for <span className="gradient-text">stealth</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: "🛡️", title: "Zero MEV",
                desc: "Orders stay dark until settlement. Your alpha stays yours.",
                iconClass: ""
              },
              {
                icon: "⚙️", title: "API-First",
                desc: "REST + WebSocket endpoints for brokers, bots, and apps.",
                iconClass: "purple"
              },
              {
                icon: "💎", title: "Earn Rewards",
                desc: "ZT points compound with volume. Tier progression unlocks governance.",
                iconClass: "electric"
              },
              {
                icon: "🔑", title: "Wallet Permits",
                desc: "EIP-712 signed permits. No accounts, no KYC, no custody risk.",
                iconClass: ""
              },
              {
                icon: "📊", title: "Order Indexing",
                desc: "Wallet-scoped encrypted history. Track without exposure.",
                iconClass: "purple"
              },
              {
                icon: "🌐", title: "Multi-Pair",
                desc: "ZETH/ZUSDC, ZDAI/ZUSDC and more encrypted token pairs.",
                iconClass: "electric"
              }
            ].map((feature, i) => (
              <ScrollReveal key={feature.title} variant="scale" delay={i * 0.06}>
                <div className="glass-panel p-6 h-full group transition-all duration-400">
                  <div className={`feature-icon ${feature.iconClass} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold text-text-bright mb-1.5">{feature.title}</h3>
                  <p className="text-muted leading-6 text-sm">{feature.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 7 — API PREVIEW
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="api">
        <div className="story-section-inner">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <ScrollReveal variant="fadeLeft">
              <div className="glass-panel p-5 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-sell/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-buy/60" />
                  <span className="ml-3 font-[var(--font-mono)] text-[9px] text-muted uppercase tracking-wider">
                    terminal
                  </span>
                </div>
                <TypeWriter
                  code={apiCode}
                  typingSpeed={18}
                  className="overflow-x-auto rounded-lg bg-[rgba(0,0,0,0.5)] p-4 font-[var(--font-mono)] text-sm leading-6 text-cyan border border-white/[0.03]"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal variant="fadeRight" delay={0.2}>
              <div>
                <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5em] text-cyan mb-4">
                  Developer First
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-text-bright leading-tight">
                  Route private liquidity
                  <br />
                  <span className="gradient-text">into your stack</span>
                </h2>
                <p className="mt-5 text-muted leading-7 text-sm">
                  REST endpoints, wallet-authenticated order indexing,
                  permit-based decrypts, and a rewards system built for power users.
                </p>

                {/* API endpoints preview */}
                <div className="mt-5 space-y-1">
                  {[
                    { method: "POST", path: "/api/v1/order/submit" },
                    { method: "GET", path: "/api/v1/orders/:wallet" },
                    { method: "GET", path: "/api/v1/rewards/:wallet" },
                  ].map((ep) => (
                    <div key={ep.path} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
                      <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-wider text-cyan bg-cyan/[0.06] px-2 py-0.5 rounded-[var(--radius)]">
                        {ep.method}
                      </span>
                      <span className="font-[var(--font-mono)] text-xs text-text-bright">{ep.path}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/docs" className="btn-secondary">
                    View Full API Docs
                  </Link>
                  <Link href="/trade" className="btn-primary">
                    Try It Live
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 8 — PROTOCOL CAPABILITIES (NOT MOCK DATA)
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="capabilities">
        <div className="story-section-inner">
          <ScrollReveal variant="fadeUp">
            <div className="text-center mb-12">
              <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5em] text-cyan mb-4">
                Protocol Design
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-bright">
                Engineered for <span className="gradient-text">precision</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { label: "Encryption Standard", value: "TFHE", desc: "Fully Homomorphic", icon: "🔐" },
              { label: "Network Layer", value: "L2", desc: "Fhenix CoFHE", icon: "🌐" },
              { label: "Order Type", value: "Encrypted", desc: "Zero plaintext leaks", icon: "📡" },
              { label: "Settlement", value: "On-chain", desc: "Escrow contracts", icon: "⛓️" },
            ].map((item, i) => (
              <ScrollReveal key={item.label} variant="fadeUp" delay={i * 0.08}>
                <div className="glass-panel p-5 text-center">
                  <span className="text-xl mb-2 block">{item.icon}</span>
                  <p className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.3em] text-muted/70 mb-2">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold text-text-bright">
                    {item.value}
                  </p>
                  <p className="text-[11px] text-muted/50 mt-1">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
        <div className="story-divider" />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 9 — FINAL CTA
          ═══════════════════════════════════════════ */}
      <section className="story-section" id="cta">
        <div className="story-section-inner">
          <div className="text-center max-w-3xl mx-auto">
            <ScrollReveal variant="scale">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] text-text-bright mb-5">
                Enter the
                <br />
                <span className="gradient-heading">Terminal</span>
              </h2>
              <p className="text-base text-muted max-w-md mx-auto mb-8">
                No trail. No trace. Just execution.
              </p>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/trade" className="btn-hero">
                  Launch Terminal
                </Link>
                <Link href="/docs" className="btn-secondary">
                  Documentation
                </Link>
              </div>
            </ScrollReveal>

            {/* Footer */}
            <div className="mt-16 pt-6 border-t border-white/[0.04]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.3em] text-muted/50">
                  ZeroTrace © 2025 — Trade Without a Trail
                </p>
                <div className="flex items-center gap-5">
                  <Link href="/docs" className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.2em] text-muted/40 hover:text-cyan/60 transition-colors">
                    Docs
                  </Link>
                  <Link href="/trade" className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.2em] text-muted/40 hover:text-cyan/60 transition-colors">
                    Trade
                  </Link>
                  <span className="font-[var(--font-mono)] text-[9px] uppercase tracking-[0.2em] text-muted/40">
                    Built on Fhenix CoFHE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
