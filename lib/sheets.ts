/**
 * lib/sheets.ts
 *
 * Server-side Google Sheets data layer for DraftMap.
 * Replaces lib/airtable.ts. NEVER import from client components.
 * All access goes through the Route Handlers in app/api/.
 *
 * Data source: publicly-readable Google Sheet ("DraftMap Data", tab "players").
 * No API key required — reads via the public CSV export URL.
 * Set SHEETS_SPREADSHEET_ID in .env.local and Vercel environment variables.
 */

import { unstable_cache } from 'next/cache'
import outcomeScores from '@/data/outcome-scores.json'
import { SeasonStats, StepScore, DisplaySeasonRow, PlayerOutcomeScore, normalizePosition, scoreAllFromSeasons, normalizeScoreDistribution, percentileWithinPool } from './scoring'
import { CURRENT_DRAFT_YEAR } from './draftYears'
import { Verdict, getVerdictMaturity, MoneyBand } from './verdict'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw string fields from the Google Sheets CSV export, before type coercion. */
export interface SheetsRawRow {
  player_id?: string;
  draft_year?: string;
  name?: string;
  pos?: string;
  school?: string;
  rd?: string;
  rank?: string;
  consensus_source?: string;
  height?: string;
  weight?: string;
  hand?: string;
  arm?: string;
  forty?: string;
  split10?: string;
  vertical?: string;
  broad?: string;
  cone3?: string;
  shuttle?: string;
  bench?: string;
  notes?: string;
  role?: string;
  s1?: string;
  s2?: string;
  s3?: string;
  rd_drafted?: string;
  pick_drafted?: string;
  team_drafted?: string;
  fun_fact_override?: string;
}

/** Shape returned by the /api/draft and /api/players route handlers. */
export type SheetsApiResponse = Player[];

export interface Player {
  /** Stable cross-source identifier: firstname-lastname-pos-school3-draftyear */
  player_id: string;

  /** Draft class year this player belongs to */
  draft_year: number;

  // Core identity
  name: string;
  pos: string;
  school: string | null;

  // Consensus projections
  rd: number | null;              // consensus projected round (1–7)
  rank: number | null;            // consensus overall projected rank
  consensus_source: string | null; // e.g. "NFLMockDraftDatabase", "PFF"

  // Physical / NFL measurables
  height: string | null;  // NFL format: "6020" → 6'2" via fmtHeight()
  weight: number | null;
  hand: number | null;    // inches
  arm: number | null;     // inches

  // Combine times / athleticism
  forty: number | null;    // 40-yard dash, seconds
  split10: number | null;  // 10-yard split, seconds
  vertical: number | null; // vertical jump, inches
  broad: number | null;    // broad jump, inches
  cone3: number | null;    // 3-cone drill, seconds
  shuttle: number | null;  // 20-yard shuttle, seconds
  bench: number | null;    // bench press, reps

  // Scouting
  notes: string | null;
  role: string | null;
  s1: string | null;  // strength 1
  s2: string | null;  // strength 2
  s3: string | null;  // strength 3

  // Actual draft results (populated after draft)
  rd_drafted: number | null;
  pick_drafted: number | null;
  team_drafted: string | null;

  /** Manual override for the Chalk Talk fun fact panel. Null = use auto-generated fact. */
  fun_fact_override?: string | null;

  /** Derived: true if any of rd_drafted / pick_drafted / team_drafted is populated */
  drafted: boolean;

  /** Pre-computed outcome score (0–100) from lib/scoring.ts. Null for classes without data. */
  outcomeScore: number | null;

  /** Per-step cumulative ARC scores for production animation. Null for classes without data. */
  stepScores: StepScore[] | null;

  /** Per-season display rows for the stat grid. Null for classes without data. */
  seasonData: DisplaySeasonRow[] | null;

  /**
   * Second-contract verdict (Act 3 resolved field). Authoritative when present.
   * Null = pending class (not yet resolved) OR — for a RESOLVED class — a slug
   * join failure (a2 guarantees explicit NONE rows, so absence is never a NONE).
   * A resolved-class join failure is surfaced as an unmatched id (see resolveVerdicts);
   * the old jellyfish "data-gap" muted dot was removed with that field in Brief 6.
   */
  verdict: Verdict | null;

  /** Career-usage profile (Act 3 hover Block 3). Null for players with no seasons data. */
  usage: UsageProfile | null;
}

/**
 * Per-player career-usage summary, derived from player_seasons at fetch time.
 *
 * Note on row semantics: `career_usage` is a career-level value (constant across
 * a player's season rows), but `played_position` and `usage_qualified` are
 * per-SEASON. Player-level values are aggregated here:
 *   - careerUsage     = the constant career_usage value
 *   - playedPosition  = the modal non-empty per-season played_position
 *   - qualified       = true if ANY season row is usage_qualified (reuses the
 *                       precomputed MIN_GAMES_QUALIFY=6 flag without re-deriving it)
 *   - careerUsagePercentile = percentile of careerUsage within the player's
 *                       played_position QUALIFIED pool; null when unqualified,
 *                       no played_position, or no careerUsage.
 */
export interface UsageProfile {
  careerUsage: number | null;
  playedPosition: string | null;
  qualified: boolean;
  careerUsagePercentile: number | null;
  /** Total games played across all seasons — for the unqualified hover register. */
  games: number | null;

  // ── Phase Lambda additions (Act 3 reframe: window_usage Y-axis) ────────────
  /**
   * Rookie-contract-window (draft_year … +3) pooled scrimmage snap rate, BAKED in
   * player_seasons col AS (`window_usage`), raw 0–1, constant across a player's
   * season rows — exactly parallel to `careerUsage`. Null ⇒ unqualified ⇒
   * too-few-snaps strip member. Parsed, never re-derived (the qualification gate
   * lives in the Sheet bake, not here). Distinct from careerUsage (career-to-date):
   * the window is the audition that produced the second-contract verdict.
   */
  windowUsage: number | null;
  /**
   * Percentile (0–100) of `windowUsage` within this player's played_position pool,
   * across ALL classes — the Act-3 Y-coordinate (top = 100). This is the Brief-3
   * RENDER TRANSFORM of the raw baked value (same pattern as careerUsagePercentile),
   * computed at fetch time, never stored. Null when windowUsage is null (strip
   * member) or played_position is unknown.
   */
  windowUsagePercentile: number | null;
  /**
   * Too-few-snaps strip membership — derived ONCE here (`windowUsage === null`) and
   * passed explicitly per the choreography data contract §0, so components never
   * recompute qualification. True ⇒ the dot plots in the bottom strip, not the field.
   */
  stripMember: boolean;

