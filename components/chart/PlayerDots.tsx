"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Session G upgrades:
 *   - viewMode: "projected" | "drafted"
 *     cy transitions between projectedY and actualY via CSS transition.
 *   - Staggered transition delay (25ms per dot index) so dots ripple outward.
 *   - fill transitions from school color to NFL team color as dots move.
 *   - Dot radius encodes pick-value delta: larger = bigger projection surprise.
 *     r = BASE_R + min(MAX_R_ADD, sqrt(pickValueDelta) * R_SCALE)
 *   - Reduced motion: skip travel, snap to final with 100ms fade.
 */
import { useMemo } from "react";
import type { Player } from "@/lib/airtable";
import type { DotPosition } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";
import { SCHOOL_COLORS } from "@/lib/chartConstants";
import { TEAM_COLORS, teamStrokeFromFill } from "@/lib/chartConstants";

interface Props {
  dotPositions: DotPosition[];
  liveMode: boolean;
  viewMode: ViewMode;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

/** Base dot radius in projected view. */
const BASE_R = 6;
/** Maximum additional radius added by pick-value delta. */
const MAX_R_ADD = 10;
/** Scales sqrt(delta) → additional radius pixels. sqrt(100) = 10 → * 1 = 10 = MAX_R_ADD. */
const R_SCALE = 1.0;

/** Pick-value delta (0–100) → dot radius (6–16 px). */
function deltaToRadius(delta: number): number {
  return BASE_R + Math.min(MAX_R_ADD, Math.sqrt(delta) * R_SCALE);
}

/** Interpolate two hex colors by factor t (0=a, 1=b). Used for color transition. */
function lerpHex(a: string, b: string, t: number): string {
  const pr = parseInt(a.slice(1, 3), 16);
  const pg = parseInt(a.slice(3, 5), 16);
  const pb = parseInt(a.slice(5, 7), 16);
  const dr = parseInt(b.slice(1, 3), 16);
  const dg = parseInt(b.slice(3, 5), 16);
  const db = parseInt(b.slice(5, 7), 16);
  const r  = Math.round(pr + (dr - pr) * t).toString(16).padStart(2, "0");
  const g  = Math.round(pg + (dg - pg) * t).toString(16).padStart(2, "0");
  const bv = Math.round(pb + (db - pb) * t).toString(16).padStart(2, "0");
  return `#${r}${g}${bv}`;
}

export default function PlayerDots({
  dotPositions, liveMode, viewMode,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  const inDraftedView = viewMode === "drafted";

  // Detect reduced-motion preference once per render.
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <g>
      {dotPositions.map(({ player, x, projectedY, actualY, pickValueDelta }, i) => {
        const sc = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };

        const isDrafted = liveMode && player.drafted;

        // ── Color ────────────────────────────────────────────────────────────
        let fill: string;
        let stroke: string;
        if (isDrafted) {
          fill   = "rgba(210,200,185,0.35)";
          stroke = "rgba(160,150,135,0.45)";
        } else if (inDraftedView && player.team_drafted) {
          const tc = TEAM_COLORS[player.team_drafted];
          if (tc) {
            fill   = tc.fill;
            stroke = teamStrokeFromFill(tc.fill);
          } else {
            fill   = sc.fill;
            stroke = "#333333";
          }
        } else {
          fill   = sc.fill;
          stroke = "#333333";
        }

        // ── Position (Y) ────────────────────────────────────────────────────
        const cy = inDraftedView ? actualY : projectedY;

        // ── Radius ──────────────────────────────────────────────────────────
        const r = inDraftedView ? deltaToRadius(pickValueDelta) : BASE_R;

        // ── Transition ──────────────────────────────────────────────────────
        const tDuration = prefersReducedMotion ? 100 : 550;
        const tDelay    = prefersReducedMotion ? 0   : i * 22;
        const transition = [
          `cy ${tDuration}ms ease-out ${tDelay}ms`,
          `r ${tDuration}ms ease-out ${tDelay}ms`,
          `fill ${tDuration}ms ease-out ${tDelay}ms`,
        ].join(", ");

        return (
          <circle
            key={`${player.id}-${i}`}
            cx={x}
            cy={cy}
            r={r}
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            style={{ cursor: "pointer", transition }}
            onClick={e => { e.stopPropagation(); onDotClick(player); }}
            onMouseEnter={e => onDotHover(player, e.clientX, e.clientY)}
            onMouseLeave={onDotLeave}
          />
        );
      })}
    </g>
  );
}
