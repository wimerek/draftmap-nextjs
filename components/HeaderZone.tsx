"use client";
/**
 * components/HeaderZone.tsx
 *
 * Delta-2 navigation header — year scrubber + journey bar + play button.
 * Sits above the chart frame in dm-main.
 *
 * Row 1: Year Scrubber — 11 ticks (2016-2026), tick height encodes data availability.
 * Row 2: Journey Bar   — circles for each step in the selected class's journey.
 *         Play button advances steps at 1.5s intervals (controlled via isPlaying/onPlayToggle).
 */

import { useMemo, useEffect, useRef, useState } from "react";
import {
  getClassAvailability,
  getJourneySteps,
  TICK_HEIGHT,
  TICK_COLOR,
} from "@/lib/dataAvailability";

interface HeaderZoneProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  currentStepId: string;
  onStepChange: (stepId: string) => void;
  availableYears: number[];
  isPlaying: boolean;
  onPlayToggle: () => void;
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
  currentStepId,
  onStepChange,
  availableYears,
  isPlaying,
  onPlayToggle,
}: HeaderZoneProps) {
  const isMobile = useIsMobile();
  const steps = useMemo(() => getJourneySteps(selectedYear), [selectedYear]);
  const currentStepIdx = steps.findIndex(s => s.id === currentStepId);
  const activeIdx = currentStepIdx >= 0 ? currentStepIdx : 0;

  // ── Year scrubber ────────────────────────────────────────────────────────────

  // Sort available years ascending for the scrubber display (left = oldest)
  const scrubberYears = useMemo(
    () => [...availableYears].sort((a, b) => a - b),
    [availableYears],
  );

  const selectedYearIdx = scrubberYears.indexOf(selectedYear);

  const handleYearClick = (year: number) => {
    onYearChange(year);
    onStepChange("projection");
  };

  // ── Career circle gold styling ──────────────────────────────────────────────

  function getCircleStyle(stepIdx: number) {
    const step = steps[stepIdx];
    const isActive = stepIdx === activeIdx;
    const isDone   = stepIdx < activeIdx;
    const isCareer = step?.id === "career";

    if (isCareer) {
      if (isActive) return {
        background: "#f59e0b",
        border: "2px solid #f59e0b",
        boxShadow: "0 0 0 4px rgba(245,158,11,0.22)",
      };
      if (isDone) return { background: "#f59e0b", border: "2px solid #f59e0b" };
      return { background: "rgba(245,158,11,0.12)", border: "2px solid rgba(245,158,11,0.45)" };
    }

    if (isActive) return {
      background: "#ffffff",
      border: "2px solid rgba(255,255,255,0.9)",
      boxShadow: "0 0 0 3.5px rgba(255,255,255,0.13)",
    };
    if (isDone) return {
      background: "rgba(255,255,255,0.5)",
      border: "2px solid rgba(255,255,255,0.5)",
    };
    return { background: "transparent", border: "2px solid rgba(255,255,255,0.30)" };
  }

  function getLabelStyle(stepIdx: number) {
    const isActive = stepIdx === activeIdx;
    const isDone   = stepIdx < activeIdx;
    return {
      color: isActive ? "rgba(255,255,255,0.95)"
           : isDone   ? "rgba(255,255,255,0.45)"
           :             "rgba(255,255,255,0.25)",
      fontWeight: isActive ? 600 : 400,
    };
  }

  // Career circle is larger
  function getCircleSize(step: { id: string }) {
    return step.id === "career"
      ? (isMobile ? 16 : 18)
      : (isMobile ? 11 : 13);
  }

  // Number of visible labels on mobile (avoid overlap at 7+ steps)
  function shouldShowLabel(stepIdx: number): boolean {
    if (!isMobile) return true;
    const step = steps[stepIdx];
    if (!step) return false;
    // Always show first, last, and active step labels
    if (stepIdx === 0 || stepIdx === steps.length - 1 || stepIdx === activeIdx) return true;
    // When 7+ steps on mobile, hide intermediate production-season labels
    if (steps.length >= 7 && step.mode === "player-production") return false;
    return true;
  }

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

      {/* ── Row 2: Journey Bar + Play Button ──────────────────────────── */}
      <div className="hz-journey-row">
        <div className="hz-journey-container">
          {/* Steps */}
          <div className="hz-journey-steps">
            {steps.map((step, i) => {
              const size = getCircleSize(step);
              return (
                <div key={step.id} className="hz-journey-step">
                  <button
                    className="hz-circle-btn"
                    style={{
                      width: size,
                      height: size,
                      borderRadius: "50%",
                      flexShrink: 0,
                      ...getCircleStyle(i),
                    }}
                    onClick={() => {
                      onStepChange(step.id);
                      if (isPlaying) onPlayToggle();
                    }}
                    aria-label={`Go to ${step.label}`}
                    aria-current={i === activeIdx ? "step" : undefined}
                  />
                  {shouldShowLabel(i) && (
                    <span
                      className="hz-step-label"
                      style={getLabelStyle(i)}
                    >
                      {isMobile ? step.shortLabel : step.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Play button */}
        <button
          className={`hz-play-btn${isPlaying ? " hz-play-btn--playing" : ""}`}
          onClick={onPlayToggle}
          aria-label={isPlaying ? "Pause" : "Play through journey"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
      </div>
    </div>
  );
}
