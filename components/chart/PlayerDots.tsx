"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Phase Beta: isMobile prop added.
 *   - Mobile: 44×44px invisible touch targets over each dot; tap opens card directly.
 *     No tooltip on mobile. No entrance animation on mobile (isAnimating only fires
 *     during the opening animation sequence).
 *   - showLines / connector on hover: desktop only.
 *
 * Delta-2: chartMode prop added.
 *   - projection mode: school colors (unchanged from Phase Beta).
 *   - draft-results / player-production / career: tier colors via getDotColor().
 *     Team color two-tone rings removed from non-projection modes.
 *   - showLines only rendered in draft-results and player-production modes.
 */
import { useState } from "react";
import type { Player } from "@/lib/sheets";
import type { DotPosition } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";
import type { ChartMode } from "@/lib/dataAvailability";
import { SCHOOL_COLORS, TEAM_COLORS } from "@/lib/chartConstants";
import { getDotColor } from "@/lib/dotColor";

interface Props {
  dotPositions: DotPosition[];
  liveMode: boolean;
  viewMode: ViewMode;
  chartMode?: ChartMode;
  currentStepId?: string;
  isAnimating: boolean;
  showLines: boolean;
  isMobile?: boolean;
  isZoomedMobile?: boolean;
  /** Per-player production Y and opacity for the current journey step. */
  productionPositions?: Map<string, { y: number; opacity: number }>;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

const BASE_R = 6;
const TOUCH_TARGET = 22;

function starPath(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const angle = (Math.PI * 2 * k) / 10 - Math.PI / 2;
    const r = k % 2 === 0 ? outerR : innerR;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${pts[0]} ` + pts.slice(1).map(p => `L${p}`).join(' ') + ' Z';
}

function deltaToRadius(delta: number): number {
  return BASE_R + 10 * (1 - Math.exp(-delta / 25));
}

export default function PlayerDots({
  dotPositions, liveMode, viewMode, chartMode = "projection",
  currentStepId,
  isAnimating, showLines,
  isMobile = false,
  isZoomedMobile = false,
  productionPositions,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  const inDraftedView     = viewMode === "drafted";
  // draft-results uses team colors (where the player was drafted to).
  // player-production and career use tier colors (career outcome scoring).
  const isDraftResultsMode = chartMode === "draft-results";
  const isProductionMode   = chartMode === "player-production" || chartMode === "career";
  // Leader lines (projection→actual connectors) only in draft-results; meaningless in production.
  const showTrailingLines  = chartMode === "draft-results";
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hoveredDot = !isMobile && inDraftedView && !isProductionMode && hoveredId
    ? dotPositions.find(d => d.player.player_id === hoveredId) ?? null
    : null;

  return (
    <g>
      {/* ── All-lines mode — only in draft-results / player-production ─── */}
      {!isMobile && showTrailingLines && !isAnimating && showLines && dotPositions.map(
        ({ player, x, actualY, projectedY, pickValueDelta }, i) => {
          if (actualY === projectedY) return null;
          const opacity = Math.min(0.10 + pickValueDelta / 200, 0.38);
          return (
            <line
              key={`all-conn-${player.player_id}-${i}`}
              x1={x} y1={Math.min(actualY, projectedY)}
              x2={x} y2={Math.max(actualY, projectedY)}
              stroke="#D4A017" strokeWidth={1.2} opacity={opacity}
              style={{ pointerEvents: "none" }}
            />
          );
        }
      )}

      {/* ── Hover connector (desktop, drafted view only) ──────────────── */}
      {hoveredDot && hoveredDot.actualY !== hoveredDot.projectedY && (
        <g style={{ pointerEvents: "none" }}>
          <line
            x1={hoveredDot.x} y1={Math.min(hoveredDot.actualY, hoveredDot.projectedY)}
            x2={hoveredDot.x} y2={Math.max(hoveredDot.actualY, hoveredDot.projectedY)}
            stroke="#D4A017" strokeWidth={1.8} opacity={0.85}
          />
          <circle
            cx={hoveredDot.x} cy={hoveredDot.projectedY} r={BASE_R}
            fill="none" stroke="#D4A017" strokeWidth={1.5}
            strokeDasharray="3,2" opacity={0.65}
          />
        </g>
      )}

      {/* ── Circles ──────────────────────────────────────────────────── */}
      {dotPositions.map(({ player, x, projectedY, actualY, pickValueDelta, expectedPickValue }, i) => {
        const sc = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };
        const isDrafted = liveMode && player.drafted && !inDraftedView;

        let fill: string, stroke: string;

        if (isProductionMode) {
          // Year 1-N and Career: team colors (team identity story; Y-position tells performance story)
          let stepTeam: string | null = null;
          if (chartMode === 'career') {
            const lastStep = [...(player.stepScores ?? [])].reverse().find(s => s.team)
            stepTeam = lastStep?.team ?? player.team_drafted ?? null;
          } else {
            const stepEntry = (player.stepScores ?? []).find(s => s.stepId === currentStepId);
            stepTeam = stepEntry?.team ?? player.team_drafted ?? null;
          }
          const tc = stepTeam ? TEAM_COLORS[stepTeam] : null;
          fill   = tc?.fill   ?? '#4e6070';
          stroke = tc?.secondary ?? 'rgba(255,255,255,0.35)';
        } else if (isDrafted) {
          // Live mode: grey out already-drafted players in projected view
          fill   = "rgba(210,200,185,0.35)";
          stroke = "rgba(160,150,135,0.45)";
        } else if (inDraftedView && player.team_drafted) {
          // Draft Results (and sidebar drafted view): NFL team colors
          const tc = TEAM_COLORS[player.team_drafted];
          if (tc) { fill = tc.fill; stroke = tc.secondary; }
          else    { fill = sc.fill; stroke = "#333333"; }
        } else {
          // Projection: school/college colors
          fill   = sc.fill;
          stroke = "#333333";
        }

        // Production mode: use score-derived Y and opacity from productionPositions.
        // Otherwise: drafted view uses actualY, projected view uses projectedY.
        const prodPos = isProductionMode ? productionPositions?.get(player.player_id) : undefined;
        const cy = prodPos !== undefined ? prodPos.y : (inDraftedView ? actualY : projectedY);
        const dotOpacity = prodPos !== undefined ? prodPos.opacity : 1.0;

        // Production mode: absolute delta (USG score vs expected pick value) drives radius.
        // Both overperformers and underperformers get larger dots; direction shown via leader lines.
        const PROD_R_NEUTRAL = BASE_R + 1.5;
        const PROD_R_MAX     = BASE_R + 8;
        let productionR = PROD_R_NEUTRAL;
        if (isProductionMode && !isMobile) {
          const stepScore = chartMode === 'career'
            ? player.outcomeScore ?? null
            : (player.stepScores ?? []).find(s => s.stepId === currentStepId)?.score ?? null;
          if (stepScore !== null && expectedPickValue > 0) {
            const absDelta = Math.abs(stepScore - expectedPickValue);
            const t = Math.min(absDelta / 60, 1);
            productionR = PROD_R_NEUTRAL + t * (PROD_R_MAX - PROD_R_NEUTRAL);
          }
        }
        const r = isMobile ? BASE_R : isProductionMode ? productionR : (inDraftedView ? deltaToRadius(pickValueDelta) : BASE_R);

        const skipAnim = isMobile && !isAnimating;
        const tDuration = skipAnim ? 0 : (isAnimating ? (prefersReducedMotion ? 100 : 550) : 0);
        const tDelay    = skipAnim ? 0 : (isAnimating ? (prefersReducedMotion ? 0   : i * 22) : 0);
        // In production mode, exclude `r` from transition so radius snaps instantly
        // when entering from Draft Results (variable delta-size → uniform BASE_R+1.5).
        // `cy` movement is handled by the group transform so ring/star travel with the dot.
        const groupTransition = tDuration > 0
          ? `transform ${tDuration}ms ease-out ${tDelay}ms`
          : "none";
        const transition = tDuration > 0
          ? isProductionMode
            ? [`fill ${tDuration}ms ease-out ${tDelay}ms`, `opacity ${tDuration}ms ease-out ${tDelay}ms`].join(", ")
            : [`r ${tDuration}ms ease-out ${tDelay}ms`, `fill ${tDuration}ms ease-out ${tDelay}ms`, `opacity ${tDuration}ms ease-out ${tDelay}ms`].join(", ")
          : "none";

        // ST-primary: player logged more raw ST snaps than position snaps this step
        // Uses absolute snap counts (not percentages) so fringe players with tiny position
        // snap rates don't trigger this. Minimum 50 ST snaps to exclude garbage time.
        let isSTprimary = false;
        if (isProductionMode) {
          const isSTRow = (row: { stSnapCount?: number | null; snapCount?: number | null } | null) =>
            row != null &&
            row.stSnapCount != null && row.stSnapCount >= 50 &&
            row.snapCount    != null && row.stSnapCount > row.snapCount;
          if (chartMode === 'career') {
            const lastRow = player.seasonData ? player.seasonData[player.seasonData.length - 1] : null;
            isSTprimary = isSTRow(lastRow);
          } else if (currentStepId) {
            const season = parseInt(currentStepId, 10);
            if (!isNaN(season)) {
              const row = player.seasonData?.find(s => s.season === season) ?? null;
              isSTprimary = isSTRow(row);
            }
          }
        }

        // Pro Bowl ring + All Pro star: production/career steps only
        let showProBowl = false;
        let showAllPro  = false;
        if (isProductionMode) {
          if (chartMode === 'career') {
            showProBowl = player.seasonData?.some(sr => sr.proBowl) ?? false;
            showAllPro  = player.seasonData?.some(sr => sr.allPro)  ?? false;
          } else if (currentStepId) {
            const season = parseInt(currentStepId, 10);
            if (!isNaN(season)) {
              const sr = player.seasonData?.find(s => s.season === season);
              showProBowl = sr?.proBowl ?? false;
              showAllPro  = sr?.allPro  ?? false;
            }
          }
        }

        const dotStroke      = isMobile ? "#ffffff" : stroke;
        const dotStrokeWidth = isMobile
          ? (isZoomedMobile ? 0.8 : 2.5)
          : (inDraftedView ? 2.5 : 1.5);

        // Two-tone team rings: projection + draft-results modes on mobile (not production/career)
        const showTwoTone =
          !isProductionMode &&
          isMobile &&
          inDraftedView &&
          !isDrafted &&
          !!player.team_drafted &&
          !!TEAM_COLORS[player.team_drafted];

        return (
          <g key={`${player.player_id}-${i}`}>
            {/* Inner group translates to (x, cy) — all children ride the same animation */}
            <g style={{ transform: `translate(${x}px, ${cy}px)`, transition: groupTransition }}>
              {showTwoTone ? (
                <>
                  <circle
                    cx={0} cy={0} r={r + 2.5}
                    fill={stroke}
                    stroke="#ffffff"
                    strokeWidth={1}
                    style={{ pointerEvents: "none" }}
                  />
                  <circle
                    cx={0} cy={0} r={r}
                    fill={fill}
                    stroke="none"
                    style={{ pointerEvents: "none" }}
                  />
                </>
              ) : (
                <circle
                  cx={0} cy={0} r={r}
                  stroke={dotStroke}
                  strokeWidth={dotStrokeWidth}
                  style={{ fill, opacity: dotOpacity, cursor: "pointer", transition }}
                  onClick={isMobile ? undefined : (e => { e.stopPropagation(); onDotClick(player); })}
                  onMouseEnter={isMobile ? undefined : (e => { setHoveredId(player.player_id); onDotHover(player, e.clientX, e.clientY); })}
                  onMouseLeave={isMobile ? undefined : (() => { setHoveredId(null); onDotLeave(); })}
                />
              )}
              {/* ST-primary wash: white overlay that dilutes the team color for ST specialists */}
              {isSTprimary && !showTwoTone && (
                <circle
                  cx={0} cy={0} r={r}
                  fill="rgba(255,255,255,0.42)"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Pro Bowl ring — travels with the dot via the parent group transform */}
              {showProBowl && !showTwoTone && (
                <circle
                  cx={0} cy={0}
                  r={r + 3.5}
                  fill="none"
                  stroke="#D4A017"
                  strokeWidth={1.5}
                  opacity={0.85}
                  style={{ pointerEvents: "none" }}
                />
              )}

              {/* All Pro star — travels with the dot via the parent group transform */}
              {showAllPro && !showTwoTone && (
                <path
                  d={starPath(0, 0, 4.5, 2.0)}
                  fill="white"
                  opacity={0.9}
                  style={{ pointerEvents: "none" }}
                />
              )}

              {isMobile && (
                <rect
                  x={-TOUCH_TARGET}
                  y={-TOUCH_TARGET}
                  width={TOUCH_TARGET * 2}
                  height={TOUCH_TARGET * 2}
                  fill="transparent"
                  stroke="none"
                  style={{ cursor: "pointer" }}
                  onClick={e => { e.stopPropagation(); onDotClick(player); }}
                />
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
}
