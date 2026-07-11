/**
 * lib/choreography.ts
 *
 * Phase Lambda — Brief 4. The 2→3 choreography SCHEDULE + the single authored-constants
 * block (spec §1: "every duration is a named constant in one choreography.ts constants
 * block"). Pure math only — no React, no DOM. The renderer (components/chart/
 * Act3Choreography.tsx) reads `elapsedMs` off DraftChart's RAF master clock and asks
 * this module where every dot / thread / beat / counter is at that instant.
 *
 * Authority: draftmap-act3-2to3-choreography-spec-2026-07-03.md (§§0–9), AMENDED
 * 2026-07-10 — Movement I now interpolates dot radius from `act2_r` (the Act-2
 * surprise-gap size) to the uniform Act-3 r5.5 during the 0–1000ms pivot travel.
 *
 * The terminal frame at `elapsed = total` is PIXEL-IDENTICAL to the Brief-3 rest field
 * (Act3Field / computeAct3FieldLayout); this module drives motion INTO that frame and
 * DraftChart hands off to Act3Field on completion or Skip (frame-identity gate §8.4).
 *
 * CLI implements exactly the specced numbers first; tune ONLY on Derek's instruction
 * after runtime review (knobs doctrine — one place, not one moment).
 */

import type { Player } from './sheets';
import type { MoneyBand } from './verdict';
import {
  computeChartLayout,
  computeAllDotPositions,
  computeAct3FieldLayout,
  type Act3FieldLayout,
  type Act3FieldDot,
} from './chartMath';
import { ACT3_DOT_R } from './act3FieldConstants';
import { MONEY_FAMILY_BANDS } from './verdict';

// ════════════════════════════════════════════════════════════════════════════
//  THE ONE CONSTANTS BLOCK (spec §1) — authored V1 timing, all named + centralized
// ════════════════════════════════════════════════════════════════════════════

// ── Movement I — THE PIVOT (spec §3, t = 0 → 1800ms) ────────────────────────────
export const CH_PIVOT_COL_FADE_MS      = 300;   // 0–300 position labels + separators fade OUT
export const CH_PIVOT_TRAVEL_MS        = 1000;  // 0–1000 dots swing to pick-on-floor + radius→r5.5
export const CH_PIVOT_FURNITURE_IN     = { start: 600, end: 1000 }; // gridlines/labels/UDFA frame/gutter fade IN
export const CH_PIVOT_WALL_IN          = { start: 700, end: 1000 }; // wall OUTLINES + strip fill/hairline fade IN
export const CH_PIVOT_BREATH_MS        = 800;   // 1000–1800 THE BREATH — zero motion hold
export const CH_MOVE_I_END             = CH_PIVOT_TRAVEL_MS + CH_PIVOT_BREATH_MS; // 1800

// ── Movement II — THE AUDITION (spec §4) ────────────────────────────────────────
/** Per-pick launch interval (ms) by draft round. R1 150 · R2–R3 50 · R4–R5 30 · R6–R7 18. */
export function launchIntervalForRound(rd: number | null): number {
  if (rd == null || rd <= 1) return 150;
  if (rd <= 3) return 50;
  if (rd <= 5) return 30;
  return 18;
}
export const CH_UDFA_WAVE_MS           = 500;   // single mass wave window; per-dot jitter 0–500 (hash)
export const CH_UDFA_GAP_MS            = 60;    // gap after the last drafted launch before the UDFA wave
export const CH_RISE_MS                = 500;   // per-dot rise, easeOutCubic
export const CH_SETTLE_MS              = 150;   // settle pulse 1.0→1.06→1.0 (glyph fades in during this)
export const CH_SETTLE_PEAK            = 1.06;  // settle pulse peak scale
export const CH_MOVE_II_HOLD_MS        = 400;   // hold at end of II before III

// ── Movement III — THE PAYDAY (spec §5) ─────────────────────────────────────────
/** Money beats fire in this order; each is its own beat. Ink bands come after as one mass. */
export const CH_MONEY_BEAT_ORDER: MoneyBand[] = ['TOP5', 'TOP10', 'MIDDLE'];
export const CH_INK_BANDS: MoneyBand[]        = ['MIN', 'ZERO', 'NEVER'];