  // ── Brief c additions (pending usage field) ──────────────────────────────
  /**
   * Per-season pooled snap_pct, draft_year-forward only (pre-draft collision rows
   * where season < draft_year are excluded — same guard a3 uses). Drives the
   * Block-3 season-usage sparkline (a dot at every data point). snapPct is the
   * games-weighted pooled rate for the season; null when the season has no rate.
   */
  seasons: Array<{ season: number; snapPct: number | null }>;
  /** Career special-teams snaps (Σ st_snap_count). */
  stCareerSnaps: number;
  /** Career scrimmage snaps (Σ snap_count). */
  scrimCareerSnaps: number;
  /**
   * ST-primary = (career ST snaps > career scrimmage snaps) AND (career ST ≥ 50).
   * The 50-snap floor SUBSTITUTES for MIN_GAMES qualification: an ST-primary
   * player is placed by his ST percentile even when usage_qualified is false.
   */
  stPrimary: boolean;
  /** Per-season ST snap share (st_snap_pct), draft_year-forward. ST-primary sparkline. */
  stSeasons: Array<{ season: number; stShare: number | null }>;
  /**
   * Global percentile (0–100) of this player's career ST snap share within the
   * pool of ALL ST-primary players (position-agnostic). Null when not ST-primary.
   * Derived at fetch time, never stored. The hover shows the RAW value LABELED as
   * an ST percentile. (The old 0–45 rescale into the ST_CEILING band was removed in
   * Brief 6 — ST-primaries now plot at true usage.)
   */
  stPercentile: number | null;
}

// ── Year constants ─────────────────────────────────────────────────────────────

// Re-exported from lib/draftYears.ts — client components should import from there
// directly to avoid pulling server-only dependencies into the client bundle.
export { VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR } from './draftYears';
export type { DraftYear } from './draftYears';

// ── CSV parser ────────────────────────────────────────────────────────────────

/**
 * Parse a single CSV line, respecting quoted fields (RFC 4180).
 * Handles commas inside quotes and escaped double-quotes ("").
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse full CSV text into an array of row objects keyed by header.
 * Skips blank lines. Returns [] if fewer than 2 lines.
 */
function parseCSV(text: string): SheetsRawRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: SheetsRawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row as SheetsRawRow);
  }

  return rows;
}

// ── Type coercions ────────────────────────────────────────────────────────────

function toFloat(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value.trim());
  return isNaN(n) ? null : n;
}

function toInt(value: string | undefined): number | null {
  const n = toFloat(value);
  return n === null ? null : Math.round(n);
}

