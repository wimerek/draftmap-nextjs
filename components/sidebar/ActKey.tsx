"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChartMode } from "@/lib/dataAvailability";
import { AwardGlyphMark } from "@/components/chart/AwardGlyphMark";

/**
 * ActKey — the act-aware legend ("Reads & Keys", Filter Pane Redesign Brief 2 → 2b).
 *
 * Presentation + copy only: reads the current act off `chartMode` and the existing
 * `showLines` flag. No data/scoring touch. Mirrors the scoreboard's when → what → do
 * shape with a 3-beat structure every act:
 *   1. orientation lead — what this act shows
 *   2. encoding rows — ONLY this act's keys, direct-label-first (skip anything
 *      the chart already labels)
 *   3. persistent footer — constant in every act (hover + click hint)
 *
 * Brief 2b refinements (Cowork review 2026-06-18): gold-ruled stacked header,
 * un-muted body with bolded terms, single-dot color sample, factual Act-2 copy with
 * a real Off/On movement-lines switch + cliffs-as-hint, and individually-listed
 * Act-3 honor glyphs. The chart's leader lines are recolored gold/sky to match the
 * key's ↑ Reaches / ↓ Steals (see PlayerDots.tsx).
 *
 * On act change the BODY cross-fades (opacity out → swap → in, non-translational);
 * prefers-reduced-motion snaps. Desktop only.
 */

type Act = 1 | 2 | 3;

// Canonical mapping — mirrors DraftChart's activeBeat derivation:
// projection → I, draft-results → II, everything else (player-production /
// career / verdict / pending / floor) → III.
function actFromMode(mode?: ChartMode): Act {
  if (mode === "projection") return 1;
  if (mode === "draft-results") return 2;
  return 3;
}

const ACT_NAME: Record<Act, string> = {
  1: "The Board",
  2: "Draft Day",
  3: "4 Years Later",
};

// ── Act-3 state (Brief 2 Item 1) ──────────────────────────────────────────────
// The Act-3 field renders one of three states (floor / pending / resolved). chartMode
// already carries that state 1:1 (DraftChart derives it via selectClassState):
//   'floor' → floor · 'pending' → pending · 'verdict' → resolved.
// So the key reads the state straight off chartMode — no need to thread players in.
type Act3State = "floor" | "pending" | "resolved";
function act3StateFromMode(mode?: ChartMode): Act3State {
  if (mode === "floor") return "floor";
  if (mode === "pending") return "pending";
  return "resolved"; // 'verdict' (and any default) → resolved
}

// LOCKED factual subheads (moved OFF the canvas — Brief 2 Item 1). The descriptive
// load lives here now; the on-canvas titles are short orienting labels only. No
// "— N players" count (the scoreboard already shows the class count).
const ACT3_SUBHEAD: Record<Act3State, string> = {
  floor:
    "Every pick starts at the draft-day floor. Vertical position rises as they take the field and earn snaps.",
  pending:
    "Vertical position shows usage: a player's share of the snaps at their position. It reflects how much their team played them compared to others at the same position.",
  // RE-POINTED (Lambda §3d-bis): the resolved field now shows usage on the Y-axis and the
  // second contract in COLOR — the old money-on-the-Y explanation is dead. Banked user
  // sentences (Y = usage over the first four seasons; color = guaranteed money vs the
  // best-paid at the position).
  resolved:
    "Vertical position shows how often he was on the field across his first four seasons, measured against others at his position. Color shows the second contract — how much guaranteed money he received, measured against the best-paid at his position.",
};

// (The fuller "What the tiers mean" definition block was removed in the Brief 2
// follow-up — the right-axis six-band wall tabs carry the money meaning now. The
// state-aware subhead + "Roughly two-thirds…" line stay.)

const FADE_MS = 190; // body cross-fade per leg — see .sb-key-body transition

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// ── Sample glyphs (legend-scale renders of the real chart marks) ────────────────

