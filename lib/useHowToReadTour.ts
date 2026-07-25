"use client";
/**
 * lib/useHowToReadTour.ts
 *
 * The "How to read" read-along tour — the PULL counterpart to the shipped idle autoplay
 * (build brief v2, 2026-07-24). A manual, opt-in guided read that teaches a first-timer how
 * to read the chart in three beats = the three acts, then hands off to the live broadcast.
 *
 * This hook is the explicit STATE MACHINE (an `open` flag + a beat index) and the CONDUCTOR
 * copy source. It owns NO DOM and no animation: mirroring useFirstSessionHints, it holds
 * state + derived render outputs + best-effort analytics, and invokes caller-provided
 * callbacks at each transition. DraftChart (the host) performs the engine work behind those
 * callbacks — the fade-through reset, the ~720ms hold, the tour's OWN calm glides to the
 * layout's real target positions, the tether/highlight, and focus movement.
 *
 * v2 deltas vs the v1 prototype:
 *   - Beat 4 (a separate READY page) is GONE. Reaching the end of the last beat's reveal IS
 *     the finish: the host calls `setHandoffReady(true)` and the card's control row yields to
 *     the "▶ Watch the full story unfold from the beginning" button in place (§5, §10.7).
 *   - `openTour(entryBeat)` — context-aware entry (§2): the tour opens on the beat matching
 *     the act the user is currently viewing, never forcing an Act-2/3 reader back to Act 1.
 *   - The caption is consumed by the floating paged card, NOT injected into the scoreboard.
 *
 * v2.1 delta (addendum §B) — ACT 3 IS TWO STEPS. Usage and threads arriving together was too
 * much to receive at once, so Act 3 splits into two CARD PAGES under one journey-bar beat:
 * beat 3 glides the dots to their usage heights and HOLDS for a real user Next (no auto
 * advance), and beat 4 draws the threads in to the six money bands. The journey bar still
 * shows three acts (III stays lit for both); the card's page dots go to FOUR. The old
 * "anticlimactic Next" concern is answered because the Next now BRINGS THE THREADS IN.
 *
 * Beat model (4 card pages over 3 acts, no "beat 0"):
 *   0  closed
 *   1  THE BOARD      — chart literacy; tether → an example dot
 *   2  DRAFT DAY      — one calm projected→drafted glide; tether → the hero steal-dot
 *   3  4 YEARS LATER  — usage glide, then HOLD (dots at their usage heights, no threads)
 *   4  4 YEARS LATER  — threads draw in to the six money bands; handoff surfaces at the end
 *
 * Reduced motion: the hook is motion-agnostic — it still steps through every beat; the host's
 * engine callbacks hard-cut and the caption/ring/tether still teach.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import posthog, { POSTHOG_KEY } from "@/lib/posthog";

/** 0 closed · 1–4 the card pages (3 and 4 are both Act 3 — see the beat model above). */
export type TourBeat = 0 | 1 | 2 | 3 | 4;
/** The four teachable card pages (a live beat index). */
export type LiveBeat = 1 | 2 | 3 | 4;
/** Which journey-bar disc a card page lights — Act 3's two pages share disc III. */
export type BarBeat = 1 | 2 | 3;

/** Total card pages — the page-dot count and the ceiling `next()` walks to. */
export const TOUR_PAGE_COUNT = 4;

/**
 * Verbatim tour caption for a live beat. `lines` is ONE SENTENCE PER ENTRY (addendum §A2):
 * the card renders each on its own line rather than as wrapped prose, so the concise
 * statements stay scannable and the box is filled honestly. Split here, not in the view, so
 * the sentence boundaries are authored rather than guessed by a regex.
 */
export interface TourCaption {
  label: string;
  lines: string[];
}

/** The handoff copy + CTA, shown in place on the card once Beat 3's reveal settles. */
export interface TourHandoff {
  body: string;
  cta: string;
}

// PostHog is best-effort — no-op without a key, and any failure is swallowed so the tour
// can never break the page (local copy of the useFirstSessionHints.ts doctrine).
function capture(event: string, props?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* analytics is best-effort */
  }
}

