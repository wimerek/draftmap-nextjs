"use client";
/**
 * lib/useFirstSessionHints.ts
 *
 * First-session navigation hints — the contingent pulse layer (build brief, 2026-06-25).
 *
 * Cold visitors land on Act 1 and don't advance through the acts. This controller draws
 * the eye to the "advance to the next act" control and, once the user reaches Act 3,
 * nudges exploration — WITHOUT an onboarding wall, looping motion, or new chrome.
 *
 * Research basis (locked): unsolicited REPEATING motion causes banner-blindness/annoyance,
 * so every hint here is single-target, contingent, and stops the moment its action is
 * taken. The doctrine, enforced below:
 *   - At most ONE element pulses at any time (act-gated: advance pulse in Act 1/2,
 *     explore nudge in Act 3 — they can never overlap).
 *   - Contingent stop: an act the user has advanced FROM never pulses again this session
 *     (tracked via the session-high `maxAct`). The explore nudge is one-shot.
 *   - Suppressed while engaged: no pulse while a transition is in flight, a dot is hovered,
 *     or a card/tooltip is open (`engaged`).
 *   - Cadence: fire once after a short orienting delay (~3.5s, so the chart is seen first),
 *     then re-fire every ~20s while the action stays pending. The Act-3 explore nudge waits
 *     ~12s of idle before its first fire and gives at most a few breaths.
 *   - prefers-reduced-motion → no pulses (analytics still fire — they seed the funnel).
 *   - No localStorage gating: runs every session (locked 2026-06-04). Stop-on-use keeps it
 *     unobtrusive for repeat visitors — a returning user advances immediately and it never
 *     re-fires.
 *
 * The hook owns NO DOM. It bumps caller-provided emitters (`onPulsePlay` / `onPulseYear`)
 * which key-bump the dumb presentational buttons (TransportCluster / ClassSwitcher),
 * mirroring the existing `restartPulseKey` / `chipPulse` precedents. Desktop only — the
 * caller gates `enabled` on `!isMobile`.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import posthog, { POSTHOG_KEY } from "@/lib/posthog";
import { VERDICT_RESOLVED_THROUGH } from "@/lib/verdict";

// ── Timings (ms) ────────────────────────────────────────────────────────────────
const ORIENT_DELAY = 3500;     // see the chart before the first advance pulse
const ADVANCE_CADENCE = 20000; // re-fire the advance pulse while still pending
const EXPLORE_IDLE = 12000;    // Act-3 idle before the first explore nudge
const EXPLORE_CADENCE = 20000; // spacing between explore breaths
const EXPLORE_MAX_BREATHS = 3; // one-shot: at most this many year-switcher breaths
const HINT_CLICK_WINDOW = 25000; // a click this soon after a pulse counts as hint_clicked
const TICK_MS = 1000;

// Tunable (brief): pulse the Act-2 advance button even after the user already advanced
// from Act 1 (i.e. has demonstrably learned the gesture). Default true = pulse on both;
// flip to false if testing shows the Act-2 pulse reads as redundant.
const PULSE_ON_ACT2 = true;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// PostHog is best-effort: no-ops when the key is unset (not a new hard dependency), and
// any capture failure is swallowed so a hint never breaks the page.
function capture(event: string, props?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* analytics is best-effort */
  }
}

export interface FirstSessionHintsArgs {
  /** Run the controller at all (desktop + chart visible). */
  enabled: boolean;
  /** Current act: 1 THE BOARD · 2 DRAFT DAY · 3 4 YEARS LATER. */
  act: 1 | 2 | 3;
  /** Current draft class year — threaded into the activation-funnel analytics. */
  year: number;
  /** A transition is in flight — suppresses every pulse. */
  isAnimating: boolean;
  /** The user is actively interacting (dot hovered / card / tooltip open). Suppresses pulses. */
  engaged: boolean;
  /** Bump the play-next-act button's pulse (TransportCluster `playPulseKey`). */
  onPulsePlay: () => void;
  /** Bump the year switcher's pulse (ClassSwitcher `pulseKey`). */
  onPulseYear: () => void;
}

/** Year move detail for the `class_switched` event (from → to draft class). */
export interface ClassSwitchDetail {
  from: number;
  to: number;
}

export interface FirstSessionHints {
  /**
   * The caller calls this from the real control handlers so the funnel can record that
   * the hinted action was taken. 'play' = advanced an act; 'year' = switched class.
   * For 'year', pass the {from, to} class years so the move is legible in analytics.
   */
  recordInteraction: (target: "play" | "year", detail?: ClassSwitchDetail) => void;
}

