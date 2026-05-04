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
}

export default function PositionColumns({ layout }: Props) {
  const {
    visiblePositions, colXMap, colWidths,
    margin, totalChartH, hasDefense, hasOffense, sepW,
  } = layout;

  return (
    <g>
      {visiblePositions.map((pos, posIdx) => {
        const colX = colXMap[pos];
        const cW   = colWidths[pos];
        const colBg = posIdx % 2 === 0 ? "#F8F3EA" : "#EEE8DD";

        return (
          <g key={pos}>
            {/* Column body background */}
            <rect
              x={colX} y={margin.top}
              width={cW} height={totalChartH}
              fill={colBg} opacity={0.55}
            />
            {/* Header background */}
            <rect x={colX} y={0} width={cW} height={margin.top} fill="#E6EBF0" />

            {/* Position name */}
            <text
              x={colX + cW / 2}
              y={46}
              textAnchor="middle"
              fontSize={18}
              fontWeight={900}
              fill="#081B2C"
              letterSpacing={0.8}
            >
              {pos}
            </text>

            {/* Header bottom border */}
            <line
              x1={colX} y1={margin.top}
              x2={colX + cW} y2={margin.top}
              stroke="#AEB8C2" strokeWidth={1.2}
            />
            {/* Right column border */}
            <line
              x1={colX + cW} y1={0}
              x2={colX + cW} y2={margin.top + totalChartH}
              stroke="#C4C8CC" strokeWidth={0.8}
            />
          </g>
        );
      })}

      {/* OFFENSE section label */}
      {hasOffense && (() => {
        const firstOffPos = visiblePositions.find(p => (POSITIONS.offense as readonly string[]).includes(p));
        return firstOffPos ? (
          <text
            x={colXMap[firstOffPos] + 6}
            y={margin.top - 8}
            fontSize={8} fontWeight={700}
            fill="#0B2239" opacity={0.40}
            letterSpacing={2.2}
          >
            OFFENSE
          </text>
        ) : null;
      })()}

      {/* DEFENSE section label */}
      {hasDefense && (() => {
        const firstDefPos = visiblePositions.find(p => (POSITIONS.defense as readonly string[]).includes(p));
        return firstDefPos ? (
          <text
            x={colXMap[firstDefPos] + 6}
            y={margin.top - 8}
            fontSize={8} fontWeight={700}
            fill="#0B2239" opacity={0.40}
            letterSpacing={2.2}
          >
            DEFENSE
          </text>
        ) : null;
      })()}

      {/* D/O separator — dashed vertical line at boundary between defense (left) and offense (right) */}
      {hasDefense && hasOffense && (() => {
        const firstOffPos = visiblePositions.find(p => (POSITIONS.offense as readonly string[]).includes(p));
        if (!firstOffPos) return null;
        const sepX = colXMap[firstOffPos] - sepW / 2;
        return (
          <line
            x1={sepX} y1={14}
            x2={sepX} y2={margin.top + totalChartH}
            stroke="#C4D0CC" strokeWidth={1.4}
            strokeDasharray="6,4"
          />
        );
      })()}
    </g>
  );
}
