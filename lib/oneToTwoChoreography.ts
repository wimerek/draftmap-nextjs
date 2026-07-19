/**
 * lib/oneToTwoChoreography.ts
 *
 * Sprint 2 — the AUTHORED per-pick 1→2 (projection → draft-results) schedule. Pure math,
 * no React, no DOM — mirrors lib/choreography.ts conventions exactly (header comment, ONE
 * constants block, exported schedule builder + samplers, deterministic hash01 jitter, no
 * Date.now()). Everything is keyed off the chapter's elapsed ms (DraftChart's 1→2 master
 * clock); the renderer (PlayerDots) and the Scoreboard ticker both read this schedule.
 *
 * Replaces the flat `dots.length × 22 + 550` stagger (a ~7–10s blur) with a broadcast-paced
 * Round 1 (with an intra-round acceleration ramp), a compressed R4–7 montage, round-boundary
 * holds, slow-motion steal/reach beats, and a single UDFA mass wave. Launch order is PICK
 * order (deliberate change from the old dots-array index order). The scoreboard ticker
 * derives its display mode from this schedule, and the paused pick-by-pick step-through
 * rides the same pick→elapsed map for free.
 *
 * EVERY number is a dial — named constants in the block below, tuned later without any
 * structural code change (Derek's explicit instruction). 1x lands at ≈71s for a 262-pick
 * class. See the LOCKED BUILD BRIEF (Sprint 2, banked 2026-07-19) for the full rationale.
 */

import type { Player } from './sheets';
import type { DotPosition } from './chartMath';
import { classifyDraftMoveDetail } from './scoreboardStats';

// ════════════════════════════════════════════════════════════════════════════
//  THE ONE CONSTANTS BLOCK (ALL dials — Sprint 2 §1)
// ════════════════════════════════════════════════════════════════════════════

// ── Launch intervals (ms per pick) ──────────────────────────────────────────
export const OTT_R1_OPEN_MS        = 1000;  // R1 first half
export const OTT_R1_RAMP_FRACTION  = 0.5;   // ramp begins at this fraction of R1 (by round
                                            // SIZE, not absolute pick — comp/forfeit vary)
export const OTT_R1_END_MS         = 700;   // ramp lands ON the ticker floor by design
export const OTT_R2_MS             = 350;
export const OTT_R3_MS             = 250;
export const OTT_MONTAGE_MS        = 45;    // R4–R7
// ── Per-dot flight ──────────────────────────────────────────────────────────
export const OTT_FLIGHT_MS         = 550;   // unchanged feel; easeOutCubic (in PlayerDots)
// ── Pending-dot dimming (Derek runtime finding, 07-19) ───────────────────────
// During the chapter, dots that have NOT yet launched render DIMMED so the board
// visibly FILLS as picks land (bright = picked, dim = still on the board). A dot
// lights AT LAUNCH and flies full-strength. Purely elapsed-derived in PlayerDots —
// pause/step/speed need no special cases; reduced motion never enters the chapter.
export const OTT_PENDING_OPACITY   = 0.40;  // waiting dots during the chapter
export const OTT_DIM_IN_MS         = 300;   // fade-down at chapter start (1 → PENDING)
// ── UDFA wave ───────────────────────────────────────────────────────────────
export const OTT_UDFA_WAVE_MS      = 800;   // single mass wave, per-dot hash01 jitter
// ── Holds ───────────────────────────────────────────────────────────────────
export const OTT_BOUNDARY_HOLD_MS  = 1200;  // round-boundary holds (glance-read time)
export const OTT_BEAT_FLIGHT_MS    = 1600;  // slow-mo flight for beat picks (vs 550)
export const OTT_BEAT_HOLD_MS      = 900;   // landing hold after a beat settles
// ── Beats ───────────────────────────────────────────────────────────────────
export const OTT_BEATS_PER_TYPE    = 2;     // top-N steals + top-N reaches
export const OTT_BEAT_MIN_GAP_PICKS = 8;    // skip a lesser beat within this many picks of
                                            // an accepted one
// ── Ticker ──────────────────────────────────────────────────────────────────
export const TICKER_FLOOR_MS       = 700;   // below this REAL interval, individual-pick text
                                            // is a check the speed can't cash

