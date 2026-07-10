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

import type { Player, UsageProfile } from './sheets';
import { BAND_ASSIGNMENTS, POSITIONS, POSITION_ORDER, ROUND_EXPECTED_PCT, TIER_DEFS } from './chartConstants';
import type { ContractTier, Verdict, MoneyBand } from './verdict';
import {
  ACT3_SVG_W, ACT3_SVG_H, ACT3_MAX_PICK, ACT3_MARGIN, ACT3_RIGHT_RAIL,
  ACT3_UDFA_GAP, ACT3_UDFA_W, ACT3_UDFA_SPREAD_PX, ACT3_STRIP_H, ACT3_STRIP_JITTER_PX,
  ACT3_HEADROOM_FRAC, ACT3_WALL_ORDER, ACT3_WALL_NODE_W, ACT3_WALL_GAP,
  ACT3_THREAD_CP_FRAC, ACT3_BANDS, ACT3_TAB_MIN_PITCH,
} from './act3FieldConstants';
import {
  PAID_REGION_BOTTOM, PROVE_IT_STRIP_Y, NONE_STRIP_Y, STRIP_JITTER_PX,
  PROVE_IT_PLACEMENT, PROVE_IT_BAND_TOP, PROVE_IT_BAND_BOTTOM,
  PROVE_IT_REF_SHARE, PROVE_IT_BAND_CURVE,
  WALL_TIER_ORDER, WALL_NODE_W, WALL_GAP, WALL_MIN_NODE_H, WALL_RIGHT_PAD,
  TIER_THREAD_COLOR,
  LANE_PX, LANE_EDGE_JITTER_PX, ST_CEILING, GUTTER_SPREAD_PX,
  PENDING_HEADROOM_FRAC, COULDNT_STICK_STRIP_TOP_FRAC,
  ZONE_TAB_INSET_PX, ZONE_TAB_H, LANE_TAB_PAD,
  USAGE_TIER_THRESHOLDS,
} from './act3Constants';

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

// ════════════════════════════════════════════════════════════════════════════
//  ACT 3 — RESOLVED JELLYFISH FIELD (verdict brief b)
//  Pure layout only: capital-X, √(verdict_share) Y, floor strips, tier wall,
//  combed threads. No SVG, no population/percentile data (that's lib/sheets.ts).
// ════════════════════════════════════════════════════════════════════════════

/** Median of a numeric list (null when empty). */
function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** sqrt(verdict_share) → Y fraction within the PAID region [0 (top) .. PAID_REGION_BOTTOM]. */
function paidShareToYFraction(share: number): number {
  const clamped = Math.max(0, Math.min(1, share));
  return (1 - Math.sqrt(clamped)) * PAID_REGION_BOTTOM;
}

/**
 * Brief 3 (render-gated): resolve a PROVE IT dot's Y fraction from its real
 * verdict_share instead of the fixed PROVE_IT_STRIP_Y. A null share resolves to 0
 * (the floor) — deliberately NOT the paid tiers' tierMedianShare imputation; a
 * PROVE IT unknown defaults DOWN, not to a tier median. Mode chosen by
 * PROVE_IT_PLACEMENT; NONE is unaffected (stays on its strip).
 */
function proveItYFraction(verdictShare: number | null): number {
  const share = verdictShare ?? 0;
  if (PROVE_IT_PLACEMENT === 'continuous') {
    // One true scale: PROVE IT rides the same √-share map as the paid tiers. A high
    // share rises to BRIDGE/SOLID HEIGHT; the thread still pulls back to the PROVE IT
    // wall node, so tier identity is carried by the destination, not the height.
    return paidShareToYFraction(share);
  }
  // 'subband': a dedicated low band that spreads by share but never enters paid territory.
  const ref = PROVE_IT_REF_SHARE > 0 ? share / PROVE_IT_REF_SHARE : 0;
  const clamped = Math.max(0, Math.min(1, ref));
  const t = PROVE_IT_BAND_CURVE === 'sqrt' ? Math.sqrt(clamped) : clamped;
  return PROVE_IT_BAND_BOTTOM - t * (PROVE_IT_BAND_BOTTOM - PROVE_IT_BAND_TOP);
}

/** Class-local context the Y strategy needs (e.g. per-tier median share for ST null-share imputation). */
export interface JellyfishYContext {
  /** Median verdict_share within the rendered class, per paid tier. */
  tierMedianShare: Partial<Record<ContractTier, number>>;
}

/**
 * Generalized Y-strategy input (brief c, Part 1a). The resolved field maps from a
 * Verdict; the pending field maps from a UsageProfile. One strategy signature
 * carries both so the field is genuinely swappable. computeJellyfishLayout already
 * iterates players that carry both `.verdict` and `.usage`.
 */
export interface JellyfishYInput {
  verdict: Verdict | null;
  usage: UsageProfile | null;
}

/**
 * Y-fraction strategy: input → [0 (top) .. 1 (bottom)] of the plotting band.
 * SWAPPABLE — resolved = verdict-share √ scale; pending = usage-percentile
 * waterfall (pendingUsageYStrategy below).
 */
export type JellyfishYStrategy = (input: JellyfishYInput, ctx: JellyfishYContext) => number;