function toStr(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

// ── Row → Player mapper ───────────────────────────────────────────────────────

function mapRow(row: SheetsRawRow): Player {
  const pos = (row.pos ?? "").trim().toUpperCase();
  const normalizedPos = pos === "DL" ? "DT" : pos;

  const rd_drafted   = toInt(row.rd_drafted);
  const pick_drafted = toInt(row.pick_drafted);
  const team_drafted = toStr(row.team_drafted);

  return {
    player_id:        toStr(row.player_id) ?? "",
    draft_year:       toInt(row.draft_year) ?? CURRENT_DRAFT_YEAR,
    name:             toStr(row.name) ?? "(Unknown)",
    pos:              normalizedPos,
    school:           toStr(row.school),
    rd:               toInt(row.rd),
    rank:             toInt(row.rank),
    consensus_source: toStr(row.consensus_source),
    height:           toStr(row.height),
    weight:           toFloat(row.weight),
    hand:             toFloat(row.hand),
    arm:              toFloat(row.arm),
    forty:            toFloat(row.forty),
    split10:          toFloat(row.split10),
    vertical:         toFloat(row.vertical),
    broad:            toFloat(row.broad),
    cone3:            toFloat(row.cone3),
    shuttle:          toFloat(row.shuttle),
    bench:            toFloat(row.bench),
    notes:            toStr(row.notes),
    role:             toStr(row.role),
    s1:               toStr(row.s1),
    s2:               toStr(row.s2),
    s3:               toStr(row.s3),
    rd_drafted,
    pick_drafted,
    team_drafted,
    fun_fact_override: toStr(row.fun_fact_override),
    drafted: !!(
      rd_drafted !== null ||
      pick_drafted !== null ||
      (team_drafted && team_drafted.length > 0)
    ),
    outcomeScore: null,
    stepScores:   null,
    seasonData:   null,
    verdict:      null,
    usage:        null,
  };
}

// ── Main fetch function ───────────────────────────────────────────────────────

/** Uncached compute: fetch the players CSV and parse to Player[] for one year. */
async function computePlayers(year: number): Promise<Player[]> {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error(
      "SHEETS_SPREADSHEET_ID is not set. Add it to .env.local (dev) or Vercel Environment Variables (prod)."
    );
  }

  // Public CSV export URL — sheet must be shared "Anyone with the link → Viewer"
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=players`;

  const res = await fetch(url, {
    // ISR: cache for 5 minutes. Route Handlers override for Live Draft (60s).
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(
      `Google Sheets fetch failed: ${res.status} ${res.statusText}\nURL: ${url}`
    );
  }

  const csv = await res.text();
  const rows = parseCSV(csv);

  // Filter to the requested year, map to Player objects, drop rows with no name
  return rows
    .filter((row) => {
      const rowYear = toInt(row.draft_year);
      return rowYear === year;
    })
    .map(mapRow)
    .filter((p) => p.name !== "(Unknown)" && p.name.length > 0);
}

// Cache the PARSED Player[] (not just the inner fetch), keyed by year. Without
// this, parseCSV + mapRow re-run on every call — /sitemap, /players, and
// getCachedPlayersAndSlugs each paid the full parse per cold render. The year
// argument is folded into the cache key automatically by unstable_cache.
const getCachedPlayers = unstable_cache(
  (year: number) => computePlayers(year),
  ['players-by-year-v1'],
  { revalidate: 300 },
);

/**
 * Fetch all players for a given draft year from Google Sheets.
 *
 * Reads the 'players' tab of the publicly-readable DraftMap Data spreadsheet
 * via the CSV export URL — no API key required.
 *
 * Intended for use in server-side Route Handlers only.
 */
export async function fetchPlayers(year: number = CURRENT_DRAFT_YEAR): Promise<Player[]> {
  return getCachedPlayers(year);
}

// ── Year-agnostic search index (brief f, item 3) ────────────────────────────────

/**
 * Lean, year-agnostic player record for the global search index. NAME-only matching;
 * pos/class/team are dropdown disambiguation; pick/rank drive the ranking tie-break;
 * draft_year + player_id drive the teleport. NO scoring/usage — the landing act is
 * computed on arrival from the freshly-loaded class (selectClassState), so none of it
 * is needed here.
 */
export interface SearchIndexEntry {
  player_id: string;
  name: string;
  pos: string;
  draft_year: number;
  school: string | null;
  pick_drafted: number | null;
  rank: number | null;
  team_drafted: string | null;
  drafted: boolean;
}

/**
 * Fetch the ENTIRE `players` tab ONCE (all 11 classes live in that single CSV — the
 * same source fetchPlayers() reads, just unfiltered) and project to lean entries. No
 * 11× fetchPlayers(year) loop; the CSV is downloaded a single time and mapped.
 */
async function computeSearchIndex(): Promise<SearchIndexEntry[]> {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("SHEETS_SPREADSHEET_ID is not set (search index).");
  }
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=players`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Google Sheets fetch failed (search index): ${res.status} ${res.statusText}`);
  }
  const rows = parseCSV(await res.text());

  return rows
    .map((row): SearchIndexEntry | null => {
      const player_id  = toStr(row.player_id);
      const name       = toStr(row.name);
      const draft_year = toInt(row.draft_year);
      if (!player_id || !name || name === "(Unknown)" || draft_year === null) return null;

      const pos          = (row.pos ?? "").trim().toUpperCase();
      const rd_drafted   = toInt(row.rd_drafted);
      const pick_drafted = toInt(row.pick_drafted);
      const team_drafted = toStr(row.team_drafted);

      return {
        player_id,
        name,
        pos: pos === "DL" ? "DT" : pos,
        draft_year,
        school: toStr(row.school),
        pick_drafted,
        rank: toInt(row.rank),
        team_drafted,
        drafted: !!(rd_drafted !== null || pick_drafted !== null || (team_drafted && team_drafted.length > 0)),
      };
    })
    .filter((e): e is SearchIndexEntry => e !== null);
}

/**
 * Cached entrypoint — runs computeSearchIndex at most once per revalidation window per
 * server instance (the same unstable_cache boundary the outcome-scores index uses),
 * not on every request. The route handler adds the HTTP ISR layer on top.
 */
export const fetchSearchIndex = unstable_cache(
  computeSearchIndex,
  ['search-index-v1'],
  { revalidate: 300 },
);

// ── Slug helpers ──────────────────────────────────────────────────────────────

/**
 * Convert a player name to a URL-safe slug for /players/[slug] routes.
 * "Shedeur Sanders" → "shedeur-sanders"
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Find a player by their URL slug. Used for /players/[slug] SSG routes.
 * If multiple players share a slug (rare), returns the highest-ranked one.
 */
export function findBySlug(players: Player[], slug: string): Player | undefined {
  return players
    .filter((p) => toSlug(p.name) === slug)
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))[0];
}

// ── Team records lookup ───────────────────────────────────────────────────────

async function fetchTeamRecords(): Promise<Map<string, string>> {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) return new Map()
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=team_records`
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return new Map()
    const text = await res.text()
    const rows = parseCSV(text) as unknown as Record<string, string>[]
    const map = new Map<string, string>()
    for (const row of rows) {
      const season = row['season']?.trim()
      const team   = row['team']?.trim()
      const wins   = parseInt(row['wins'] ?? '0', 10)
      const losses = parseInt(row['losses'] ?? '0', 10)
      if (season && team) {
        map.set(`${season}-${team}`, `${wins}-${losses}`)
      }
      // playoff_result: parsed but not displayed yet
    }
    return map
  } catch {
    return new Map()
  }
}

// ── Outcome scores ────────────────────────────────────────────────────────────

/**
 * Map a raw player_seasons row to SeasonStats for the scoring engine.
 *
 * Actual column names in the player_seasons Google Sheets tab:
 *   player_id, season, team, games_played, games_started, snap_count, snap_pct,
 *   pass_yards, pass_tds, interceptions (off), rush_yards, rush_tds,
 *   rec_yards, rec_tds, receptions, targets,
 *   sacks, tackles_solo, tackles_assist, tfl, qb_hits, forced_fumbles,
 *   ints_def (def), pass_deflections, pro_bowl, all_pro
 *
 * NOTE: There is no pos/position column. Position is extracted from player_id,
 * which follows the format: "firstname-lastname-{pos}-{school3}-{draftyear}".
 *
 * Returns null for rows missing player_id, season, or a scoreable position.
 */
