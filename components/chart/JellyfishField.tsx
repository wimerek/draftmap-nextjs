"use client";
/**
 * components/chart/JellyfishField.tsx
 *
 * Act 3 — the resolved "second contract" jellyfish field (verdict brief b).
 *
 * Pure SVG: every coordinate arrives pre-computed from computeJellyfishLayout
 * (lib/chartMath.ts). This file only paints — no layout math, no D3.
 *
 *   X = draft capital (pick).        Y = √(verdict_share) + floor strips.
 *   Threads (one per dot)  →  the 5 tier wall nodes at the far right.
 *   "Most never get paid" reads as the grey wash-out mass of NONE/PROVE-IT threads.
 *
 * Y-scale is a swappable strategy upstream (resolved = verdict-share); brief c
 * plugs in a usage-percentile strategy without touching this component.
 */

import type { Player } from "@/lib/sheets";
import type { JellyfishLayout } from "@/lib/chartMath";
import { resolveTeamColors } from "@/lib/chartConstants";
import {
  DOT_R, LINE_GOLD, GRAB_RING_OPACITY, GRAB_RING_W,
  THREAD_OPACITY_MIN, THREAD_OPACITY_MAX, THREAD_W,
  DATA_GAP_FILL, DATA_GAP_STROKE, WALL_TIER_ORDER, TIER_THREAD_COLOR,
  WALL_LABEL_DX,
} from "@/lib/act3Constants";

const PARCHMENT = "#F5F0E8";
const NAVY = "#0B2239";

