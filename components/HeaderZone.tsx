"use client";
/**
 * components/HeaderZone.tsx
 *
 * Navigation header. Two tiers, viewport-split:
 *
 *   DESKTOP (≥768px): a SINGLE band — [ Journey Bar v3 … Scoreboard ]. Class
 *     switching lives in the scoreboard scope label (◀▶ + dropdown). The Row-1
 *     scrubber is CSS-hidden here.
 *
 *   MOBILE (<768px): the scoreboard slot is desktop chrome and hides; class switching
 *     stays on the Row-1 year scrubber (retained so mobile keeps year switching —
 *     brief d mobile fallback, Derek-approved 2026-06-13). The Beta mobile-header
 *     redesign owns any further mobile changes.
 *
 * Player search (fix-pass-3 §2) lives INSIDE the scoreboard identity column now (passed
 * via scoreboard.searchSlot), not the header top-right corner — that corner is now free.
 *
 * The bar navigates; the chart + scoreboard speak.
 */

import {
  getClassAvailability,
  TICK_HEIGHT,
  TICK_COLOR,
} from "@/lib/dataAvailability";
import JourneyBarV3 from "@/components/JourneyBarV3";
import Scoreboard, { type ScoreboardProps } from "@/components/Scoreboard";

interface HeaderZoneProps {
  /** Active journey beat: 1 THE BOARD · 2 DRAFT DAY · 3 4 YEARS LATER. */
  activeBeat: 1 | 2 | 3;
  onSelectBeat: (beat: 1 | 2 | 3) => void;
  /** Everything the persistent scoreboard slot needs (class switcher + re-homed search). */
  scoreboard: ScoreboardProps;
  /** Open the "How to read" read-along tour (build brief 2026-07-24). HeaderZone stays
   *  presentational — it only surfaces the entry control; all tour logic lives upstream. */
  onOpenTour: () => void;
}

export default function HeaderZone({ activeBeat, onSelectBeat, scoreboard, onOpenTour }: HeaderZoneProps) {
  // The scrubber drives the SAME year state the scoreboard switcher does (mobile fallback).
  const { selectedYear, onYearChange, availableYears } = scoreboard;
  const scrubberYears = [...availableYears].sort((a, b) => a - b);
  const selectedYearIdx = scrubberYears.indexOf(selectedYear);

  return (
    <div className="hz-root hz-root--single">
      {/* Row 1: mobile-only year scrubber (CSS-hidden ≥768px; desktop uses the scoreboard switcher). */}
      <div className="hz-scrubber-row hz-scrubber-row--mobile">
        <div className="hz-scrubber-track-wrapper">
          <div className="hz-scrubber-baseline" />
          {selectedYearIdx > 0 && (
            <div
              className="hz-scrubber-fill"
              style={{ width: `${(selectedYearIdx / (scrubberYears.length - 1)) * 100}%` }}
            />
          )}
          <div className="hz-scrubber-ticks">
            {scrubberYears.map((year) => {
              const { tier } = getClassAvailability(year);
              const state =
                year === selectedYear ? "selected"
                : year < selectedYear ? "past"
                : "future";
              return (
                <button
                  key={year}
                  className="hz-tick-btn"
                  onClick={() => onYearChange(year)}
                  aria-label={`Select ${year} draft class`}
                  aria-pressed={year === selectedYear}
                >
                  <div
                    className="hz-tick-bar"
                    style={{
                      height: TICK_HEIGHT[tier],
                      width: state === "selected" ? 2.5 : 2,
                      background:
                        state === "selected" ? "#ffffff"
                        : state === "past"   ? "rgba(255,255,255,0.28)"
                        :                      TICK_COLOR[tier],
                      boxShadow:
                        state === "selected" ? "0 0 6px rgba(255,255,255,0.35)" : "none",
                    }}
                  />
                  <span
                    className="hz-tick-label"
                    style={{
                      color:
                        state === "selected"
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.25)",
                    }}
                  >
                    &apos;{String(year).slice(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Single band: scoreboard slot then journey bar (scoreboard moved LEFT, brief §1 —
          its border flips left→right so the divider sits between it and the bar). The
          scoreboard hides <768px; the bar takes the full width on mobile. */}
      <div className="hz-band">
        <Scoreboard {...scoreboard} />
        <JourneyBarV3 activeBeat={activeBeat} onSelectBeat={onSelectBeat} />
        {/* "How to read" — the quiet PULL-help entry (build brief 2026-07-24, §4/§5.1).
            Third child of hz-band, subordinate to the journey bar (muted parchment + a
            1px gold underline, no pill/glyph, no rest pulse). Desktop chrome (hidden with
            the scoreboard <768px via .hz-htr CSS). */}
        <div className="hz-htr">
          <button type="button" className="hz-htr-btn" onClick={onOpenTour}>
            How to read
          </button>
        </div>
      </div>
    </div>
  );
}