/** A real award glyph at legend scale — shapes imported from the field (never redrawn). */
function GlyphSample({ glyph }: { glyph: "star" | "sparkle" | "chevron" | "triangle" }) {
  return (
    <svg className="sb-key-glyph-svg" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <AwardGlyphMark glyph={glyph} cx={9} cy={9} r={9} />
    </svg>
  );
}

/** Neutral-grey paired dots — small + large — for the Act-2 surprise-size key. */
function SizeSample() {
  return (
    <svg className="sb-key-sample-svg" viewBox="0 0 34 18" width="34" height="18" aria-hidden="true">
      <circle cx="7"  cy="9" r="3.5" fill="#9CA3AF" stroke="#555" strokeWidth="1" />
      <circle cx="24" cy="9" r="7"   fill="#9CA3AF" stroke="#555" strokeWidth="1" />
    </svg>
  );
}

/** Two threads pulling rightward — the Act-3 threads key. */
function ThreadSample() {
  return (
    <svg className="sb-key-sample-svg" viewBox="0 0 34 18" width="34" height="18" aria-hidden="true">
      <path d="M2 4 C 12 4, 18 13, 32 13" fill="none" stroke="#D4A017" strokeWidth="1.4" opacity="0.85" />
      <path d="M2 14 C 12 14, 18 6, 32 6" fill="none" stroke="#5B7FB0" strokeWidth="1.4" opacity="0.75" />
    </svg>
  );
}

// ── Row primitive ───────────────────────────────────────────────────────────

function KeyRow({ sample, children }: { sample: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sb-key-row">
      <span className="sb-key-sample">{sample}</span>
      <span className="sb-key-text">{children}</span>
    </div>
  );
}

// ── Per-act bodies (LOCKED wordings — Brief 2b §"Per-act content") ───────────────

function Act1Body() {
  return (
    <>
      <p className="sb-key-lead">
        Each dot is a draft prospect, placed by where the consensus projects they&rsquo;ll be
        drafted, with round 1 at the top.
      </p>
      <KeyRow sample={<span className="sb-key-swatch sb-key-swatch--dot" />}>
        <span className="sb-key-term">Color</span>: their college&rsquo;s team colors.
      </KeyRow>
    </>
  );
}

function Act2Body({
  showLines, onShowLinesToggle,
}: { showLines: boolean; onShowLinesToggle: () => void }) {
  return (
    <>
      <p className="sb-key-lead">
        The actual draft: where teams picked each player.
      </p>
      <KeyRow sample={<span className="sb-key-swatch sb-key-swatch--dot" />}>
        <span className="sb-key-term">Color</span>: their drafting team&rsquo;s colors.
      </KeyRow>
      <KeyRow sample={<SizeSample />}>
        <span className="sb-key-term">Size</span>: the gap between a player&rsquo;s consensus
        ranking and his actual pick.
      </KeyRow>
      {/* Lines explainer — colored text only; the inline ↑↓ arrows carry direction, so
          no arrow sample. reach = sky, steal = gold (matches the chart's leader lines). */}
      <p className="sb-key-reachsteal">
        <span className="sb-key-reach">&uarr; Reaches</span>
        {" · "}
        <span className="sb-key-steal">&darr; Steals</span>
        {": where the pick diverged from the consensus."}
      </p>
      {/* Movement-lines toggle — a real Off/On switch (gold track + sliding knob),
          reusing showLines / onShowLinesToggle. */}
      <button
        type="button"
        className="sb-key-switch"
        onClick={onShowLinesToggle}
        role="switch"
        aria-checked={showLines}
        title={showLines ? "Hide movement lines" : "Show movement lines"}
      >
        <span className="sb-key-switch-label">Movement lines</span>
        <span className={`sb-key-switch-track${showLines ? " on" : ""}`} aria-hidden="true">
          <span className="sb-key-switch-knob" />
        </span>
        <span className="sb-key-switch-state">{showLines ? "On" : "Off"}</span>
      </button>
      {/* Cliffs — reframed from an encoding row to an observational hint (no sample). */}
      <div className="sb-key-hintblock">
        <span className="sb-key-term">Hint</span>: gaps between groups of picks mark where
        teams saw value drop off.
      </div>
    </>
  );
}

