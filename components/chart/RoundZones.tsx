"use client";
/**
 * components/chart/RoundZones.tsx
 *
 * Session E: Round rows replaced by thin horizontal reference lines at round
 * boundaries on the continuous pick-number Y axis. Round labels (R1–R7) sit
 * in the left margin at the midpoint Y of each round's pick range.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

const ROUND_BOUNDARY_ROUNDS = [1, 2, 3, 4, 5, 6] as const; // line after each of these rounds

export default function RoundZones({ layout }: Props) {
  const { roundBoundaryYs, roundLabelYs, margin, chartW } = layout;

  return (
    <g>
      {/* Round reference lines — thin, subtle, at each round boundary */}
      {roundBoundaryYs.map((ry, i) => (
        <line
          key={`rd-line-${i}`}
          x1={margin.left} y1={ry}
          x2={margin.left + chartW} y2={ry}
          stroke="#C8C4BC"
          strokeWidth={0.8}
          strokeDasharray="4,5"
        />
      ))}

      {/* Round labels in left margin, centered in each round's pick range */}
      {([1, 2, 3, 4, 5, 6, 7] as const).map(rd => (
        <text
          key={`rd-label-${rd}`}
          x={margin.left - 10}
          y={roundLabelYs[rd] + 4}
          textAnchor="end"
          fontSize={11}
          fontWeight={700}
          fill="#6A7E8E"
          letterSpacing={0.3}
        >
          R{rd}
        </text>
      ))}
    </g>
  );
}
