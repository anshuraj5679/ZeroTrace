"use client";

export function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Wireframe Icosahedron — top right */}
      <div
        className="absolute -right-12 top-20 h-56 w-56 animate-spin-slow"
        style={{ animationDuration: "45s" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <polygon
            points="100,10 180,60 180,140 100,190 20,140 20,60"
            fill="none"
            stroke="rgba(0,245,255,0.08)"
            strokeWidth="1"
          />
          <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(0,245,255,0.05)" strokeWidth="0.5" />
          <line x1="20" y1="60" x2="180" y2="140" stroke="rgba(0,245,255,0.05)" strokeWidth="0.5" />
          <line x1="180" y1="60" x2="20" y2="140" stroke="rgba(0,245,255,0.05)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Wireframe Torus — bottom left */}
      <div
        className="absolute -left-16 bottom-20 h-48 w-48 animate-spin-slow"
        style={{ animationDuration: "60s", animationDirection: "reverse" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <ellipse cx="100" cy="100" rx="80" ry="40" fill="none" stroke="rgba(139,92,246,0.06)" strokeWidth="1" />
          <ellipse cx="100" cy="100" rx="60" ry="30" fill="none" stroke="rgba(139,92,246,0.04)" strokeWidth="0.8" />
          <ellipse cx="100" cy="100" rx="40" ry="80" fill="none" stroke="rgba(139,92,246,0.05)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Wireframe Octahedron — center bottom */}
      <div
        className="absolute bottom-32 left-1/2 h-36 w-36 -translate-x-1/2 animate-spin-slow"
        style={{ animationDuration: "55s" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <polygon
            points="100,20 170,100 100,180 30,100"
            fill="none"
            stroke="rgba(59,130,246,0.07)"
            strokeWidth="1"
          />
          <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(59,130,246,0.04)" strokeWidth="0.5" />
          <line x1="30" y1="100" x2="170" y2="100" stroke="rgba(59,130,246,0.04)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Wireframe Dodecahedron — top left */}
      <div
        className="absolute -left-8 top-16 h-40 w-40 animate-spin-slow"
        style={{ animationDuration: "50s", animationDirection: "reverse" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <polygon
            points="100,15 155,45 175,105 140,170 60,170 25,105 45,45"
            fill="none"
            stroke="rgba(0,245,255,0.05)"
            strokeWidth="0.8"
          />
          <polygon
            points="100,50 135,70 145,115 115,145 85,145 55,115 65,70"
            fill="none"
            stroke="rgba(0,245,255,0.04)"
            strokeWidth="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
