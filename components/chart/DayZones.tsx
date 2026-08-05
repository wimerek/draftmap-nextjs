"use client";
/**
 * components/chart/DayZones.tsx
 *
 * Act 1 Resolution §1 (2026-08-04) — REPLACES RoundZones.
 * Render-fix + Act 2 furniture amendment (2026-08-05).
 *
 * The draft is watched in three nights, not seven rounds. The seven evenly-spaced
 * round rules said "these seams are all the same size"; they are not. Day 1 ends and
 * the room changes. So the field carries exactly two heavy rules — the day seams —
 * with the internal rounds demoted to fine ticks that fade as the night gets later:
 *
 *   Day 1 (picks 1–32)    heavy tint · solid fine ticks at 8/16/24 · rail label
 *   Day 2 (picks 33–102)  mid tint   · dashed coarse ticks at 48/64/80
 *   Day 3 (picks 103+)    faint tint · NOTHING internal — by then nobody is counting
 *
 * ── Act 2 furniture (§C, 2026-08-05) ─────────────────────────────────────────
 * Act 1's taper encodes *projection uncertainty*: the further down the board, the
 * less any seam means. Act 2's picks are *facts*, and rounds are real there — so at
 * the act flip the taper fades out and the draft's true, per-class round seams fade
 * in, uniform-weight, each labeled with the round and the pick it actually started
 * at. Day 3 gains internal furniture in Act 2 only, deliberately: nothing was certain
 * down there before the draft; everything is after.
 *
 * The drafted seams are DERIVED from the class, never hardcoded — comp picks and
 * forfeitures move them year to year (2023's Round 2 starts at pick 32 because Miami
 * forfeited a first-rounder). Hardcoding 33/65/97 is the exact fiction this work
 * exists to delete.
 *
 * Rail note: the day labels were the darkest ink on the field. Furniture must recede
 * below data (Tufte layering), so the rail now wears #5A6E7E — the same slate the
 * retired R-labels wore — at 14px, top-anchored under each band's top edge.
 *
 * Numeral note (§A1): EVERY numeral in this file hugs the LEFT chart edge. Numerals in
 * the right margin sit ~1,300px from the labels people actually read, and go unnoticed.
 * Collisions are avoided by construction instead: the rail labels are top-anchored
 * (title +18, caption +31 below each band top) while the nearest numeral — pick 8's
 * tick — sits at band top + ~46. Tick numerals print below their line; the heavy
 * boundary numerals print ABOVE theirs, because 32 is the LAST pick of Day 1 and lives
 * above that seam. Placement matches meaning.
 *
 * Every value below is PINNED by the build brief. Colors and families are all existing
 * codebase values. Do not originate new ones here.
 */
import { useMemo } from "react";
import type { ChartLayout } from "@/lib/chartMath";
import type { ChartMode } from "@/lib/dataAvailability";
import type { ViewMode } from "@/components/Sidebar";
import type { Player } from "@/lib/sheets";

interface Props {
  layout: ChartLayout;
  /** Left x of the mobile zoomed viewBox. When set, the left-rail labels are hidden. */
  mobileZoomedX?: number;
  /** Width of the mobile zoomed viewBox (retained for parity with the old RoundZones API). */
  mobileZoomedViewBoxW?: number;
  chartMode?: ChartMode;
  /** Act 1 = 'projected', Act 2 = 'drafted'. Drives the internal-grid crossfade (§C1). */
  viewMode: ViewMode;
  /** The class, for deriving real round starts (§C2). */
  players: Player[];
}

// ── Pinned values (§1.3) ──────────────────────────────────────────────────────

const BOUNDARY_STROKE = "#0B2239";   // brand navy — the only heavy rules on the field
const BOUNDARY_W      = 1.8;
const BOUNDARY_OP     = 0.55;
const BOUNDARY_NUM_SIZE = 11;
const BOUNDARY_NUM_FILL = "#5A6E7E";

