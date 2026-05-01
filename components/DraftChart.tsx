"use client";

/**
 * components/DraftChart.tsx
 *
 * Stage 1: mounts the existing vanilla JS chart inside a React component.
 *
 * Strategy (Option A — innerHTML + dynamic script):
 *   1. Fetch player data from /api/draft?year={year}
 *   2. Set window.__draftMapPlayers so chart-engine.js can read them
 *   3. Inject the HTML structure (styles + DOM) from lib/chartTemplate.ts into
 *      containerRef.current via innerHTML — style tags process correctly this way
 *   4. Load /chart-engine.js once via a <script> element; on re-mount call
 *      window.initDraftMap() instead of reloading
 *
 * Stage 2 will replace the innerHTML approach with proper D3 + React rendering.
 */

import { useRef, useEffect, useState } from "react";
import type { Player } from "@/lib/airtable";
import { CHART_HTML_TEMPLATE } from "@/lib/chartTemplate";

// Extend Window so TypeScript knows about the globals the chart JS sets
declare global {
  interface Window {
    __draftMapPlayers: Player[];
    initDraftMap?: () => void;
    __draftMapScriptLoaded?: boolean;
  }
}

interface DraftChartProps {
  year?: number;
  liveMode?: boolean;
}

export default function DraftChart({ year = 2026, liveMode = false }: DraftChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1: fetch player data
  useEffect(() => {
    const url = `/api/draft?year=${year}${liveMode ? "&live=1" : ""}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPlayers(data.players ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [year, liveMode]);

  // Step 2: mount the chart once players are loaded
  useEffect(() => {
    if (!containerRef.current || players.length === 0) return;

    // Inject Google Fonts into document.head (links are inert when set via innerHTML)
    if (!document.getElementById("dm-fonts")) {
      const preconnect1 = document.createElement("link");
      preconnect1.rel = "preconnect";
      preconnect1.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement("link");
      preconnect2.rel = "preconnect";
      preconnect2.href = "https://fonts.gstatic.com";
      preconnect2.crossOrigin = "anonymous";
      document.head.appendChild(preconnect2);

      const fontLink = document.createElement("link");
      fontLink.id = "dm-fonts";
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&family=Oswald:wght@400;500;600;700&display=swap";
      document.head.appendChild(fontLink);
    }

    // Make players available globally before the script reads them
    window.__draftMapPlayers = players;

    // Inject HTML structure (styles + DOM) into the container
    containerRef.current.innerHTML = CHART_HTML_TEMPLATE;

    // Re-mount case: script already loaded, just reinitialize
    if (window.__draftMapScriptLoaded && typeof window.initDraftMap === "function") {
      window.initDraftMap();
      return;
    }

    // First load: dynamically append the chart engine script
    const script = document.createElement("script");
    script.src = "/chart-engine.js";
    script.onload = () => {
      window.__draftMapScriptLoaded = true;
    };
    script.onerror = () => {
      console.error("[DraftChart] Failed to load /chart-engine.js");
    };
    document.body.appendChild(script);
  }, [players]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dm-bg">
        <p className="text-dm-text-secondary text-sm">Loading draft data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-dm-bg">
        <p className="text-red-400 text-sm">Failed to load chart: {error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
      data-year={year}
      data-player-count={players.length}
    />
  );
}
