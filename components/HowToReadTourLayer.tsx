"use client";
/**
 * components/HowToReadTourLayer.tsx
 *
 * The "How to read" tour's screen-space overlay (build brief v2, 2026-07-24 §5/§7/§10.3):
 *   1. the FLOATING PAGED CARD — beat label, centered caption, page dots, Back/Next/Exit,
 *      and (once Beat 3's reveal settles) the handoff CTA in place of the control row, and
 *   2. a gold TETHER from the card to the thing the caption names, plus a glow RING on it.
 *
 * v2 deltas vs the v1 prototype:
 *   - The caption lives HERE, not in the scoreboard's STORY column. It is centered and sized
 *     UP: this is sought-out copy, so it has to be legible (§5).
 *   - The tether originates from the CARD (nearest edge-center), not a region edge, and
 *     PERSISTS for the beat at a softer opacity instead of auto-vanishing (§7 / G5).
 *   - Page dots are built to extend when the Phase-2 UI-orientation pages land (§11).
 *
 * v2.1 deltas (addendum §A/§B):
 *   - LINE PER SENTENCE. The caption arrives as `lines` and each sentence renders as its own
 *     block at ~15.5px, not as wrapped prose. That fills the card honestly (the v2 box read
 *     empty around small run-together text) and makes Act 3 re-readable.
 *   - FOUR page dots, because Act 3 is now two pages (usage, then money).
 *
 * Presentational + measurement only — no tour state. DraftChart owns the state machine and
 * feeds the tether target in FIELD SVG-space (x/y + the field's viewBox dims). This layer
 * converts that to screen coords against the live rect of the rendered chart SVG
 * (getBoundingClientRect), re-measuring every frame while a target exists so it stays
 * anchored through residual motion, scroll, and resize (a viewport-forgiving approximate
 * line, NOT SVG coords that scale with the viewBox).
 */
import { useEffect, useRef, useState } from "react";
import { TOUR_PAGE_COUNT, type TourBeat, type TourCaption, type TourHandoff } from "@/lib/useHowToReadTour";

/** Tether/ring target in the chart SVG's own coordinate space (null = no tether this beat). */
export interface TourTarget {
  x: number;
  y: number;
  /** The field SVG's viewBox width/height, for scaling SVG-space → the rendered box. */
  svgW: number;
  svgH: number;
}

interface Props {
  beat: TourBeat;
  caption: TourCaption | null;
  /** Bumps once per beat entry — replays the card's one-shot conductor breath. */
  breathKey: number;
  /** Tether/ring target (null on beats with no tether, and during a beat's motion). */
  target: TourTarget | null;
  /** The last beat's reveal settled → the control row yields to the handoff CTA (§10.7). */
  handoffReady: boolean;
  handoff: TourHandoff;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
  onHandoff: () => void;
}

interface ScreenLine {
  x1: number; y1: number; // card anchor (nearest edge-center)
  x2: number; y2: number; // target dot, in screen coords
}

