"use client";

import { FloatingShapes } from "@/components/FloatingShapes";
import { OrderForm } from "@/components/OrderForm";
import { OrderTable } from "@/components/OrderTable";
import { StatsBar } from "@/components/StatsBar";
import { TradeFeed } from "@/components/TradeFeed";

export default function TradePage() {
  return (
    <div className="relative mx-auto max-w-7xl">
      {/* 3D Floating Shapes Background */}
      <FloatingShapes />

      {/* Stats Bar - Full Width */}
      <div className="relative z-10 mb-4">
        <StatsBar />
      </div>

      {/* Terminal Grid */}
      <div className="relative z-10 grid gap-4 lg:grid-cols-[380px,1fr]">
        {/* Left Column: Order Form */}
        <div className="grid gap-4 content-start">
          <OrderForm />
        </div>

        {/* Right Column: Chart Placeholder + Orders + Feed */}
        <div className="grid gap-4 content-start">
          {/* Chart Placeholder */}
          <div className="glass-card glass-card-accent relative min-h-[320px] overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
                  Market Chart
                </p>
                <h3 className="mt-1.5 text-lg font-semibold text-text-bright">
                  ZETH / ZUSDC
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {["1H", "4H", "1D"].map((tf, i) => (
                  <span
                    key={tf}
                    className={`rounded-md border px-2 py-1 font-[var(--font-mono)] text-[10px] transition-colors cursor-pointer ${
                      i === 0
                        ? "border-cyan/30 bg-cyan/10 text-cyan"
                        : "border-white/[0.06] bg-white/[0.03] text-muted hover:text-text"
                    }`}
                  >
                    {tf}
                  </span>
                ))}
              </div>
            </div>

            {/* Mock Candlestick Chart */}
            <div className="mt-4 flex h-56 items-end justify-center gap-0.5 px-2">
              {[65, 40, 75, 50, 85, 35, 70, 55, 90, 45, 60, 80, 42, 72, 58, 88, 38, 68, 52, 78, 44, 82, 36, 74, 56, 86, 48, 62, 76, 50, 68, 42, 78, 55, 85, 40, 72, 60, 82, 48].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center">
                  {/* Wick */}
                  <div
                    className={`w-px ${i % 3 === 0 ? "bg-sell/30" : "bg-buy/30"}`}
                    style={{ height: `${Math.random() * 10 + 5}%` }}
                  />
                  {/* Body */}
                  <div
                    className={`w-full rounded-[1px] transition-all duration-300 ${
                      i % 3 === 0 ? "bg-sell/60 hover:bg-sell" : "bg-buy/60 hover:bg-buy"
                    }`}
                    style={{ height: `${h}%`, minWidth: "4px" }}
                  />
                  {/* Wick */}
                  <div
                    className={`w-px ${i % 3 === 0 ? "bg-sell/30" : "bg-buy/30"}`}
                    style={{ height: `${Math.random() * 8 + 3}%` }}
                  />
                </div>
              ))}
            </div>

            {/* Price line overlay */}
            <div className="absolute left-0 right-0 top-[45%] border-t border-dashed border-cyan/10 pointer-events-none">
              <span className="absolute -top-3 right-3 rounded bg-cyan/10 px-1.5 py-0.5 font-[var(--font-mono)] text-[10px] text-cyan">
                $2,412.50
              </span>
            </div>

            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[rgba(10,15,30,0.65)] to-transparent pointer-events-none" />
          </div>

          {/* Orders + Feed Grid */}
          <div className="grid gap-4 xl:grid-cols-2">
            <OrderTable />
            <TradeFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
