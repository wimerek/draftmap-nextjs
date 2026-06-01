/**
 * lib/chartMath.ts
 *
 * Pure layout math functions for the DraftMap chart.
 *
 * Session E changes (2026-05-02):
 *   - Continuous Y-axis: pick 1 at top, pick 256 at bottom.
 *     Y position = pickToY(rank) — a linear scale. Round bands eliminated.
 *   - Variable position column widths proportional to player count at each position.
 *   - isOverview parameter removed (single overview mode only — no zoom states).
 *   - computeAllDotPositions simplified: Y = pickToY(rank), X = column center.
 *     Unranked players (rank 0/null) are excluded from chart rendering.
 *
 * Utility functions (getBandForRole, rankToY, spreadDots, etc.) are preserved
 * for PlayerCard.tsx and future features (force simulation, results view).
 */

import type { Player } from './sheets';
import { BAND_ASSIGNMENTS, POSITIONS, POSITION_ORDER, ROUND_EXPECTED_PCT, TIER_DEFS } from './chartConstants';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Band = 'top' | 'mid' | 'bot';

export interface RdRankRange {
  [rd: number]: { min: number; max: number };
}

export interface SpreadDot {
  y: number;
  player: Player;
}

// ── Band / role classification ────────────────────────────────────────────────

export function getBandForRole(role: string | null | undefined, pos: string): Band {
  const b = BAND_ASSIGNMENTS[pos as keyof typeof BAND_ASSIGNMENTS];
  if (!b) return 'mid';
  if (role === b.top) return 'top';
  if (role === b.bot) return 'bot';
  return 'mid';
}

// ── Player filtering helpers ──────────────────────────────────────────────────

export function getByPosRound(players: Player[], pos: string, rd: number): Player[] {
  return players
    .filter(p => p.pos === pos && p.rd === rd)
    .sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
}

export function getInBand(
  players: Player[],
  pos: string,
  rd: number,
  band: Band,
): Player[] {
  return getByPosRound(players, pos, rd).filter(
    p => getBandForRole(p.role, pos) === band,
  );
}

// ── Rank range pre-computation (used by PlayerCard) ──────────────────────────

export function buildRdRankRange(players: Player[]): RdRankRange {
  const ranges: RdRankRange = {};
  for (let rd = 1; rd <= 7; rd++) {
    const rdPlayers = players.filter(p => p.rd === rd);
    const ranked = rdPlayers.filter(p => (p.rank ?? 0) > 0);
    if (ranked.length > 0) {
      const ranks = ranked.map(p => p.rank as number);
      ranges[rd] = { min: Math.min(...ranks), max: Math.max(...ranks) };
    } else {
      ranges[rd] = { min: 0, max: 0 };
    }
  }
  return ranges;
}

// ── Rank-to-Y within a round zone (used by PlayerCard zone tracks) ────────────

export function rankToY(
  rank: number,
  rd: number,
  ry: number,
  rh: number,
  rdRankRange: RdRankRange,
  fallbackIndex?: number,
  fallbackTotal?: number,
): number {
  const { min, max } = rdRankRange[rd] ?? { min: 0, max: 0 };
  const pad = 24;

  if (rank === 0) {
    if (fallbackTotal != null && fallbackTotal > 1) {
      const t = (fallbackIndex ?? 0) / (fallbackTotal - 1);
      return ry + pad + t * (rh - 2 * pad);
    }
    return ry + rh / 2;
  }

  if (max === min) return ry + rh / 2;

  const t = (rank - min) / (max - min);

  const curveStrengthByRound: Record<number, number> = {
    1: 0.18, 2: 0.20, 3: 0.22, 4: 0.24, 5: 0.22, 6: 0.20, 7: 0.16,
  };
  const exponentByRound: Record<number, number> = {
    1: 0.93, 2: 0.91, 3: 0.89, 4: 0.87, 5: 0.89, 6: 0.91, 7: 0.94,
  };

  const curveStrength = curveStrengthByRound[rd] ?? 0.20;
  const exponent = exponentByRound[rd] ?? 0.90;

  const curvedT = Math.pow(t, exponent);
  const displayT = t * (1 - curveStrength) + curvedT * curveStrength;

  return ry + pad + displayT * (rh - 2 * pad);
}

// ── Dot spreading within a round zone (preserved for future force-sim upgrade) ─

