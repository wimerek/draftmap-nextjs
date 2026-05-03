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
            {/* Pill — filled by the continuous gold gradient defined in <defs> */}
            <rect
              x={pillX} y={py}
              width={pillW} height={pH}
              rx={8}
              fill="url(#tierPillGradient)"
              stroke="rgba(212,160,23,0.30)" strokeWidth={1}
            />
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={cx} y={startY + li * lineH}
                textAnchor="middle"
                fontSize={10} fontWeight={800}
                fill="#FFFFFF"
                stroke="rgba(0,0,0,0.30)" strokeWidth={0.5}
                paintOrder="stroke fill"
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
