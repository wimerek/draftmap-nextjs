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

/** Dot stroke width (team `.secondary`). Brief-f rider render contingency: DEFAULT
 *  UNCHANGED at 1 — thin toward ~0.75 ONLY if the dense funnel shimmers on Brave. */
export const DOT_STROKE_W = 1; // tune on real render

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
export const THREAD_OPACITY_MIN = 0.07; // locked working value — tune on real render (dot-end stays clean — do NOT raise)
export const THREAD_OPACITY_MAX = 0.34; // brief-f: 0.30 → 0.34 firms the comb at the wall/nodes (MIN untouched)

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

/**
 * Grab-ring opacity (max, at the flare side) — PER TIER. ⚠ Brief-f Tufte rider: the
 * grab ring is now per-tier (strokes `jf-grab-ring-${tier}` keyed on the dot's tier,
 * parallel to the thread gradients) — gold appears ONLY on PREMIUM (gold scarcity),
 * navy on SOLID, sky on BRIDGE, grey on PROVE_IT/NONE. SOLID is dialed DOWN (0.55 vs
 * 0.78) because navy is low-luminance and otherwise reads heavier than the rest — this
 * evens the visual weight across tiers. Per-tier knob; tune on real render.
 */
export const GRAB_RING_OPACITY: Record<ContractTier, number> = {
  PREMIUM: 0.78,
  SOLID: 0.55,   // navy is low-luminance → lower opacity to match the others' weight
  BRIDGE: 0.78,
  PROVE_IT: 0.78,
  NONE: 0.78,
};
export const GRAB_RING_W = 1.4;        // ring stroke width (rest) — tune on real render
export const GRAB_RING_DR = 2.2;       // ring radius beyond DOT_R (rest) — tune on real render

/** Hover-amplified grab (brief-f rider): the hovered dot's ring goes bolder + larger
 *  so it reads as "active" (pairs with the lit-thread brighten). Tune on real render. */
export const GRAB_RING_HOVER_W = 2.6;  // ring stroke width on hover
export const GRAB_RING_HOVER_DR = 3.6; // ring radius beyond DOT_R on hover

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

// ── BRIEF 3 — Resolved PROVE IT continuous placement (render-gated) ───────────
//
// PROVE IT carries a REAL verdict_share (lib/verdict.ts: "PROVE_IT carries a value
// but renders on its floor strip") that the fixed PROVE_IT_STRIP_Y discards. These
// knobs let the floor PROVE IT dots spread by guarantee instead. MODE SWITCH so both
// candidates render side-by-side for Derek's render-gated decision — NOTHING here
// ships until he signs off at the render. NONE stays on NONE_STRIP_Y in BOTH modes.
//
// A PROVE IT unknown share (23 null rows) resolves to 0 (the floor) — deliberately
// NOT the paid tiers' tierMedianShare imputation: a PROVE IT unknown defaults DOWN.

/**
 * 'continuous' — route PROVE IT through the SAME paidShareToYFraction the paid tiers
 *   use. A 0.29-share dot rises to ~BRIDGE/SOLID height with its thread pulling back
 *   to the PROVE IT node; zero-share dots pile at PAID_REGION_BOTTOM. Maximal honesty
 *   (Derek's "let the tentacles do the work"); most tests the high-tail read.
 * 'subband'   — map PROVE IT into a dedicated low band [TOP, BOTTOM] just below paid
 *   territory: spreads by share but never invades BRIDGE. Conservative compromise.
 */
export type ProveItPlacement = 'continuous' | 'subband';
export const PROVE_IT_PLACEMENT: ProveItPlacement = 'continuous'; // render-gated — flip to compare; Derek decides

/** Mode B band geometry (Y-fractions of the plotting band, 0=top … 1=bottom). */
export const PROVE_IT_BAND_TOP    = 0.80; // just below PAID_REGION_BOTTOM (0.78) — no BRIDGE invasion — tune on render
export const PROVE_IT_BAND_BOTTOM = 0.94; // just above NONE_STRIP_Y (0.96) — zero-share dots sink here — tune on render

