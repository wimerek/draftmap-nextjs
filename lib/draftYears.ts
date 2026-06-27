/**
 * lib/draftYears.ts
 *
 * Draft year constants — safe to import from client components.
 * Extracted from lib/sheets.ts to avoid pulling server-only dependencies
 * (fs, scoring engine) into the client bundle.
 */

export const VALID_DRAFT_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const;
export type DraftYear = (typeof VALID_DRAFT_YEARS)[number];
export const CURRENT_DRAFT_YEAR = VALID_DRAFT_YEARS[0];

/**
 * The year a first-time visitor lands on (the `/draft` redirect target) and the
 * "home" target for the reset/logo affordance. Deliberately DECOUPLED from
 * CURRENT_DRAFT_YEAR: that constant drives sitemap priority, the /players
 * default, and the chart's "newest class" logic, and must stay on the pending
 * class. The landing default points at a *resolved* class so first impressions
 * read as a finished story.
 *
 * NOTE: When this flips, update the `/draft` redirect destination in
 * next.config.mjs to match (that redirect is a JS literal and can't import this).
 */
export const DEFAULT_LANDING_YEAR: DraftYear = 2022;
