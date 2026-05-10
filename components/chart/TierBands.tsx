"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Session Y: True ] bracket annotation.
 *   - Right vertical bar spanning full tier height
 *   - Short top/bottom caps extending left from the bar
 *   - Label text centered inside the bracket zone
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
        const barX   = pillX + pillW - 2;   // right vertical bar x
        const capLen = 14;                  // cap extends 14px left from bar

        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role", "Player"]
            : [t.name];
        const lineH  = 13;
        const totalH = labelLines.length * lineH;
        const startY = midY - totalH / 2 + lineH - 2;

        return (
          <g key={i}>
            {/* Tier background fill */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={tierH}
              fill={t.bg}
            />

            {/* ] bracket: right vertical bar — full tier height */}
            <rect
              x={barX} y={t.y1}
              width={2} height={tierH}
              rx={1}
              fill="#D4A017"
              opacity={0.50}
            />
            {/* ] bracket: top cap */}
            <line
              x1={barX + 2} y1={t.y1}
              x2={barX + 2 - capLen} y2={t.y1}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.50}
            />
            {/* ] bracket: bottom cap */}
            <line
              x1={barX + 2} y1={t.y2}
              x2={barX + 2 - capLen} y2={t.y2}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.50}
            />

            {/* Label — centered inside bracket zone */}
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={pillX + (pillW - 6) / 2}
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
