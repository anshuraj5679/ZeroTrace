"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltIntensity?: number;
  glareOpacity?: number;
}

export function TiltCard({
  children,
  className = "",
  tiltIntensity = 8,
  glareOpacity = 0.08
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(800px) rotateX(0deg) rotateY(0deg)");
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateX = (y - 0.5) * -tiltIntensity;
    const rotateY = (x - 0.5) * tiltIntensity;

    setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setGlarePos({ x: x * 100, y: y * 100 });
  }

  function handleMouseLeave() {
    setTransform("perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setIsHovering(false);
  }

  function handleMouseEnter() {
    setIsHovering(true);
  }

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{
        transform,
        transition: isHovering ? "transform 0.1s ease-out" : "transform 0.4s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform"
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Glare Effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,${isHovering ? glareOpacity : 0}), transparent 60%)`,
          transition: isHovering ? "background 0.1s ease-out" : "background 0.4s ease-out",
          borderRadius: "inherit"
        }}
      />
    </div>
  );
}
