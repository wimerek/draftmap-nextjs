/**
 * lib/twinConfig.ts
 *
 * Configuration for the crawlable-twin position pages (/draft/[year]/[position]).
 *
 * SUPPORTED_TWIN_YEARS is the single allowlist gate. July 1 scope: 2026 only.
 * Historical years activate by ADDING to this array after the consensus-rank
 * coverage audit passes (mid-July) — no new code required.
 */

import { POSITION_ORDER, type Position } from './chartConstants';

/** Years for which twin position pages are generated and routable. Non-listed → 404. */
export const SUPPORTED_TWIN_YEARS: readonly number[] = [2026];

export function isSupportedTwinYear(year: number): boolean {
  return SUPPORTED_TWIN_YEARS.includes(year);
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
