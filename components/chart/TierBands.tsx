"use client";
/**
 * components/chart/TierBands.tsx
 * Renders the horizontal tier background fills and the pill labels in the left margin.
 * Pills use the shared tierPillGradient defined in DraftChart.tsx <defs>.
 * Tier band background tints are retained for interior spatial cues.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
}

export default function TierBands({ layout }: Props) {
  const { tierBandDefs, chartW, margin, pillX, pillW } = layout;

  return (
    <g>
      {tierBandDefs.map((t, i) => {
        const pH  = Math.max(28, (t.y2 - t.y1) - 8);
        const py  = t.y1 + 4;
        const cx  = pillX + pillW / 2;
        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role Player", "or", "Project"]
            : [t.name];
        const lineH   = 12;
        const totalH  = labelLines.length * lineH;
        const startY  = py + (pH - totalH) / 2 + lineH - 2;

        return (
          <g key={i}>
            {/* Tier background fill — subtle tint, retained for spatial cuing */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={t.y2 - t.y1}
              fill={t.bg}
            />
            {/* Gold left accent bar — 3px, no background */}
            <rect
              x={pillX} y={py}
              width={3} height={pH}
              rx={1.5}
              fill="#D4A017"
              opacity={0.75}
            />
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={pillX + 9} y={startY + li * lineH}
                textAnchor="start"
                fontSize={10} fontWeight={700}
                fill="rgba(245,240,232,0.65)"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}
