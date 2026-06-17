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
import { useRouter } from "next/navigation";
import type { ChartLayout } from "@/lib/chartMath";
import { POSITIONS } from "@/lib/chartConstants";
import { positionToSlug, isSupportedTwinYear } from "@/lib/twinConfig";

interface Props {
  layout: ChartLayout;
  isZoomedMobile?: boolean;
  onHowToReadClick?: () => void;
  /** Currently viewed class year — headers link to /draft/{year}/{pos} for it. */
  linkYear?: number;
}

export default function PositionColumns({ layout, isZoomedMobile = false, onHowToReadClick, linkYear }: Props) {
  const router = useRouter();
  // Headers link only for years that have twin position pages (avoids 404s).
  const linksEnabled = linkYear != null && isSupportedTwinYear(linkYear) && !isZoomedMobile;
  const {
    visiblePositions, colXMap, colWidths,
    margin, totalChartH, hasDefense, hasOffense, pillX,
  } = layout;

  return (
    <g>
      {visiblePositions.map((pos) => {
        const colX = colXMap[pos];
        const cW   = colWidths[pos];

        return (
          <g key={pos}>
            {/* Column body fill REMOVED (brief-f parchment unification) — the page
                parchment shows through; the dividers + navy headers (below) separate
                the columns Tufte-cleanly, matching Act 3 (no column fills). */}

            {/* Header and separator elements — hidden in zoomed mobile */}
            {!isZoomedMobile && (
              <>
                {/* Header background — dark navy */}
                <rect x={colX} y={0} width={cW} height={margin.top} fill="#0B2239" />

                {/* Position name — Oswald, warm white. Links to the twin position page. */}
                <text
                  x={colX + cW / 2}
                  y={margin.top * 0.50}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={17}
                  fontWeight={700}
                  fontFamily="Oswald, sans-serif"
                  fill="#F5F0E8"
                  letterSpacing={1.4}
                  className={linksEnabled ? "twin-pos-header-link" : undefined}
                  style={linksEnabled ? { cursor: "pointer" } : undefined}
                  onClick={linksEnabled ? () => router.push(`/draft/${linkYear}/${positionToSlug(pos)}`) : undefined}
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

      {/* Off/def brand seam (post-E4 fix-pass §I): a short DARK-NAVY vertical tick at the
          S|RB seam, spanning the HEADER ONLY (y 0 → margin.top). The normal column
          dividers are faint WHITE (rgba(255,255,255,0.10)); a DARKER navy than the
          #0B2239 header reads as "a more substantial seam" by WEIGHT, not brightness —
          distinct from a regular column break, but never the first thing the eye catches.
          (Was a too-bright gold tick.) Gated on hasDefense && hasOffense and positioned
          at colXMap[firstOffPos] DYNAMICALLY (never hardcoded) — so an all-defense /
          all-offense filter (which collapses the view) drops it automatically; partial
          filters keep all columns and the tick stays. */}
      {!isZoomedMobile && hasDefense && hasOffense && (() => {
        const firstOffPos = visiblePositions.find(p => (POSITIONS.offense as readonly string[]).includes(p));
        if (!firstOffPos) return null;
        const seamX = colXMap[firstOffPos];
        return (
          <line
            x1={seamX} y1={0}
            x2={seamX} y2={margin.top}
            stroke="#061626" strokeWidth={2}
          />
        );
      })()}

      {/* "How to Read" trigger — right margin, vertically centered in header */}
      {!isZoomedMobile && onHowToReadClick && (
        <g
          style={{ cursor: "pointer" }}
          onClick={onHowToReadClick}
        >
          <circle
            cx={pillX + 16}
            cy={margin.top / 2}
            r={14}
            fill="rgba(212,160,23,0.12)"
            stroke="#D4A017"
            strokeWidth={1.5}
            opacity={1.0}
          />
          <text
            x={pillX + 16}
            y={margin.top / 2 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={700}
            fill="#D4A017"
            opacity={1.0}
          >
            ?
          </text>
        </g>
      )}
    </g>
  );
}
