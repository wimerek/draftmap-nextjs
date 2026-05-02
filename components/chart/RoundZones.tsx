"use client";
/**
 * components/chart/RoundZones.tsx
 * Round row labels (R1–R7) and horizontal dividers between round zones.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

export default function RoundZones({ layout }: Props) {
  const { rdY, rdH, margin, chartW } = layout;
  const rounds = [1, 2, 3, 4, 5, 6, 7] as const;

  return (
    <g>
      {rounds.map(rd => {
        const ry = rdY[rd];
        const rh = rdH[rd];
        return (
          <g key={rd}>
            {/* Round label in left margin */}
            <text
              x={margin.left - 8}
              y={ry + rh / 2 + 5}
              textAnchor="end"
              fontSize={12}
              fontWeight={700}
              fill="#4A6274"
            >
              R{rd}
            </text>
            {/* Horizontal divider below row (skip last) */}
            {rd < 7 && (
              <line
                x1={margin.left} y1={ry + rh}
                x2={margin.left + chartW} y2={ry + rh}
                stroke="#C4C0B8" strokeWidth={1}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
