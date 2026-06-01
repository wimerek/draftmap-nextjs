"use client";
/**
 * components/chart/TierAxisLabels.tsx
 *
 * Delta-3: 5-tier field zone system.
 *   - Zone fills (5% opacity per tier band)
 *   - Vertical gradient overlay (gold top, red bottom, 8% max opacity)
 *   - Hash mark guides at tier boundaries (dashed, 23% white, bottom-to-top stagger)
 *   - Tier labels centered inside each band (no bullet dot)
 *   - End zone axis indicator (top-right, production/career modes)
 *
 * Animation trigger: fires at Year 1 (player-production), NOT Draft Results.
 * Beat 1 — position labels exit (handled by TierBands labelsHiding prop).
 * Beat 2 — hash marks fade in bottom-to-top (55ms stagger, Bust boundary first).
 * Beat 3 — tier labels fade in + slide right (350ms after their hash mark).
 * Beat 4 — zone fills and gradient overlay fade in (400ms ease).
 *
 * Y mapping: score 100 → chart top, score 0 → chart bottom.
 */

import { useEffect, useState } from "react";
import type { ChartLayout } from "@/lib/chartMath";
import type { ChartMode, JourneyStep } from "@/lib/dataAvailability";
import { TIERS } from "@/lib/tierLabels";

interface ZoneStat { count: number; pct: number }
interface ZoneStats { starter?: ZoneStat; role?: ZoneStat; fringe?: ZoneStat }

interface Props {
  layout: ChartLayout;
  visible: boolean;
  prefersReducedMotion: boolean;
  isMobile?: boolean;
  draftYear?: number;
  currentStep?: Pick<JourneyStep, 'mode' | 'season'> | null;
  zoneStats?: ZoneStats | null;
}

function scoreToY(score: number, layout: ChartLayout): number {
  return layout.margin.top + (1 - score / 100) * layout.totalChartH;
}

// Boundaries at the minScore of each tier except BUST (which goes to 0)
// sorted high-to-low: [75, 55, 35, 12]
const TIER_BOUNDARY_SCORES = TIERS.slice(0, -1).map(t => t.minScore);

