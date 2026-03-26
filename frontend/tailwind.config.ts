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
        background: "#000000",
        surface: "#0d0d0d",
        elevated: "#111111",
        cyan: "#00f5ff",
        text: "#e0e0e0",
        muted: "#666666",
        border: "#1a1a1a",
        buy: "#00ff88",
        sell: "#ff3b3b"
      },
      boxShadow: {
        glow: "0 0 20px rgba(0,245,255,0.15)"
      },
      borderRadius: {
        sharp: "4px"
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(0,245,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.06) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;

