"use client";
/**
 * components/chart/PositionColumns.tsx
 * Column backgrounds, position name headers, DEFENSE/OFFENSE section labels,
 * the D/O dashed separator, and column right-border lines.
 */
import type { ChartLayout } from "@/lib/chartMath";
import { POSITIONS, BAND_ASSIGNMENTS } from "@/lib/chartConstants";

interface Props {
  layout: ChartLayout;
  zoomLevel: number;
  isOverview: boolean;
}

function splitRoleLabel(name: string): string[] {
  if (name.includes("/")) {
    const parts = name.split("/").map(s => s.trim());
    return [`${parts[0]}/`, parts[1]];
  }
  if (name.includes(" ")) {
    const parts = name.split(" ");
    if (parts.length === 2) return parts;
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
  }
  return [name];
}

export default function PositionColumns({ layout, zoomLevel, isOverview }: Props) {
  const { visiblePositions, colXMap, colW, subColW, margin, totalChartH, hasDefense, hasOffense, sepW } = layout;
  const isRoles = !isOverview;

  const headerFontSize =
    zoomLevel === 0 ? 10 :
    zoomLevel === 1 ? 13 :
    zoomLevel === 2 ? 18 : 20;

  return (
    <g>
      {visiblePositions.map((pos, posIdx) => {
        const colX    = colXMap[pos];
        const colBg   = posIdx % 2 === 0 ? "#F8F3EA" : "#EFE9DE";
        const bands   = BAND_ASSIGNMENTS[pos as keyof typeof BAND_ASSIGNMENTS];
        const subLabels = bands ? [bands.top, bands.mid, bands.bot] : [];

        return (
          <g key={pos}>
            {/* Column body background */}
            <rect
              x={colX} y={margin.top}
              width={colW} height={totalChartH}
              fill={colBg} opacity={0.55}
            />
            {/* Header background */}
            <rect x={colX} y={0} width={colW} height={margin.top} fill="#E4E9EE" />

            {/* Position name */}
            <text
              x={colX + colW / 2}
              y={isOverview ? 44 : 36}
              textAnchor="middle"
              fontSize={headerFontSize}
              fontWeight={900}
              fill="#081B2C"
              letterSpacing={0.6}
            >
              {pos}
            </text>

            {/* Role sub-column headers (roles mode only) */}
            {isRoles && subLabels.map((name, bi) => {
              const scX    = colX + bi * subColW + subColW / 2;
              const isMid  = bi === 1;
              const lines  = splitRoleLabel(name);

              return (
                <g key={bi}>
                  {bi > 0 && (
                    <line
                      x1={colX + bi * subColW} y1={44}
                      x2={colX + bi * subColW} y2={margin.top + totalChartH}
                      stroke="#D8D3CA" strokeWidth={0.7}
                    />
                  )}
                  {lines.length === 1 ? (
                    <text
                      x={scX} y={64}
                      textAnchor="middle"
                      fontSize={9}
                      fontStyle={isMid ? "italic" : "normal"}
                      fontWeight={700}
                      fill="#4F6477"
                    >
                      {lines[0]}
                    </text>
                  ) : (
                    <>
                      <text x={scX} y={58} textAnchor="middle" fontSize={8.5}
                        fontStyle={isMid ? "italic" : "normal"} fontWeight={700} fill="#4F6477">
                        {lines[0]}
                      </text>
                      <text x={scX} y={69} textAnchor="middle" fontSize={8.5}
                        fontStyle={isMid ? "italic" : "normal"} fontWeight={700} fill="#4F6477">
                        {lines[1]}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Bottom border under header */}
            <line x1={colX} y1={margin.top} x2={colX + colW} y2={margin.top}
              stroke="#AEB8C2" strokeWidth={1.4} />
            {/* Right column border */}
            <line x1={colX + colW} y1={0} x2={colX + colW} y2={margin.top + totalChartH}
              stroke="#B9C3CC" strokeWidth={1.2} />
          </g>
        );
      })}

      {/* DEFENSE / OFFENSE section labels */}
      {zoomLevel >= 1 && hasDefense && (() => {
        const firstDefPos = visiblePositions.find(p => (POSITIONS.defense as readonly string[]).includes(p));
        return firstDefPos ? (
          <text x={colXMap[firstDefPos] + 4} y={margin.top - 10}
            fontSize={zoomLevel === 1 ? 7 : 8} fontWeight={700}
            fill="#0B2239" opacity={0.5} letterSpacing={2}>
            DEFENSE
          </text>
        ) : null;
      })()}

      {zoomLevel >= 1 && hasOffense && (() => {
        const firstOffPos = visiblePositions.find(p => (POSITIONS.offense as readonly string[]).includes(p));
        return firstOffPos ? (
          <text x={colXMap[firstOffPos] + 4} y={margin.top - 10}
            fontSize={zoomLevel === 1 ? 7 : 8} fontWeight={700}
            fill="#0B2239" opacity={0.5} letterSpacing={2}>
            OFFENSE
          </text>
        ) : null;
      })()}

      {/* D/O vertical separator */}
      {hasDefense && hasOffense && (() => {
        const firstOffPos = visiblePositions.find(p => (POSITIONS.offense as readonly string[]).includes(p));
        if (!firstOffPos) return null;
        const sepX = colXMap[firstOffPos] - sepW / 2;
        return (
          <line x1={sepX} y1={18} x2={sepX} y2={margin.top + totalChartH}
            stroke="#C4D0CC" strokeWidth={1.5} strokeDasharray="6,4" />
        );
      })()}
    </g>
  );
}
