/**
 * lib/act3FieldConstants.ts
 *
 * Phase Lambda — Act 3 REFRAME render knobs (the resting field). ONE place for every
 * tunable of the six-band money / window-usage chart — the sole Act-3 render since the
 * legacy five-tier "jellyfish" field was removed in Lambda Brief 6.
 *
 * Authority: draftmap-act3-chart-decisions-2026-07-01.md (X/Y AXIS · MONEY BANDS ·
 * BAND RENDERING a–d · STRIPS & FIELD FURNITURE) + SPIKE RESOLUTIONS 2026-07-09.
 * Every value below is the banked working default — tune ONLY on Derek's instruction
 * at the real render (knobs doctrine: one place, not one moment).
 */

import type { MoneyBand } from './verdict';

// ════════════════════════════════════════════════════════════════════════════
//  1. FIELD GEOMETRY
// ════════════════════════════════════════════════════════════════════════════

/** SVG canvas — matches the jellyfish (register continuity for the 2→3 flip). */
export const ACT3_SVG_W = 1600;
/** Canvas height. Trimmed 960 → 930 (Sprint 3, Piece 4 — Tufte chrome reclaim, pairs with
 *  ACT3_MARGIN.top 28→12 so reclaimed top space shrinks the canvas rather than redistributing
 *  as whitespace). W=1600 is LOCKED (the 2→3 register — do not touch). Tune-on-render. */
export const ACT3_SVG_H = 930;

/**
 * FIXED pick domain across all classes (2022 max = 262). Geometry stays stable when
 * the class scrubber flips years — NO axis stretch between classes (banked X AXIS).
 */
export const ACT3_MAX_PICK = 262;

/**
 * Field margins. `right` reserves the wall + right-rail edge tabs (~220px band, sized
 * for the locked 13px-uppercase tab names — wall-label lock 2026-07-11). `left` holds
 * the rotated USAGE Y-axis title. `top` near the
 * very top (parchment field, no on-canvas title — Brief 2). `bottom` holds the round
 * gridline labels below the axis.
 */
export const ACT3_MARGIN = { top: 12, right: 178, bottom: 58, left: 80 };

/** Reserved right-rail width (px) for the six edge tabs. Sized for the locked 13px-
 *  uppercase tab names (wall-label lock 2026-07-11) — the old ~170–180px band was cut
 *  for 11.5px small-caps and clipped the longest tab (SIGNED, $0 GUARANTEED). */
export const ACT3_RIGHT_RAIL = 220;

/** UDFA gutter: a vertical band right of pick 262, separated by a visible axis break.
 *  `GAP` = the gutter gap (the axis break), `W` = the UDFA dot column width. */
export const ACT3_UDFA_GAP = 30;   // visible axis break — tune on render
export const ACT3_UDFA_W   = 64;   // UDFA strip width (STRIPS: ≈60–70px @1320 ref)

/** Deterministic UDFA-gutter horizontal spread (px), seeded by player_id (stable,
 *  no reflow). Spread = hover legibility only, never a ranking. */
export const ACT3_UDFA_SPREAD_PX = 40;

/** Too-few-snaps strip height (px) — full-width band below the usage field.
 *  STRIPS: "footnotes, not panels" target ≈45–55px @1320 ref; ⚠ real density
 *  ~104/class puts the ≤8% footprint under pressure (spike render-watch) — dense
 *  packing INSIDE the strip is the message, tune height on render for hoverability. */
export const ACT3_STRIP_H = 62;

/** Deterministic vertical jitter (px) inside the too-few-snaps strip so a flat row of
 *  co-linear dots doesn't read as an artifact. Spread = hover legibility, NOT ranking. */
export const ACT3_STRIP_JITTER_PX = 10;

/** Empty headroom (fraction of the usage band) above P100 so the top dots don't pin to
 *  the very top edge. Small — the field wants to fill the viewport (Brief 2 parity). */
export const ACT3_HEADROOM_FRAC = 0.015;

// ════════════════════════════════════════════════════════════════════════════
//  2. THE WALL + BAND COLORS  (BAND RENDERING a–c, banked 2026-07-03)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Wall node stack, TOP→BOTTOM = highest money at top (BAND RENDERING (a)).
 * TRUE-COUNT node heights, NO minimum floor (the 26px-floor variant is REJECTED —
 * node height ∝ real player count, always; lean-year TOP5 slivers ≈9–16px accepted).
 */
export const ACT3_WALL_ORDER: MoneyBand[] = ['TOP5', 'TOP10', 'MIDDLE', 'MIN', 'ZERO', 'NEVER'];

/** Wall node geometry. NO min-node-height floor — see ACT3_WALL_ORDER note. */
export const ACT3_WALL_NODE_W = 13;  // node width (px) — tune on render
export const ACT3_WALL_GAP    = 5;   // vertical gap between nodes — tune on render

/**
 * Protection knob (BAND RENDERING (b)): the 1× vet-min floor shifted figure-ground to
 * ink 62% / money 38% (designed at 78/22). The ONLY sanctioned lever is MIDDLE's sky
 * opacity — drop 0.40 → 0.30 if the money side reads loud at render. NEVER move the
 * MIN/MIDDLE boundary (spike-locked). Referenced by the MIDDLE band spec below.
 */
