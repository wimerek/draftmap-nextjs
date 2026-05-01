/**
 * lib/chartMath.ts
 *
 * Pure layout math functions for the DraftMap chart.
 * All functions are deterministic given the same inputs — no DOM, no globals,
 * no Math.random(). Safe to call on the server or in tests.
 *
 * Key design decisions:
 * - Players array is passed as a parameter (not read from a global).
 * - RdRankRange is pre-computed once and passed into rankToY / spreadDots
 *   so callers can cache it across re-renders.
 * - Curve parameters (exponent + strength per round) are preserved exactly
 *   from chart-engine.js — do not flatten or simplify these.
 *
 * Used by: PlayerCard.tsx (Phase 2b), full D3 refactor (Phase 2c/2d).
 */

import type { Player } from './airtable';
import { BAND_ASSIGNMENTS } from './chartConstants';

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

/**
 * Map a player's role string to their column band within a position.
 * Returns 'top' | 'mid' | 'bot' based on BAND_ASSIGNMENTS config.
 */
export function getBandForRole(role: string | null | undefined, pos: string): Band {
  const b = BAND_ASSIGNMENTS[pos as keyof typeof BAND_ASSIGNMENTS];
  if (!b) return 'mid';
  if (role === b.top) return 'top';
  if (role === b.bot) return 'bot';
  return 'mid';
}

// ── Player filtering helpers ──────────────────────────────────────────────────

/**
 * Return all players at a given position + round, sorted by rank ascending.
 * Unranked players (rank null or 0) sort to the end.
 */
export function getByPosRound(players: Player[], pos: string, rd: number): Player[] {
  return players
    .filter(p => p.pos === pos && p.rd === rd)
    .sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
}

/**
 * Return players at a position/round that belong to a specific role band.
 */
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

// ── Rank range pre-computation ────────────────────────────────────────────────

/**
 * Pre-compute the min/max rank for each round.
 * Excludes unranked players (rank === 0 or null) so they don't compress the
 * ranked player distribution into a sliver at the bottom of the zone.
 * Unranked players use the fallback index distribution in rankToY instead.
 *
 * Call once per player array, then pass the result into rankToY / spreadDots.
 */
export function buildRdRankRange(players: Player[]): RdRankRange {
  const ranges: RdRankRange = {};
  for (let rd = 1; rd <= 7; rd++) {
    const rdPlayers = players.filter(p => p.rd === rd);
    const ranked = rdPlayers.filter(p => (p.rank ?? 0) > 0);
    if (ranked.length > 0) {
      const ranks = ranked.map(p => p.rank as number);
      ranges[rd] = { min: Math.min(...ranks), max: Math.max(...ranks) };
    } else {
      // Sentinel: all unranked — rankToY fallback handles distribution
      ranges[rd] = { min: 0, max: 0 };
    }
  }
  return ranges;
}

// ── Rank-to-Y layout math ─────────────────────────────────────────────────────

/**
 * Map a player's rank to a Y coordinate within a round zone.
 *
 * Uses a mild top-weighted curve so the top prospects have slightly more
 * vertical separation than lower-ranked players in the same round.
 * Curve parameters (strength + exponent) are tuned per round and must not
 * be flattened — they're a key part of the visual language.
 *
 * @param rank          Player's overall rank (0 = unranked)
 * @param rd            Draft round (1–7)
 * @param ry            Top Y of the round zone in SVG coordinates
 * @param rh            Height of the round zone in SVG pixels
 * @param rdRankRange   Pre-computed from buildRdRankRange()
 * @param fallbackIndex For unranked players: index within the unranked group
 * @param fallbackTotal For unranked players: total count in the group
 */
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

  // Unranked player: distribute evenly across the zone
  if (rank === 0) {
    if (fallbackTotal != null && fallbackTotal > 1) {
      const t = (fallbackIndex ?? 0) / (fallbackTotal - 1);
      return ry + pad + t * (rh - 2 * pad);
    }
    return ry + rh / 2;
  }

  if (max === min) return ry + rh / 2;

  const t = (rank - min) / (max - min);

  // Per-round curve tuning — preserve exactly from chart-engine.js
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

// ── Dot spreading ─────────────────────────────────────────────────────────────

/**
 * Spread dots vertically within a round zone so none overlap.
 *
 * Uses an iterative push-apart algorithm (up to 30 passes) rather than a
 * force simulation — fast, deterministic, no async ticks needed.
 * Phase 2c/2d will replace this with d3.forceSimulation + d3.forceCollide
 * to support animated settle transitions.
 *
 * @param dotData     Players to position (may be a full round or a role band)
 * @param ry          Top Y of the round zone
 * @param rh          Height of the round zone
 * @param rdRankRange Pre-computed from buildRdRankRange()
 */
export function spreadDots(
  dotData: Player[],
  ry: number,
  rh: number,
  rdRankRange: RdRankRange,
): SpreadDot[] {
  const DOT_R = 5;
  const MIN_GAP = DOT_R * 2 + 1; // 11px clearance between dot edges
  const PAD = DOT_R + 2;         // keep dots off row top/bottom edges

  const total = dotData.length;

  let pts: SpreadDot[] = dotData.map((p, i) => ({
    y: rankToY(p.rank ?? 0, p.rd ?? 1, ry, rh, rdRankRange, i, total),
    player: p,
  }));

  // Iteratively push adjacent dots apart until no overlaps remain
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

  // Clamp within row bounds
  pts.forEach(p => {
    p.y = Math.max(ry + PAD, Math.min(ry + rh - PAD, p.y));
  });

  return pts;
}

// ── Height conversion helpers ─────────────────────────────────────────────────
// These are used by PlayerCard.tsx to convert NFL scout height format
// (e.g. 6020 = 6'2") to real inches for linear zone-track math.

/**
 * Convert NFL scout height code (e.g. 6020 → 6'2") to real inches.
 * Returns null if the code is invalid or missing.
 */
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

/**
 * Format real inches as a display string (e.g. 74.5 → "6'2½"").
 */
export function inchesToHeightDisplay(totalInches: number | null | undefined): string {
  if (totalInches == null || isNaN(totalInches)) return 'N/A';
  const feet    = Math.floor(totalInches / 12);
  const inches  = Math.floor(totalInches % 12);
  const eighths = Math.round((totalInches % 1) * 8);
  const INCH = '"';
  if (!eighths) return `${feet}'${inches}${INCH}`;
  const fracs: Record<number, string> = {
    1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞',
  };
  return `${feet}'${inches} ${fracs[eighths] ?? ''}${INCH}`;
}