export interface HowToReadTourArgs {
  /**
   * The class the tour's copy templates `{year}` to. The host resolves this: acts 1–2 teach
   * in place on the CURRENT class; only a pending-class Act 3 borrows the resolved default
   * landing class (§2 / §10.9).
   */
  year: number;
  /** Tour is opening on `entryBeat`: cancel any in-flight transition + pending autoplay. */
  onOpen: (entryBeat: LiveBeat) => void;
  /**
   * A beat became active. The host runs the beat's teaching motion: fade-through reset to
   * the beat's pre-state, ~720ms hold, then the calm glide. `prev` gives the direction.
   */
  onBeat: (beat: LiveBeat, prev: TourBeat) => void;
  /** Tour is closing from `fromBeat`: restore the live act, clear overlays, return focus. */
  onClose: (fromBeat: TourBeat) => void;
  /** Handoff fired: close the tour and start the LIVE Play (the full authored broadcast). */
  onHandoffPlay: () => void;
}

export interface HowToReadTour {
  open: boolean;
  beat: TourBeat;
  /** Bumps once per beat entry — the card takes a one-shot dm-hint-breath from it. */
  breathKey: number;
  /** The caption rendered by the floating paged card (null when closed). */
  caption: TourCaption | null;
  /** Beat 3's reveal has settled → the card swaps its control row for the handoff CTA. */
  handoffReady: boolean;
  /** Handoff copy + button label (verbatim §3); rendered once handoffReady. */
  handoff: TourHandoff;
  /** Which journey-bar disc lights while the tour drives it (Act 3's two pages both → III). */
  activeBeatForBar: BarBeat;
  /** Open on a specific beat (context-aware entry §2). */
  openTour: (entryBeat: LiveBeat) => void;
  next: () => void;
  back: () => void;
  goto: (n: LiveBeat) => void;
  close: () => void;
  /** The handoff button's action ("▶ Watch the full story unfold"). */
  handoffPlay: () => void;
  /** Host → hook: the last beat's reveal finished (or was reset). */
  setHandoffReady: (ready: boolean) => void;
}

