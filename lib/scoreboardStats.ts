/**
 * lib/scoreboardStats.ts
 *
 * Pure stat-derivation for the persistent scoreboard slot (Epsilon 4 brief d, Part 1).
 *
 * NO I/O, no population assembly beyond reading the passed array. EVERY count is a
 * function of the PASSED-IN player set — never a hardcoded class total (ruling 2).
 *
 * ── Scope-vs-display boundary (baked into the contract; brief f inherits it) ──
 * `computeScoreboardStats` is CLASS-SCOPE in brief d: it receives the FULL class
 * player set. When brief f swaps in scope-filtered + ghosted data, ONLY scope
 * filters (position / round / team / school) may EVER feed this function. Display
 * toggles (Hide Drafted, movement lines, dot size) must NEVER touch it. Do not add
 * a `displayFilters` parameter — that is the whole point of the boundary.
 */

import type { Player } from './sheets';
import { MONEY_FAMILY_BANDS, getVerdictMaturity } from './verdict';
import type { MoneyBand } from './verdict';
import {
  STARTER_PERCENTILE,
  REACH_BRACKET_TOP10,
  REACH_BRACKET_THRU64,
  REACH_BRACKET_AFTER64,
} from './act3Constants';
import smoothCurveRaw from '@/public/pick_value_curve_smooth.json';

// ── Smoothed pick-value curve (Act-2 reaches/steals) ──────────────────────────
// MUST be the smoothed curve — the SAME asset lib/capsules.ts imports. Do NOT
// substitute public/pick_value_curve.json (the raw curve produces different gaps).
const SMOOTH_PICK_VALUE = new Map<number, number>(
  (smoothCurveRaw as Array<{ pick: number; normalized: number }>).map((e) => [e.pick, e.normalized]),
);

function smoothPickValue(pick: number): number {
  const v = SMOOTH_PICK_VALUE.get(pick);
  if (v != null) return v;
  if (pick < 1) return SMOOTH_PICK_VALUE.get(1) ?? 0;
  // Beyond the table (rare comp-pick / deep-consensus overflow) → value of pick 256.
  return SMOOTH_PICK_VALUE.get(256) ?? 0;
}

export type DraftMove = 'REACH' | 'STEAL' | 'IN_RANGE' | 'UNDRAFTED';

/**
 * Per-player draft-move classification — THE SINGLE definition, shared by the
 * scoreboard reach/steal counts (loop below) and the Act 2 hover hero, so a dot's
 * hero can never disagree with the slot's total.
 *
 * Same smoothed pick-value curve + locked brackets keyed to min(rank, pick):
 *   Δ>20 top-10 · Δ>12.5 through pick 64 · Δ>9 after 64.
 *
 * `rank` may be IMPUTED by the caller — a drafted player with no consensus rank is
 * passed `maxPick + 1` (early unranked pick → REACH; late one falls in the flat tail
 * → IN_RANGE; never STEAL). Imputation drives the LABEL only; callers display
 * "Unranked", never the imputed number.
 */
export function classifyDraftMove(rank: number | null, pick: number | null): DraftMove {
  if (pick == null || pick <= 0) return 'UNDRAFTED';
  if (rank == null) return 'IN_RANGE'; // unreachable for the hover (it imputes); the
                                       // loop also imputes, so null never lands here.
  if (pick === rank) return 'IN_RANGE';
  const gap = Math.abs(smoothPickValue(rank) - smoothPickValue(pick));
  const key = Math.min(rank, pick);
  const bracket =
    key <= 10 ? REACH_BRACKET_TOP10 : key <= 64 ? REACH_BRACKET_THRU64 : REACH_BRACKET_AFTER64;
  if (gap <= bracket) return 'IN_RANGE';
  return pick < rank ? 'REACH' : 'STEAL';
}

/**
 * classifyDraftMove PLUS the unsigned pick-VALUE gap the classification weighed — the
 * SAME magnitude the Act-2 scoreboard counts on. The 1→2 choreography ranks its
 * steal/reach BEATS by this `gap` (Sprint 2 §5.7: import the flag + magnitude here, never
 * re-derive the brackets in a second place). `gap` is 0 for UNDRAFTED / unranked /
 * exactly-on-slot picks (no meaningful gap to rank on).
 */