export const CH_TAB_LIGHT_MS           = 250;   // tab bar + name + n·% fade to full; node fills 0→1
export const CH_THREAD_LEAD_MS         = 150;   // threads begin 150ms after the beat opens
export const CH_THREAD_FLIGHT_MS       = 450;   // per-thread flight, easeOutQuad (wall → dot draw)
/** Per-thread stagger (ms) within a money beat, wall-slot order top→bottom. */
export const CH_STAGGER: Record<MoneyBand, number> = {
  TOP5: 40, TOP10: 35, MIDDLE: 15, MIN: 0, ZERO: 0, NEVER: 0,
};
export const CH_FLARE_MS               = 200;   // grab flare bloom at the dot (band color, money only)
export const CH_COLOR_CROSSFADE_MS     = 250;   // dot color drafted → paying team
export const CH_BEAT_BREATH_MS         = 400;   // breath after a money beat's last arrival

export const CH_INK_MASS_MS            = 1800;  // ink threads fade in along full length (fog, not lash)
export const CH_INK_ONSET_JITTER_MS    = 400;   // per-thread onset jitter 0–400 (deterministic hash)

// ── Terminal handoff (spec §6) ──────────────────────────────────────────────────
export const CH_HANDOFF_MS             = 300;   // opacities settle to banked rest register

/** Payday threads may run this much HOTTER than rest during ceremony, then settle (§6). */
export const CH_CEREMONY_OPACITY_BOOST = 0.15;

/** Uniform Act-3 dot radius the pivot interpolates INTO (spec §3, amended 2026-07-10). */
export const CH_UNIFORM_R = ACT3_DOT_R; // 5.5

// ── Act-2 surprise-gap radius (spec §0 `act2_r`) ────────────────────────────────
// Mirrors PlayerDots.deltaToRadius EXACTLY (BASE_R 6 · growth 4 · saturation 25) so the
// pivot's frame-0 radius equals what Act 2 actually rendered. Kept local (not imported)
// to avoid a component→lib dependency; the numbers are the locked Act-2 values.
const A2_BASE_R = 6, A2_GROWTH = 4, A2_SATURATION = 25;
function act2Radius(delta: number): number {
  return A2_BASE_R + A2_GROWTH * (1 - Math.exp(-delta / A2_SATURATION));
}

/** Stable string hash (matches chartMath.hashStr; re-declared — that one is not exported). */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
/** Deterministic [0,1) from a player id + salt — stable jitter, no reflow. */
function hash01(id: string, salt: string): number {
  return (hashStr(id + salt) % 100000) / 100000;
}

// ════════════════════════════════════════════════════════════════════════════
//  EASING
// ════════════════════════════════════════════════════════════════════════════

export function clamp01(t: number): number { return t < 0 ? 0 : t > 1 ? 1 : t; }
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
export function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
export function easeOutQuad(t: number): number { return 1 - (1 - t) * (1 - t); }

// ════════════════════════════════════════════════════════════════════════════
//  PER-DOT + PER-BAND SCHEDULE
// ════════════════════════════════════════════════════════════════════════════

/** Everything the renderer needs to place ONE dot at any instant. */
export interface ChDotSchedule {
  playerId: string;
  band: MoneyBand | null;
  /** Act-2 rest position (source), re-projected into the Act-3 canvas. */
  act2x: number;
  act2y: number;
  act2r: number;
  /** Movement-II launch cue (absolute ms). */
  launchAt: number;
  /** True for threaded (banded, non-pending-suppressed) dots. */
  threaded: boolean;
  isMoney: boolean;
  /** Wall-slot index top→bottom within the band (drives money stagger). */
  slotIndex: number;
  /** Movement-III thread onset (absolute ms); null = no thread. */
  threadStart: number | null;
  /** Grab-flare / color-crossfade start (absolute ms); null = none. NEVER dots never flip. */
  flareStart: number | null;
  colorStart: number | null;
}

/** A re-projected Act-2 position column, for the Movement-I "columns dissolve" cue. */
export interface ChPivotColumn {
  label: string;
  xCenter: number;
  xLeft: number;
}

/** Per money/ink beat — when its wall tab lights + node fills (spec §5). */
export interface ChBeat {
  band: MoneyBand;
  family: 'money' | 'ink';
  tabLightStart: number; // absolute ms
  nodeFillStart: number; // absolute ms (== tabLightStart)
}

export interface Act3Choreography {
  /** The terminal rest field (identical to Act3Field's own computeAct3FieldLayout). */
  fieldLayout: Act3FieldLayout;
  dotSchedules: Map<string, ChDotSchedule>;
  /** Re-projected Act-2 columns (labels + separators) that dissolve in Movement I. */
  pivotColumns: ChPivotColumn[];
  beats: ChBeat[];
  /** Sorted money-thread arrival times (absolute ms) — the counter climbs on these. */
  counterArrivals: number[];
  /** GOT PAID denominator (plotted field pop) + final money numerator. */
  counterDenominator: number;
  counterTotal: number;
  /** Movement boundary timestamps (absolute ms). */
  timeline: {
    moveIEnd: number;
    auditionStart: number;
    auditionEnd: number;
    paydayStart: number;
    inkStart: number;
    inkEnd: number;
    handoffStart: number;
    total: number;
  };
  isPending: boolean;
}

