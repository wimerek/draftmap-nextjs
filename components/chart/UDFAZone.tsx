"use client";
/**
 * components/chart/UDFAZone.tsx
 *
 * Session H: UDFA zone now always visible (not just in Drafted view).
 * - In Projected view: subtle/faded treatment so unranked players have a home.
 * - In Drafted view: full opacity — undrafted players land here.
 * Props: visible prop removed; always renders. Opacity driven by viewMode.
 */
import { useState } from "react";
import type { ChartLayout } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";
import type { ChartMode } from "@/lib/dataAvailability";

interface Props {
  layout: ChartLayout;
  viewMode: ViewMode;
  chartMode?: ChartMode;
  isZoomedMobile?: boolean;
  viewBoxX?: number;
  viewBoxW?: number;
  washedOutStat?: { count: number; pct: number } | null;
}

export default function UDFAZone({ layout, viewMode, chartMode, isZoomedMobile = false, viewBoxX, viewBoxW, washedOutStat }: Props) {
  const [hover, setHover] = useState(false);
  const { margin, chartW, udfaZoneY, udfaZoneH } = layout;

  const isProductionMode = chartMode === 'player-production' || chartMode === 'career';
  const zoneLabel = isProductionMode ? 'WASHED OUT' : 'UDFA';

  if (isZoomedMobile) {
    const cx = viewBoxX !== undefined && viewBoxW !== undefined
      ? viewBoxX + viewBoxW / 2
      : margin.left + chartW / 2;
    return (
      <g pointerEvents="none">
        <text
          x={cx}
          y={udfaZoneY + udfaZoneH / 2 + 4}
          fontSize={10}
          fontWeight={700}
          fontFamily="Oswald, sans-serif"
          fill="#64748b"
          letterSpacing={1.5}
          textAnchor="middle"
        >
          {zoneLabel}
        </text>
      </g>
    );
  }

  // Fade the zone in Projected view; full opacity in Drafted view.
  const opacity = viewMode === "drafted" ? 1 : 0.45;

  const bandX  = margin.left;
  const bandW  = chartW;
  const labelX = bandX + 12;
  const labelY = udfaZoneY + udfaZoneH / 2 + 4;

  return (
    <g
      style={{ opacity, transition: "opacity 400ms ease" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Background fill — darker, solid in production mode */}
      <rect
        x={bandX} y={udfaZoneY}
        width={bandW} height={udfaZoneH}
        fill={isProductionMode ? 'rgba(51,65,85,0.15)' : 'rgba(180,170,155,0.10)'}
      />
      {/* Top separator — solid in production mode, dashed elsewhere */}
      <line
        x1={bandX} y1={udfaZoneY}
        x2={bandX + bandW} y2={udfaZoneY}
        stroke={isProductionMode ? '#334155' : '#B0A898'}
        strokeWidth={isProductionMode ? 1.5 : 1}
        strokeDasharray={isProductionMode ? undefined : '6,5'}
      />
      {/* Zone label */}
      <text
        x={labelX} y={labelY}
        fontSize={10} fontWeight={700}
        fill={isProductionMode ? '#334155' : '#8A7F74'}
        letterSpacing={1.5}
        textAnchor="start"
      >
        {zoneLabel}
      </text>
      {/* Zone stat (production mode only) */}
      {isProductionMode && washedOutStat && (
        <text
          x={labelX} y={labelY + 14}
          fontSize={9} fontWeight={400}
          fill="#334155" opacity={0.75}
          letterSpacing={1.2}
          textAnchor="start"
        >
          {washedOutStat.pct}% · {washedOutStat.count} players
        </text>
      )}
      {/* Hover tooltip */}
      {hover && (
        <g>
          <rect
            x={labelX} y={udfaZoneY + 4}
            width={148} height={20}
            rx={4}
            fill="#2D2926"
            opacity={0.88}
          />
          <text
            x={labelX + 8} y={udfaZoneY + 18}
            fontSize={10} fill="#F5F0E8"
          >
            {isProductionMode ? 'No longer in the league' : 'Undrafted Free Agent'}
          </text>
        </g>
      )}
    </g>
  );
}