export interface DraftMoveDetail { move: DraftMove; gap: number; }
export function classifyDraftMoveDetail(rank: number | null, pick: number | null): DraftMoveDetail {
  const move = classifyDraftMove(rank, pick);
  if (pick == null || pick <= 0 || rank == null || pick === rank) return { move, gap: 0 };
  return { move, gap: Math.abs(smoothPickValue(rank) - smoothPickValue(pick)) };
}

// ── Field universe (ONE definition, shared by chart / wall / scoreboard) ───────

/**
 * The field universe `N`: everyone DRAFTED from this class, PLUS undrafted players
 * who logged ≥1 NFL snap (usage.seasons) or carry a contract row (verdict). This is
 * exactly the a2 "drafted-unconditional + UDFAs with ≥1 snap" universe — the SAME
 * set the Act-3 field plots:
 *   - resolved field: `p.verdict !== null || p.drafted`
 *   - pending field:  `p.drafted || usage.seasons.length > 0`
 * Their union (used here) equals each for its own maturity, because a pending class
 * carries no verdicts and a resolved class's snapped players all carry rows. Keeping
 * one definition guarantees the slot can never disagree with the chart denominator.
 */
function inUniverse(p: Player): boolean {
  return p.drafted || p.verdict != null || (p.usage?.seasons?.length ?? 0) > 0;
}

/**
 * The COULDN'T STICK strip predicate (pending field). A pending dot is routed to the
 * strip when the usage waterfall lands it there — i.e. it is NOT ST-primary AND NOT
 * (qualified with a real percentile). Mirrors the too-few-snaps strip membership the
 * Act-3 field applies, so the slot's COULDN'T STICK / STILL-IN-LEAGUE counts can never
 * disagree with the strip edge-tab (ruling 2 + #4).
 */
function isStripDot(p: Player): boolean {
  const u = p.usage;
  if (u && u.stPrimary) return false;                                  // step 1
  if (u && u.qualified && u.careerUsagePercentile != null) return false; // step 2
  return true;                                                          // step 3 → strip
}

// ── Derived stats ──────────────────────────────────────────────────────────────

export interface ScoreboardStats {
  /** N — the field universe (ONE definition above). */
  N: number;

  // Act 3 — resolved, SIX-BAND money ladder (Phase Lambda reframe). Population =
  // plotted_pop (the money-band field; the K/P/LS blank-band rows are excluded),
  // MIRRORING computeAct3FieldLayout's dotsInput so the slot can never contradict the
  // chart's wall/counter (the denominator-sweep rule: every count from live data).
  /** plotted_pop — every dot that carries a money band (== act3_copy_numbers plotted_pop). */
  plottedPop: number;
  /** Per-band counts over the plotted population (NEVER…TOP5). */
  bandCounts: Record<MoneyBand, number>;
  /** GOT PAID = money family (MIDDLE+TOP10+TOP5) — the Lambda scoreboard definition. */
  moneyFamilyCount: number;
  /** NEVER band = never re-signed (the hover never-re-signed base-rate denominator). */
  neverResignedCount: number;

  // Act 3 — both resolved + pending
  /**
   * Became starters — P65 of the SAME usage measure the field plots for this maturity
   * (Lambda §2 re-point): window_usage (first four seasons) for a RESOLVED class,
   * career_usage for a PENDING one (its window isn't closed, so window_usage is null
   * and career keeps the stat honest). Coheres with the STARTER tab.
   */
  becameStartersCount: number;

  // Act 3 — pending
  /** Pending dots routed to the COULDN'T STICK strip (same predicate as the field). */
  couldntStickCount: number;
  /** N − couldntStickCount (the strip COMPLEMENT — NOT a PFF snap line). */
  stillInLeagueCount: number;

  // Act 1 — the board
  /** Consensus PROJECTED round-1 grades (rd === 1). */
  firstRoundGradeCount: number;
  /** Players carrying a consensus projected rank. */
  rankedCount: number;
  /** Distinct consensus sources (most common first). */
  consensusSources: string[];
  /** True when ANY projection data is present (else state 1 renders supporting only). */
  hasProjection: boolean;

