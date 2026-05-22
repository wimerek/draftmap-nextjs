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

import { SeasonStats, normalizePosition, scoreAllFromSeasons } from './scoring'
import { CURRENT_DRAFT_YEAR } from './draftYears'

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

  /** Derived: true if any of rd_drafted / pick_drafted / team_drafted is populated */
  drafted: boolean;

  /** Pre-computed outcome score (0–100) from lib/scoring.ts. Null for classes without data. */
  outcomeScore: number | null;
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
    drafted: !!(
      rd_drafted !== null ||
      pick_drafted !== null ||
      (team_drafted && team_drafted.length > 0)
    ),
    outcomeScore: null,
  };
}

// ── Main fetch function ───────────────────────────────────────────────────────

/**
 * Fetch all players for a given draft year from Google Sheets.
 *
 * Reads the 'players' tab of the publicly-readable DraftMap Data spreadsheet
 * via the CSV export URL — no API key required.
 *
 * Intended for use in server-side Route Handlers only.
 */
export async function fetchPlayers(year: number = CURRENT_DRAFT_YEAR): Promise<Player[]> {
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
      stSnapPct:   null,
    },
    allPro:  toInt(row.all_pro)  ?? 0,
    proBowl: toInt(row.pro_bowl) ?? 0,
  };
}

/**
 * Fetch player_seasons from Google Sheets, compute outcome scores via the
 * scoring engine, and return a map of player_id → score (0–100).
 *
 * Reads the 'player_seasons' tab (9k+ rows, 2018–2024). Groups rows by player,
 * accumulates per-player award counts, then calls scoreAllFromSeasons() which
 * runs JAWS-based percentile scoring within each position cohort.
 *
 * Returns an empty Map on any fetch or parse failure so the API degrades
 * gracefully (dots render grey rather than erroring).
 */
export async function fetchOutcomeScores(): Promise<Map<string, number>> {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return new Map();

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=player_seasons`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return new Map();

    const csv  = await res.text();
    const rows = parseCSV(csv) as unknown as Record<string, string>[];

    const allSeasons: SeasonStats[]                             = [];
    const awards = new Map<string, { allPro: number; proBowls: number }>();

    for (const row of rows) {
      const mapped = mapSeasonRow(row);
      if (!mapped) continue;

      allSeasons.push(mapped.season);

      const prev = awards.get(mapped.season.pfrId) ?? { allPro: 0, proBowls: 0 };
      awards.set(mapped.season.pfrId, {
        allPro:   prev.allPro   + mapped.allPro,
        proBowls: prev.proBowls + mapped.proBowl,
      });
    }

    const scored = scoreAllFromSeasons(allSeasons, awards);

    const result = new Map<string, number>();
    scored.forEach((outcome, playerId) => {
      result.set(playerId, outcome.score);
    });
    return result;
  } catch {
    return new Map();
  }
}
