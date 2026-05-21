/**
 * lib/dotColor.ts
 *
 * Dot color logic for the Delta-2 chart view system.
 *
 * Projection mode: round-based colors (unchanged from Phase Beta).
 * All other modes (draft-results, player-production, career): tier colors from
 * the NFL outcome scoring system. Null outcomeScore → Depth/ST fallback color.
 */

import { TIER_LABELS } from './tierLabels'
import type { ChartMode } from './dataAvailability'

const ROUND_COLORS: Record<number, string> = {
  1: '#34d399',
  2: '#a3e635',
  3: '#facc15',
  4: '#fb923c',
  5: '#f87171',
  6: '#c084fc',
  7: '#94a3b8',
}

export function getTierForScore(score: number): typeof TIER_LABELS[number] {
  for (const tier of TIER_LABELS) {
    if (score >= tier.threshold) return tier
  }
  return TIER_LABELS[TIER_LABELS.length - 1]
}

export function getDotColor(
  mode: ChartMode,
  outcomeScore: number | null,
  round: number | null,
): string {
  if (mode === 'projection') {
    return ROUND_COLORS[round ?? 7] ?? '#94a3b8'
  }
  if (outcomeScore === null) return '#4e6070'
  return getTierForScore(outcomeScore).color
}
