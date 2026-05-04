"use client";
/**
 * components/chart/TierArrows.tsx
 * Direction arrows showing tier quality gradient.
 * Session G: both arrows moved to right side (pills also moved right).
 * Session F: single gradient stroke line, tick marks removed.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

const GOLD = "#D4A017";
const GOLD_PALE = "rgba(212,160,23,0.35)";

export default function TierArrows({ layout }: Props) {
  const { tierBandDefs, margin, chartW, pillX, pillW, totalChartH } = layout;

  const arrowTopY = tierBandDefs[0].y1;
  // Stop at the pick-256 line — arrows describe ranked tiers only, not UDFA zone.
  const arrowBotY = margin.top + totalChartH;
  const aHead = 6;

  // Both arrows on the RIGHT side (pills moved right in Session G).
  // Arrow 1: between chart edge and pills.  Arrow 2: beyond pills.
  const arrows = [
    { x: margin.left + chartW + 12, anchor: "start" as const, dx: 4 },
    { x: pillX + pillW + 12,        anchor: "start" as const, dx: 4 },
  ];

  return (
    <g>
      {arrows.map(({ x, anchor, dx }, ai) => (
        <g key={ai}>
          <line
            x1={x} y1={arrowTopY}
            x2={x} y2={arrowBotY}
            stroke="url(#tierPillGradient)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <polygon
            points={`${x},${arrowTopY - aHead} ${x - aHead},${arrowTopY + 2} ${x + aHead},${arrowTopY + 2}`}
            fill={GOLD}
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <text
            x={x + dx} y={arrowTopY - aHead - 5}
            textAnchor={anchor}
            fontSize={9} fontWeight={800}
            fill={GOLD}
            stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} paintOrder="stroke fill"
          >
            Top Prospects
          </text>
          <text
            x={x + dx} y={arrowBotY + 12}
            textAnchor={anchor}
            fontSize={9} fontWeight={800}
            fill={GOLD_PALE}
            stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} paintOrder="stroke fill"
          >
            Lower Prospects
          </text>
        </g>
      ))}
    </g>
  );
}