interface JellyfishFieldProps {
  layout: JellyfishLayout;
  isMobile: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

export default function JellyfishField({
  layout, isMobile, onDotClick, onDotHover, onDotLeave,
}: JellyfishFieldProps) {
  const { svgW, svgH, margin, wallX, wallNodeW, dots, wallNodes, bandTop, bandH } = layout;

  return (
    <svg
      width={isMobile ? "100%" : svgW}
      height={isMobile ? undefined : svgH}
      viewBox={isMobile ? `0 0 ${svgW} ${svgH}` : undefined}
      style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
    >
      <defs>
        {/* Per-tier thread opacity gradient: faint at the dot, firmer toward the wall. */}
        {WALL_TIER_ORDER.map((tier) => (
          <linearGradient
            key={`tg-${tier}`}
            id={`jf-thread-${tier}`}
            gradientUnits="userSpaceOnUse"
            x1={margin.left} y1={0} x2={wallX} y2={0}
          >
            <stop offset="0%"   stopColor={TIER_THREAD_COLOR[tier]} stopOpacity={THREAD_OPACITY_MIN} />
            <stop offset="100%" stopColor={TIER_THREAD_COLOR[tier]} stopOpacity={THREAD_OPACITY_MAX} />
          </linearGradient>
        ))}
        {/* Grab ring: object-bbox gradient so it flares toward the wall (right) per-dot. */}
        <linearGradient id="jf-grab-ring" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%"   stopColor={LINE_GOLD} stopOpacity={0} />
          <stop offset="70%"  stopColor={LINE_GOLD} stopOpacity={GRAB_RING_OPACITY * 0.4} />
          <stop offset="100%" stopColor={LINE_GOLD} stopOpacity={GRAB_RING_OPACITY} />
        </linearGradient>
      </defs>

      {/* Background — parchment (navy is chrome only). */}
      <rect x={0} y={0} width={svgW} height={svgH} fill={PARCHMENT} />

      {/* Floor-strip baselines + labels. */}
      <g aria-hidden="true">
        <line
          x1={margin.left} y1={layout.proveItStripY} x2={wallX} y2={layout.proveItStripY}
          stroke={TIER_THREAD_COLOR.PROVE_IT} strokeWidth={1} strokeDasharray="2 4" opacity={0.35}
        />
        <line
          x1={margin.left} y1={layout.noneStripY} x2={wallX} y2={layout.noneStripY}
          stroke={TIER_THREAD_COLOR.NONE} strokeWidth={1} strokeDasharray="2 4" opacity={0.35}
        />
        <text x={margin.left} y={layout.proveItStripY - 6} fontSize={10} fill="#6B7280" letterSpacing={0.5}>
          PROVE IT
        </text>
        <text x={margin.left} y={layout.noneStripY - 6} fontSize={10} fill="#6B7280" letterSpacing={0.5}>
          NEVER PAID AGAIN
        </text>
      </g>

      {/* Threads (behind dots). Every dot threads — grey NONE/PROVE-IT included. */}
      <g fill="none">
        {dots.map((d) =>
          d.threadPath && d.tier ? (
            <path
              key={`th-${d.player.player_id}`}
              d={d.threadPath}
              stroke={`url(#jf-thread-${d.tier})`}
              strokeWidth={THREAD_W}
            />
          ) : null,
        )}
      </g>

      {/* Tier wall. */}
      <g>
        {wallNodes.map((n) => (
          <g key={`wall-${n.tier}`}>
            <rect x={n.x} y={n.y} width={wallNodeW} height={n.h} fill={n.color} rx={2} />
            <text
              x={n.x + wallNodeW + WALL_LABEL_DX}
              y={n.cy - 4}
              fontSize={11}
              fontWeight={700}
              fill={NAVY}
            >
              {n.label}
            </text>
            <text
              x={n.x + wallNodeW + WALL_LABEL_DX}
              y={n.cy + 10}
              fontSize={10}
              fill="#6B7280"
            >
              {n.count} · {n.pct}%
            </text>
          </g>
        ))}
      </g>

      {/* Dots + grab rings (front). */}
      <g>
        {dots.map((d) => {
          const p = d.player;
          if (d.isDataGap) {
            return (
              <circle
                key={`dot-${p.player_id}`}
                cx={d.x} cy={d.y} r={DOT_R}
                fill={DATA_GAP_FILL}
                stroke={DATA_GAP_STROKE}
                strokeWidth={1}
                strokeDasharray="1.5 1.5"
                style={{ cursor: "pointer" }}
                onMouseEnter={isMobile ? undefined : (e) => onDotHover(p, e.clientX, e.clientY)}
                onMouseLeave={isMobile ? undefined : onDotLeave}
                onClick={() => onDotClick(p)}
              >
                <title>{p.name} — data gap (no contract row)</title>
              </circle>
            );
          }
          const teamColors = resolveTeamColors(p.team_drafted);
          return (
            <g key={`dot-${p.player_id}`} style={{ cursor: "pointer" }}>
              {/* Grab ring — flares toward the thread (wall) side. */}
              <circle
                cx={d.x} cy={d.y} r={DOT_R + 2.2}
                fill="none"
                stroke="url(#jf-grab-ring)"
                strokeWidth={GRAB_RING_W}
                pointerEvents="none"
              />
              <circle
                cx={d.x} cy={d.y} r={DOT_R}
                fill={teamColors.primary}
                stroke={NAVY}
                strokeWidth={1}
                onMouseEnter={isMobile ? undefined : (e) => onDotHover(p, e.clientX, e.clientY)}
                onMouseLeave={isMobile ? undefined : onDotLeave}
                onClick={() => onDotClick(p)}
              />
            </g>
          );
        })}
      </g>

      {/* Field title (left). */}
      <text x={margin.left} y={bandTop - 28} fontSize={13} fontWeight={700} fill={NAVY} letterSpacing={1}>
        THE SECOND CONTRACT
      </text>
      <text x={margin.left} y={bandTop - 12} fontSize={11} fill="#6B7280">
        Where the league&apos;s money landed — {layout.fieldCount} players
      </text>

      {/* Capital axis hint. */}
      <text x={margin.left} y={bandTop + bandH + 34} fontSize={10} fill="#6B7280">
        ← earlier pick (more draft capital)
      </text>
      <text x={wallX - 120} y={bandTop + bandH + 34} fontSize={10} fill="#6B7280">
        later · undrafted →
      </text>
    </svg>
  );
}
