"use client";
/**
 * components/chart/TierBands.tsx
 *
 * Session AA: Caps point inward (left, toward chart data).
 *   - Vertical bar at pillX (chart-adjacent)
 *   - Top/bottom caps extend LEFT into chart area — ticks on an axis
 *   - Text floats right of bar
 *
 * Delta-2: labelsHiding prop — when true, labels animate out (opacity + translateX)
 *   to make room for the TierAxisLabels outcome tier system.
 */
import type { ChartLayout } from "@/lib/chartMath";

interface Props {
  layout: ChartLayout;
  labelsHiding?: boolean;
  prefersReducedMotion?: boolean;
}

export default function TierBands({
  layout,
  labelsHiding = false,
  prefersReducedMotion = false,
}: Props) {
  const { tierBandDefs, chartW, margin, pillX } = layout;

  return (
    <g>
      {tierBandDefs.map((t, i) => {
        const tierH  = t.y2 - t.y1;
        const midY   = (t.y1 + t.y2) / 2;
        const barX   = pillX;
        const capLen = 10;

        const labelLines =
          t.name === "Role Player / Project"
            ? ["Role", "Player"]
            : [t.name];
        const lineH  = 13;
        const totalH = labelLines.length * lineH;
        const startY = midY - totalH / 2 + lineH - 2;
        const textX  = barX + 6;

        // Top-to-bottom stagger (25ms per tier band)
        const labelDelay = i * 25;
        const labelTransition = prefersReducedMotion
          ? "opacity 150ms ease"
          : `opacity 200ms ease ${labelDelay}ms, transform 200ms ease ${labelDelay}ms`;

        return (
          <g key={i}>
            {/* Tier background fill */}
            <rect
              x={margin.left} y={t.y1}
              width={chartW} height={tierH}
              fill={t.bg}
            />
            {/* Vertical bar */}
            <rect
              x={barX} y={t.y1}
              width={2} height={tierH}
              rx={1}
              fill="#D4A017"
              opacity={labelsHiding ? 0.0 : 0.50}
              style={{ transition: labelTransition }}
            />
            {/* Top cap */}
            <line
              x1={barX + 2} y1={t.y1}
              x2={barX + 2 - capLen} y2={t.y1}
              stroke="#D4A017" strokeWidth={1.5}
              opacity={labelsHiding ? 0.0 : 0.50}
              style={{ transition: labelTransition }}
            />
            {/* Bottom cap */}
            <line
              x1={barX + 2} y1={t.y2}
              x2={barX + 2 - capLen} y2={t.y2}
              stroke="#D4A017" strokeWidth={1.5}
              opacity={labelsHiding ? 0.0 : 0.50}
              style={{ transition: labelTransition }}
            />
            {/* Labels — cascade out top-to-bottom when hiding */}
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={textX}
                y={startY + li * lineH}
                textAnchor="start"
                fontSize={10} fontWeight={700}
                fill="#1A2D42"
                style={{
                  opacity: labelsHiding ? 0 : 0.60,
                  transform: labelsHiding ? "translateX(-6px)" : "translateX(0)",
                  transition: labelTransition,
                }}
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
