"use client";
/**
 * components/chart/UDFAZone.tsx
 *
 * Session G: Band below pick-256 where undrafted players animate in Drafted view.
 * Visual treatment: lighter cream fill, dashed top border, "UDFA" label with
 * a tooltip on hover ("Undrafted Free Agent").
 */
import { useState } from "react";
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
  visible: boolean;  // only show in Drafted view
}

export default function UDFAZone({ layout, visible }: Props) {
  const [hover, setHover] = useState(false);
  const { margin, chartW, udfaZoneY, udfaZoneH } = layout;

  if (!visible) return null;

  const bandX = margin.left;
  const bandW = chartW;
  const labelX = bandX + 12;
  const labelY = udfaZoneY + udfaZoneH / 2 + 4;

  return (
    <g
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Background fill */}
      <rect
        x={bandX} y={udfaZoneY}
        width={bandW} height={udfaZoneH}
        fill="rgba(180,170,155,0.10)"
      />
      {/* Dashed top border — separates draft territory from UDFA territory */}
      <line
        x1={bandX} y1={udfaZoneY}
        x2={bandX + bandW} y2={udfaZoneY}
        stroke="#B0A898"
        strokeWidth={1}
        strokeDasharray="6,5"
      />
      {/* "UDFA" label */}
      <text
        x={labelX} y={labelY}
        fontSize={10} fontWeight={700}
        fill="#8A7F74"
        letterSpacing={1.5}
        textAnchor="start"
      >
        UDFA
      </text>
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
            Undrafted Free Agent
          </text>
        </g>
      )}
    </g>
  );
}