export default function HowToReadTourLayer({
  beat, caption, breathKey, target, handoffReady, handoff,
  onBack, onNext, onExit, onHandoff,
}: Props) {
  const [line, setLine] = useState<ScreenLine | null>(null);
  // G5: the tether settles from full to a softer opacity ~1s after it appears and then
  // PERSISTS until the beat advances. `settled` drives that second opacity step only.
  const [settled, setSettled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!target) { setSettled(false); return; }
    setSettled(false);
    const t = window.setTimeout(() => setSettled(true), 1000);
    return () => window.clearTimeout(t);
  }, [target]);

  // Measurement loop — runs only while a target exists. Reads the rendered chart SVG + the
  // card's rect each frame and projects the SVG-space point into screen coords. The card
  // anchor is its BOTTOM-center, or its TOP-center when the target sits above the card, so
  // the tether always reads as a connector instead of crossing the card it starts from.
  useEffect(() => {
    if (!target) { setLine(null); return; }
    const measure = () => {
      const svg = document.querySelector(".dm-chart-frame svg") as SVGSVGElement | null;
      const card = cardRef.current;
      if (svg && card && target.svgW > 0 && target.svgH > 0) {
        const s = svg.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        // width=100% + height:auto preserves the viewBox aspect, so a single linear scale
        // maps SVG-space → the rendered box for both axes.
        const x2 = s.left + (target.x / target.svgW) * s.width;
        const y2 = s.top + (target.y / target.svgH) * s.height;
        const x1 = c.left + c.width * 0.5;
        const y1 = y2 < c.top ? c.top : c.bottom;
        setLine({ x1, y1, x2, y2 });
      }
      rafRef.current = requestAnimationFrame(measure);
    };
    // Measure ONCE synchronously so the tether appears with the beat rather than waiting on a
    // frame (rAF is throttled to nothing in a background tab), then keep the loop running to
    // re-anchor through residual motion, scroll, and resize.
    measure();
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  // Focus the card's primary control on open so keyboard users land inside the tour.
  useEffect(() => {
    const id = requestAnimationFrame(() => primaryRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      {/* Tether + ring — fixed, full-viewport, non-interactive. */}
      <svg className="dm-tether-overlay" aria-hidden="true">
        {line && (
          <>
            <line
              className={`dm-tether-line${settled ? " is-settled" : ""}`}
              x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            />
            <circle className="dm-tether-end" cx={line.x1} cy={line.y1} r={2.5} />
            <circle className="dm-glow-ring" cx={line.x2} cy={line.y2} r={11} fill="none" />
          </>
        )}
      </svg>

      {/* ── The floating paged card (§5) — prominent but subordinate to the chart: a card,
             NOT a modal (no scrim). Seated low so it never covers the subject (G7). ── */}
      <div className="htr-card" role="group" aria-label="How to read">
        {/* Keyed remount replays the one-shot conductor breath + caption cross-fade per beat. */}
        <div key={breathKey} ref={cardRef} className="htr-card-inner htr-card--breathe">
          {caption && (
            <>
              <div className="sb-statelabel htr-card-label sb-x-fade">{caption.label}</div>
              {/* §A2: one sentence per line (block), never wrapped prose. A long sentence
                  still soft-wraps inside its own line — the break is per SENTENCE. */}
              <p className="htr-card-body sb-x-fade">
                {caption.lines.map((line, i) => (
                  <span key={i} className="htr-card-line">{line}</span>
                ))}
              </p>
              {/* READY: the handoff line joins the beat's own sentence rather than erasing it,
                  so the Act-3 lesson is still on screen when the invitation arrives. */}
              {handoffReady && (
                <p className="htr-card-body htr-card-body--handoff sb-x-fade">{handoff.body}</p>
              )}
            </>
          )}

          {/* FOUR dots (§B): Beat 1 · Beat 2 · Act-3 usage · Act-3 money. The journey bar
              still shows three acts; only the card pages split. */}
          <div className="htr-card-pages" aria-hidden="true">
            {Array.from({ length: TOUR_PAGE_COUNT }, (_, i) => i + 1).map((n) => (
              <span
                key={n}
                className={`htr-card-dot${beat >= n ? " is-filled" : ""}${beat === n ? " is-current" : ""}`}
              />
            ))}
          </div>

          <div className="htr-card-controls">
            {handoffReady ? (
              /* §10.7: reaching the end of the money page IS the finish — the CTA arrives in
                 place, no dead "Next" that only swaps a box. */
              <button
                ref={primaryRef}
                type="button"
                className="sb-tc-btn sb-tc-btn--play htr-card-handoff"
                onClick={onHandoff}
              >
                {handoff.cta}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="htr-card-btn htr-card-btn--ghost"
                  onClick={onBack}
                  disabled={beat <= 1}
                >
                  Back
                </button>
                {beat < TOUR_PAGE_COUNT && (
                  <button
                    ref={primaryRef}
                    type="button"
                    className="htr-card-btn htr-card-btn--primary"
                    onClick={onNext}
                  >
                    Next
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className="htr-card-btn htr-card-btn--exit"
              onClick={onExit}
              aria-label="Exit how to read"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
