/**
 * lib/scoring.ts — DraftMap Scoring Engine (Delta-1)
 *
 * Pure functions for computing player outcome scores (0–100) from NFL career
 * and seasonal statistics. No side effects, no data fetching, no chart logic.
 *
 * Core scoring model:
 *   1. Each stat → percentile rank within position group (0–100)
 *   2. Percentiles weighted by position-specific weights → raw 0–100 score
 *   3. Award floors applied post-scoring: All-Pro >= 75, 2x Pro Bowl >= 58
 *   4. ARC combined score: (Apex×0.45) + (Rookie×0.35) + (Consistency×0.20)
 *
 * Graceful degradation:
 *   - Defensive detailed stats (tackles/sacks/INTs) are optional — missing fields
 *     are dropped from weighting and remaining weights re-normalized automatically
 *   - dataSource field signals quality: 'seasonal' > 'career' > 'snaps-only'
 *
 * Validation targets (2021 class):
 *   - Trevor Lawrence (QB, pick 1, 1x Pro Bowl): score >= 58 (Great)
 *   - Zach Wilson (QB, pick 2, no awards):       score materially lower
 *
 * Usage:
 *   const cohort = allPlayers.filter(p => p.position === 'EDGE')
 *   const score  = scoreFromCareerStats(micahParsons, cohort)
 *
 *   // Or batch-score an entire dataset:
 *   const scores = scoreAllFromCareer(allCareerStats)
 */

import { getTeamContext, LEAGUE_AVG_PRESSURE_RATE } from './teamContext'

// ── Scoring position type ──────────────────────────────────────────────────────

/**
 * Positions the scoring engine recognizes.
 * Superset of the chart's Position type — includes FB, ST.
 * Normalize raw data strings through normalizePosition() before use.
 */
export type ScoringPosition =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'FB'   // skill offense
  | 'OT' | 'IOL'                          // offensive line
  | 'EDGE' | 'DT' | 'LB' | 'CB' | 'S'   // defense
  | 'ST'                                   // special teams (Depth/ST tier only)

// ── Tier type ──────────────────────────────────────────────────────────────────

export type TierLabel =
  | 'Star'          // 75-100  elite impact
  | 'Great'         // 58-74   top-tier player
  | 'Good'          // 42-57   above average
  | 'Starter'       // 28-41   consistent starter
  | 'Contributor'   // 14-27   role player (not used for QB -- see getTier)
  | 'Depth/ST'      // 5-13    depth / special teams
  | 'Bust'          // 0-4     bust / out of league

// ── Stat keys ─────────────────────────────────────────────────────────────────

/**
 * Internal keys for the stat vectors used in percentile scoring.
 * Maps to columns in career and seasonal data CSVs.
 */
type StatKey =
  | 'passYards'    | 'passTDs'
  | 'rushYards'    | 'rushTDs'
  | 'recYards'     | 'recTDs'
  | 'soloTackles'  | 'defInts' | 'sacks'
  | 'offSnapPct'   | 'defSnapPct' | 'stSnapPct'
  | 'gamesPlayed'  | 'seasonsStarted'

// ── Input types ───────────────────────────────────────────────────────────────

/**
 * Career-total statistics for a drafted player.
 * Maps to columns in nfl_2021_draft_outcomes.csv (and future multi-year equivalents).
 *
 * Null fields mean data has not yet been entered (not that the player had 0).
 * The scoring engine gracefully handles null by removing the stat from weighting.
 */
export interface CareerStats {
  pfrId: string
  name: string
  position: ScoringPosition
  draftYear: number
  draftPick: number         // overall pick number (1-256)

  // Awards -- used for score floors
  allPro: number            // count of All-Pro first-team selections
  proBowls: number          // count of Pro Bowl selections
  seasonsStarted: number    // career seasons started (key metric for OT/IOL)

  // Career totals
  wAV: number | null        // weighted approximate value (PFR metric)
  gamesPlayed: number | null

  // Offensive career stats
  passYards: number | null
  passTDs: number | null
  rushYards: number | null
  rushTDs: number | null
  recYards: number | null
  recTDs: number | null

  // Defensive career stats
  // null = not yet manually entered by Derek; 0 = entered, player had zero
  soloTackles: number | null
  defInts: number | null
  sacks: number | null

  // Year-by-year snap percentages (index 0 = rookie year, 1 = year 2, etc.)
  // Values are season-average snap% (0.0-1.0). Null = player had no data that year.
  offSnapPctByYear: (number | null)[]
  defSnapPctByYear: (number | null)[]
  stSnapPctByYear: (number | null)[]
}

/**
 * Per-season statistics for one player-season.
 * Maps to seasonal_offensive_stats_2018_2024.csv and seasonal_defensive_snaps_2018_2024.csv.
 *
 * Defensive detailed stats (soloTackles, defInts, sacks) are null until
 * Derek manually enters them -- the engine degrades to snap-% only in that case.
 */
export interface SeasonStats {
  pfrId: string
  team?: string | null
  season: number            // calendar year (e.g. 2021)
  position: ScoringPosition
  gamesPlayed: number

  // Offensive
  passYards: number | null
  passTDs: number | null
  rushYards: number | null
  rushTDs: number | null
  recYards: number | null
  recTDs: number | null

  // Defensive detailed (null = not entered; 0 = entered, player had zero)
  soloTackles: number | null
  defInts: number | null
  sacks: number | null

  // Snap percentages (0.0-1.0 range from source data)
  offSnapPct: number | null
  defSnapPct: number | null
  stSnapPct: number | null
}

// ── Output type ───────────────────────────────────────────────────────────────

