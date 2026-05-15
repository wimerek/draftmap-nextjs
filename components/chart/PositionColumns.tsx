"use client";
/**
 * components/chart/PositionColumns.tsx
 *
 * Session E:
 *   - zoomLevel and isOverview props removed (no zoom states).
 *   - Role sub-band headers removed (role context lives in player card).
 *   - Variable column widths via colWidths[pos] from ChartLayout.
 *   - DEFENSE / OFFENSE labels always visible (no zoom threshold).
 */
import type { ChartLayout } from "@/lib/chartMath";
import { POSITIONS } from "@/lib/chartConstants";

interface Props {
  layout: ChartLayout;
  isZoomedMobile?: boolean;
}

export default function PositionColumns({ layout, isZoomedMobile = false }: Props) {
  const {
    visiblePositions, colXMap, colWidths,
    margin, totalChartH, hasDefense, hasOffense, sepW,
  } = layout;

  return (
    <g>
      {visiblePositions.map((pos, posIdx) => {
        const colX = colXMap[pos];
        const cW   = colWidths[pos];
        const colBg = posIdx % 2 === 0 ? "#F3F6F9" : "#E9EEF3";

        return (
          <g key={pos}>
            {/* Column body background */}
            <rect
              x={colX} y={margin.top}
              width={cW} height={totalChartH}
              fill={colBg} opacity={0.55}
            />

            {/* Header and separator elements — hidden in zoomed mobile */}
            {!isZoomedMobile && (
              <>
                {/* Header background — dark navy */}
                <rect x={colX} y={0} width={cW} height={margin.top} fill="#0B2239" />

                {/* Position name — Oswald, warm white */}
                <text
                  x={colX + cW / 2}
                  y={margin.top * 0.52}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={17}
                  fontWeight={700}
                  fontFamily="Oswald, sans-serif"
                  fill="#F5F0E8"
                  letterSpacing={1.4}
                >
                  {pos}
                </text>

                {/* Gold underline — brand moment at header/chart boundary */}
                <line
                  x1={colX} y1={margin.top}
                  x2={colX + cW} y2={margin.top}
                  stroke="#D4A017" strokeWidth={1.8}
                />
                {/* Column divider in header */}
                <line
                  x1={colX + cW} y1={0}
                  x2={colX + cW} y2={margin.top}
                  stroke="rgba(255,255,255,0.10)" strokeWidth={1}
                />
                {/* Column divider in chart body */}
                <line
                  x1={colX + cW} y1={margin.top}
                  x2={colX + cW} y2={margin.top + totalChartH}
                  stroke="#C4C8CC" strokeWidth={0.8}
                />
              </>
            )}
          </g>
        );
      })}

      {/* OFFENSE / DEFENSE section labels — hidden in zoomed mobile */}
      {!isZoomedMobile && hasOffense && (() => {
        const firstOffPos = visiblePositions.find(p => (POSITIONS.offense as readonly string[]).includes(p));
        return firstOffPos ? (
          <text
            x={colXMap[firstOffPos] + 6}
            y={margin.top - 8}
            fontSize={8} fontWeight={700}
            fill="#F5F0E8" opacity={0.45}
            letterSpacing={2.2}
            fontFamily="Oswald, sans-serif"
          >
            OFFENSE
          </text>
        ) : null;
      })()}

      {!isZoomedMobile && hasDefense && (() => {
        const firstDefPos = visiblePositions.find(p => (POSITIONS.defense as readonly string[]).includes(p));
        return firstDefPos ? (
          <text
            x={colXMap[firstDefPos] + 6}
            y={margin.top - 8}
            fontSize={8} fontWeight={700}
            fill="#F5F0E8" opacity={0.45}
            letterSpacing={2.2}
            fontFamily="Oswald, sans-serif"
          >
            DEFENSE
          </text>
        ) : null;
      })()}

      {/* D/O separator — hidden in zoomed mobile view (single-position, divider is irrelevant) */}
      {!isZoomedMobile && hasDefense && hasOffense && (() => {
        const firstOffPos = visiblePositions.find(p => (POSITIONS.offense as readonly string[]).includes(p));
        if (!firstOffPos) return null;
        const gapCenterX = colXMap[firstOffPos] - sepW / 2;
        return (
          <>
<line
              x1={gapCenterX} y1={margin.top}
              x2={gapCenterX} y2={margin.top + totalChartH}
              stroke="#D4A017"
              strokeWidth={1.5}
              opacity={0.30}
            />
          </>
        );
      })()}
    </g>
  );
}