// ════════════════════════════════════════════════════════════════════════════
//  DETERMINISTIC JITTER (matches choreography.ts hash01 exactly)
// ════════════════════════════════════════════════════════════════════════════

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
/** Deterministic [0,1) from a player id + salt — stable jitter, no reflow, no Date.now. */
function hash01(id: string, salt: string): number {
  return (hashStr(id + salt) % 100000) / 100000;
}

// ════════════════════════════════════════════════════════════════════════════
//  SCHEDULE TYPES (the API — Sprint 2 §1)
// ════════════════════════════════════════════════════════════════════════════

/** Everything PlayerDots needs to fly ONE dot: when it launches + how long its flight is. */
export interface OttDotSchedule {
  launchAt: number;
  flightMs: number;
}

/** The pick→elapsed map. `mode` is DERIVED from the authored interval (so a future dial
 *  change re-modes the ticker automatically). The RENDER layer re-derives mode against the
 *  REAL interval (authored / speed) — this stored value is the 1x baseline. */
export interface OttPickEntry {
  playerId: string;
  pick: number;
  rd: number;
  launchAt: number;
  landAt: number;
  intervalMs: number;
  mode: 'named' | 'summary';
  beat?: 'steal' | 'reach';
  beatRank?: 1 | 2;
  /** Beat window end (== landAt + OTT_BEAT_HOLD_MS) — the ticker holds beat copy until here. */
  beatCopyUntil?: number;
}

/** A pause of the launch queue. Boundary holds punctuate round transitions; the single
 *  preUdfa hold sits between the last drafted landing and the UDFA wave. In-flight dots
 *  always finish their ease during a hold (no-jank rule) — the hold only gates NEW launches. */
export interface OttHold {
  kind: 'boundary' | 'preUdfa';
  afterRound?: number;
  startAt: number;
  durationMs: number;
  tallies: { steals: number; reaches: number };
}

export interface OneToTwoChoreography {
  /** Drafted dots (pick order) + the UDFA wave, keyed by player_id. */
  dotSchedules: Map<string, OttDotSchedule>;
  /** Drafted picks in pick order (the pick→elapsed map). UDFA is NOT in here. */
  pickTimeline: OttPickEntry[];
  holds: OttHold[];
  /** Chapter length; at elapsed = total every dot's localT ≥ 1 (frame-identity gate). */
  total: number;
  /** Drafted count for the class (== pickTimeline.length) — the "OF {t}" denominator. */
  classTotal: number;
  /** Undrafted dots that ride the UDFA wave — the pre-UDFA hold's "UNDRAFTED SIGNINGS". */
  udfaCount: number;
  /** The last LANDED drafted pick at `ms` (null before the first landing). */
  pickAtElapsed(ms: number): OttPickEntry | null;
  /** Index into pickTimeline of the last LANDED drafted pick at `ms` (−1 before the first). */
  pickIndexAtElapsed(ms: number): number;
  /** The landAt (seated + caption-readable) for a pickTimeline index — the step-through target. */
  elapsedForPickIndex(index: number): number;
}

// ════════════════════════════════════════════════════════════════════════════
//  BUILDER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Build the authored 1→2 schedule for one draft class.
 *
 * @param dotPositions the rendered dot set (PlayerDots iterates the SAME array) — the
 *                     schedule is keyed by player_id so PlayerDots looks up each dot's
 *                     (launchAt, flightMs) directly.
 * @param players      the class's player list (for the round-tally counts + the class max
 *                     pick used to impute drafted-but-unranked ranks — matching the Act-2
 *                     scoreboard's steal/reach classification exactly).
 */
