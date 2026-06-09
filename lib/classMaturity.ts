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