function mapSeasonRow(row: Record<string, string>): {
  season: SeasonStats;
  allPro: number;
  proBowl: number;
} | null {
  const playerId = toStr(row.player_id);
  const season   = toInt(row.season);

  if (!playerId || !season) return null;

  // Extract position from player_id: last 3 segments are always pos-school3-year
  const idParts  = playerId.split('-');
  const posRaw   = idParts.length >= 3 ? idParts[idParts.length - 3] : '';
  const position = normalizePosition(posRaw);

  if (!position) return null;

  const snapPct   = toFloat(row.snap_pct);
  const isOffense = ['QB', 'RB', 'WR', 'TE', 'FB', 'OT', 'IOL'].includes(position);
  const isDefense = ['EDGE', 'DT', 'LB', 'CB', 'S'].includes(position);

  return {
    season: {
      pfrId:       playerId,
      team:        toStr(row.team),
      season,
      position,
      // games_played is total games; games_started is often empty — prefer games_played
      gamesPlayed: toInt(row.games_played) ?? toInt(row.games_started) ?? 0,
      // Offensive stats — actual column names use short forms (pass_ / rush_ / rec_)
      passYards:   toFloat(row.pass_yards)   ?? toFloat(row.passing_yards),
      passTDs:     toFloat(row.pass_tds)     ?? toFloat(row.passing_tds),
      rushYards:   toFloat(row.rush_yards)   ?? toFloat(row.rushing_yards),
      rushTDs:     toFloat(row.rush_tds)     ?? toFloat(row.rushing_tds),
      recYards:    toFloat(row.rec_yards)    ?? toFloat(row.receiving_yards),
      recTDs:      toFloat(row.rec_tds)      ?? toFloat(row.receiving_tds),
      // Defensive stats — tackles_solo (not solo_tackles), ints_def for defensive INTs
      soloTackles: toFloat(row.tackles_solo) ?? toFloat(row.solo_tackles),
      defInts:     isDefense
                     ? (toFloat(row.ints_def) ?? toFloat(row.interceptions))
                     : null,
      sacks:       toFloat(row.sacks),
      offSnapPct:  isOffense ? snapPct : null,
      defSnapPct:  isDefense ? snapPct : null,
      stSnapPct:   toFloat(row.st_snap_pct),
    },
    allPro:  toInt(row.all_pro)  ?? 0,
    proBowl: toInt(row.pro_bowl) ?? 0,
  };
}

export interface PlayerOutcomeData {
  arcScore:   number | null;
  stepScores: StepScore[];
  seasonData: DisplaySeasonRow[];
  /** Career-usage profile (Act 3 hover). Pool-derived at fetch time. */
  usage:      UsageProfile | null;
}

function buildSeasonData(
  rawRows: Array<Record<string, string>>,
  outcome: PlayerOutcomeScore,
  teamRecordsMap: Map<string, string>,
): DisplaySeasonRow[] {
  const bySeason = new Map<number, Array<Record<string, string>>>()
  for (const row of rawRows) {
    const yr = parseInt(row.season ?? '', 10)
    if (isNaN(yr)) continue
    if (!bySeason.has(yr)) bySeason.set(yr, [])
    bySeason.get(yr)!.push(row)
  }

  const display: DisplaySeasonRow[] = []

  const sortedSeasons = Array.from(bySeason.entries()).sort(([a], [b]) => a - b)

  for (const [season, seasonRows] of sortedSeasons) {
    const teamsRaw = seasonRows
      .map((r: Record<string, string>) => ({ team: (r.team ?? '').trim().toUpperCase(), gp: parseInt(r.games_played ?? '0', 10) }))
      .filter((t: { team: string; gp: number }) => t.team)
      .sort((a: { team: string; gp: number }, b: { team: string; gp: number }) => b.gp - a.gp)
    const teams = Array.from(new Set(teamsRaw.map((t: { team: string; gp: number }) => t.team)))
    const teamRecord = teamRecordsMap.get(`${season}-${teams[0]}`) ?? null

    const sum = (key: string): number | null => {
      const vals = seasonRows.map((r: Record<string, string>) => parseFloat(r[key] ?? '')).filter((v: number) => !isNaN(v))
      return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) : null
    }
    const toB = (key: string) => seasonRows.some((r: Record<string, string>) => r[key] === '1')

    let snapPct: number | null = null
    const snapEntries = seasonRows
      .map((r: Record<string, string>) => ({ pct: parseFloat(r.snap_pct ?? ''), gp: parseInt(r.games_played ?? '0', 10) }))
      .filter((e: { pct: number; gp: number }) => !isNaN(e.pct))
    if (snapEntries.length > 0) {
      const totalGp = snapEntries.reduce((a: number, e: { pct: number; gp: number }) => a + e.gp, 0)
      snapPct = totalGp > 0
        ? snapEntries.reduce((a: number, e: { pct: number; gp: number }) => a + e.pct * e.gp, 0) / totalGp
        : snapEntries[0].pct
    }

    const gamesPlayed  = seasonRows.reduce((a: number, r: Record<string, string>) => a + (parseInt(r.games_played ?? '0', 10)), 0)
    const gamesStarted = sum('games_started') !== null ? Math.round(sum('games_started')!) : null
    const snapCount    = sum('snap_count')

    let stSnapPct: number | null = null
    const stSnapEntries = seasonRows
      .map((r: Record<string, string>) => ({ pct: parseFloat(r.st_snap_pct ?? ''), count: parseInt(r.st_snap_count ?? '0', 10) }))
      .filter((e: { pct: number; count: number }) => !isNaN(e.pct))
    if (stSnapEntries.length > 0) {
      const totalCount = stSnapEntries.reduce((a: number, e: { pct: number; count: number }) => a + e.count, 0)
      stSnapPct = totalCount > 0
        ? stSnapEntries.reduce((a: number, e: { pct: number; count: number }) => a + e.pct * e.count, 0) / totalCount
        : stSnapEntries[0].pct
    }

    display.push({
      season,
      teams,
      gamesPlayed,
      gamesStarted,
      snapPct,
      snapCount,
      passYards:        sum('pass_yards'),
      passTDs:          sum('pass_tds'),
      rushYards:        sum('rush_yards'),
      rushTDs:          sum('rush_tds'),
      recYards:         sum('rec_yards'),
      recTDs:           sum('rec_tds'),
      receptions:       sum('receptions'),
      intsThrownQB:     sum('interceptions'),
      sacks:            sum('sacks'),
      tfl:              sum('tfl'),
      qbHits:           sum('qb_hits'),
      soloTackles:      sum('tackles_solo'),
      defInts:          sum('ints_def'),
      passDeflections:  sum('pass_deflections'),
      allPro:           toB('all_pro'),
      allPro2nd:        toB('all_pro_2nd'),
      mvp:              toB('mvp'),
      proBowl:          toB('pro_bowl'),
      allRookie:        toB('all_rookie'),
      teamRecord,
      arcScore:         outcome.scoresByYear[season] ?? null,
      stSnapPct,
      stSnapCount:      sum('st_snap_count'),
      puntReturns:      sum('punt_returns'),
      puntReturnYards:  sum('punt_return_yards'),
      kickoffReturns:   sum('kickoff_returns'),
      kickoffReturnYards: sum('kickoff_return_yards'),
      specialTeamsTds:  sum('special_teams_tds'),
      stProBowl:        toB('st_pro_bowl'),
      stAllPro:         toB('st_all_pro'),
    })
  }

  return display
}