export const resolvedShareYStrategy: JellyfishYStrategy = (input, ctx) => {
  // 1a behavior-preserving adaptation: read the verdict off the generalized input.
  // The resolved field only ever feeds verdict-bearing dots; guard defensively.
  const v = input.verdict;
  if (!v) return NONE_STRIP_Y;
  if (v.tier === 'NONE')     return NONE_STRIP_Y;     // lowest floor strip — UNCHANGED in both PROVE IT modes
  if (v.tier === 'PROVE_IT') return proveItYFraction(v.verdictShare); // Brief 3: spread by share (was PROVE_IT_STRIP_Y)
  // Paid tier (BRIDGE/SOLID/PREMIUM): continuous √-share region.
  // ST specialists carry a null share (no market line) → impute the tier's
  // class-local median share as a PLOTTING coordinate only (membership exact,
  // position approximate). Never rendered as a share number.
  const share = v.verdictShare ?? ctx.tierMedianShare[v.tier] ?? 0;
  return paidShareToYFraction(share);
};

export interface JellyfishDot {
  player: Player;
  /** Null for a join-failure "data-gap" dot (drafted resolved-class player, no row). */
  verdict: Verdict | null;
  tier: ContractTier | null;
  x: number;
  y: number;
  isDataGap: boolean;
  isUDFA: boolean;
  /** Bezier path dot→wall node, slot-combed within its tier. Null for data-gap dots. */
  threadPath: string | null;
  threadColor: string;
}

export interface JellyfishWallNode {
  tier: ContractTier;
  x: number;        // left edge
  y: number;        // top
  h: number;
  cy: number;       // vertical center (used for label placement)
  count: number;
  pct: number;      // share of the field universe (verdict dots)
  color: string;
  label: string;
}

/** Round-start X anchor (Part 6b): the first pick of each round, computed from
 *  the class's OWN pick→round data (compensatory picks shift boundaries by year).
 *  Shared by all three field modes. */
export interface JellyfishRoundAnchor {
  rd: number;
  pick: number;
  x: number;
  label: string; // 'RD 1' .. 'RD 7'
}

/** A labeled zone boundary in the pending field (Part 3). */
export interface PendingZone {
  label: string;            // 'STARTER' | 'ROLE PLAYER' | 'FRINGE' | "COULDN'T STICK"
  y: number;                // boundary LINE Y (px) — drawn only when hasLine
  tabY: number;             // edge-tab CENTER Y (px) — just inside the zone's top (Part 2 grammar)
  count: number;            // live count of dots in the zone (counts on ALL tabs)
  hasLine: boolean;         // FRINGE is a tab-only label (no horizontal divider)
  dashed: boolean;          // the COULDN'T STICK strip top edge
  tint: boolean;            // navy-tint tab rect; false for the strip tab (text+bar only, Part 3)
  /** Render the `· {count}` suffix (default true). Rider 1 resolved Y-tabs set false —
   *  they are LABELS ONLY (no count, no boundary line). */
  showCount?: boolean;
}

export interface JellyfishLayout {
  svgW: number;
  svgH: number;
  margin: { top: number; right: number; bottom: number; left: number };
  bandTop: number;
  bandH: number;
  maxPick: number;
  /** Left edge of the tier wall (thread target X). */
  wallX: number;
  wallNodeW: number;
  dots: JellyfishDot[];
  wallNodes: JellyfishWallNode[];
  /** N — size of the field universe (verdict dots; excludes data-gap). */
  fieldCount: number;
  /** Count of explicit NONE verdicts in the class (hover denominator). */
  noneCount: number;
  /** Count of muted data-gap (join-failure) dots rendered. */
  dataGapCount: number;
  /** Y-fraction strips, exposed so the field can label/separate floor regions. */
  proveItStripY: number;
  noneStripY: number;

  // ── Brief c additions ─────────────────────────────────────────────────────
  /** Which field this layout describes; JellyfishField branches off it. */
  mode: 'resolved' | 'pending' | 'floor';
  /** Round-start X anchors (ride-along — both field modes). */
  roundAnchors: JellyfishRoundAnchor[];
  /** Pending-field zone boundaries + edge-tab labels (pending mode only). */
  zones?: PendingZone[];
  /** Top edge (px) of the COULDN'T STICK strip (pending mode only). */
  stripTopY?: number;
  /** Count of qualified dots that fell to the strip via the null-percentile
   *  fail-safe (Step-0 data failures, console.warned). 0 for healthy data. */
  warnCount?: number;
  /** Floor Y (px) the drafted class is pinned to (floor mode only). */
  floorY?: number;
  /** Static scoreboard label, e.g. 'FIRST SNAPS — SEPTEMBER 2026' (floor mode). */
  scoreboardText?: string;

  // ── Brief d riders ────────────────────────────────────────────────────────
  // (Rider 1 resolved-field left-edge Y-label tabs were removed in Brief 2 Item 4 —
  //  the left-edge axis title + right-axis wall tabs are the single label home now.)
  /** Rider 3 — pending tier nodes for already-signed players (pending mode only).
   *  The subset of the 5 tiers present among signed pending players; signed dots get
   *  a reaching thread (dot.threadPath) from their UNMOVED usage-Y up to these nodes. */
  reachNodes?: JellyfishWallNode[];
}

const JELLYFISH_SVG_W = 1600;
const JELLYFISH_SVG_H = 960;

