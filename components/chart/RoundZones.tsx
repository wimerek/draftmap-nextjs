"use client";
/**
 * components/chart/RoundZones.tsx
 *
 * Session E: Round rows replaced by thin horizontal reference lines at round
 * boundaries on the continuous pick-number Y axis. Round labels (R1–R7) sit
 * in the left margin at the midpoint Y of each round's pick range.
 *
 * Session O: Lines made solid (removed dasharray), slightly more visible
 * stroke (#B0A898, width 1.1). Round labels use Oswald for typographic
 * consistency with position headers.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

export default function RoundZones({ layout }: Props) {
  const { roundBoundaryYs, roundLabelYs, margin, chartW } = layout;

  return (
    <g>
      {/* Round reference lines — solid, slightly more visible than before */}
      {roundBoundaryYs.map((ry, i) => (
        <line
          key={`rd-line-${i}`}
          x1={margin.left} y1={ry}
          x2={margin.left + chartW} y2={ry}
          stroke="#B0A898"
          strokeWidth={1.1}
        />
      ))}

      {/* Round labels in left margin, centered in each round's pick range */}
      {([1, 2, 3, 4, 5, 6, 7] as const).map(rd => (
        <text
          key={`rd-label-${rd}`}
          x={margin.left - 10}
          y={roundLabelYs[rd] + 4}
          textAnchor="end"
          fontSize={14}
          fontWeight={700}
          fontFamily="Oswald, sans-serif"
          fill="#5A6E7E"
          letterSpacing={0.5}
        >
          R{rd}
        </text>
      ))}
    </g>
  );
}
