"use client";
/**
 * components/TransportCluster.tsx
 *
 * Act 3 transport cluster (Epsilon 4 brief d, Part 3) — FOUR fixed slots, ALWAYS
 * present, IDENTICAL geometry every state. A button with no job is DISABLED IN PLACE
 * (ESPN reserved-slot rule), never null/removed — no layout shift.
 *
 *   Btn1 Play/Pause · Btn2 Skip · Btn3 Restart/Replay · | · speed dropdown
 *
 * Speed control (fix-pass §D): a compact DROPDOWN (reclaims the row width the inline
 * segmented control was bleeding over). It fixes BOTH original dropdown bugs — it opens
 * DOWNWARD (the original menu opened upward and clipped off the top edge) and it is
 * settable AT REST (enabled before the first play, not gated on isAnimating). Presets
 * are unchanged (SPEED_PRESETS); this is presentation only.
 *
 * ── Control → animation contract (ruling 1 — the seam Epsilon 5 plugs into) ──
 * This component owns NO animation logic. It only CALLS the handler props and READS
 * the flags. DraftChart owns the implementation: today onPlay maps to the 1→2 trigger
 * (Act 1) or the 2→3 jump-cut (Act 2). Epsilon 5 later swaps the jump-cut for its
 * staged pivot+sweep behind the SAME onPlay — this file is untouched. Keep it dumb.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SPEED_PRESETS, SKIP_PULSE_MS } from "@/lib/act3Constants";

// Speed is settable AT REST whenever play is available (Act 1 / Act 2). In the states
// with no replayable chapter (Act 3 rest, 2026 floor) the control quiets but HOLDS its
// geometry — disabled in place, never removed (reserved-region rule). The menu opens
// DOWNWARD (fix-pass §D — the original upward menu clipped off the header's top edge).

export interface TransportClusterProps {
  // ── Btn1 face (presentation, derived upstream) ──────────────────────────────
  /** Resting launch label, e.g. "PLAY DRAFT DAY" / "PLAY NEXT 4 YRS". Empty when disabled. */
  playLabel: string;
  /** Act-3 rest + 2026 floor disable Btn1 (no Act 4 / no chapter to launch). */
  playDisabled: boolean;
  /** While true, Btn1 shows the YouTube-style ❚❚ ⇄ ▶ toggle in place. */
  isAnimating: boolean;
  /** Toggle face while animating: paused → ▶ Play (resume); else → ❚❚ Pause. */
  paused: boolean;

  // ── Btn2 / Btn3 ─────────────────────────────────────────────────────────────
  canSkip: boolean;
  canRestart: boolean;
  /** "Restart" mid-animation · "Replay" at Act 2 rest. */
  restartLabel: string;

  // ── Btn4 ────────────────────────────────────────────────────────────────────
  speed: number;

  // ── Handlers (the contract) ─────────────────────────────────────────────────
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onRestart: () => void;
  onSpeedChange: (x: number) => void;

  /** Incrementing token — when it changes, Btn3 PULSES ONCE (accidental-skip recovery). */
  restartPulseKey: number;

  /**
   * (fix-pass-3 §3) Content seated to the RIGHT of the speed dropdown in the bottom row
   * — used to place ☆ MY TEAM beside speed (`1× ▾` | `☆ MY TEAM`). Optional; absent
   * leaves the speed dropdown alone on its row (unchanged geometry).
   */
  bottomTrailing?: ReactNode;
}