  // Act 2 — draft day
  /** Picked EARLIER than consensus, value-gap clears the bracket. */
  reaches: number;
  /** Picked LATER than consensus, value-gap clears the bracket. */
  steals: number;
  /** Every player with a real pick (the Act-2 strip total + hover denominator). */
  draftedCount: number;
  /**
   * draftedCount − reaches − steals. Every drafted player is a reach, a steal, or the
   * neutral remainder (reaches already fold in the imputed drafted-but-unranked), so
   * on-target is the clean middle beat of the Act-2 diverging strip (brief §4). Floored
   * at 0 defensively — the three always partition the drafted set, so it can't go
   * negative, but a future classify change shouldn't be able to make it ugly.
   */
  onTargetCount: number;
}

/**
 * Compute every scoreboard count from a passed-in player set (ruling 2).
 *
 * @param players  the FULL class player set (class-scope in brief d; scope-filtered
 *                 in brief f — NEVER the display-filtered set; see the scope boundary
 *                 in the module header).
 * @param year     the class year (used only for vintage/utility copy in the component).
 * @param classMaxPick  (brief f) the CLASS max pick, pinned by the caller. Used as the
 *                 imputation anchor for drafted-but-unranked players (rank → maxPick+1)
 *                 so a player's REACH/STEAL designation is identical whether or not a
 *                 lens has narrowed `players` — it must match the Act 2 hover, which
 *                 imputes against the SAME class anchor (one value, two consumers).
 *                 Omitted → falls back to the passed set's max (class-scope brief-d
 *                 behavior, where the passed set IS the whole class — unchanged).
 */
export function computeScoreboardStats(
  players: Player[],
  year: number,
  classMaxPick?: number,
): ScoreboardStats {
  const universe = players.filter(inUniverse);
  const N = universe.length;

  // ── Act 3 six-band money ladder (Phase Lambda reframe) ─────────────────────
  // Population MIRRORS computeAct3FieldLayout's dotsInput (lib/chartMath.ts): drafted
  // OR signed-UDFA, MINUS the K/P/LS rows (a verdict row with a BLANK money_band → out
  // of the money market). Same `players` in ⇒ identical plotted_pop out, so GOT PAID
  // here equals the field wall / choreography counter — keep this predicate in sync
  // with computeAct3FieldLayout if that population rule ever changes.
  const hasPlayed = (p: Player): boolean => (p.usage?.seasons?.length ?? 0) > 0;
  const isSignedUDFA = (p: Player): boolean => !p.drafted && (p.verdict !== null || hasPlayed(p));
  const bandCounts: Record<MoneyBand, number> = { NEVER: 0, ZERO: 0, MIN: 0, MIDDLE: 0, TOP10: 0, TOP5: 0 };
  let plottedPop = 0;
  for (const p of players) {
    if (!(p.drafted || isSignedUDFA(p))) continue;
    if (p.verdict !== null && p.verdict.moneyBand === null) continue; // blank-band K/P/LS out
    bandCounts[p.verdict?.moneyBand ?? 'NEVER']++;
    plottedPop++;
  }
  const moneyFamilyCount = MONEY_FAMILY_BANDS.reduce((s, b) => s + bandCounts[b], 0);
  const neverResignedCount = bandCounts.NEVER;

  // ── Became starters — P65 of the measure the field plots for THIS maturity (§2) ─
  // Resolved Act-3 plots window_usage (first four seasons); pending still plots
  // career_usage (the four-season window isn't closed, so window_usage is null and a
  // window-based count would read 0). Pick the matching field per class so the slot
  // and the chart's STARTER read agree.
  const resolvedClass = getVerdictMaturity(year) === 'resolved';
  const becameStartersCount = players.filter((p) => {
    const pct = resolvedClass ? p.usage?.windowUsagePercentile : p.usage?.careerUsagePercentile;
    return pct != null && pct >= STARTER_PERCENTILE;
  }).length;

  // ── Act 3 pending (strip COMPLEMENT keeps slot=chart coherence) ────────────
  // ⚠ KNOWN LIMITATION (accepted + flagged 2026-06-13): drafted K/P/LS have no snap
  // data, sit in the strip (rider 4), and are therefore counted NOT still-in-league —
  // a rostered 4-yr punter is wrongly excluded. The data can't distinguish a rostered
  // specialist from a washout (zero player_seasons rows either way), and every
  // alternative breaks slot=chart coherence, so this is ACCEPTED + documented.
  const couldntStickCount = universe.filter(isStripDot).length;
  const stillInLeagueCount = N - couldntStickCount;

  // ── Act 1 the board ────────────────────────────────────────────────────────
  const firstRoundGradeCount = players.filter((p) => p.rd === 1).length;
  const rankedCount = players.filter((p) => p.rank != null).length;
  const sourceCounts = new Map<string, number>();
  for (const p of players) {
    const s = p.consensus_source;
    if (s) sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }
  const consensusSources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  const hasProjection = firstRoundGradeCount > 0 || rankedCount > 0;

  // ── Act 2 reaches / steals ─────────────────────────────────────────────────
  // Via the SHARED classifyDraftMove (also feeds the Act 2 hover). A drafted player
  // with no consensus rank is imputed to maxPick+1 so the early-unranked pick reads
  // REACH — this is why the reach total now exceeds the old (real-rank-only) count;
  // steals are unaffected (an imputed max rank can never be a STEAL).
  // Imputation anchor = the CLASS max pick when the caller pins it (brief f), so a
  // lens narrowing `players` can never shift a drafted-but-unranked player's imputed
  // rank and flip his REACH/STEAL vs his own hover. Fallback = the passed set's max
  // (class-scope brief-d callers pass the whole class, so identical).
  const maxPick = classMaxPick ?? players.reduce(
    (m, p) => (p.pick_drafted != null && p.pick_drafted > m ? p.pick_drafted : m),
    0,
  );
  let reaches = 0;
  let steals = 0;
  let draftedCount = 0;
  for (const p of players) {
    const pick = p.pick_drafted;
    if (pick == null || pick <= 0) continue; // undrafted — not a reach/steal
    draftedCount++;
    const move = classifyDraftMove(p.rank ?? maxPick + 1, pick);
    if (move === 'REACH') reaches++;
    else if (move === 'STEAL') steals++;
  }
  // The honest middle beat: everyone drafted who wasn't a reach or a steal. The three
  // partition the drafted set, so this is the clean remainder (Math.max guards against
  // a future classify change, never reached today).
  const onTargetCount = Math.max(0, draftedCount - reaches - steals);

  return {
    N,
    plottedPop,
    bandCounts,
    moneyFamilyCount,
    neverResignedCount,
    becameStartersCount,
    couldntStickCount,
    stillInLeagueCount,
    firstRoundGradeCount,
    rankedCount,
    consensusSources,
    hasProjection,
    reaches,
    steals,
    draftedCount,
    onTargetCount,
  };
}

