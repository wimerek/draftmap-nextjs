/**
 * lib/airtable.ts
 *
 * Server-side Airtable client for DraftMap.
 * NEVER import this file from client components — it uses AIRTABLE_API_TOKEN.
 * All access goes through the Route Handlers in app/api/.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Player {
  /** Airtable record ID */
  id: string;

  // Core identity
  name: string;
  pos: string;
  school: string | null;

  // Derek's projections
  rd: number | null;     // projected round (1–7)
  rank: number | null;   // overall projected rank

  // Physical / NFL measurables
  height: string | null; // NFL format: "6020" → 6'2"
  weight: number | null;
  hand: number | null;   // inches
  arm: number | null;    // inches

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

  // Production stats
  yards: number | null;
  tds: number | null;
  tackles: number | null;
  ints: number | null;
  pbus: number | null;  // pass breakups

  // Actual draft results (populated after draft)
  rd_drafted: number | null;
  pick_drafted: number | null;
  team_drafted: string | null;

  /** Derived: true if any of rd_drafted / pick_drafted / team_drafted is populated */
  drafted: boolean;
}

// ── Airtable API response shapes ──────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

// ── Multi-year table routing ───────────────────────────────────────────────────

/**
 * Airtable table IDs per draft year.
 * Each year is a separate table in the same base, with identical field structure.
 * To add a new year: create the Airtable table, add its ID here.
 */
const TABLE_IDS: Record<number, string> = {
  2024: "tblZ1xWC3kpT4tWFZ",
  2025: "tblfzgwZhDq8uvN1a",
  2026: "tblwqv6lrfmREuVt4",
};

/** Years with available data, most-recent first. */
export const VALID_DRAFT_YEARS = [2026, 2025, 2024] as const;
export type DraftYear = (typeof VALID_DRAFT_YEARS)[number];

/** Most recent year — used as the default when no year is specified. */
export const CURRENT_DRAFT_YEAR = VALID_DRAFT_YEARS[0];

// ── Field name mapping: Airtable → internal ───────────────────────────────────

const FIELD_MAP: Record<string, keyof Player> = {
  "Player Name":          "name",
  "Position":             "pos",
  "School":               "school",
  "Draft Round":          "rd",
  "Rank":                 "rank",
  "Height (NFL format)":  "height",
  "Weight (lbs)":         "weight",
  "Hand Size (inches)":   "hand",
  "Arm Length (inches)":  "arm",
  "40-yard dash (s)":     "forty",
  "10-yard split (s)":    "split10",
  "Vertical Jump (inches)": "vertical",
  "Broad Jump (inches)":  "broad",
  "3-Cone Drill (s)":     "cone3",
  "Shuttle (s)":          "shuttle",
  "Bench Press (reps)":   "bench",
  "Scouting Notes":       "notes",
  "Role":                 "role",
  "s1":                   "s1",
  "s2":                   "s2",
  "s3":                   "s3",
  "Yards":                "yards",
  "Touchdowns":           "tds",
  "Tackles":              "tackles",
  "Interceptions":        "ints",
  "Pass Breakups (PBUs)": "pbus",
  "Round Drafted":        "rd_drafted",
  "Pick Drafted":         "pick_drafted",
  "Team Drafted":         "team_drafted",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Airtable sometimes returns linked-record fields as single-element arrays.
 * Unwrap to the scalar value; return null if empty.
 */
function scalar(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  return value ?? null;
}

function toFloat(value: unknown): number | null {
  const v = scalar(value);
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toInt(value: unknown): number | null {
  const n = toFloat(value);
  return n === null ? null : Math.round(n);
}

function toStr(value: unknown): string | null {
  const v = scalar(value);
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

// ── Numeric fields (will be coerced to float) ─────────────────────────────────

const FLOAT_FIELDS = new Set<keyof Player>([
  "rd", "rank", "weight", "hand", "arm",
  "forty", "split10", "vertical", "broad", "cone3", "shuttle", "bench",
  "yards", "tds", "tackles", "ints", "pbus",
  "rd_drafted", "pick_drafted",
]);

// ── Record mapper ─────────────────────────────────────────────────────────────

function mapRecord(record: AirtableRecord): Player {
  const fields = record.fields;
  const player: Partial<Player> = { id: record.id };

  for (const [airtableField, internalKey] of Object.entries(FIELD_MAP)) {
    const rawValue = fields[airtableField];

    if (FLOAT_FIELDS.has(internalKey)) {
      // rd and rank can be integer; rest are floats — both handled via toFloat
      (player as Record<string, unknown>)[internalKey] = toFloat(rawValue);
    } else {
      (player as Record<string, unknown>)[internalKey] = toStr(rawValue);
    }
  }

  // Ensure required string fields have fallbacks
  if (!player.name) player.name = "(Unknown)";
  if (!player.pos) player.pos = "";

  // Normalize position: uppercase, DL → DT for consistency
  player.pos = (player.pos || "").toUpperCase();
  if (player.pos === "DL") player.pos = "DT";

  // Derive drafted boolean
  player.drafted = !!(
    player.rd_drafted !== null ||
    player.pick_drafted !== null ||
    (player.team_drafted && player.team_drafted.length > 0)
  );

  // Convert rd and rank to integers if present
  if (player.rd !== null && player.rd !== undefined) {
    player.rd = toInt(player.rd) ?? null;
  }
  if (player.rank !== null && player.rank !== undefined) {
    player.rank = toInt(player.rank) ?? null;
  }
  if (player.rd_drafted !== null && player.rd_drafted !== undefined) {
    player.rd_drafted = toInt(player.rd_drafted) ?? null;
  }
  if (player.pick_drafted !== null && player.pick_drafted !== undefined) {
    player.pick_drafted = toInt(player.pick_drafted) ?? null;
  }

  return player as Player;
}

// ── Main fetch function ───────────────────────────────────────────────────────

/**
 * Fetch all players from Airtable with full pagination.
 *
 * Intended for use in server-side Route Handlers only.
 * Pass year to select the correct table (2024, 2025, 2026).
 */
export async function fetchPlayers(year: number = CURRENT_DRAFT_YEAR): Promise<Player[]> {
  const token = process.env.AIRTABLE_API_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID ?? "apphHlEBLATe8hrII";

  if (!token) {
    throw new Error(
      "AIRTABLE_API_TOKEN is not set. Add it to .env.local (dev) or Vercel Environment Variables (prod)."
    );
  }

  // Resolve table ID: prefer the year-keyed map, fall back to env var (for legacy/override).
  const tableId =
    TABLE_IDS[year] ??
    process.env.AIRTABLE_TABLE_ID ??
    TABLE_IDS[CURRENT_DRAFT_YEAR];

  if (!TABLE_IDS[year]) {
    console.warn(`[airtable] No table ID for year ${year} — falling back to ${CURRENT_DRAFT_YEAR}`);
  }

  const baseUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  // Paginate through all records (Airtable max 100 per page)
  do {
    const url = new URL(baseUrl);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), {
      headers,
      // ISR: cache for 5 minutes. Override at the Route Handler level for Live Draft (60s).
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Airtable fetch failed: ${res.status} ${res.statusText}\n${body}`
      );
    }

    const data: AirtableResponse = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records.map(mapRecord);
}

// ── Slug helpers ──────────────────────────────────────────────────────────────

/**
 * Convert a player name to a URL-safe slug.
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
 * Find a player by their slug. Used for /players/[slug] SSG routes.
 * If multiple players have the same slug, returns the first by rank.
 */
export function findBySlug(players: Player[], slug: string): Player | undefined {
  return players
    .filter((p) => toSlug(p.name) === slug)
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))[0];
}
