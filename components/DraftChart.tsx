"use client";
/**
 * components/DraftChart.tsx
 *
 * Stage 2c/2d — full D3/React SVG render. chart-engine.js eliminated.
 *
 * Ownership:
 *   - Fetches player data from /api/draft
 *   - Computes chart layout (column positions, row heights) via useMemo
 *   - Computes all dot positions via useMemo (spreadDots from chartMath.ts)
 *   - Delegates camera/pan/zoom to usePanZoom hook
 *   - Composes SVG sub-components; owns openPlayer + tooltip state
 */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { Player } from "@/lib/airtable";
import {
  computeChartLayout,
  computeAllDotPositions,
  type ChartLayout,
  type DotPosition,
  type ChartView,
} from "@/lib/chartMath";
import { usePanZoom } from "@/hooks/usePanZoom";
import PlayerCard from "@/components/PlayerCard";
import TierBands from "@/components/chart/TierBands";
import TierArrows from "@/components/chart/TierArrows";
import PositionColumns from "@/components/chart/PositionColumns";
import RoundZones from "@/components/chart/RoundZones";
import RoleLanes from "@/components/chart/RoleLanes";
import PlayerDots from "@/components/chart/PlayerDots";
import PlayerLabels from "@/components/chart/PlayerLabels";

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
      <div className="dm-tooltip-line"><span className="dm-tooltip-label">Role:</span> {player.role}</div>
      <div className="dm-tooltip-line"><span className="dm-tooltip-label">R{player.rd}, Pick #{player.rank}</span></div>
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

// ── Zoom widget ───────────────────────────────────────────────────────────────

interface ZoomWidgetProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

function ZoomWidget({ zoomLevel, onZoomIn, onZoomOut }: ZoomWidgetProps) {
  return (
    <div className="dm-zoom-control">
      <button className="dm-zoom-btn" onClick={onZoomIn} aria-label="Zoom in">+</button>
      <div className="dm-zoom-track">
        {[4, 3, 2, 1, 0].map(lvl => (
          <div
            key={lvl}
            className={`dm-zoom-seg${zoomLevel === lvl ? " active" : ""}`}
          />
        ))}
      </div>
      <button className="dm-zoom-btn" onClick={onZoomOut} aria-label="Zoom out">−</button>
    </div>
  );
}

// ── Players legend ────────────────────────────────────────────────────────────

function PlayersLegend() {
  return (
    <div className="dm-players-legend">
      <div className="dm-players-legend-title">Player Legend</div>
      <div className="dm-players-legend-row">
        <div className="dm-legend-dot" />
        <div className="dm-legend-lines">
          <div className="dm-legend-line-1">Player Name</div>
          <div className="dm-legend-line-2">Round · Pick</div>
          <div className="dm-legend-line-2">Height · Weight</div>
          <div className="dm-legend-line-3">• Primary Strength</div>
          <div className="dm-legend-line-3">• Secondary Strength</div>
          <div className="dm-legend-line-3">• Supporting Strength</div>
        </div>
      </div>
    </div>
  );
}

// ── Chart borders (rendered inside SVG, on top of everything) ─────────────────