// ── Team code (the 2–3-letter chip in the 1→2 per-pick caption) ────────────────

/**
 * Standard 2–3-letter team code keyed by canonical full name (initialisms, not logos —
 * Part 2 state 2). Derived from the team_drafted string via resolveTeamName upstream;
 * falls back to the first 3 chars uppercased for anything unmapped.
 */
const TEAM_CODE_BY_FULL: Record<string, string> = {
  'Buffalo Bills': 'BUF', 'Miami Dolphins': 'MIA', 'New England Patriots': 'NE', 'New York Jets': 'NYJ',
  'Baltimore Ravens': 'BAL', 'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Pittsburgh Steelers': 'PIT',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX', 'Tennessee Titans': 'TEN',
  'Denver Broncos': 'DEN', 'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Dallas Cowboys': 'DAL', 'New York Giants': 'NYG', 'Philadelphia Eagles': 'PHI', 'Washington Commanders': 'WAS',
  'Chicago Bears': 'CHI', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB', 'Minnesota Vikings': 'MIN',
  'Atlanta Falcons': 'ATL', 'Carolina Panthers': 'CAR', 'New Orleans Saints': 'NO', 'Tampa Bay Buccaneers': 'TB',
  'Arizona Cardinals': 'ARI', 'Los Angeles Rams': 'LAR', 'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA',
};

/** Map a canonical full team name to its short code (Part 2 team chip). */
export function teamCodeFromFullName(fullName: string): string {
  if (!fullName) return '—';
  return TEAM_CODE_BY_FULL[fullName] ?? fullName.slice(0, 3).toUpperCase();
}
