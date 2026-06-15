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
export const DOT_R = 7; // locked working value — tune on real render

/** Muted "data-gap" dot (resolved-class join failure — see lib/sheets.ts). */
export const DATA_GAP_FILL   = '#C9CDD2'; // locked working value — tune on real render
export const DATA_GAP_STROKE = '#9099A1'; // locked working value — tune on real render

/**
 * Unranked / "unpaid" strip dot ink (pending + floor fields). Reuses the PROVE-IT
 * grey ink family (TIER_THREAD_COLOR.PROVE_IT) — the strip is the unranked register,
 * NOT a data-gap alarm. Distinct from DATA_GAP_FILL/STROKE, which stay reserved for
 * the resolved-field join-failure dots. Rendered at full opacity over the grey fill.
 */
export const UNRANKED_DOT_FILL = '#7A828D'; // brief-e: superseded by team-color strip dots (dead unless re-enabled)

/** Strip (unranked / COULDN'T STICK) dots render team color at this opacity. 1.0 = full,
 *  no mute (Derek 2026-06-14): show the full dot like the NONE / PROVE IT strips; the
 *  dashed top edge + zone label carry "unranked · too few snaps". Lower it to re-mute. */
export const UNRANKED_DOT_OPACITY = 1; // locked working value — tune on real render

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

/** DEPRECATED (Brief c.2 Part 2): the FRINGE tab now follows the uniform placement
 *  grammar — it sits just below the P25 line (ZONE_TAB_INSET_PX), no longer at a
 *  percentile. Kept only to record the prior placement; not read by the layout. */
export const PENDING_FRINGE_TAB_PCT = 10; // tune on real render

/** Grey fill of the COULDN'T STICK strip (the trapdoor). */
export const COULDNT_STICK_FILL   = 'rgba(107,114,128,0.10)'; // tune on real render
export const COULDNT_STICK_STROKE = '#9099A1';                // dashed top edge

/** Edge-tab styling (Part 3c): soft navy-tint tab + navy bookmark bar. */
export const ZONE_TAB_FILL        = 'rgba(11,34,57,0.05)'; // ~5% navy tint
export const ZONE_TAB_BAR         = '#0B2239';             // 2.5px navy bookmark bar
export const ZONE_TAB_BAR_W       = 2.5;

/** Edge-tab box geometry (px). Shared by the renderer (tab rect) AND the no-fire
 *  lane math (the below-side reach that clears tab text) — one place. */
export const ZONE_TAB_W = 150;
export const ZONE_TAB_H = 18;

/**
 * Tab placement grammar (Brief c.2 Part 2): every edge tab sits just INSIDE THE TOP
 * of the zone it names — its center is offset this many px below that zone's top
 * (band-chart convention). The boundary LINES stay at their true positions; only the
 * label tabs move under them, so the name under each fence tells you what's below it.
 */
export const ZONE_TAB_INSET_PX = 14; // locked working value — tune on real render

/**
 * Small extra pad (px) the no-fire lane reaches PAST a tab's bottom edge, so a dot
 * never collides with tab text (Brief c.2 Part 4). Below-side lane reach =
 * ZONE_TAB_INSET_PX + ZONE_TAB_H/2 + LANE_TAB_PAD.
 */
export const LANE_TAB_PAD = 6; // locked working value — tune on real render
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

// ════════════════════════════════════════════════════════════════════════════
//  BRIEF D — SCOREBOARD + TRANSPORT CLUSTER + BACKLOG RIDERS (append only)
//  Brief b/c own everything above; brief d appends here, one place. Each value is
//  a locked working default — tune on the real render.
// ════════════════════════════════════════════════════════════════════════════

// ── Scoreboard stat thresholds (Part 1) ───────────────────────────────────────

/**
 * GOT PAID = PREMIUM + SOLID + BRIDGE (ruling 3). BRIDGE is a guaranteed deal, so
 * it counts; PROVE_IT (signed, no guarantees) and NONE do NOT. The scoreboard
 * computes the count LIVE from post-a4 tiers — never a hardcoded "108 of 337".
 */
export const GOT_PAID_TIERS: ContractTier[] = ['PREMIUM', 'SOLID', 'BRIDGE'];

/**
 * "Became a starter" = cumulative career-usage percentile ≥ this (ruling 4).
 * References the Starter min from USAGE_TIER_THRESHOLDS so there is exactly ONE
 * magic 65 in the codebase.
 *
 * COHERENCE (ruling 4): scoreboard `becameStartersCount` MUST equal the pending
 * STARTER edge-tab count, because both are `careerUsagePercentile >= 65` over the
 * same qualified pool. (The pending field counts the tab via `d.y < starterLineY`,
 * which is this same threshold mapped through bodyPercentileToYFraction.)
 */