/**
 * Build the full 2→3 schedule for one draft class.
 *
 * @param players   the class's player list (each with `.verdict` money_band + `.usage`)
 * @param isPending mid-window class (some deals unsigned; band-1 relabel, unsigned
 *                  dots get no thread — spec §7b). Resolved classes = false.
 */
export function computeAct3Choreography(players: Player[], isPending: boolean): Act3Choreography {
  const fieldLayout = computeAct3FieldLayout(players, isPending);
  const FLOOR_Y = fieldLayout.fieldBottom;

  // ── Act-2 source positions, re-projected into the Act-3 canvas ────────────────
  // Movement I frame-0 is the class in its position-column geometry. We take the real
  // Act-2 layout (full class, all columns) and linearly rescale its (x, drafted-Y) into
  // the Act-3 pick-x / usage-y regions so the columns dissolve and the mass converges on
  // FLOOR_Y in one shared coordinate system. (act2_x/act2_y/act2_r are DERIVED from
  // Brief-2's layout outputs — dotPosition.x/actualY + deltaToRadius — not literal
  // payload fields; see the Brief-4 open-items note.)
  const a2Layout = computeChartLayout(players, 'all');
  const a2Dots = computeAllDotPositions(players, a2Layout);
  const ax0 = a2Layout.margin.left;
  const ax1 = a2Layout.svgW - a2Layout.margin.right;
  const ay0 = a2Layout.margin.top;
  const ay1 = a2Layout.udfaZoneY + a2Layout.udfaZoneH;
  const remapX = (x: number): number =>
    fieldLayout.pickLeft + ((x - ax0) / (ax1 - ax0 || 1)) * (fieldLayout.pickRight - fieldLayout.pickLeft);
  const remapY = (y: number): number =>
    fieldLayout.fieldTop + ((y - ay0) / (ay1 - ay0 || 1)) * (FLOOR_Y - fieldLayout.fieldTop);
  const a2ByPid = new Map(a2Dots.map(d => [d.player.player_id, d]));

  // Re-projected columns (label centers + left separators) for the dissolve cue.
  const pivotColumns: ChPivotColumn[] = a2Layout.visiblePositions.map((pos: string) => ({
    label: pos,
    xCenter: remapX((a2Layout.colXMap[pos] ?? ax0) + (a2Layout.colWidths[pos] ?? 0) / 2),
    xLeft: remapX(a2Layout.colXMap[pos] ?? ax0),
  }));

  // ── Movement II launch schedule (per-class rounds; drafted in pick order) ──────
  const auditionStart = CH_MOVE_I_END;
  const drafted = fieldLayout.dots
    .filter(d => !d.isUDFA && d.player.pick_drafted != null)
    .sort((a, b) => (a.player.pick_drafted as number) - (b.player.pick_drafted as number));
  const launchAt = new Map<string, number>();
  let t = auditionStart;
  let lastRd: number | null = 1;
  for (const d of drafted) {
    launchAt.set(d.player.player_id, t);
    lastRd = d.player.rd_drafted ?? lastRd;
    t += launchIntervalForRound(lastRd);
  }
  const lastDraftedLaunch = drafted.length > 0 ? t - launchIntervalForRound(lastRd) : auditionStart;
  // UDFA — one mass wave, per-dot jitter 0–500 (deterministic hash).
  const udfaWaveStart = lastDraftedLaunch + CH_UDFA_GAP_MS;
  const udfaDots = fieldLayout.dots.filter(d => d.isUDFA);
  for (const d of udfaDots) {
    launchAt.set(d.player.player_id, udfaWaveStart + hash01(d.player.player_id, '#udfa') * CH_UDFA_WAVE_MS);
  }
  // Audition ends when the last-launched dot finishes rising + settling.
  let maxFinish = auditionStart;
  fieldLayout.dots.forEach(d => {
    const fin = (launchAt.get(d.player.player_id) ?? auditionStart) + CH_RISE_MS + CH_SETTLE_MS;
    if (fin > maxFinish) maxFinish = fin;
  });
  const auditionEnd = maxFinish;
  const paydayStart = auditionEnd + CH_MOVE_II_HOLD_MS;

  // ── Movement III — money beats (sequential) then ink mass (parallel) ──────────
  // Per-band wall-slot order top→bottom = dots sorted by field-y ascending (matches the
  // layout's slot-comb in computeAct3FieldLayout), so the stagger walks the wall.
  const byBand = new Map<MoneyBand, Act3FieldDot[]>();
  for (const d of fieldLayout.dots) {
    if (d.band == null) continue;
    const list = byBand.get(d.band) ?? [];
    list.push(d);
    byBand.set(d.band, list);
  }
  byBand.forEach(list => list.sort((a, b) => a.y - b.y));

  const beats: ChBeat[] = [];
  const dotSchedules = new Map<string, ChDotSchedule>();
  const counterArrivals: number[] = [];

  const scheduleFor = (d: Act3FieldDot, slotIndex: number): ChDotSchedule => {
    const a2 = a2ByPid.get(d.player.player_id);
    const act2x = a2 ? remapX(a2.x) : d.x;
    const act2y = a2 ? remapY(a2.actualY) : FLOOR_Y;
    const act2r = a2 ? act2Radius(a2.pickValueDelta) : CH_UNIFORM_R;
    return {
      playerId: d.player.player_id,
      band: d.band,
      act2x, act2y, act2r,
      launchAt: launchAt.get(d.player.player_id) ?? auditionStart,
      threaded: false,
      isMoney: d.band != null && MONEY_FAMILY_BANDS.includes(d.band),
      slotIndex,
      threadStart: null, flareStart: null, colorStart: null,
    };
  };

  // Seed every dot with a base (no-thread) schedule keyed by its wall-slot index.
  for (const d of fieldLayout.dots) {
    const list = d.band != null ? byBand.get(d.band) : undefined;
    const slotIndex = list ? list.indexOf(d) : 0;
    dotSchedules.set(d.player.player_id, scheduleFor(d, slotIndex));
  }

  // A dot threads iff it has a real band AND (resolved, OR pending non-NEVER). Pending
  // NEVER = "not re-signed yet" = UNSIGNED → no thread until graduation (spec §7b).
  const threads = (band: MoneyBand): boolean => !(isPending && band === 'NEVER');

  // Money beats — sequential, each its own tab-light + staggered lash.
  let beatCursor = paydayStart;
  for (const band of CH_MONEY_BEAT_ORDER) {
    const list = byBand.get(band) ?? [];
    if (list.length === 0) continue; // empty band → NO beat (spec §7.8)
    beats.push({ band, family: 'money', tabLightStart: beatCursor, nodeFillStart: beatCursor });
    const threadBegin = beatCursor + CH_THREAD_LEAD_MS;
    let lastArrival = threadBegin;
    list.forEach((d, i) => {
      const onset = threadBegin + i * CH_STAGGER[band];
      const arrival = onset + CH_THREAD_FLIGHT_MS;
      lastArrival = Math.max(lastArrival, arrival);
      const s = dotSchedules.get(d.player.player_id)!;
      s.threaded = true;
      s.threadStart = onset;
      s.flareStart = arrival;
      // No color flip if paying == drafted (spec §7.5) — renderer no-ops it; schedule anyway.
      s.colorStart = arrival;
      counterArrivals.push(arrival);
    });
    beatCursor = lastArrival + CH_BEAT_BREATH_MS;
  }

  // Ink mass — all three ink tabs light together; threads fade in full-length (fog).
  const inkStart = beatCursor;
  let inkThreadEnd = inkStart + CH_INK_MASS_MS;
  for (const band of CH_INK_BANDS) {
    beats.push({ band, family: 'ink', tabLightStart: inkStart, nodeFillStart: inkStart });
    if (!threads(band)) continue; // pending NEVER: node dashed, no threads
    const list = byBand.get(band) ?? [];
    list.forEach((d) => {
      const onset = inkStart + hash01(d.player.player_id, '#ink') * CH_INK_ONSET_JITTER_MS;
      inkThreadEnd = Math.max(inkThreadEnd, onset + CH_INK_MASS_MS);
      const s = dotSchedules.get(d.player.player_id)!;
      s.threaded = true;
      s.threadStart = onset;
      // ZERO + MIN crossfade to paying at their onset; NEVER never flips (drafted stays).
      if (band !== 'NEVER') { s.colorStart = onset; s.flareStart = null; }
    });
  }
  const inkEnd = inkThreadEnd;
  const handoffStart = inkEnd;
  const total = handoffStart + CH_HANDOFF_MS;

  counterArrivals.sort((a, b) => a - b);
  const counterTotal = MONEY_FAMILY_BANDS.reduce((n, b) => n + (fieldLayout.bandCounts[b] ?? 0), 0);

  return {
    fieldLayout,
    dotSchedules,
    pivotColumns,
    beats,
    counterArrivals,
    counterDenominator: fieldLayout.fieldCount,
    counterTotal,
    timeline: { moveIEnd: CH_MOVE_I_END, auditionStart, auditionEnd, paydayStart, inkStart, inkEnd, handoffStart, total },
    isPending,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  FRAME SAMPLERS — pure functions the renderer calls with the current elapsed ms
// ════════════════════════════════════════════════════════════════════════════

/** Linear fade 0→1 across [start,end]; clamped. */
export function fadeIn(elapsed: number, start: number, end: number): number {
  if (elapsed <= start) return 0;
  if (elapsed >= end) return 1;
  return (elapsed - start) / (end - start);
}
/** Linear fade 1→0 across [start,end]; clamped. */
export function fadeOut(elapsed: number, start: number, end: number): number {
  return 1 - fadeIn(elapsed, start, end);
}

/** Where a dot's CENTER is at `elapsed`, plus its radius + settle scale. */
export interface ChDotFrame {
  x: number;
  y: number;
  r: number;
  /** Settle-pulse scale multiplier (1.0 at rest). */
  scale: number;
  /** Glyph opacity 0→1 (fades in during the settle). */
  glyphOpacity: number;
  /** true once the dot has settled into its Act-3 usage position (hover = Act-3 content). */
  settled: boolean;
}

export function sampleDot(
  ch: Act3Choreography,
  d: Act3FieldDot,
  elapsed: number,
): ChDotFrame {
  const s = ch.dotSchedules.get(d.player.player_id)!;
  const FLOOR_Y = ch.fieldLayout.fieldBottom;

  // ── Movement I — pivot travel (0→1000): act2 → (dot.x, FLOOR_Y); radius act2_r→r5.5 ──
  if (elapsed < CH_PIVOT_TRAVEL_MS) {
    const p = easeInOutCubic(clamp01(elapsed / CH_PIVOT_TRAVEL_MS));
    return {
      x: s.act2x + (d.x - s.act2x) * p,
      y: s.act2y + (FLOOR_Y - s.act2y) * p,
      r: s.act2r + (CH_UNIFORM_R - s.act2r) * p,
      scale: 1, glyphOpacity: 0, settled: false,
    };
  }
  // ── Breath (1000→1800) + pre-launch hold: on the floor, uniform radius ──
  const launchAt = s.launchAt;
  if (elapsed < launchAt) {
    return { x: d.x, y: FLOOR_Y, r: CH_UNIFORM_R, scale: 1, glyphOpacity: 0, settled: false };
  }
  // ── Movement II — rise (launch → launch+500) then settle pulse (+150) ──
  const sinceLaunch = elapsed - launchAt;
  if (sinceLaunch < CH_RISE_MS) {
    const p = easeOutCubic(clamp01(sinceLaunch / CH_RISE_MS));
    return {
      x: d.x, y: FLOOR_Y + (d.y - FLOOR_Y) * p, r: CH_UNIFORM_R,
      scale: 1, glyphOpacity: 0, settled: false,
    };
  }
  const sinceArrive = sinceLaunch - CH_RISE_MS;
  if (sinceArrive < CH_SETTLE_MS) {
    // Symmetric 1.0→peak→1.0 pulse; glyph fades in across the same window.
    const q = sinceArrive / CH_SETTLE_MS;
    const pulse = 1 + (CH_SETTLE_PEAK - 1) * Math.sin(q * Math.PI);
    return { x: d.x, y: d.y, r: CH_UNIFORM_R, scale: pulse, glyphOpacity: q, settled: true };
  }
  // ── Settled — resting Act-3 position (also the terminal frame) ──
  return { x: d.x, y: d.y, r: CH_UNIFORM_R, scale: 1, glyphOpacity: 1, settled: true };
}

/** Money counter value at `elapsed` (climbs on arrivals; STALLS through the ink mass). */
export function sampleCounter(ch: Act3Choreography, elapsed: number): number {
  // Binary-free linear scan is fine (≤~150 arrivals); stalls automatically once the
  // ink mass begins (no arrivals scheduled there).
  let n = 0;
  for (const a of ch.counterArrivals) { if (a <= elapsed) n++; else break; }
  return n;
}
