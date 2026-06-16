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
import {
  GOT_PAID_TIERS,
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

// ── Field universe (ONE definition, shared by chart / wall / scoreboard) ───────

/**
 * The field universe `N`: everyone DRAFTED from this class, PLUS undrafted players
 * who logged ≥1 NFL snap (usage.seasons) or carry a contract row (verdict). This is
 * exactly the a2 "drafted-unconditional + UDFAs with ≥1 snap" universe — the SAME
 * set the jellyfish plots:
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
 * (qualified with a real percentile). Reuses the EXACT predicate the pending field's
 * `pendingUsageYStrategy` uses to populate the strip, so the slot's COULDN'T STICK /
 * STILL-IN-LEAGUE counts can never disagree with the strip edge-tab (ruling 2 + #4).
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

  // Act 3 — resolved
  /** PREMIUM + SOLID + BRIDGE (ruling 3) — computed LIVE, never a literal. */
  gotPaidCount: number;
  /** PREMIUM only (supporting / export caption material). */
  topOfMarketCount: number;

  // Act 3 — both resolved + pending
  /** careerUsagePercentile >= STARTER_PERCENTILE (ruling 4). Coheres with STARTER tab. */
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
  _year: number,
  classMaxPick?: number,
): ScoreboardStats {
  const universe = players.filter(inUniverse);
  const N = universe.length;

  // ── Act 3 resolved ───────────────────────────────────────────────────────
  let gotPaidCount = 0;
  let topOfMarketCount = 0;
  for (const p of players) {
    const t = p.verdict?.tier;
    if (!t) continue;
    if (GOT_PAID_TIERS.includes(t)) gotPaidCount++;
    if (t === 'PREMIUM') topOfMarketCount++;
  }

  // ── Became starters (resolved + pending; coheres with the STARTER edge-tab) ─
  const becameStartersCount = players.filter(
    (p) => p.usage?.careerUsagePercentile != null && p.usage.careerUsagePercentile >= STARTER_PERCENTILE,
  ).length;

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
  for (const p of players) {
    const pick = p.pick_drafted;
    if (pick == null || pick <= 0) continue; // undrafted — not a reach/steal
    const move = classifyDraftMove(p.rank ?? maxPick + 1, pick);
    if (move === 'REACH') reaches++;
    else if (move === 'STEAL') steals++;
  }

  return {
    N,
    gotPaidCount,
    topOfMarketCount,
    becameStartersCount,
    couldntStickCount,
    stillInLeagueCount,
    firstRoundGradeCount,
    rankedCount,
    consensusSources,
    hasProjection,
    reaches,
    steals,
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
