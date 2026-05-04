"use client";
/**
 * components/DraftChart.tsx
 *
 * Session G: Projection View animation.
 *   - Sidebar replaces top controls bar for most settings.
 *   - viewMode: "projected" | "drafted" — drives dot Y positions + colors.
 *   - Animation player: Play flips to Drafted, Reset snaps back to Projected.
 *   - pick_value_curve.json loaded client-side for dot-size delta computation.
 *   - UDFA zone visible in Drafted view.
 *   - Pills moved to SVG right margin (layout change in chartMath).
 *   - Flex-push layout: sidebar on left, chart main on right.
 *
 * Session F: Visual polish (tier pill gradient, soft borders, crisper strokes).
 * Session E: Continuous Y-axis, variable column widths, no zoom states.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import type { Player } from "@/lib/airtable";
import {
  computeChartLayout,
  computeAllDotPositions,
  type ChartLayout,
  type DotPosition,
  type ChartView,
  type PickValueEntry,
} from "@/lib/chartMath";
import PlayerCard from "@/components/PlayerCard";
import TierBands from "@/components/chart/TierBands";
import TierArrows from "@/components/chart/TierArrows";
import PositionColumns from "@/components/chart/PositionColumns";
import RoundZones from "@/components/chart/RoundZones";
import PlayerDots from "@/components/chart/PlayerDots";
import UDFAZone from "@/components/chart/UDFAZone";
import Sidebar, {
  type ViewMode,
  type AnimationState,
} from "@/components/Sidebar";

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
  const strengths = [player.s1, player.s2, player.s3].filter(
    (s): s is string => !!s && s !== "N/A",
  );
  const strengthColors  = ["#B8D4C4", "#9ABFAD", "#7EA896"];
  const strengthWeights = ["700", "600", "500"];

  return (
    <div className="dm-tooltip" style={{ left: x, top: y }}>
      <div className="dm-tooltip-line">
        <strong>{player.name}</strong> — {player.pos}
      </div>
      <div className="dm-tooltip-line">
        <span className="dm-tooltip-label">School:</span> {player.school || "N/A"}
      </div>
      <div className="dm-tooltip-line">
        <span className="dm-tooltip-label">Role:</span> {player.role || "—"}
      </div>
      <div className="dm-tooltip-line">
        <span className="dm-tooltip-label">Proj. Pick</span> #{player.rank}
      </div>
      {player.pick_drafted && (
        <div className="dm-tooltip-line">
          <span className="dm-tooltip-label">Actual Pick</span> #{player.pick_drafted}
          {player.team_drafted ? ` — ${player.team_drafted}` : ""}
        </div>
      )}
      {strengths.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {strengths.map((s, i) => (
            <div
              key={i}
              style={{
                color:      strengthColors[i],
                fontWeight: strengthWeights[i],
                fontSize:   11,
              }}
            >
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
  const { margin, chartW } = layout;
  return (
    <g>
      <rect
        x={margin.left} y={0}
        width={chartW} height={4}
        fill="#0B2239" opacity={0.12}
      />
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DraftChart({ year = 2026 }: DraftChartProps) {
  const [players,    setPlayers]    = useState<Player[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [liveMode,   setLiveMode]   = useState(false);
  const [view,       setView]       = useState<ChartView>("all");
  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);

  // ── Projection view state ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("projected");
  const [animState, setAnimState] = useState<AnimationState>({
    playing: false,
    step: 0,
  });

  // ── Pick-value curve (for dot delta sizing) ──────────────────────────────
  const [pickValueCurve, setPickValueCurve] = useState<PickValueEntry[]>([]);
  useEffect(() => {
    fetch("/pick_value_curve.json")
      .then(r => r.json())
      .then(data => setPickValueCurve(data))
      .catch(() => { /* graceful degradation — dots use uniform size */ });
  }, []);

  // ── Data fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const url = `/api/draft?year=${year}${liveMode ? "&live=1" : ""}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setPlayers(d.players ?? []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [year, liveMode]);

  // ── Layout ───────────────────────────────────────────────────────────────
  const layout = useMemo<ChartLayout>(
    () => computeChartLayout(players, view),
    [players, view],
  );

  // ── Dot positions ────────────────────────────────────────────────────────
  const dotPositions = useMemo<DotPosition[]>(
    () => computeAllDotPositions(players, layout, pickValueCurve),
    [players, layout, pickValueCurve],
  );

  // ── Animation controls ───────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    setViewMode("drafted");
    setAnimState({ playing: true, step: 1 });
    // Animation is CSS-driven; mark as not-playing after longest stagger window.
    const longestDelay = dotPositions.length * 22 + 550;
    setTimeout(() => setAnimState(s => ({ ...s, playing: false })), longestDelay);
  }, [dotPositions.length]);

  const handlePause = useCallback(() => {
    setAnimState(s => ({ ...s, playing: false }));
  }, []);

  const handleReset = useCallback(() => {
    setViewMode("projected");
    setAnimState({ playing: false, step: 0 });
  }, []);

  const handleStepForward = useCallback(() => {
    setViewMode("drafted");
    setAnimState({ playing: false, step: 1 });
  }, []);

  const handleStepBack = useCallback(() => {
    setViewMode("projected");
    setAnimState({ playing: false, step: 0 });
  }, []);

  const handleJumpEnd = useCallback(() => {
    setViewMode("drafted");
    setAnimState({ playing: false, step: 1 });
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setAnimState(s => ({
      ...s,
      step: mode === "drafted" ? 1 : 0,
      playing: false,
    }));
  }, []);

  // ── Event handlers ───────────────────────────────────────────────────────
  const handleDotClick = useCallback((player: Player) => {
    setTooltip(null);
    setOpenPlayer(player);
  }, []);

  const handleDotHover = useCallback(
    (player: Player, clientX: number, clientY: number) => {
      setTooltip({ player, x: clientX + 14, y: clientY + 12 });
    },
    [],
  );

  const handleDotLeave   = useCallback(() => setTooltip(null), []);
  const dismissTooltip   = useCallback(() => setTooltip(null), []);
  const handleLiveToggle = useCallback(() => setLiveMode(l => !l), []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="dm-app-layout">
      {/* ── Left sidebar ── */}
      <Sidebar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        animState={animState}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        onStepBack={handleStepBack}
        onStepForward={handleStepForward}
        onJumpEnd={handleJumpEnd}
        view={view}
        onViewChange={setView}
        year={year}
        liveMode={liveMode}
        onLiveModeToggle={handleLiveToggle}
      />

      {/* ── Main chart area ── */}
      <main className="dm-main" onClick={dismissTooltip}>
        {loading && (
          <div className="dm-state-msg"><p>Loading draft data…</p></div>
        )}
        {error && (
          <div className="dm-state-msg dm-state-error">
            <p>Failed to load chart: {error}</p>
          </div>
        )}
        {!loading && !error && (
          <div className="dm-chart-frame">
            <svg
              width={layout.svgW}
              height={layout.svgH}
              style={{ display: "block", maxWidth: "100%" }}
            >
              <defs>
                <linearGradient
                  id="tierPillGradient"
                  x1="0" y1={layout.tierBandDefs[0].y1}
                  x2="0" y2={layout.margin.top + layout.totalChartH}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%"   stopColor="#D4A017" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#D4A017" stopOpacity={0.18} />
                </linearGradient>
              </defs>
              <TierBands layout={layout} />
              <TierArrows layout={layout} />
              <PositionColumns layout={layout} />
              <RoundZones layout={layout} />
              <UDFAZone layout={layout} visible={viewMode === "drafted"} />
              <PlayerDots
                dotPositions={dotPositions}
                liveMode={liveMode}
                viewMode={viewMode}
                onDotClick={handleDotClick}
                onDotHover={handleDotHover}
                onDotLeave={handleDotLeave}
              />
              <ChartBorders layout={layout} />
            </svg>
          </div>
        )}
      </main>

      {/* Floating tooltip */}
      {tooltip && <ChartTooltip {...tooltip} />}

      {/* Player card */}
      <PlayerCard
        player={openPlayer}
        players={players}
        onClose={() => setOpenPlayer(null)}
      />
    </div>
  );
}
