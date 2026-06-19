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
        Each dot is a draft prospect, ranked by where analysts project they&rsquo;ll be
        drafted &mdash; round 1 at the top.
      </p>
      <KeyRow sample={<span className="sb-key-swatch sb-key-swatch--dot" />}>
        <span className="sb-key-term">Color</span> &mdash; their college&rsquo;s team colors.
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
        The actual draft &mdash; where teams picked each player.
      </p>
      <KeyRow sample={<span className="sb-key-swatch sb-key-swatch--dot" />}>
        <span className="sb-key-term">Color</span> &mdash; their drafting team&rsquo;s colors.
      </KeyRow>
      <KeyRow sample={<SizeSample />}>
        <span className="sb-key-term">Size</span> &mdash; the difference between where a player
        was ranked and picked.
      </KeyRow>
      {/* Lines explainer — colored text only; the inline ↑↓ arrows carry direction, so
          no arrow sample. reach = sky, steal = gold (matches the chart's leader lines). */}
      <p className="sb-key-reachsteal">
        <span className="sb-key-reach">&uarr; Reaches</span>
        {" · "}
        <span className="sb-key-steal">&darr; Steals</span>
        {" — consensus ranking vs. actual pick."}
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
        <span className="sb-key-term">Hint</span> &mdash; gaps between groups of picks mark where
        NFL teams saw value drop off.
      </div>
    </>
  );
}

function Act3Body() {
  return (
    <>
      <p className="sb-key-lead">
        Roughly two-thirds of a draft class never earn a second contract with substantial
        guarantees.
      </p>
      <KeyRow sample={<span className="sb-key-swatch sb-key-swatch--dot" />}>
        <span className="sb-key-term">Color</span> &mdash; their NFL team now.
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
      {/* ST role marker — the triangle, SEPARATE from the honors hierarchy (not an honor). */}
      <KeyRow sample={<GlyphSample glyph="triangle" />}>
        Played more special-teams snaps than offense/defense.
      </KeyRow>
      {/* Threads — hover-to-EXPLAIN progressive disclosure (panel-only, NOT a chart lens). */}
      <div className="sb-key-threads" tabIndex={0}>
        <div className="sb-key-row">
          <span className="sb-key-sample"><ThreadSample /></span>
          <span className="sb-key-text">
            <span className="sb-key-term">Threads</span> &mdash; group players by the contract
            they earned.
          </span>
        </div>
        <div className="sb-key-explainer">
          <p>
            Each thread pulls a player from where they were drafted to the second-contract
            tier they reached &mdash; Premium, Solid, Bridge, Prove It, or None &mdash; by
            guaranteed money against their position&rsquo;s market.
          </p>
          <Link href="/about" className="sb-key-explainer-link">
            Why the market is the measure &rarr;
          </Link>
        </div>
      </div>
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
        {shown === 3 && <Act3Body />}
      </div>
      {/* Persistent footer — constant in every act (outside the cross-fade). */}
      <p className="sb-key-hint">Hover a dot for a quick look &middot; click for the full card.</p>
    </section>
  );
}