export function computeOneToTwoChoreography(
  dotPositions: DotPosition[],
  players: Player[],
): OneToTwoChoreography {
  const dotSchedules = new Map<string, OttDotSchedule>();
  const pickTimeline: OttPickEntry[] = [];
  const holds: OttHold[] = [];

  // Class max pick — the SAME imputation anchor computeScoreboardStats uses (rank →
  // maxPick+1 for drafted-but-unranked), so our steal/reach flags match the scoreboard's.
  const maxPick = players.reduce(
    (m, p) => (p.pick_drafted != null && p.pick_drafted > m ? p.pick_drafted : m),
    0,
  );

  // Drafted dots in PICK order (deliberate: the old stagger ran in dots-array index order,
  // which is not draft sequence). Null pick → the UDFA wave.
  const drafted = dotPositions
    .filter((d) => d.player.pick_drafted != null && (d.player.pick_drafted as number) > 0)
    .sort((a, b) => (a.player.pick_drafted as number) - (b.player.pick_drafted as number));
  const udfa = dotPositions.filter(
    (d) => d.player.pick_drafted == null || (d.player.pick_drafted as number) <= 0,
  );

  // Carry the last known round forward across null rd_drafted (comp-pick / partial-class
  // gaps) — round boundaries derive from rd TRANSITIONS, never hardcoded round sizes.
  let lastRd = 1;
  const rows = drafted.map((d) => {
    const rd = d.player.rd_drafted ?? lastRd;
    lastRd = rd;
    const detail = classifyDraftMoveDetail(d.player.rank ?? maxPick + 1, d.player.pick_drafted);
    return {
      dot: d,
      playerId: d.player.player_id,
      pick: d.player.pick_drafted as number,
      rd,
      move: detail.move,
      gap: detail.gap,
    };
  });

  // ── Per-round steal/reach tallies (for boundary-hold copy) — from the SAME flags ──
  const roundTallies = new Map<number, { steals: number; reaches: number }>();
  let totalSteals = 0;
  let totalReaches = 0;
  for (const r of rows) {
    const t = roundTallies.get(r.rd) ?? { steals: 0, reaches: 0 };
    if (r.move === 'STEAL') { t.steals++; totalSteals++; }
    else if (r.move === 'REACH') { t.reaches++; totalReaches++; }
    roundTallies.set(r.rd, t);
  }

  // ── R1 size (for the acceleration ramp) ──────────────────────────────────────
  const r1Rows = rows.filter((r) => r.rd === 1);
  const r1Count = r1Rows.length;
  const r1RampStart = Math.floor(r1Count * OTT_R1_RAMP_FRACTION);
  // Within-R1 index per row (only meaningful for rd===1 rows).
  const r1IndexByPid = new Map<string, number>();
  r1Rows.forEach((r, i) => r1IndexByPid.set(r.playerId, i));

  /** Authored launch interval AFTER this row (gap to the next pick's launch). */
  const intervalFor = (r: (typeof rows)[number]): number => {
    if (r.rd <= 1) {
      const i = r1IndexByPid.get(r.playerId) ?? 0;
      if (i < r1RampStart) return OTT_R1_OPEN_MS;
      // Linear ramp OPEN→END, landing exactly on OTT_R1_END_MS at R1's final pick.
      const span = (r1Count - 1) - r1RampStart;
      if (span <= 0) return OTT_R1_END_MS;
      const frac = (i - r1RampStart) / span;
      return OTT_R1_OPEN_MS + frac * (OTT_R1_END_MS - OTT_R1_OPEN_MS);
    }
    if (r.rd === 2) return OTT_R2_MS;
    if (r.rd === 3) return OTT_R3_MS;
    return OTT_MONTAGE_MS; // R4–R7
  };

  // ── Beat selection — top-N steals + top-N reaches by |pick-value gap| ─────────
  // The min-gap must hold ACROSS types (a steal and a reach 8 picks apart = back-to-back
  // slow-mos), so both passes share ONE running accepted list: steals select first (kept
  // at priority order, |gap| desc), then the reach pass's proximity check runs against BOTH
  // lists. The per-type cap (OTT_BEATS_PER_TYPE) still counts only THIS type's picks.
  const acceptBeats = (
    move: 'STEAL' | 'REACH',
    shared: Array<{ playerId: string; pick: number }>,
  ): Set<string> => {
    const accepted: Array<{ playerId: string; pick: number }> = [];
    const candidates = rows
      .filter((r) => r.move === move && r.gap > 0)
      .sort((a, b) => (b.gap - a.gap) || (a.pick - b.pick)); // |gap| desc, earlier pick wins ties
    for (const c of candidates) {
      if (accepted.length >= OTT_BEATS_PER_TYPE) break;
      // Reject any candidate within OTT_BEAT_MIN_GAP_PICKS of an already-accepted beat of
      // EITHER type (shared holds prior + this pass's picks).
      const tooClose = shared.some((a) => Math.abs(a.pick - c.pick) < OTT_BEAT_MIN_GAP_PICKS);
      if (tooClose) continue;
      accepted.push({ playerId: c.playerId, pick: c.pick });
      shared.push({ playerId: c.playerId, pick: c.pick });
    }
    return new Set(accepted.map((a) => a.playerId));
  };
  const acceptedBeats: Array<{ playerId: string; pick: number }> = [];
  const stealBeats = acceptBeats('STEAL', acceptedBeats);
  const reachBeats = acceptBeats('REACH', acceptedBeats);
  // Beat rank within a type (1 = biggest, gets the superlative copy). Ordered by |gap| desc.
  const beatRankByPid = new Map<string, 1 | 2>();
  const rankBeats = (set: Set<string>) => {
    rows
      .filter((r) => set.has(r.playerId))
      .sort((a, b) => (b.gap - a.gap) || (a.pick - b.pick))
      .forEach((r, i) => beatRankByPid.set(r.playerId, (i === 0 ? 1 : 2) as 1 | 2));
  };
  rankBeats(stealBeats);
  rankBeats(reachBeats);

  // ── Walk the launch queue in pick order, interleaving holds + beats ───────────
  let t = 0;
  let lastDraftedRelease = 0; // queue-release time after the final drafted pick
  let total = 0;              // chapter length = latest dot finish (tracked as we go)

  rows.forEach((r, i) => {
    const isBeat = stealBeats.has(r.playerId) || reachBeats.has(r.playerId);
    const beatType: 'steal' | 'reach' | undefined = stealBeats.has(r.playerId)
      ? 'steal'
      : reachBeats.has(r.playerId)
      ? 'reach'
      : undefined;
    const flightMs = isBeat ? OTT_BEAT_FLIGHT_MS : OTT_FLIGHT_MS;
    const launchAt = t;
    const landAt = launchAt + flightMs;
    const interval = intervalFor(r);

    dotSchedules.set(r.playerId, { launchAt, flightMs });
    total = Math.max(total, landAt);
    pickTimeline.push({
      playerId: r.playerId,
      pick: r.pick,
      rd: r.rd,
      launchAt,
      landAt,
      intervalMs: interval,
      mode: interval >= TICKER_FLOOR_MS ? 'named' : 'summary',
      beat: beatType,
      beatRank: isBeat ? beatRankByPid.get(r.playerId) : undefined,
      beatCopyUntil: isBeat ? landAt + OTT_BEAT_HOLD_MS : undefined,
    });

    // Earliest the NEXT pick may launch. A beat blocks the queue through its landing hold;
    // a round boundary blocks it through the boundary hold. In-flight dots are never frozen.
    const isLast = i === rows.length - 1;
    const isBoundary = !isLast && rows[i + 1].rd !== r.rd;
    let next = launchAt + interval;
    if (isBeat) next = Math.max(next, landAt + OTT_BEAT_HOLD_MS);
    if (isBoundary) {
      next = Math.max(next, landAt + OTT_BOUNDARY_HOLD_MS);
      holds.push({
        kind: 'boundary',
        afterRound: r.rd,
        startAt: landAt,
        durationMs: OTT_BOUNDARY_HOLD_MS,
        tallies: roundTallies.get(r.rd) ?? { steals: 0, reaches: 0 },
      });
    }
    if (isLast) lastDraftedRelease = next;
    t = next;
  });

  // ── Pre-UDFA hold + the single UDFA mass wave ─────────────────────────────────
  if (udfa.length > 0) {
    const preUdfaStart = rows.length > 0 ? lastDraftedRelease : 0;
    holds.push({
      kind: 'preUdfa',
      startAt: preUdfaStart,
      durationMs: OTT_BOUNDARY_HOLD_MS,
      tallies: { steals: totalSteals, reaches: totalReaches },
    });
    const waveStart = preUdfaStart + OTT_BOUNDARY_HOLD_MS;
    for (const d of udfa) {
      const launchAt = waveStart + hash01(d.player.player_id, '#udfa') * OTT_UDFA_WAVE_MS;
      dotSchedules.set(d.player.player_id, { launchAt, flightMs: OTT_FLIGHT_MS });
      total = Math.max(total, launchAt + OTT_FLIGHT_MS);
    }
  }
  // Guard degenerate classes (0 drafted, 0 UDFA) — the immediate-commit guard upstream
  // handles it, but a positive total keeps the clock arithmetic well-defined.
  if (total <= 0) total = OTT_FLIGHT_MS;

  // ── Lookups (the ticker + step-through both consume these) ─────────────────────
  // pickTimeline is ascending in landAt (pick order + monotonic launch queue), so a
  // linear scan is fine (≤~262 picks) and returns the last LANDED pick.
  const pickIndexAtElapsed = (ms: number): number => {
    let idx = -1;
    for (let i = 0; i < pickTimeline.length; i++) {
      if (pickTimeline[i].landAt <= ms) idx = i;
      else break;
    }
    return idx;
  };
  const pickAtElapsed = (ms: number): OttPickEntry | null => {
    const idx = pickIndexAtElapsed(ms);
    return idx >= 0 ? pickTimeline[idx] : null;
  };
  const elapsedForPickIndex = (index: number): number => {
    if (pickTimeline.length === 0) return 0;
    const i = Math.max(0, Math.min(index, pickTimeline.length - 1));
    return pickTimeline[i].landAt;
  };

  return {
    dotSchedules,
    pickTimeline,
    holds,
    total,
    classTotal: pickTimeline.length,
    udfaCount: udfa.length,
    pickAtElapsed,
    pickIndexAtElapsed,
    elapsedForPickIndex,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  TICKER SAMPLER (Sprint 2 §2) — the caption STATE at `elapsed`, given the class
//  schedule + the CURRENT speed (the floor is judged against REAL display time).
// ════════════════════════════════════════════════════════════════════════════

export type TickerKind = 'named' | 'summary' | 'boundary' | 'preUdfa' | 'beat';

export interface TickerState {
  kind: TickerKind;
  /** The current drafted pick (named/summary/beat). null during a hold or before pick 1. */
  entry: OttPickEntry | null;
  /** Boundary/preUdfa hold in force (holds override the mode). null otherwise. */
  hold: OttHold | null;
}

/**
 * Resolve the ticker's caption state at `elapsed` for the given `speed`.
 *
 * Override order (highest wins, Sprint 2 §2): beat copy → hold copy → per-pick mode. The
 * mode floor is judged against the REAL interval (authored intervalMs / speed) so speed
 * presets re-mode the ticker for free: at 2x R1 flips to summary; at 0.25x R2/R3 upgrade
 * to named-pick study mode. `paused` forces the full named caption for the current pick
 * (paused = infinite read time), regardless of the floor.
 */
export function sampleTicker(
  choreo: OneToTwoChoreography,
  elapsed: number,
  speed: number,
  paused: boolean,
): TickerState {
  const entry = choreo.pickAtElapsed(elapsed) ?? choreo.pickTimeline[0] ?? null;

  // Paused / stepping — always the full named caption for the current pick.
  if (paused) return { kind: 'named', entry, hold: null };

  // Beat copy wins: a beat is "up" from its launch through its landing hold.
  for (const p of choreo.pickTimeline) {
    if (p.beat && elapsed >= p.launchAt && elapsed <= (p.beatCopyUntil ?? p.landAt)) {
      return { kind: 'beat', entry: p, hold: null };
    }
  }

  // Hold copy next. The preUdfa hold is OPEN-ENDED: per the locked brief, "THE DRAFT
  // ENDS · {u} UNDRAFTED SIGNINGS" persists through the UDFA wave until commit, so it
  // has no closing edge (a fixed window would fall through to the summary odometer
  // during the ~final 1.4s wave). Boundary holds keep their bounded window.
  for (const h of choreo.holds) {
    const inWindow = h.kind === 'preUdfa'
      ? elapsed >= h.startAt                        // persists to commit
      : elapsed >= h.startAt && elapsed <= h.startAt + h.durationMs;
    if (inWindow) return { kind: h.kind, entry, hold: h };
  }

  // Otherwise the per-pick mode, judged against REAL display time.
  if (!entry) return { kind: 'summary', entry: null, hold: null };
  const realInterval = entry.intervalMs / (speed || 1);
  return { kind: realInterval >= TICKER_FLOOR_MS ? 'named' : 'summary', entry, hold: null };
}
