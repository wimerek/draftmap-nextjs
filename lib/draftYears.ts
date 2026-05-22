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
