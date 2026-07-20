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
import type { MoneyBand } from './verdict';
import {
  ACT3_SVG_W, ACT3_SVG_H, ACT3_MAX_PICK, ACT3_MARGIN, ACT3_RIGHT_RAIL,
  ACT3_UDFA_GAP, ACT3_UDFA_W, ACT3_UDFA_SPREAD_PX, ACT3_STRIP_H, ACT3_STRIP_JITTER_PX,
  ACT3_HEADROOM_FRAC, ACT3_WALL_ORDER, ACT3_WALL_NODE_W, ACT3_WALL_GAP,
  ACT3_THREAD_CP_FRAC, ACT3_BANDS, ACT3_TAB_MIN_PITCH,
} from './act3FieldConstants';

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

  // Off/def boundary gap CLOSED (post-E4 leaderlines-boundary brief, Item B): S and RB
  // now butt together. The old 48px empty parchment band read louder than any line and
  // re-fragmented the parchment-unified field. The gate is kept (single-side views were
  // already 0); the brand seam now lives in a header-only gold tick (PositionColumns).
  const SEP_GAP_W = 0; // was 48 — tune on real render (0 = columns butt)
  const sepW = hasDefense && hasOffense ? SEP_GAP_W : 0;
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

  // Sprint 3, Piece 6 — clamped-dot "shelf" jitter. Dots whose rank (Act 1) or pick (Act 2)
  // exceed the pick-256 field bottom get pinned by the Math.min clamp below to ONE line,
  // forming an opaque horizontal pile (measured worst column ≈20 dots; classes 2024–26).
  // ONLY those clamped dots spread UPWARD off the line into a legible shelf (never below it —
  // the dashed UDFA boundary stays clean) + get a modest extra horizontal nudge. Seeded by
  // player_id (stable across renders/classes — no reflow, no Math.random; reuses the Act-3
  // strip / UDFA-gutter deterministic-spread precedent). Hover legibility ONLY: no ranking
  // implication, no opacity/size/shape change. Unclamped dots stay byte-identical.
  const CLAMP_SHELF_BAND_PX = 22;   // vertical spread up from the clamp line (0 → −22px)
  // Horizontal shelf spread is column-relative (Sprint 3 accept): ±7px was too tight for
  // ~20-dot piles. Spread across ~±30% of the dot's own column width, clamped to a sane
  // px window so narrow/wide columns both stay legible without escaping the lane.
  const CLAMP_SHELF_X_FRAC   = 0.30; // half-range as a fraction of column width
  const CLAMP_SHELF_X_MIN_PX = 12;   // floor on the half-range (narrow columns)
  const CLAMP_SHELF_X_MAX_PX = 60;   // ceiling on the half-range (wide columns)
  const clampBottomY = layout.margin.top + layout.totalChartH - DOT_R;

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

        // Clamped-dot shelf offsets (Piece 6) — seeded by player_id, independent of the
        // rank-seeded column jitter above so the shelf spreads even when ranks are adjacent.
        const shelfSeed = hashStr(player.player_id);
        const sV = ((shelfSeed * 2246822519) >>> 0) / 4294967295;             // 0..1 → lift up
        const sX = ((shelfSeed * 3266489917 + 374761393) >>> 0) / 4294967295; // 0..1 → nudge X
        const shelfUp = sV * CLAMP_SHELF_BAND_PX;        // subtracted → 0..−BAND (upward only)
        const shelfHalfX = Math.max(
          CLAMP_SHELF_X_MIN_PX,
          Math.min(CLAMP_SHELF_X_MAX_PX, cW * CLAMP_SHELF_X_FRAC),
        );
        const shelfX  = (sX - 0.5) * 2 * shelfHalfX;     // ±half-range within the column

        // ── Projected Y ──────────────────────────────────────────────────
        // Ranked: sits at rank position on the continuous axis (top-clamped by DOT_R). When
        // rank exceeds the pick-256 field bottom the raw Y overflows the clamp → shelf it up.
        // Unranked: sits in UDFA zone (Derek didn't project them).
        const projRaw = isRanked ? pickToY(player.rank!) : 0;
        const projClamped = isRanked && projRaw > clampBottomY;
        const projectedY = !isRanked
          ? udfaCenterY + (hV - 0.5) * (udfaZoneH * 0.70)
          : projClamped
            ? clampBottomY - shelfUp
            : Math.max(layout.margin.top + DOT_R, projRaw);

        // ── Actual Y ─────────────────────────────────────────────────────
        // Drafted: animates to actual pick slot (shelf when the pick exceeds pick-256).
        // Undrafted: stays in UDFA zone (same vertical hash -> stable position).
        const hasPick = player.pick_drafted != null && player.pick_drafted > 0;
        const actRaw = hasPick ? pickToY(player.pick_drafted!) : 0;
        const actClamped = hasPick && actRaw > clampBottomY;
        const actualY = !hasPick
          ? udfaCenterY + (hV - 0.5) * (udfaZoneH * 0.70)
          : actClamped
            ? clampBottomY - shelfUp
            : Math.max(layout.margin.top + DOT_R, actRaw);

        // A dot piled in EITHER act shares one x (x doesn't animate) → give it the extra
        // horizontal nudge; dots clamped in neither act keep a byte-identical x.
        const clampShelfX = (projClamped || actClamped) ? shelfX : 0;

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
          x: colX + cW / 2 + jitter + clampShelfX,
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

