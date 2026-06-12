/**
 * lib/act3Constants.ts
 *
 * Act 3 (Second Contract / resolved jellyfish) render knobs — ONE place for
 * every tunable. Each value is a locked working default, tuned on the real
 * render. Knobs doctrine: one place, not one moment.
 *
 * Brief b owns the constants below. Brief c will APPEND its own here
 * (LANE_PX, MIN_GAMES_QUALIFY, ST_CEILING, usage-Y knobs) — do not add those now.
 */

import type { ContractTier } from './verdict';

// ── Dots ────────────────────────────────────────────────────────────────────

/** Uniform resolved-field dot radius. */
export const DOT_R = 4.5; // locked working value — tune on real render

/** Muted "data-gap" dot (resolved-class join failure — see lib/sheets.ts). */
export const DATA_GAP_FILL   = '#C9CDD2'; // locked working value — tune on real render
export const DATA_GAP_STROKE = '#9099A1'; // locked working value — tune on real render

// ── Threads ───────────────────────────────────────────────────────────────────

/** Thread opacity gradient — faint at the dot, firmer toward the wall. */
export const THREAD_OPACITY_MIN = 0.07; // locked working value — tune on real render
export const THREAD_OPACITY_MAX = 0.30; // locked working value — tune on real render

/** Thread stroke width. */
export const THREAD_W = 1.1; // locked working value — tune on real render

/**
 * Per-tier thread color. Distinct from the gold "grab" ring on the dot — the
 * THREAD carries the tier hue, the ring is uniform LINE_GOLD.
 */
export const TIER_THREAD_COLOR: Record<ContractTier, string> = {
  PREMIUM:  '#C8920A', // gold
  SOLID:    '#1D3E63', // navy
  BRIDGE:   '#6FA8D8', // sky
  PROVE_IT: '#7A828D', // grey
  NONE:     '#99A1AA', // lighter grey (the wash-out mass)
};

// ── Grab ring ─────────────────────────────────────────────────────────────────

/**
 * The gradient "grab" ring flares toward the thread-attachment side.
 * Named token; brand gold #D4A017 is unchanged for fills elsewhere.
 */
export const LINE_GOLD = '#C8920A'; // locked working value — tune on real render
export const GRAB_RING_OPACITY = 0.6;  // max opacity at the flare side — tune on real render
export const GRAB_RING_W = 1.4;        // ring stroke width — tune on real render

// ── Tier wall ─────────────────────────────────────────────────────────────────

/** Wall node geometry (the 5 tier nodes stacked at the far right). */
export const WALL_NODE_W      = 12;  // node width (px) — tune on real render
export const WALL_GAP         = 6;   // vertical gap between nodes — tune on real render
export const WALL_LABEL_DX    = 8;   // label x-offset from node right edge — tune on real render
export const WALL_MIN_NODE_H  = 10;  // floor height so a tiny tier stays visible — tune on real render
export const WALL_RIGHT_PAD   = 150; // px reserved at the right edge for nodes + labels — tune on real render

/** Wall display order, top (most paid) → bottom (never paid). */
export const WALL_TIER_ORDER: ContractTier[] = ['PREMIUM', 'SOLID', 'BRIDGE', 'PROVE_IT', 'NONE'];

// ── Field Y regions ───────────────────────────────────────────────────────────

/**
 * Vertical layout fractions of the plotting band (0 = top, 1 = bottom):
 *   [0, PAID_BOTTOM]            continuous √(verdict_share) region (paid tiers)
 *   PROVE_IT_STRIP_Y           discrete floor strip for PROVE IT
 *   NONE_STRIP_Y               discrete floor strip for NONE (lowest)
 */
export const PAID_REGION_BOTTOM = 0.78; // continuous region occupies the top 78% — tune on real render
export const PROVE_IT_STRIP_Y   = 0.88; // tune on real render
export const NONE_STRIP_Y       = 0.96; // tune on real render

/**
 * Tiny deterministic vertical jitter (px) applied to co-linear null-share /
 * floor-strip dots so a flat row doesn't read as a rendering artifact. Knob,
 * not hardcode — set to 0 to disable.
 */
export const STRIP_JITTER_PX = 3; // tune on real render

// ── Usage tiers (hover Block 3 "ON THE FIELD") ────────────────────────────────

/**
 * Career-usage PERCENTILE-within-position → usage-tier label. Locked tier
 * system (project_usage_metric lock): percentile bands, NOT raw snap rate.
 * 'Rotational' was explicitly rejected. The hover shows this label plus the
 * percentile-within-pool the label was derived from.
 */
export const USAGE_TIER_THRESHOLDS: Array<{ min: number; label: string }> = [
  { min: 65, label: 'Starter' },
  { min: 25, label: 'Role Player' },
  { min: 0,  label: 'Fringe' },
];

/** Map a career-usage percentile-within-position (0–100) to its tier label. */
export function usageTierLabel(careerUsagePercentile: number | null): string | null {
  if (careerUsagePercentile === null) return null;
  for (const band of USAGE_TIER_THRESHOLDS) {
    if (careerUsagePercentile >= band.min) return band.label;
  }
  return USAGE_TIER_THRESHOLDS[USAGE_TIER_THRESHOLDS.length - 1].label;
}
