"use client";

import { useEffect, useRef, useCallback } from "react";

/* ─── Type definitions ──────────────────────────── */
interface Rail {
  points: { x: number; y: number }[];
  pulsePos: number;
  pulseSpeed: number;
  pulseLength: number;
  color: string;
  width: number;
  opacity: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  type: "edge" | "data" | "spark";
}

interface GlowOrb {
  x: number; y: number;
  radius: number; color: string;
  phase: number; speed: number;
  baseOpacity: number;
  driftX: number; driftY: number;
}

interface HexCell {
  cx: number; cy: number; r: number;
  phase: number; speed: number;
}

interface DataStream {
  x: number; y: number;
  chars: string[];
  speed: number;
  opacity: number;
  charIndex: number;
  col: number;
}

/* ─── Constants ─────────────────────────────────── */
const CYAN = "0, 242, 255";
const PURPLE = "112, 0, 255";
const ELECTRIC = "59, 130, 246";
const TERTIARY = "189, 0, 255";
const WHITE = "255, 255, 255";
const DATA_CHARS = "0123456789ABCDEF█▓▒░╔╗╚╝║═╠╣╦╩".split("");

export function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const scrollRef = useRef(0);
  const timeRef = useRef(0);
  const railsRef = useRef<Rail[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const orbsRef = useRef<GlowOrb[]>([]);
  const hexRef = useRef<HexCell[]>([]);
  const streamsRef = useRef<DataStream[]>([]);
  const dimRef = useRef({ w: 0, h: 0 });

  /* ─── Rail factory (expanded network) ────────── */
  const createRails = useCallback((w: number, h: number) => {
    const rails: Rail[] = [];

    // ─── Outer frame rails ───
    rails.push({
      points: [
        { x: 0, y: 30 }, { x: w * 0.2, y: 30 }, { x: w * 0.22, y: 18 },
        { x: w * 0.45, y: 18 }, { x: w * 0.48, y: 30 }, { x: w * 0.7, y: 30 },
        { x: w * 0.73, y: 18 }, { x: w * 0.92, y: 18 }, { x: w * 0.95, y: 30 }, { x: w, y: 30 }
      ],
      pulsePos: 0, pulseSpeed: 0.0028, pulseLength: 0.12,
      color: CYAN, width: 1.8, opacity: 0.65
    });
    rails.push({
      points: [
        { x: 0, y: 55 }, { x: w * 0.1, y: 55 }, { x: w * 0.13, y: 45 },
        { x: w * 0.87, y: 45 }, { x: w * 0.9, y: 55 }, { x: w, y: 55 }
      ],
      pulsePos: 0.5, pulseSpeed: 0.002, pulseLength: 0.18,
      color: PURPLE, width: 1, opacity: 0.35
    });

    // ─── Bottom frame ───
    rails.push({
      points: [
        { x: 0, y: h - 40 }, { x: w * 0.15, y: h - 40 }, { x: w * 0.18, y: h - 28 },
        { x: w * 0.55, y: h - 28 }, { x: w * 0.58, y: h - 40 },
        { x: w * 0.8, y: h - 40 }, { x: w * 0.83, y: h - 28 }, { x: w, y: h - 28 }
      ],
      pulsePos: 0.3, pulseSpeed: 0.0032, pulseLength: 0.14,
      color: CYAN, width: 1.5, opacity: 0.5
    });
    rails.push({
      points: [
        { x: 0, y: h - 65 }, { x: w * 0.08, y: h - 65 }, { x: w * 0.12, y: h - 55 },
        { x: w * 0.92, y: h - 55 }, { x: w * 0.96, y: h - 65 }, { x: w, y: h - 65 }
      ],
      pulsePos: 0.7, pulseSpeed: 0.0018, pulseLength: 0.1,
      color: ELECTRIC, width: 1, opacity: 0.3
    });

    // ─── Right-side vertical rails ───
    rails.push({
      points: [
        { x: w - 32, y: 0 }, { x: w - 32, y: h * 0.15 }, { x: w - 48, y: h * 0.2 },
        { x: w - 48, y: h * 0.45 }, { x: w - 32, y: h * 0.5 }, { x: w - 32, y: h * 0.7 },
        { x: w - 48, y: h * 0.75 }, { x: w - 48, y: h * 0.9 }, { x: w - 32, y: h * 0.95 }, { x: w - 32, y: h }
      ],
      pulsePos: 0.15, pulseSpeed: 0.0038, pulseLength: 0.13,
      color: CYAN, width: 2, opacity: 0.6
    });
    rails.push({
      points: [
        { x: w - 60, y: 0 }, { x: w - 60, y: h * 0.25 }, { x: w - 75, y: h * 0.3 },
        { x: w - 75, y: h * 0.7 }, { x: w - 60, y: h * 0.75 }, { x: w - 60, y: h }
      ],
      pulsePos: 0.55, pulseSpeed: 0.0025, pulseLength: 0.12,
      color: PURPLE, width: 1, opacity: 0.28
    });
    // Third right rail
    rails.push({
      points: [
        { x: w - 90, y: h * 0.1 }, { x: w - 90, y: h * 0.4 },
        { x: w - 100, y: h * 0.45 }, { x: w - 100, y: h * 0.6 }, { x: w - 90, y: h * 0.65 }, { x: w - 90, y: h * 0.9 }
      ],
      pulsePos: 0.3, pulseSpeed: 0.003, pulseLength: 0.1,
      color: TERTIARY, width: 0.8, opacity: 0.2
    });

    // ─── Left-side subtle rail ───
    rails.push({
      points: [
        { x: 20, y: h * 0.3 }, { x: 20, y: h * 0.5 }, { x: 30, y: h * 0.55 },
        { x: 30, y: h * 0.8 }, { x: 20, y: h * 0.85 }
      ],
      pulsePos: 0.8, pulseSpeed: 0.0015, pulseLength: 0.25,
      color: PURPLE, width: 0.6, opacity: 0.12
    });

    // ─── Corner connectors ───
    rails.push({
      points: [
        { x: w - 150, y: 18 }, { x: w - 50, y: 18 }, { x: w - 32, y: 38 }, { x: w - 32, y: 100 }
      ],
      pulsePos: 0, pulseSpeed: 0.005, pulseLength: 0.28,
      color: CYAN, width: 2.2, opacity: 0.75
    });
    rails.push({
      points: [
        { x: w - 32, y: h - 100 }, { x: w - 32, y: h - 38 },
        { x: w - 50, y: h - 18 }, { x: w - 150, y: h - 18 }
      ],
      pulsePos: 0.4, pulseSpeed: 0.004, pulseLength: 0.22,
      color: ELECTRIC, width: 1.5, opacity: 0.5
    });
    // Top-left corner
    rails.push({
      points: [
        { x: 0, y: 90 }, { x: 30, y: 90 }, { x: 40, y: 55 }, { x: 100, y: 55 }
      ],
      pulsePos: 0.2, pulseSpeed: 0.003, pulseLength: 0.3,
      color: CYAN, width: 1, opacity: 0.25
    });

    // ─── Diagonal cross-rails ───
    rails.push({
      points: [
        { x: w * 0.5, y: 70 }, { x: w * 0.58, y: 65 }, { x: w * 0.65, y: 80 },
        { x: w * 0.75, y: 72 }, { x: w * 0.85, y: 85 }, { x: w - 100, y: 85 }
      ],
      pulsePos: 0.1, pulseSpeed: 0.004, pulseLength: 0.2,
      color: PURPLE, width: 0.8, opacity: 0.3
    });
    // Mid data bus
    rails.push({
      points: [
        { x: w * 0.4, y: h * 0.35 }, { x: w * 0.5, y: h * 0.33 },
        { x: w * 0.6, y: h * 0.36 }, { x: w * 0.72, y: h * 0.34 }, { x: w - 90, y: h * 0.35 }
      ],
      pulsePos: 0.9, pulseSpeed: 0.0035, pulseLength: 0.12,
      color: CYAN, width: 0.7, opacity: 0.2
    });
    // Lower data bus
    rails.push({
      points: [
        { x: w * 0.35, y: h * 0.65 }, { x: w * 0.48, y: h * 0.63 },
        { x: w * 0.6, y: h * 0.66 }, { x: w * 0.78, y: h * 0.64 }, { x: w - 90, y: h * 0.65 }
      ],
      pulsePos: 0.6, pulseSpeed: 0.003, pulseLength: 0.14,
      color: ELECTRIC, width: 0.6, opacity: 0.18
    });

    return rails;
  }, []);

  /* ─── Orbs (more depth layers) ──────────────── */
  const createOrbs = useCallback((w: number, h: number): GlowOrb[] => [
    { x: w * 0.78, y: h * 0.12, radius: 220, color: CYAN, phase: 0, speed: 0.0007, baseOpacity: 0.07, driftX: 0.15, driftY: 0.1 },
    { x: w * 0.92, y: h * 0.35, radius: 170, color: PURPLE, phase: 1.5, speed: 0.001, baseOpacity: 0.05, driftX: -0.1, driftY: 0.08 },
    { x: w * 0.85, y: h * 0.82, radius: 200, color: ELECTRIC, phase: 3, speed: 0.0012, baseOpacity: 0.06, driftX: 0.08, driftY: -0.12 },
    { x: w * 0.68, y: h * 0.72, radius: 140, color: CYAN, phase: 2, speed: 0.0009, baseOpacity: 0.04, driftX: -0.12, driftY: 0.06 },
    { x: w * 0.5, y: h * 0.03, radius: 280, color: CYAN, phase: 4, speed: 0.0005, baseOpacity: 0.05, driftX: 0.05, driftY: 0.04 },
    { x: w * 0.12, y: h * 0.45, radius: 320, color: PURPLE, phase: 5, speed: 0.0004, baseOpacity: 0.018, driftX: 0.03, driftY: -0.02 },
    { x: w * 0.3, y: h * 0.85, radius: 180, color: TERTIARY, phase: 2.5, speed: 0.0006, baseOpacity: 0.02, driftX: -0.05, driftY: 0.05 },
    { x: w * 0.55, y: h * 0.5, radius: 350, color: CYAN, phase: 1, speed: 0.0003, baseOpacity: 0.012, driftX: 0.02, driftY: -0.01 },
  ], []);

  /* ─── Hexagonal grid cells ──────────────────── */
  const createHexGrid = useCallback((w: number, h: number): HexCell[] => {
    const cells: HexCell[] = [];
    const hexR = 40;
    const hexW = hexR * Math.sqrt(3);
    const hexH = hexR * 2;

    for (let row = 0; row < Math.ceil(h / (hexH * 0.75)) + 1; row++) {
      for (let col = 0; col < Math.ceil(w / hexW) + 1; col++) {
        const cx = col * hexW + (row % 2) * (hexW / 2);
        const cy = row * hexH * 0.75;
        // Only render in certain zones (right side primarily, sparse elsewhere)
        const rightDist = (cx / w);
        const prob = rightDist > 0.5 ? 0.35 : rightDist > 0.3 ? 0.12 : 0.04;
        if (Math.random() < prob) {
          cells.push({ cx, cy, r: hexR, phase: Math.random() * Math.PI * 2, speed: 0.001 + Math.random() * 0.002 });
        }
      }
    }
    return cells;
  }, []);

  /* ─── Data streams (matrix-like columns) ─────── */
  const createStreams = useCallback((w: number, h: number): DataStream[] => {
    const streams: DataStream[] = [];
    const count = Math.floor(w / 120);
    for (let i = 0; i < count; i++) {
      const x = (w * 0.4) + Math.random() * (w * 0.55);
      const chars: string[] = [];
      const len = 6 + Math.floor(Math.random() * 12);
      for (let j = 0; j < len; j++) {
        chars.push(DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)]);
      }
      streams.push({
        x, y: -Math.random() * h,
        chars, speed: 0.3 + Math.random() * 0.8,
        opacity: 0.02 + Math.random() * 0.04,
        charIndex: 0, col: i
      });
    }
    return streams;
  }, []);

  /* ─── Particle spawner ──────────────────────── */
  const spawnParticle = useCallback((w: number, h: number, type: "edge" | "data" | "spark" = "edge"): Particle => {
    const colors = [CYAN, PURPLE, ELECTRIC, TERTIARY];
    const color = colors[Math.floor(Math.random() * colors.length)];

    if (type === "data") {
      return {
        x: w * 0.4 + Math.random() * w * 0.55,
        y: Math.random() * h,
        vx: 0, vy: -(0.2 + Math.random() * 0.5),
        life: 0, maxLife: 150 + Math.random() * 200,
        size: 1 + Math.random() * 1.5, color: CYAN, type
      };
    }

    if (type === "spark") {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      return {
        x: w * 0.7 + Math.random() * w * 0.2,
        y: h * 0.3 + Math.random() * h * 0.4,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0, maxLife: 30 + Math.random() * 40,
        size: 0.5 + Math.random(), color: WHITE, type
      };
    }

    const side = Math.floor(Math.random() * 4);
    const rightBias = Math.random() < 0.65;
    let x = 0, y = 0, vx = 0, vy = 0;

    switch (side) {
      case 0:
        x = rightBias ? w * 0.5 + Math.random() * w * 0.5 : Math.random() * w;
        y = Math.random() * 70;
        vx = (Math.random() - 0.3) * 0.6; vy = Math.random() * 0.25 + 0.05;
        break;
      case 1:
        x = w - Math.random() * 90; y = Math.random() * h;
        vx = -(Math.random() * 0.25 + 0.05); vy = (Math.random() - 0.5) * 0.4;
        break;
      case 2:
        x = rightBias ? w * 0.4 + Math.random() * w * 0.6 : Math.random() * w;
        y = h - Math.random() * 70;
        vx = (Math.random() - 0.5) * 0.6; vy = -(Math.random() * 0.25 + 0.05);
        break;
      default:
        x = Math.random() * 50; y = Math.random() * h;
        vx = Math.random() * 0.15 + 0.03; vy = (Math.random() - 0.5) * 0.2;
    }

    return { x, y, vx, vy, life: 0, maxLife: 200 + Math.random() * 350, size: Math.random() * 2 + 0.5, color, type };
  }, []);

  /* ─── Main effect ───────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimRef.current = { w, h };
      railsRef.current = createRails(w, h);
      orbsRef.current = createOrbs(w, h);
      hexRef.current = createHexGrid(w, h);
      streamsRef.current = createStreams(w, h);
    }

    function initParticles() {
      const { w, h } = dimRef.current;
      particlesRef.current = [];
      for (let i = 0; i < 80; i++) {
        const p = spawnParticle(w, h, "edge");
        p.life = Math.random() * p.maxLife;
        particlesRef.current.push(p);
      }
      for (let i = 0; i < 25; i++) {
        const p = spawnParticle(w, h, "data");
        p.life = Math.random() * p.maxLife;
        particlesRef.current.push(p);
      }
    }

    function handleScroll() { scrollRef.current = window.scrollY; }

    /* ─── Rail utilities ─────────────────────── */
    function getRailLen(points: { x: number; y: number }[]) {
      let len = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
      }
      return len;
    }

    function getPointOnRail(points: { x: number; y: number }[], t: number) {
      const totalLen = getRailLen(points);
      let target = t * totalLen;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (target <= segLen) {
          const f = target / segLen;
          return { x: points[i - 1].x + dx * f, y: points[i - 1].y + dy * f };
        }
        target -= segLen;
      }
      return points[points.length - 1];
    }

    /* ─── DRAW LOOP ──────────────────────────── */
    function draw() {
      const { w, h } = dimRef.current;
      const t = timeRef.current;
      ctx!.clearRect(0, 0, w, h);

      // ── L1: Deep environment gradient ──
      const bgGrad = ctx!.createRadialGradient(w * 0.45, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.9);
      bgGrad.addColorStop(0, "rgba(8, 14, 26, 0.4)");
      bgGrad.addColorStop(0.4, "rgba(3, 7, 18, 0.15)");
      bgGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, w, h);

      // ── L2: Hexagonal grid ──
      const scrollOffset = scrollRef.current * 0.015;
      ctx!.save();
      for (const hex of hexRef.current) {
        const breathe = Math.sin(t * hex.speed + hex.phase) * 0.5 + 0.5;
        const alpha = 0.015 + breathe * 0.025;
        ctx!.globalAlpha = alpha;
        ctx!.strokeStyle = `rgba(${CYAN}, 1)`;
        ctx!.lineWidth = 0.4;
        ctx!.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (Math.PI / 3) * a - Math.PI / 6;
          const px = hex.cx + hex.r * Math.cos(angle);
          const py = hex.cy + hex.r * Math.sin(angle) + scrollOffset;
          if (a === 0) ctx!.moveTo(px, py);
          else ctx!.lineTo(px, py);
        }
        ctx!.closePath();
        ctx!.stroke();

        // Occasional fill pulse
        if (breathe > 0.85) {
          ctx!.globalAlpha = (breathe - 0.85) * 0.15;
          ctx!.fillStyle = `rgba(${CYAN}, 1)`;
          ctx!.fill();
        }
      }
      ctx!.restore();

      // ── L3: Data streams ──
      ctx!.save();
      ctx!.font = "10px 'JetBrains Mono', monospace";
      for (const stream of streamsRef.current) {
        stream.y += stream.speed;
        if (stream.y > h + 200) {
          stream.y = -Math.random() * 300;
          stream.x = w * 0.4 + Math.random() * (w * 0.55);
        }

        for (let ci = 0; ci < stream.chars.length; ci++) {
          const charY = stream.y + ci * 14;
          if (charY < 0 || charY > h) continue;
          const fadeTop = ci === 0 ? 0.5 : 1;
          const fadeTail = ci === stream.chars.length - 1 ? 0.5 : 1;
          ctx!.globalAlpha = stream.opacity * fadeTop * fadeTail;
          ctx!.fillStyle = ci === 0 ? `rgba(${CYAN}, 1)` : `rgba(${CYAN}, 0.5)`;
          ctx!.fillText(stream.chars[ci], stream.x, charY);
        }

        // Periodically mutate characters
        if (t % 8 === 0) {
          const idx = Math.floor(Math.random() * stream.chars.length);
          stream.chars[idx] = DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)];
        }
      }
      ctx!.restore();

      // ── L4: Volumetric glow orbs (with drift) ──
      for (const orb of orbsRef.current) {
        const breathe = Math.sin(t * orb.speed + orb.phase) * 0.5 + 0.5;
        const alpha = orb.baseOpacity * (0.5 + breathe * 0.5);
        const ox = orb.x + Math.sin(t * 0.0003 + orb.phase) * 30 * orb.driftX;
        const oy = orb.y + Math.cos(t * 0.0004 + orb.phase) * 20 * orb.driftY;

        const grad = ctx!.createRadialGradient(ox, oy, 0, ox, oy, orb.radius);
        grad.addColorStop(0, `rgba(${orb.color}, ${alpha})`);
        grad.addColorStop(0.3, `rgba(${orb.color}, ${alpha * 0.4})`);
        grad.addColorStop(0.7, `rgba(${orb.color}, ${alpha * 0.1})`);
        grad.addColorStop(1, `rgba(${orb.color}, 0)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(ox - orb.radius, oy - orb.radius, orb.radius * 2, orb.radius * 2);
      }

      // ── L5: Rails with enhanced pulses ──
      for (const rail of railsRef.current) {
        // Base line
        ctx!.save();
        ctx!.globalAlpha = rail.opacity * 0.25;
        ctx!.strokeStyle = `rgba(${rail.color}, 1)`;
        ctx!.lineWidth = rail.width * 0.4;
        ctx!.beginPath();
        ctx!.moveTo(rail.points[0].x, rail.points[0].y);
        for (let i = 1; i < rail.points.length; i++) ctx!.lineTo(rail.points[i].x, rail.points[i].y);
        ctx!.stroke();
        ctx!.restore();

        // Pulse
        rail.pulsePos = (rail.pulsePos + rail.pulseSpeed) % 1;
        const steps = 35;
        for (let i = 0; i < steps; i++) {
          const segT = (rail.pulsePos + (i / steps) * rail.pulseLength) % 1;
          const segT2 = (rail.pulsePos + ((i + 1) / steps) * rail.pulseLength) % 1;
          if (segT2 < segT - 0.5) continue;
          const p1 = getPointOnRail(rail.points, segT);
          const p2 = getPointOnRail(rail.points, segT2);
          const intensity = Math.sin((i / steps) * Math.PI);

          ctx!.save();
          ctx!.globalAlpha = rail.opacity * intensity;
          ctx!.strokeStyle = `rgba(${rail.color}, 1)`;
          ctx!.lineWidth = rail.width * (1 + intensity * 1.8);
          ctx!.shadowColor = `rgba(${rail.color}, ${intensity * 0.7})`;
          ctx!.shadowBlur = 14 + intensity * 24;
          ctx!.beginPath();
          ctx!.moveTo(p1.x, p1.y);
          ctx!.lineTo(p2.x, p2.y);
          ctx!.stroke();
          ctx!.restore();
        }

        // Glowing head with trail
        const headPos = getPointOnRail(rail.points, (rail.pulsePos + rail.pulseLength * 0.5) % 1);
        ctx!.save();
        const headGrad = ctx!.createRadialGradient(headPos.x, headPos.y, 0, headPos.x, headPos.y, 10);
        headGrad.addColorStop(0, `rgba(${rail.color}, ${rail.opacity * 0.7})`);
        headGrad.addColorStop(0.5, `rgba(${rail.color}, ${rail.opacity * 0.2})`);
        headGrad.addColorStop(1, `rgba(${rail.color}, 0)`);
        ctx!.fillStyle = headGrad;
        ctx!.fillRect(headPos.x - 10, headPos.y - 10, 20, 20);
        ctx!.restore();
      }

      // ── L6: Particles ──
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life >= p.maxLife) {
          parts[i] = spawnParticle(w, h, p.type);
          continue;
        }

        const lr = p.life / p.maxLife;
        const alpha = lr < 0.1 ? lr / 0.1 : lr > 0.8 ? (1 - lr) / 0.2 : 1;

        ctx!.save();
        if (p.type === "data") {
          ctx!.globalAlpha = alpha * 0.3;
          ctx!.fillStyle = `rgba(${p.color}, 1)`;
          ctx!.fillRect(p.x - 0.5, p.y, 1, 4);
        } else if (p.type === "spark") {
          ctx!.globalAlpha = alpha * 0.8;
          ctx!.fillStyle = `rgba(${p.color}, 1)`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.globalAlpha = alpha * 0.5;
          const pg = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          pg.addColorStop(0, `rgba(${p.color}, 0.7)`);
          pg.addColorStop(0.5, `rgba(${p.color}, 0.15)`);
          pg.addColorStop(1, `rgba(${p.color}, 0)`);
          ctx!.fillStyle = pg;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx!.fill();

          ctx!.globalAlpha = alpha * 0.8;
          ctx!.fillStyle = `rgba(${p.color}, 1)`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }

      // Occasionally spawn sparks at rail intersections
      if (t % 60 === 0 && parts.length < 130) {
        for (let s = 0; s < 3; s++) parts.push(spawnParticle(w, h, "spark"));
      }

      // ── L7: Glass structure shapes ──
      const glassPanels = [
        { x: w * 0.7, y: h * 0.18, w: 200, h: 130, rot: -0.04 },
        { x: w * 0.82, y: h * 0.5, w: 150, h: 220, rot: 0.025 },
        { x: w * 0.63, y: h * 0.72, w: 180, h: 110, rot: -0.015 },
        { x: w * 0.75, y: h * 0.38, w: 120, h: 80, rot: 0.035 },
      ];

      for (const panel of glassPanels) {
        const parallax = scrollRef.current * 0.012;
        const py = panel.y + parallax;
        const shimmer = Math.sin(t * 0.0007 + panel.x * 0.004) * 0.3 + 0.7;

        ctx!.save();
        ctx!.translate(panel.x + panel.w / 2, py + panel.h / 2);
        ctx!.rotate(panel.rot);
        ctx!.translate(-(panel.x + panel.w / 2), -(py + panel.h / 2));

        ctx!.globalAlpha = 0.018 * shimmer;
        ctx!.fillStyle = `rgba(${CYAN}, 1)`;
        ctx!.fillRect(panel.x, py, panel.w, panel.h);

        ctx!.globalAlpha = 0.06 * shimmer;
        ctx!.strokeStyle = `rgba(${CYAN}, 1)`;
        ctx!.lineWidth = 0.5;
        ctx!.strokeRect(panel.x, py, panel.w, panel.h);

        // Corner details
        const cornerLen = 12;
        ctx!.globalAlpha = 0.12 * shimmer;
        ctx!.lineWidth = 1;
        // TL corner
        ctx!.beginPath();
        ctx!.moveTo(panel.x, py + cornerLen); ctx!.lineTo(panel.x, py); ctx!.lineTo(panel.x + cornerLen, py);
        ctx!.stroke();
        // TR corner
        ctx!.beginPath();
        ctx!.moveTo(panel.x + panel.w - cornerLen, py); ctx!.lineTo(panel.x + panel.w, py); ctx!.lineTo(panel.x + panel.w, py + cornerLen);
        ctx!.stroke();
        // BL corner
        ctx!.beginPath();
        ctx!.moveTo(panel.x, py + panel.h - cornerLen); ctx!.lineTo(panel.x, py + panel.h); ctx!.lineTo(panel.x + cornerLen, py + panel.h);
        ctx!.stroke();
        // BR corner
        ctx!.beginPath();
        ctx!.moveTo(panel.x + panel.w - cornerLen, py + panel.h); ctx!.lineTo(panel.x + panel.w, py + panel.h); ctx!.lineTo(panel.x + panel.w, py + panel.h - cornerLen);
        ctx!.stroke();

        ctx!.restore();
      }

      // ── L8: Atmospheric haze ──
      const hazeBot = ctx!.createLinearGradient(0, h * 0.55, 0, h);
      hazeBot.addColorStop(0, "rgba(3, 7, 18, 0)");
      hazeBot.addColorStop(0.5, "rgba(3, 7, 18, 0.12)");
      hazeBot.addColorStop(1, "rgba(3, 7, 18, 0.35)");
      ctx!.fillStyle = hazeBot;
      ctx!.fillRect(0, h * 0.55, w, h * 0.45);

      const hazeTop = ctx!.createLinearGradient(0, 0, 0, h * 0.12);
      hazeTop.addColorStop(0, "rgba(3, 7, 18, 0.25)");
      hazeTop.addColorStop(1, "rgba(3, 7, 18, 0)");
      ctx!.fillStyle = hazeTop;
      ctx!.fillRect(0, 0, w, h * 0.12);

      // Side vignette
      const vigL = ctx!.createLinearGradient(0, 0, w * 0.15, 0);
      vigL.addColorStop(0, "rgba(3, 7, 18, 0.2)");
      vigL.addColorStop(1, "rgba(3, 7, 18, 0)");
      ctx!.fillStyle = vigL;
      ctx!.fillRect(0, 0, w * 0.15, h);

      timeRef.current++;
      animRef.current = requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();

    window.addEventListener("resize", () => { resize(); initParticles(); });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [createRails, createOrbs, createHexGrid, createStreams, spawnParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden="true"
    />
  );
}
