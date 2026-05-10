"use client";
/**
 * components/chart/TierArrows.tsx
 *
 * Session I: Arrow repositioned to fixed x=40, clear of round labels.
 * Text labels now sit to the LEFT of the arrow (textAnchor="end").
 * Gradient boosted to 0.88 top opacity for better pop.
 * strokeWidth bumped to 4.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

const GOLD      = "#D4A017";
const GOLD_PALE = "rgba(212,160,23,0.28)";

export default function TierArrows({ layout }: Props) {
  const { tierBandDefs, margin, totalChartH } = layout;

  const arrowTopY = tierBandDefs[0].y1;
  // Arrow stops at the pick-256 line; UDFA zone is a separate element.
  const arrowBotY = margin.top + totalChartH;
  const aHead = 5;

  // Fixed x=40 — sits comfortably left of round labels
  // (round labels end at margin.left - 10 ≈ x=90, arrow is at x=40, gap=50px).
  const arrowX = 40;

  return (
    <g>
      <line
        x1={arrowX} y1={arrowTopY}
        x2={arrowX} y2={arrowBotY}
        stroke="url(#tierPillGradient)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <polygon
        points={`${arrowX},${arrowTopY - aHead} ${arrowX - aHead},${arrowTopY + 2} ${arrowX + aHead},${arrowTopY + 2}`}
        fill={GOLD}
        opacity={0.85}
        stroke="none"
        strokeLinejoin="round"
      />
      {/* "Top Prospects" — two lines, centred over the arrowhead */}
      <text
        x={arrowX} y={arrowTopY - aHead - 14}
        textAnchor="middle"
        fontSize={9} fontWeight={600}
        fill={GOLD}
        opacity={0.80}
      >
        <tspan x={arrowX} dy="0">Top</tspan>
        <tspan x={arrowX} dy="11">Prospects</tspan>
      </text>
      {/* "Lower" label — ends just left of the arrow */}
      <text
        x={arrowX - 10} y={arrowBotY + 13}
        textAnchor="end"
        fontSize={9} fontWeight={800}
        fill={GOLD_PALE}
        stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} paintOrder="stroke fill"
      >
        Lower Prospects
      </text>
    </g>
  );
}