/** Per-step cumulative score entry for journey bar animation (Delta-5). */
export interface StepScore {
  stepId: string        // matches journey step ID: String(season) e.g. '2021', or 'career'
  score: number | null  // null if no data for this step
  team?: string | null  // NFL team for this season (populated from SeasonStats.team)
  trajectoryRaw?: number        // raw traj score for post-processing (null = Year 1)
  trajectoryMultiplier?: number // 0.7–1.5 dot size multiplier (null = Year 1/neutral)
}

/**
 * Per-season display row for the Player Card stat grid.
 * Built from raw Google Sheets player_seasons data in fetchOutcomeScores().
 * Counting stats are summed across all teams for multi-team seasons.
 */
export interface DisplaySeasonRow {
  season: number             // calendar year, e.g. 2021
  teams: string[]            // ['KC'] single team, or ['KC', 'SEA'] if traded mid-season
  gamesPlayed: number
  gamesStarted: number | null
  snapPct: number | null     // 0.0–1.0 decimal; games-weighted avg for multi-team seasons
  snapCount: number | null   // raw snap count (sum across teams); used for totals row weighted avg

  // Offense
  passYards: number | null
  passTDs: number | null
  rushYards: number | null
  rushTDs: number | null
  recYards: number | null
  recTDs: number | null
  receptions: number | null
  intsThrownQB: number | null  // QB interceptions thrown (from 'interceptions' column)

  // Defense
  sacks: number | null
  tfl: number | null         // raw tfl column — includes sacks; display as-is
  qbHits: number | null
  soloTackles: number | null
  defInts: number | null
  passDeflections: number | null

  // Awards (per-season flags for ★ / † display)
  allPro: boolean
  proBowl: boolean

  // Per-season ARC score (from PlayerOutcomeScore.scoresByYear[season])
  arcScore: number | null
}

/** Scored outcome for a player -- output of the scoring engine. */
export interface PlayerOutcomeScore {
  pfrId: string
  position: ScoringPosition

  // Final scores
  score: number             // 0-100, final (post-award-floor, post-involvement-floor)
  rawScore: number          // 0-100, pre-award-floor
  tier: TierLabel

  // ARC decomposition -- null when only career totals available (no seasonal data)
  apexScore: number | null        // mean of top-3 season scores
  rookieScore: number | null      // mean of rookie-window scores (draftYear through draftYear+3)
  consistencyScore: number | null // mean of all season scores
  arcScore: number | null         // (apex×0.45 + rookie×0.35 + consistency×0.20)

  // Range for the static career range indicator
  rangeMin: number | null         // lowest single-season score
  rangeMax: number | null         // highest single-season score

  // Year-by-year scores for animation (Delta-3)
  // key = calendar year, e.g. { 2021: 42, 2022: 51, 2023: 58, 2024: 55 }
  scoresByYear: Record<number, number>

  // Per-step position-normalized snap percentile scores for production animation.
  // score field carries snap percentile (0–100) after sheets.ts post-processing.
  stepScores: StepScore[]

  // Metadata
  dataSeasons: number             // seasons with enough data to produce a score
  hasAwardFloor: boolean          // true if an All-Pro/Pro Bowl floor was applied
  dataSource: 'seasonal' | 'career' | 'snaps-only'
}

/** One entry from public/pick_value_curve.json */
export interface PickValueEntry {
  pick: number
  normalized: number   // 0-100 empirical pick value
}

// ── Tier thresholds ───────────────────────────────────────────────────────────

/** Score ranges for each tier (both bounds inclusive). */
export const TIER_THRESHOLDS: Record<TierLabel, [number, number]> = {
  Star:          [75, 100],
  Great:         [58, 74],
  Good:          [42, 57],
  Starter:       [28, 41],
  Contributor:   [14, 27],
  'Depth/ST':    [5,  13],
  Bust:          [0,  4],
}

/** Minimum scores applied when a player earned a career award. */
const AWARD_FLOORS = {
  allPro:  75,   // All-Pro -> Star minimum
  proBowl: 58,   // Pro Bowl -> Great minimum
} as const

// ── Position weights ──────────────────────────────────────────────────────────

/**
 * Stat weights by position. Values within each position sum to 1.0.
 * Stats not listed (or listed at 0) are not used for that position.
 *
 * When a stat is null at scoring time, it's removed from the weight map
 * and remaining weights are re-normalized -- see reweightForAvailable().
 *
 * Design notes:
 *  - EDGE: sacks heavily weighted -- pass-rush is the defining value signal for the position
 *  - DT: snaps/tackles weighted more than sacks (run defense matters as much as pass rush)
 *  - LB: tackles are the primary signal; INTs reduced (most LBs get 0-2/year)
 *  - CB: coverage (INTs + snap%) dominates; tackles intentionally low -- a good cover corner
 *        earns snaps by not being thrown at, not by tackling. High tackle totals can indicate
 *        coverage failure as much as run support.
 *  - S: box safety tackling is a core value signal; sack weight reduced (blitzing is real
 *        but 10% was too heavy for a non-primary responsibility)
 *  - OT/IOL: snap% + games + seasons started = proxy for "true starter"; team context
 *        (pass_prot_quality + run_block_quality) applied separately in applyOLineContext
 *  - QB: no INTs (not in dataset yet); offSnapPct captures starter status
 *
 * Weight validation: 2026-05-23. All positions confirmed via simulate-and-rank test
 * against representative cohorts. Key outcomes verified:
 *   - CB cover corner scores higher than high-tackle/no-INT corner
 *   - EDGE pass rusher separates further from run-stopping DE
 *   - LB coverage-only (high INTs, low tackles) correctly drops vs tackle leaders
 */
