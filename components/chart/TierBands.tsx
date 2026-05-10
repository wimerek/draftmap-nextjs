"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Session AA: Caps point inward (left, toward chart data).
 *   - Vertical bar at pillX (chart-adjacent)
 *   - Top/bottom caps extend LEFT into chart area — ticks on an axis
 *   - Text floats right of bar
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
        const barX   = pillX;
        const capLen = 10;   // extends LEFT into chart

        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role", "Player"]
            : [t.name];
        const lineH  = 13;
        const totalH = labelLines.length * lineH;
        const startY = midY - totalH / 2 + lineH - 2;
        const textX  = barX + 8 + (pillW - 8) / 2;

        return (
          <g key={i}>
            {/* Tier background fill */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={tierH}
              fill={t.bg}
            />
            {/* Vertical bar — chart-adjacent */}
            <rect
              x={barX} y={t.y1}
              width={2} height={tierH}
              rx={1}
              fill="#D4A017"
              opacity={0.50}
            />
            {/* Top cap — points LEFT (inward) */}
            <line
              x1={barX + 2} y1={t.y1}
              x2={barX + 2 - capLen} y2={t.y1}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.50}
            />
            {/* Bottom cap — points LEFT (inward) */}
            <line
              x1={barX + 2} y1={t.y2}
              x2={barX + 2 - capLen} y2={t.y2}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.50}
            />
            {/* Label — right of bar */}
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
