"use client";
/**
 * components/chart/TierArrows.tsx
 *
 * Session V: "Top Prospects" rotated to vertical axis label (bottom-to-top).
 *   - Text centered along the arrow's Y span, 14px left of arrow line
 *   - Reads as a proper axis label, not a decorative callout
 *   - "Lower Prospects" removed (arrow direction is self-explanatory)
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

const GOLD = "#D4A017";

export default function TierArrows({ layout }: Props) {
  const { tierBandDefs, margin, totalChartH } = layout;

  const arrowTopY = tierBandDefs[0].y1;
  const arrowBotY = margin.top + totalChartH;
  const aHead = 5;
  const arrowX = 40;

  // Center the vertical label along the full arrow span
  const midY = (arrowTopY + arrowBotY) / 2;

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
      {/* "Top Prospects" — vertical axis label, centered along arrow */}
      <text
        transform={`translate(${arrowX - 14}, ${midY}) rotate(-90)`}
        textAnchor="middle"
        fontSize={9} fontWeight={600}
        fill={GOLD}
        opacity={0.80}
        letterSpacing={0.8}
      >
        Top Prospects
      </text>
    </g>
  );
}