export const POSITION_WEIGHTS: Record<ScoringPosition, Partial<Record<StatKey, number>>> = {
  QB: {
    passYards:   0.30,
    passTDs:     0.30,
    rushYards:   0.08,
    rushTDs:     0.07,
    offSnapPct:  0.15,
    gamesPlayed: 0.10,
  },
  RB: {
    rushYards:   0.35,
    rushTDs:     0.18,
    recYards:    0.20,
    recTDs:      0.10,
    offSnapPct:  0.12,
    gamesPlayed: 0.05,
  },
  WR: {
    recYards:    0.43,   // primary WR signal; slight increase
    recTDs:      0.20,   // reduced -- TDs are scheme/usage-dependent (red zone target share)
    rushYards:   0.05,   // small gadget bonus -- intentionally small
    offSnapPct:  0.22,   // coaching trust; increased to absorb TD reduction
    gamesPlayed: 0.10,
  },
  TE: {
    recYards:    0.35,
    recTDs:      0.25,
    rushYards:   0.05,    // blocking/role usage captured via playing time
    offSnapPct:  0.20,
    gamesPlayed: 0.15,
  },
  FB: {                    // treated like TE -- hybrid catching/blocking role
    recYards:    0.35,
    recTDs:      0.25,
    rushYards:   0.05,
    offSnapPct:  0.20,
    gamesPlayed: 0.15,
  },
  OT: {
    offSnapPct:      0.45,   // primary signal: are they starting?
    gamesPlayed:     0.30,
    seasonsStarted:  0.25,
  },
  IOL: {
    offSnapPct:      0.45,
    gamesPlayed:     0.30,
    seasonsStarted:  0.25,
  },
  EDGE: {
    sacks:       0.50,   // pass-rush is the defining value signal -- increased from 0.40
    soloTackles: 0.15,   // run defense participation, secondary -- reduced from 0.25
    defSnapPct:  0.30,
    defInts:     0.05,   // small bonus -- rare but high-value plays
  },
  DT: {
    defSnapPct:  0.40,
    sacks:       0.25,
    soloTackles: 0.30,
    defInts:     0.05,
  },
  LB: {
    soloTackles: 0.40,   // primary LB value signal -- increased from 0.30
    sacks:       0.20,
    defInts:     0.10,   // reduced from 0.20 -- most LBs get 0-2 INTs/year
    defSnapPct:  0.30,
  },
  CB: {
    defInts:     0.45,   // coverage is the primary CB signal -- increased from 0.30
    defSnapPct:  0.40,   // coaching trust -- increased from 0.35
    soloTackles: 0.10,   // intentionally low -- high tackles can indicate coverage failure
    sacks:       0.05,   // small blitz bonus only
  },
  S: {
    soloTackles: 0.30,   // box safety tackling is a core value signal -- increased from 0.25
    defInts:     0.30,
    sacks:       0.05,   // reduced from 0.10 -- blitzing real but not primary responsibility
    defSnapPct:  0.35,
  },
  ST: {
    stSnapPct:   0.60,
    gamesPlayed: 0.40,
  },
}

// ── Position normalization ────────────────────────────────────────────────────

/**
 * Normalize raw position strings from source data to ScoringPosition.
 * Returns null for roles the scoring engine doesn't handle (K, P, LS).
 *
 * Covers PFR's raw position codes: T (tackle), DE (edge rusher), DL (interior DL),
 * OL (generic offensive lineman), DB (generic defensive back), etc.
 */
export function normalizePosition(raw: string): ScoringPosition | null {
  const p = raw.trim().toUpperCase()
  const direct: Record<string, ScoringPosition> = {
    QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', FB: 'FB',
    OT: 'OT', T: 'OT',
    OG: 'IOL', OC: 'IOL', IOL: 'IOL', G: 'IOL', C: 'IOL',
    OL: 'OT',
    EDGE: 'EDGE', DE: 'EDGE', OLB: 'EDGE',
    DT: 'DT', DL: 'DT', NT: 'DT',
    LB: 'LB', ILB: 'LB', MLB: 'LB',
    CB: 'CB', DB: 'CB',
    S: 'S', SS: 'S', FS: 'S',
    ST: 'ST',
  }
  return direct[p] ?? null
}

// ── Core math ─────────────────────────────────────────────────────────────────

/**
 * Compute the percentile rank (0-100) of value within an array of reference values.
 *
 * Method: count of values strictly less than `value`, divided by (n - 1).
 * Ties: counted as "not strictly less than" -- a player tied for first gets 100.
 * Edge cases:
 *   - Empty or single-element cohort: 50 (mid-distribution by convention)
 *   - NaN / Infinity in cohort silently excluded
 */
export function computePercentile(value: number, cohortValues: number[]): number {
  const valid = cohortValues.filter(v => Number.isFinite(v))
  if (valid.length <= 1) return 50
  const sorted = [...valid].sort((a, b) => a - b)
  const below  = sorted.filter(v => v < value).length
  return Math.round((below / (sorted.length - 1)) * 100)
}

/**
 * Average non-null values from a year-by-year snap percentage array.
 * Returns null if the array contains no usable data points.
 */