/**
 * Fetch player_seasons from Google Sheets, compute outcome scores via the
 * scoring engine, and return a map of player_id → { arcScore, stepScores }.
 *
 * Reads the 'player_seasons' tab (9k+ rows, 2018–2024). Groups rows by player,
 * accumulates per-player award counts, then calls scoreAllFromSeasons() which
 * runs ARC percentile scoring within each position cohort.
 *
 * Returns an empty Map on any fetch or parse failure so the API degrades
 * gracefully (dots render grey rather than erroring).
 *
 * The expensive work (CSV parse + ARC percentile scoring) is wrapped in
 * unstable_cache so it runs at most once per revalidation window per server
 * instance — NOT on every page render. The cached payload is an array of
 * entries (Maps don't JSON-serialize); fetchOutcomeScores() rehydrates the Map.
 * Failures throw inside the cached fn so an empty result is never cached.
 */
export async function computeOutcomeScoreEntries(): Promise<Array<[string, PlayerOutcomeData]>> {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return [];

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=player_seasons`;

    // player_seasons is historical data — revalidate once per day, not every 5 min.
    // This is the largest payload (9k+ rows) and the primary cause of slow cold loads.
    const [res, teamRecordsMap] = await Promise.all([
      fetch(url, { next: { revalidate: 86400 } }),
      fetchTeamRecords(),
    ])
    if (!res.ok) throw new Error(`player_seasons fetch failed: ${res.status}`);

    const csv  = await res.text();
    const rows = parseCSV(csv) as unknown as Record<string, string>[];

    const allSeasons: SeasonStats[]                             = [];
    const awards = new Map<string, { allPro: number; proBowls: number }>();
    const rawByPlayer = new Map<string, Array<Record<string, string>>>();

    for (const row of rows) {
      const pid = (row.player_id ?? '').trim();
      if (!pid) continue;

      // Guard: skip any season that predates the player's draft year.
      // Draft year is the last segment of player_id (e.g. "firstname-lastname-pos-sch-2022").
      // Contaminated rows from name-collision matching errors are always pre-draft-year.
      const draftYear  = parseInt(pid.split('-').at(-1) ?? '', 10);
      const rowSeason  = parseInt(row.season ?? '', 10);
      if (!isNaN(draftYear) && !isNaN(rowSeason) && rowSeason < draftYear) continue;

      if (!rawByPlayer.has(pid)) rawByPlayer.set(pid, []);
      rawByPlayer.get(pid)!.push(row);

      const mapped = mapSeasonRow(row);
      if (!mapped) continue;

      allSeasons.push(mapped.season);

      const prev = awards.get(mapped.season.pfrId) ?? { allPro: 0, proBowls: 0 };
      awards.set(mapped.season.pfrId, {
        allPro:   prev.allPro   + mapped.allPro,
        proBowls: prev.proBowls + mapped.proBowl,
      });
    }

    // ── Build position-normalized snap percentile lookup ──────────────────────
    // For each position (P/K/LS/ST excluded), collect all season snap_pct values
    // and sort them. Then for any snap_pct, percentile = rank / (n-1) × 100.
    //
    // Multi-team seasons: games-weighted average snap_pct per player-season.

    // Step 1: Aggregate snap_pct per player per season (games-weighted for trades)
    const playerSeasonSnap = new Map<string, Map<number, number>>();
    rawByPlayer.forEach((rowList, pid) => {
      const bySeason = new Map<number, { totalSnap: number; totalGP: number }>();
      for (const row of rowList) {
        const season  = parseInt(row.season ?? '', 10);
        const snapPct = parseFloat(row.snap_pct ?? '');
        const gp      = parseInt(row.games_played ?? '0', 10);
        if (isNaN(season) || isNaN(snapPct)) continue;
        const prev = bySeason.get(season) ?? { totalSnap: 0, totalGP: 0 };
        bySeason.set(season, { totalSnap: prev.totalSnap + snapPct * gp, totalGP: prev.totalGP + gp });
      }
      const seasonMap = new Map<number, number>();
      bySeason.forEach(({ totalSnap, totalGP }, season) => {
        seasonMap.set(season, totalGP > 0 ? totalSnap / totalGP : 0);
      });
      playerSeasonSnap.set(pid, seasonMap);
    });

    // Step 2: Collect snap_pct values by position for percentile reference population
    const snapsByPosition = new Map<string, number[]>();
    playerSeasonSnap.forEach((seasonMap, pid) => {
      const idParts  = pid.split('-');
      const posRaw   = idParts.length >= 3 ? idParts[idParts.length - 3] : '';
      const position = normalizePosition(posRaw);
      if (!position || position === 'ST') return;  // exclude ST/P/K/LS
      seasonMap.forEach(snapPct => {
        const list = snapsByPosition.get(position) ?? [];
        list.push(snapPct);
        snapsByPosition.set(position, list);
      });
    });

    // Step 3: Sort each position's snap array (ascending) for percentile lookup
    const sortedSnaps = new Map<string, number[]>();
    snapsByPosition.forEach((values, pos) => {
      sortedSnaps.set(pos, [...values].sort((a, b) => a - b));
    });

    const computeSnapPct = (snapPct: number, position: string): number => {
      const sorted = sortedSnaps.get(position);
      if (!sorted || sorted.length <= 1) return 50;
      const below = sorted.filter(v => v < snapPct).length;
      return Math.round((below / (sorted.length - 1)) * 100);
    };
    // ── End snap percentile lookup ────────────────────────────────────────────

    // ── Career-usage profile + percentile pool (Act 3 verdict brief b) ────────
    // Mirrors the cross-population snap-percentile pass above, but over the
    // CAREER-level career_usage values. Per-player aggregation (see UsageProfile):
    //   careerUsage    = constant career_usage (career-level; same on every row)
    //   playedPosition = modal non-empty per-season played_position
    //   qualified      = ANY season usage_qualified === TRUE  (consumes the
    //                    precomputed MIN_GAMES_QUALIFY=6 flag — threshold NOT
    //                    re-derived here; that constant is brief c's)
    //   games          = total games_played
    // The reference pool is QUALIFIED-only (Baseball Savant / PFR / PFF
    // convention — an unqualified cameo never enters the distribution).
    //
    // Brief c additions (computed in this SAME cached pass): per-season snap_pct
    // array (sparkline), ST aggregates + stPrimary flag, per-season ST share, and
    // a SECOND global cross-population pass for the ST percentile. K/P/LS are
    // already excluded upstream (project_usage_metric) — they never reach here.
    interface UsageAgg {
      careerUsage: number | null;
      /** Phase Lambda: baked window_usage (col AS), constant across a player's rows. */
      windowUsage: number | null;
      playedPosition: string | null;
      qualified: boolean;
      games: number;
      stCareerSnaps: number;
      scrimCareerSnaps: number;
      stSeasons: Array<{ season: number; stShare: number | null }>;
    }
    const usageAgg = new Map<string, UsageAgg>();
    rawByPlayer.forEach((rowList, pid) => {
      let careerUsage: number | null = null;
      let windowUsage: number | null = null;
      let qualified = false;
      let games = 0;
      let stCareerSnaps = 0;
      let scrimCareerSnaps = 0;
      const posCounts = new Map<string, number>();
      // Per-season ST share, games/count-weighted across multi-team rows.
      const stBySeason = new Map<number, { wpct: number; count: number }>();
      for (const row of rowList) {
        const cu = toFloat(row.career_usage);
        if (cu !== null) careerUsage = cu;
        // Phase Lambda: window_usage (col AS) is constant per player across rows —
        // take the first non-null, exactly like career_usage above.
        const wu = toFloat(row.window_usage);
        if (wu !== null) windowUsage = wu;
        if ((row.usage_qualified ?? '').trim().toUpperCase() === 'TRUE') qualified = true;
        const pp = (row.played_position ?? '').trim();
        if (pp) posCounts.set(pp, (posCounts.get(pp) ?? 0) + 1);
        games += toInt(row.games_played) ?? 0;
        stCareerSnaps    += toFloat(row.st_snap_count) ?? 0;
        scrimCareerSnaps += toFloat(row.snap_count)    ?? 0;
        const season  = toInt(row.season);
        const stPct   = toFloat(row.st_snap_pct);
        const stCount = toFloat(row.st_snap_count);
        if (season !== null && stPct !== null) {
          const prev = stBySeason.get(season) ?? { wpct: 0, count: 0 };
          const w = stCount ?? 0;
          stBySeason.set(season, { wpct: prev.wpct + stPct * w, count: prev.count + w });
        }
      }
      let playedPosition: string | null = null;
      let bestCount = 0;
      posCounts.forEach((c, pos) => {
        if (c > bestCount) { bestCount = c; playedPosition = pos; }
      });
      // Fallback: when played_position is fully blank across every season row, the
      // modal resolves null and the qualified dot would floor to TOO FEW SNAPS via
      // chartMath's Step-0 fail-safe. Recover the position from the player_id using
      // the SAME derivation computeSnapPct trusts (pos = 3rd token from the end,
      // …-{pos}-{school}-{year}). Precedence: modal non-blank → id-parsed → null.
      // Last resort only — a player with even one labeled season keeps his modal.
      if (playedPosition === null) {
        const idParts = pid.split('-');
        const idPosRaw = idParts.length >= 3 ? idParts[idParts.length - 3] : '';
        const idPos = normalizePosition(idPosRaw);
        if (idPos && idPos !== 'ST') playedPosition = idPos;
      }
      const stSeasons = Array.from(stBySeason.entries())
        .sort(([a], [b]) => a - b)
        .map(([season, { wpct, count }]) => ({
          season,
          stShare: count > 0 ? wpct / count : null,
        }));
      usageAgg.set(pid, {
        careerUsage, windowUsage, playedPosition, qualified, games,
        stCareerSnaps, scrimCareerSnaps, stSeasons,
      });
    });

    // Reference pool: qualified players' careerUsage, keyed by played_position.
    // The pool is keyed by the RAW played_position string while the id-fallback above
    // emits a normalizePosition() token. Both match on today's data because every raw
    // played_position is already canonical (one of the 11 chart tokens). Warn once if
    // a non-canonical raw value appears — that's the only case where raw and fallback
    // keys could diverge and silently mis-pool a recovered player.
    let nonCanonicalPosWarned = false;
    const usagePoolByPos = new Map<string, number[]>();
    usageAgg.forEach(({ careerUsage, playedPosition, qualified }) => {
      if (!qualified || playedPosition === null || careerUsage === null) return;
      if (!nonCanonicalPosWarned && normalizePosition(playedPosition) !== playedPosition) {
        console.warn(
          `[usage-pool] non-canonical played_position "${playedPosition}" does not round-trip through normalizePosition — raw pool keys and the id-fallback's normalized keys may diverge (investigate dirty data)`,
        );
        nonCanonicalPosWarned = true;
      }
      const list = usagePoolByPos.get(playedPosition) ?? [];
      list.push(careerUsage);
      usagePoolByPos.set(playedPosition, list);
    });

    // Phase Lambda: parallel reference pool over window_usage (Act-3 Y-axis). Pool
    // membership = a non-null baked window_usage + a known played_position; NOT gated
    // on the careerUsage `qualified` flag — window_usage is already null exactly when
    // the window-total games gate failed (that IS strip membership). Keyed by raw
    // played_position, same as the careerUsage pool above (identical canonical keys).
    const windowUsagePoolByPos = new Map<string, number[]>();
    usageAgg.forEach(({ windowUsage, playedPosition }) => {
      if (windowUsage === null || playedPosition === null) return;
      const list = windowUsagePoolByPos.get(playedPosition) ?? [];
      list.push(windowUsage);
      windowUsagePoolByPos.set(playedPosition, list);
    });

    // ST-primary flag + global ST-share pool (Part 1c). career ST snap SHARE =
    // ST / (ST + scrimmage). The pool is position-agnostic — every ST-primary
    // player, league-wide — because a gunner competes against gunners, not his
    // listed position. Percentile derived below, never stored.
    const stPrimaryOf = (a: UsageAgg): boolean =>
      a.stCareerSnaps > a.scrimCareerSnaps && a.stCareerSnaps >= 50;
    const stShareOf = (a: UsageAgg): number => {
      const total = a.stCareerSnaps + a.scrimCareerSnaps;
      return total > 0 ? a.stCareerSnaps / total : 0;
    };
    const stSharePool: number[] = [];
    usageAgg.forEach(agg => { if (stPrimaryOf(agg)) stSharePool.push(stShareOf(agg)); });

    const usageByPlayer = new Map<string, UsageProfile>();
    usageAgg.forEach((agg, pid) => {
      const { careerUsage, windowUsage, playedPosition, qualified, games, stCareerSnaps, scrimCareerSnaps, stSeasons } = agg;
      let careerUsagePercentile: number | null = null;
      if (qualified && playedPosition !== null && careerUsage !== null) {
        careerUsagePercentile = percentileWithinPool(careerUsage, usagePoolByPos.get(playedPosition) ?? []);
      }
      // Phase Lambda Act-3 Y-coordinate: percentile of window_usage within position.
      // Null (strip member) when window_usage is null or position unknown.
      let windowUsagePercentile: number | null = null;
      if (windowUsage !== null && playedPosition !== null) {
        windowUsagePercentile = percentileWithinPool(windowUsage, windowUsagePoolByPos.get(playedPosition) ?? []);
      }
      const stripMember = windowUsage === null;
      const stPrimary = stPrimaryOf(agg);
      const stPercentile = stPrimary ? percentileWithinPool(stShareOf(agg), stSharePool) : null;
      const seasons = Array.from((playerSeasonSnap.get(pid) ?? new Map<number, number>()).entries())
        .sort(([a], [b]) => a - b)
        .map(([season, snapPct]) => ({ season, snapPct }));
      usageByPlayer.set(pid, {
        careerUsage,
        playedPosition,
        qualified,
        careerUsagePercentile,
        windowUsage,
        windowUsagePercentile,
        stripMember,
        games: games > 0 ? games : null,
        seasons,
        stCareerSnaps,
        scrimCareerSnaps,
        stPrimary,
        stSeasons,
        stPercentile,
      });
    });
    // ── End career-usage pool ─────────────────────────────────────────────────

    const scored = normalizeScoreDistribution(scoreAllFromSeasons(allSeasons, awards));

    const result = new Map<string, PlayerOutcomeData>();
    scored.forEach((outcome, playerId) => {
      const rawRows    = rawByPlayer.get(playerId) ?? [];
      const playerSnaps = playerSeasonSnap.get(playerId) ?? new Map<number, number>();
      const posKey     = outcome.position as string;

      // Replace ARC step scores with position-normalized snap percentile per season
      const snapStepScores: StepScore[] = outcome.stepScores.map(step => {
        const season  = parseInt(step.stepId, 10);
        const snap    = playerSnaps.get(season);
        const pct     = snap !== undefined ? computeSnapPct(snap, posKey) : null;
        return { ...step, score: pct };
      });

      // Career snap percentile = mean of per-season percentiles (drives career Y-axis).
      // Computed before the RC/Veteran summary steps are appended so those averages
      // don't get folded back into the career number.
      const validPcts = snapStepScores.map(s => s.score).filter((s): s is number => s !== null);
      const careerSnapPct = validPcts.length > 0
        ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length)
        : null;

      // Rookie Contract + Veteran summary steps (averages of per-season percentiles)
      const playerDraftYear = parseInt(playerId.split('-').at(-1) ?? '', 10);
      if (!isNaN(playerDraftYear)) {
        // Rookie Contract step: average snap percentile of Years 1–4
        const rcSteps = snapStepScores.filter(s => {
          const season = parseInt(s.stepId, 10);
          return !isNaN(season) && season >= playerDraftYear && season <= playerDraftYear + 3;
        });
        if (rcSteps.length >= 1) {
          const rcScores = rcSteps.map(s => s.score).filter((s): s is number => s !== null);
          const rcAvg = rcScores.length > 0
            ? Math.round(rcScores.reduce((a, b) => a + b, 0) / rcScores.length)
            : null;
          snapStepScores.push({ stepId: 'rookie-contract', score: rcAvg, team: null });
        }

        // Veteran step: average snap percentile of Years 5+
        const vetSteps = snapStepScores.filter(s => {
          const season = parseInt(s.stepId, 10);
          return !isNaN(season) && season >= playerDraftYear + 4;
        });
        if (vetSteps.length >= 1) {
          const vetScores = vetSteps.map(s => s.score).filter((s): s is number => s !== null);
          const vetAvg = vetScores.length > 0
            ? Math.round(vetScores.reduce((a, b) => a + b, 0) / vetScores.length)
            : null;
          snapStepScores.push({ stepId: 'veteran', score: vetAvg, team: null });
        }
      }

      result.set(playerId, {
        arcScore:   careerSnapPct,
        stepScores: snapStepScores,
        seasonData: buildSeasonData(rawRows, outcome, teamRecordsMap),
        usage:      usageByPlayer.get(playerId) ?? null,
      });
    });
    return Array.from(result.entries());
}

