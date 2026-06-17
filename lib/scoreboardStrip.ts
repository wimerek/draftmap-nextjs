/**
 * lib/scoreboardStrip.ts
 *
 * Render knobs for the scoreboard proportion-strip family (Post-E4 polish —
 * scoreboard-redesign brief §4). ONE place; every value is a locked working default —
 * TUNE ON THE REAL (Brave) RENDER (E4 knobs doctrine: one place, not one moment).
 *
 * Strip grammar: ONE horizontal segmented part-to-whole strip, repeated across acts —
 *   Act 2 (draft day):  diverging [ steals · on-target · reaches ]   total = drafted
 *   Act 3 (verdict):    five-tier  [ PREMIUM·SOLID·BRIDGE·PROVE_IT·NONE ]  total = N
 *   Act 3 (pending):    two-part   [ still in league · couldn't stick ]   total = N
 *   Act 1 + 2026 floor: NO strip (no natural part-to-whole).
 * It is NOT a trend sparkline — nothing trends; it's part-to-whole (the visual rhyme
 * that ties the three-act journey together).
 *
 * Palette note: these segments sit on the NAVY instrument panel, NOT the parchment
 * field, so colors are picked to READ ON NAVY (the locked Act-3 field tokens — SOLID
 * navy #1D3E63, Role grey #6B7280 — would vanish or read dark here). Family intent is
 * preserved: warm = paid/steal, cool grey = unpaid/on-target. The Act-2 leader-line
 * tints in PlayerDots.tsx are the DESATURATED cousins of STEAL/REACH below — one
 * family across the strip and the chart.
 */

import type { ContractTier } from './verdict';

// ── Act 2 — draft-day diverging strip [ steals · on-target · reaches ] ──────────
// Locked CVD-safe palette (warm / neutral / cool). steals = brand gold, on-target =
// Role grey (lightened for navy), reaches = Solid indigo (lightened for navy).
export const STRIP_STEAL_COLOR    = '#D4A017'; // gold (brand) — tune on real render
export const STRIP_ONTARGET_COLOR = '#9AA1AB'; // post-pass: lifted from #8A93A6 — the darker grey sank into navy (brief §E) — tune on real render
export const STRIP_REACH_COLOR    = '#6FA8D8'; // post-pass: was indigo #6E7FC4 → BRIDGE sky #6FA8D8, an OWNED Act-3 color so the strip family shares one palette across acts (brief §E) — tune on real render

// ── Act 3 — five-tier verdict strip (RESOLVED only) ─────────────────────────────
// Warm for the paid tiers (PREMIUM/SOLID/BRIDGE), cool greys for PROVE_IT/NONE — a
// stepped warm→cool ramp so the tiers read as texture beneath the bright paid-line.
// Echoes the wall's silhouette (reinforcing, not redundant). Lightened vs the
// parchment-field TIER_THREAD_COLOR so the ramp reads on navy.
export const STRIP_TIER_COLOR: Record<ContractTier, string> = {
  PREMIUM:  '#E6B22E', // gold, brightest (top of market)
  SOLID:    '#C8922B', // warm amber between gold PREMIUM and bronze BRIDGE — keeps the warm paid-tier
                       // ramp intact on the strip. ⚠ STRIP-ONLY tone: the jellyfish field/wall SOLID
                       // stays TIER_THREAD_COLOR.SOLID #1D3E63 (navy, on parchment — reads fine there).
  BRIDGE:   '#A8742E', // deeper warm (still paid)
  PROVE_IT: '#6B7682', // cool grey
  NONE:     '#4C5662', // darkest cool grey (the wash-out mass)
}; // all — tune on real render

// ── Pending — two-part strip [ still in league · couldn't stick ] ───────────────
// NOT the resolved tier strip: verdicts aren't resolved for pending classes (build-
// pass clarification B). Neutral pair — quiet warm for still-in, grey for couldn't.
export const STRIP_STILL_COLOR   = '#B98B3E'; // quiet warm (still in the league) — tune on real render
export const STRIP_COULDNT_COLOR = '#566069'; // grey (couldn't stick) — tune on real render

// ── Strip chrome ────────────────────────────────────────────────────────────────
/** The bright paid-vs-not boundary — the DOMINANT mark of the Act-3 strip (the one
 *  fact: paid or not). Parchment over the warm/grey tiers. */
export const STRIP_PAID_LINE_COLOR = '#F5F0E8'; // parchment — tune on real render
export const STRIP_PAID_LINE_W     = 2;         // px (the dominant mark) — tune on real render
export const STRIP_HEIGHT          = 8;         // px — word-sized strip — tune on real render
export const STRIP_RADIUS          = 2;         // px corner radius — tune on real render

/** Act-2 internal boundary ticks (brief §F) — a light-grey tick at each internal
 *  boundary (steals|on-target and on-target|reaches), bracketing the on-target middle,
 *  so Act 2 gets the crisp instrument-edge Act 3 has from its paid-line. Kept a notch
 *  BELOW the brightness of Act-3's white paid-line (which stays the singular hero mark);
 *  these are the quieter siblings. Full strip height. Act-2 ONLY (gated by a prop). */
export const STRIP_BOUNDARY_TICK_COLOR = 'rgba(245,240,232,0.65)'; // ~parchment 0.65 — tune on real render
export const STRIP_BOUNDARY_TICK_W     = 2;                        // px — tune on real render
