/**
 * lib/classMaturity.ts
 *
 * Data-driven state switch for the crawlable-twin position pages.
 *
 * A draft class moves through three states as NFL seasons accumulate. The capsule
 * set, the table column model, and the FAQPage JSON-LD all key off this — so the
 * August "early-returns" activation is data/config, not a redesign.
 *
 * While SUPPORTED_TWIN_YEARS is [2026], only 'draft-day' is reachable, but the
 * switch must exist so later years light up by adding to the allowlist.
 */

import { CURRENT_DRAFT_YEAR } from './draftYears';
import { getVerdictMaturity } from './verdict';

export type ClassMaturity = 'draft-day' | 'early-returns' | 'graduated';

/**
 * Maturity of a draft class relative to the current draft year.
 *   draft-day     — no completed NFL seasons yet (class just drafted)
 *   early-returns — 1–3 NFL seasons of data
 *   graduated     — 4+ NFL seasons (rookie contract complete)
 */
export function getClassMaturity(
  draftYear: number,
  currentYear: number = CURRENT_DRAFT_YEAR,
): ClassMaturity {
  const seasonsElapsed = currentYear - draftYear;
  if (seasonsElapsed <= 0) return 'draft-day';
  if (seasonsElapsed <= 3) return 'early-returns';
  return 'graduated';
}

// ── Act 3 field-state selector (brief c, Part 1d) ───────────────────────────

/** Which of the three Act-3 fields a class renders at beat 3. */
export type FieldState = 'floor' | 'resolved' | 'pending';

/**
 * Pick the beat-3 field for a class — DATA-DRIVEN, deliberately NOT calendar math.
 *
 * ⚠ This is a separate decision from getClassMaturity() above, which is CALENDAR-
 * derived and powers the crawlable-twin SEO pages. It must NOT be reused here: a
 * calendar check would lift a class off the floor with no season rows to give its
 * dots a Y, and would break the annual "takes the field" content beat.
 *
 *   floor    — zero completed seasons in player_seasons (the class is drafted but
 *              hasn't played a down). Counts ONLY rows with season >= draft_year —
 *              usage.seasons is already filtered that way (the same pre-draft
 *              collision guard the sparkline uses), so a literal row that predates
 *              the draft (e.g. the 2026 class's 83 pre-draft collision rows) never
 *              lifts the class off the floor.
 *   resolved — second-contract verdicts loaded (brief b's field).
 *   pending  — has played, verdicts not yet resolved (this brief's field).
 *
 * The player shape is intentionally minimal (just usage.seasons) so this stays
 * importable from client components without pulling in the server data layer.
 */
export function selectClassState(
  players: Array<{ usage: { seasons: Array<{ season: number }> } | null }>,
  draftYear: number,
): FieldState {
  const hasCompletedSeason = players.some(p => (p.usage?.seasons?.length ?? 0) > 0);
  if (!hasCompletedSeason) return 'floor';
  if (getVerdictMaturity(draftYear) === 'resolved') return 'resolved';
  return 'pending';
}
