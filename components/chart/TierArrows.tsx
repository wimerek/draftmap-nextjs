"use client";
/**
 * components/chart/TierArrows.tsx
 *
 * Session X: "Top Prospects" text removed — tier labels carry the meaning.
 *   Arrow line + arrowhead remain as a clean directional axis anchor.
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
    </g>
  );
}