/** Round-start X anchor: the first pick of each round, computed from the class's
 *  OWN pick→round data (compensatory picks shift boundaries by year). */
export interface RoundStartAnchor {
  rd: number;
  pick: number;
  x: number;
  label: string; // 'RD 1' .. 'RD 7'
}

/**
 * Round-start X anchors. The first pick of each round is derived from the class's
 * OWN pick→round data — never hardcoded 33/65/97, since compensatory picks move
 * round boundaries year to year.
 */
function roundStartAnchors(
  players: Player[],
  xScale: (pick: number) => number,
): RoundStartAnchor[] {
  const firstPickByRd = new Map<number, number>();
  for (const p of players) {
    const rd = p.rd_drafted;
    const pk = p.pick_drafted;
    if (rd == null || pk == null || pk <= 0) continue;
    const cur = firstPickByRd.get(rd);
    if (cur == null || pk < cur) firstPickByRd.set(rd, pk);
  }
  return Array.from(firstPickByRd.entries())
    .sort(([a], [b]) => a - b)
    .map(([rd, pick]) => ({ rd, pick, x: xScale(pick), label: `RD ${rd}` }));
}

// ════════════════════════════════════════════════════════════════════════════
//  ACT 3 — REFRAME FIELD (Phase Lambda, Brief 3): the NEW resting field
//
//  X = draft pick (linear, FIXED 1–262) + UDFA gutter · Y = window_usage percentile
//  (top = 100) + too-few-snaps strip + corner · COLOR = six-band money ladder.
//  Wall = six true-count nodes (TOP5→NEVER). Threads = two-register (money/ink).
//
//  Pure layout math only — payer dot color + award glyph are resolved in the
//  Act3Field component (teamDotColors / triangle-wins glyph), keeping color logic
//  in the render layer. This is the sole Act-3 field (the legacy jellyfish render
//  path was removed in Brief 6).
// ════════════════════════════════════════════════════════════════════════════

/** One plotted dot on the Act-3 reframe field. Geometry + band + thread only. */
export interface Act3FieldDot {
  player: Player;
  /** Six-band membership (from the baked money_band). Null = pending-class player
   *  with no signed second contract yet (plots with drafted colors, no thread). */
  band: MoneyBand | null;
  x: number;
  y: number;
  isUDFA: boolean;
  /** Too-few-snaps strip member (window_usage null — passed, not recomputed). */
  isStrip: boolean;
  /** UDFA × too-few-snaps corner cell. */
  isCorner: boolean;
  /** Bezier path dot→wall node (choreography §2 single-cp @62%). Null = no thread. */
  threadPath: string | null;
}

/** One wall node (six always). TRUE-COUNT height — no minimum floor. */
export interface Act3WallNode {
  band: MoneyBand;
  x: number;      // left edge (= wallX)
  y: number;      // top
  h: number;      // ∝ count / fieldCount (true-count)
  cy: number;     // node vertical center
  count: number;
  pct: number;    // share of the plotted field (0–100)
  color: string;
  /** Edge-tab label CENTER y — nudged out to keep ≥ pitch, node itself never moves. */
  tabY: number;
  /** True when a hairline connector should draw from tab back to node (tab was nudged). */
  tabNudged: boolean;
  /** Pending-class band-1 override: the node reads "NOT RE-SIGNED YET" (no threads). */
  isPendingBand1: boolean;
}

export interface Act3FieldLayout {
  version: 'new';
  svgW: number;
  svgH: number;
  margin: { top: number; right: number; bottom: number; left: number };
  /** Usage field vertical extent (usage 100 → fieldTop, usage 0 → fieldBottom). */
  fieldTop: number;
  fieldBottom: number;
  /** Too-few-snaps strip. */
  stripTop: number;
  stripBottom: number;
  /** Pick scale horizontal extent. */
  pickLeft: number;
  pickRight: number;
  /** UDFA gutter band (dots + frame). */
  udfaLeft: number;
  udfaRight: number;
  udfaCenterX: number;
  /** Tier wall. */
  wallX: number;
  wallNodeW: number;
  maxPick: number;
  dots: Act3FieldDot[];
  wallNodes: Act3WallNode[];
  roundAnchors: RoundStartAnchor[];
  /** Plotted population (all dots that carry a band node — matches copy_numbers plotted_pop). */
  fieldCount: number;
  bandCounts: Record<MoneyBand, number>;
  stripCount: number;
  cornerCount: number;
  udfaCount: number;
  isPending: boolean;
}

