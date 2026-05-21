/**
 * lib/tierLabels.ts
 *
 * NFL outcome tier definitions for the Delta-2 results view.
 * Used by TierAxisLabels (Y-axis), getDotColor (dot fills), and player cards.
 *
 * Thresholds map to the 0-100 score from lib/scoring.ts.
 * List is ordered highest-to-lowest (Star first, Bust last).
 */

export const TIER_LABELS = [
  { label: 'STAR',        threshold: 75, color: '#f59e0b' },
  { label: 'GREAT',       threshold: 58, color: '#34d399' },
  { label: 'GOOD',        threshold: 42, color: '#60a5fa' },
  { label: 'STARTER',     threshold: 28, color: '#94a3b8' },
  { label: 'CONTRIBUTOR', threshold: 14, color: '#7c8fa8' },
  { label: 'DEPTH/ST',    threshold: 5,  color: '#4e6070' },
  { label: 'BUST',        threshold: 0,  color: '#f87171' },
] as const

export type OutcomeTierLabel = typeof TIER_LABELS[number]['label']