const TICK_STROKE   = "#B0A898";     // the old round-line parchment grey
const TICK_W        = 0.8;
const DAY1_TICK_OP  = 0.8;
const DAY2_TICK_OP  = 0.58;
const DAY2_TICK_DASH = "4 4";
const TICK_NUM_SIZE  = 10;
const DAY1_NUM_FILL  = "#8A94A0";
const DAY2_NUM_FILL  = "#AEB6BE";

/** Drafted-act internal seams — uniform, no taper. Facts are sharp. */
const SEAM_OP        = 0.8;
const SEAM_NUM_FILL  = "#8A94A0";

const RAIL_TITLE_SIZE    = 14;
const RAIL_TITLE_FILL    = "#5A6E7E";
const RAIL_TITLE_TRACK   = 2.5;
const RAIL_CAPTION_SIZE  = 9;
const RAIL_CAPTION_FILL  = "#8A94A0";
const RAIL_CAPTION_TRACK = 1.2;

const CROSSFADE = "opacity 400ms ease";

/** Background tints — sharp-edged, no gradient. Day 1 heaviest, Day 3 nearly bare. */
const DAY_TINTS = ["rgba(11,34,57,0.050)", "rgba(11,34,57,0.028)", "rgba(11,34,57,0.010)"] as const;

/** Boundary rules: the pick the line sits at, and the numeral printed above it, left. */
const BOUNDARIES = [
  { pick: 32.5,  numeral: "32"  },
  { pick: 102.5, numeral: "102" },
] as const;

/** Day 1 fine ticks — solid, the round seams inside the first night. */
const DAY1_TICKS = [
  { pick:  8.5, numeral: "8"  },
  { pick: 16.5, numeral: "16" },
  { pick: 24.5, numeral: "24" },
] as const;

/** Day 2 coarse ticks — dashed and dimmer; the seams matter less by Friday. */
const DAY2_TICKS = [
  { pick: 48.5, numeral: "48" },
  { pick: 64.5, numeral: "64" },
  { pick: 80.5, numeral: "80" },
] as const;

/** Rail titles — STATIC across the act flip (days are calendar facts in both acts). */
const RAIL_TITLES: Record<number, string> = { 1: "DAY 1", 2: "DAY 2", 3: "DAY 3" };

/** Rail captions — these DO crossfade: forecast ranges become round facts. */
const RAIL_CAPTIONS: Record<number, { projected: string; drafted: string }> = {
  1: { projected: "PICKS 1–32",   drafted: "ROUND 1"     },
  2: { projected: "PICKS 33–102", drafted: "ROUNDS 2–3"  },
  3: { projected: "PICKS 103+",   drafted: "ROUNDS 4–7"  },
};

/** Which drafted rounds get a HEAVY rule (the day seams) vs. a fine internal one. */
const DRAFTED_HEAVY_ROUNDS    = [2, 4] as const;
const DRAFTED_INTERNAL_ROUNDS = [3, 5, 6, 7] as const;