export const ACT3_MIDDLE_SKY_OPACITY = 0.40; // ⚠ knob: 0.40 → 0.30 if money-side loud

/**
 * Per-band render spec — SKY/NAVY/GOLD money trio over a fixed ink ramp (Variant 1,
 * deutan-verified; reuses the 3c CVD-verified trio). Family split is doctrine: ink =
 * bottom three recede, money = top three pop. Threads are a TWO-REGISTER structure
 * (BAND RENDERING (d)): ink = 1.1px, opacity gradient 0.10→0.20 toward the wall;
 * money = flat opacity, width as a second prominence channel (ink whispers, money
 * speaks, gold nearly shouts). `labelPlaceholder` names are WORKING placeholders —
 * final naming is locked at render on the live wall; surfaced here, NOT hardcoded as
 * final (see ACT3_BAND_LABELS_ARE_PLACEHOLDERS).
 */
export interface Act3BandSpec {
  band: MoneyBand;
  color: string;
  family: 'money' | 'ink';
  /** Thread stroke width (px). */
  threadW: number;
  /** Thread opacity at the dot end (faint). */
  threadOpacityDot: number;
  /** Thread opacity at the wall end (firm). Equals dot-end for the flat money register. */
  threadOpacityWall: number;
  /** FINAL wall-tab name — locked 2026-07-11 (wall-label session). Rendered uppercase. */
  labelPlaceholder: string;
  /** 2–3 word plain-language descriptor subline (Inter). */
  descriptor: string;
}

export const ACT3_BANDS: Record<MoneyBand, Act3BandSpec> = {
  TOP5:   { band: 'TOP5',   color: '#C8920A', family: 'money', threadW: 1.75, threadOpacityDot: 0.70, threadOpacityWall: 0.70, labelPlaceholder: 'Top 5 at position',   descriptor: 'top-5 money at his position' },
  TOP10:  { band: 'TOP10',  color: '#1D3E63', family: 'money', threadW: 1.5,  threadOpacityDot: 0.55, threadOpacityWall: 0.55, labelPlaceholder: 'Top 10 at position',  descriptor: 'top-10 money at his position' },
  MIDDLE: { band: 'MIDDLE', color: '#6FA8D8', family: 'money', threadW: 1.5,  threadOpacityDot: ACT3_MIDDLE_SKY_OPACITY, threadOpacityWall: ACT3_MIDDLE_SKY_OPACITY, labelPlaceholder: 'Middle class', descriptor: 'a middle-class deal' },
  MIN:    { band: 'MIN',    color: '#565E68', family: 'ink',   threadW: 1.1,  threadOpacityDot: 0.10, threadOpacityWall: 0.20, labelPlaceholder: 'Minimum',             descriptor: 'minimum-level money' },
  ZERO:   { band: 'ZERO',   color: '#7A828D', family: 'ink',   threadW: 1.1,  threadOpacityDot: 0.10, threadOpacityWall: 0.20, labelPlaceholder: 'Signed, $0 guaranteed', descriptor: 'signed, nothing guaranteed' },
  NEVER:  { band: 'NEVER',  color: '#99A1AA', family: 'ink',   threadW: 1.1,  threadOpacityDot: 0.10, threadOpacityWall: 0.20, labelPlaceholder: 'Never re-signed',     descriptor: 'no second contract' },
};

/**
 * Band names are FINAL (wall-label session 2026-07-11): top pair renamed to
 * self-ordering numeric forms (top-5/top-10 guarantee lines at position =
 * franchise/transition-tag logic); bottom four graduated as-is. Do not rename without a
 * new session lock.
 */
export const ACT3_BAND_LABELS_ARE_PLACEHOLDERS = true;

/** Pending-class band-1 label variant. A mid-window class's band 1 is "NOT RE-SIGNED
 *  YET" (dashed, running count, NO threads) — becomes NEVER's label + threads at
 *  graduation (Lambda pending rules). Only band 1 renames for pending. */
export const ACT3_PENDING_BAND1_LABEL = 'NOT RE-SIGNED YET';

// ── Right-rail edge tabs (BAND RENDERING (c)) ─────────────────────────────────

/** 3px bookmark bar in band color + Oswald small-caps name + Inter `n · %` line. */
export const ACT3_TAB_BAR_W = 3;
export const ACT3_TAB_DX    = 10;   // gap from node right edge to the tab bar
/** Lean-year collision rule: tabs keep ≥ this vertical pitch; when node centers are
 *  closer, the LABEL nudges outward with a hairline connector — the NODE never
 *  distorts ("position approximate, membership exact"). */
export const ACT3_TAB_MIN_PITCH = 32;

// ════════════════════════════════════════════════════════════════════════════
//  3. DOTS + THREADS
// ════════════════════════════════════════════════════════════════════════════

