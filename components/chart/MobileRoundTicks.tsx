"use client";
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
  viewBoxX: number;
  viewBoxW: number;
}

export default function MobileRoundTicks({ layout, viewBoxX, viewBoxW }: Props) {
  const { pickToY, roundBoundaryYs } = layout;

  // Scale tick lengths and font size to read correctly on a 390px mobile screen.
  const scale = viewBoxW / 390;
  const majorLen   = Math.round(8  * scale * 10) / 10;
  const minorLen   = Math.round(4  * scale * 10) / 10;
  const fontSize   = Math.round(10 * scale * 10) / 10;
  const strokeW    = Math.round(1  * scale * 10) / 10;
  const labelGap   = Math.round(3  * scale * 10) / 10;

  const mutedColor = "rgba(11,34,57,0.55)";

  // 7 major ticks: R1 at top of chart, R2–R7 at round boundaries.
  const majorTicks = [
    { y: pickToY(1),            label: "R1" },
    { y: roundBoundaryYs[0],    label: "R2" },
    { y: roundBoundaryYs[1],    label: "R3" },
    { y: roundBoundaryYs[2],    label: "R4" },
    { y: roundBoundaryYs[3],    label: "R5" },
    { y: roundBoundaryYs[4],    label: "R6" },
    { y: roundBoundaryYs[5],    label: "R7" },
  ];

  // 18 minor ticks: 3 evenly spaced between each pair of adjacent major ticks.
  const minorTicks: number[] = [];
  for (let i = 0; i < majorTicks.length - 1; i++) {
    const y1 = majorTicks[i].y;
    const y2 = majorTicks[i + 1].y;
    for (let q = 1; q <= 3; q++) {
      minorTicks.push(y1 + (y2 - y1) * (q / 4));
    }
  }

  return (
    <g pointerEvents="none">
      {/* Minor ticks */}
      {minorTicks.map((y, i) => (
        <line
          key={`mt-${i}`}
          x1={viewBoxX} y1={y}
          x2={viewBoxX + minorLen} y2={y}
          stroke={mutedColor}
          strokeWidth={strokeW}
          opacity={0.40}
        />
      ))}

      {/* Major ticks + labels */}
      {majorTicks.map(({ y, label }) => (
        <g key={label}>
          <line
            x1={viewBoxX} y1={y}
            x2={viewBoxX + majorLen} y2={y}
            stroke={mutedColor}
            strokeWidth={strokeW}
          />
          <text
            x={viewBoxX + majorLen + labelGap}
            y={y + fontSize * 0.35}
            fontSize={fontSize}
            fontWeight={700}
            fontFamily="Oswald, sans-serif"
            fill={mutedColor}
            textAnchor="start"
          >
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}
