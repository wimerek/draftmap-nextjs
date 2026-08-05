"use client";
/**
 * components/chart/UDFAZone.tsx
 *
 * Session H: zone now always visible (not just in Drafted view).
 * - In Projected view: subtle/faded treatment so unranked players have a home.
 * - In Drafted view: full opacity — undrafted players land here.
 * Props: visible prop removed; always renders. Opacity driven by viewMode.
 *
 * Act 1 Resolution §2.1 (2026-08-04): the Act 1/2 eyebrow reads "OUTSIDE", not "UDFA",
 * and it is STATIC across the act flip — the zone means one thing the whole way through
 * ("not on the field"), and it holds three different populations to get there: the
 * unranked, the deep board (ranked past the last pick), and the undrafted. "UDFA" was
 * only ever true for the third, and only in Act 2. The 'Undrafted Free Agent' hover
 * caption is DELETED in these modes with no replacement — the key carries the reason
 * now, and a caption here would editorialize. Geometry, fill, border and dot treatment
 * are all unchanged. Production/career modes ('WASHED OUT') are untouched.
 *
 * Amendment 2026-08-05 (§B): in Act 1/2 the OUTSIDE eyebrow moves OUT of the zone and
 * into the left rail, matching the DayZones rail exactly (Oswald 700 · 14px · #5A6E7E ·
 * 2.5 tracking · x = margin.left − 50 · y = zone top + 18). In-zone it sat under the
 * zone's own dot cloud and was unreadable; in the rail it closes the wayfinding system
 * DAY 1 · DAY 2 · DAY 3 · OUTSIDE. No caption. It stays inside the fading <g>.
 */
import { useState } from "react";
import type { ChartLayout } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";
import type { ChartMode } from "@/lib/dataAvailability";

interface Props {
  layout: ChartLayout;
  viewMode: ViewMode;
  chartMode?: ChartMode;
  isZoomedMobile?: boolean;
  viewBoxX?: number;
  viewBoxW?: number;
  washedOutStat?: { count: number; pct: number } | null;
}

export default function UDFAZone({ layout, viewMode, chartMode, isZoomedMobile = false, viewBoxX, viewBoxW, washedOutStat }: Props) {
  const [hover, setHover] = useState(false);
  const { margin, chartW, udfaZoneY, udfaZoneH } = layout;

  const isProductionMode = chartMode === 'player-production' || chartMode === 'career';
  const zoneLabel = isProductionMode ? 'WASHED OUT' : 'OUTSIDE';

  if (isZoomedMobile) {
    const cx = viewBoxX !== undefined && viewBoxW !== undefined
      ? viewBoxX + viewBoxW / 2
      : margin.left + chartW / 2;
    return (
      <g pointerEvents="none">
        <text
          x={cx}
          y={udfaZoneY + udfaZoneH / 2 + 4}
          fontSize={12.5}
          fontWeight={700}
          fontFamily="Oswald, sans-serif"
          fill="rgba(11,34,57,0.68)"
          letterSpacing={1.5}
          textAnchor="middle"
        >
          {zoneLabel}
        </text>
      </g>
    );
  }

  // Fade the zone in Projected view; full opacity in Drafted view.
  const opacity = viewMode === "drafted" ? 1 : 0.45;

  const bandX  = margin.left;
  const bandW  = chartW;
  const labelX = bandX + 12;
  const labelY = udfaZoneY + udfaZoneH / 2 + 4;

  return (
    <g
      style={{ opacity, transition: "opacity 400ms ease" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Background fill — darker, solid in production mode */}
      <rect
        x={bandX} y={udfaZoneY}
        width={bandW} height={udfaZoneH}
        fill={isProductionMode ? 'rgba(51,65,85,0.15)' : 'rgba(180,170,155,0.10)'}
      />
      {/* Top separator — solid in production mode, dashed elsewhere */}
      <line
        x1={bandX} y1={udfaZoneY}
        x2={bandX + bandW} y2={udfaZoneY}
        stroke={isProductionMode ? '#334155' : '#B0A898'}
        strokeWidth={isProductionMode ? 1.5 : 1}
        strokeDasharray={isProductionMode ? undefined : '6,5'}
      />
      {/* Zone label. Act 1/2: OUTSIDE joins the left rail (DAY 1 · DAY 2 · DAY 3 ·
          OUTSIDE reads as one system) — in-zone it drowned under the dot cloud. It
          stays inside this <g>, so it still rides the zone's viewMode fade.
          Production/career ('WASHED OUT' + stat) keeps its in-zone placement. */}
      {isProductionMode ? (
        <text
          x={labelX} y={labelY}
          fontSize={10} fontWeight={700}
          fill="#334155"
          letterSpacing={1.5}
          textAnchor="start"
        >
          {zoneLabel}
        </text>
      ) : (
        <text
          x={margin.left - 50} y={udfaZoneY + 18}
          fontSize={14} fontWeight={700}
          fontFamily="Oswald, sans-serif"
          fill="#5A6E7E"
          letterSpacing={2.5}
          textAnchor="middle"
        >
          {zoneLabel}
        </text>
      )}
      {/* Zone stat (production mode only) */}
      {isProductionMode && washedOutStat && (
        <text
          x={labelX} y={labelY + 14}
          fontSize={9} fontWeight={400}
          fill="#334155" opacity={0.75}
          letterSpacing={1.2}
          textAnchor="start"
        >
          {washedOutStat.pct}% · {washedOutStat.count} players
        </text>
      )}
      {/* Hover tooltip — production/career modes ONLY. The Act 1/2 'Undrafted Free
          Agent' caption was deleted in §2.1 (no replacement sentence). */}
      {hover && isProductionMode && (
        <g>
          <rect
            x={labelX} y={udfaZoneY + 4}
            width={148} height={20}
            rx={4}
            fill="#2D2926"
            opacity={0.88}
          />
          <text
            x={labelX + 8} y={udfaZoneY + 18}
            fontSize={10} fill="#F5F0E8"
          >
            No longer in the league
          </text>
        </g>
      )}
    </g>
  );
}
