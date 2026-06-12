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

export type ChartMode = 'projection' | 'draft-results' | 'player-production' | 'career' | 'verdict'

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
  isMilestone?: boolean   // true for Rookie Contract and Career
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

  // Individual year steps: Years 1–4 only (capped at DATA_END_YEAR).
  // Seasons after DATA_END_YEAR are skipped (future — no data yet).
  const maxIndividualYear = Math.min(draftYear + 3, DATA_END_YEAR)
  for (let season = draftYear; season <= maxIndividualYear; season++) {
    steps.push({
      id: String(season),
      label: String(season),
      shortLabel: `'${String(season).slice(2)}`,
      mode: 'player-production',
      season,
    })
  }

  // Rookie Contract step: requires ≥2 seasons (Year 2 must exist)
  if (draftYear + 1 <= DATA_END_YEAR) {
    steps.push({
      id: 'rookie-contract',
      label: 'Rookie Contract',
      shortLabel: 'RC',
      mode: 'player-production',
      isMilestone: true,
    })
  }

  // Veteran step: requires ≥5 seasons
  if (draftYear + 4 <= DATA_END_YEAR) {
    steps.push({
      id: 'veteran',
      label: 'Veteran (Yrs 5+)',
      shortLabel: 'Vet',
      mode: 'player-production',
    })
  }

  steps.push({
    id: 'career',
    label: 'Career',
    shortLabel: 'Career',
    mode: 'career',
    isMilestone: true,
  })

  return steps
}