const getCachedOutcomeScoreEntries = unstable_cache(
  computeOutcomeScoreEntries,
  ['outcome-scores-v1'],
  { revalidate: 86400 }
);

export async function fetchOutcomeScores(): Promise<Map<string, PlayerOutcomeData>> {
  // Serve from the committed static snapshot (data/outcome-scores.json), generated
  // offline by scripts/build-outcome-scores.ts. This removes ALL runtime scoring
  // and the ~10k-row player_seasons fetch from every cold render — the fix for the
  // Fluid Active CPU overage (see the Vercel optimization brief, 2026-07-09).
  //
  // computeOutcomeScoreEntries + getCachedOutcomeScoreEntries remain as the
  // generator engine and a graceful fallback: if the snapshot is somehow missing
  // or malformed, fall back to computing so a render never hard-breaks.
  try {
    const entries = outcomeScores as Array<[string, PlayerOutcomeData]>;
    if (Array.isArray(entries) && entries.length > 0) {
      return new Map(entries);
    }
    throw new Error('outcome-scores.json empty or malformed');
  } catch {
    try {
      return new Map(await getCachedOutcomeScoreEntries());
    } catch {
      return new Map();
    }
  }
}

// ── Second-contract verdicts ────────────────────────────────────────────────

/**
 * Fetch the `second_contracts` tab and key it by player_id slug.
 *
 * Mirrors fetchOutcomeScores: env guard, ISR, graceful empty-Map on failure.
 * One row per resolved-or-already-signed player. Explicit NONE rows exist for
 * resolved classes (2018–2021); 2022 is partial. `verdict_share` is precomputed
 * (a2) and may be null (NONE rows; positions with no market line).
 */
