"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Session P: Connector lines are now hover-only.
 *   - On hover in Drafted view: show a connector line from projectedY to actualY
 *     + a ghost circle (dashed outline) at the projected position.
 *   - Green (#4ade80) = rose vs projection (steal). Soft red (#f87171) = fell.
 *   - No delta threshold on hover — even small moves are informative on demand.
 *   - Always-on connector lines removed entirely.
 *
 * Session H fixes (preserved):
 *   - fill moved from SVG attribute to style.fill so CSS transition fires.
 *   - isAnimating prop: transition only during Play animation.
 *   - liveMode grey-out only applies in Projected view.
 *   - Dot radius: exponential saturation, range 6-16px.
 */
import { useState } from "react";
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

const BASE_R = 6;

/**
 * r = 6 + 10 * (1 - e^(-delta/25))
 * delta 0 -> r 6, delta 45 -> r ~14.4, delta 92 -> r ~15.7
 */
function deltaToRadius(delta: number): number {
  return BASE_R + 10 * (1 - Math.exp(-delta / 25));
}

export default function PlayerDots({
  dotPositions, liveMode, viewMode, isAnimating,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  const inDraftedView = viewMode === "drafted";

  /** ID of the currently-hovered player (for connector line). */
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Find the hovered dot's data for the connector overlay
  const hoveredDot = inDraftedView && hoveredId
    ? dotPositions.find(d => d.player.id === hoveredId) ?? null
    : null;

  return (
    <g>
      {/* ── Hover connector (rendered FIRST so dots sit on top) ──────────── */}
      {/* Shown only when a dot is hovered in Drafted view.                   */}
      {hoveredDot && hoveredDot.actualY !== hoveredDot.projectedY && (
        <g style={{ pointerEvents: "none" }}>
          {/* Connector line: projectedY <-> actualY */}
          <line
            x1={hoveredDot.x}
            y1={Math.min(hoveredDot.actualY, hoveredDot.projectedY)}
            x2={hoveredDot.x}
            y2={Math.max(hoveredDot.actualY, hoveredDot.projectedY)}
            stroke="#D4A017"
            strokeWidth={1.5}
            opacity={0.72}
          />
          {/* Ghost circle at projected position */}
          <circle
            cx={hoveredDot.x}
            cy={hoveredDot.projectedY}
            r={BASE_R}
            fill="none"
            stroke="#D4A017"
            strokeWidth={1.5}
            strokeDasharray="3,2"
            opacity={0.52}
          />
        </g>
      )}

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
            onMouseEnter={e => {
              setHoveredId(player.id);
              onDotHover(player, e.clientX, e.clientY);
            }}
            onMouseLeave={() => {
              setHoveredId(null);
              onDotLeave();
            }}
          />
        );
      })}
    </g>
  );
}
