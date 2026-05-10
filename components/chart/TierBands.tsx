"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Session X: Bracket annotation shape.
 *   - Left vertical bar + top cap + bottom cap spanning full label width
 *   - No background fill — bracket frames the label zone
 *   - Text: navy #1A2D42 at 0.60 opacity on near-white chart bg
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
        const labelH   = t.name === "Role Player / Project" ? 36 : 24;
        const tierMidY = (t.y1 + t.y2) / 2;
        const py       = tierMidY - labelH / 2;
        const bx       = pillX;       // left edge of bracket
        const bw       = pillW;       // full label zone width
        const capW     = bw;          // caps span full width

        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role Player", "/ Project"]
            : [t.name];
        const lineH  = 13;
        const totalH = labelLines.length * lineH;
        const startY = py + (labelH - totalH) / 2 + lineH - 2;

        return (
          <g key={i}>
            {/* Tier background fill */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={t.y2 - t.y1}
              fill={t.bg}
            />
            {/* Bracket: left vertical bar */}
            <rect
              x={bx} y={py}
              width={2} height={labelH}
              rx={1}
              fill="#D4A017"
              opacity={0.80}
            />
            {/* Bracket: top cap */}
            <line
              x1={bx} y1={py}
              x2={bx + capW} y2={py}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.55}
            />
            {/* Bracket: bottom cap */}
            <line
              x1={bx} y1={py + labelH}
              x2={bx + capW} y2={py + labelH}
              stroke="#D4A017" strokeWidth={1.5} opacity={0.55}
            />
            {/* Label text */}
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={bx + 8} y={startY + li * lineH}
                textAnchor="start"
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
