"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 120;
    const MAX_DISTANCE = 140;

    function resize() {
      width = canvas!.parentElement?.clientWidth ?? window.innerWidth;
      height = canvas!.parentElement?.clientHeight ?? window.innerHeight;
      canvas!.width = width * window.devicePixelRatio;
      canvas!.height = height * window.devicePixelRatio;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function createParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = i / PARTICLE_COUNT;
        // Gradient from cyan to purple based on horizontal position
        const r = Math.round(t * 139 + (1 - t) * 0);
        const g = Math.round(t * 92 + (1 - t) * 245);
        const b = Math.round(t * 246 + (1 - t) * 255);
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.8 + 0.8,
          color: `rgb(${r}, ${g}, ${b})`,
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce at edges
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = 0.7;
        ctx!.fill();
      }

      // Draw connections
      ctx!.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            const alpha = (1 - dist / MAX_DISTANCE) * 0.15;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);

            // Gradient line color based on average X position
            const avgX = (particles[i].x + particles[j].x) / 2 / width;
            const r = Math.round(avgX * 139 + (1 - avgX) * 0);
            const g = Math.round(avgX * 92 + (1 - avgX) * 245);
            const b = Math.round(avgX * 246 + (1 - avgX) * 255);
            ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0" style={{ pointerEvents: "none" }}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
