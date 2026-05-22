/**
 * lib/tierLabels.ts
 *
 * Delta-3: 5-tier visual outcome system (replaces 7-tier from Delta-2).
 * Used by TierAxisLabels (Y-axis zone fills/labels), getDotColor (dot fills),
 * and player cards.
 *
 * Thresholds map to the 0–100 score from lib/scoring.ts.
 * List is ordered highest-to-lowest (Franchise Player first, Bust last).
 *
 * Awards floors (from scoring engine — carry forward):
 *   All-Pro (1+)   → minimum Franchise Player (score ≥ 75)
 *   Pro Bowl (2+)  → minimum Pro Bowl Caliber (score ≥ 55)
 *   Pro Bowl (1×)  → no floor
 */

export interface Tier {
  id: string
  label: string
  color: string
  minScore: number  // inclusive lower bound: score >= minScore → this tier
}

// TODO Delta-5: validate cutoffs against full dataset
export const TIERS: Tier[] = [
  { id: 'franchise', label: 'FRANCHISE PLAYER',   color: '#f59e0b', minScore: 75 },
  { id: 'pro-bowl',  label: 'PRO BOWL CALIBER',   color: '#34d399', minScore: 55 },
  { id: 'starter',   label: 'STARTER',             color: '#60a5fa', minScore: 35 },
  { id: 'depth',     label: 'DEPTH / ROLE PLAYER', color: '#94a3b8', minScore: 12 },
  { id: 'bust',      label: 'BUST',                color: '#f87171', minScore: 0  },
]

// TODO Delta-5: validate cutoffs against full dataset
export function getTierForScore(score: number): Tier {
  for (const tier of TIERS) {
    if (score >= tier.minScore) return tier
  }
  return TIERS[TIERS.length - 1]
}
