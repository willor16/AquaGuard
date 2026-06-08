import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SCADA / sala de control
        base: {
          900: "#070a10", // fondo más profundo
          850: "#0a0e14", // fondo principal
          800: "#0e131c", // paneles
          750: "#121826", // paneles elevados
          700: "#1a2231", // bordes / superficies
          600: "#283142", // bordes activos
        },
        ink: {
          DEFAULT: "#d6e0ee",
          dim: "#8a97aa",
          faint: "#5b6678",
        },
        // acentos técnicos
        cyan: {
          DEFAULT: "#2ee6d6",
          deep: "#14b8a6",
          glow: "#5ffaee",
        },
        amber: {
          DEFAULT: "#ffb020",
          deep: "#d98800",
        },
        good: "#22c98a",
        warn: "#ffb020",
        bad: "#ff4d5e",
        info: "#4aa3ff",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 0 0 1px rgba(255,255,255,0.02)",
        glow: "0 0 24px -6px rgba(46,230,214,0.55)",
        "glow-amber": "0 0 24px -6px rgba(255,176,32,0.55)",
        "glow-bad": "0 0 24px -6px rgba(255,77,94,0.55)",
      },
      backgroundImage: {
        "grid-fine":
          "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
      },
      keyframes: {
        "pulse-led": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        wave: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        sweep: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-led": "pulse-led 1.6s ease-in-out infinite",
        wave: "wave 7s linear infinite",
        "wave-slow": "wave 11s linear infinite",
        sweep: "sweep 4s linear infinite",
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
