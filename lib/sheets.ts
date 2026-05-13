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

// ── Types ─────────────────────────────────────────────────────────────────────

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
}

// ── Year constants ─────────────────────────────────────────────────────────────

/** Years with data in the Google Sheet, most-recent first. Expand as data is added. */
export const VALID_DRAFT_YEARS = [2026, 2025, 2024] as const;
export type DraftYear = (typeof VALID_DRAFT_YEARS)[number];

/** Most recent year — used as the default when no year is specified. */
export const CURRENT_DRAFT_YEAR = VALID_DRAFT_YEARS[0];

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
function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
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

function mapRow(row: Record<string, string>): Player {
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