export function spreadDots(
  dotData: Player[],
  ry: number,
  rh: number,
  rdRankRange: RdRankRange,
): SpreadDot[] {
  const DOT_R = 5;
  const MIN_GAP = DOT_R * 2 + 1;
  const PAD = DOT_R + 2;

  const total = dotData.length;

  let pts: SpreadDot[] = dotData.map((p, i) => ({
    y: rankToY(p.rank ?? 0, p.rd ?? 1, ry, rh, rdRankRange, i, total),
    player: p,
  }));

  for (let iter = 0; iter < 30; iter++) {
    pts.sort((a, b) => a.y - b.y);
    let changed = false;
    for (let i = 0; i < pts.length - 1; i++) {
      const gap = pts[i + 1].y - pts[i].y;
      if (gap < MIN_GAP) {
        const push = (MIN_GAP - gap) / 2;
        pts[i].y -= push;
        pts[i + 1].y += push;
        changed = true;
      }
    }
    if (!changed) break;
  }

  pts.forEach(p => {
    p.y = Math.max(ry + PAD, Math.min(ry + rh - PAD, p.y));
  });

  return pts;
}

// ── Height conversion helpers (used by PlayerCard.tsx) ────────────────────────

export function scoutToInches(code: number | string | null | undefined): number | null {
  if (code == null) return null;
  const n = typeof code === 'string' ? parseFloat(code) : code;
  if (isNaN(n)) return null;
  const s = String(Math.round(n)).padStart(4, '0');
  const feet   = parseInt(s[0], 10);
  const inches = parseInt(s.slice(1, 3), 10);
  const eighths = parseInt(s[3], 10);
  return feet * 12 + inches + eighths / 8;
}

export function inchesToHeightDisplay(totalInches: number | null | undefined): string {
  if (totalInches == null || isNaN(totalInches)) return 'N/A';
  const feet    = Math.floor(totalInches / 12);
  const inches  = Math.floor(totalInches % 12);
  const eighths = Math.round((totalInches % 1) * 8);
  const INCH = '"';
  if (!eighths) return `${feet}'${inches}${INCH}`;
  const fracs: Record<number, string> = {
    1: '\u215B', 2: '\u00BC', 3: '\u215C', 4: '\u00BD', 5: '\u215D', 6: '\u00BE', 7: '\u215E',
  };
  return `${feet}'${inches} ${fracs[eighths] ?? ''}${INCH}`;
}


// ── Chart layout types (Session E: continuous Y-axis, variable column widths) ──

import { R1_SPLIT } from './chartConstants';

export type ChartView = 'all' | 'offense' | 'defense';

export interface TierBandDef {
  y1: number;
  y2: number;
  name: string;
  color: string;
  bg: string;
}

export interface ChartLayout {
  svgW: number;
  svgH: number;
  chartW: number;
  totalChartH: number;
  margin: { top: number; right: number; bottom: number; left: number };
  /** Per-position column widths (proportional to player count). */
  colWidths: Record<string, number>;
  colXMap: Record<string, number>;
  sepW: number;
  tierBandDefs: TierBandDef[];
  /** Y coordinates of tier-color transitions (Great→Good, Good→Solid, Solid→Role). */
  tierBoundaryYs: number[];
  /** Y coordinates of round boundary lines (after R1, R2, ..., R6). */
  roundBoundaryYs: number[];
  /** Y center of each round label (midpoint of its range on the pick axis). */
  roundLabelYs: Record<number, number>;
  /** Linear scale: rank (1–MAX_PICK) → SVG Y coordinate. */
  pickToY: (rank: number) => number;
  visiblePositions: string[];
  hasDefense: boolean;
  hasOffense: boolean;
  pillX: number;
  pillW: number;
  /** Y coordinate of the top of the UDFA zone (starts at the pick-256 line). */
  udfaZoneY: number;
  /** Height of the UDFA zone in pixels. */
  udfaZoneH: number;
}

// ── Y-axis constants ──────────────────────────────────────────────────────────

/** Total number of NFL draft picks (domain of the Y axis). */
const MAX_PICK = 256;

/** Pixels per pick on the continuous Y axis. */
const PX_PER_PICK = 5;

/** Reference SVG width — chart is designed for this width. */
const SVG_REFERENCE_WIDTH = 1600;

/** Minimum column width in pixels (prevents tiny columns for sparse positions). */
const MIN_COL_W = 90;

/** Maximum column width in pixels — caps the ratio between wide (WR) and narrow (S) columns. */
const MAX_COL_W = 220;

