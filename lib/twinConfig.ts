/**
 * lib/twinConfig.ts
 *
 * Configuration for the crawlable-twin position pages (/draft/[year]/[position]).
 *
 * TWO allowlist gates: SUPPORTED_TWIN_YEARS controls which years have twin pages at
 * all (historical 2018–2025 added 2026-07-12 for indexing age); TWIN_MATURED_YEARS
 * controls which of those render outcome states — empty until the August Report Card
 * sprint authors that content. August activation = add years there. No new code.
 */

import { POSITION_ORDER, type Position } from './chartConstants';

/** Years for which twin position pages are generated and routable. Non-listed → 404.
 *  2018–2025 added 2026-07-12 (consensus-rank coverage audit cleared them 2026-06-26). */
export const SUPPORTED_TWIN_YEARS: readonly number[] = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

export function isSupportedTwinYear(year: number): boolean {
  return SUPPORTED_TWIN_YEARS.includes(year);
}

/**
 * Years whose twin pages render OUTCOME states (early-returns / graduated): career-
 * result capsules plus the usage / money_band table columns. EMPTY until the August
 * Report Card sprint authors that content. While a SUPPORTED year is NOT in this list,
 * its twin page is clamped to the 'draft-day' state (consensus vs. pick only) even
 * though the calendar (getClassMaturity) would call it mature — this is what lets
 * 2018–2025 ship now for indexing age without exposing unbuilt outcome columns/JSON-LD.
 * August activation = add years here (config only; no new code). See
 * project_seo_crawlable_twin August activation checklist.
 */
export const TWIN_MATURED_YEARS: readonly number[] = [];

export function isMaturedTwinYear(year: number): boolean {
  return TWIN_MATURED_YEARS.includes(year);
}

/** Apex origin — absolute URLs for canonical links, JSON-LD, breadcrumbs. */
export const APEX = 'https://draftmap.app';

/** Position → lowercase URL slug (edge, dt, lb, cb, s, rb, wr, te, ot, iol, qb). */
export function positionToSlug(pos: string): string {
  return pos.toLowerCase();
}

/** All position slugs in canonical left-to-right chart order. */
export const POSITION_SLUGS: string[] = POSITION_ORDER.map(positionToSlug);

/** Lowercase slug → canonical Position token, or null if not a valid position. */
export function slugToPosition(slug: string): Position | null {
  const lower = slug.toLowerCase();
  return POSITION_ORDER.find((p) => p.toLowerCase() === lower) ?? null;
}
