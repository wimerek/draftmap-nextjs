"use client";
/**
 * components/chart/TierArrows.tsx
 * Left and right direction arrows showing tier quality gradient.
 * Graphic at 0.7 opacity; text labels at full opacity (separate groups).
 */
import type { ChartLayout } from "@/lib/chartMath";
import { TIER_DEFS } from "@/lib/chartConstants";

interface Props {
  layout: ChartLayout;
}

export default function TierArrows({ layout }: Props) {
  const { tierBandDefs, tierBoundaryYs, margin, chartW, pillX, pillW, totalChartH } = layout;

  const arrowTopY = tierBandDefs[0].y1;
  const arrowBotY = margin.top + totalChartH;
  const segStroke = 2.5;
  const tickHalf  = 5;
  const aHead     = 6;

  const arrows = [
    { x: pillX + pillW + 10, anchor: "end"   as const, dx: -4 },
    { x: margin.left + chartW + 16, anchor: "start" as const, dx:  4 },
  ];

  return (
    <g>
      {arrows.map(({ x, anchor, dx }, ai) => (
        <g key={ai}>
          {/* Tier-colored segments + arrowhead at 0.7 opacity */}
          <g opacity={0.7}>
            {tierBandDefs.map((t, ti) => (
              <line
                key={ti}
                x1={x} y1={t.y1} x2={x} y2={t.y2}
                stroke={t.color} strokeWidth={segStroke} strokeLinecap="round"
              />
            ))}
            {tierBoundaryYs.map((by, bi) => (
              <line
                key={bi}
                x1={x - tickHalf} y1={by} x2={x + tickHalf} y2={by}
                stroke="#8A9BAA" strokeWidth={1.5}
              />
            ))}
            <polygon
              points={`${x},${arrowTopY - aHead} ${x - aHead},${arrowTopY} ${x + aHead},${arrowTopY}`}
              fill={TIER_DEFS[0].color}
              stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} strokeLinejoin="round"
            />
          </g>
          {/* Text labels at full opacity */}
          <text
            x={x + dx} y={arrowTopY - aHead - 5}
            textAnchor={anchor}
            fontSize={9} fontWeight={800}
            fill={TIER_DEFS[0].color}
            stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} paintOrder="stroke fill"
          >
            Top Prospects
          </text>
          <text
            x={x + dx} y={arrowBotY + 12}
            textAnchor={anchor}
            fontSize={9} fontWeight={800}
            fill={TIER_DEFS[3].color}
            stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} paintOrder="stroke fill"
          >
            Lower Prospects
          </text>
        </g>
      ))}
    </g>
  );
}