export function aggregateSnapPct(byYear: (number | null)[]): number | null {
  const valid = byYear.filter((v): v is number => v !== null && Number.isFinite(v))
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

/**
 * Re-normalize position weights to only use stats that are actually present
 * (non-null) in the stat vector. This is the graceful degradation mechanism:
 *
 *   EDGE with tackle/INT data  -> uses all four weights
 *   EDGE with snaps-only data  -> sacks/soloTackles/defInts dropped -> defSnapPct = 1.0
 *
 * Returns an empty object if no stats at all are available.
 */
export function reweightForAvailable(
  weights: Partial<Record<StatKey, number>>,
  statVector: Partial<Record<StatKey, number | null>>,
): Partial<Record<StatKey, number>> {
  const available = (Object.entries(weights) as [StatKey, number][])
    .filter(([key, w]) => w > 0 && statVector[key] != null)

  const total = available.reduce((sum, [, w]) => sum + w, 0)
  if (total === 0) return {}

  return Object.fromEntries(
    available.map(([key, w]) => [key, w / total])
  ) as Partial<Record<StatKey, number>>
}

/**
 * Compute a weighted percentile score (0-100) for one player
 * against a cohort of same-position stat vectors.
 *
 * Steps:
 *   1. Re-normalize weights for available stats (graceful degradation)
 *   2. For each stat, compute player's percentile within the cohort
 *   3. Return weighted sum of percentiles, clamped to [0, 100]
 */
export function computeWeightedScore(
  playerStats: Partial<Record<StatKey, number | null>>,
  cohortStats: Partial<Record<StatKey, number | null>>[],
  rawWeights: Partial<Record<StatKey, number>>,
): number {
  const weights = reweightForAvailable(rawWeights, playerStats)
  if (Object.keys(weights).length === 0) return 0

  let total = 0
  for (const [key, weight] of Object.entries(weights) as [StatKey, number][]) {
    const playerValue  = playerStats[key] ?? 0
    const cohortValues = cohortStats
      .map(s => s[key])
      .filter((v): v is number => v != null)
    total += computePercentile(playerValue, cohortValues) * weight
  }

  return Math.round(Math.min(100, Math.max(0, total)))
}

// ── Tier and award functions ───────────────────────────────────────────────────

/**
 * Map a score (0-100) to the appropriate tier label.
 *
 * QB special case: no 'Contributor' tier -- a QB with some involvement
 * but below Starter thresholds scores 'Depth/ST'. Bust only for QBs with
 * essentially no NFL involvement.
 */
export function getTier(score: number, position?: ScoringPosition): TierLabel {
  if (score >= 75) return 'Star'
  if (score >= 58) return 'Great'
  if (score >= 42) return 'Good'
  if (score >= 28) return 'Starter'
  if (score >= 14) {
    if (position === 'QB') return 'Depth/ST'
    return 'Contributor'
  }
  if (score >= 5) return 'Depth/ST'
  return 'Bust'
}

/**
 * Apply career-award score floors. Returns adjusted score and whether a floor fired.
 *
 *   All-Pro selection  -> minimum 75 (Star tier)
 *   Pro Bowl selection -> minimum 58 (Great tier)
 *
 * Multiple awards use the highest applicable floor.
 */
export function applyAwardFloor(
  score: number,
  allPro: number,
  proBowls: number,
): { score: number; hasAwardFloor: boolean } {
  let floor = 0
  if (allPro    > 0) floor = Math.max(floor, AWARD_FLOORS.allPro)
  if (proBowls >= 2) floor = Math.max(floor, AWARD_FLOORS.proBowl)
  const floored = Math.max(score, floor)
  return { score: floored, hasAwardFloor: floored > score }
}

// ── NFL involvement check ─────────────────────────────────────────────────────

/**
 * Returns true if the player had any meaningful NFL involvement:
 * at least one snap in any season, or any non-zero career counting stat.
 *
 * Zero involvement -> guaranteed Bust regardless of position.
 * Any involvement  -> minimum Depth/ST (score >= 5).
 */
export function hasNFLInvolvement(stats: CareerStats): boolean {
  const allSnaps = [
    ...stats.offSnapPctByYear,
    ...stats.defSnapPctByYear,
    ...stats.stSnapPctByYear,
  ]
  if (allSnaps.some(p => p !== null && p > 0)) return true

  const countingStats = [
    stats.gamesPlayed,
    stats.passYards, stats.rushYards, stats.recYards,
    stats.soloTackles, stats.sacks,
  ]
  return countingStats.some(v => v !== null && v > 0)
}

// ── Career scoring ────────────────────────────────────────────────────────────

/** Extract a stat vector from career-total data for percentile computation. */
function buildCareerStatVector(
  stats: CareerStats,
): Partial<Record<StatKey, number | null>> {
  return {
    passYards:      stats.passYards,
    passTDs:        stats.passTDs,
    rushYards:      stats.rushYards,
    rushTDs:        stats.rushTDs,
    recYards:       stats.recYards,
    recTDs:         stats.recTDs,
    soloTackles:    stats.soloTackles,
    defInts:        stats.defInts,
    sacks:          stats.sacks,
    offSnapPct:     aggregateSnapPct(stats.offSnapPctByYear),
    defSnapPct:     aggregateSnapPct(stats.defSnapPctByYear),
    stSnapPct:      aggregateSnapPct(stats.stSnapPctByYear),
    gamesPlayed:    stats.gamesPlayed,
    seasonsStarted: stats.seasonsStarted,
  }
}

/** Count non-null years across snap percentage arrays. */
function countDataSeasons(stats: CareerStats): number {
  const offYears = stats.offSnapPctByYear.filter(v => v != null).length
  const defYears = stats.defSnapPctByYear.filter(v => v != null).length
  const stYears  = stats.stSnapPctByYear.filter(v => v != null).length
  return Math.max(offYears, defYears, stYears)
}

/**
 * Score a player from career-total statistics against a position-group cohort.
 *
 * The cohort must contain all players at the same position (including this player)
 * so percentiles are computed against the correct reference population.
 *
 * When year-by-year seasonal data is available, prefer scoreFromSeasonStats()
 * -- it produces JAWS decomposition and per-year scores for animation.
 *
 * @param player  Player to score
 * @param cohort  All players at the same position (reference population)
 */
export function scoreFromCareerStats(
  player: CareerStats,
  cohort: CareerStats[],
): PlayerOutcomeScore {
  // Bust: no NFL involvement at all
  if (!hasNFLInvolvement(player)) {
    return {
      pfrId: player.pfrId, position: player.position,
      score: 0, rawScore: 0, tier: 'Bust',
      apexScore: null, rookieScore: null, consistencyScore: null, arcScore: null,
      rangeMin: null, rangeMax: null,
      scoresByYear: {}, stepScores: [],
      dataSeasons: 0, hasAwardFloor: false, dataSource: 'career',
    }
  }

  const playerVec  = buildCareerStatVector(player)
  const cohortVecs = cohort.map(buildCareerStatVector)
  const weights    = POSITION_WEIGHTS[player.position] ?? POSITION_WEIGHTS.ST

  const rawScore = computeWeightedScore(playerVec, cohortVecs, weights)

  // Determine data quality signal
  const isDefensive = ['EDGE', 'DT', 'LB', 'CB', 'S'].includes(player.position)
  const hasDetailedDefStats =
    player.soloTackles !== null || player.sacks !== null || player.defInts !== null
  const dataSource: PlayerOutcomeScore['dataSource'] =
    isDefensive && !hasDetailedDefStats ? 'snaps-only' : 'career'

  // Award floors, then involvement floor (>= 5 for any NFL participation)
  const { score: awarded, hasAwardFloor } = applyAwardFloor(rawScore, player.allPro, player.proBowls)
  const score = Math.max(awarded, 5)

  return {
    pfrId:           player.pfrId,
    position:        player.position,
    score,
    rawScore,
    tier:            getTier(score, player.position),
    apexScore:       null,  // not decomposed in career-only path
    rookieScore:     null,
    consistencyScore: null,
    arcScore:        null,
    rangeMin:        null,
    rangeMax:        null,
    scoresByYear:    {},
    stepScores:      [],
    dataSeasons:     countDataSeasons(player),
    hasAwardFloor,
    dataSource,
  }
}

// ── Team context adjustments ──────────────────────────────────────────────────

// OT/IOL: blend playing-time score with team OL quality, snap-weighted.
// 60% playing time (primary signal) + 40% team quality.
// Snap-weighting: a full-time starter earns the full team signal; a swing
// tackle at 20% snaps gets partial credit, not the full signal.
//
// Team quality uses pass_prot_quality and run_block_quality equally (0.50/0.50)
// rather than the blended oline_quality field. This gives OT/IOL explicit credit
// for run-blocking (enabling a top rushing offense) separately from pass protection.
// QB context uses pressure_rate_allowed exclusively and is unaffected by this split.
function applyOLineContext(
  baseScore: number,
  team: string | null | undefined,
  season: number,
  snapPct: number,
): number {
  if (snapPct < 0.40) return baseScore

  const ctx = team ? getTeamContext(team, season) : null
  if (!ctx) return baseScore

  const combinedOLQuality = ctx.pass_prot_quality * 0.50 + ctx.run_block_quality * 0.50
  const snapWeight = Math.min(snapPct, 1.0)
  const contextContribution = combinedOLQuality * snapWeight + 50 * (1 - snapWeight)
  return baseScore * 0.60 + contextContribution * 0.40
}

// QB: small upward adjustment when a QB produced despite poor pass protection.
// Scale: 1% above-avg pressure ≈ +0.5 pts. Capped at ±5 pts.
// Skips backup QBs (< 30% snap share) — context on tiny samples is noise.
function applyQBContextAdjustment(
  baseScore: number,
  team: string | null | undefined,
  season: number,
  snapPct: number,
): number {
  const ctx = team ? getTeamContext(team, season) : null
  if (!ctx || snapPct < 0.30) return baseScore

  const pressureDelta = ctx.pressure_rate_allowed - LEAGUE_AVG_PRESSURE_RATE
  const adjustment = Math.max(-5, Math.min(5, pressureDelta * 50))
  return Math.max(0, Math.min(100, baseScore + adjustment))
}

// EDGE/DT snaps-only fallback: blend snap-% percentile with team defensive
// context. Context gets more weight (45%) since individual stats are absent.
// NOT applied when individual tackle/sack data is present — individual stats
// dominate and team context introduces scheme contamination.
function snapsOnlyWithContext(
  snapPctPercentile: number,
  team: string | null | undefined,
  season: number,
  snapPct: number,
  position: 'EDGE' | 'DT',
): number {
  const ctx = team ? getTeamContext(team, season) : null
  if (!ctx) return snapPctPercentile

  const snapWeight = Math.min(snapPct, 1.0)
  const contextScore = position === 'DT'
    ? (ctx.def_pass_rush_quality * 0.50 + ctx.def_run_stop_quality * 0.50)
    : ctx.def_pass_rush_quality  // EDGE is primarily a pass-rush value signal

  const contextContribution = contextScore * snapWeight + 50 * (1 - snapWeight)
  return snapPctPercentile * 0.55 + contextContribution * 0.45
}

// ── Season scoring ────────────────────────────────────────────────────────────

/** Extract a stat vector from per-season data for percentile computation. */
function buildSeasonStatVector(
  stats: SeasonStats,
): Partial<Record<StatKey, number | null>> {
  return {
    passYards:   stats.passYards,
    passTDs:     stats.passTDs,
    rushYards:   stats.rushYards,
    rushTDs:     stats.rushTDs,
    recYards:    stats.recYards,
    recTDs:      stats.recTDs,
    soloTackles: stats.soloTackles,
    defInts:     stats.defInts,
    sacks:       stats.sacks,
    offSnapPct:  stats.offSnapPct,
    defSnapPct:  stats.defSnapPct,
    stSnapPct:   stats.stSnapPct,
    gamesPlayed: stats.gamesPlayed,
    // seasonsStarted not meaningful at per-season level -- omitted
  }
}

/** Linear regression slope over an array of values (index = x, value = y). */
function trajectorySlope(scores: number[]): number {
  if (scores.length < 2) return 0
  const n = scores.length
  const xMean = (n - 1) / 2
  const yMean = scores.reduce((s, v) => s + v, 0) / n
  const num = scores.reduce((s, v, i) => s + (i - xMean) * (v - yMean), 0)
  const den = scores.reduce((s, _, i) => s + (i - xMean) ** 2, 0)
  return den === 0 ? 0 : num / den
}

/** Standard deviation of an array. */
function trajectoryStdev(scores: number[]): number {
  if (scores.length < 2) return 0
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length
  return Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length)
}

