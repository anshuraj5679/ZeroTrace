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
        surface: "#0e131f",
        elevated: "#161c28",
        "surface-glass": "rgba(10, 15, 30, 0.55)",
        "surface-container": "#1a202c",
        "surface-high": "#242a36",
        "surface-highest": "#2f3542",
        "surface-low": "#161c28",
        "surface-lowest": "#080e1a",
        cyan: "#00f2ff",
        purple: "#7000ff",
        "purple-bright": "#d1bcff",
        electric: "#3b82f6",
        tertiary: "#bd00ff",
        text: "#dde2f3",
        "text-bright": "#f8fafc",
        muted: "#849495",
        border: "rgba(58, 73, 75, 0.15)",
        buy: "#22c55e",
        sell: "#ef4444",
        amber: "#f59e0b"
      },
      boxShadow: {
        glow: "0 0 16px rgba(0, 242, 255, 0.12), 0 0 32px rgba(0, 242, 255, 0.04)",
        "glow-lg": "0 0 24px rgba(0, 242, 255, 0.18), 0 0 48px rgba(0, 242, 255, 0.06)",
        "glow-purple": "0 0 16px rgba(112, 0, 255, 0.12), 0 0 32px rgba(112, 0, 255, 0.04)",
        "glow-buy": "0 0 12px rgba(34, 197, 94, 0.15)",
        "glow-sell": "0 0 12px rgba(239, 68, 68, 0.15)",
        glass: "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 242, 255, 0.015)"
      },
      borderRadius: {
        sharp: "4px",
        glass: "4px"
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(var(--tw-gradient-stops))",
        "gradient-cyan-purple": "linear-gradient(135deg, #00f2ff, #7000ff)",
        "gradient-dark": "linear-gradient(180deg, #0e131f 0%, #030712 100%)"
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