export function useHowToReadTour(args: HowToReadTourArgs): HowToReadTour {
  const { year, onOpen, onBeat, onClose, onHandoffPlay } = args;

  const [beat, setBeat] = useState<TourBeat>(0);
  const [breathKey, setBreathKey] = useState(0);
  const [handoffReady, setHandoffReadyState] = useState(false);

  // Live callbacks via refs so the imperative handle stays identity-stable (its consumers —
  // the header control, the card — don't churn when a callback closure changes).
  const onOpenRef = useRef(onOpen);
  const onBeatRef = useRef(onBeat);
  const onCloseRef = useRef(onClose);
  const onHandoffRef = useRef(onHandoffPlay);
  onOpenRef.current = onOpen;
  onBeatRef.current = onBeat;
  onCloseRef.current = onClose;
  onHandoffRef.current = onHandoffPlay;

  const beatRef = useRef<TourBeat>(0);
  beatRef.current = beat;

  // Guarded setter: the host flips this from an effect, so it must no-op when unchanged.
  const setHandoffReady = useCallback((ready: boolean) => {
    setHandoffReadyState(prev => (prev === ready ? prev : ready));
  }, []);

  // Move to a new beat: update state (caption + breath) then fire the host's engine work.
  // G3: entering a beat ALWAYS replays its reveal, even if that act's end-state is already
  // on screen — the motion is the lesson — so a re-entry of the same beat is honored.
  const enter = useCallback((to: LiveBeat) => {
    const prev = beatRef.current;
    beatRef.current = to;
    setBeat(to);
    setBreathKey(k => k + 1);
    setHandoffReadyState(false); // any beat entry retires a surfaced handoff
    capture("tour_beat", { n: to, year });
    onBeatRef.current(to, prev);
  }, [year]);

  const openTour = useCallback((entryBeat: LiveBeat) => {
    if (beatRef.current !== 0) return; // already open
    capture("tour_opened", { year, entryBeat });
    onOpenRef.current(entryBeat); // host: cancel in-flight motion + pending autoplay
    enter(entryBeat);
  }, [enter, year]);

  const close = useCallback(() => {
    const from = beatRef.current;
    if (from === 0) return;
    capture("tour_exited", { beat: from });
    beatRef.current = 0;
    setBeat(0);
    setHandoffReadyState(false);
    onCloseRef.current(from); // host: restore the live act, clear overlays, return focus
  }, []);

  const handoffPlay = useCallback(() => {
    capture("tour_completed", { year });
    beatRef.current = 0;
    setBeat(0);
    setHandoffReadyState(false);
    onHandoffRef.current(); // host: close overlays + start the LIVE play
  }, [year]);

  const next = useCallback(() => {
    const cur = beatRef.current;
    // Beat 4 is the end — the handoff CTA replaces Next there. Beat 3 → 4 is a REAL user
    // step (§B): it holds at the usage heights until the user asks for the threads.
    if (cur === 0 || cur >= TOUR_PAGE_COUNT) return;
    enter((cur + 1) as LiveBeat);
  }, [enter]);

  const back = useCallback(() => {
    const cur = beatRef.current;
    if (cur <= 1) return; // Beat 1 is the floor; Esc / Exit leaves
    enter((cur - 1) as LiveBeat);
  }, [enter]);

  const goto = useCallback((n: LiveBeat) => {
    if (beatRef.current === 0) return;
    enter(n);
  }, [enter]);

  // Verbatim copy (v2.2 addendum §B/§C — supersedes all prior copy) — LOCKED strings,
  // `{year}`-templated, one sentence per array entry. No em dashes; "threads" is mandatory on
  // the money page; the retired Act-3 metaphor vocabulary is forbidden.
  //
  // Both Act-3 pages carry the beat label "4 YEARS LATER" and NEITHER caption repeats it: the
  // label and the journey bar own the time stamp, so 3b opens "This is when…" (v2.2 §C dropped
  // the redundant "Four years later," opener the v2.1 copy carried).
  //
  // Two lines are the tracked dot's teach (§A): Beat 2's color line is demonstrated by the
  // tracked dot visibly recoloring college→NFL as it falls, and 3b's closing line names the
  // paying team whose color the same dot now wears — the arc closing on one face.
  const caption = useMemo<TourCaption | null>(() => {
    switch (beat) {
      case 1:
        return {
          label: "THE BOARD",
          lines: [
            "Each dot is one college player eligible for the NFL draft.",
            "Columns are position groups.",
            "A dot's height is where the consensus projects he'll be drafted.",
          ],
        };
      case 2:
        return {
          label: "DRAFT DAY",
          lines: [
            `This is the ${year} NFL Draft.`,
            "The dots move to where teams actually picked them, pick by pick, round by round.",
            "As they're drafted, their dot color changes from their college colors to their new NFL team.",
            "This player lasted well past his consensus rank: a steal.",
          ],
        };
      case 3: // 3a — usage. No threads on screen yet; this page teaches the vertical only.
        return {
          label: "4 YEARS LATER",
          lines: [
            "First, playing time.",
            "A dot's height is how much the coaching staff played him over his first four seasons, compared to others at his position.",
          ],
        };
      case 4: // 3b — money. The Next that reached this page is what draws the threads in.
        return {
          label: "4 YEARS LATER",
          lines: [
            "This is when each player becomes eligible for a second contract.",
            "The market pays the best players the highest guarantees: the truest measure of their worth to the teams with money and jobs on the line.",
            "Threads connect every player to one of six bands, by the guarantees he earned.",
            "The player dot now marks the team that paid him.",
          ],
        };
      default:
        return null;
    }
  }, [beat, year]);

  // "from the beginning" is load-bearing: it sets the expectation for the landing pause the
  // host holds before the broadcast starts (§D).
  const handoff = useMemo<TourHandoff>(() => ({
    body: `It takes four years to tell the whole story, so we begin with ${year}: the newest class that's finished it.`,
    cta: "▶ Watch the full story unfold from the beginning",
  }), [year]);

  // Journey-bar lighting is DRIVEN by the tour (not derived from chartMode) while open, so
  // the bar lights beat N during the speak+hold BEFORE the motion answers. Beats 3 and 4 are
  // one act: disc III stays lit across both Act-3 pages (§B).
  const activeBeatForBar: BarBeat = beat === 2 ? 2 : beat >= 3 ? 3 : 1;

  return useMemo(
    () => ({
      open: beat !== 0,
      beat,
      breathKey,
      caption,
      handoffReady,
      handoff,
      activeBeatForBar,
      openTour,
      next,
      back,
      goto,
      close,
      handoffPlay,
      setHandoffReady,
    }),
    [beat, breathKey, caption, handoffReady, handoff, activeBeatForBar, openTour, next, back,
     goto, close, handoffPlay, setHandoffReady],
  );
}
