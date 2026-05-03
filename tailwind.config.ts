import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand backgrounds ──────────────────────────────────────────────
        "dm-bg": "#F5F0E8",          // warm parchment — light mode primary
        "dm-panel": "#EDE8DC",       // slightly darker parchment for panels/cards
        "dm-accent": "#D4A017",      // gold — buttons, hover, interactive

        // ── Text ───────────────────────────────────────────────────────────
        "dm-text": "#0B2239",        // dark navy — primary text
        "dm-text-secondary": "#4A6274",  // muted navy — secondary text

        // ── Tier colors (locked 2026-04-15) ────────────────────────────────
        "tier-great": "#B45309",     // rich amber — premium, trophy feel
        "tier-good": "#0E7490",      // ocean teal — vibrant, analytical
        "tier-solid": "#475DA7",     // slate blue — dependable
        "tier-role": "#6B7280",      // warm grey — muted by design

        // ── Round dot colors ───────────────────────────────────────────────
        "rd-1": "#34d399",
        "rd-2": "#a3e635",
        "rd-3": "#facc15",
        "rd-4": "#fb923c",
        "rd-5": "#f87171",
        "rd-6": "#c084fc",
        "rd-7": "#94a3b8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        condensed: ["Barlow Condensed", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
