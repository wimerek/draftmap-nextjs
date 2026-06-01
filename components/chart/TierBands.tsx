"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Renders only the subtle tier background fill rects behind the chart area.
 * The right-margin gold bar / "Great/Good/Solid" labels and the R1–R7 round
 * legend were removed in Epsilon 2 — the zone system (TierAxisLabels) now owns
 * outcome labeling, and round context lives in RoundZones.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
  labelsHiding?: boolean;
  prefersReducedMotion?: boolean;
}

export default function TierBands({ layout }: Props) {
  const { tierBandDefs, chartW, margin } = layout;

  return (
    <g>
      {tierBandDefs.map((t, i) => (
        <rect
          key={i}
          x={margin.left} y={t.y1}
          width={chartW} height={t.y2 - t.y1}
          fill={t.bg}
        />
      ))}
    </g>
  );
}