/** Dot radius + navy outline (choreography spec §3 rest values). Bumped 4.5 → 5.5
 *  (render-tune 2026-07-10, Derek): larger dots read better; strip/corner pack tighter
 *  (the message) but stay individually hoverable. */
export const ACT3_DOT_R = 5.5;
export const ACT3_DOT_STROKE_W = 1;
export const ACT3_DOT_STROKE = '#0B2239'; // navy outline

/** Thread cubic-bezier control points at 62% of the x-distance from dot toward the
 *  wall — identical curve family for all bands (choreography spec §2). */
export const ACT3_THREAD_CP_FRAC = 0.62;

// ════════════════════════════════════════════════════════════════════════════
//  4. ROUND GRIDLINES + FIELD FURNITURE (STRIPS & FIELD FURNITURE, banked)
// ════════════════════════════════════════════════════════════════════════════

/** Vertical hairline at each round's first pick — furniture, not data (Bartram–Stone
 *  floor). Straight verticals vs curved threads read as furniture. Per-class boundaries
 *  (comp picks shift them) — never faked to fixed 32s. */
export const ACT3_GRIDLINE_COLOR = 'rgba(11,34,57,0.10)';
export const ACT3_GRIDLINE_W = 1;

/** `R1`–`R7` labels below the axis, Inter. Pick numbers off the axis except 1 and 262
 *  (hover carries the exact pick). LABEL READABILITY PASS (§3g, 2026-07-10): stepped up
 *  one register — size 11→11.5, contrast 0.55→0.68 — still furniture (Bartram–Stone
 *  unobtrusive), just legible. ⚠ tune on the live wall before final. */
export const ACT3_RD_LABEL_COLOR = 'rgba(11,34,57,0.68)';
export const ACT3_RD_LABEL_SIZE = 12.5;
/** The two shown pick numbers (1 and 262) at the axis extremes. */
export const ACT3_AXIS_PICK_COLOR = 'rgba(11,34,57,0.68)';

/** Too-few-snaps strip fill — navy ~4.5% + dashed top hairline (the "couldn't stick"
 *  trapdoor grammar). Corner (UDFA × strip) = both fills continue → ~9%. */
export const ACT3_STRIP_FILL = 'rgba(11,34,57,0.045)';
export const ACT3_STRIP_DASH_COLOR = 'rgba(11,34,57,0.45)';
export const ACT3_STRIP_DASH = '4 3';
/** Corner overlay: a SECOND ~4.5% navy fill painted over the strip fill in the
 *  UDFA×strip cell so it renders ~9% ("both things true here" = sum of the parts). */
export const ACT3_CORNER_FILL = 'rgba(11,34,57,0.045)';

/** UDFA strip frame (dashed) + axis label `UNDRAFTED`. */
export const ACT3_UDFA_FRAME_COLOR = 'rgba(11,34,57,0.35)';
export const ACT3_UDFA_LABEL = 'UNDRAFTED';

/** Left edge-tab on the too-few-snaps strip: `TOO FEW SNAPS · n`. */
export const ACT3_STRIP_LABEL = 'TOO FEW SNAPS';

// ── Y-axis title (rotated, left edge) ─────────────────────────────────────────
/** Ports the resolved field's rotated left-axis treatment (Brief 2). */
export const ACT3_Y_AXIS_TITLE = 'USAGE';
export const ACT3_Y_AXIS_QUALIFIER = "share of position's snaps";

// ── Brand anchors (locked — do not alter) ─────────────────────────────────────
export const ACT3_FIELD_BG = '#F5F0E8'; // parchment (register continuity, Acts 1–2)
export const ACT3_NAVY = '#0B2239';

// ════════════════════════════════════════════════════════════════════════════
//  5. LENS (ghost + re-light) — parallels the jellyfish lens contract
// ════════════════════════════════════════════════════════════════════════════

/** Ghost floor for non-lit dots + threads under an active scope lens (mirrors the
 *  Acts 1/2 + jellyfish ghost so the whole product ghosts at one weight). At rest
 *  (no lens) NONE of this applies — the field renders byte-identical. */
export const ACT3_LENS_GHOST_OPACITY = 0.12;

// ════════════════════════════════════════════════════════════════════════════
//  6. BAND FOCUS — click a wall node to isolate one band (iterative-fixes #6)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tentacle-isolate (iterative-fixes cluster #6, reconciled to the six-band field):
 * clicking a wall node EMPHASIZES that band's dots + threads and dims the rest. This is
 * a pure VISUAL-EMPHASIS state — it is deliberately NOT the scope lens (`lensFilter`),
 * so it NEVER changes scoreboard counts or sidebar filters (the #6 architecture finding:
 * the lens's lit set feeds the scoreboard, so display emphasis must stay out of it). It
 * COMPOSES with the lens: scope decides what is lit/ghosted; band-focus emphasizes within
 * that. Non-focused, in-scope dots/threads dim to this floor; already-ghosted (out-of-
 * scope) marks stay ghosted (the lens wins). Sits a touch above the lens ghost so a
 * focused band reads as the subject without the rest disappearing.
 */
export const ACT3_FOCUS_DIM_OPACITY = 0.16;