/**
 * Tier thresholds in pick-number terms (matches locked design spec):
 *   Great            = picks  1–15
 *   Good             = picks 16–64  (rest of R1 + all R2)
 *   Solid            = picks 65–96  (R3)
 *   Role Player/Proj = picks 97–256 (R4–R7)
 *
 * Boundary values sit halfway between rounds/tiers for clean visual separation.
 */
const TIER_PICK_BOUNDARIES = [15.5, 64.5, 96.5] as const;

/** Round boundary pick numbers (end of each round 1–6). */
const ROUND_BOUNDARY_PICKS = [32, 64, 96, 128, 160, 192] as const;

/** Midpoint pick of each round (for round label placement). */
const ROUND_MIDPOINT_PICKS: Record<number, number> = {
  1: 16,
  2: 48,
  3: 80,
  4: 112,
  5: 144,
  6: 176,
  7: 224,
};

// ── Main layout computation ───────────────────────────────────────────────────

export function computeChartLayout(
  players: Player[],
  view: ChartView = 'all',
): ChartLayout {
  // ── Visible positions ────────────────────────────────────────────────────
  const allWithData = POSITION_ORDER.filter(p => players.some(pl => pl.pos === p));
  const visiblePositions = allWithData.filter(p => {
    if (view === 'defense') return (POSITIONS.defense as readonly string[]).includes(p);
    if (view === 'offense') return (POSITIONS.offense as readonly string[]).includes(p);
    return true;
  });

  const hasDefense = visiblePositions.some(p => (POSITIONS.defense as readonly string[]).includes(p));
  const hasOffense = visiblePositions.some(p => (POSITIONS.offense as readonly string[]).includes(p));

  const sepW = hasDefense && hasOffense ? 48 : 0;
  // margin.left: 80px — accommodates round labels + the left-side quality arrow.
  // margin.right: 160px — accommodates tier pills on the right.
  const margin = { top: 72, right: 160, bottom: 48, left: 100 };

  // ── Y-axis: continuous pick scale ────────────────────────────────────────
  const totalChartH = MAX_PICK * PX_PER_PICK; // 1280px

  const pickToY = (rank: number): number =>
    margin.top + ((rank - 1) / (MAX_PICK - 1)) * totalChartH;

  // ── Variable column widths (proportional to player count) ─────────────────
  const availableW = SVG_REFERENCE_WIDTH - margin.left - margin.right - sepW;

  const posCounts: Record<string, number> = {};
  let totalPlayers = 0;
  visiblePositions.forEach(pos => {
    const n = players.filter(p => p.pos === pos && (p.rank ?? 0) > 0).length;
    posCounts[pos] = Math.max(n, 1); // at least 1 to avoid zero-width columns
    totalPlayers += posCounts[pos];
  });

  const colWidths: Record<string, number> = {};
  visiblePositions.forEach(pos => {
    const fraction = posCounts[pos] / Math.max(totalPlayers, 1);
    colWidths[pos] = Math.min(MAX_COL_W, Math.max(MIN_COL_W, Math.round(fraction * availableW)));
  });

  // ── Column X positions ────────────────────────────────────────────────────
  const colXMap: Record<string, number> = {};
  let curX = margin.left;
  let sepInserted = false;
  visiblePositions.forEach(pos => {
    // Insert the D/O gap before the first OFFENSE column (defense is left, offense is right).
    // Bug fix: was checking POSITIONS.defense which placed gap before EDGE instead of before RB.
    if (
      (POSITIONS.offense as readonly string[]).includes(pos) &&
      !sepInserted &&
      hasDefense &&
      hasOffense
    ) {
      curX += sepW;
      sepInserted = true;
    }
    colXMap[pos] = curX;
    curX += colWidths[pos];
  });

  // ── Chart dimensions ──────────────────────────────────────────────────────
  const chartW = visiblePositions.reduce((sum, p) => sum + colWidths[p], 0) + sepW;
  const svgW   = margin.left + chartW + margin.right;

  // ── UDFA zone (below pick-256 line) ──────────────────────────────────────
  // Undrafted players animate here. 80px band with dashed top border.
  const UDFA_ZONE_H = 130;
  const udfaZoneY   = margin.top + totalChartH;   // top of UDFA band
  const svgH        = udfaZoneY + UDFA_ZONE_H + margin.bottom;

  // ── Pill / arrow layout (pills on RIGHT side of chart) ───────────────────
  const pillW            = 76;
  const pillGapFromChart = 24;
  // pillX is right of the chart — pills + arrows both live in the right margin.
  const pillX            = margin.left + chartW + pillGapFromChart;

  // ── Tier band definitions ─────────────────────────────────────────────────
  const tierBandDefs: TierBandDef[] = [
    {
      y1: pickToY(1),
      y2: pickToY(TIER_PICK_BOUNDARIES[0]),
      ...TIER_DEFS[0],
    },
    {
      y1: pickToY(TIER_PICK_BOUNDARIES[0]),
      y2: pickToY(TIER_PICK_BOUNDARIES[1]),
      ...TIER_DEFS[1],
    },
    {
      y1: pickToY(TIER_PICK_BOUNDARIES[1]),
      y2: pickToY(TIER_PICK_BOUNDARIES[2]),
      ...TIER_DEFS[2],
    },
    {
      y1: pickToY(TIER_PICK_BOUNDARIES[2]),
      y2: margin.top + totalChartH,
      ...TIER_DEFS[3],
    },
  ];

  const tierBoundaryYs = TIER_PICK_BOUNDARIES.map(p => pickToY(p));

  // ── Round boundary Y positions (reference lines) ──────────────────────────
  const roundBoundaryYs = ROUND_BOUNDARY_PICKS.map(p => pickToY(p));

  // ── Round label Y positions (centered in each round's pick range) ─────────
  const roundLabelYs: Record<number, number> = {};
  for (let rd = 1; rd <= 7; rd++) {
    roundLabelYs[rd] = pickToY(ROUND_MIDPOINT_PICKS[rd]);
  }

  return {
    svgW, svgH, chartW, totalChartH,
    margin, colWidths, colXMap, sepW,
    tierBandDefs, tierBoundaryYs,
    roundBoundaryYs, roundLabelYs,
    pickToY,
    visiblePositions, hasDefense, hasOffense,
    pillX, pillW,
    udfaZoneY, udfaZoneH: UDFA_ZONE_H,
  };
}

