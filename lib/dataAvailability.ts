/**
 * lib/dataAvailability.ts
 *
 * Data availability model for each draft class.
 * Determines tick heights in the year scrubber and journey step counts.
 *
 * DATA_START_YEAR: first NFL season covered by the player_seasons Google Sheet tab.
 * DATA_END_YEAR:   last completed season in the dataset. Update when new season data is added.
 * TODO: update DATA_END_YEAR to 2025 once 2025-season stats are processed.
 */

export type DataTier = 'full' | 'partial' | 'pending'

export type ChartMode = 'projection' | 'draft-results' | 'player-production' | 'career'

export interface ClassDataAvailability {
  year: number
  tier: DataTier
  seasonsAvailable: number[]
}

export interface JourneyStep {
  id: string
  label: string
  shortLabel: string
  mode: ChartMode
  season?: number
}

// First NFL season covered by the scoring dataset.
const DATA_START_YEAR = 2018

// Last completed NFL season with stats in the dataset.
const DATA_END_YEAR = 2025

export function getClassAvailability(draftYear: number): ClassDataAvailability {
  const seasonsAvailable: number[] = []
  const firstAvailable = Math.max(draftYear, DATA_START_YEAR)

  for (let s = firstAvailable; s <= DATA_END_YEAR; s++) {
    seasonsAvailable.push(s)
  }

  let tier: DataTier
  if (seasonsAvailable.length >= 4) {
    tier = 'full'
  } else if (seasonsAvailable.length >= 1) {
    tier = 'partial'
  } else {
    tier = 'pending'
  }

  return { year: draftYear, tier, seasonsAvailable }
}

export const TICK_HEIGHT: Record<DataTier, number> = {
  full:    16,
  partial: 10,
  pending:  5,
}

export const TICK_COLOR: Record<DataTier, string> = {
  full:    'rgba(52, 211, 153, 0.55)',
  partial: 'rgba(251, 191, 36, 0.5)',
  pending: 'rgba(255, 255, 255, 0.08)',
}

export function getJourneySteps(draftYear: number): JourneyStep[] {
  const { seasonsAvailable } = getClassAvailability(draftYear)
  const steps: JourneyStep[] = []

  steps.push({
    id: 'projection',
    label: 'Draft Projections',
    shortLabel: 'Proj',
    mode: 'projection',
  })

  steps.push({
    id: 'draft',
    label: 'Draft Results',
    shortLabel: 'Draft',
    mode: 'draft-results',
  })

  // Steps always start from the draft year so the journey timeline is accurate.
  // Seasons before DATA_START_YEAR have null scores and render in the no-data zone.
  // Seasons after DATA_END_YEAR are skipped (future — no data yet).
  for (let season = draftYear; season <= DATA_END_YEAR; season++) {
    steps.push({
      id: String(season),
      label: String(season),
      shortLabel: `'${String(season).slice(2)}`,
      mode: 'player-production',
      season,
    })
  }

  steps.push({
    id: 'career',
    label: 'Career',
    shortLabel: 'Career',
    mode: 'career',
  })

  return steps
}
