/**
 * lib/tierLabels.ts
 *
 * Phase 2: 3-tier visual outcome system based on position-normalized snap percentile.
 * Used by TierAxisLabels (Y-axis zone fills/labels) and player cards.
 *
 * Thresholds map to the 0–100 position-normalized snap percentile from lib/sheets.ts.
 * List is ordered highest-to-lowest (Starter first, Depth last).
 *
 * Tier boundaries (validated against dataset):
 *   Starter    (P65+): coaches rely on this player regularly
 *   Role Player (P25–P65): contributing, defined role, competes for snaps
 *   Depth       (P0–P25):  on the roster, limited playing time
 *
 * Pro Bowl and All Pro status are now visual markers on dots (ring / star),
 * not score floors. Award floors removed from this tier system.
 */

export interface Tier {
  id: string
  label: string
  color: string
  minScore: number  // inclusive lower bound: score >= minScore → this tier
}

export const TIERS: Tier[] = [
  { id: 'starter',    label: 'STARTER',     color: '#60a5fa', minScore: 65 },
  { id: 'role',       label: 'ROLE PLAYER', color: '#94a3b8', minScore: 25 },
  { id: 'depth',      label: 'DEPTH',       color: '#64748b', minScore: 0  },
]

export function getTierForScore(score: number): Tier {
  for (const tier of TIERS) {
    if (score >= tier.minScore) return tier
  }
  return TIERS[TIERS.length - 1]
}