// ── Shared field helpers (resolved + pending + floor) ─────────────────────────

/**
 * Round-start X anchors (Part 6b ride-along). The first pick of each round is
 * derived from the class's OWN pick→round data — never hardcoded 33/65/97, since
 * compensatory picks move round boundaries year to year.
 */
function jellyfishRoundAnchors(
  players: Player[],
  xScale: (pick: number) => number,
): JellyfishRoundAnchor[] {
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

/**
 * Deterministic UDFA-gutter X offset (Part 6b), seeded by player_id so dots are
 * stable across renders (no reflow). Shared by both gutters.
 */
function gutterDotX(gutterX: number, playerId: string): number {
  const t = (hashStr(playerId) % 1000) / 1000 - 0.5; // [-0.5, 0.5)
  return gutterX + t * GUTTER_SPREAD_PX;
}

/**
 * Build the resolved jellyfish layout for one resolved draft class.
 *
 * Universe (ONE definition, per a2): verdict dots (contract-row players ≡
 * "played a snap") plus drafted-no-verdict data-gap dots (join failures). An
 * undrafted player with no row never snapped and is excluded.
 *
 * @param players  the full resolved-class player list, each with `.verdict` joined
 * @param yStrategy swappable Y mapping (default: verdict-share √ + floor strips)
 */
export function computeJellyfishLayout(
  players: Player[],
  yStrategy: JellyfishYStrategy = resolvedShareYStrategy,
): JellyfishLayout {
  // Brief 2 Item 3 + follow-up: top 72 → 44 → 24. The descriptive subhead AND the
  // on-canvas field title are now off the canvas (subhead → Reads & Keys, title removed
  // entirely), so NOTHING renders above bandTop — the band can start near the very top
  // of the field. Tune on render.
  const margin = { top: 24, right: WALL_RIGHT_PAD, bottom: 56, left: 80 };
  const svgW = JELLYFISH_SVG_W;
  const svgH = JELLYFISH_SVG_H;
  const bandTop = margin.top;
  const bandH = svgH - margin.top - margin.bottom;

  // Field universe: verdict dots + drafted-no-verdict data-gaps.
  const dotsInput = players.filter(p => p.verdict !== null || p.drafted);
  const verdictPlayers = dotsInput.filter(p => p.verdict !== null);

  // X domain — class's actual max pick (do NOT hardcode 256; 2021 ran to 259).
  const picks = dotsInput
    .map(p => p.pick_drafted)
    .filter((x): x is number => x != null && x > 0);
  const maxPick = picks.length ? Math.max(...picks) : 256;

  // L→R: pick scale · UDFA gutter · tier wall (far right margin).
  const wallX     = svgW - margin.right;
  const gutterX   = wallX - 42;            // UDFA dots column
  const pickLeft  = margin.left;
  const pickRight = gutterX - 34;          // right edge of the pick scale
  const xScale = (pick: number): number =>
    maxPick <= 1
      ? pickLeft
      : pickLeft + ((pick - 1) / (maxPick - 1)) * (pickRight - pickLeft);

  // Round-start X anchors (ride-along — shared with the pending/floor fields).
  const roundAnchors = jellyfishRoundAnchors(dotsInput, xScale);

  // Class-local per-tier median share (for ST null-share imputation).
  const tierMedianShare: Partial<Record<ContractTier, number>> = {};
  (['BRIDGE', 'SOLID', 'PREMIUM'] as ContractTier[]).forEach(tier => {
    const shares = verdictPlayers
      .filter(p => p.verdict!.tier === tier && p.verdict!.verdictShare != null)
      .map(p => p.verdict!.verdictShare as number);
    const med = median(shares);
    if (med !== null) tierMedianShare[tier] = med;
  });
  const yCtx: JellyfishYContext = { tierMedianShare };

  // ── Wall nodes ─────────────────────────────────────────────────────────────
  const tierCounts = new Map<ContractTier, number>();
  for (const p of verdictPlayers) {
    const t = p.verdict!.tier;
    tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1);
  }
  const fieldCount = verdictPlayers.length;

  const usableH = bandH - (WALL_TIER_ORDER.length - 1) * WALL_GAP;
  const wallNodes: JellyfishWallNode[] = [];
  let cursorY = bandTop;
  for (const tier of WALL_TIER_ORDER) {
    const count = tierCounts.get(tier) ?? 0;
    const h = Math.max(WALL_MIN_NODE_H, fieldCount > 0 ? (count / fieldCount) * usableH : 0);
    wallNodes.push({
      tier,
      x: wallX,
      y: cursorY,
      h,
      cy: cursorY + h / 2,
      count,
      pct: fieldCount > 0 ? Math.round((count / fieldCount) * 100) : 0,
      color: TIER_THREAD_COLOR[tier],
      label: tier.replace('_', ' '),
    });
    cursorY += h + WALL_GAP;
  }
  const wallNodeByTier = new Map(wallNodes.map(n => [n.tier, n]));

  // ── Dots (positions + tier; threads filled after slot-combing) ──────────────
  const building: JellyfishDot[] = [];

  for (const p of dotsInput) {
    const v = p.verdict;
    const isUDFA = p.pick_drafted == null || p.pick_drafted <= 0;
    // Gutter-spread ride-along (Part 6b): UDFA dots fan out deterministically.
    const x = isUDFA ? gutterDotX(gutterX, p.player_id) : xScale(p.pick_drafted as number);
    // Deterministic per-dot jitter seed (stable across renders).
    const seed = (hashStr(p.player_id) % 1000) / 1000 - 0.5; // [-0.5, 0.5)

    if (v === null) {
      // Data-gap (join failure): muted, mid-band, no thread, no tier.
      const y = bandTop + 0.5 * bandH + seed * STRIP_JITTER_PX * 2;
      building.push({
        player: p, verdict: null, tier: null, x, y,
        isDataGap: true, isUDFA, threadPath: null, threadColor: '',
      });
      continue;
    }

    let yFrac = yStrategy({ verdict: v, usage: p.usage ?? null }, yCtx);
    // Floor strips and ST null-share rows are co-linear — add a small deterministic
    // jitter so the flat row doesn't read as an artifact (X = capital still separates).
    const isFloor = v.tier === 'NONE' || v.tier === 'PROVE_IT';
    const isImputed = (v.tier === 'BRIDGE' || v.tier === 'SOLID' || v.tier === 'PREMIUM') && v.verdictShare == null;
    if (isFloor || isImputed) {
      yFrac += (seed * STRIP_JITTER_PX) / bandH;
    }
    building.push({
      player: p, verdict: v, tier: v.tier, x, y: bandTop + yFrac * bandH,
      isDataGap: false, isUDFA, threadPath: null,
      threadColor: TIER_THREAD_COLOR[v.tier],
    });
  }

  // ── Threads — slot-comb within each tier, sorted by field-Y ──────────────────
  const byTier = new Map<ContractTier, JellyfishDot[]>();
  for (const d of building) {
    if (d.verdict === null) continue;
    const list = byTier.get(d.verdict.tier) ?? [];
    list.push(d);
    byTier.set(d.verdict.tier, list);
  }
  byTier.forEach((list, tier) => {
    const node = wallNodeByTier.get(tier);
    if (!node) return;
    const sorted = [...list].sort((a, b) => a.y - b.y);
    sorted.forEach((d, i) => {
      const targetY = node.y + ((i + 0.5) / sorted.length) * node.h;
      d.threadPath = jellyfishThreadPath(d.x, d.y, node.x, targetY);
    });
  });

  const dots: JellyfishDot[] = building;

  // Floor-strip Y coordinates. Brief 2 Item 4: the left-edge Y-label tabs (Rider 1) are
  // GONE — the left-edge axis title names the Y dimension and the right-axis wall tabs +
  // descriptors are the single label home. NONE keeps its dot strip (noneStripY); the
  // PROVE IT strip is orphaned by Brief 3's continuous placement (kept here only as the
  // unchanged-mode fallback coordinate — the render no longer draws its strip).
  const proveItStripY = bandTop + PROVE_IT_STRIP_Y * bandH;
  const noneStripY    = bandTop + NONE_STRIP_Y * bandH;

  return {
    svgW, svgH, margin, bandTop, bandH, maxPick,
    wallX, wallNodeW: WALL_NODE_W,
    dots, wallNodes,
    fieldCount,
    noneCount: tierCounts.get('NONE') ?? 0,
    dataGapCount: building.filter(d => d.isDataGap).length,
    proveItStripY,
    noneStripY,
    mode: 'resolved',
    roundAnchors,
  };
}