function ChartBorders({ layout }: { layout: ChartLayout }) {
  const { margin, chartW, totalChartH } = layout;
  return (
    <g>
      {/* Dark top accent bar */}
      <rect x={margin.left} y={0} width={chartW} height={6} fill="#0B2239" opacity={0.55} />
      {/* Left outer border */}
      <line x1={margin.left} y1={0} x2={margin.left} y2={margin.top + totalChartH}
        stroke="#AEB8C2" strokeWidth={1.4} />
      {/* Right outer border */}
      <line x1={margin.left + chartW} y1={0} x2={margin.left + chartW} y2={margin.top + totalChartH}
        stroke="#AEB8C2" strokeWidth={1.4} />
      {/* Bottom border */}
      <line x1={margin.left} y1={margin.top + totalChartH} x2={margin.left + chartW} y2={margin.top + totalChartH}
        stroke="#AEB8C2" strokeWidth={1.4} />
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DraftChart({ year = 2026 }: DraftChartProps) {
  const [players, setPlayers]     = useState<Player[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [liveMode, setLiveMode]   = useState(false);
  const [view, setView]           = useState<ChartView>("all");
  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [tooltip, setTooltip]     = useState<TooltipState | null>(null);

  // Touch detection (ref — stable across renders)
  const isTouch = useRef(
    typeof window !== "undefined"
      ? window.matchMedia("(hover: none) and (pointer: coarse)").matches
      : false,
  );
  const lastTapMs     = useRef(0);
  const lastTapPlayer = useRef<Player | null>(null);

  // Pan/zoom hook
  const { viewportRef, stageRef, zoomLevel, isOverview, zoomIn, zoomOut } = usePanZoom();

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const url = `/api/draft?year=${year}${liveMode ? "&live=1" : ""}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setPlayers(d.players ?? []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [year, liveMode]);

  // ── Layout computation (pure, recomputes only when players/view/isOverview change) ──
  const layout = useMemo<ChartLayout>(
    () => computeChartLayout(players, isOverview, view),
    [players, isOverview, view],
  );

  // ── Dot positions (pure, recomputes only when layout/isOverview change) ────
  const dotPositions = useMemo<DotPosition[]>(
    () => computeAllDotPositions(players, layout, isOverview),
    [players, layout, isOverview],
  );

  // ── Event handlers ──────────────────────────────────────────────────────────
  const handleDotClick = useCallback(
    (player: Player, clientX: number, clientY: number) => {
      if (isTouch.current) {
        const now = Date.now();
        if (now - lastTapMs.current < 350 && lastTapPlayer.current === player) {
          lastTapMs.current = 0;
          lastTapPlayer.current = null;
          setTooltip(null);
          setOpenPlayer(player);
        } else {
          lastTapMs.current = now;
          lastTapPlayer.current = player;
          setTooltip({ player, x: clientX + 14, y: clientY + 12 });
        }
      } else {
        setOpenPlayer(player);
      }
    },
    [],
  );

  const handleDotHover = useCallback(
    (player: Player, clientX: number, clientY: number) => {
      if (!isTouch.current) {
        setTooltip({ player, x: clientX + 14, y: clientY + 12 });
      }
    },
    [],
  );

  const handleDotLeave = useCallback(() => {
    if (!isTouch.current) setTooltip(null);
  }, []);

  const dismissTooltip = useCallback(() => setTooltip(null), []);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fff" }}>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading draft data…</p>
    </div>
  );
  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fff" }}>
      <p style={{ color: "#f87171", fontSize: 14 }}>Failed to load chart: {error}</p>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page wrapper */}
      <div className="dm-page">

        {/* Controls bar */}
        <div className="dm-controls">
          {/* View toggle */}
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

          {/* Live Draft toggle */}
          <button
            className={`dm-live-btn${liveMode ? " active" : ""}`}
            onClick={() => setLiveMode(l => !l)}
            title="Grey out drafted players"
          >
            <span className="dm-live-dot" />
            Live Draft
          </button>

          <span className="dm-hint">
            Scroll or pinch to zoom · drag to pan · click a dot to open player details (double-tap on mobile)
          </span>
        </div>

        {/* Chart frame */}
        <div className="dm-chart-wrapper">

          {/* Zoom viewport — handles pan/zoom events */}
          <div
            ref={viewportRef}
            className="dm-zoom-viewport"
            onClick={dismissTooltip}
          >
            {/* Stage — CSS transform applied directly by usePanZoom hook */}
            <div ref={stageRef} className="dm-zoom-stage">
              <svg
                width={layout.svgW}
                height={layout.svgH}
                style={{ display: "block" }}
              >
                <TierBands layout={layout} />
                <TierArrows layout={layout} />
                <PositionColumns layout={layout} zoomLevel={zoomLevel} isOverview={isOverview} />
                <RoundZones layout={layout} />
                <RoleLanes />
                <PlayerDots
                  dotPositions={dotPositions}
                  zoomLevel={zoomLevel}
                  liveMode={liveMode}
                  onDotClick={handleDotClick}
                  onDotHover={handleDotHover}
                  onDotLeave={handleDotLeave}
                />
                <PlayerLabels dotPositions={dotPositions} zoomLevel={zoomLevel} liveMode={liveMode} />
                <ChartBorders layout={layout} />
              </svg>
            </div>
          </div>

          {/* Zoom control widget */}
          <ZoomWidget zoomLevel={zoomLevel} onZoomIn={zoomIn} onZoomOut={zoomOut} />

          {/* Players legend — visible at highest zoom */}
          {zoomLevel >= 4 && <PlayersLegend />}
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