/**
 * Raw trajectory score: slope × (1/(1+stdev)) × log(n+1)
 * Returns null when fewer than 2 seasons (Year 1 = no trajectory yet).
 */
export function computeRawTrajectory(scores: number[]): number | null {
  if (scores.length < 2) return null
  const slope = trajectorySlope(scores)
  const stdev = trajectoryStdev(scores)
  return slope * (1 / (1 + stdev)) * Math.log(scores.length + 1)
}

/**
 * Score a player's career from year-by-year seasonal statistics.
 * Computes independent per-season scores, then applies JAWS combined scoring.
 * Produces full scoresByYear map for Delta-3 animation.
 *
 * @param playerSeasons  All seasons for this one player, any order (sorted internally)
 * @param allSeasons     Reference population: all seasons for all players at this position
 * @param awards         Career award counts (for award floor on combined score)
 */
export function scoreFromSeasonStats(
  playerSeasons: SeasonStats[],
  allSeasons: SeasonStats[],
  awards: { allPro: number; proBowls: number },
): PlayerOutcomeScore {
  const position = playerSeasons[0]?.position ?? 'QB'
  const pfrId    = playerSeasons[0]?.pfrId ?? ''

  const empty: PlayerOutcomeScore = {
    pfrId, position,
    score: 0, rawScore: 0, tier: 'Bust',
    apexScore: null, rookieScore: null, consistencyScore: null, arcScore: null,
    rangeMin: null, rangeMax: null,
    scoresByYear: {}, stepScores: [],
    dataSeasons: 0, hasAwardFloor: false, dataSource: 'seasonal',
  }

  if (playerSeasons.length === 0) return empty

  // Parse draft year from player_id: e.g. 'jamarr-chase-wr-lsu-2021' → 2021
  const idParts   = pfrId.split('-')
  const draftYear = parseInt(idParts[idParts.length - 1], 10)

  const weights    = POSITION_WEIGHTS[position] ?? POSITION_WEIGHTS.ST
  const cohortVecs = allSeasons.map(buildSeasonStatVector)

  // Score each season that has any involvement data
  const seasonScores: Array<{ season: number; score: number; team?: string | null }> = []
  const sorted = [...playerSeasons].sort((a, b) => a.season - b.season)

  for (const s of sorted) {
    const hasInvolvement =
      (s.gamesPlayed ?? 0) > 0 ||
      (s.offSnapPct  ?? 0) > 0 ||
      (s.defSnapPct  ?? 0) > 0
    if (!hasInvolvement) continue

    const vec      = buildSeasonStatVector(s)
    let rawSeason  = computeWeightedScore(vec, cohortVecs, weights)

    if (position === 'OT' || position === 'IOL') {
      rawSeason = applyOLineContext(rawSeason, s.team, s.season, s.offSnapPct ?? 0)
    } else if (position === 'QB') {
      rawSeason = applyQBContextAdjustment(rawSeason, s.team, s.season, s.offSnapPct ?? 0)
    } else if (position === 'EDGE' || position === 'DT') {
      const isSnapsOnly = s.soloTackles === null && s.sacks === null && s.defInts === null
      if (isSnapsOnly) {
        rawSeason = snapsOnlyWithContext(rawSeason, s.team, s.season, s.defSnapPct ?? 0, position)
      }
    }

    const seasonScore = Math.max(rawSeason, 5)   // involvement floor
    seasonScores.push({ season: s.season, score: seasonScore, team: s.team })
  }

  if (seasonScores.length === 0) return empty

  const scores = seasonScores.map(s => s.score)

  // ARC combined score
  const { apex, rookie, consistency, arcScore: combined } = computeARCScore(seasonScores, draftYear)

  // Award floor applied to combined score, then involvement floor
  const { score: awarded, hasAwardFloor } = applyAwardFloor(
    combined, awards.allPro, awards.proBowls,
  )
  const score = Math.max(awarded, 5)

  // Determine data quality signal
  const isDefensive = ['EDGE', 'DT', 'LB', 'CB', 'S'].includes(position)
  const hasDetailedDefStats = playerSeasons.some(
    s => s.soloTackles !== null || s.sacks !== null || s.defInts !== null,
  )
  const dataSource: PlayerOutcomeScore['dataSource'] =
    isDefensive && !hasDetailedDefStats ? 'snaps-only' : 'seasonal'

  // Per-step cumulative ARC scores: compute ARC from seasons 1..N for each step N
  const stepScores: StepScore[] = seasonScores.map((entry, idx) => {
    const cumulative = seasonScores.slice(0, idx + 1)
    const { arcScore: stepRaw } = computeARCScore(cumulative, draftYear)
    const cumulativeScores = cumulative.map(s => s.score)
    return {
      stepId:        String(entry.season),
      score:         Math.max(stepRaw, 5),
      team:          entry.team ?? null,
      trajectoryRaw: computeRawTrajectory(cumulativeScores) ?? undefined, // undefined for idx===0 (Year 1)
    }
  })

  return {
    pfrId,
    position,
    score,
    rawScore:         combined,
    tier:             getTier(score, position),
    apexScore:        apex,
    rookieScore:      rookie,
    consistencyScore: consistency,
    arcScore:         combined,
    rangeMin:         Math.min(...scores),
    rangeMax:         Math.max(...scores),
    scoresByYear:     Object.fromEntries(seasonScores.map(s => [s.season, s.score])),
    stepScores,
    dataSeasons:      seasonScores.length,
    hasAwardFloor,
    dataSource,
  }
}

