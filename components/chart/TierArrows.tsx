"use client";
/**
 * components/chart/TierArrows.tsx
 *
 * Session H: Single quality-gradient arrow on the LEFT margin.
 * Serves as both a visual quality indicator and the chart's left border.
 * Pills remain on the right (unchanged from Session G).
 * Gradient opacity reduced: 0.65 top -> near-transparent at R2 boundary.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

const GOLD      = "#D4A017";
const GOLD_PALE = "rgba(212,160,23,0.18)";

export default function TierArrows({ layout }: Props) {
  const { tierBandDefs, margin, totalChartH } = layout;

  const arrowTopY = tierBandDefs[0].y1;
  // Arrow stops at the pick-256 line; UDFA zone is a separate element.
  const arrowBotY = margin.top + totalChartH;
  const aHead = 6;

  // Single arrow on the LEFT margin, ~16px left of the chart edge.
  // This also serves as the visual left border separating round labels from data.
  const arrowX = margin.left - 16;

  return (
    <g>
      <line
        x1={arrowX} y1={arrowTopY}
        x2={arrowX} y2={arrowBotY}
        stroke="url(#tierPillGradient)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <polygon
        points={`${arrowX},${arrowTopY - aHead} ${arrowX - aHead},${arrowTopY + 2} ${arrowX + aHead},${arrowTopY + 2}`}
        fill={GOLD}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <text
        x={arrowX + 8} y={arrowTopY - aHead - 5}
        textAnchor="start"
        fontSize={9} fontWeight={800}
        fill={GOLD}
        stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} paintOrder="stroke fill"
      >
        Top Prospects
      </text>
      <text
        x={arrowX + 8} y={arrowBotY + 12}
        textAnchor="start"
        fontSize={9} fontWeight={800}
        fill={GOLD_PALE}
        stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} paintOrder="stroke fill"
      >
        Lower Prospects
      </text>
    </g>
  );
}
