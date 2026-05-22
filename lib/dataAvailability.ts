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
// TODO: bump to 2025 once 2025-season scoring data is processed.
const DATA_END_YEAR = 2024

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

  // Use year-label style (Yr 1, Yr 2…) when the first available season doesn't
  // match the draft year — meaning early career seasons are missing from the dataset.
  // TODO: 2016-2020 first seasons not in dataset — score is partial for those years.
  const useYrLabels =
    seasonsAvailable.length > 0 && seasonsAvailable[0] !== draftYear

  seasonsAvailable.forEach((season, i) => {
    const yearLabel  = useYrLabels ? `Yr ${i + 1}` : String(season)
    const shortLabel = useYrLabels ? `Y${i + 1}` : `'${String(season).slice(2)}`
    steps.push({
      id: String(season),
      label: yearLabel,
      shortLabel,
      mode: 'player-production',
      season,
    })
  })

  steps.push({
    id: 'career',
    label: 'Career',
    shortLabel: 'Career',
    mode: 'career',
  })

  return steps
}