// ── ARC combined score ────────────────────────────────────────────────────────

/**
 * Compute ARC Score (Apex · Rookie · Consistency) from season data and draft year.
 *
 *   ARC = (Apex × 0.45) + (Rookie × 0.35) + (Consistency × 0.20)
 *   Apex        = mean of top-3 season scores (non-consecutive)
 *   Rookie      = mean of scores for seasons draftYear through draftYear+3
 *   Consistency = mean of all season scores
 *
 * When no rookie-window seasons exist in the data, Rookie is null and the
 * remaining weights re-normalize: Apex × (0.45/0.65), Consistency × (0.20/0.65).
 * All output values are rounded to the nearest integer.
 */
export function computeARCScore(
  seasonData: Array<{ season: number; score: number }>,
  draftYear: number,
): { apex: number; rookie: number | null; consistency: number; arcScore: number } {
  if (seasonData.length === 0) return { apex: 0, rookie: null, consistency: 0, arcScore: 0 }

  const scores = seasonData.map(s => s.score)

  const topN  = [...scores].sort((a, b) => b - a).slice(0, Math.min(3, scores.length))
  const apex  = topN.reduce((s, v) => s + v, 0) / topN.length

  const rookieWindow = seasonData.filter(s => s.season >= draftYear && s.season <= draftYear + 3)
  const rookie = rookieWindow.length > 0
    ? rookieWindow.reduce((s, d) => s + d.score, 0) / rookieWindow.length
    : null

  const consistency = scores.reduce((s, v) => s + v, 0) / scores.length

  const arcScore = rookie !== null
    ? apex * 0.45 + rookie * 0.35 + consistency * 0.20
    : apex * (0.45 / 0.65) + consistency * (0.20 / 0.65)

  return {
    apex:        Math.round(apex),
    rookie:      rookie !== null ? Math.round(rookie) : null,
    consistency: Math.round(consistency),
    arcScore:    Math.round(arcScore),
  }
}