/**
 * Validate + narrow the baked `money_band` cell (second_contracts col L) to the
 * MoneyBand union. Blank (39 K/P/LS rows) → null. An unexpected non-empty value is
 * a data bug: warn once and null it so a stray token never mis-colors a dot or
 * inflates a wall node. NOT derived here — parsed only (boundaries are a sniff-test
 * reference; the Sheet is the runtime source of truth).
 */
const MONEY_BAND_VALUES = ['NEVER', 'ZERO', 'MIN', 'MIDDLE', 'TOP10', 'TOP5'] as const;
let moneyBandWarned = false;
function parseMoneyBand(raw: string | undefined): MoneyBand | null {
  const v = (raw ?? '').trim().toUpperCase();
  if (!v) return null;
  if ((MONEY_BAND_VALUES as readonly string[]).includes(v)) return v as MoneyBand;
  if (!moneyBandWarned) {
    console.warn(`[second_contracts] unexpected money_band value "${raw}" (expected one of ${MONEY_BAND_VALUES.join('/')} or blank) — treating as null`);
    moneyBandWarned = true;
  }
  return null;
}

export async function fetchSecondContracts(): Promise<Map<string, Verdict>> {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return new Map();

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=second_contracts`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return new Map();
    const csv  = await res.text();
    const rows = parseCSV(csv) as unknown as Record<string, string>[];

    const map = new Map<string, Verdict>();
    for (const row of rows) {
      const playerId = toStr(row.player_id);
      const tier     = toStr(row.contract_tier);
      if (!playerId || !tier) continue;
      map.set(playerId, {
        playerId,
        tier: tier as Verdict['tier'],
        contractYears: toInt(row.contract_years),
        gtdDollars:    toFloat(row.gtd_dollars),
        gtdPctOfCap:   toFloat(row.gtd_pct_of_cap),
        apy:           toFloat(row.apy),
        signingTeam:   toStr(row.signing_team),
        signingYear:   toInt(row.signing_year),
        tagOption:     (row.tag_option ?? '').trim(),
        verdictShare:  toFloat(row.verdict_share),
        moneyBand:     parseMoneyBand(row.money_band),
        notes:         toStr(row.notes),
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Result of joining verdicts onto a class's players. */
export interface VerdictJoinResult {
  players: Player[];
  /**
   * player_ids of RESOLVED-class players with no second_contracts row — a slug
   * join failure (a2 guarantees explicit NONE rows, so absence is never a NONE).
   * Empty for healthy data. Exposed for the scoreboard "⚠ N unmatched" line (brief d).
   */
  unmatched: string[];
}

/**
 * Attach verdicts to players by slug and surface join failures.
 *
 *   row present                          → verdict authoritative (incl. explicit NONE)
 *   row absent  & class pending          → verdict stays null (belongs to pending view)
 *   row absent  & class resolved         → JOIN FAILURE: verdict null + unmatched id
 *
 * A resolved-class join failure is caught here: this returns the unmatched ids
 * and console.warns them. Absence must NEVER silently mean NONE. (The jellyfish
 * "data-gap" muted dot that once rendered these was removed in Brief 6.)
 */
export function resolveVerdicts(players: Player[], verdictMap: Map<string, Verdict>): VerdictJoinResult {
  const unmatched: string[] = [];
  const joined = players.map(p => {
    const v = verdictMap.get(p.player_id) ?? null;
    // Only DRAFTED resolved-class players are unconditionally in a2's universe
    // ("drafted-unconditional + UDFAs with ≥1 snap"), so a missing row there is a
    // real slug failure. An undrafted player with no row simply never snapped —
    // he is absent from the field, not a join failure.
    if (!v && p.drafted && getVerdictMaturity(p.draft_year) === 'resolved') {
      unmatched.push(p.player_id);
    }
    return { ...p, verdict: v };
  });

  if (unmatched.length > 0) {
    console.warn(
      `[verdict] ${unmatched.length} resolved-class player(s) had no second_contracts row (slug mismatch — NOT a NONE): ${unmatched.join(', ')}`
    );
  }

  return { players: joined, unmatched };
}
