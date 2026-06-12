"use client";
/**
 * components/HeaderZone.tsx
 *
 * Navigation header — year scrubber (Row 1) + Journey Bar v3 (Row 2).
 * Sits above the chart frame in dm-main.
 *
 * Row 1: Year Scrubber — ticks per draft class, height encodes data availability.
 * Row 2: Journey Bar v3 — three beats (THE BOARD / DRAFT DAY / 4 YEARS LATER).
 *        The bar navigates; the chart speaks. No status line, no class badge.
 */

import { useEffect, useState } from "react";
import {
  getClassAvailability,
  TICK_HEIGHT,
  TICK_COLOR,
} from "@/lib/dataAvailability";
import JourneyBarV3 from "@/components/JourneyBarV3";

interface HeaderZoneProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears: number[];
  /** Active journey beat: 1 THE BOARD · 2 DRAFT DAY · 3 4 YEARS LATER. */
  activeBeat: 1 | 2 | 3;
  onSelectBeat: (beat: 1 | 2 | 3) => void;
}

// Detect mobile viewport inside the component
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export default function HeaderZone({
  selectedYear,
  onYearChange,
  availableYears,
  activeBeat,
  onSelectBeat,
}: HeaderZoneProps) {
  const isMobile = useIsMobile();

  // ── Year scrubber ────────────────────────────────────────────────────────────

  // Sort available years ascending for the scrubber display (left = oldest)
  const scrubberYears = [...availableYears].sort((a, b) => a - b);
  const selectedYearIdx = scrubberYears.indexOf(selectedYear);

  const handleYearClick = (year: number) => {
    onYearChange(year);
  };

  return (
    <div className="hz-root">
      {/* ── Row 1: Year Scrubber ───────────────────────────────────────── */}
      <div className="hz-scrubber-row">
        {!isMobile && (
          <span className="hz-draft-class-label">Draft Class</span>
        )}
        <div className="hz-scrubber-track-wrapper">
          {/* Baseline */}
          <div className="hz-scrubber-baseline" />
          {/* Filled (left-of-selected) */}
          {selectedYearIdx > 0 && (
            <div
              className="hz-scrubber-fill"
              style={{
                width: `${(selectedYearIdx / (scrubberYears.length - 1)) * 100}%`,
              }}
            />
          )}
          {/* Ticks */}
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
                  onClick={() => handleYearClick(year)}
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
                        state === "selected"
                          ? "0 0 6px rgba(255,255,255,0.35)"
                          : "none",
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

      {/* ── Row 2: Journey Bar v3 ──────────────────────────────────────── */}
      <JourneyBarV3 activeBeat={activeBeat} onSelectBeat={onSelectBeat} />
    </div>
  );
}
