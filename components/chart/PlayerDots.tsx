"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Phase Beta: isMobile prop added.
 *   - Mobile: 44×44px invisible touch targets over each dot; tap opens card directly.
 *     No tooltip on mobile. No entrance animation on mobile (isAnimating only fires
 *     during the opening animation sequence).
 *   - showLines / connector on hover: desktop only.
 */
import { useState } from "react";
import type { Player } from "@/lib/sheets";
import type { DotPosition } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";
import { SCHOOL_COLORS, TEAM_COLORS } from "@/lib/chartConstants";

interface Props {
  dotPositions: DotPosition[];
  liveMode: boolean;
  viewMode: ViewMode;
  isAnimating: boolean;
  showLines: boolean;
  isMobile?: boolean;
  isZoomedMobile?: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

const BASE_R = 6;
const TOUCH_TARGET = 22; // half of 44px touch target

function deltaToRadius(delta: number): number {
  return BASE_R + 10 * (1 - Math.exp(-delta / 25));
}

export default function PlayerDots({
  dotPositions, liveMode, viewMode, isAnimating, showLines,
  isMobile = false,
  isZoomedMobile = false,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  const inDraftedView = viewMode === "drafted";
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hoveredDot = !isMobile && inDraftedView && hoveredId
    ? dotPositions.find(d => d.player.player_id === hoveredId) ?? null
    : null;

  return (
    <g>
      {/* ── All-lines mode (desktop only) ─────────────────────────────── */}
      {!isMobile && inDraftedView && !isAnimating && showLines && dotPositions.map(
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

      {/* ── Hover connector (desktop only) ───────────────────────────── */}
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
      {dotPositions.map(({ player, x, projectedY, actualY, pickValueDelta }, i) => {
        const sc = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };
        const isDrafted = liveMode && player.drafted && !inDraftedView;

        let fill: string, stroke: string;
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
        const r  = isMobile ? BASE_R : (inDraftedView ? deltaToRadius(pickValueDelta) : BASE_R);

        // On mobile: no entrance animation (isMobile + not in opening sequence)
        const skipAnim = isMobile && !isAnimating;
        const tDuration = skipAnim ? 0 : (isAnimating ? (prefersReducedMotion ? 100 : 550) : 0);
        const tDelay    = skipAnim ? 0 : (isAnimating ? (prefersReducedMotion ? 0   : i * 22) : 0);
        const transition = tDuration > 0
          ? [`cy ${tDuration}ms ease-out ${tDelay}ms`, `r ${tDuration}ms ease-out ${tDelay}ms`, `fill ${tDuration}ms ease-out ${tDelay}ms`].join(", ")
          : "none";

        const dotStroke      = isMobile ? "#ffffff" : stroke;
        const dotStrokeWidth = isMobile
          ? (isZoomedMobile ? 0.8 : 2.5)
          : (inDraftedView ? 2.5 : 1.5);

        return (
          <g key={`${player.player_id}-${i}`}>
            {/* Visible dot */}
            <circle
              cx={x} cy={cy} r={r}
              stroke={dotStroke}
              strokeWidth={dotStrokeWidth}
              style={{ fill, cursor: "pointer", transition }}
              onClick={isMobile ? undefined : (e => { e.stopPropagation(); onDotClick(player); })}
              onMouseEnter={isMobile ? undefined : (e => { setHoveredId(player.player_id); onDotHover(player, e.clientX, e.clientY); })}
              onMouseLeave={isMobile ? undefined : (() => { setHoveredId(null); onDotLeave(); })}
            />

            {/* 44×44px invisible touch target (mobile only) */}
            {isMobile && (
              <rect
                x={x - TOUCH_TARGET}
                y={cy - TOUCH_TARGET}
                width={TOUCH_TARGET * 2}
                height={TOUCH_TARGET * 2}
                fill="transparent"
                stroke="none"
                style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); onDotClick(player); }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
