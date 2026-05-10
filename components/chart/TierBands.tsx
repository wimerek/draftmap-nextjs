"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Session W: Compact fixed-height annotation label.
 *   - No pill background — tier tints do the spatial work
 *   - 3px gold left accent bar, fixed 28px height, centered in tier
 *   - Text: navy #1A2D42 at 0.60 opacity — readable on near-white chart bg
 *   - Label is same size regardless of tier band height
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
        // Fixed label height — never scales with tier band
        const labelH   = t.name === "Role Player / Project" ? 36 : 24;
        const tierMidY = (t.y1 + t.y2) / 2;
        const py       = tierMidY - labelH / 2;

        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role Player", "/ Project"]
            : [t.name];
        const lineH  = 13;
        const totalH = labelLines.length * lineH;
        const startY = py + (labelH - totalH) / 2 + lineH - 2;

        return (
          <g key={i}>
            {/* Tier background fill — subtle tint, does the spatial work */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={t.y2 - t.y1}
              fill={t.bg}
            />
            {/* Gold left accent bar — fixed height, centered in tier */}
            <rect
              x={pillX} y={py}
              width={3} height={labelH}
              rx={1.5}
              fill="#D4A017"
              opacity={0.80}
            />
            {/* Label text — navy on near-white, no background needed */}
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={pillX + 9} y={startY + li * lineH}
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
