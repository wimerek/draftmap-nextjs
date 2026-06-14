"use client";
/**
 * components/TransportCluster.tsx
 *
 * Act 3 transport cluster (Epsilon 4 brief d, Part 3) — FOUR fixed slots, ALWAYS
 * present, IDENTICAL geometry every state. A button with no job is DISABLED IN PLACE
 * (ESPN reserved-slot rule), never null/removed — no layout shift.
 *
 *   Btn1 Play/Pause · Btn2 Skip · Btn3 Restart/Replay · Btn4 Speed (5 presets)
 *
 * ── Control → animation contract (ruling 1 — the seam Epsilon 5 plugs into) ──
 * This component owns NO animation logic. It only CALLS the handler props and READS
 * the flags. DraftChart owns the implementation: today onPlay maps to the 1→2 trigger
 * (Act 1) or the 2→3 jump-cut (Act 2). Epsilon 5 later swaps the jump-cut for its
 * staged pivot+sweep behind the SAME onPlay — this file is untouched. Keep it dumb.
 */

import { useEffect, useRef, useState } from "react";
import { SPEED_PRESETS, SKIP_PULSE_MS } from "@/lib/act3Constants";

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
}: TransportClusterProps) {
  const [speedOpen, setSpeedOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const prevPulseKey = useRef(restartPulseKey);

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

      {/* Btn2 — Skip */}
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

      {/* Btn3 — Restart / Replay (pulses once after a skip) */}
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

      {/* Btn4 — Speed (5 presets; pre-set at rest, holds geometry) */}
      <div className="sb-tc-speed">
        <button
          type="button"
          className="sb-tc-btn sb-tc-btn--speed"
          onClick={() => setSpeedOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={speedOpen}
          aria-label={`Playback speed ${speed}×`}
        >
          <span className="sb-tc-word">{speed}×</span>
          <span className="sb-tc-caret" aria-hidden="true">▾</span>
        </button>
        {speedOpen && (
          <div className="sb-tc-speed-menu" role="menu">
            {SPEED_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitemradio"
                aria-checked={s === speed}
                className={`sb-tc-speed-item${s === speed ? " sb-tc-speed-item--active" : ""}`}
                onClick={() => { onSpeedChange(s); setSpeedOpen(false); }}
              >
                {s}×
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