export default function TierAxisLabels({
  layout,
  visible,
  prefersReducedMotion,
  isMobile = false,
  draftYear,
  currentStep,
  zoneStats,
}: Props) {
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEntering(false);
      return;
    }
    const delay = prefersReducedMotion ? 0 : 300;
    const t = setTimeout(() => setEntering(true), delay);
    return () => clearTimeout(t);
  }, [visible, prefersReducedMotion]);

  if (!visible && !entering) return null;

  const { margin, chartW, totalChartH } = layout;
  const lineX       = margin.left;
  const fontSize    = isMobile ? 10 : 13;

  // Band coordinates for each tier
  const bands = TIERS.map((tier, i) => {
    const topScore    = i === 0 ? 100 : TIERS[i - 1].minScore;
    const bottomScore = tier.minScore;
    const topY        = scoreToY(topScore, layout);
    const bottomY     = scoreToY(bottomScore, layout);
    return { tier, topY, bottomY, centerY: (topY + bottomY) / 2 };
  });

  // Axis indicator text
  let axisText = '';
  if (currentStep?.mode === 'career') {
    axisText = `CAREER PRODUCTION SCORE · ${draftYear ?? ''} CLASS`;
  } else if (currentStep?.mode === 'player-production' && currentStep.season && draftYear) {
    const yearNum = currentStep.season - draftYear + 1;
    axisText = `PRODUCTION SCORE · ${draftYear} CLASS · YEAR ${yearNum}`;
  }

  // Delay for the last-appearing label (used by gradient and axis indicator)
  const lastLabelDelay = (TIERS.length - 1) * 55 + 350;

  return (
    <g>
      {/* Vertical gradient overlay — warm gold at top, cool red at bottom */}
      <defs>
        <linearGradient id="zone-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.12} />
          <stop offset="40%"  stopColor="#f59e0b" stopOpacity={0} />
          <stop offset="60%"  stopColor="#f87171" stopOpacity={0} />
          <stop offset="100%" stopColor="#f87171" stopOpacity={0.12} />
        </linearGradient>
      </defs>

      {/* ── Zone fills (one per tier band) ─────────────────────────────── */}
      {bands.map(({ tier, topY, bottomY }) => (
        <rect
          key={`zone-${tier.id}`}
          x={lineX} y={topY}
          width={chartW} height={bottomY - topY}
          fill={tier.fillColor}
          opacity={entering ? tier.fillOpacity : 0}
          style={{
            transition: prefersReducedMotion ? "none" : "opacity 400ms ease 350ms",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ── Gradient overlay (sits above zone fills) ───────────────────── */}
      <rect
        x={lineX} y={margin.top}
        width={chartW} height={totalChartH}
        fill="url(#zone-gradient)"
        opacity={entering ? 1 : 0}
        style={{
          transition: prefersReducedMotion ? "none" : "opacity 400ms ease 350ms",
          pointerEvents: "none",
        }}
      />

      {/* ── Hash marks at tier boundaries (bottom-to-top stagger) ─────── */}
      {TIER_BOUNDARY_SCORES.map((score, i) => {
        const y = scoreToY(score, layout);
        // reverseIdx: lowest score (score=12, i=3) → reverseIdx=0 → draws first (bottom)
        const reverseIdx = TIER_BOUNDARY_SCORES.length - 1 - i;
        const lineDelay  = reverseIdx * 55;
        return (
          <line
            key={`hash-${score}`}
            x1={lineX} y1={y}
            x2={lineX + chartW} y2={y}
            stroke="rgba(255,255,255,0.23)"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={entering ? 1 : 0}
            style={{
              transition: prefersReducedMotion
                ? "none"
                : `opacity 280ms ease-out ${lineDelay}ms`,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* ── Zone labels in the left margin (swatch + name + stat) ─────── */}
      {bands.map(({ tier, centerY }, i) => {
        const reverseIdx  = TIERS.length - 1 - i;
        const lineDelay   = reverseIdx * 55;
        const labelDelay  = lineDelay + 350;
        const stat = zoneStats?.[tier.id as keyof ZoneStats];
        return (
          <g
            key={tier.id}
            style={{
              opacity: entering ? 1 : 0,
              transform: `translateX(${entering ? 0 : -8}px)`,
              transition: prefersReducedMotion
                ? "opacity 150ms ease"
                : `opacity 300ms ease-out ${labelDelay}ms, transform 300ms ease-out ${labelDelay}ms`,
            }}
          >
            {/* Colored swatch */}
            <rect
              x={12} y={centerY - 4}
              width={8} height={8}
              fill={tier.color}
              rx={1}
            />
            {/* Zone name */}
            <text
              x={24}
              y={centerY + (stat ? -9 : 0)}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={fontSize}
              fontWeight={700}
              fill={tier.color}
              letterSpacing="0.12em"
              style={{ textTransform: "uppercase" }}
            >
              {tier.label}
            </text>
            {/* Zone stat — only when stats provided */}
            {stat && (
              <text
                x={24}
                y={centerY + 6}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={400}
                fill={tier.color}
                style={{ opacity: 0.65 }}
              >
                {stat.pct}% · {stat.count} players
              </text>
            )}
          </g>
        );
      })}

      {/* ── End zone axis indicator ───────────────────────────────────── */}
      {axisText && (
        <text
          x={lineX + chartW}
          y={margin.top + 10}
          textAnchor="end"
          fontSize={9}
          fontWeight={400}
          fill="rgba(245,158,11,0.5)"
          letterSpacing="0.10em"
          style={{
            opacity: entering ? 1 : 0,
            textTransform: "uppercase",
            transition: prefersReducedMotion
              ? "none"
              : `opacity 300ms ease-out ${lastLabelDelay}ms`,
            pointerEvents: "none",
          }}
        >
          {axisText}
        </text>
      )}
    </g>
  );
}