function Act3Body({ state }: { state: Act3State }) {
  return (
    <>
      {/* State subhead (Brief 2 Item 1) — factual, moved off the canvas; sits ABOVE the
          resolved-framing "Roughly two-thirds…" line. */}
      <p className="sb-key-lead">{ACT3_SUBHEAD[state]}</p>
      <p className="sb-key-lead">
        Roughly two-thirds of a draft class never earn a second contract with substantial
        guarantees.
      </p>
      {/* Dot-color doctrine (§1): Act-3 color follows the story step. On the RESOLVED
          field the dot wears the team that PAID the second contract; before that (floor /
          pending) it still wears the drafting team. */}
      <KeyRow sample={<span className="sb-key-swatch sb-key-swatch--dot" />}>
        <span className="sb-key-term">Color</span>:{" "}
        {state === "resolved"
          ? "the team that paid the player's second contract."
          : "the team that drafted them."}
      </KeyRow>
      {/* Top honor — ranked; only the single highest a player reached is shown. Each
          honor listed individually with its REAL glyph (imported from the field). */}
      <p className="sb-key-sublead">Top honor earned (highest shown)</p>
      <KeyRow sample={<GlyphSample glyph="star" />}>
        <span className="sb-key-term">All-Pro</span>
      </KeyRow>
      <KeyRow sample={<GlyphSample glyph="sparkle" />}>
        <span className="sb-key-term">Pro Bowl</span>
      </KeyRow>
      <KeyRow sample={<GlyphSample glyph="chevron" />}>
        <span className="sb-key-term">All-Rookie</span>
      </KeyRow>
      {/* ST role marker — the triangle, SEPARATE from the honors hierarchy (not an honor).
          §3e verbatim sentence. */}
      <KeyRow sample={<GlyphSample glyph="triangle" />}>
        A triangle marks players who earned their snaps mostly on special teams.
      </KeyRow>
      {/* Threads — each dot's line runs to the money band its second contract reached
          (the wall at the right groups the bands). */}
      <KeyRow sample={<ThreadSample />}>
        <span className="sb-key-term">Threads</span>: connect each player to the
        second-contract money band he reached.
      </KeyRow>
      <p className="sb-key-threadlink">
        <Link href="/about" className="sb-key-explainer-link">
          Why the market is the measure &rarr;
        </Link>
      </p>
    </>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function ActKey({
  chartMode, showLines, onShowLinesToggle,
}: {
  chartMode?: ChartMode;
  showLines: boolean;
  onShowLinesToggle: () => void;
}) {
  const act = actFromMode(chartMode);
  const act3State = act3StateFromMode(chartMode);
  const reduced = usePrefersReducedMotion();

  // Cross-fade: `shown` is the act currently painted; it lags `act` by one fade-out
  // leg so the body can opacity-out, swap, then opacity-in. Reduced motion → snap.
  const [shown, setShown] = useState<Act>(act);
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (act === shown) return;
    if (reduced) { setShown(act); setVisible(true); return; }
    setVisible(false); // fade the old body out
    timer.current = setTimeout(() => {
      setShown(act);   // swap content while invisible
      setVisible(true); // fade the new body in
    }, FADE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [act, shown, reduced]);

  return (
    <section className="sb-key" aria-label="Map key">
      {/* Stacked, gold-ruled header: gold top rule → gold act eyebrow → title. */}
      <div className="sb-key-header">
        <span className="sb-key-eyebrow">{ACT_NAME[shown]}</span>
        <span className="sb-key-title">Reads &amp; Keys</span>
      </div>
      <div className={`sb-key-body${visible ? "" : " sb-key-body--hidden"}`}>
        {shown === 1 && <Act1Body />}
        {shown === 2 && <Act2Body showLines={showLines} onShowLinesToggle={onShowLinesToggle} />}
        {shown === 3 && <Act3Body state={act3State} />}
      </div>
      {/* Persistent footer — constant in every act (outside the cross-fade). */}
      <p className="sb-key-hint">Hover a dot for a quick look &middot; click for the full card.</p>
    </section>
  );
}
