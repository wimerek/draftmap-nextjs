"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Session V: Gold pill + navy text (was no-fill annotation).
 *   - Pill background: gold #D4A017 at 0.92 opacity
 *   - Text: navy #0B2239, bold — inverts sidebar navy/gold for contrast
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
        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role Player", "/ Project"]
            : [t.name];
        const lineH   = 13;
        const totalH  = labelLines.length * lineH;
        const startY  = py + (pH - totalH) / 2 + lineH - 3;

        return (
          <g key={i}>
            {/* Tier background fill — subtle tint */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={t.y2 - t.y1}
              fill={t.bg}
            />
            {/* Gold pill */}
            <rect
              x={pillX} y={py}
              width={pillW} height={pH}
              rx={4}
              fill="#D4A017"
              opacity={0.92}
            />
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={pillX + pillW / 2} y={startY + li * lineH}
                textAnchor="middle"
                fontSize={10} fontWeight={700}
                fill="#0B2239"
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