// ── Dot position computation ──────────────────────────────────────────────────

/** Normalized pick-value curve entry — loaded from public/pick_value_curve.json. */
export interface PickValueEntry { pick: number; normalized: number; }

/**
 * Map an ARC score (0–100) to a Y-coordinate within the chart's tier band layout.
 *
 * Score 100 → top of chart (margin.top)
 * Score 0   → bottom of chart (margin.top + totalChartH)
 * null      → center of the below-chart out-of-league zone
 *
 * Linear interpolation across the full chart height matches the tier band layout
 * from lib/tierLabels.ts (thresholds at 75/55/35/12/0 map naturally into the range).
 */
export function scoreToProductionY(score: number | null, layout: ChartLayout): number {
  if (score === null) return layout.udfaZoneY + layout.udfaZoneH / 2
  const clamped = Math.max(0, Math.min(100, score))
  return layout.margin.top + layout.totalChartH * (1 - clamped / 100)
}

/**
 * Converts a player's ST snap percentage to a 0–100 global percentile score.
 * Based on 2026-05-31 analysis of player_seasons.csv (N=8,746 players with ST snaps).
 * Used to position ST-primary players (wavy dot) on the Y-axis instead of
 * their position-normalized primary snap percentile, which understates their
 * career value.
 */
export function stSnapPctToGlobalPercentile(stSnapPct: number): number {
  // Piecewise linear interpolation from empirical distribution.
  const breakpoints: [number, number][] = [
    [0,     0],
    [0.023, 10],
    [0.10,  25],
    [0.18,  50],
    [0.28,  65],
    [0.38,  75],
    [0.62,  90],
    [1.0,   99],
  ];
  for (let i = 1; i < breakpoints.length; i++) {
    const [x0, y0] = breakpoints[i - 1];
    const [x1, y1] = breakpoints[i];
    if (stSnapPct <= x1) {
      const t = (stSnapPct - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return 99;
}

export interface DotPosition {
  player: Player;
  x: number;
  y: number;
  /** Y at Derek's projected rank — always set. */
  projectedY: number;
  /**
   * Y at actual pick slot (Drafted view). For undrafted players this is the
   * UDFA zone center Y (with vertical jitter). Always a number.
   */
  actualY: number;
  /**
   * Pick-value delta (0–100) for dot-size encoding.
   * |pickValueCurve[rank] − pickValueCurve[pick_drafted]|.
   * Undrafted = full delta from projected value to 0.
   * Only meaningful in Drafted view; 0 in Projected view.
   */
  pickValueDelta: number;
  /**
   * Expected pick value (0–100) from pick_value_curve.json for this player's
   * actual draft slot (or virtual pick 257 for undrafted).
   * Used for production dot-size encoding (|USG score − expectedPickValue|).
   */
  expectedPickValue: number;
}



// ── Tier-adjusted position value ──────────────────────────────────────────────

/**
 * Maps a draft pick number to a 0–100 "tier-adjusted" value.
 *
 * Design goals (per Session J):
 *   - Within-round movement produces small deltas (teams have pick preferences).
 *   - Cross-round movement produces meaningfully larger deltas.
 *   - R1 is sub-divided: Elite (1–5), Upper (6–15), Lower (16–32).
 *   - 3-unit gaps at each round boundary ensure even a 1-pick cross-round move
 *     registers as a different tier visually.
 *   - UDFA = 0, enabling graduated "surprise" dots for undrafted players.
 *
 * Piecewise linear scale:
 *   Elite R1  (1–5):    100 → 92  (2.0 units/pick)
 *   Upper R1  (6–15):    91 → 82  (1.0 units/pick)
 *   Lower R1  (16–32):   81 → 73  (0.5 units/pick)
 *   R2        (33–64):   70 → 56  (0.45 units/pick)
 *   R3        (65–96):   53 → 40  (0.42 units/pick)
 *   R4        (97–128):  37 → 28  (0.29 units/pick)
 *   R5        (129–160): 25 → 18  (0.23 units/pick)
 *   R6        (161–192): 15 → 10  (0.16 units/pick)
 *   R7        (193–256):  7 →  3  (0.063 units/pick)
 *   UDFA:                0
 */
export function tierAdjustedValue(pick: number): number {
  // Piecewise linear scale: compresses within-round variation and
  // preserves meaningful jumps at tier/round transitions.
  //
  // Key design decision: big cliff (20 units) between R3 and R4 reflects
  // the real Day 2 / Day 3 draft value drop. R4-R7 are tightly compressed
  // so late-round movement stays visually quiet; R1-R3 movement reads clearly.
  //
  //   Elite R1  (1-5):    100->92  (2.0/pick)
  //   Upper R1  (6-15):    91->82  (1.0/pick)   gap=1 from Elite
  //   Lower R1  (16-32):   81->73  (0.5/pick)   gap=1 from Upper
  //   R2        (33-64):   69->57  (0.39/pick)  gap=4 from R1
  //   R3        (65-96):   52->40  (0.39/pick)  gap=5 from R2
  //   --- Day 2/Day 3 cliff: 20-unit gap ---
  //   R4        (97-128):  32->26  (0.19/pick)  gap=8 from R3  (cliff reduced from 20)
  //   R5        (129-160): 20->14  (0.19/pick)  gap=6 from R4
  //   R6        (161-192): 10->6   (0.13/pick)  gap=4 from R5
  //   R7        (193-256):  4->1   (0.048/pick) gap=2 from R6
  //   UDFA:                 0                   gap=1 from R7
  if (pick <=   5) return 100 - (pick -   1) * (8   /  4);
  if (pick <=  15) return  91 - (pick -   6) * (9   /  9);
  if (pick <=  32) return  81 - (pick -  16) * (8   / 16);
  if (pick <=  64) return  69 - (pick -  33) * (12  / 31);
  if (pick <=  96) return  52 - (pick -  65) * (12  / 31);
  if (pick <= 128) return  32 - (pick -  97) * (6   / 31);   // 32->26, gap=8 from R3
  if (pick <= 160) return  20 - (pick - 129) * (6   / 31);   // 20->14, gap=6 from R4
  if (pick <= 192) return  10 - (pick - 161) * (4   / 31);   // 10->6,  gap=4 from R5
  if (pick <= 256) return   4 - (pick - 193) * (3   / 63);   //  4->1,  gap=2 from R6
  return 0; // UDFA
}


/** Stable integer hash from an arbitrary string (e.g., Airtable record ID). */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Compute SVG (x, y) for every player visible in the current view.
 *
 * Session E: Y = pickToY(rank). X = column center.
 * Session G: Extended with projectedY, actualY, pickValueDelta for animation.
 * Session H:
 *   - Unranked players (rank 0/null) NOW INCLUDED. They sit in the UDFA zone
 *     in Projected view and animate to their actual pick slot (or stay in UDFA)
 *     in Drafted view.
 *   - pickValueDelta is now raw pick delta |pick_drafted - rank| (not curve-weighted).
 *     Undrafted = (257 - rank) for ranked players; 32 for unranked-but-drafted.
 *   - pick_value_curve param retained for future Results view; not used for sizing.
 */
export function computeAllDotPositions(
  players: Player[],
  layout: ChartLayout,
  pickValueCurve?: PickValueEntry[],
): DotPosition[] {
  const { visiblePositions, colXMap, colWidths, pickToY, udfaZoneY, udfaZoneH } = layout;

  const udfaCenterY = udfaZoneY + udfaZoneH / 2;
  const result: DotPosition[] = [];
  const DOT_R = 6;

  visiblePositions.forEach(pos => {
    const colX = colXMap[pos];
    const cW   = colWidths[pos];

    // Include ALL players for this position (ranked and unranked).
    players
      .filter(p => p.pos === pos)
      .forEach(player => {
        const isRanked = (player.rank ?? 0) > 0;

        // Stable hash seed: ranked -> rank integer, unranked -> hash of Airtable ID.
        const hashSeed = isRanked ? player.rank! : hashStr(player.player_id);

        // Deterministic horizontal jitter (triangular, centre-weighted).
        const JITTER_PAD = 10;
        const jitterSpan = Math.max(0, (cW - 2 * JITTER_PAD) * 0.60);
        const h1 = ((hashSeed * 2654435761) >>> 0) / 4294967295;
        const h2 = ((hashSeed * 40503 + 987654321) >>> 0) / 4294967295;
        const jitter = ((h1 + h2) / 2) * jitterSpan - jitterSpan / 2;

        // Vertical hash for UDFA zone placement.
        const hV = ((hashSeed * 1234567891) >>> 0) / 4294967295;

        // ── Projected Y ──────────────────────────────────────────────────
        // Ranked: sits at rank position on continuous axis.
        // Unranked: sits in UDFA zone (Derek didn't project them).
        const projectedY = isRanked
          ? Math.max(
              layout.margin.top + DOT_R,
              Math.min(layout.margin.top + layout.totalChartH - DOT_R, pickToY(player.rank!)),
            )
          : udfaCenterY + (hV - 0.5) * (udfaZoneH * 0.70);

        // ── Actual Y ─────────────────────────────────────────────────────
        // Drafted: animates to actual pick slot.
        // Undrafted: stays in UDFA zone (same vertical hash -> stable position).
        const actualY = (player.pick_drafted != null && player.pick_drafted > 0)
          ? Math.max(
              layout.margin.top + DOT_R,
              Math.min(layout.margin.top + layout.totalChartH - DOT_R, pickToY(player.pick_drafted)),
            )
          : udfaCenterY + (hV - 0.5) * (udfaZoneH * 0.70);

        // ── Tier-adjusted delta for dot-size encoding ─────────────────────────────────
        // Uses a tier-compressed scale so within-round movement stays small
        // while cross-round / cross-tier movement registers meaningfully.
        // Undrafted players get a graduated penalty based on projected tier.
        const projTierValue = isRanked
          ? tierAdjustedValue(player.rank!)
          : 3; // Unranked: treat as bottom of board
        let pickValueDelta = 0;
        if (player.pick_drafted != null && player.pick_drafted > 0) {
          pickValueDelta = Math.abs(projTierValue - tierAdjustedValue(player.pick_drafted));
        } else if (isRanked) {
          // Undrafted ranked player: fell all the way to UDFA (value = 0).
          // High projections produce large dots; late-round UDFAs produce small ones.
          pickValueDelta = projTierValue;
        }
        // Unranked + undrafted: delta stays 0 (not a tracked projection).

        // Expected usage percentile for this player's draft round (tier-band approach).
        // R7 and UDFA both default to 0 — any contribution from those slots is an overperformance.
        const expectedPickValue = player.rd_drafted != null
          ? (ROUND_EXPECTED_PCT[player.rd_drafted] ?? 0)
          : 0;

        result.push({
          player,
          x: colX + cW / 2 + jitter,
          y: projectedY,
          projectedY,
          actualY,
          pickValueDelta,
          expectedPickValue,
        });
      });
  });

  return result;
}