/**
 * ARC Score scoped to the rookie contract window: draftYear through draftYear+3 (4 seasons).
 * Uses the identical formula as computeARCScore() but restricted to those seasons.
 * Returns 0 if no rookie-window seasons exist in the data.
 */
export function computeRookieContractARC(
  allSeasonData: Array<{ season: number; score: number }>,
  draftYear: number,
): number {
  const rookieSeasons = allSeasonData.filter(
    (s) => s.season >= draftYear && s.season <= draftYear + 3,
  )
  if (rookieSeasons.length === 0) return 0
  const { arcScore } = computeARCScore(rookieSeasons, draftYear)
  return arcScore
}

// ── Pick value ────────────────────────────────────────────────────────────────

/**
 * Look up the empirical pick value (0-100) for an overall pick number.
 * Source: public/pick_value_curve.json -- 256 entries, one per pick.
 *
 * Returns exact match when available; linearly interpolates between nearest
 * entries for any gaps; returns 0 for picks beyond the curve's range.
 */
export function getPickValue(pick: number, curve: PickValueEntry[]): number {
  if (curve.length === 0) return 0

  const entry = curve.find(e => e.pick === pick)
  if (entry) return entry.normalized

  const byPick = [...curve].sort((a, b) => a.pick - b.pick)
  const loCandidates = byPick.filter(e => e.pick < pick)
  const lo = loCandidates.length > 0 ? loCandidates[loCandidates.length - 1] : undefined
  const hi = byPick.find(e => e.pick > pick)

  if (!lo) return hi?.normalized ?? 0
  if (!hi) return lo.normalized

  const t = (pick - lo.pick) / (hi.pick - lo.pick)
  return Math.round((lo.normalized + t * (hi.normalized - lo.normalized)) * 10) / 10
}

/**
 * Build an O(1) pick value lookup map from the curve array.
 * Prefer this over repeated getPickValue() calls when scoring many players.
 */
export function buildPickValueLookup(curve: PickValueEntry[]): Map<number, number> {
  return new Map(curve.map(e => [e.pick, e.normalized]))
}

// ── Batch scoring ─────────────────────────────────────────────────────────────

/**
 * Score an entire dataset from career stats.
 * Automatically groups players by position so each is scored
 * against the correct same-position cohort.
 *
 * @returns Map from pfrId -> PlayerOutcomeScore
 */
export function scoreAllFromCareer(
  players: CareerStats[],
): Map<string, PlayerOutcomeScore> {
  // Group by position
  const byPosition = new Map<ScoringPosition, CareerStats[]>()
  for (const p of players) {
    const group = byPosition.get(p.position) ?? []
    group.push(p)
    byPosition.set(p.position, group)
  }

  // Score each position group
  const results = new Map<string, PlayerOutcomeScore>()
  byPosition.forEach((group) => {
    for (const player of group) {
      results.set(player.pfrId, scoreFromCareerStats(player, group))
    }
  })
  return results
}

