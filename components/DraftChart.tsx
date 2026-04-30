"use client";

/**
 * components/DraftChart.tsx
 *
 * Stage 1: useRef wrapper that will host the existing vanilla JS chart.
 *
 * The existing chart (~3,400 lines of JS in draftmap-mockup-v2.html) takes
 * full control of the DOM node. React renders the container; the JS runs inside it.
 *
 * Scaffold only — chart logic is wired in the Stage 1 build session.
 * When this is filled in, it will:
 *   1. Fetch player data from /api/draft?year={year}
 *   2. Inject the player array into the chart JS (replacing the static `const players = [...]`)
 *   3. Initialize the chart inside containerRef.current
 */

import { useRef, useEffect, useState } from "react";
import type { Player } from "@/lib/airtable";

interface DraftChartProps {
  year?: number;
  liveMode?: boolean;
}

export default function DraftChart({ year = 2026, liveMode = false }: DraftChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch player data from the Route Handler
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

  // TODO (Stage 1): once players are loaded, initialize the chart JS here
  // The existing JS chart init call goes in this effect.
  useEffect(() => {
    if (!containerRef.current || players.length === 0) return;
    // Chart initialization will go here in Stage 1.
    // The JS will receive `players` as a prop injected before init.
  }, [players]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dm-bg">
        <p className="text-dm-text-secondary text-sm">Loading draft data…</p>
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
      className="w-full bg-dm-bg"
      style={{ minHeight: "100vh" }}
      data-year={year}
      data-player-count={players.length}
    >
      {/* Scaffold placeholder — replaced with chart canvas in Stage 1 */}
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-dm-text font-condensed text-2xl font-bold">
          DraftMap {year}
        </p>
        <p className="text-dm-text-secondary text-sm">
          {players.length} prospects loaded · chart renders in Stage 1
        </p>
      </div>
    </div>
  );
}
