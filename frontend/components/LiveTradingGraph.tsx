"use client";

import { useEffect, useRef, useCallback } from "react";

/* ─── Types ──────────────────────────────── */
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface OrderLevel {
  price: number;
  size: number;
}

/* ─── Realistic price simulation (Enhanced GBM) ── */
function createMarketSimulator(startPrice: number) {
  let price = startPrice;
  let trend = 0;
  let momentum = 0;
  let volatility = 0.00018;
  let regime: "calm" | "volatile" | "trending" = "calm";
  let regimeCounter = 0;
  let trendDirection = 0;

  return {
    tick(): number {
      regimeCounter++;

      // Regime switching — creates realistic market phases
      if (regimeCounter > 200 + Math.random() * 400) {
        regimeCounter = 0;
        const r = Math.random();
        if (r < 0.5) {
          regime = "calm";
          volatility = 0.00012 + Math.random() * 0.00008;
        } else if (r < 0.8) {
          regime = "volatile";
          volatility = 0.0003 + Math.random() * 0.0002;
        } else {
          regime = "trending";
          volatility = 0.00015 + Math.random() * 0.0001;
          trendDirection = Math.random() > 0.5 ? 1 : -1;
        }
      }

      // Micro-trend with mean-reversion
      if (regime === "trending") {
        trend += trendDirection * 0.000008;
      } else {
        trend += (Math.random() - 0.5) * 0.00006;
      }
      trend *= 0.992;

      // Brownian noise
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const noise = gaussian * volatility * price;

      const drift = trend * price;

      // Momentum with decay
      momentum = momentum * 0.85 + (noise + drift) * 0.15;

      // Mean-reversion — always pulls back toward start
      const deviation = (price - startPrice) / startPrice;
      momentum -= deviation * price * 0.0003;

      // Occasional micro-spikes (order flow imbalance)
      if (Math.random() < 0.008) {
        momentum += (Math.random() - 0.5) * price * 0.001;
      }

      price += momentum;

      // Soft clamp: ±4% of start
      const maxPrice = startPrice * 1.04;
      const minPrice = startPrice * 0.96;
      if (price > maxPrice) { price = maxPrice - Math.random() * price * 0.001; momentum = -Math.abs(momentum) * 0.3; }
      if (price < minPrice) { price = minPrice + Math.random() * price * 0.001; momentum = Math.abs(momentum) * 0.3; }

      return price;
    },
    getPrice(): number {
      return price;
    }
  };
}

/* ─── EMA calculator ──────────────────────── */
function calcEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const ema: number[] = [];
  const k = 2 / (period + 1);
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

/* ─── Bollinger Bands ──────────────────────── */
function calcBollinger(data: number[], period: number, stdDev: number) {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - period + 1);
    const slice = data.slice(start, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
    const sd = Math.sqrt(variance);

    middle.push(mean);
    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
  }

  return { upper, middle, lower };
}

/* ─── Generate synthetic order book ─────── */
function generateOrderBook(currentPrice: number): { bids: OrderLevel[]; asks: OrderLevel[] } {
  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];
  const levels = 12;

  for (let i = 0; i < levels; i++) {
    const spread = (i + 1) * (currentPrice * 0.0008);
    bids.push({
      price: currentPrice - spread,
      size: 0.5 + Math.random() * 4 + (levels - i) * 0.3
    });
    asks.push({
      price: currentPrice + spread,
      size: 0.5 + Math.random() * 4 + (levels - i) * 0.3
    });
  }

  return { bids, asks };
}

/* ─── Color constants (Kinetic Vault / Aether Terminal) ── */
const COLORS = {
  bull: "#22c55e",
  bullAlpha: "rgba(34, 197, 94,",
  bear: "#ef4444",
  bearAlpha: "rgba(239, 68, 68,",
  cyan: "#00f2ff",
  cyanAlpha: "rgba(0, 242, 255,",
  purple: "#a855f7",
  purpleAlpha: "rgba(168, 85, 247,",
  amber: "#f59e0b",
  amberAlpha: "rgba(245, 158, 11,",
  surfaceLowest: "#0a0e17",
  surfaceLow: "#181b25",
  surfaceContainer: "#1c1f29",
  surfaceHigh: "#262a34",
  surfaceHighest: "#31353f",
  textBright: "#dfe2ef",
  textMuted: "#849495",
  textDim: "rgba(132, 148, 149, 0.4)",
  gridLine: "rgba(255, 255, 255, 0.018)",
  gridLineBright: "rgba(255, 255, 255, 0.035)",
};