/**
 * Mode B reference share → band top. Set near the TOP of PROVE IT's observed positive
 * range (resolved p90≈0.099, p95≈0.146) — deliberately BELOW the 0.2855 max so one
 * cheap-position outlier doesn't stretch the band; anything above clamps to the top.
 * Tune on render.
 */
export const PROVE_IT_REF_SHARE = 0.10; // tune on real render

/** Mode B curve: 'sqrt' spreads the dense low end (resolved median share ≈0.013);
 *  'linear' maps raw. Median is tiny so most positives want spreading. Tune on render. */
export const PROVE_IT_BAND_CURVE: 'sqrt' | 'linear' = 'sqrt'; // tune on real render

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

/** Empty headroom above the usage body so P100 doesn't pin to the very top. Brief 2
 *  Item 3: 0.06 → 0.03 — with the on-canvas subhead moved into Reads & Keys, the field
 *  no longer needs the larger top gap; this lifts the STARTER band toward the top of the
 *  viewport (parity with the resolved field, whose PREMIUM dots sit ~at bandTop). Tune
 *  on real render. */
export const PENDING_HEADROOM_FRAC = 0.03; // tune on real render

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

/** RD round-anchor label ink. Brief-f Tufte rider: 0.55 → 0.72 — Derek's render read
 *  it near-invisible; bring up to quiet-but-readable (smallest effective difference). */
export const RD_LABEL_COLOR = 'rgba(11,34,57,0.72)'; // knob, tune on real render

/** Full-width hairline rule just above the RD label row (axis furniture, outside
 *  the field). NOT a round gridline — that vertical-gridline lock stands. */
export const RD_AXIS_RULE_COLOR = 'rgba(11,34,57,0.25)'; // knob, tune on real render

/** Brief-f rider: a short tick at each round anchor (drops from the hairline toward
 *  the label) — anchors each RD label to the axis. A TICK, not a gridline (height is
 *  tiny, never spans the field). Quiet furniture layer. */
export const RD_TICK_COLOR = 'rgba(11,34,57,0.45)'; // knob, tune on real render
export const RD_TICK_H = 5;                         // tick length (px) — tune on real render

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

// ── Rider 1 — resolved-field left-edge Y labels (DELETED, Brief 2 Item 4) ──────
//
// The left-edge strip eyebrows (TOP OF MARKET / SIGNED · PROMISED NOTHING / NEVER
// SIGNED AGAIN) are GONE: the left-edge axis title (RESOLVED_Y_AXIS_TITLE) names the
// Y dimension, and the right-axis wall tabs + their tier descriptors
// (RESOLVED_TIER_DESCRIPTOR below) are now the single label home for the tiers. With
// Brief 3's continuous PROVE IT placement the PROVE IT strip is orphaned (its dots
// floated up), so its strip + label are removed too; only the NONE dot strip remains.

/**
 * Brief-f Y-AXIS LABEL (locked): a single two-line left-edge axis title NAMES the Y
 * dimension (mirrors the chart's own title/subtitle typography). Replaces the removed
 * "TOP OF MARKET" tab. NO top/bottom benchmark labels or lines — the wall's PREMIUM
 * node + the floor strips already anchor the extremes (smallest-effective-difference).
 */
export const RESOLVED_Y_AXIS_TITLE     = 'GUARANTEED MONEY';
export const RESOLVED_Y_AXIS_QUALIFIER = "share of position's top market";

/**
 * Brief 2 Item 2 — PENDING field Y-AXIS LABEL. Mirrors the resolved axis treatment so
 * the pending field reads as a measured USAGE axis the way resolved reads as a measured
 * money axis. Same rotated left-edge title; the pending field already labels its bands
 * inline-left (STARTER/ROLE PLAYER/FRINGE/strip), so this is the rotated axis label
 * ONLY — never a second set of band tabs.
 */
export const PENDING_Y_AXIS_TITLE     = 'USAGE';
export const PENDING_Y_AXIS_QUALIFIER = "share of position's snaps";