/** Act-3 thread path — choreography spec §2: cubic bezier with a SINGLE mid-x control
 *  point at 62% of the dot→wall x-distance (`M dot C mx,dotY mx,slotY wallX,slotY`),
 *  identical curve family for every band. */
function act3ThreadPath(x0: number, y0: number, x1: number, y1: number): string {
  const mx = x0 + (x1 - x0) * ACT3_THREAD_CP_FRAC;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${mx.toFixed(1)} ${y0.toFixed(1)}, ${mx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/**
 * Build the Act-3 reframe field for one draft class.
 *
 * Population (banked X AXIS): drafted players + UDFAs who signed with a team. K/P/LS
 * carry a blank money_band (ST positions out of the money market) and are EXCLUDED
 * from the plotted field — matching copy_numbers `plotted_pop`.
 *
 * @param players   the class's player list, each with `.verdict` (money_band) + `.usage`
 * @param isPending true for a mid-window class (some deals unsigned — band-1 relabel,
 *                  unsigned dots carry no thread). Resolved classes = false.
 */
export function computeAct3FieldLayout(players: Player[], isPending: boolean): Act3FieldLayout {
  const svgW = ACT3_SVG_W;
  const svgH = ACT3_SVG_H;
  const margin = { ...ACT3_MARGIN, right: ACT3_RIGHT_RAIL + ACT3_UDFA_W + ACT3_UDFA_GAP + 24 };

  // ── Horizontal regions (L→R: pick scale · axis break · UDFA gutter · wall) ──
  const wallX     = svgW - ACT3_RIGHT_RAIL;
  const udfaRight = wallX - 14;                 // small gap before the wall
  const udfaLeft  = udfaRight - ACT3_UDFA_W;
  const udfaCenterX = (udfaLeft + udfaRight) / 2;
  const pickLeft  = margin.left;
  const pickRight = udfaLeft - ACT3_UDFA_GAP;   // the visible axis break
  const maxPick   = ACT3_MAX_PICK;              // FIXED domain — no per-class stretch
  const xScale = (pick: number): number =>
    pickLeft + ((pick - 1) / (maxPick - 1)) * (pickRight - pickLeft);

  // ── Vertical regions (usage field above, too-few-snaps strip below) ─────────
  const fieldTop    = margin.top;
  const stripBottom = svgH - margin.bottom;
  const stripTop    = stripBottom - ACT3_STRIP_H;
  const fieldBottom = stripTop;                 // usage 0 sits at the strip's top edge
  const bandH       = fieldBottom - fieldTop;
  const headroom    = ACT3_HEADROOM_FRAC * bandH;

  /** window_usage percentile (0–100, top=100) → field Y (px). */
  const usageY = (pctile: number): number =>
    fieldTop + headroom + (1 - pctile / 100) * (bandH - headroom);

  // ── Population: drafted + signed UDFAs; exclude K/P/LS (blank money_band) ────
  const hasPlayed = (p: Player): boolean => (p.usage?.seasons?.length ?? 0) > 0;
  const isSignedUDFA = (p: Player): boolean =>
    !p.drafted && (p.verdict !== null || hasPlayed(p));
  const dotsInput = players.filter(p => {
    if (!(p.drafted || isSignedUDFA(p))) return false;
    // K/P/LS: a contract row exists but money_band is blank (out of the money market)
    // → not one of the six bands → excluded from the plotted field (plotted_pop).
    if (p.verdict !== null && p.verdict.moneyBand === null) return false;
    return true;
  });

  // ── Wall counts (true-count). A plotted dot's node = its money_band; a pending
  //    unsigned dot (no band) falls under the band-1 (NEVER) node's running count. ──
  const bandCounts: Record<MoneyBand, number> =
    { NEVER: 0, ZERO: 0, MIN: 0, MIDDLE: 0, TOP10: 0, TOP5: 0 };
  const nodeBandOf = (p: Player): MoneyBand => p.verdict?.moneyBand ?? 'NEVER';
  for (const p of dotsInput) bandCounts[nodeBandOf(p)]++;
  const fieldCount = dotsInput.length;

  // ── Wall nodes (top→bottom, TOP5→NEVER; heights ∝ true count) ───────────────
  const usableH = (stripBottom - fieldTop) - (ACT3_WALL_ORDER.length - 1) * ACT3_WALL_GAP;
  const wallNodes: Act3WallNode[] = [];
  let cursorY = fieldTop;
  for (const band of ACT3_WALL_ORDER) {
    const count = bandCounts[band];
    const h = fieldCount > 0 ? (count / fieldCount) * usableH : 0;
    wallNodes.push({
      band,
      x: wallX,
      y: cursorY,
      h,
      cy: cursorY + h / 2,
      count,
      pct: fieldCount > 0 ? Math.round((count / fieldCount) * 100) : 0,
      color: ACT3_BANDS[band].color,
      tabY: cursorY + h / 2,      // provisional; nudged below
      tabNudged: false,
      isPendingBand1: isPending && band === 'NEVER',
    });
    cursorY += h + ACT3_WALL_GAP;
  }
  // Edge-tab collision: keep ≥ min pitch, LABEL nudges (node never moves). One forward
  // pass pushing each tab down to clear the previous; a tiny node can't pin two tabs.
  for (let i = 1; i < wallNodes.length; i++) {
    const prev = wallNodes[i - 1].tabY;
    const n = wallNodes[i];
    if (n.tabY - prev < ACT3_TAB_MIN_PITCH) {
      n.tabY = prev + ACT3_TAB_MIN_PITCH;
      // A connector only earns its ink when the label was pushed CLEAR of its own
      // node. A small nudge (e.g. 2022 TOP-10-AT-POSITION: a 7px shove off the gold
      // tab) leaves the tab still overlapping its node — no leader is needed, and
      // the lone band-color diagonal reads as a stray thread near the wall. Draw
      // it only once the tab center clears the node's bottom edge. (Distinct from
      // the count===0 empty-node suppression below, which still applies.)
      n.tabNudged = n.tabY > n.y + n.h;
    }
  }
  const wallNodeByBand = new Map(wallNodes.map(n => [n.band, n]));

  // ── Round-start X anchors (per-class real round data, fixed xScale) ─────────
  const roundAnchors = roundStartAnchors(dotsInput, xScale);

  // ── Dots (positions + band + strip/corner flags; threads filled after comb) ─
  const building: Act3FieldDot[] = [];
  let stripCount = 0, cornerCount = 0, udfaCount = 0;
  for (const p of dotsInput) {
    const band = p.verdict?.moneyBand ?? null;
    const isUDFA = p.pick_drafted == null || p.pick_drafted <= 0;
    const isStrip = (p.usage?.stripMember ?? true); // no usage row ⇒ strip
    const isCorner = isUDFA && isStrip;
    if (isUDFA) udfaCount++;
    if (isStrip) stripCount++;
    if (isCorner) cornerCount++;

    // X — UDFA dots fan out deterministically in the gutter; else the pick scale.
    const seed = (hashStr(p.player_id) % 1000) / 1000 - 0.5; // [-0.5, 0.5)
    const x = isUDFA
      ? udfaCenterX + seed * ACT3_UDFA_SPREAD_PX
      : xScale(p.pick_drafted as number);

    // Y — strip members jitter within the strip band; else the usage percentile.
    let y: number;
    if (isStrip) {
      const seedY = (hashStr(p.player_id + '#y') % 1000) / 1000 - 0.5;
      y = (stripTop + stripBottom) / 2 + seedY * ACT3_STRIP_JITTER_PX;
    } else {
      const pctile = p.usage?.windowUsagePercentile ?? 0;
      y = usageY(pctile);
    }

    building.push({ player: p, band, x, y, isUDFA, isStrip, isCorner, threadPath: null });
  }

  // ── Threads — money + ink (resolved); pending unsigned + pending band-1 carry
  //    NO thread. Slot-comb within each node: threaded dots sorted by field-y. ──
  const threadedByBand = new Map<MoneyBand, Act3FieldDot[]>();
  for (const d of building) {
    // A dot threads iff it has a real band. Pending unsigned (band null) → no thread.
    // Pending band-1 (NEVER) threads only exist after graduation → suppress when pending.
    if (d.band === null) continue;
    if (isPending && d.band === 'NEVER') continue;
    const list = threadedByBand.get(d.band) ?? [];
    list.push(d);
    threadedByBand.set(d.band, list);
  }
  threadedByBand.forEach((list, band) => {
    const node = wallNodeByBand.get(band);
    if (!node) return;
    const sorted = [...list].sort((a, b) => a.y - b.y);
    sorted.forEach((d, i) => {
      const targetY = node.y + ((i + 0.5) / sorted.length) * node.h;
      d.threadPath = act3ThreadPath(d.x, d.y, node.x, targetY);
    });
  });

  return {
    version: 'new',
    svgW, svgH, margin,
    fieldTop, fieldBottom, stripTop, stripBottom,
    pickLeft, pickRight,
    udfaLeft, udfaRight, udfaCenterX,
    wallX, wallNodeW: ACT3_WALL_NODE_W, maxPick,
    dots: building, wallNodes, roundAnchors,
    fieldCount, bandCounts, stripCount, cornerCount, udfaCount,
    isPending,
  };
}