/**
 * Score an entire dataset from seasonal stats.
 * Groups by player and by position cohort, then scores each player.
 *
 * @param allSeasons  Flat list of all player-seasons across all players and positions
 * @param awards      Map from pfrId -> { allPro, proBowls }
 * @returns Map from pfrId -> PlayerOutcomeScore
 */
export function scoreAllFromSeasons(
  allSeasons: SeasonStats[],
  awards: Map<string, { allPro: number; proBowls: number }>,
): Map<string, PlayerOutcomeScore> {
  // Group seasons by pfrId (player) and by position (cohort reference)
  const byPlayer   = new Map<string, SeasonStats[]>()
  const byPosition = new Map<ScoringPosition, SeasonStats[]>()

  for (const season of allSeasons) {
    const playerList = byPlayer.get(season.pfrId) ?? []
    playerList.push(season)
    byPlayer.set(season.pfrId, playerList)

    const posList = byPosition.get(season.position) ?? []
    posList.push(season)
    byPosition.set(season.position, posList)
  }

  const results = new Map<string, PlayerOutcomeScore>()

  byPlayer.forEach((playerSeasons, pfrId) => {
    const position      = playerSeasons[0].position
    const cohort        = byPosition.get(position) ?? playerSeasons
    const award         = awards.get(pfrId) ?? { allPro: 0, proBowls: 0 }
    const sortedSeasons = [...playerSeasons].sort((a, b) => a.season - b.season)
    results.set(pfrId, scoreFromSeasonStats(sortedSeasons, cohort, award))
  })

  // ── Trajectory multiplier normalization ──────────────────────────────────────
  // Percentile-rank each step's raw trajectory within its position cohort,
  // then map to a dot-size multiplier (0.7 = p0, 1.0 = p50ish, 1.5 = p100).
  // Only steps with trajectoryRaw !== null/undefined get a multiplier.

  const trajByPos = new Map<ScoringPosition, number[]>()
  results.forEach(outcome => {
    for (const step of outcome.stepScores) {
      if (step.trajectoryRaw == null) continue
      const pos = outcome.position as ScoringPosition
      const list = trajByPos.get(pos) ?? []
      list.push(step.trajectoryRaw)
      trajByPos.set(pos, list)
    }
  })

  results.forEach(outcome => {
    const cohort = [...(trajByPos.get(outcome.position as ScoringPosition) ?? [])].sort((a, b) => a - b)
    if (cohort.length === 0) return
    for (const step of outcome.stepScores) {
      if (step.trajectoryRaw == null) continue
      const below = cohort.filter(v => v < step.trajectoryRaw!).length
      const percentile = below / cohort.length  // 0.0–1.0
      step.trajectoryMultiplier = 0.7 + percentile * 0.8  // 0.7 at p0, 1.5 at p100
    }
  })
  // ── End trajectory normalization ─────────────────────────────────────────────

  return results
}

// ── Scale normalization ────────────────────────────────────────────────────────

/**
 * Normalize score distribution per position so the best players in each
 * position group visually reach near the top of the chart (target: p98 → 95).
 *
 * Why: ARC averages season scores, so the mathematical ceiling is ~82-90 even
 * for elite players, leaving the top 10-15% of the chart visually empty.
 *
 * Algorithm:
 *   1. Bucket scores by position.
 *   2. For each position with ≥5 significant scorers (score > 10),
 *      find the 98th-percentile score as the reference ceiling.
 *   3. Compute scale factor = TARGET (95) / ref, capped so we never
 *      shrink scores (only expand), and only when ref < TARGET.
 *   4. Apply factor to outcome.score and all stepScores[].score.
 *   5. arcScore/apexScore/rookieScore remain unchanged (displayed on cards).
 *
 * Returns a new Map — does not mutate the input.
 */
export function normalizeScoreDistribution(
  scores: Map<string, PlayerOutcomeScore>,
): Map<string, PlayerOutcomeScore> {
  const TARGET     = 95
  const REF_PCT    = 0.98
  const MIN_COHORT = 5

  // Collect scores per position
  const byPosition = new Map<ScoringPosition, number[]>()
  scores.forEach((outcome) => {
    const group = byPosition.get(outcome.position) ?? []
    group.push(outcome.score)
    byPosition.set(outcome.position, group)
  })

  // Compute per-position scale factors
  const factors = new Map<ScoringPosition, number>()
  byPosition.forEach((posScores, position) => {
    const significant = posScores.filter(s => s > 10).sort((a, b) => a - b)
    if (significant.length < MIN_COHORT) return
    const idx = Math.min(Math.floor(significant.length * REF_PCT), significant.length - 1)
    const ref = significant[idx]
    if (ref > 0 && ref < TARGET) {
      factors.set(position, TARGET / ref)
    }
  })

  // Apply factors, rebuilding the map
  const out = new Map<string, PlayerOutcomeScore>()
  scores.forEach((outcome, pid) => {
    const factor = factors.get(outcome.position) ?? 1.0
    if (factor === 1.0) {
      out.set(pid, outcome)
      return
    }
    const scale = (s: number) => Math.min(100, Math.max(5, Math.round(s * factor)))
    const newScore      = scale(outcome.score)
    const newStepScores = outcome.stepScores.map((step: StepScore) => ({
      ...step,
      score: step.score !== null ? scale(step.score) : null,
    }))
    out.set(pid, {
      ...outcome,
      score:      newScore,
      tier:       getTier(newScore, outcome.position),
      stepScores: newStepScores,
    })
  })
  return out
}