export function useFirstSessionHints(args: FirstSessionHintsArgs): FirstSessionHints {
  const { enabled, act, year, isAnimating, engaged, onPulsePlay, onPulseYear } = args;

  // Mirror live inputs into refs so the interval + listeners read fresh values without
  // re-subscribing on every render (the loop is installed once on mount).
  const enabledRef = useRef(enabled);
  const actRef = useRef(act);
  const yearRef = useRef(year);
  const animRef = useRef(isAnimating);
  const engagedRef = useRef(engaged);
  const pulsePlayRef = useRef(onPulsePlay);
  const pulseYearRef = useRef(onPulseYear);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { actRef.current = act; }, [act]);
  useEffect(() => { yearRef.current = year; }, [year]);
  useEffect(() => { animRef.current = isAnimating; }, [isAnimating]);
  useEffect(() => { engagedRef.current = engaged; }, [engaged]);
  useEffect(() => { pulsePlayRef.current = onPulsePlay; }, [onPulsePlay]);
  useEffect(() => { pulseYearRef.current = onPulseYear; }, [onPulseYear]);

  // prefers-reduced-motion, kept live (matches the Scoreboard / RoundTierSankey pattern).
  const reducedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = mq.matches;
    const onChange = () => { reducedRef.current = mq.matches; };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── Per-session memory (no persistence — the locked no-localStorage-intro decision) ──
  const sess = useRef({
    maxAct: 1 as 1 | 2 | 3,      // session-high act; acts below it are "advanced from"
    advancedFromAct1: false,     // for the PULSE_ON_ACT2 tunable
    enteredAt: 0,                // when the current act became the frontier
    lastAdvancePulseAt: 0,
    exploreBreaths: 0,
    exploreDone: false,
    lastExplorePulseAt: 0,
    lastActivityAt: 0,
    lastPlayHintAt: 0,           // for hint_clicked attribution
    lastYearHintAt: 0,
  });

  const recordInteraction = useCallback((target: "play" | "year", detail?: ClassSwitchDetail) => {
    const s = sess.current;
    const t = nowMs();
    if (target === "play") {
      if (s.lastPlayHintAt && t - s.lastPlayHintAt < HINT_CLICK_WINDOW) {
        capture("hint_clicked", { target: "play", act: s.maxAct });
      }
      s.lastPlayHintAt = 0;
    } else {
      capture("class_switched", detail ? { from: detail.from, to: detail.to } : {});
      if (s.lastYearHintAt && t - s.lastYearHintAt < HINT_CLICK_WINDOW) {
        capture("hint_clicked", { target: "year" });
      }
      s.lastYearHintAt = 0;
    }
  }, []);

  // ── The controller loop — installed once; reads everything from refs ───────────────
  useEffect(() => {
    const s = sess.current;
    let prevAct = actRef.current;
    let prevEnabled = false;

    const onActivity = () => { s.lastActivityAt = nowMs(); };
    const events: Array<keyof WindowEventMap> = ["pointermove", "click", "wheel", "keydown"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const id = window.setInterval(() => {
      const enabledNow = enabledRef.current;
      if (!enabledNow) { prevEnabled = false; return; }

      const t = nowMs();
      // Becoming enabled (chart just appeared) starts the orienting clock here, not at
      // mount — so a slow data load still lets the user see the chart before any nudge.
      if (!prevEnabled) {
        prevEnabled = true;
        s.enteredAt = t;
        s.lastAdvancePulseAt = 0;
        s.lastActivityAt = t;
        prevAct = actRef.current;
      }

      const curAct = actRef.current;

      // Frontier tracking + analytics — motion-independent (reduced motion must not
      // starve the activation funnel the brief wants for the default-class A/B).
      if (curAct > s.maxAct) {
        if (s.maxAct === 1) s.advancedFromAct1 = true;
        s.maxAct = curAct;
        const curYear = yearRef.current;
        capture("act_reached", {
          act: curAct,
          year: curYear,
          // Single source of truth for verdict maturity (lib/verdict.ts).
          resolved: curYear <= VERDICT_RESOLVED_THROUGH,
        });
      }
      if (curAct !== prevAct) {
        prevAct = curAct;
        s.enteredAt = t;        // new frontier act → restart the orienting delay
        s.lastAdvancePulseAt = 0;
      }

      // Pulses are the only thing reduced motion disables.
      if (reducedRef.current) return;

      // Engaged = active interaction OR a transition in flight → suppress (resume when idle).
      const engagedNow = engagedRef.current || animRef.current;
      if (engagedNow) return;

      // ── Advance pulse (Act 1 & 2) — pending only at the frontier, pre-Act-3 ──────────
      const advancePending = curAct === s.maxAct && curAct < 3;
      const act2Allowed = curAct !== 2 || PULSE_ON_ACT2 || !s.advancedFromAct1;
      if (advancePending && act2Allowed) {
        const sinceEnter = t - s.enteredAt;
        const sinceLast = s.lastAdvancePulseAt ? t - s.lastAdvancePulseAt : Infinity;
        if (sinceEnter >= ORIENT_DELAY && sinceLast >= ADVANCE_CADENCE) {
          s.lastAdvancePulseAt = t;
          s.lastPlayHintAt = t;
          pulsePlayRef.current();
          capture("hint_shown", { target: "play", act: curAct });
        }
        return; // never also run the explore branch this tick (one pulse at a time)
      }

      // ── Act-3 explore nudge (year switcher) — one-shot, idle-gated ───────────────────
      if (curAct === 3 && !s.exploreDone) {
        const idle = t - s.lastActivityAt;
        const sinceLastExplore = s.lastExplorePulseAt ? t - s.lastExplorePulseAt : Infinity;
        const firstReady = s.exploreBreaths === 0 && idle >= EXPLORE_IDLE;
        const nextReady =
          s.exploreBreaths > 0 && sinceLastExplore >= EXPLORE_CADENCE && idle >= 2000;
        if (firstReady || nextReady) {
          s.exploreBreaths += 1;
          s.lastExplorePulseAt = t;
          s.lastYearHintAt = t;
          pulseYearRef.current();
          capture("hint_shown", { target: "year" });
          if (s.exploreBreaths >= EXPLORE_MAX_BREATHS) s.exploreDone = true;
        }
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
    // Installed once — all live values are read through refs above.
  }, []);

  // Stable handle (recordInteraction is itself stable) so the caller's handlers that
  // depend on it don't churn identity every render.
  return useMemo(() => ({ recordInteraction }), [recordInteraction]);
}
