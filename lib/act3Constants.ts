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

// ════════════════════════════════════════════════════════════════════════════
//  BRIEF C — PENDING USAGE FIELD + CAPITAL FLOOR (append only)
//  Brief b owns everything above; brief c appends its render knobs here, one
//  place. Each value is a locked working default — tune on the real render.
// ════════════════════════════════════════════════════════════════════════════

// ── Pending-field knobs (Part 6a) ─────────────────────────────────────────────

/**
 * No-fire lane thickness (px). Any pending dot whose final Y lands within
 * LANE_PX/2 of a labeled zone boundary is pushed to the lane edge on its TRUE
 * side (membership exact, position approximate — Acts 1/2 X-spread precedent).
 * The lane is invisible; its only job is to keep label text from fighting a dot.
 */
export const LANE_PX = 28; // locked working value — tune on real render

/**
 * Deterministic in-lane jitter (px), seeded by player_id. 0 = disabled (the dots
 * snap cleanly to the lane edge). First polish lever if the lane-edge dot line
 * reads as an artifact on the real render (Part 3 polish order:
 * enable jitter → graduated push → shrink LANE_PX).
 */
export const LANE_EDGE_JITTER_PX = 0; // locked working value — tune on real render

/**
 * Ceiling (in percentile-height units, 0–100) for the ST-primary path. A global
 * ST percentile is rescaled [0,100] → [0,ST_CEILING] (rescale, NOT clamp) so an
 * elite special-teamer lands at ~P45 visual height — top Role Player, never a
 * Starter by volume. ST is woven INTO the usage body, not a separate band.
 */
export const ST_CEILING = 45; // locked working value — tune on real render

/**
 * Horizontal spread (px) of the UDFA gutter column, deterministic + seeded by
 * player_id (stable across renders, no reflow). Shared by BOTH field gutters
 * (resolved + pending) — the gutter-spread ride-along (Part 6b).
 */
export const GUTTER_SPREAD_PX = 24; // locked working value — tune on real render

/**
 * DOCUMENTATION MIRROR — never a live gate. The live qualification gate is the
 * `usage_qualified` column, baked by a3 (the one qualification computation in the
 * universe; the render NEVER re-derives from phase_games).
 *   (1) intentionally lenient — PFR's per-game qualifier is ~50% of games;
 *       6/17 ≈ 35% is deliberately MORE lenient (young/injured high picks survive).
 *   (2) changing THIS constant does nothing without an a3 re-run — it only records
 *       what the Sheet was baked at.
 */
export const MIN_GAMES_QUALIFY = 6; // mirror of the a3 bake value — NOT a live gate

// ── Pending-field zone geometry (Part 3) ──────────────────────────────────────
//
// Y-fraction layout of the pending plotting band (0 = top, 1 = bottom):
//   [0, PENDING_HEADROOM_FRAC)        empty top headroom (no line at the very top)
//   [HEADROOM, STRIP_TOP)             the usage body — careerUsagePercentile maps
//                                     here (100 → just below headroom, 0 → strip top)
//   [STRIP_TOP, 1]                    COULDN'T STICK strip — the ONE grey fill (the
//                                     trapdoor = different ground)
// Zone boundary LINES sit at the body-Y of P65 (Starter) and P25 (Role Player);
// those TRUE percentile thresholds are reused from USAGE_TIER_THRESHOLDS above.

/** Empty headroom above the usage body so P100 doesn't pin to the very top. */
export const PENDING_HEADROOM_FRAC = 0.06; // tune on real render

/** Top edge (Y-fraction) of the COULDN'T STICK strip — the body's lower bound. */
export const COULDNT_STICK_STRIP_TOP_FRAC = 0.86; // tune on real render

/** Percentile (within the fringe band) used to place the FRINGE edge-tab label. */
export const PENDING_FRINGE_TAB_PCT = 10; // tune on real render

/** Grey fill of the COULDN'T STICK strip (the trapdoor). */
export const COULDNT_STICK_FILL   = 'rgba(107,114,128,0.10)'; // tune on real render
export const COULDNT_STICK_STROKE = '#9099A1';                // dashed top edge

/** Edge-tab styling (Part 3c): soft navy-tint tab + navy bookmark bar. */
export const ZONE_TAB_FILL        = 'rgba(11,34,57,0.05)'; // ~5% navy tint
export const ZONE_TAB_BAR         = '#0B2239';             // 2.5px navy bookmark bar
export const ZONE_TAB_BAR_W       = 2.5;
export const ZONE_LINE_COLOR      = 'rgba(11,34,57,0.78)'; // hairline boundary, navy ~0.78
export const ZONE_LABEL_COLOR     = 'rgba(11,34,57,0.78)';
export const ZONE_COUNT_COLOR     = 'rgba(11,34,57,0.55)';

// ── X-axis furniture (Gate-2 Fix 3 — all three field modes) ───────────────────

/** RD round-anchor label ink. Darkened from 0.40 → 0.55 for legibility. */
export const RD_LABEL_COLOR = 'rgba(11,34,57,0.55)'; // knob, tune on real render

/** Full-width hairline rule just above the RD label row (axis furniture, outside
 *  the field). NOT a round gridline — that vertical-gridline lock stands. */
export const RD_AXIS_RULE_COLOR = 'rgba(11,34,57,0.25)'; // knob, tune on real render

// ── Pending strip label maturity gate (Gate-2 Fix 4 — Derek-locked) ───────────

/**
 * A class with ≥ this many completed seasons labels the COULDN'T STICK strip with
 * verdict language ("COULDN'T STICK"). Below this the strip must NOT speak verdict
 * language — it reads "TOO FEW SNAPS" (unranked register). Completed-season count
 * is the number of distinct seasons present in the class's usage.seasons (already
 * draft_year-forward filtered) — NO calendar math.
 */
export const STRIP_LABEL_VERDICT_AFTER_SEASONS = 3;
