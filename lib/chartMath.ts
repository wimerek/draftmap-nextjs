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

import type { Player } from './airtable';
import { BAND_ASSIGNMENTS, POSITIONS, POSITION_ORDER, TIER_DEFS } from './chartConstants';

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

  const sepW = hasDefense && hasOffense ? 24 : 0;
  // margin.left is now slim (round labels only) — sidebar is HTML, outside the SVG.
  // margin.right accommodates tier pills + arrows (moved from left to right).
  const margin = { top: 80, right: 160, bottom: 48, left: 64 };

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
    if (
      (POSITIONS.defense as readonly string[]).includes(pos) &&
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
  const UDFA_ZONE_H = 80;
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
}


/**
 * Compute SVG (x, y) for every ranked player visible in the current view.
 *
 * Session E: Y = pickToY(player.rank) -- players sit at their absolute rank
 * position on the continuous Y axis. X = center of their position column.
 * Unranked players (rank 0 or null) are excluded -- no meaningful Y position.
 *
 * Session G: Extended with projectedY, actualY, and pickValueDelta for the
 * Projected->Drafted animation. Pass pickValueCurve (from public/pick_value_curve.json)
 * to enable delta computation; omit for Projected-only rendering.
 *
 * Dots may overlap when two players at the same position have adjacent ranks.
 * This is intentional: dense clusters signal talent concentration; gaps are cliffs.
 */
export function computeAllDotPositions(
  players: Player[],
  layout: ChartLayout,
  pickValueCurve?: PickValueEntry[],
): DotPosition[] {
  const { visiblePositions, colXMap, colWidths, pickToY, udfaZoneY, udfaZoneH } = layout;

  // Build O(1) pick->normalizedValue lookup if curve is supplied.
  const pvMap: Record<number, number> = {};
  if (pickValueCurve) {
    for (const entry of pickValueCurve) pvMap[entry.pick] = entry.normalized;
  }

  const udfaCenterY = udfaZoneY + udfaZoneH / 2;
  const result: DotPosition[] = [];

  visiblePositions.forEach(pos => {
    const colX = colXMap[pos];
    const cW   = colWidths[pos];

    players
      .filter(p => p.pos === pos && (p.rank ?? 0) > 0)
      .forEach(player => {
        // Deterministic horizontal jitter: center-weighted (triangular) distribution
        // so most dots cluster near the column centre with fewer at the edges.
        // Two independent multiplicative hashes of rank -> average -> 0..1 triangular.
        // Span capped at 60% of usable column width to prevent inter-column bleed.
        const JITTER_PAD = 10;
        const jitterSpan = Math.max(0, (cW - 2 * JITTER_PAD) * 0.60);
        const h1 = ((player.rank! * 2654435761) >>> 0) / 4294967295;
        const h2 = ((player.rank! * 40503 + 987654321) >>> 0) / 4294967295;
        const t  = (h1 + h2) / 2;
        const jitter = t * jitterSpan - jitterSpan / 2;

        // Clamp Y so dots with 6px radius never bleed outside chart top/bottom.
        const DOT_R = 6;
        const rawY  = pickToY(player.rank!);
        const projectedY = Math.max(
          layout.margin.top + DOT_R,
          Math.min(layout.margin.top + layout.totalChartH - DOT_R, rawY),
        );

        // Actual pick Y.
        // Drafted -> pickToY(pick_drafted). Undrafted -> UDFA zone with slight
        // vertical jitter so stacked dots separate within the band.
        let actualY: number;
        if (player.pick_drafted != null && player.pick_drafted > 0) {
          const rawActualY = pickToY(player.pick_drafted);
          actualY = Math.max(
            layout.margin.top + DOT_R,
            Math.min(layout.margin.top + layout.totalChartH - DOT_R, rawActualY),
          );
        } else {
          // Undrafted: place in UDFA zone with rank-based vertical jitter.
          const hU = ((player.rank! * 1234567891) >>> 0) / 4294967295;
          actualY = udfaCenterY + (hU - 0.5) * (udfaZoneH * 0.4);
        }

        // Pick-value delta for dot size: uses pick-value curve if loaded.
        let pickValueDelta = 0;
        if (pickValueCurve && player.rank) {
          const projVal   = pvMap[player.rank]  ?? 0;
          const actualVal = player.pick_drafted ? (pvMap[player.pick_drafted] ?? 0) : 0;
          pickValueDelta  = Math.abs(projVal - actualVal);
        }

        result.push({
          player,
          x: colX + cW / 2 + jitter,
          y: projectedY,
          projectedY,
          actualY,
          pickValueDelta,
        });
      });
  });

  return result;
}
