"use client";
/**
 * components/chart/MobileDayTicks.tsx
 *
 * Act 1 Resolution §1.4 (2026-08-04) — was MobileRoundTicks. The desktop field no
 * longer has R1–R7 furniture to mirror, so the zoomed-mobile rail carries the three
 * DAY labels instead. (Mobile mode is currently disabled — phones get the desktop
 * build — so this renders nowhere today; it is kept compiling and correct so the
 * mobile path doesn't come back carrying dead round vocabulary.)
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
  viewBoxX: number;
  viewBoxW: number;
}

export default function MobileDayTicks({ layout, viewBoxX, viewBoxW }: Props) {
  const { dayLabelYs } = layout;

  const scale    = viewBoxW / 390;
  const fontSize = Math.round(12 * scale * 10) / 10;

  const mutedColor = "#94a3b8";

  const labels = [1, 2, 3].map(day => ({
    day,
    y: dayLabelYs[day],
    label: `DAY ${day}`,
  }));

  return (
    <g pointerEvents="none">
      {labels.map(({ day, y, label }) => (
        <text
          key={day}
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
