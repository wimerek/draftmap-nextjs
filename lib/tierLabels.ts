/**
 * lib/tierLabels.ts
 *
 * Phase 2 / Epsilon: 3-zone visual outcome system based on position-normalized
 * snap percentile. Used by TierAxisLabels (Y-axis zone fills/labels) and player cards.
 *
 * Thresholds map to the 0–100 position-normalized snap percentile from lib/sheets.ts.
 * List is ordered highest-to-lowest (Starter first, Fringe last).
 *
 * Zone boundaries (validated against dataset):
 *   Starter     (P65+): coaches rely on this player regularly
 *   Role Player (P25–P65): contributing, defined role, competes for snaps
 *   Fringe      (P0–P25):  on the roster, limited playing time
 *
 * "Washed Out" (no longer in the league) is NOT a zone in this array — it lives
 * below the chart field and is handled separately by UDFAZone. See WASHED_OUT_COLOR.
 *
 * Pro Bowl and All Pro status are now visual markers on dots (ring / star),
 * not score floors. Award floors removed from this zone system.
 */

export interface Tier {
  id: string
  label: string
  color: string        // label text + swatch color (used at full opacity)
  fillColor: string    // zone background fill (different, deeper base color)
  fillOpacity: number  // fill opacity over parchment
  minScore: number  // inclusive lower bound: score >= minScore → this tier
}

export const TIERS: Tier[] = [
  {
    id: 'starter',
    label: 'STARTER',
    color: '#D4A017',       // brand gold — label text stays gold
    fillColor: '#B45309',   // deep amber (brand "Great" color) — fills warm without going yellow
    fillOpacity: 0.14,
    minScore: 65,
  },
  {
    id: 'role',
    label: 'ROLE PLAYER',
    color: '#15803d',
    fillColor: '#15803d',   // same — forest green reads correctly at this opacity
    fillOpacity: 0.13,
    minScore: 25,
  },
  {
    id: 'fringe',
    label: 'FRINGE',
    color: '#c2410c',
    fillColor: '#c2410c',   // same — slightly reduced opacity balances against green
    fillOpacity: 0.13,
    minScore: 0,
  },
]

/** Color for the "Washed Out" zone (below the chart field). Not a TIER entry. */
export const WASHED_OUT_COLOR = '#334155'

export function getTierForScore(score: number): Tier {
  for (const tier of TIERS) {
    if (score >= tier.minScore) return tier
  }
  return TIERS[TIERS.length - 1]
}
