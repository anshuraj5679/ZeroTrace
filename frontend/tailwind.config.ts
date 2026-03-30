import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712",
        surface: "#0a0f1e",
        elevated: "#111827",
        "surface-glass": "rgba(10, 15, 30, 0.65)",
        cyan: "#00f5ff",
        purple: "#8b5cf6",
        electric: "#3b82f6",
        text: "#e2e8f0",
        "text-bright": "#f8fafc",
        muted: "#64748b",
        border: "rgba(148, 163, 184, 0.08)",
        buy: "#22c55e",
        sell: "#ef4444",
        amber: "#f59e0b"
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 245, 255, 0.15), 0 0 40px rgba(0, 245, 255, 0.05)",
        "glow-lg": "0 0 32px rgba(0, 245, 255, 0.2), 0 0 64px rgba(0, 245, 255, 0.08)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.15), 0 0 40px rgba(139, 92, 246, 0.05)",
        "glow-buy": "0 0 16px rgba(34, 197, 94, 0.2)",
        "glow-sell": "0 0 16px rgba(239, 68, 68, 0.2)",
        glass: "0 4px 24px rgba(0, 0, 0, 0.3), 0 0 48px rgba(0, 245, 255, 0.03)"
      },
      borderRadius: {
        sharp: "4px",
        glass: "12px"
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(var(--tw-gradient-stops))",
        "gradient-cyan-purple": "linear-gradient(135deg, #00f5ff, #8b5cf6)",
        "gradient-dark": "linear-gradient(180deg, #0a0f1e 0%, #030712 100%)"
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "slide-in": "slide-in-down 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "spin-slow": "spin 45s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
