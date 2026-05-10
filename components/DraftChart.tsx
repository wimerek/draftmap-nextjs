"use client";
/**
 * components/DraftChart.tsx
 *
 * Session H fixes:
 *   - isAnimating state: CSS transitions only fire during Play (0ms for seg toggle).
 *   - Live Draft Mode grey-out fixed: only applies in Projected view.
 *   - Gradient opacity reduced: 0.65 top -> 0.08 bottom (softer fade).
 *   - UDFAZone always visible (passes viewMode instead of visible bool).
 *   - Left chart border: thin line at margin.left.
 *   - Drag-to-scroll on chart frame.
 *
 * Session G: Sidebar, viewMode animation, UDFA zone, pills right, team colors.
 * Session F: Visual polish (tier pill gradient, soft borders).
 * Session E: Continuous Y-axis, variable column widths, no zoom states.
 */

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
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

// ── Chart borders (top shadow + left separator) ───────────────────────────────

function ChartBorders({ layout }: { layout: ChartLayout }) {
  const { margin, chartW, totalChartH } = layout;
  return (
    <g>
      {/* Top shadow strip */}
      <rect
        x={margin.left} y={0}
        width={chartW} height={4}
        fill="#0B2239" opacity={0.12}
      />
      {/* Left border — separates round labels from chart data area */}
      <line
        x1={margin.left} y1={margin.top - 8}
        x2={margin.left} y2={margin.top + totalChartH + 8}
        stroke="rgba(11,34,57,0.12)"
        strokeWidth={1}
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
  const [showLines,  setShowLines]  = useState(false);
  const [view,       setView]       = useState<ChartView>("all");
  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);

  // ── Projection view state ────────────────────────────────────────────────
  const [viewMode,     setViewMode]     = useState<ViewMode>("projected");
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [animState,    setAnimState]    = useState<AnimationState>({
    playing: false,
    step: 0,
  });

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
    () => computeAllDotPositions(players, layout),
    [players, layout],
  );

  // ── Animation controls ───────────────────────────────────────────────────
  // Play: animated (550ms staggered). Segmented control: instant snap (0ms).

  const handlePlay = useCallback(() => {
    setIsAnimating(true);
    setViewMode("drafted");
    setAnimState({ playing: true, step: 1 });
    // Clear playing flag after all dots finish transitioning.
    const longestDelay = dotPositions.length * 22 + 550;
    setTimeout(() => {
      setAnimState(s => ({ ...s, playing: false }));
      setIsAnimating(false);
    }, longestDelay);
  }, [dotPositions.length]);

  const handlePause = useCallback(() => {
    setAnimState(s => ({ ...s, playing: false }));
    setIsAnimating(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsAnimating(false);
    setViewMode("projected");
    setAnimState({ playing: false, step: 0 });
  }, []);

  const handleStepForward = useCallback(() => {
    setIsAnimating(false);
    setViewMode("drafted");
    setAnimState({ playing: false, step: 1 });
  }, []);

  const handleStepBack = useCallback(() => {
    setIsAnimating(false);
    setViewMode("projected");
    setAnimState({ playing: false, step: 0 });
  }, []);

  const handleJumpEnd = useCallback(() => {
    setIsAnimating(false);
    setViewMode("drafted");
    setAnimState({ playing: false, step: 1 });
  }, []);

  // Segmented control toggle -> instant snap, no animation.
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setIsAnimating(false);
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
      // Smart positioning: upper-right by default, upper-left near right edge
      const nearRight = typeof window !== "undefined" && clientX > window.innerWidth - 280;
      setTooltip({ player, x: nearRight ? clientX - 248 : clientX + 40, y: clientY - 115 });
    },
    [],
  );

  const handleDotLeave   = useCallback(() => setTooltip(null), []);
  const dismissTooltip   = useCallback(() => setTooltip(null), []);
  const handleLiveToggle      = useCallback(() => setLiveMode(l => !l), []);
  const handleShowLinesToggle = useCallback(() => setShowLines(l => !l), []);

  // ── Drag-to-scroll on chart frame ────────────────────────────────────────
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; scrollLeft: number }>({
    active: false, startX: 0, scrollLeft: 0,
  });

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const frame = chartFrameRef.current;
    if (!frame) return;
    dragRef.current = { active: true, startX: e.pageX, scrollLeft: frame.scrollLeft };
    frame.style.cursor = "grabbing";
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    const frame = chartFrameRef.current;
    if (!frame) return;
    frame.scrollLeft = d.scrollLeft - (e.pageX - d.startX);
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current.active = false;
    if (chartFrameRef.current) chartFrameRef.current.style.cursor = "grab";
  }, []);

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
        showLines={showLines}
        onShowLinesToggle={handleShowLinesToggle}
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
          <div
            className="dm-chart-frame"
            ref={chartFrameRef}
            style={{ paddingTop: 20 }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <svg
              width={layout.svgW}
              height={layout.svgH}
              style={{ display: "block", maxWidth: "none" }}
            >
              <defs>
                <linearGradient
                  id="tierPillGradient"
                  x1="0" y1={layout.tierBandDefs[0].y1}
                  x2="0" y2={layout.margin.top + layout.totalChartH}
                  gradientUnits="userSpaceOnUse"
                >
                  {/* Reduced opacity: 0.65 top -> 0.08 bottom (softer, less dominant) */}
                  <stop offset="0%"   stopColor="#D4A017" stopOpacity={0.88} />
                  <stop offset="100%" stopColor="#D4A017" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <TierBands layout={layout} />
              <TierArrows layout={layout} />
              <PositionColumns layout={layout} />
              <RoundZones layout={layout} />
              <UDFAZone layout={layout} viewMode={viewMode} />
              <PlayerDots
                dotPositions={dotPositions}
                liveMode={liveMode}
                viewMode={viewMode}
                isAnimating={isAnimating}
                showLines={showLines}
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
