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
 */

import { useEffect, useState } from "react";

export interface JourneyBarV3Props {
  /** 1, 2, or 3 — which beat is currently active. */
  activeBeat: 1 | 2 | 3;
  onSelectBeat: (beat: 1 | 2 | 3) => void;
}

const BEATS: Array<{ n: 1 | 2 | 3; roman: string; title: string; teach: string }> = [
  { n: 1, roman: "I",   title: "THE BOARD",     teach: "Where experts ranked them" },
  { n: 2, roman: "II",  title: "DRAFT DAY",     teach: "Where teams picked them" },
  { n: 3, roman: "III", title: "4 YEARS LATER", teach: "What the league decided" },
];

const DISC = 30; // px

export default function JourneyBarV3({ activeBeat, onSelectBeat }: JourneyBarV3Props) {
  // Single non-looping load pulse on the active disc (once on mount).
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="jbv3-root" role="tablist" aria-label="Draft journey">
      {/* Spine — parchment→gold gradient; rendered behind discs, never through them. */}
      <div className="jbv3-spine" aria-hidden="true" />

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
            onClick={() => onSelectBeat(b.n)}
          >
            <span
              className={`jbv3-disc${isActive ? " jbv3-disc--active" : ""}${isActive && pulse ? " jbv3-disc--pulse" : ""}`}
              style={{ width: DISC, height: DISC }}
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
  );
}
