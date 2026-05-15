"use client";
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
  viewBoxX: number;
  viewBoxW: number;
}

export default function MobileRoundTicks({ layout, viewBoxX, viewBoxW }: Props) {
  const { roundLabelYs } = layout;

  const scale    = viewBoxW / 390;
  const fontSize = Math.round(12 * scale * 10) / 10;

  const mutedColor = "#94a3b8";

  const labels = [1, 2, 3, 4, 5, 6, 7].map(rd => ({
    rd,
    y: roundLabelYs[rd],
    label: `R${rd}`,
  }));

  return (
    <g pointerEvents="none">
      {labels.map(({ rd, y, label }) => (
        <text
          key={rd}
          x={viewBoxX + Math.round(4 * scale * 10) / 10}
          y={y + fontSize * 0.35}
          fontSize={fontSize}
          fontWeight={700}
          fontFamily="Oswald, sans-serif"
          fill={mutedColor}
          textAnchor="start"
        >
          {label}
        </text>
      ))}
    </g>
  );
}
