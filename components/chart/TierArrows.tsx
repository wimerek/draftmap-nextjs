"use client";
/**
 * components/chart/TierArrows.tsx
 * Direction arrows showing tier quality gradient.
 * Session F: single vertical line using tierPillGradient stroke (continuous gold
 * gradient) instead of per-tier coloured segments. Tick marks removed.
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
  const arrowBotY = margin.top + totalChartH;
  const aHead     = 6;

  const arrows = [
    { x: pillX + pillW + 12, anchor: "end"   as const, dx: -4 },
    { x: margin.left + chartW + 18, anchor: "start" as const, dx:  4 },
  ];

  return (
    <g>
      {arrows.map(({ x, anchor, dx }, ai) => (
        <g key={ai}>
          {/* Continuous gradient line — colour determined by y position in SVG space */}
          <line
            x1={x} y1={arrowTopY}
            x2={x} y2={arrowBotY}
            stroke="url(#tierPillGradient)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Arrowhead at top — sits in the darkest-gold zone */}
          <polygon
            points={`${x},${arrowTopY - aHead} ${x - aHead},${arrowTopY + 2} ${x + aHead},${arrowTopY + 2}`}
            fill={GOLD}
            stroke="rgba(0,0,0,0.25)" strokeWidth={1} strokeLinejoin="round"
          />
          {/* Labels */}
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