export default function TransportCluster({
  playLabel,
  playDisabled,
  isAnimating,
  paused,
  canSkip,
  canRestart,
  restartLabel,
  speed,
  onPlay,
  onPause,
  onResume,
  onSkip,
  onRestart,
  onSpeedChange,
  restartPulseKey,
  bottomTrailing,
}: TransportClusterProps) {
  const [pulsing, setPulsing] = useState(false);
  // Speed is settable at rest only when a chapter can play (Btn1 enabled or animating);
  // otherwise the dropdown stays present but disabled (holds geometry).
  const speedDisabled = playDisabled && !isAnimating;
  const prevPulseKey = useRef(restartPulseKey);

  // ── Speed dropdown (fix-pass §D) — opens DOWNWARD, settable at rest ────────────
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!speedOpen) return;
    const onDown = (e: MouseEvent) => {
      if (speedRef.current && !speedRef.current.contains(e.target as Node)) setSpeedOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSpeedOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [speedOpen]);
  // Never leave the menu open once the control disables (e.g. entering an Act-3 rest).
  useEffect(() => { if (speedDisabled) setSpeedOpen(false); }, [speedDisabled]);

  // Btn3 one-shot pulse after any skip (key changes; skip the initial mount value).
  useEffect(() => {
    if (restartPulseKey === prevPulseKey.current) return;
    prevPulseKey.current = restartPulseKey;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), SKIP_PULSE_MS);
    return () => clearTimeout(t);
  }, [restartPulseKey]);

  // ── Btn1 — three faces, icon+word always ─────────────────────────────────────
  let btn1Icon: string;
  let btn1Word: string;
  let btn1OnClick: () => void;
  let btn1Disabled: boolean;
  if (isAnimating) {
    if (paused) {
      btn1Icon = "▶"; btn1Word = "Play"; btn1OnClick = onResume; btn1Disabled = false;
    } else {
      btn1Icon = "❚❚"; btn1Word = "Pause"; btn1OnClick = onPause; btn1Disabled = false;
    }
  } else {
    btn1Icon = "▶"; btn1Word = playLabel || "Play"; btn1OnClick = onPlay; btn1Disabled = playDisabled;
  }

  return (
    <div className="sb-tc-root" role="group" aria-label="Animation transport">
      {/* Btn1 — Play / Pause */}
      <button
        type="button"
        className="sb-tc-btn sb-tc-btn--play"
        onClick={btn1OnClick}
        disabled={btn1Disabled}
        aria-label={isAnimating ? (paused ? "Resume" : "Pause") : (playLabel || "Play")}
      >
        <span className="sb-tc-icon" aria-hidden="true">{btn1Icon}</span>
        <span className="sb-tc-word">{btn1Word}</span>
      </button>

      {/* Btn2 + Btn3 — Skip / Restart as a HORIZONTAL pair (fix-pass-2 §2): transport
          has a strong horizontal convention, so a fully-vertical button column would
          read like a dropdown menu. The pair sits under the full-width PLAY. */}
      <div className="sb-tc-pair">
        <button
          type="button"
          className="sb-tc-btn"
          onClick={onSkip}
          disabled={!canSkip}
          aria-label="Skip to end"
        >
          <span className="sb-tc-icon" aria-hidden="true">⏭</span>
          <span className="sb-tc-word">Skip</span>
        </button>

        {/* Restart / Replay (pulses once after a skip) */}
        <button
          type="button"
          className={`sb-tc-btn${pulsing ? " sb-tc-btn--pulse" : ""}`}
          onClick={onRestart}
          disabled={!canRestart}
          aria-label={restartLabel}
        >
          <span className="sb-tc-icon" aria-hidden="true">↺</span>
          <span className="sb-tc-word">{restartLabel}</span>
        </button>
      </div>

      {/* Bottom row (fix-pass-3 §3) — speed dropdown | ☆ MY TEAM side by side. The speed
          dropdown is compact (reclaims row width), settable at rest, opens DOWNWARD
          (fix-pass §D); the trailing slot seats MY TEAM to its right. */}
      <div className="sb-tc-bottom">
        <div className="sb-tc-speed" ref={speedRef}>
          <button
            type="button"
            className="sb-tc-speed-trigger"
            disabled={speedDisabled}
            onClick={() => setSpeedOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={speedOpen}
            aria-label="Playback speed"
          >
            {speed}×<span className="sb-tc-caret" aria-hidden="true">▾</span>
          </button>
          {speedOpen && !speedDisabled && (
            <div className="sb-tc-speed-menu" role="listbox" aria-label="Playback speed">
              {SPEED_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={s === speed}
                  className={`sb-tc-speed-item${s === speed ? " sb-tc-speed-item--active" : ""}`}
                  onClick={() => { onSpeedChange(s); setSpeedOpen(false); }}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}
        </div>
        {bottomTrailing}
      </div>
    </div>
  );
}