/**
 * Brief 2 Item 5 — right-axis tier descriptors (resolved field). LOCKED family. A 2–3
 * word subline under each wall tab; with the bottom-strip editorial labels gone (Item 4)
 * and PROVE IT spread continuously (Brief 3), the wall tabs are the load-bearing tier
 * labels. Tier display NAMES stay locked (project_second_contract_verdict) — this is a
 * subline, NOT a rename. (BRIDGE is NOT a small deal: top-of-position pay for ONE year,
 * e.g. franchise tags / 5th-year options — the "one year" cue is why it sits below SOLID.)
 * The fuller plain-language definitions live in Reads & Keys (ActKey), same off-canvas move.
 */
export const RESOLVED_TIER_DESCRIPTOR: Record<ContractTier, string> = {
  PREMIUM:  'top of the market',
  SOLID:    'real multi-year money',
  BRIDGE:   'top money, one year',
  PROVE_IT: 'signed, no substantial guarantees',
  NONE:     'no second contract',
};

/** Inset (px, ≈ one dot width) pushing the Y-axis spine + title LEFT off the leftmost
 *  dots, so the spine reads as axis furniture and not as connected to the data. The
 *  X round-axis hairline extends to this same x to keep the bottom-left corner closed. */
export const Y_AXIS_SPINE_INSET = 12; // tune on real render

/** Gap (px) between the left axis spine and the rotated Y-axis title — ≈ the label's
 *  cap-height so text + spine read as paired-but-distinct layers (Tufte separation). */
export const Y_AXIS_TITLE_GAP = 12; // tune on real render

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

// ════════════════════════════════════════════════════════════════════════════
//  BRIEF F — LENS (ghost + re-light) (append only)
//  When a scope lens is active, lit dots/threads re-light LOUD and the rest ghost.
//  These are SEPARATE from the pending UNRANKED_DOT_OPACITY "muted" flag — a strip
//  dot can be lit OR ghosted by the lens independent of its unranked status (two
//  orthogonal dimensions). At rest (no lens) NONE of these apply — the resting
//  field renders byte-identical.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ghost floor for non-lit dots AND non-lit threads under an active lens. The dot
 * <g> drops to this group opacity (ring + glyph fade with it) and goes
 * pointer-inert; a non-lit thread strokes at this path opacity. Mirrors the Acts
 * 1/2 PlayerDots ghost (0.12) so the whole product ghosts at one weight.
 */
export const LENS_GHOST_OPACITY = 0.12; // locked working value — tune on real render

/**
 * Lit-thread re-light gradient (faint at the dot → firm toward the wall), used ONLY
 * for in-scope threads while a lens is active. The resting gradient maxes at
 * THREAD_OPACITY_MAX (0.34); a path-opacity multiplier can only pull a lit thread
 * DOWN from that, so brightening ABOVE the resting weave needs this second, brighter
 * gradient. "Re-light the weave, ghost the rest" — the lens is a LOUD state (3c 7.0).
 */
export const LENS_LIT_THREAD_OPACITY_MIN = 0.35; // dot end — tune on real render
export const LENS_LIT_THREAD_OPACITY_MAX = 0.80; // wall end — tune on real render

/**
 * Lit-count text beside each frozen wall node label (wall RE-LIGHTS, height never
 * recomputes). NO NEW HUE — the lit count is the chart's dark NAVY ink, set apart
 * by WEIGHT + SIZE, not chroma (Tufte smallest-effective-difference; avoids piling
 * another saturated color into the already-loud lit state, and can't collide with
 * gold=PREMIUM by construction). Sits on the PARCHMENT field → navy reads strong.
 * Fallback ONLY if navy-bold tests too quiet on Brave = the EXISTING brand teal
 * '#0E7490' (Good token) — never a new hex.
 */
export const LENS_WALL_LIT_COLOR = '#0B2239'; // navy ink; size+weight carry it — tune on render

/** When a lens is active, the FROZEN global node count steps one shade muted so the
 *  navy-bold lit count wins the hierarchy. Reuses the NONE grey (no new hex). At rest
 *  the count keeps its normal grey — the dim only applies under a lens. */
export const LENS_WALL_DIM_COLOR = '#99A1AA'; // one step muted from the #6B7280 count grey

/** Lit-count type size (px, bold). Bumped from the node count's 10 → ~12: it's a
 *  transient attention element meant to grab the eye. Tune on render. */
export const LENS_WALL_LIT_SIZE = 12;
