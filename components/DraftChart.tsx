"use client";
/**
 * components/DraftChart.tsx
 *
 * Session E (2026-05-02): Core chart redesign pass.
 *   - Pan/zoom eliminated. usePanZoom hook deleted.
 *   - Full-page rendering: SVG is page content, no inner viewport.
 *   - Continuous Y-axis: pickToY(rank) positions dots at their actual pick value.
 *   - Variable position column widths: proportional to class size.
 *   - Light mode primary.
 *   - Role sub-bands removed (visible in player card instead).
 *   - Single-click opens player card (no double-tap).
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import type { Player } from "@/lib/airtable";
import {
  computeChartLayout,
  computeAllDotPositions,
  type ChartLayout,
  type DotPosition,
  type ChartView,
} from "@/lib/chartMath";
import PlayerCard from "@/components/PlayerCard";
import TierBands from "@/components/chart/TierBands";
import TierArrows from "@/components/chart/TierArrows";
import PositionColumns from "@/components/chart/PositionColumns";
import RoundZones from "@/components/chart/RoundZones";
import PlayerDots from "@/components/chart/PlayerDots";

// ── Props ─────────────────────────────────────────────────────────────────────

interface DraftChartProps {
  year?: number;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState {
  player: Player;
  x: number;
  y: number;
}

function ChartTooltip({ player, x, y }: TooltipState) {
  const strengths = [player.s1, player.s2, player.s3].filter((s): s is string => !!s && s !== "N/A");
  const strengthColors = ["#B8D4C4", "#9ABFAD", "#7EA896"];
  const strengthWeights = ["700", "600", "500"];

  return (
    <div
      className="dm-tooltip"
      style={{ left: x, top: y }}
    >
      <div className="dm-tooltip-line"><strong>{player.name}</strong> — {player.pos}</div>
      <div className="dm-tooltip-line"><span className="dm-tooltip-label">School:</span> {player.school || "N/A"}</div>
      <div className="dm-tooltip-line"><span className="dm-tooltip-label">Role:</span> {player.role || "—"}</div>
      <div className="dm-tooltip-line"><span className="dm-tooltip-label">Proj. Pick</span> #{player.rank}</div>
      {strengths.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {strengths.map((s, i) => (
            <div key={i} style={{ color: strengthColors[i], fontWeight: strengthWeights[i], fontSize: 11 }}>
              • {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chart borders ─────────────────────────────────────────────────────────────

function ChartBorders({ layout }: { layout: ChartLayout }) {
  const { margin, chartW, totalChartH } = layout;
  return (
    <g>
      {/* Top accent bar */}
      <rect x={margin.left} y={0} width={chartW} height={5} fill="#0B2239" opacity={0.45} />
      {/* Left outer border */}
      <line x1={margin.left} y1={0} x2={margin.left} y2={margin.top + totalChartH}
        stroke="#C4C0B8" strokeWidth={1.2} />
      {/* Right outer border */}
      <line x1={margin.left + chartW} y1={0} x2={margin.left + chartW} y2={margin.top + totalChartH}
        stroke="#C4C0B8" strokeWidth={1.2} />
      {/* Bottom border */}
      <line x1={margin.left} y1={margin.top + totalChartH} x2={margin.left + chartW} y2={margin.top + totalChartH}
        stroke="#C4C0B8" strokeWidth={1.2} />
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DraftChart({ year = 2026 }: DraftChartProps) {
  const [players, setPlayers]       = useState<Player[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [liveMode, setLiveMode]     = useState(false);
  const [view, setView]             = useState<ChartView>("all");
  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [tooltip, setTooltip]       = useState<TooltipState | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const url = `/api/draft?year=${year}${liveMode ? "&live=1" : ""}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setPlayers(d.players ?? []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [year, liveMode]);

  // ── Layout (pure, recomputes only when players/view change) ─────────────────
  const layout = useMemo<ChartLayout>(
    () => computeChartLayout(players, view),
    [players, view],
  );

  // ── Dot positions (pure) ─────────────────────────────────────────────────
  const dotPositions = useMemo<DotPosition[]>(
    () => computeAllDotPositions(players, layout),
    [players, layout],
  );

  // ── Event handlers ──────────────────────────────────────────────────────────

  // Single click opens the player card directly (no double-tap needed).
  const handleDotClick = useCallback(
    (player: Player) => {
      setTooltip(null);
      setOpenPlayer(player);
    },
    [],
  );

  const handleDotHover = useCallback(
    (player: Player, clientX: number, clientY: number) => {
      setTooltip({ player, x: clientX + 14, y: clientY + 12 });
    },
    [],
  );

  const handleDotLeave = useCallback(() => setTooltip(null), []);
  const dismissTooltip = useCallback(() => setTooltip(null), []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="dm-page">

        {/* Controls bar */}
        {!loading && !error && (
          <div className="dm-controls">
            <div className="dm-btn-group">
              {(["all", "offense", "defense"] as ChartView[]).map(v => (
                <button
                  key={v}
                  className={`dm-btn${view === v ? " active" : ""}`}
                  onClick={() => setView(v)}
                >
                  {v === "all" ? "All Positions" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <span className="dm-year-label">{year} Draft Class</span>
            <button
              className={`dm-live-btn${liveMode ? " active" : ""}`}
              onClick={() => setLiveMode(l => !l)}
              title="Grey out drafted players"
            >
              <span className="dm-live-dot" />
              Live Draft
            </button>
            <span className="dm-hint">
              Hover a dot to preview · click for full player profile
            </span>
          </div>
        )}

        {/* Chart frame — full-page width, height from SVG content */}
        <div className="dm-chart-frame" onClick={dismissTooltip}>

          {loading && (
            <div className="dm-state-msg">
              <p>Loading draft data…</p>
            </div>
          )}

          {error && (
            <div className="dm-state-msg dm-state-error">
              <p>Failed to load chart: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <svg
              width={layout.svgW}
              height={layout.svgH}
              style={{ display: "block", maxWidth: "100%" }}
            >
              <TierBands layout={layout} />
              <TierArrows layout={layout} />
              <PositionColumns layout={layout} />
              <RoundZones layout={layout} />
              <PlayerDots
                dotPositions={dotPositions}
                liveMode={liveMode}
                onDotClick={handleDotClick}
                onDotHover={handleDotHover}
                onDotLeave={handleDotLeave}
              />
              <ChartBorders layout={layout} />
            </svg>
          )}
        </div>
      </div>

      {/* Floating tooltip (fixed positioning) */}
      {tooltip && <ChartTooltip {...tooltip} />}

      {/* Player card modal */}
      <PlayerCard
        player={openPlayer}
        players={players}
        onClose={() => setOpenPlayer(null)}
      />
    </>
  );
}
