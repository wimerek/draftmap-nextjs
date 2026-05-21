"use client";
/**
 * components/chart/TierAxisLabels.tsx
 *
 * Delta-2: Outcome tier labels overlaid on the Y-axis in Results/Production/Career modes.
 *
 * Animation beats (when entering):
 *   Beat 2 — Tier boundary lines draw in left-to-right (bottom-to-top stagger, 55ms each).
 *             Uses stroke-dashoffset CSS transition.
 *   Beat 3 — Tier labels fade in + slide right, chained 350ms after each guideline.
 *
 * Beat 1 (position labels exit) is handled by TierBands receiving labelsHiding=true.
 *
 * Y positions: score threshold 100 → chart top, 0 → chart bottom.
 *   y(threshold) = margin.top + (1 - threshold/100) * totalChartH
 */

import { useEffect, useState } from "react";
import type { ChartLayout } from "@/lib/chartMath";
import { TIER_LABELS } from "@/lib/tierLabels";

interface Props {
  layout: ChartLayout;
  visible: boolean;
  prefersReducedMotion: boolean;
}

function tierY(threshold: number, layout: ChartLayout): number {
  return layout.margin.top + (1 - threshold / 100) * layout.totalChartH;
}

export default function TierAxisLabels({ layout, visible, prefersReducedMotion }: Props) {
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEntering(false);
      return;
    }
    // Wait for Beat 1 (position labels exit) before starting our animation.
    // Beat 1 takes up to (numLabels * 25 + 200) ms. Use 300ms headroom.
    const delay = prefersReducedMotion ? 0 : 300;
    const t = setTimeout(() => setEntering(true), delay);
    return () => clearTimeout(t);
  }, [visible, prefersReducedMotion]);

  if (!visible && !entering) return null;

  const lineW = layout.chartW;
  const lineX = layout.margin.left;
  const DOT_R = 3.5;
  const LABEL_OFFSET_X = 8; // left of chart edge

  return (
    <g>
      {TIER_LABELS.map((tier, i) => {
        // Bottom-to-top stagger: Bust (last) draws first
        const reverseIdx = TIER_LABELS.length - 1 - i;
        const lineDelay  = reverseIdx * 55;
        const labelDelay = lineDelay + 350;

        const y = tierY(tier.threshold, layout);

        const lineTransition = prefersReducedMotion
          ? "none"
          : `stroke-dashoffset 350ms ease-out ${lineDelay}ms`;

        const labelTransition = prefersReducedMotion
          ? "opacity 150ms ease"
          : `opacity 300ms ease-out ${labelDelay}ms, transform 300ms ease-out ${labelDelay}ms`;

        const labelOpacity   = entering ? 1 : 0;
        const labelTranslate = entering ? 0 : -8;

        return (
          <g key={tier.label}>
            {/* Boundary guideline */}
            <line
              x1={lineX} y1={y}
              x2={lineX + lineW} y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
              strokeDasharray={lineW}
              strokeDashoffset={entering ? 0 : lineW}
              style={{ transition: lineTransition }}
            />

            {/* Colored dot marker */}
            <circle
              cx={lineX - LABEL_OFFSET_X - DOT_R - 2}
              cy={y}
              r={DOT_R}
              fill={tier.color}
              style={{
                opacity: labelOpacity,
                transform: `translateX(${labelTranslate}px)`,
                transition: labelTransition,
              }}
            />

            {/* Tier label text */}
            <text
              x={lineX - LABEL_OFFSET_X}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={700}
              fill={tier.color}
              letterSpacing="0.12em"
              style={{
                opacity: labelOpacity,
                transform: `translateX(${labelTranslate}px)`,
                transition: labelTransition,
                textTransform: "uppercase",
              }}
            >
              {tier.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