export function LiveTradingGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const candlesRef = useRef<Candle[]>([]);
  const frameRef = useRef(0);
  const simRef = useRef(createMarketSimulator(2450));
  const currentCandleRef = useRef<Candle | null>(null);
  const ticksInCandleRef = useRef(0);
  const dimRef = useRef({ w: 0, h: 0 });
  const smoothPriceRef = useRef(2450);
  const orderBookRef = useRef(generateOrderBook(2450));
  const obUpdateRef = useRef(0);

  /* ─── Generate realistic historical candles ─ */
  const generateHistory = useCallback(() => {
    const sim = createMarketSimulator(2450);
    const candles: Candle[] = [];
    const HISTORY_TICKS = 20;

    for (let c = 0; c < 40; c++) {
      let open = sim.getPrice();
      let high = open;
      let low = open;
      let close = open;
      let volume = 0;

      for (let t = 0; t < HISTORY_TICKS; t++) {
        const p = sim.tick();
        if (p > high) high = p;
        if (p < low) low = p;
        close = p;
        volume += 2 + Math.random() * 8;
      }

      candles.push({
        open, high, low, close,
        volume: 30 + volume,
        timestamp: Date.now() - (40 - c) * 5 * 60000
      });
    }

    simRef.current = createMarketSimulator(candles[candles.length - 1].close);
    smoothPriceRef.current = candles[candles.length - 1].close;
    return candles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      dimRef.current = { w: rect.width, h: rect.height };
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    candlesRef.current = generateHistory();
    currentCandleRef.current = null;
    ticksInCandleRef.current = 0;

    const TICKS_PER_CANDLE = 140;

    /* ─── Simulation ──────────────────────── */
    function updateSimulation() {
      const sim = simRef.current;
      const price = sim.tick();
      ticksInCandleRef.current++;

      // Smooth price interpolation for the current price display
      smoothPriceRef.current += (price - smoothPriceRef.current) * 0.15;

      if (!currentCandleRef.current) {
        currentCandleRef.current = {
          open: price, high: price, low: price, close: price,
          volume: Math.random() * 5, timestamp: Date.now()
        };
      } else {
        const cc = currentCandleRef.current;
        cc.close = price;
        if (price > cc.high) cc.high = price;
        if (price < cc.low) cc.low = price;
        cc.volume += Math.random() * 0.8;
      }

      // Complete candle
      if (ticksInCandleRef.current >= TICKS_PER_CANDLE) {
        const cc = currentCandleRef.current;
        if (cc) {
          candlesRef.current.push({ ...cc });
          if (candlesRef.current.length > 60) candlesRef.current.shift();
        }
        currentCandleRef.current = null;
        ticksInCandleRef.current = 0;
      }

      // Update order book periodically
      obUpdateRef.current++;
      if (obUpdateRef.current > 30) {
        obUpdateRef.current = 0;
        orderBookRef.current = generateOrderBook(price);
      }
    }

    /* ─── Drawing ──────────────────────── */
    function draw() {
      const { w, h } = dimRef.current;
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(draw); return; }

      updateSimulation();
      frameRef.current++;

      // Fill background
      ctx!.fillStyle = COLORS.surfaceLowest;
      ctx!.fillRect(0, 0, w, h);

      // Build display candles
      const allCandles = [...candlesRef.current];
      if (currentCandleRef.current) allCandles.push(currentCandleRef.current);
      if (allCandles.length === 0) { animRef.current = requestAnimationFrame(draw); return; }

      const displayCandles = allCandles.slice(-45);
      const closePrices = displayCandles.map(c => c.close);

      // ═══ Layout (with order book sidebar) ═══
      const statsBarH = 32;
      const headerH = 42;
      const obWidth = Math.min(90, w * 0.12);
      const pad = { top: headerH + statsBarH, bottom: 38, left: 6, right: obWidth + 58 };
      const chartW = w - pad.left - pad.right;
      const chartH = h - pad.top - pad.bottom;

      // Price range
      let minP = Infinity, maxP = -Infinity;
      for (const c of displayCandles) {
        if (c.low < minP) minP = c.low;
        if (c.high > maxP) maxP = c.high;
      }
      const rangePad = (maxP - minP) * 0.06;
      minP -= rangePad;
      maxP += rangePad;
      const range = maxP - minP || 1;
      const priceToY = (p: number) => pad.top + chartH * (1 - (p - minP) / range);

      // ═══ HEADER BAR (Kinetic Vault style) ═══
      drawHeader(ctx!, w, headerH, displayCandles);

      // ═══ STATS BAR ═══
      drawStatsBar(ctx!, w, headerH, statsBarH, displayCandles);

      // ═══ Grid lines ═══
      const gridLevels = 6;
      for (let i = 0; i <= gridLevels; i++) {
        const y = pad.top + (chartH / gridLevels) * i;
        const p = maxP - (range / gridLevels) * i;

        // Grid line (tonal depth, no borders)
        ctx!.strokeStyle = i === Math.floor(gridLevels / 2) ? COLORS.gridLineBright : COLORS.gridLine;
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.moveTo(pad.left, y);
        ctx!.lineTo(w - obWidth - 14, y);
        ctx!.stroke();

        // Price label
        ctx!.fillStyle = COLORS.textDim;
        ctx!.font = "9px 'Space Grotesk', 'JetBrains Mono', monospace";
        ctx!.textAlign = "right";
        ctx!.fillText(`$${p.toFixed(0)}`, w - obWidth - 8, y + 3);
      }

      // ═══ Bollinger Bands (subtle fill) ═══
      if (closePrices.length >= 5) {
        const bb = calcBollinger(closePrices, Math.min(20, closePrices.length), 2);
        const candleGap = chartW / displayCandles.length;

        // Bollinger band fill
        ctx!.save();
        ctx!.beginPath();
        for (let i = 0; i < bb.upper.length; i++) {
          const x = pad.left + candleGap * i + candleGap * 0.5;
          if (i === 0) ctx!.moveTo(x, priceToY(bb.upper[i]));
          else ctx!.lineTo(x, priceToY(bb.upper[i]));
        }
        for (let i = bb.lower.length - 1; i >= 0; i--) {
          const x = pad.left + candleGap * i + candleGap * 0.5;
          ctx!.lineTo(x, priceToY(bb.lower[i]));
        }
        ctx!.closePath();
        ctx!.fillStyle = `${COLORS.purpleAlpha} 0.025)`;
        ctx!.fill();
        ctx!.restore();

        // Upper/lower bands
        ctx!.save();
        ctx!.setLineDash([2, 4]);
        ctx!.lineWidth = 0.5;

        ctx!.strokeStyle = `${COLORS.purpleAlpha} 0.15)`;
        ctx!.beginPath();
        for (let i = 0; i < bb.upper.length; i++) {
          const x = pad.left + candleGap * i + candleGap * 0.5;
          if (i === 0) ctx!.moveTo(x, priceToY(bb.upper[i]));
          else ctx!.lineTo(x, priceToY(bb.upper[i]));
        }
        ctx!.stroke();

        ctx!.beginPath();
        for (let i = 0; i < bb.lower.length; i++) {
          const x = pad.left + candleGap * i + candleGap * 0.5;
          if (i === 0) ctx!.moveTo(x, priceToY(bb.lower[i]));
          else ctx!.lineTo(x, priceToY(bb.lower[i]));
        }
        ctx!.stroke();
        ctx!.restore();
      }

      // ═══ Candlesticks ═══
      const candleGap = chartW / displayCandles.length;
      const candleW = Math.max(2, Math.min(candleGap * 0.58, 12));

      for (let i = 0; i < displayCandles.length; i++) {
        const c = displayCandles[i];
        const cx = pad.left + candleGap * i + candleGap * 0.5;
        const isBull = c.close >= c.open;

        const bodyTop = priceToY(Math.max(c.open, c.close));
        const bodyBot = priceToY(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);

        // Progressive opacity (older candles fade more)
        const age = i / displayCandles.length;
        const alpha = 0.3 + age * 0.7;

        // Wick
        ctx!.save();
        ctx!.globalAlpha = alpha * 0.55;
        ctx!.strokeStyle = isBull ? COLORS.bull : COLORS.bear;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(cx, priceToY(c.high));
        ctx!.lineTo(cx, priceToY(c.low));
        ctx!.stroke();
        ctx!.restore();

        // Body with subtle gradient
        ctx!.save();
        ctx!.globalAlpha = alpha;
        const bodyGrad = ctx!.createLinearGradient(0, bodyTop, 0, bodyTop + bodyH);
        if (isBull) {
          bodyGrad.addColorStop(0, `${COLORS.bullAlpha} 0.95)`);
          bodyGrad.addColorStop(1, `${COLORS.bullAlpha} 0.7)`);
        } else {
          bodyGrad.addColorStop(0, `${COLORS.bearAlpha} 0.95)`);
          bodyGrad.addColorStop(1, `${COLORS.bearAlpha} 0.7)`);
        }
        ctx!.fillStyle = bodyGrad;

        // Slightly rounded candle bodies
        const r = Math.min(1.5, candleW * 0.15);
        ctx!.beginPath();
        ctx!.roundRect(cx - candleW / 2, bodyTop, candleW, bodyH, r);
        ctx!.fill();
        ctx!.restore();

        // Volume bar (subtle at bottom)
        const maxVol = Math.max(...displayCandles.map(cc => cc.volume));
        const volH = (c.volume / (maxVol || 1)) * (chartH * 0.1);
        ctx!.save();
        ctx!.globalAlpha = alpha * 0.14;
        ctx!.fillStyle = isBull ? COLORS.bull : COLORS.bear;
        ctx!.fillRect(cx - candleW * 0.4, h - pad.bottom - volH, candleW * 0.8, volH);
        ctx!.restore();
      }

      // ═══ EMA Lines (9 and 21 period) ═══
      if (closePrices.length >= 3) {
        const ema9 = calcEMA(closePrices, Math.min(9, closePrices.length));
        const ema21 = calcEMA(closePrices, Math.min(21, closePrices.length));

        // EMA 21 — area fill
        ctx!.save();
        ctx!.beginPath();
        for (let i = 0; i < ema21.length; i++) {
          const x = pad.left + candleGap * i + candleGap * 0.5;
          const y = priceToY(ema21[i]);
          if (i === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        const lastX21 = pad.left + candleGap * (ema21.length - 1) + candleGap * 0.5;
        ctx!.lineTo(lastX21, h - pad.bottom);
        ctx!.lineTo(pad.left + candleGap * 0.5, h - pad.bottom);
        ctx!.closePath();
        const areaGrad = ctx!.createLinearGradient(0, pad.top, 0, h - pad.bottom);
        areaGrad.addColorStop(0, `${COLORS.cyanAlpha} 0.04)`);
        areaGrad.addColorStop(0.4, `${COLORS.cyanAlpha} 0.015)`);
        areaGrad.addColorStop(1, `${COLORS.cyanAlpha} 0)`);
        ctx!.fillStyle = areaGrad;
        ctx!.fill();
        ctx!.restore();

        // EMA 21 stroke
        drawSmoothLine(ctx!, ema21, candleGap, pad.left, priceToY, `${COLORS.cyanAlpha} 0.45)`, 1.2, COLORS.cyan, 4);

        // EMA 9 stroke (amber, thinner)
        drawSmoothLine(ctx!, ema9, candleGap, pad.left, priceToY, `${COLORS.amberAlpha} 0.35)`, 0.8, COLORS.amber, 3);
      }

      // ═══ Current price indicator ═══
      const lastCandle = displayCandles[displayCandles.length - 1];
      const currentPrice = smoothPriceRef.current;
      const lastY = priceToY(currentPrice);
      const lastCandleX = pad.left + candleGap * (displayCandles.length - 1) + candleGap * 0.5;

      // Dashed price line
      ctx!.save();
      ctx!.setLineDash([3, 4]);
      ctx!.strokeStyle = `${COLORS.cyanAlpha} 0.1)`;
      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      ctx!.moveTo(pad.left, lastY);
      ctx!.lineTo(w - obWidth - 14, lastY);
      ctx!.stroke();
      ctx!.restore();

      // Pulse ring (animated)
      const pulseScale = 1 + Math.sin(frameRef.current * 0.05) * 0.4;
      ctx!.save();
      ctx!.globalAlpha = 0.15 / pulseScale;
      ctx!.beginPath();
      ctx!.arc(lastCandleX, lastY, 8 * pulseScale, 0, Math.PI * 2);
      ctx!.fillStyle = COLORS.cyan;
      ctx!.fill();
      ctx!.restore();

      // Core dot
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(lastCandleX, lastY, 2.5, 0, Math.PI * 2);
      ctx!.fillStyle = COLORS.cyan;
      ctx!.shadowColor = `${COLORS.cyanAlpha} 0.6)`;
      ctx!.shadowBlur = 12;
      ctx!.fill();
      ctx!.restore();

      // Price label badge
      ctx!.save();
      const labelW = 72, labelH = 19;
      const labelX = w - obWidth - 12 - labelW;
      const labelY = lastY - labelH / 2;

      // Background
      ctx!.fillStyle = `${COLORS.cyanAlpha} 0.08)`;
      ctx!.beginPath();
      ctx!.roundRect(labelX, labelY, labelW, labelH, 3);
      ctx!.fill();

      // Border glow
      ctx!.strokeStyle = `${COLORS.cyanAlpha} 0.2)`;
      ctx!.lineWidth = 0.5;
      ctx!.stroke();

      // Text
      ctx!.fillStyle = COLORS.cyan;
      ctx!.font = "bold 9px 'Space Grotesk', 'JetBrains Mono', monospace";
      ctx!.textAlign = "center";
      ctx!.fillText(`$${currentPrice.toFixed(2)}`, labelX + labelW / 2, lastY + 3.5);
      ctx!.restore();

      // ═══ Order Book Depth (right sidebar heatmap) ═══
      drawOrderBook(ctx!, w, obWidth, pad.top, chartH, orderBookRef.current, currentPrice, priceToY, minP, maxP);

      // ═══ Time axis ═══
      ctx!.save();
      ctx!.fillStyle = COLORS.textDim;
      ctx!.font = "8px 'Space Grotesk', 'JetBrains Mono', monospace";
      ctx!.textAlign = "center";
      const timeLabels = 6;
      for (let i = 0; i <= timeLabels; i++) {
        const idx = Math.floor((displayCandles.length - 1) * (i / timeLabels));
        if (idx >= 0 && idx < displayCandles.length) {
          const x = pad.left + candleGap * idx + candleGap * 0.5;
          const d = new Date(displayCandles[idx].timestamp);
          ctx!.fillText(
            `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
            x,
            h - 6
          );
        }
      }
      ctx!.restore();

      // ═══ EMA Legend ═══
      ctx!.save();
      ctx!.font = "8px 'Space Grotesk', monospace";

      // EMA 9
      ctx!.fillStyle = `${COLORS.amberAlpha} 0.5)`;
      ctx!.fillRect(pad.left + 4, h - pad.bottom - 16, 12, 2);
      ctx!.fillText("EMA 9", pad.left + 20, h - pad.bottom - 12);

      // EMA 21
      ctx!.fillStyle = `${COLORS.cyanAlpha} 0.5)`;
      ctx!.fillRect(pad.left + 64, h - pad.bottom - 16, 12, 2);
      ctx!.fillText("EMA 21", pad.left + 80, h - pad.bottom - 12);

      // BB
      ctx!.fillStyle = `${COLORS.purpleAlpha} 0.4)`;
      ctx!.fillRect(pad.left + 132, h - pad.bottom - 16, 12, 2);
      ctx!.fillText("BB(20,2)", pad.left + 148, h - pad.bottom - 12);

      ctx!.restore();

      animRef.current = requestAnimationFrame(draw);
    }

    /* ─── Header drawing ──────────────────── */
    function drawHeader(ctx: CanvasRenderingContext2D, w: number, headerH: number, candles: Candle[]) {
      // Header background (tonal depth)
      ctx.fillStyle = COLORS.surfaceLow;
      ctx.fillRect(0, 0, w, headerH);

      // Subtle bottom border glow
      const borderGrad = ctx.createLinearGradient(0, headerH - 1, w, headerH - 1);
      borderGrad.addColorStop(0, "rgba(0, 242, 255, 0)");
      borderGrad.addColorStop(0.3, "rgba(0, 242, 255, 0.06)");
      borderGrad.addColorStop(0.7, "rgba(0, 242, 255, 0.06)");
      borderGrad.addColorStop(1, "rgba(0, 242, 255, 0)");
      ctx.fillStyle = borderGrad;
      ctx.fillRect(0, headerH - 1, w, 1);

      const lastCandle = candles[candles.length - 1];
      const prevClose = candles.length > 1 ? candles[candles.length - 2].close : lastCandle.close;
      const currentPrice = smoothPriceRef.current;
      const changeAmt = currentPrice - prevClose;
      const changePct = (changeAmt / prevClose) * 100;
      const isBullChange = changeAmt >= 0;

      let xPos = 14;

      // Pair name chip
      ctx.fillStyle = COLORS.surfaceHighest;
      ctx.beginPath();
      ctx.roundRect(xPos, 8, 88, 26, 4);
      ctx.fill();
      ctx.fillStyle = COLORS.cyan;
      ctx.font = "bold 10px 'Space Grotesk', monospace";
      ctx.textAlign = "left";
      ctx.fillText("ZETH / ZUSDC", xPos + 8, 25);
      xPos += 100;

      // Price
      ctx.fillStyle = COLORS.textBright;
      ctx.font = "bold 18px 'Space Grotesk', 'Inter', sans-serif";
      ctx.fillText(`$${currentPrice.toFixed(2)}`, xPos, 27);
      xPos += ctx.measureText(`$${currentPrice.toFixed(2)}`).width + 14;

      // Change
      ctx.fillStyle = isBullChange ? `${COLORS.bullAlpha} 0.85)` : `${COLORS.bearAlpha} 0.85)`;
      ctx.font = "11px 'Space Grotesk', monospace";
      const sign = isBullChange ? "+" : "";
      const changeText = `${sign}${changeAmt.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
      ctx.fillText(changeText, xPos, 27);
      xPos += ctx.measureText(changeText).width + 12;

      // Arrow indicator
      ctx.fillStyle = isBullChange ? COLORS.bull : COLORS.bear;
      ctx.font = "12px sans-serif";
      ctx.fillText(isBullChange ? "▲" : "▼", xPos, 27);

      // LIVE indicator (right side)
      const liveX = w - 68;
      const liveDotRadius = 3;
      const livePulse = 1 + Math.sin(frameRef.current * 0.08) * 0.3;

      // Pulsing glow
      ctx.save();
      ctx.globalAlpha = 0.2 / livePulse;
      ctx.beginPath();
      ctx.arc(liveX, 21, liveDotRadius * 2.5 * livePulse, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bull;
      ctx.fill();
      ctx.restore();

      // Solid dot
      ctx.beginPath();
      ctx.arc(liveX, 21, liveDotRadius, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bull;
      ctx.fill();

      ctx.fillStyle = `${COLORS.bullAlpha} 0.8)`;
      ctx.font = "bold 9px 'Space Grotesk', monospace";
      ctx.textAlign = "left";
      ctx.fillText("LIVE", liveX + 8, 24);
    }

    /* ─── Stats Bar ──────────────────── */
    function drawStatsBar(ctx: CanvasRenderingContext2D, w: number, headerH: number, barH: number, candles: Candle[]) {
      const y = headerH;

      // Background
      ctx.fillStyle = COLORS.surfaceContainer;
      ctx.fillRect(0, y, w, barH);

      // Bottom separator
      ctx.fillStyle = COLORS.gridLine;
      ctx.fillRect(0, y + barH - 1, w, 1);

      const allHighs = candles.map(c => c.high);
      const allLows = candles.map(c => c.low);
      const totalVol = candles.reduce((sum, c) => sum + c.volume, 0);
      const high24 = Math.max(...allHighs);
      const low24 = Math.min(...allLows);

      const stats = [
        { label: "24H HIGH", value: `$${high24.toFixed(2)}`, color: COLORS.bull },
        { label: "24H LOW", value: `$${low24.toFixed(2)}`, color: COLORS.bear },
        { label: "24H VOL", value: `${(totalVol / 1000).toFixed(1)}K`, color: COLORS.cyan },
        { label: "SPREAD", value: "0.04%", color: COLORS.textMuted },
        { label: "FUNDING", value: "0.01%", color: COLORS.amber },
      ];

      let xPos = 14;
      ctx.save();
      for (const stat of stats) {
        // Label
        ctx.font = "7px 'Space Grotesk', monospace";
        ctx.fillStyle = COLORS.textDim;
        ctx.textAlign = "left";
        ctx.fillText(stat.label, xPos, y + 13);

        // Value
        ctx.font = "bold 9px 'Space Grotesk', monospace";
        ctx.fillStyle = stat.color;
        ctx.fillText(stat.value, xPos, y + 25);

        xPos += 100;
      }
      ctx.restore();
    }

    /* ─── Order Book Depth Heatmap ──────── */
    function drawOrderBook(
      ctx: CanvasRenderingContext2D,
      w: number, obWidth: number,
      topY: number, chartH: number,
      ob: { bids: OrderLevel[]; asks: OrderLevel[] },
      currentPrice: number,
      priceToY: (p: number) => number,
      minP: number, maxP: number
    ) {
      const x = w - obWidth - 4;

      // Background
      ctx.fillStyle = COLORS.surfaceLow;
      ctx.fillRect(x, topY, obWidth + 4, chartH);

      // Label
      ctx.save();
      ctx.fillStyle = COLORS.textDim;
      ctx.font = "7px 'Space Grotesk', monospace";
      ctx.textAlign = "center";
      ctx.fillText("DEPTH", x + obWidth / 2, topY + 10);
      ctx.restore();

      const maxSize = Math.max(
        ...ob.bids.map(l => l.size),
        ...ob.asks.map(l => l.size)
      );

      // Draw bid levels (below price — green)
      for (const level of ob.bids) {
        const y = priceToY(level.price);
        if (y < topY || y > topY + chartH) continue;
        const barW = (level.size / maxSize) * (obWidth - 8);
        const alpha = 0.15 + (level.size / maxSize) * 0.35;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS.bull;
        ctx.fillRect(x + 4, y - 1, barW, 3);
        ctx.restore();
      }

      // Draw ask levels (above price — red)
      for (const level of ob.asks) {
        const y = priceToY(level.price);
        if (y < topY || y > topY + chartH) continue;
        const barW = (level.size / maxSize) * (obWidth - 8);
        const alpha = 0.15 + (level.size / maxSize) * 0.35;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS.bear;
        ctx.fillRect(x + 4, y - 1, barW, 3);
        ctx.restore();
      }

      // Current price line on order book
      const cpY = priceToY(currentPrice);
      ctx.save();
      ctx.fillStyle = `${COLORS.cyanAlpha} 0.6)`;
      ctx.fillRect(x, cpY - 0.5, obWidth + 4, 1);
      ctx.restore();
    }

    /* ─── Smooth line helper ──────────── */
    function drawSmoothLine(
      ctx: CanvasRenderingContext2D,
      data: number[], gap: number, padLeft: number,
      toY: (p: number) => number,
      color: string, lineWidth: number,
      glowColor: string, glowBlur: number
    ) {
      if (data.length < 2) return;

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = padLeft + gap * i + gap * 0.5;
        const y = toY(data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else {
          // Cubic bezier for smoother curves
          const prevX = padLeft + gap * (i - 1) + gap * 0.5;
          const prevY = toY(data[i - 1]);
          const cpx = (prevX + x) / 2;
          ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = `${glowColor.replace(")", "")}, 0.15)`;
      ctx.shadowBlur = glowBlur;
      ctx.stroke();
      ctx.restore();
    }

    resize();
    animRef.current = requestAnimationFrame(draw);

    const resizeObs = new ResizeObserver(() => resize());
    resizeObs.observe(canvas);

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObs.disconnect();
    };
  }, [generateHistory]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block", borderRadius: "6px" }}
      aria-label="Live trading chart showing ZETH/ZUSDC price movements with order book depth"
    />
  );
}
