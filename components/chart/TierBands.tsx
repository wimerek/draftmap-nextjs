"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Session Z: [ bracket on LEFT side of label (chart-adjacent).
 *   - Vertical bar at pillX (right edge of chart data)
 *   - Caps extend RIGHT from bar into label zone
 *   - Text floats right of bracket, centered in remaining space
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
        const tierH  = t.y2 - t.y1;
        const midY   = (t.y1 + t.y2) / 2;
        const barX   = pillX;          // left edge — adjacent to chart
        const capLen = 12;             // caps extend right into label zone

        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role", "Player"]
            : [t.name];
        const lineH  = 13;
        const totalH = labelLines.length * lineH;
        const startY = midY - totalH / 2 + lineH - 2;

        // Text starts after the cap, centered in remaining space
        const textX = barX + capLen + (pillW - capLen) / 2;

        return (
          <g key={i}>
            {/* Tier background fill */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={tierH}
              fill={t.bg}
            />

            {/* [ bracket: left vertical bar — full tier height */}
            <rect
              x={barX} y={t.y1}
              width={2} height={tierH}
              rx={1}
              fill="#D4A017"
              opacity={0.50}
            />
            {/* [ bracket: top cap — extends right */}
            <line
              x1={barX} y1={t.y1}
              x2={barX + capLen} y2={t.y1}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.50}
            />
            {/* [ bracket: bottom cap — extends right */}
            <line
              x1={barX} y1={t.y2}
              x2={barX + capLen} y2={t.y2}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.50}
            />

            {/* Label — right of bracket, centered vertically */}
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={textX}
                y={startY + li * lineH}
                textAnchor="middle"
                fontSize={10} fontWeight={700}
                fill="#1A2D42"
                opacity={0.60}
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
