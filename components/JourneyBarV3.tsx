"use client";
/**
 * components/JourneyBarV3.tsx
 *
 * The three-beat journey bar (Act structure v3). Replaces the old multi-step
 * journey bar in HeaderZone Row 2.
 *
 *   I   THE BOARD        — Where experts ranked them
 *   II  DRAFT DAY        — Where teams picked them
 *   III 4 YEARS LATER    — What the league decided
 *
 * "The bar navigates, the chart speaks": no status line, no class badge (the
 * Row-1 scrubber already shows the class). One component, identical every class;
 * only the active beat varies. Beat click = instant view switch upstream.
 *
 * Layout = a spine-anchored absolute model (not flex columns). Each disc is
 * pinned to its center % on the spine line; its label hangs at a CONSTANT offset
 * below. Disc/label centers never depend on the disc's own size, so nothing
 * drifts horizontally or vertically as the active beat grows/shrinks across acts.
 *
 * Motion is "felt, not seen": on act change the lit spine glides to the new
 * beat and the destination disc eases its size + fill up — no traveling dot, no
 * glow/echo, nothing moving at rest. All magnitudes are knobs below (E4 doctrine).
 */

import type { CSSProperties } from "react";

export interface JourneyBarV3Props {
  /** 1, 2, or 3 — which beat is currently active. */
  activeBeat: 1 | 2 | 3;
  onSelectBeat: (beat: 1 | 2 | 3) => void;
}

const BEATS: Array<{ n: 1 | 2 | 3; roman: string; title: string; teach: string }> = [
  { n: 1, roman: "I",   title: "THE BOARD",     teach: "Where the consensus ranked them" },
  { n: 2, roman: "II",  title: "DRAFT DAY",     teach: "Where teams drafted them" },
  { n: 3, roman: "III", title: "4 YEARS LATER", teach: "What became of them" },
];

// ── Knobs (E4 doctrine — tune on the real render, no hunting) ───────────────
const DISC_ACTIVE         = 32;    // px — active beat diameter
const DISC_INACTIVE       = 26;    // px — the other beats (isolation rides the RATIO, not absolute size)
const SPINE_INSET         = 13;    // % — left/right inset = first/last disc centers + the bar's side margins
const SPINE_LIT_OPACITY   = 0.8;   // ★ THE VOLUME KNOB — lit-spine brightness
const SPINE_TRACK_OPACITY = 0.15;  // faint unlit track behind the lit segment
const SPINE_EASE_MS       = 360;   // lit-spine glide to the active beat on act change
const DISC_EASE_MS        = 220;   // disc size + fill settle (no overshoot)

/** Center of a beat as a % of the track width. */
function centerPct(n: 1 | 2 | 3): number {
  return n === 1 ? SPINE_INSET : n === 2 ? 50 : 100 - SPINE_INSET;
}

export default function JourneyBarV3({ activeBeat, onSelectBeat }: JourneyBarV3Props) {
  // Lit spine: from the first disc's center to the active disc's center. Act I → 0
  // (the active disc itself marks the start); II → 50−inset; III → 100−2·inset.
  const litWidthPct = centerPct(activeBeat) - SPINE_INSET;

  const rootStyle = {
    "--jbv3-disc-active": `${DISC_ACTIVE}px`,
    "--jbv3-disc-inactive": `${DISC_INACTIVE}px`,
    "--jbv3-inset": `${SPINE_INSET}%`,
    "--jbv3-lit-opacity": SPINE_LIT_OPACITY,
    "--jbv3-track-opacity": SPINE_TRACK_OPACITY,
    "--jbv3-spine-ease": `${SPINE_EASE_MS}ms`,
    "--jbv3-disc-ease": `${DISC_EASE_MS}ms`,
    "--jbv3-lit-width": `${litWidthPct}%`,
  } as CSSProperties;

  return (
    <div className="jbv3-root" role="tablist" aria-label="Draft journey" style={rootStyle}>
      <div className="jbv3-track">
        {/* Spine: a faint full-width track + a gold lit segment that glides on act change. */}
        <div className="jbv3-spine-track" aria-hidden="true" />
        <div className="jbv3-spine-lit" aria-hidden="true" />

        {BEATS.map((b) => {
          const isActive = b.n === activeBeat;
          return (
            <button
              key={b.n}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "step" : undefined}
              className={`jbv3-beat${isActive ? " jbv3-beat--active" : ""}`}
              style={{ left: `${centerPct(b.n)}%` }}
              onClick={() => onSelectBeat(b.n)}
            >
              <span
                className={`jbv3-disc${isActive ? " jbv3-disc--active" : ""}`}
                aria-hidden="true"
              >
                {b.roman}
              </span>
              <span className="jbv3-beat-text">
                <span className="jbv3-beat-title">{b.title}</span>
                <span className="jbv3-beat-teach">{b.teach}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
