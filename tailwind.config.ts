import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // superficies — escala pizarra sobria (no negro puro)
        base: {
          900: "#0c0f14", // fondo más profundo
          850: "#11151b", // fondo de página
          800: "#161b22", // paneles
          750: "#1b212a", // paneles elevados / chips
          700: "#252c37", // bordes
          600: "#323b48", // bordes activos
        },
        ink: {
          DEFAULT: "#d8dee6",
          dim: "#9aa6b4",
          faint: "#69737f",
        },
        // acento único: azul acero (reemplaza el cian neón)
        cyan: {
          DEFAULT: "#4b8ef0",
          deep: "#2f6bd4",
          glow: "#6ea4f5",
        },
        amber: {
          DEFAULT: "#d6a23e",
          deep: "#b07f28",
        },
        good: "#48b07f",
        warn: "#d6a23e",
        bad: "#dd5a68",
        info: "#5b93d6",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        // profundidad sutil, sin halos de neón
        panel: "0 1px 2px 0 rgba(0,0,0,0.4)",
        card: "0 1px 3px 0 rgba(0,0,0,0.35), 0 8px 24px -18px rgba(0,0,0,0.6)",
        "card-lift":
          "0 2px 4px 0 rgba(0,0,0,0.4), 0 18px 40px -20px rgba(0,0,0,0.75)",
        glow: "0 0 0 1px rgba(75,142,240,0.28)",
        "glow-amber": "0 0 0 1px rgba(214,162,62,0.30)",
        "glow-bad": "0 0 0 1px rgba(221,90,104,0.32)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "pulse-led": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "ping-ring": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "75%,100%": { transform: "scale(2.4)", opacity: "0" },
        },
        wave: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "draw-in": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "pulse-led": "pulse-led 2s ease-in-out infinite",
        "ping-ring": "ping-ring 2s cubic-bezier(0,0,0.2,1) infinite",
        wave: "wave 8s linear infinite",
        "wave-slow": "wave 13s linear infinite",
        "fade-up": "fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
        "draw-in": "draw-in 1.4s cubic-bezier(0.22,1,0.36,1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