export default function DayZones({ layout, mobileZoomedX, chartMode, viewMode, players }: Props) {
  const { dayBoundaryYs, margin, chartW, totalChartH, pickToY } = layout;

  // ── Real round starts, derived from the class (§C2) ────────────────────────
  // roundStart(rd) = the lowest pick actually used by that round this year. A round
  // absent from the data yields no entry — and therefore no seam and no label. We
  // never invent a seam.
  const roundStarts = useMemo(() => {
    const starts: Record<number, number> = {};
    for (const p of players) {
      const rd = p.rd_drafted, pk = p.pick_drafted;
      if (rd == null || pk == null || rd < 2 || rd > 7) continue;
      if (starts[rd] === undefined || pk < starts[rd]) starts[rd] = pk;
    }
    return starts;
  }, [players]);

  // Hidden in production/career modes — there the Y axis is usage score, not pick
  // (same gate RoundZones carried).
  if (chartMode === "player-production" || chartMode === "career") return null;

  const isMobileZoomed = mobileZoomedX !== undefined;

  const chartLeft   = margin.left;
  const chartRight  = margin.left + chartW;
  const fieldTop    = margin.top;
  const fieldBottom = margin.top + totalChartH;

  // Band edges, top to bottom. Tint rect edges sit EXACTLY on the boundary lines.
  const bandEdges: Array<[number, number]> = [
    [fieldTop,          dayBoundaryYs[0]],
    [dayBoundaryYs[0],  dayBoundaryYs[1]],
    [dayBoundaryYs[1],  fieldBottom],
  ];

  /** Top edge of each band — the rail hangs off these, not off band midpoints. */
  const bandTopYs: Record<number, number> = {
    1: fieldTop,
    2: dayBoundaryYs[0],
    3: dayBoundaryYs[1],
  };

  const numX  = chartLeft - 8;        // ALL numerals hug the LEFT chart edge (§A1)
  const railX = margin.left - 50;     // left rail — titles + captions, outboard of numX

  const isDrafted = viewMode === "drafted";

  /**
   * One drafted seam, labeled on the left in the same grammar Act 1 uses (§C3):
   *  - HEAVY (the day seams): an above-line numeral only — the REAL last pick of the
   *    day, i.e. roundStart − 1. "32" for 2022's Day 1; "31" for 2023's, because Miami
   *    forfeited a first-rounder. The round identity of a day lives in its rail caption
   *    ("ROUNDS 2–3"), so no `R2 ·` prefix belongs here.
   *  - INTERNAL: "R{rd} · {pick}" below the line — the round and the pick it started at.
   */
  const draftedSeam = (rd: number, heavy: boolean) => {
    const start = roundStarts[rd];
    if (start === undefined) return null;   // round absent from the class — no invention
    const y = pickToY(start - 0.5);
    return (
      <g key={`seam-r${rd}`}>
        <line
          x1={chartLeft} y1={y}
          x2={chartRight} y2={y}
          stroke={heavy ? BOUNDARY_STROKE : TICK_STROKE}
          strokeWidth={heavy ? BOUNDARY_W : TICK_W}
          opacity={heavy ? BOUNDARY_OP : SEAM_OP}
        />
        {heavy ? (
          <text
            x={numX} y={y - 5}
            fontSize={BOUNDARY_NUM_SIZE}
            fill={BOUNDARY_NUM_FILL}
            textAnchor="end"
          >
            {String(start - 1)}
          </text>
        ) : (
          <text
            x={numX} y={y + 3.5}
            fontSize={TICK_NUM_SIZE}
            fill={SEAM_NUM_FILL}
            textAnchor="end"
          >
            {`R${rd} · ${start}`}
          </text>
        )}
      </g>
    );
  };

  return (
    <g>
      {/* ── Background tints — FIRST children so every rule, label and dot sits above
             them. Sharp edges, no gradient, no rounding. Static across both acts. ── */}
      {bandEdges.map(([y1, y2], i) => (
        <rect
          key={`day-tint-${i}`}
          x={chartLeft} y={y1}
          width={chartW} height={Math.max(0, y2 - y1)}
          fill={DAY_TINTS[i]}
        />
      ))}

      {/* ══ PROJECTED internal grid — the taper. Fades out at the act flip. ══ */}
      <g style={{ opacity: isDrafted ? 0 : 1, transition: CROSSFADE }}>
        {/* Day boundaries — the only heavy lines on the projected field */}
        {BOUNDARIES.map(({ pick, numeral }) => {
          const y = pickToY(pick);
          return (
            <g key={`day-bound-${pick}`}>
              <line
                x1={chartLeft} y1={y}
                x2={chartRight} y2={y}
                stroke={BOUNDARY_STROKE}
                strokeWidth={BOUNDARY_W}
                opacity={BOUNDARY_OP}
              />
              {/* ABOVE the line: 32 is the last pick of Day 1, which lives up there. */}
              <text
                x={numX} y={y - 5}
                fontSize={BOUNDARY_NUM_SIZE}
                fill={BOUNDARY_NUM_FILL}
                textAnchor="end"
              >
                {numeral}
              </text>
            </g>
          );
        })}

        {/* Day 1 fine ticks — solid, the loudest of the internal seams */}
        {DAY1_TICKS.map(({ pick, numeral }) => {
          const y = pickToY(pick);
          return (
            <g key={`day1-tick-${pick}`}>
              <line
                x1={chartLeft} y1={y}
                x2={chartRight} y2={y}
                stroke={TICK_STROKE}
                strokeWidth={TICK_W}
                opacity={DAY1_TICK_OP}
              />
              <text
                x={numX} y={y + 3.5}
                fontSize={TICK_NUM_SIZE}
                fill={DAY1_NUM_FILL}
                textAnchor="end"
              >
                {numeral}
              </text>
            </g>
          );
        })}

        {/* Day 2 coarse ticks — dashed and dimmer */}
        {DAY2_TICKS.map(({ pick, numeral }) => {
          const y = pickToY(pick);
          return (
            <g key={`day2-tick-${pick}`}>
              <line
                x1={chartLeft} y1={y}
                x2={chartRight} y2={y}
                stroke={TICK_STROKE}
                strokeWidth={TICK_W}
                opacity={DAY2_TICK_OP}
                strokeDasharray={DAY2_TICK_DASH}
              />
              <text
                x={numX} y={y + 3.5}
                fontSize={TICK_NUM_SIZE}
                fill={DAY2_NUM_FILL}
                textAnchor="end"
              >
                {numeral}
              </text>
            </g>
          );
        })}

        {/* Day 3 carries NOTHING internal in Act 1 — no lines, no numerals. */}
      </g>

      {/* ══ DRAFTED internal grid — the real seams. Fades in at the act flip. ══
             Heavies land on the true R2/R4 starts (not 32.5/102.5); the rest are
             uniform fine rules, Day 3 included. No Y animation — the crossfade
             covers the small repositioning of the heavies. */}
      <g style={{ opacity: isDrafted ? 1 : 0, transition: CROSSFADE }}>
        {DRAFTED_HEAVY_ROUNDS.map(rd => draftedSeam(rd, true))}
        {DRAFTED_INTERNAL_ROUNDS.map(rd => draftedSeam(rd, false))}
      </g>

      {/* ── Left rail — desktop only (the old R1–R7 slot). Titles are STATIC across
             the act flip; only the captions crossfade. Top-anchored under each band's
             top edge, and muted so the furniture sits below the data. ── */}
      {!isMobileZoomed && ([1, 2, 3] as const).map(day => {
        const topY = bandTopYs[day];
        const caption = RAIL_CAPTIONS[day];
        return (
          <g key={`day-rail-${day}`}>
            <text
              x={railX} y={topY + 18}
              textAnchor="middle"
              fontSize={RAIL_TITLE_SIZE}
              fontWeight={700}
              fontFamily="Oswald, sans-serif"
              fill={RAIL_TITLE_FILL}
              letterSpacing={RAIL_TITLE_TRACK}
            >
              {RAIL_TITLES[day]}
            </text>
            <text
              x={railX} y={topY + 31}
              textAnchor="middle"
              fontSize={RAIL_CAPTION_SIZE}
              fill={RAIL_CAPTION_FILL}
              letterSpacing={RAIL_CAPTION_TRACK}
              style={{ opacity: isDrafted ? 0 : 1, transition: CROSSFADE }}
            >
              {caption.projected}
            </text>
            <text
              x={railX} y={topY + 31}
              textAnchor="middle"
              fontSize={RAIL_CAPTION_SIZE}
              fill={RAIL_CAPTION_FILL}
              letterSpacing={RAIL_CAPTION_TRACK}
              style={{ opacity: isDrafted ? 1 : 0, transition: CROSSFADE }}
            >
              {caption.drafted}
            </text>
          </g>
        );
      })}
    </g>
  );
}
