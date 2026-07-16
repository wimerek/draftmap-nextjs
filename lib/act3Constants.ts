/**
 * lib/act3Constants.ts
 *
 * Act 3 render knobs — ONE place for every tunable. Each value is a locked working
 * default, tuned on the real render. Knobs doctrine: one place, not one moment.
 *
 * SCOPE NOTE (Phase Lambda, Brief 6): the legacy resolved-jellyfish + pending-usage
 * field render paths were deleted. The bulk of this file's original knobs (dot/thread/
 * wall geometry, √-share Y regions, PROVE IT placement, pending-zone system, ST 0–45
 * rescale, resolved/pending Y-axis labels, five-tier descriptors, lens knobs) went with
 * them. What remains is the small set still consumed by live code: usage-tier vocabulary
 * (hover + starter stat), the Act-2 reach/steal brackets, the transport cluster presets,
 * the K/P/LS strip copy, the award-glyph ink, and TIER_THREAD_COLOR (legacy five-tier
 * palette; no live consumer).
 * The NEW Act-3 field's knobs live in lib/act3FieldConstants.ts.
 */

import type { ContractTier } from './verdict';

// ── Award-glyph ink (Brief E ladder) ──────────────────────────────────────────
// One ivory mark per Act-3 dot = the highest rung earned in the rookie window
// (crown > star > chevron > triangle). Marks computed in lib/awardGlyph.ts; rendered
// via AwardGlyphMark in the Act-3 field + the sidebar Act Key.

/** Glyph ink: ivory fill + navy keyline. Gold stays reserved for the verdict. */
export const GLYPH_FILL    = '#FBF8F2'; // ivory
export const GLYPH_KEYLINE = '#0B2239'; // navy keyline (painted under the fill, paint-order)
export const GLYPH_KEYLINE_W = 0.6;     // keyline stroke width — tune on real render

/**
 * Glyph half-extent as a multiple of the dot radius (decoupled from the dot radius).
 * <1 leaves a team-color rim; =1 mark ≈ dot; >1 the mark sits on/over the dot.
 */
export const GLYPH_DOT_FRAC = 0.65; // locked working value — tune on real render

// ── Tier thread color (About-page Round→Tier Sankey) ──────────────────────────
//
// Legacy five-tier palette; no live consumer (the About Sankey moved to the six-band
// money ladder in the 2026-07-13 rebuild). NOT a chart-side render constant — the Act-3
// field colors dots off the six-band ladder.
export const TIER_THREAD_COLOR: Record<ContractTier, string> = {
  PREMIUM:  '#C8920A', // gold
  SOLID:    '#1D3E63', // navy
  BRIDGE:   '#6FA8D8', // sky
  PROVE_IT: '#7A828D', // grey
  NONE:     '#99A1AA', // lighter grey
};

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

// ── Scoreboard stat thresholds ────────────────────────────────────────────────

/**
 * "Became a starter" = cumulative usage percentile ≥ this. References the Starter min
 * from USAGE_TIER_THRESHOLDS so there is exactly ONE magic 65 in the codebase.
 */
export const STARTER_PERCENTILE = USAGE_TIER_THRESHOLDS[0].min; // 65

/**
 * Act-2 reach/steal value-gap brackets. A drafted player flags as a REACH (picked
 * EARLIER than ranked) or STEAL (picked LATER) ONLY when the pick-VALUE gap off the
 * smoothed curve clears the bracket keyed to min(rank, pick_drafted). Gap is in
 * pick-VALUE (not raw spots), so a late-round ±5-spot move never flags.
 */
export const REACH_BRACKET_TOP10  = 20;   // picks ≤ 10
export const REACH_BRACKET_THRU64 = 12.5; // picks 11–64
export const REACH_BRACKET_AFTER64 = 9;   // picks > 64

// ── Transport cluster ─────────────────────────────────────────────────────────

/** Speed presets — NO 4× (Skip serves the impatient). Multiply authored pacing.
 *  0.1 and 0.25 are opt-in slow crawls (no 0.15 — too close to 0.25 to perceive). */
export const SPEED_PRESETS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2];
export const DEFAULT_SPEED = 1;

/** Restart/Replay (Btn3) one-shot pulse after any skip (accidental-skip recovery). */
export const SKIP_PULSE_MS = 900;

// ── K/P/LS strip copy ─────────────────────────────────────────────────────────

/** Drafted pending-class kickers/punters/long-snappers have zero player_seasons rows
 *  by design (snap share is not tracked) → usage null → they fall into the strip.
 *  Honest specialist copy so we never fabricate a rank for a 4-yr starting punter. */
export const KP_STRIP_COPY = 'Specialist: snap share not tracked'; // tune on real render
