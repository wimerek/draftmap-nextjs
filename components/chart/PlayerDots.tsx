"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Session N: Direction triangles replaced with connector lines (Session O polish).
 *   - Thin vertical line drawn from projectedY → actualY BEFORE circles.
 *   - Green (#4ade80) if player rose (steal: actualY < projectedY).
 *   - Soft red (#f87171) if player fell (reach/miss: actualY > projectedY).
 *   - strokeWidth 1.2, opacity scales with delta (0.15 → 0.38).
 *   - Threshold: pickValueDelta >= 15 picks (noise filter).
 *   - Dots rendered AFTER connectors so they sit on top.
 *
 * Session H fixes (preserved):
 *   - fill moved from SVG attribute to style.fill so CSS transition fires.
 *   - isAnimating prop: transition only applied during Play animation (0ms otherwise).
 *   - liveMode grey-out only applies in Projected view (not Drafted view).
 *   - Dot radius formula: exponential saturation, range 6–16px.
 */
import { useMemo } from "react";
import type { Player } from "@/lib/airtable";
import type { DotPosition } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";
import { SCHOOL_COLORS } from "@/lib/chartConstants";
import { TEAM_COLORS } from "@/lib/chartConstants";

interface Props {
  dotPositions: DotPosition[];
  liveMode: boolean;
  viewMode: ViewMode;
  isAnimating: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

/** Base dot radius in projected view and minimum in drafted view. */
const BASE_R = 6;

/** Min pick delta to show a connector line. Within 15 picks = close enough to skip. */
const INDICATOR_THRESHOLD = 15;

/**
 * Tier-adjusted delta -> dot radius.
 *
 * r = 6 + 10 * (1 - e^(-delta/25))
 *
 * Reference points:
 *   delta  2 (within R4, 10-pick move):   r ~  6.7  (baseline/tiny)
 *   delta  7 (3-8 spot fall in R1):       r ~  8.4  (small)
 *   delta 21 (top-5 -> late 20s in R1):   r ~ 11.7  (medium-large)
 *   delta 45 (R5 -> R3, e.g. Carson Beck):r ~ 14.4  (large)
 *   delta 92 (R1 -> UDFA):                r ~ 15.7  (max)
 */
function deltaToRadius(delta: number): number {
  return BASE_R + 10 * (1 - Math.exp(-delta / 25));
}

export default function PlayerDots({
  dotPositions, liveMode, viewMode, isAnimating,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  const inDraftedView = viewMode === "drafted";

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <g>
      {/* ── Connector lines (rendered FIRST so dots sit on top) ──────────── */}
      {/* Only shown in Drafted view, after animation completes.              */}
      {/* Green  = rose higher than projected (steal: actualY < projectedY)  */}
      {/* Soft red = fell lower than projected (reach/miss: actualY > proj)  */}
      {inDraftedView && !isAnimating && dotPositions.map(({ player, x, actualY, projectedY, pickValueDelta }, i) => {
        if (pickValueDelta < INDICATOR_THRESHOLD) return null;
        if (actualY === projectedY) return null;

        const isSteal   = actualY < projectedY;
        const lineColor = isSteal ? "#4ade80" : "#f87171";

        // Opacity scales with magnitude: min 0.15 at threshold, max 0.38 at large deltas
        const excess  = pickValueDelta - INDICATOR_THRESHOLD;
        const opacity = Math.min(0.15 + excess / 130, 0.38);

        const y1 = isSteal ? actualY   : projectedY;
        const y2 = isSteal ? projectedY : actualY;

        return (
          <line
            key={`conn-${player.id}-${i}`}
            x1={x} y1={y1}
            x2={x} y2={y2}
            stroke={lineColor}
            strokeWidth={1.2}
            opacity={opacity}
            style={{ pointerEvents: "none" }}
          />
        );
      })}

      {/* ── Circles ─────────────────────────────────────────────────────── */}
      {dotPositions.map(({ player, x, projectedY, actualY, pickValueDelta }, i) => {
        const sc = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };

        const isDrafted = liveMode && player.drafted && !inDraftedView;

        // ── Color ──────────────────────────────────────────────────────────
        let fill: string;
        let stroke: string;
        if (isDrafted) {
          fill   = "rgba(210,200,185,0.35)";
          stroke = "rgba(160,150,135,0.45)";
        } else if (inDraftedView && player.team_drafted) {
          const tc = TEAM_COLORS[player.team_drafted];
          if (tc) {
            fill   = tc.fill;
            stroke = tc.secondary;
          } else {
            fill   = sc.fill;
            stroke = "#333333";
          }
        } else {
          fill   = sc.fill;
          stroke = "#333333";
        }

        // ── Position (Y) ───────────────────────────────────────────────────
        const cy = inDraftedView ? actualY : projectedY;

        // ── Radius ─────────────────────────────────────────────────────────
        const r = inDraftedView ? deltaToRadius(pickValueDelta) : BASE_R;

        // ── Transition ─────────────────────────────────────────────────────
        const tDuration = isAnimating ? (prefersReducedMotion ? 100 : 550) : 0;
        const tDelay    = isAnimating ? (prefersReducedMotion ? 0   : i * 22) : 0;
        const transition = tDuration > 0
          ? [
              `cy ${tDuration}ms ease-out ${tDelay}ms`,
              `r ${tDuration}ms ease-out ${tDelay}ms`,
              `fill ${tDuration}ms ease-out ${tDelay}ms`,
            ].join(", ")
          : "none";

        return (
          <circle
            key={`${player.id}-${i}`}
            cx={x}
            cy={cy}
            r={r}
            stroke={stroke}
            strokeWidth={inDraftedView ? 2.5 : 1.5}
            style={{ fill, cursor: "pointer", transition }}
            onClick={e => { e.stopPropagation(); onDotClick(player); }}
            onMouseEnter={e => onDotHover(player, e.clientX, e.clientY)}
            onMouseLeave={onDotLeave}
          />
        );
      })}
    </g>
  );
}
