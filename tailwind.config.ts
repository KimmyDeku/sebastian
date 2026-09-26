import type { Config } from "tailwindcss";

// Sebastian design tokens — derived from the reference dashboard.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1C1B19", soft: "#3A3833" },
        paper: "#FFFFFF",
        canvas: "#FCFBF9",
        cream: { DEFAULT: "#F7EFE4", deep: "#EFE3D2", line: "#E6D3B8" },
        line: "#ECE8E2",
        muted: { DEFAULT: "#6E6A64", soft: "#9A958D" },
        gold: { DEFAULT: "#B8823A", deep: "#94662A", soft: "#F3E6D2" },
        glow: "#8C6FE6",
        success: "#3F7D58",
        warning: "#A8701C",
        danger: "#B4463A",
        offline: "#6B7280",
      },
      fontFamily: {
        serif: ['"EB Garamond"', "Garamond", '"Times New Roman"', "serif"],
        sans: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem", pill: "999px" },
      boxShadow: {
        soft: "0 1px 2px rgba(60,40,10,.04), 0 8px 24px -12px rgba(60,40,10,.12)",
        lift: "0 2px 4px rgba(60,40,10,.05), 0 18px 40px -18px rgba(60,40,10,.25)",
        halo: "0 0 0 1px rgba(184,130,58,.25), 0 10px 40px -10px rgba(184,130,58,.35)",
        thinking: "0 0 24px 2px rgba(140,111,230,.35)",
      },
      keyframes: {
        steam: { "0%": { transform: "translateY(0) scaleX(1)", opacity: "0" }, "30%": { opacity: ".8" }, "100%": { transform: "translateY(-38px) scaleX(1.4)", opacity: "0" } },
        stir: { "0%,100%": { transform: "rotate(-14deg)" }, "50%": { transform: "rotate(14deg)" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 0 0 rgba(140,111,230,.0)" }, "50%": { boxShadow: "0 0 26px 4px rgba(140,111,230,.45)" } },
        wave: { "0%,100%": { transform: "scaleY(.35)" }, "50%": { transform: "scaleY(1)" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: {
        steam: "steam 2.2s ease-out infinite",
        stir: "stir 1.4s ease-in-out infinite",
        pulseGlow: "pulseGlow 1.8s ease-in-out infinite",
        wave: "wave 0.9s ease-in-out infinite",
        fadeUp: "fadeUp .35s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
