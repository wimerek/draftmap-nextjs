"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Session H fixes:
 *   - fill moved from SVG attribute to style.fill so CSS transition fires.
 *   - isAnimating prop: transition only applied during Play animation (0ms otherwise).
 *   - liveMode grey-out only applies in Projected view (not Drafted view).
 *   - Dot radius formula: sqrt(raw pick delta) * 1.4, range 6-16px.
 *     Raw pick delta = |pick_drafted - rank| for drafted players,
 *                     (257 - rank) for undrafted (treated as "fell off the board").
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

/**
 * Tier-adjusted delta -> dot radius.
 *
 * Uses exponential saturation so small within-round misses stay visually quiet
 * and cross-round / cross-tier surprises ramp up meaningfully.
 *
 * r = 6 + 10 * (1 - e^(-delta/25))
 *
 * Reference points (Session J v2 scale):
 *   delta  2 (within R4, 10-pick move):   r ~  6.7  (baseline/tiny)
 *   delta  7 (3-8 spot fall in R1):       r ~  8.4  (small)
 *   delta  9 (late R1 -> early R2):       r ~  8.9  (small-medium)
 *   delta 21 (top-5 -> late 20s in R1):   r ~ 11.7  (medium-large)
 *   delta 45 (R5 -> R3, e.g. Carson Beck):r ~ 14.4  (large)
 *   delta 70 (R1 -> R5):                  r ~ 15.4  (very large)
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

  // Detect reduced-motion preference once per render.
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Min delta to show a direction indicator — within 12 picks is close enough to call "on target"
  const INDICATOR_THRESHOLD = 12;

  return (
    <g>
      {/* ── Circles ─────────────────────────────────────────────────────── */}
      {dotPositions.map(({ player, x, projectedY, actualY, pickValueDelta }, i) => {
        const sc = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };

        // Live Draft Mode grey-out only applies in Projected view.
        // In Drafted view we always show full team colors / results.
        const isDrafted = liveMode && player.drafted && !inDraftedView;

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
            // Use team secondary as stroke so both colors are visible
            stroke = tc.secondary;
          } else {
            // Team not found in lookup — fall back to school color
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
        // isAnimating=true (Play button)  -> 550ms staggered ease-out
        // isAnimating=false (seg control) -> 0ms instant snap
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
            // fill in style (not as SVG attribute) so CSS transition works.
            style={{ fill, cursor: "pointer", transition }}
            onClick={e => { e.stopPropagation(); onDotClick(player); }}
            onMouseEnter={e => onDotHover(player, e.clientX, e.clientY)}
            onMouseLeave={onDotLeave}
          />
        );
      })}

      {/* ── Direction indicators (rendered after circles so they sit on top) ── */}
      {/* Only shown in Drafted view, after animation completes.                 */}
      {/* ▲ green = rose higher than projected (steal)                           */}
      {/* ▼ amber = fell lower than projected (reach / miss)                     */}
      {inDraftedView && !isAnimating && dotPositions.map(({ player, x, actualY, projectedY, pickValueDelta }, i) => {
        if (pickValueDelta < INDICATOR_THRESHOLD) return null;

        const r = deltaToRadius(pickValueDelta);

        // actualY < projectedY → dot is higher on chart → picked earlier → steal (▲)
        // actualY > projectedY → dot is lower on chart  → picked later  → reach (▼)
        const isSteal = actualY < projectedY;

        // Scale opacity and size with delta magnitude, staying subtle
        const excess  = pickValueDelta - INDICATOR_THRESHOLD;
        const opacity = Math.min(0.18 + excess / 120, 0.52);
        const triSize = Math.min(3 + excess / 22, 6.5);
        const gap     = 3; // pixels between dot edge and triangle base

        const triColor = isSteal ? "#22c55e" : "#f59e0b";

        let points: string;
        if (isSteal) {
          // ▲ above the dot: tip up, base below
          const tipY  = actualY - r - gap - triSize * 1.4;
          const baseY = actualY - r - gap;
          points = `${x},${tipY} ${x - triSize},${baseY} ${x + triSize},${baseY}`;
        } else {
          // ▼ below the dot: tip down, base above
          const baseY = actualY + r + gap;
          const tipY  = actualY + r + gap + triSize * 1.4;
          points = `${x},${tipY} ${x - triSize},${baseY} ${x + triSize},${baseY}`;
        }

        return (
          <polygon
            key={`ind-${player.id}-${i}`}
            points={points}
            fill={triColor}
            opacity={opacity}
            style={{ pointerEvents: "none" }}
          />
        );
      })}
    </g>
  );
}
