"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Session S: showLines prop added.
 *   - showLines=false (default): connector + ghost only on hover.
 *   - showLines=true: connectors rendered for ALL dots in Drafted view
 *     (scaled opacity by delta, no threshold). Hover still works on top.
 *
 * Connector color: brand gold #D4A017 (neutral, no value judgment).
 */
import { useState } from "react";
import type { Player } from "@/lib/sheets";
import type { DotPosition } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";
import { SCHOOL_COLORS } from "@/lib/chartConstants";
import { TEAM_COLORS } from "@/lib/chartConstants";

interface Props {
  dotPositions: DotPosition[];
  liveMode: boolean;
  viewMode: ViewMode;
  isAnimating: boolean;
  showLines: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

const BASE_R = 6;

function deltaToRadius(delta: number): number {
  return BASE_R + 10 * (1 - Math.exp(-delta / 25));
}

export default function PlayerDots({
  dotPositions, liveMode, viewMode, isAnimating, showLines,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  const inDraftedView = viewMode === "drafted";
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hoveredDot = inDraftedView && hoveredId
    ? dotPositions.find(d => d.player.id === hoveredId) ?? null
    : null;

  return (
    <g>
      {/* ── All-lines mode (showLines toggle) — rendered first ───────────── */}
      {inDraftedView && !isAnimating && showLines && dotPositions.map(
        ({ player, x, actualY, projectedY, pickValueDelta }, i) => {
          if (actualY === projectedY) return null;
          // Scale opacity with delta so tiny moves are whisper-quiet
          const opacity = Math.min(0.10 + pickValueDelta / 200, 0.38);
          return (
            <line
              key={`all-conn-${player.id}-${i}`}
              x1={x} y1={Math.min(actualY, projectedY)}
              x2={x} y2={Math.max(actualY, projectedY)}
              stroke="#D4A017"
              strokeWidth={1.2}
              opacity={opacity}
              style={{ pointerEvents: "none" }}
            />
          );
        }
      )}

      {/* ── Hover connector + ghost circle — rendered second ─────────────── */}
      {hoveredDot && hoveredDot.actualY !== hoveredDot.projectedY && (
        <g style={{ pointerEvents: "none" }}>
          <line
            x1={hoveredDot.x}
            y1={Math.min(hoveredDot.actualY, hoveredDot.projectedY)}
            x2={hoveredDot.x}
            y2={Math.max(hoveredDot.actualY, hoveredDot.projectedY)}
            stroke="#D4A017"
            strokeWidth={1.8}
            opacity={0.85}
          />
          <circle
            cx={hoveredDot.x}
            cy={hoveredDot.projectedY}
            r={BASE_R}
            fill="none"
            stroke="#D4A017"
            strokeWidth={1.5}
            strokeDasharray="3,2"
            opacity={0.65}
          />
        </g>
      )}

      {/* ── Circles ─────────────────────────────────────────────────────── */}
      {dotPositions.map(({ player, x, projectedY, actualY, pickValueDelta }, i) => {
        const sc = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };
        const isDrafted = liveMode && player.drafted && !inDraftedView;

        let fill: string;
        let stroke: string;
        if (isDrafted) {
          fill   = "rgba(210,200,185,0.35)";
          stroke = "rgba(160,150,135,0.45)";
        } else if (inDraftedView && player.team_drafted) {
          const tc = TEAM_COLORS[player.team_drafted];
          if (tc) { fill = tc.fill; stroke = tc.secondary; }
          else    { fill = sc.fill; stroke = "#333333"; }
        } else {
          fill   = sc.fill;
          stroke = "#333333";
        }

        const cy = inDraftedView ? actualY : projectedY;
        const r  = inDraftedView ? deltaToRadius(pickValueDelta) : BASE_R;

        const tDuration = isAnimating ? (prefersReducedMotion ? 100 : 550) : 0;
        const tDelay    = isAnimating ? (prefersReducedMotion ? 0   : i * 22) : 0;
        const transition = tDuration > 0
          ? [`cy ${tDuration}ms ease-out ${tDelay}ms`,
             `r ${tDuration}ms ease-out ${tDelay}ms`,
             `fill ${tDuration}ms ease-out ${tDelay}ms`].join(", ")
          : "none";

        return (
          <circle
            key={`${player.id}-${i}`}
            cx={x} cy={cy} r={r}
            stroke={stroke}
            strokeWidth={inDraftedView ? 2.5 : 1.5}
            style={{ fill, cursor: "pointer", transition }}
            onClick={e => { e.stopPropagation(); onDotClick(player); }}
            onMouseEnter={e => { setHoveredId(player.id); onDotHover(player, e.clientX, e.clientY); }}
            onMouseLeave={() => { setHoveredId(null); onDotLeave(); }}
          />
        );
      })}
    </g>
  );
}
