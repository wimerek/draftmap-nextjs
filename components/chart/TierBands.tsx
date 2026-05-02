"use client";
/**
 * components/chart/TierBands.tsx
 * Renders the horizontal tier background fills and the pill labels in the left margin.
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
            {/* Tier background fill */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={t.y2 - t.y1}
              fill={t.bg}
            />
            {/* Pill label */}
            <rect
              x={pillX} y={py}
              width={pillW} height={pH}
              rx={8}
              fill={t.color} fillOpacity={0.65}
              stroke={t.color} strokeWidth={1.2}
            />
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={cx} y={startY + li * lineH}
                textAnchor="middle"
                fontSize={10} fontWeight={800}
                fill="#FFFFFF"
                stroke="rgba(0,0,0,0.25)" strokeWidth={0.5}
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