export const STARTER_PERCENTILE = USAGE_TIER_THRESHOLDS[0].min; // 65

/**
 * Act-2 reach/steal value-gap brackets (Part 1). A drafted player flags as a REACH
 * (picked EARLIER than ranked) or STEAL (picked LATER) ONLY when the pick-VALUE gap
 * off the smoothed curve clears the bracket keyed to min(rank, pick_drafted). Gap is
 * in pick-VALUE (not raw spots), so a late-round ±5-spot move never flags.
 * QBs systematically flagging as reaches is ACCEPTED (real consensus disagreement).
 */
export const REACH_BRACKET_TOP10  = 20;   // picks ≤ 10
export const REACH_BRACKET_THRU64 = 12.5; // picks 11–64
export const REACH_BRACKET_AFTER64 = 9;   // picks > 64

// ── Transport cluster (Part 3) ────────────────────────────────────────────────

/** Speed presets — NO 4× (Skip serves the impatient). Multiply authored pacing. */
export const SPEED_PRESETS = [0.5, 0.75, 1, 1.5, 2];
export const DEFAULT_SPEED = 1;

/** Restart/Replay (Btn3) one-shot pulse after any skip (accidental-skip recovery). */
export const SKIP_PULSE_MS = 900;

// ── Rider 3 — pending reaching-threads ─────────────────────────────────────────

/** Faint-at-rest opacity for a signed pending player's reaching thread (dot→tier
 *  node). Accepted + flagged: revisit if noisy on real mixed-year data — the
 *  disposition is to tune opacity / defer, NOT to move dots. */
export const PENDING_REACH_THREAD_OPACITY = 0.18; // locked working value — tune on real render

// ── Rider 4 — K/P/LS strip copy ────────────────────────────────────────────────

/** Drafted pending-class kickers/punters/long-snappers have zero player_seasons
 *  rows by design (snap share is not tracked) → usage null → they fall into the
 *  COULDN'T STICK strip. Honest specialist copy replaces "too few snaps to rank yet"
 *  so we never fabricate a rank for a 4-yr starting punter. */
export const KP_STRIP_COPY = 'Kicking specialist — not tracked by snap share'; // tune on real render

// ── Rider 1 — resolved-field left-edge Y labels ───────────────────────────────
//
// The resolved jellyfish ships with no Y-axis labels; a reader can't tell what "up"
// means. These name the verdict-Y meaning using c.2's tab grammar (ZONE_TAB_* +
// ZONE_TAB_INSET_PX). LABELS ONLY — resolved is not the pending zone system, so NO
// boundary lines, no no-fire lanes; the tabs render BEHIND threads/dots (no position
// changes). Tune copy + placement on the real render (flag for Derek's eyeball).
export const RESOLVED_Y_TOP_LABEL      = 'TOP OF MARKET';        // top of the √-share region ↑
export const RESOLVED_Y_PROVE_IT_LABEL = 'SIGNED · PROMISED NOTHING'; // PROVE IT strip
export const RESOLVED_Y_NONE_LABEL     = 'NEVER SIGNED AGAIN';   // NONE strip

// ── BRIEF E — AWARD GLYPH LADDER (append only) ─────────────────────────────────
// One ivory mark per Act 3 dot = the highest rung earned in the rookie window
// (draft_year..+3): crown > star > chevron > "S". Marks computed in
// lib/awardGlyph.ts; rendered in JellyfishField (resolved dot group + FieldDot).

/** Glyph ink: ivory fill + navy keyline. Gold stays reserved for the verdict. */
export const GLYPH_FILL    = '#FBF8F2'; // ivory
export const GLYPH_KEYLINE = '#0B2239'; // navy keyline (painted under the fill, paint-order)
export const GLYPH_KEYLINE_W = 0.6;     // keyline stroke width — tune on real render

/**
 * Glyph half-extent as a multiple of DOT_R (decoupled from the dot radius — the
 * locked "glyph-on-top over a DOT_R bump" lever). <1 leaves a team-color rim;
 * =1 mark ≈ dot; >1 the mark sits on/over the dot. Tune on the Brave render;
 * also the lever for ST-cluster legibility in the 0–45 band.
 */
export const GLYPH_DOT_FRAC = 0.65; // locked working value — tune on real render