/** Horizontal S-curve bezier from a dot to its wall node. */
function jellyfishThreadPath(x0: number, y0: number, x1: number, y1: number): string {
  const dx = x1 - x0;
  const cx1 = x0 + dx * 0.42;
  const cx2 = x0 + dx * 0.72;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${cx1.toFixed(1)} ${y0.toFixed(1)}, ${cx2.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

// ════════════════════════════════════════════════════════════════════════════
//  ACT 3 — PENDING USAGE FIELD + CAPITAL FLOOR (brief c)
//  Usage-percentile Y (the waterfall), the zone system, and the 2026 floor state.
//  Shares X-axis + gutter + svg geometry with the resolved field; adds zones.
// ════════════════════════════════════════════════════════════════════════════

const STARTER_PCT = USAGE_TIER_THRESHOLDS[0].min; // 65 — TRUE percentile threshold
const ROLE_PCT    = USAGE_TIER_THRESHOLDS[1].min; // 25 — TRUE percentile threshold

/**
 * Strip label (Voice sweep §4). The pending strip now always reads "TOO FEW SNAPS"
 * (unranked register) — the maturity-gated "COULDN'T STICK" verdict language is retired
 * here; the deferred metric-accuracy pass owns any future verdict wording. Param kept
 * for call-site stability.
 */
function stripLabelForClass(_players: Player[]): string {
  return "TOO FEW SNAPS";
}

/**
 * Map a percentile (0–100) into the usage-body Y-fraction. The body spans
 * [PENDING_HEADROOM_FRAC .. COULDNT_STICK_STRIP_TOP_FRAC]; 100 → just below the
 * top headroom, 0 → the strip's top edge. The zone lines (P65/P25) land at their
 * TRUE percentile positions through this same mapping.
 */
function bodyPercentileToYFraction(pct: number): number {
  const clamped = Math.max(0, Math.min(100, pct));
  const top = PENDING_HEADROOM_FRAC;
  const bottom = COULDNT_STICK_STRIP_TOP_FRAC;
  return top + (1 - clamped / 100) * (bottom - top);
}

/** Vertical center of the COULDN'T STICK strip (Y-fraction). */
function couldntStickCenterYFraction(): number {
  return (COULDNT_STICK_STRIP_TOP_FRAC + 1) / 2;
}

const EMPTY_Y_CTX: JellyfishYContext = { tierMedianShare: {} };

/**
 * Pending Y-resolution WATERFALL (Part 2). Every pending dot gets its Y from
 * EXACTLY ONE path, evaluated top to bottom.
 */
export const pendingUsageYStrategy: JellyfishYStrategy = (input) => {
  const u = input.usage;

  // STEP 1 — ST-primary. SEAM REQ 1: the career-ST ≥ 50 floor SUBSTITUTES for
  // MIN_GAMES qualification — an ST-primary player with usage_qualified == false
  // STILL gets his ST-percentile Y and is NEVER routed to step 3 (50 ST snaps is a
  // real sample; without this a future "fix" dumps gunners in the strip). Anchor:
  // beau-brade-s-mar-2024 (ST 400 / scrim 12 / qualified FALSE).
  if (u && u.stPrimary) {
    // Rescale the global ST percentile [0,100] → [0,ST_CEILING] (RESCALE, not
    // clamp), then place at that visual height. Rescaled-45 lands at P45 visual
    // height (mid Role Player) = "elite special-teamer = top role player, never a
    // starter by volume." ST is woven INTO the usage body, NOT a separate band.
    // SEAM REQ 2: the rescaled value is a PLOTTING COORDINATE ONLY, never displayed;
    // the hover shows the RAW stPercentile labeled as an ST percentile.
    const rescaled = ((u.stPercentile ?? 0) / 100) * ST_CEILING;
    return bodyPercentileToYFraction(rescaled);
  }

  // STEP 2 — qualified usage. careerUsagePercentile maps into the usage body;
  // the zone thresholds keep TRUE percentiles (P65 Starter / P25 Role).
  if (u && u.qualified && u.careerUsagePercentile != null) {
    return bodyPercentileToYFraction(u.careerUsagePercentile);
  }

  // STEP 3 — unqualified (or no usage) → the COULDN'T STICK strip, unranked.
  // GATE-1 FIX: a *qualified* player with a null careerUsagePercentile is a Step-0
  // data failure, not an expected state — he fails safe here, but the LAYOUT also
  // console.warns his player_id (do not silently strip a starter).
  return couldntStickCenterYFraction();
};

// ── No-fire lanes (Part 3) ────────────────────────────────────────────────────

/**
 * A boundary a no-fire lane protects. The ABOVE-side reach is always LANE_PX/2 (keep
 * dots off the line). The BELOW-side reach defaults to LANE_PX/2 but is widened (via
 * `below`) under any line that carries a tab just beneath it, so the lane extends
 * past the tab text (Brief c.2 Part 4 — lanes follow the text).
 *   - `oneSidedUp`   = borders the fill below it (strip's dashed top): push dots UP
 *     into the open field only; the strip interior is left untouched.
 *   - `oneSidedDown` = borders the open field below it (the STARTER tab at the field
 *     top): push dots DOWN past the tab only; nothing sits above the field top.
 */
export interface NoFireBoundary {
  y: number;
  oneSidedUp?: boolean;
  oneSidedDown?: boolean;
  below?: number; // below-side reach (px); defaults to LANE_PX/2
}

/** Optional deterministic in-lane jitter (px), seeded by player_id. 0 disables. */
function laneJitter(playerId: string): number {
  if (LANE_EDGE_JITTER_PX === 0) return 0;
  return ((hashStr(playerId) % 1000) / 1000) * LANE_EDGE_JITTER_PX;
}

/**
 * Push any dot landing inside a boundary's lane to the lane edge on its TRUE side —
 * membership never flips (Y is monotonic in percentile, so pixel side == membership
 * side). The above edge is always LANE_PX/2; the below edge widens to clear tab text.
 * Tie (exactly on a two-sided line) → up, matching pct>=threshold membership. Its OWN
 * pure function, knobbed by LANE_PX / LANE_EDGE_JITTER_PX. Mutates dot.y in place.
 */
export function applyNoFireLanes(dots: JellyfishDot[], boundaries: NoFireBoundary[]): void {
  const half = LANE_PX / 2;
  for (const d of dots) {
    for (const b of boundaries) {
      const below = b.below ?? half;
      const dist = d.y - b.y; // <0 above, >0 below
      if (b.oneSidedUp) {
        // Open field above, fill below: dots within the above reach push UP; dots
        // already inside the fill (dist > 0) stay put. A dot exactly on the line
        // (dist == 0) is pushed up (membership = pct>=threshold = the zone above).
        if (dist <= 0 && dist > -half) d.y = b.y - half - laneJitter(d.player.player_id);
      } else if (b.oneSidedDown) {
        // Open field below only: dots within the below reach push DOWN past the tab.
        if (dist >= 0 && dist < below) d.y = b.y + below + laneJitter(d.player.player_id);
      } else {
        // Two-sided: snap to the nearer edge on the side the dot is already on.
        if (dist <= 0 && dist > -half)      d.y = b.y - half - laneJitter(d.player.player_id);
        else if (dist > 0 && dist < below)  d.y = b.y + below + laneJitter(d.player.player_id);
      }
    }
  }
}

// ── Pending field layout (Parts 2–3, 6b) ──────────────────────────────────────

export function computePendingFieldLayout(players: Player[]): JellyfishLayout {
  // Brief 2 Item 3 + follow-up: top 72 → 44 → 24. The descriptive subhead AND the
  // on-canvas field title are now off the canvas (subhead → Reads & Keys, title removed
  // entirely), so NOTHING renders above bandTop — the band can start near the very top
  // of the field. Tune on render.
  const margin = { top: 24, right: WALL_RIGHT_PAD, bottom: 56, left: 80 };
  const svgW = JELLYFISH_SVG_W;
  const svgH = JELLYFISH_SVG_H;
  const bandTop = margin.top;
  const bandH = svgH - margin.top - margin.bottom;

  // Field universe (same "played a snap" rule as resolved): drafted players +
  // UDFAs who earned a snap (Universal gutter rule — a UDFA earns his dot when he
  // earns a snap). A drafted pick always renders.
  const dotsInput = players.filter(p => p.drafted || (p.usage?.seasons?.length ?? 0) > 0);

  const picks = dotsInput.map(p => p.pick_drafted).filter((x): x is number => x != null && x > 0);
  const maxPick = picks.length ? Math.max(...picks) : 256;

  const wallX     = svgW - margin.right;
  const gutterX   = wallX - 42;
  const pickLeft  = margin.left;
  const pickRight = gutterX - 34;
  const xScale = (pick: number): number =>
    maxPick <= 1 ? pickLeft : pickLeft + ((pick - 1) / (maxPick - 1)) * (pickRight - pickLeft);
  const roundAnchors = jellyfishRoundAnchors(dotsInput, xScale);

  const fracToY = (f: number): number => bandTop + f * bandH;
  const stripTopY = fracToY(COULDNT_STICK_STRIP_TOP_FRAC);

  // ── Dots: waterfall Y (px), strip jitter, then no-fire displacement ─────────
  let warnCount = 0;
  const building: JellyfishDot[] = [];
  for (const p of dotsInput) {
    const u = p.usage ?? null;
    // Surface the Step-0 fail-safe: a qualified player with a null percentile who is
    // NOT ST-primary should never silently land in the strip.
    if (u && u.qualified && u.careerUsagePercentile == null && !u.stPrimary) {
      console.warn(
        `[pending] qualified player has null careerUsagePercentile — routed to COULDN'T STICK as a fail-safe (Step-0 data failure, investigate): ${p.player_id}`,
      );
      warnCount++;
    }
    const isUDFA = p.pick_drafted == null || p.pick_drafted <= 0;
    const x = isUDFA ? gutterDotX(gutterX, p.player_id) : xScale(p.pick_drafted as number);

    let yFrac = pendingUsageYStrategy({ verdict: null, usage: u }, EMPTY_Y_CTX);
    // Co-linear strip dots: tiny deterministic jitter so a flat row doesn't read as
    // an artifact (X = pick still separates). Strip dots only.
    if (yFrac >= COULDNT_STICK_STRIP_TOP_FRAC) {
      const seed = (hashStr(p.player_id) % 1000) / 1000 - 0.5;
      yFrac += (seed * STRIP_JITTER_PX) / bandH;
    }
    building.push({
      player: p, verdict: null, tier: null, x, y: fracToY(yFrac),
      isDataGap: false, isUDFA, threadPath: null, threadColor: '',
    });
  }

  // ── Zone counts (by the dot's pre-displacement visual zone) ─────────────────
  const headroomTopY = fracToY(PENDING_HEADROOM_FRAC); // field top (above STARTER)
  const starterLineY = fracToY(bodyPercentileToYFraction(STARTER_PCT)); // P65 line
  const roleLineY    = fracToY(bodyPercentileToYFraction(ROLE_PCT));    // P25 line

  let nStarter = 0, nRole = 0, nFringe = 0, nStrip = 0;
  for (const d of building) {
    // Membership convention is pct >= threshold → the UPPER zone (USAGE_TIER_THRESHOLDS
    // Starter min:65 / Role min:25; matches usageTierLabel and the no-fire-lane tie
    // rule "tie → up"). The boundaries are therefore INCLUSIVE on the upper side, so a
    // dot exactly on the P65 line is a STARTER. This makes the STARTER edge-tab equal
    // the scoreboard's becameStartersCount (careerUsagePercentile >= 65) — brief d
    // ruling 4 coherence. (No dot moves; only the zone COUNT boundary is inclusive.)
    if (d.y <= starterLineY)     nStarter++;
    else if (d.y <= roleLineY)   nRole++;
    else if (d.y <= stripTopY)   nFringe++; // a dot EXACTLY on the strip top is Fringe, not strip
    else                         nStrip++;
  }

  // Tab grammar (Part 2): every tab sits just INSIDE THE TOP of the zone it names.
  // Boundary LINES stay at P65 / P25 / strip-top; only the labels move under them.
  const stripLabel = stripLabelForClass(players);
  const zones: PendingZone[] = [
    { label: 'STARTER',     y: starterLineY, tabY: headroomTopY + ZONE_TAB_INSET_PX, count: nStarter, hasLine: true,  dashed: false, tint: true  },
    { label: 'ROLE PLAYER', y: roleLineY,    tabY: starterLineY + ZONE_TAB_INSET_PX, count: nRole,    hasLine: true,  dashed: false, tint: true  },
    { label: 'FRINGE',      y: roleLineY,    tabY: roleLineY + ZONE_TAB_INSET_PX,    count: nFringe,  hasLine: false, dashed: false, tint: true  },
    { label: stripLabel,    y: stripTopY,    tabY: stripTopY + ZONE_TAB_INSET_PX,    count: nStrip,   hasLine: false, dashed: true,  tint: false },
  ];

  // ── No-fire lanes — every labeled boundary; the below side clears its tab text
  //    (Part 4). Field top: one-sided down (STARTER tab). Strip top: one-sided up
  //    (strip interior left untouched). ───────────────────────────────────────
  const belowReach = ZONE_TAB_INSET_PX + ZONE_TAB_H / 2 + LANE_TAB_PAD;
  applyNoFireLanes(building, [
    { y: headroomTopY, oneSidedDown: true, below: belowReach }, // STARTER tab (field top)
    { y: starterLineY, below: belowReach },                     // P65 line → ROLE PLAYER tab below
    { y: roleLineY,    below: belowReach },                     // P25 line → FRINGE tab below
    { y: stripTopY,    oneSidedUp: true },                      // strip top (interior unchanged)
  ]);

  // ── Rider 3: reaching-threads + tier nodes for already-signed pending players ─
  // A pending player who has ALREADY signed a second contract (carries a verdict —
  // e.g. an early extension) gets a thread reaching from his usage-Y dot UP to his
  // tier node. HARD: the dot STAYS at its usage-Y (read d.y, never write) — only the
  // thread reaches. The tier-node set is the subset of the 5 tiers present among
  // signed pending players, sized like the resolved wall but over signed dots only.
  const signed = building.filter(d => d.player.verdict != null);
  const reachNodes: JellyfishWallNode[] = [];
  if (signed.length > 0) {
    const signedTierCounts = new Map<ContractTier, number>();
    for (const d of signed) {
      const t = d.player.verdict!.tier;
      signedTierCounts.set(t, (signedTierCounts.get(t) ?? 0) + 1);
    }
    const presentTiers = WALL_TIER_ORDER.filter(t => (signedTierCounts.get(t) ?? 0) > 0);
    const usableH = bandH - Math.max(0, presentTiers.length - 1) * WALL_GAP;
    let cursorY = bandTop;
    for (const tier of presentTiers) {
      const count = signedTierCounts.get(tier) ?? 0;
      const h = Math.max(WALL_MIN_NODE_H, (count / signed.length) * usableH);
      reachNodes.push({
        tier, x: wallX, y: cursorY, h, cy: cursorY + h / 2,
        count, pct: Math.round((count / signed.length) * 100),
        color: TIER_THREAD_COLOR[tier], label: tier.replace('_', ' '),
      });
      cursorY += h + WALL_GAP;
    }
    const nodeByTier = new Map(reachNodes.map(n => [n.tier, n]));
    const byTier = new Map<ContractTier, JellyfishDot[]>();
    for (const d of signed) {
      const t = d.player.verdict!.tier;
      const list = byTier.get(t) ?? [];
      list.push(d);
      byTier.set(t, list);
    }
    byTier.forEach((list, tier) => {
      const node = nodeByTier.get(tier);
      if (!node) return;
      const sorted = [...list].sort((a, b) => a.y - b.y);
      sorted.forEach((d, i) => {
        const targetY = node.y + ((i + 0.5) / sorted.length) * node.h;
        d.tier = tier;
        d.threadColor = TIER_THREAD_COLOR[tier];
        d.threadPath = jellyfishThreadPath(d.x, d.y, node.x, targetY); // d.y UNMOVED
      });
    });
  }

  return {
    svgW, svgH, margin, bandTop, bandH, maxPick,
    wallX, wallNodeW: WALL_NODE_W,
    dots: building, wallNodes: [],
    fieldCount: building.length,
    noneCount: 0,
    dataGapCount: 0,
    proveItStripY: stripTopY,
    noneStripY: stripTopY,
    mode: 'pending',
    roundAnchors,
    zones,
    stripTopY,
    warnCount,
    reachNodes,
  };
}

// ── 2026 capital-floor layout (Part 4) ─────────────────────────────────────────

export function computeFloorLayout(players: Player[], draftYear: number): JellyfishLayout {
  // Brief 2 Item 3 + follow-up: top 72 → 44 → 24. The descriptive subhead AND the
  // on-canvas field title are now off the canvas (subhead → Reads & Keys, title removed
  // entirely), so NOTHING renders above bandTop — the band can start near the very top
  // of the field. Tune on render.
  const margin = { top: 24, right: WALL_RIGHT_PAD, bottom: 56, left: 80 };
  const svgW = JELLYFISH_SVG_W;
  const svgH = JELLYFISH_SVG_H;
  const bandTop = margin.top;
  const bandH = svgH - margin.top - margin.bottom;

  // Floor state reads the full DRAFTED class on the floor in pick order (being
  // drafted is the evidence). Universal gutter rule: a zero-season class has no
  // snaps and no contracts → the gutter is empty automatically (drafted picks only).
  const dotsInput = players.filter(p => p.pick_drafted != null && p.pick_drafted > 0);

  const picks = dotsInput.map(p => p.pick_drafted as number);
  const maxPick = picks.length ? Math.max(...picks) : 256;

  const wallX     = svgW - margin.right;
  const gutterX   = wallX - 42;
  const pickLeft  = margin.left;
  const pickRight = gutterX - 34;
  const xScale = (pick: number): number =>
    maxPick <= 1 ? pickLeft : pickLeft + ((pick - 1) / (maxPick - 1)) * (pickRight - pickLeft);
  const roundAnchors = jellyfishRoundAnchors(dotsInput, xScale);

  const fracToY = (f: number): number => bandTop + f * bandH;
  const stripTopY = fracToY(COULDNT_STICK_STRIP_TOP_FRAC);

  // Dependency direction (Part 4): c OWNS the target frame. Epsilon 5's eventual
  // stage-1-end (2→3) frame must MATCH this static floor state, not the reverse.
  const floorY = fracToY(0.82);

  const building: JellyfishDot[] = dotsInput.map(p => ({
    player: p, verdict: null, tier: null,
    x: xScale(p.pick_drafted as number), y: floorY,
    isDataGap: false, isUDFA: false, threadPath: null, threadColor: '',
  }));

  // Faint EMPTY zone tabs above (counts 0 — nobody has played yet). Same tab grammar
  // as the pending field (Part 2/5): tabs sit just inside the top of each zone, lines
  // stay at P65 / P25 / strip-top. The strip label follows the maturity rule: a
  // zero-season class reads "TOO FEW SNAPS · 0".
  const headroomTopY = fracToY(PENDING_HEADROOM_FRAC);
  const starterLineY = fracToY(bodyPercentileToYFraction(STARTER_PCT));
  const roleLineY    = fracToY(bodyPercentileToYFraction(ROLE_PCT));
  const stripLabel = stripLabelForClass(players);
  const zones: PendingZone[] = [
    { label: 'STARTER',     y: starterLineY, tabY: headroomTopY + ZONE_TAB_INSET_PX, count: 0, hasLine: true,  dashed: false, tint: true  },
    { label: 'ROLE PLAYER', y: roleLineY,    tabY: starterLineY + ZONE_TAB_INSET_PX, count: 0, hasLine: true,  dashed: false, tint: true  },
    { label: 'FRINGE',      y: roleLineY,    tabY: roleLineY + ZONE_TAB_INSET_PX,    count: 0, hasLine: false, dashed: false, tint: true  },
    { label: stripLabel,    y: stripTopY,    tabY: stripTopY + ZONE_TAB_INSET_PX,    count: 0, hasLine: false, dashed: true,  tint: false },
  ];

  // Dashed-empty wall: the 5 tier nodes as equal-height outlines (no fill).
  const usableH = bandH - (WALL_TIER_ORDER.length - 1) * WALL_GAP;
  const nodeH = Math.max(WALL_MIN_NODE_H, usableH / WALL_TIER_ORDER.length);
  let cursorY = bandTop;
  const wallNodes: JellyfishWallNode[] = WALL_TIER_ORDER.map(tier => {
    const node: JellyfishWallNode = {
      tier, x: wallX, y: cursorY, h: nodeH, cy: cursorY + nodeH / 2,
      count: 0, pct: 0, color: TIER_THREAD_COLOR[tier], label: tier.replace('_', ' '),
    };
    cursorY += nodeH + WALL_GAP;
    return node;
  });

  return {
    svgW, svgH, margin, bandTop, bandH, maxPick,
    wallX, wallNodeW: WALL_NODE_W,
    dots: building, wallNodes,
    fieldCount: building.length,
    noneCount: 0,
    dataGapCount: 0,
    proveItStripY: stripTopY,
    noneStripY: stripTopY,
    mode: 'floor',
    roundAnchors,
    zones,
    stripTopY,
    floorY,
    scoreboardText: `FIRST SNAPS — SEPTEMBER ${draftYear}`,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  ACT 3 — REFRAME FIELD (Phase Lambda, Brief 3): the NEW resting field
//
//  X = draft pick (linear, FIXED 1–262) + UDFA gutter · Y = window_usage percentile
//  (top = 100) + too-few-snaps strip + corner · COLOR = six-band money ladder.
//  Wall = six true-count nodes (TOP5→NEVER). Threads = two-register (money/ink).
//
//  ADDITIVE. Pure layout math only — payer dot color + award glyph are resolved in
//  the Act3Field component (teamDotColors / triangle-wins glyph), keeping color logic
//  in the render layer exactly as the jellyfish does. The jellyfish path is untouched.
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
  roundAnchors: JellyfishRoundAnchor[];
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
    if (wallNodes[i].tabY - prev < ACT3_TAB_MIN_PITCH) {
      wallNodes[i].tabY = prev + ACT3_TAB_MIN_PITCH;
      wallNodes[i].tabNudged = true;
    }
  }
  const wallNodeByBand = new Map(wallNodes.map(n => [n.band, n]));

  // ── Round-start X anchors (per-class real round data, fixed xScale) ─────────
  const roundAnchors = jellyfishRoundAnchors(dotsInput, xScale);

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
