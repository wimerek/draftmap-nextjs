"use client";
/**
 * components/Scoreboard.tsx
 *
 * The persistent scoreboard slot (Epsilon 4 brief d, Part 2). ONE fixed slot in the
 * header band, to the RIGHT of the journey bar. IDENTICAL geometry every view-state
 * (routing-card / Google-card pattern — a moving caption breaks spatial memory). The
 * ROLE/COPY changes per view-state; the slot never moves and never blanks.
 *
 * The bar navigates; the chart speaks — and at rest the scoreboard is the ONLY
 * speaking slot, so the wash-out story ("most never get paid") gets told even when
 * no one is hovering.
 *
 * Counts are CLASS-SCOPE (ruling 2): computeScoreboardStats receives the FULL class
 * set, never the sidebar-filtered set. brief f swaps in scope-filtered + ghosted data
 * behind the SAME function — display toggles never feed it (see scoreboardStats.ts).
 *
 * DEFERRED to brief f (commented only, NOT built here): the lens nameplate extension
 * (scope dims `2018 · SEA · WR` + the × exit), chart ghosting, scope recompute, your-
 * team pin, player search. The 2→3 sweep animation is Epsilon 5.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Player } from "@/lib/sheets";
import type { ChartMode } from "@/lib/dataAvailability";
import { resolveTeamColors, resolveTeamName } from "@/lib/chartConstants";
import { computeScoreboardStats, teamCodeFromFullName } from "@/lib/scoreboardStats";
import {
  STRIP_STEAL_COLOR,
  STRIP_ONTARGET_COLOR,
  STRIP_REACH_COLOR,
  STRIP_STILL_COLOR,
  STRIP_COULDNT_COLOR,
  STRIP_HEIGHT,
  STRIP_RADIUS,
  STRIP_PAID_LINE_COLOR,
  STRIP_PAID_LINE_W,
  STRIP_BOUNDARY_TICK_COLOR,
  STRIP_BOUNDARY_TICK_W,
} from "@/lib/scoreboardStrip";
import { ACT3_BANDS } from "@/lib/act3FieldConstants";
import type { MoneyBand } from "@/lib/verdict";
import type { Act3Sweep } from "@/lib/choreography";
import {
  sampleTicker,
  type OneToTwoChoreography,
} from "@/lib/oneToTwoChoreography";
import TransportCluster from "@/components/TransportCluster";
import TeamChip from "@/components/TeamChip";

const DENOM_TOOLTIP =
  "= everyone drafted from this class, plus undrafted players who logged an NFL snap.";
// Phase Lambda: the six-band money field plots a slightly different population — every
// player at a position with a second-contract market (kickers/punters/long-snappers,
// who have no money market, are set aside). Its denominator gets its own explainer.
const MONEY_DENOM_TOOLTIP =
  "= everyone drafted or signed from this class at a position with a second-contract market.";

/** Transport bits owned by DraftChart (handlers + live flags), forwarded to the cluster. */
export interface ScoreboardTransport {
  speed: number;
  restartPulseKey: number;
  /** First-session hint: bump to breathe the PLAY button once (advance-act nudge). */
  playPulseKey: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onRestart: () => void;
  onSpeedChange: (x: number) => void;
}

export interface ScoreboardProps {
  /**
   * The player set the slot counts. CLASS-SCOPE at rest (ruling 2); under an active
   * lens (brief f) DraftChart passes the SCOPE-FILTERED (lit) subset — the SAME set
   * the chart re-lights — so the slot can never contradict the chart. Display toggles
   * never reach here (scope boundary in scoreboardStats.ts).
   */
  players: Player[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears: number[];
  chartMode: ChartMode;
  isAnimating: boolean;
  paused: boolean;
  /**
   * (Brief 4) The 2→3 choreography is in flight. While true the transport shows the
   * ❚❚/▶ toggle + enabled Skip/Restart + settable speed (same as the 1→2 chapter), and
   * the class switcher is disabled. The per-pick ticker + count-up are NOT driven by it.
   */
  phase2to3?: boolean;
  /**
   * (Brief 4) An Act-3 field state can replay the 2→3 from Movement I via Btn3 (↺ Replay).
   * False under reduced motion / a class with no field.
   */
  canReplay?: boolean;
  /**
   * (spec §6) Live 2→3 elapsed ms (null outside the chapter). In a RESOLVED class this
   * drives the hero's live money climb + the beat-timed attention treatments. The
   * on-field GOT PAID counter was retired — the scoreboard hero IS the counter now.
   */
  twoToThreeElapsedMs?: number | null;
  /**
   * (spec §6) The resolved class's money-beat schedule (arrivals + per-band marks); null
   * outside a resolved 2→3. Empty money bands contribute no mark → no pulse/segment.
   */
  sweep?: Act3Sweep | null;
  /**
   * (Sprint 2) The authored 1→2 schedule (null off-chapter / degenerate class). The per-pick
   * ticker reads pickAtElapsed(oneToTwoElapsedMs) + its mode/copy off this — no self-run flat
   * clock, so ticker and dots are incapable of drifting. Replaces the retired animDurationMs.
   */
  oneToTwoChoreo?: OneToTwoChoreography | null;
  /** (Sprint 2) Live 1→2 elapsed ms (null outside the chapter) — the ticker's clock. */
  oneToTwoElapsedMs?: number | null;
  /**
   * (Sprint 2) Paused pick-by-pick step. dir −1/+1 walks the drafted list in pick order;
   * DraftChart sets the master clock to the target pick's landAt. Inert unless paused.
   */
  onStepPick?: (dir: -1 | 1, via: 'chevron' | 'key') => void;
  /** Resolved-class join failures (rider 2) — drives the ⚠ utility line when > 0. */
  unmatched: string[];
  transport: ScoreboardTransport;
  /**
   * (brief f) Class-pinned imputation anchor for reach/steal — forwarded to
   * computeScoreboardStats so a lens narrowing `players` can't flip a designation
   * vs the hover. One value, two consumers (hover + slot).
   */
  classMaxPick: number;
  /**
   * (brief f, item 2) Your-team chip — sits beside the nameplate, present in all acts.
   * NOT a parallel filter: the chip writes the same `teamFilter` the sidebar does.
   * `pinnedTeam` is the saved identity; `chipPulse` is the one-time invite pulse.
   */
  teamFilter: string[];
  availableTeams: string[];
  pinnedTeam: string | null;
  onToggleTeam: (team: string) => void;
  onPinTeam: (team: string | null) => void;
  chipPulse: boolean;
  /**
   * (fix-pass-3 §2) Player search, RE-HOMED into the identity column beneath the year
   * (was the header top-right slot). Passed as a node so the search logic (index, teleport,
   * glow-ring) stays wholly in PlayerSearch — the scoreboard only owns its PLACEMENT.
   */
  searchSlot?: ReactNode;
  /**
   * (first-session hints) Incrementing token — when it changes, the year switcher breathes
   * ONCE (the Act-3 idle "explore other classes" nudge). Driven by the hint controller in
   * DraftChart; the switcher stays dumb and only reacts to the key.
   */
  yearPulseKey?: number;
}

/** Six-band strip order (Derek, Lambda §2): money family first, left→right descending,
 *  the paid-line falling at the MIDDLE|MIN boundary. A horizontal miniature of the wall. */
const SIX_BAND_STRIP_ORDER: MoneyBand[] = ["TOP5", "TOP10", "MIDDLE", "MIN", "ZERO", "NEVER"];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const s = ["th", "st", "nd", "rd"];
  return `${n}${s[n % 10] ?? "th"}`;
}

// ── Motion-on-change (fix-pass §G) ──────────────────────────────────────────────
// The "it's alive / it's interactive" signal: when the act changes the caption count-
// ups its hero number(s) + crossfades its label/sub (CSS .sb-x-fade) + tweens the strip
// widths (CSS transition). All of it respects prefers-reduced-motion (instant, no
// count/fade).
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Count-up the hero number (fix-pass §G). `animate` is true ONLY on the first render
 * after an act change (and false under reduced motion), so entering an act counts the
 * figure up from 0 (~560ms ease-out); within an act a value change (e.g. a lens
 * narrowing the scope) snaps instantly — the strip tween + fade carry that case.
 */
function CountUp({ n, animate }: { n: number; animate: boolean }) {
  const [display, setDisplay] = useState<number>(animate ? 0 : n);
  const fromRef = useRef<number>(animate ? 0 : n);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const from = fromRef.current;
    if (!animate || from === n) { setDisplay(n); fromRef.current = n; return; }
    let start = 0;
    const dur = 560;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(from + (n - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { setDisplay(n); fromRef.current = n; }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [n, animate]);
  return <>{display}</>;
}

// ── Denominator figure with hover/focus explainer (Part 4a) ────────────────────
function DenomFigure({ n, tip = DENOM_TOOLTIP }: { n: number; tip?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="sb-denom"
      tabIndex={0}
      title={`${n} ${tip}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      of <span className="sb-num">{n}</span>
      {open && (
        <span className="sb-denom-tip" role="tooltip">
          <strong>{n}</strong> {tip}
        </span>
      )}
    </span>
  );
}

// ── Proportion strip (the word-sized part-to-whole strip family, brief §4) ──────
// ONE horizontal segmented strip shape, repeated across acts (Act 2 diverging · Act 3
// five-tier · pending two-part). Resting state shows no % (gestalt at rest); hovering a
// segment reveals its COUNT + % (progressive disclosure). An optional bright paid-line
// marks the paid-vs-not cut (Act 3) — the DOMINANT mark; tiers are texture beneath.
interface StripSeg {
  key: string;
  /** Human label used in the hover tooltip ("steals", "PREMIUM", "still in league"). */
  label: string;
  count: number;
  color: string;
}

function ProportionStrip({
  segments,
  total,
  subLabel,
  paidFraction,
  boundaryTicks = false,
}: {
  segments: StripSeg[];
  total: number;
  subLabel: string;
  /** 0–1 position of the bright parchment paid-line (Act 3 verdict strip only). */
  paidFraction?: number;
  /**
   * (fix-pass §F) Light-grey ticks at each INTERNAL segment boundary — Act 2 only.
   * Gives Act 2 the crisp instrument-edge Act 3 has from its paid-line, but a notch
   * quieter (the paid-line stays the singular hero mark; these are its siblings).
   */
  boundaryTicks?: boolean;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  if (total <= 0) return null;

  // Lay segments out left→right with cumulative offsets so the hover tooltip can center
  // on its segment and the paid-line aligns to the cumulative paid edge.
  let acc = 0;
  const laid = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const frac = s.count / total;
      const seg = { ...s, widthPct: frac * 100, centerPct: (acc + frac / 2) * 100, pct: frac * 100, leftPct: acc * 100 };
      acc += frac;
      return seg;
    });
  const hovered = laid.find((s) => s.key === hoverKey) ?? null;
  // Internal boundaries = the left edge of every segment after the first (drop 0% and
  // the trailing 100% edge — those are the strip's own ends, not internal dividers).
  const tickEdges = boundaryTicks ? laid.slice(1).map((s) => s.leftPct) : [];

  return (
    <div className="sb-strip">
      <div
        className="sb-strip-track"
        style={{ height: STRIP_HEIGHT, borderRadius: STRIP_RADIUS }}
      >
        {laid.map((s) => (
          <div
            key={s.key}
            className="sb-strip-seg"
            style={{ width: `${s.widthPct}%`, background: s.color }}
            onMouseEnter={() => setHoverKey(s.key)}
            onMouseLeave={() => setHoverKey((h) => (h === s.key ? null : h))}
          />
        ))}
        {tickEdges.map((leftPct, i) => (
          <div
            key={`tick-${i}`}
            className="sb-strip-tick"
            style={{ left: `${leftPct}%`, width: STRIP_BOUNDARY_TICK_W, background: STRIP_BOUNDARY_TICK_COLOR }}
            aria-hidden="true"
          />
        ))}
        {paidFraction != null && paidFraction > 0 && paidFraction < 1 && (
          <div
            className="sb-strip-paidline"
            style={{ left: `${paidFraction * 100}%`, width: STRIP_PAID_LINE_W, background: STRIP_PAID_LINE_COLOR }}
            aria-hidden="true"
          />
        )}
      </div>
      {hovered && (
        <span
          className="sb-strip-tip"
          role="tooltip"
          style={{ left: `${hovered.centerPct}%` }}
        >
          {hovered.label}: <strong>{hovered.count}</strong> · {Math.round(hovered.pct)}%
        </span>
      )}
      <div className="sb-strip-sublabel">{subLabel}</div>
    </div>
  );
}

// ── Class-year switcher — THE one home for class switching (3c item 14) ─────────
// The scope label IS the class switcher: ◀ ▶ steppers (±1 yr) + click-to-open
// dropdown. The HeaderZone Row 1 scrubber is SUPERSEDED and retired. The year +
// chevrons are a self-contained centered unit — the brief-f lens nameplate was
// REMOVED (fix-pass 5): it shared this row and bumped the year sideways; the team
// chip + sidebar filter list + recomputed counts now signal the active lens.
function ClassSwitcher({
  selectedYear, availableYears, onYearChange, disabled, pulseKey = 0,
}: {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (y: number) => void;
  disabled: boolean;
  /** First-session hint: bump to breathe the year button once (Act-3 explore nudge). */
  pulseKey?: number;
}) {
  const [open, setOpen] = useState(false);
  // One-shot hint breath (~1.5s) on the year button — same key-bump shape as the
  // transport pulses; skip the initial mount value so it never fires on first paint.
  const [pulsing, setPulsing] = useState(false);
  const prevPulseKey = useRef(pulseKey);
  useEffect(() => {
    if (pulseKey === prevPulseKey.current) return;
    prevPulseKey.current = pulseKey;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 1500);
    return () => clearTimeout(t);
  }, [pulseKey]);
  const sorted = useMemo(() => [...availableYears].sort((a, b) => a - b), [availableYears]);
  const idx = sorted.indexOf(selectedYear);
  const prevYear = idx > 0 ? sorted[idx - 1] : null;
  const nextYear = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  return (
    <div className="sb-scope">
      {/* CHEVRONS, not play-triangles — year-nav must never look like the PLAY button
          (brief §2A / concern 3). Different glyph + different region = unambiguous. */}
      <button
        type="button"
        className="sb-scope-step"
        onClick={() => prevYear != null && onYearChange(prevYear)}
        disabled={disabled || prevYear == null}
        aria-label="Previous draft class"
      >‹</button>
      <button
        type="button"
        className={`sb-scope-year${pulsing ? " sb-scope-year--hintpulse" : ""}`}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedYear}<span className="sb-scope-caret" aria-hidden="true">▾</span>
      </button>
      <button
        type="button"
        className="sb-scope-step"
        onClick={() => nextYear != null && onYearChange(nextYear)}
        disabled={disabled || nextYear == null}
        aria-label="Next draft class"
      >›</button>
      {open && !disabled && (
        <div className="sb-scope-menu" role="listbox">
          {sorted.map((y) => (
            <button
              key={y}
              type="button"
              role="option"
              aria-selected={y === selectedYear}
              className={`sb-scope-item${y === selectedYear ? " sb-scope-item--active" : ""}`}
              onClick={() => { onYearChange(y); setOpen(false); }}
            >{y}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Scoreboard({
  players,
  selectedYear,
  onYearChange,
  availableYears,
  chartMode,
  isAnimating,
  paused,
  phase2to3 = false,
  canReplay = false,
  twoToThreeElapsedMs = null,
  sweep = null,
  oneToTwoChoreo = null,
  oneToTwoElapsedMs = null,
  onStepPick,
  unmatched,
  transport,
  classMaxPick,
  teamFilter,
  availableTeams,
  pinnedTeam,
  onToggleTeam,
  onPinTeam,
  chipPulse,
  searchSlot,
  yearPulseKey = 0,
}: ScoreboardProps) {
  const stats = useMemo(
    () => computeScoreboardStats(players, selectedYear, classMaxPick),
    [players, selectedYear, classMaxPick],
  );

  // Drafted players in pick order — drives the 1→2 per-pick ticker (state 2).
  const draftedSorted = useMemo(
    () =>
      players
        .filter((p) => p.pick_drafted != null && p.pick_drafted > 0)
        .sort((a, b) => (a.pick_drafted as number) - (b.pick_drafted as number)),
    [players],
  );
  // Positional running count → "{k}th {POS} taken".
  const posTaken = useMemo(() => {
    const running = new Map<string, number>();
    const byPlayer = new Map<string, number>();
    for (const p of draftedSorted) {
      const c = (running.get(p.pos) ?? 0) + 1;
      running.set(p.pos, c);
      byPlayer.set(p.player_id, c);
    }
    return byPlayer;
  }, [draftedSorted]);

  // The 1→2 animation runs while chartMode is still 'projection' (currentStepId flips
  // to 'draft' only when it ends), so this is the per-pick caption window.
  const animating1to2 = isAnimating && chartMode === "projection";

  // Motion-on-change (fix-pass §G): the hero count-up fires ONLY on the first render
  // after the act/state changes — and never under reduced motion. The label/sub
  // crossfade (CSS .sb-x-fade on element remount) and strip tween (CSS transition) are
  // pure CSS and ride the same act change.
  const reducedMotion = useReducedMotion();
  const actKey = animating1to2 ? "ticker" : chartMode;
  const prevActKeyRef = useRef(actKey);
  const actChanged = prevActKeyRef.current !== actKey;
  useEffect(() => { prevActKeyRef.current = actKey; }, [actKey]);
  const animateCount = actChanged && !reducedMotion;

  // ── Movement-III sweep: live hero climb + capped attention (spec §6) ───────────
  // In a RESOLVED 2→3 the hero IS the money counter now (the on-field one was retired):
  // its value climbs on each money-thread arrival and STALLS through the ink mass. Three
  // capped treatments ride the beats — an invitation pulse at the first payday thread, a
  // value change-fade at each money band's last arrival, and the six-band strip filling
  // cumulatively. `sweeping` is false at rest / under reduced motion (elapsed stays null
  // there — startTwoToThree hard-cuts), and off resolved (sweep is null).
  const heroRef    = useRef<HTMLSpanElement>(null);
  const heroFigRef = useRef<HTMLDivElement>(null);
  const sweeping = twoToThreeElapsedMs != null && sweep != null
    && chartMode === "verdict";
  // Live money count = arrivals ≤ elapsed (stalls automatically once the ink mass begins,
  // where no arrivals are scheduled). Lands on sweep.total == the resting hero value.
  const sweepValue = sweeping && sweep
    ? (() => { let n = 0; for (const a of sweep.arrivals) { if (a <= twoToThreeElapsedMs!) n++; else break; } return n; })()
    : null;
  // Cumulative strip reveal (spec §6/3): each money band's segment appears at its last
  // arrival; the three ink bands appear together when the ink mass completes.
  const inkRevealed = !sweeping || (sweep != null && twoToThreeElapsedMs! >= sweep.inkComplete);
  const revealBand = (b: MoneyBand): boolean => {
    if (!sweeping || !sweep) return true;              // rest / reduced-motion → full strip
    const mark = sweep.bandMarks.find((m) => m.band === b);
    return mark ? twoToThreeElapsedMs! >= mark.lastArrival : inkRevealed;
  };

  // One-shot beat triggers: invitation pulse (first thread onset) + per-band value
  // change-fade (each band's last arrival). Crossing-detected against monotonically
  // advancing elapsed, so 1×/2× and pause/resume all land on the beat boundary; a skip
  // (elapsed → null) or reduced motion fires NOTHING and resets for the next run.
  const sweepFiredRef = useRef<{ invite: boolean; bands: Set<string> }>({ invite: false, bands: new Set() });
  useEffect(() => {
    const e = twoToThreeElapsedMs;
    if (e == null) { sweepFiredRef.current = { invite: false, bands: new Set() }; return; }
    if (!sweep || reducedMotion || chartMode !== "verdict") return;
    const fired = sweepFiredRef.current;
    // (1) Invitation pulse — once, on the first payday thread beginning to draw.
    if (!fired.invite && sweep.firstThreadOnset != null && e >= sweep.firstThreadOnset) {
      fired.invite = true;
      heroFigRef.current?.animate(
        [
          { transform: "scale(1)",    boxShadow: "0 0 0 0 rgba(200,146,10,0)",       offset: 0 },
          { transform: "scale(1.03)", boxShadow: "0 0 6px 2px rgba(200,146,10,0.35)", offset: 0.3 },
          { transform: "scale(1)",    boxShadow: "0 0 0 0 rgba(200,146,10,0)",       offset: 1 },
        ],
        { duration: 600, easing: "ease-out" },
      );
    }
    // (2) Value change-fade — at each money band's last arrival (once per band). The value
    // is already gold, so brighten → parchment → decay is the visible change.
    for (const m of sweep.bandMarks) {
      if (!fired.bands.has(m.band) && e >= m.lastArrival) {
        fired.bands.add(m.band);
        heroRef.current?.animate(
          [{ color: "#D4A017" }, { color: "#F5F0E8", offset: 0.35 }, { color: "#D4A017" }],
          { duration: 400, easing: "ease-out" },
        );
      }
    }
  }, [twoToThreeElapsedMs, sweep, reducedMotion, chartMode]);

  // ── Per-pick ticker — SCHEDULE-DRIVEN (Sprint 2). No self-run flat clock: the caption
  // reads pickAtElapsed(oneToTwoElapsedMs) + its mode/copy straight off the authored 1→2
  // schedule at the live master clock, so the ticker and the dots are incapable of drifting.
  // sampleTicker resolves the override order (beat > hold > per-pick mode) and judges the
  // named/summary floor against REAL display time (authored interval / current speed), so
  // speed presets re-mode the ticker for free. `paused` → the full named caption (paused =
  // infinite read time). Last-good-pick cache still guards a transient lookup miss.
  const lastPickRef = useRef<Player | null>(null);
  const playersById = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.player_id, p);
    return m;
  }, [players]);
  const tickerState =
    animating1to2 && oneToTwoChoreo && oneToTwoElapsedMs != null && oneToTwoChoreo.pickTimeline.length > 0
      ? sampleTicker(oneToTwoChoreo, oneToTwoElapsedMs, transport.speed, paused)
      : null;
  // Step-through chevron availability — the drafted list, in pick order, while paused.
  const pickIdx =
    oneToTwoChoreo && oneToTwoElapsedMs != null ? oneToTwoChoreo.pickIndexAtElapsed(oneToTwoElapsedMs) : -1;
  const canStepPrev = animating1to2 && paused && pickIdx > 0;
  const canStepNext =
    animating1to2 && paused && oneToTwoChoreo != null && pickIdx < oneToTwoChoreo.classTotal - 1;
  const showStepper = animating1to2 && oneToTwoChoreo != null && oneToTwoChoreo.pickTimeline.length > 0;

  // ── Cluster presentation (derived here; the cluster itself is dumb) ────────────
  let playLabel = "";
  let playDisabled = true;
  let canSkip = false;
  let canRestart = false;
  // Btn3 is "Reset" in every state it's enabled (quick-pass #3a, Derek choice (a)): it
  // seats the dots back on the projected board PAUSED, never auto-plays. Replaces the
  // prior dynamic "Restart" (mid-animation) / "Replay" (Act 2 rest) labels.
  let restartLabel = "Reset";
  if (animating1to2 || phase2to3) {
    // In-flight chapter (1→2 or the Brief-4 2→3): ❚❚/▶ toggle + Skip + Restart.
    playDisabled = false; canSkip = true; canRestart = true;
    if (phase2to3) restartLabel = "Restart";
  } else if (chartMode === "projection") {
    playLabel = "PLAY DRAFT DAY"; playDisabled = false;
  } else if (chartMode === "draft-results") {
    playLabel = "PLAY NEXT 4 YRS"; playDisabled = false; canRestart = true;
  } else if (canReplay) {
    // Act-3 rest — Btn3 replays the 2→3 (Play stays disabled: no Act 4).
    canRestart = true; restartLabel = "Replay";
  } // else verdict / pending / floor with no replayable field → disabled in place

  // ☆ MY TEAM (fix-pass-3 §3) — now seated to the RIGHT of the speed dropdown (bottom
  // row = `1× ▾` | `☆ MY TEAM`), passed into the cluster as its speed-row trailing slot.
  const teamChip = (
    <div className="sb-myteam">
      <TeamChip
        pinnedTeam={pinnedTeam}
        teamFilter={teamFilter}
        availableTeams={availableTeams}
        onToggleTeam={onToggleTeam}
        onPinTeam={onPinTeam}
        pulse={chipPulse}
      />
    </div>
  );

  const cluster = (
    <TransportCluster
      playLabel={playLabel}
      playDisabled={playDisabled}
      isAnimating={animating1to2 || phase2to3}
      paused={paused}
      canSkip={canSkip}
      canRestart={canRestart}
      restartLabel={restartLabel}
      speed={transport.speed}
      onPlay={transport.onPlay}
      onPause={transport.onPause}
      onResume={transport.onResume}
      onSkip={transport.onSkip}
      onRestart={transport.onRestart}
      onSpeedChange={transport.onSpeedChange}
      restartPulseKey={transport.restartPulseKey}
      playPulseKey={transport.playPulseKey}
      bottomTrailing={teamChip}
    />
  );

  // ── Caption body per view-state ────────────────────────────────────────────────
  // ── Strip nodes (brief §4) — built once, dropped into the matching rest state ──
  // Act 2: diverging [ steals · on-target · reaches ] over the drafted set.
  const act2Strip = (
    <ProportionStrip
      total={stats.draftedCount}
      boundaryTicks
      subLabel={`${stats.steals} steals · ${stats.onTargetCount} on target · ${stats.reaches} reaches`}
      segments={[
        { key: "steals", label: "steals", count: stats.steals, color: STRIP_STEAL_COLOR },
        { key: "ontarget", label: "on target", count: stats.onTargetCount, color: STRIP_ONTARGET_COLOR },
        { key: "reaches", label: "reaches", count: stats.reaches, color: STRIP_REACH_COLOR },
      ]}
    />
  );
  // Act 3 resolved — SIX-BAND money strip (Phase Lambda reframe). A horizontal
  // miniature of the wall: money family first, left→right
  // descending (TOP5 · TOP10 · MIDDLE | MIN · ZERO · NEVER), the bright paid-line at the
  // family boundary so it keeps the bar's "paid-on-the-left" reading. Colors ARE the
  // banked band hexes (ACT3_BANDS), so a viewer who learned the ladder from the payday
  // animation reads the scoreboard for free. Counts source from live data (the sweep).
  // During the sweep the strip fills cumulatively with the beats (spec §6/3): a band's
  // segment appears at its last arrival, ink appears together at ink-mass completion. The
  // paid-line + full "paid · didn't" sublabel hold until ink is in (before that only money
  // is on the strip, so the boundary line has nothing to divide). At rest → the full strip.
  const sixBandStrip = (
    <ProportionStrip
      total={stats.plottedPop}
      subLabel={
        !sweeping || inkRevealed
          ? `${stats.moneyFamilyCount} paid · ${stats.plottedPop - stats.moneyFamilyCount} didn't`
          : `${sweepValue ?? 0} paid`
      }
      paidFraction={inkRevealed && stats.plottedPop > 0 ? stats.moneyFamilyCount / stats.plottedPop : undefined}
      segments={SIX_BAND_STRIP_ORDER.map((b) => ({
        key: b,
        label: ACT3_BANDS[b].descriptor,
        count: revealBand(b) ? stats.bandCounts[b] : 0,
        color: ACT3_BANDS[b].color,
      }))}
    />
  );
  // Act 3 pending: two-part [ still in league · couldn't stick ] — verdicts aren't
  // resolved yet, so NOT the tier strip (build-pass clarification B). Wording matches
  // the pending hero ("STILL IN THE LEAGUE: X of N"); window-still-open language.
  const pendingStrip = (
    <ProportionStrip
      total={stats.N}
      subLabel={`${stats.stillInLeagueCount} still in · ${stats.couldntStickCount} too few snaps`}
      segments={[
        { key: "still", label: "still in league", count: stats.stillInLeagueCount, color: STRIP_STILL_COLOR },
        { key: "couldnt", label: "too few snaps", count: stats.couldntStickCount, color: STRIP_COULDNT_COLOR },
      ]}
    />
  );

  let caption: ReactNode;
  let live: "off" | "polite" = "polite";

  // Sprint 2 — paused pick-by-pick step chevrons. Reserved-width, opacity-only reveal on
  // pause (no transform → zero layout shift); invisible + inert during playback so they can
  // never eat a click or cancel autoplay. Flank the .sb-hero--pick line, OUTSIDE the fixed
  // .sb-pick-slot, so stepping never reflows a character. Rendered in EVERY State-2 mode so
  // their width is always reserved. `‹` `›` (locked stepper vocabulary — never triangles).
  const renderPickStep = (dir: -1 | 1, enabled: boolean): ReactNode =>
    showStepper ? (
      <button
        type="button"
        className="sb-pick-step"
        aria-label={dir === -1 ? "Previous pick" : "Next pick"}
        disabled={!enabled}
        tabIndex={paused && enabled ? 0 : -1}
        onClick={() => onStepPick?.(dir, "chevron")}
        style={{
          opacity: paused ? (enabled ? 1 : 0.35) : 0,
          pointerEvents: paused && enabled ? "auto" : "none",
        }}
      >
        {dir === -1 ? "‹" : "›"}
      </button>
    ) : null;

  // The pick-hero line with chevrons flanking the fixed slot. `chip` is the team chip
  // (named mode only); summary / hold / beat pass null.
  const heroLine = (slot: ReactNode, chip: ReactNode): ReactNode => (
    <div className="sb-hero sb-hero--pick">
      {renderPickStep(-1, canStepPrev)}
      <span className="sb-pick-slot">{slot}</span>
      {chip}
      {renderPickStep(1, canStepNext)}
    </div>
  );

  if (animating1to2 && tickerState) {
    // ── State 2: 1→2 per-pick caption — schedule-driven (slot NEVER blanks mid-show) ──
    live = "off"; // high-frequency hero — no SR spam (Part 2 ARIA)
    const ts = tickerState;
    const entry = ts.entry;
    const classTotal = oneToTwoChoreo?.classTotal ?? 0;
    // Resolve the current pick's Player for named/beat content; cache the last good one so a
    // transient lookup miss (a lens dropping the pick from `players`) holds the caption.
    const p = entry ? (playersById.get(entry.playerId) ?? lastPickRef.current) : lastPickRef.current;
    if (p) lastPickRef.current = p;

    if (ts.kind === "beat" && entry && p) {
      // Beat copy: #1 gets the "BIGGEST" superlative; #2 is the bare STEAL/REACH. Uppercase
      // ordinal (180TH / 3RD) matches the caption register; imputed-unranked reaches → UNRANKED.
      const word = entry.beat === "reach" ? "REACH" : "STEAL";
      const lead = entry.beatRank === 1 ? `BIGGEST ${word}` : word;
      const rankLine = p.rank != null ? `RANKED ${ordinal(p.rank).toUpperCase()}` : "UNRANKED";
      caption = (
        <>
          {heroLine(lead, null)}
          <div className="sb-def"><strong>{p.name}</strong> · PICK {entry.pick}</div>
          <div className="sb-util">{rankLine}</div>
        </>
      );
    } else if (ts.kind === "boundary" && ts.hold) {
      const { steals, reaches } = ts.hold.tallies;
      caption = (
        <>
          {heroLine(`ROUND ${ts.hold.afterRound}`, null)}
          <div className="sb-def">{steals} STEALS · {reaches} REACHES</div>
          <div className="sb-util">&nbsp;</div>
        </>
      );
    } else if (ts.kind === "preUdfa") {
      const u = oneToTwoChoreo?.udfaCount ?? 0;
      caption = (
        <>
          {heroLine("THE DRAFT ENDS", null)}
          <div className="sb-def">{u} UNDRAFTED SIGNINGS</div>
          <div className="sb-util">&nbsp;</div>
        </>
      );
    } else if (ts.kind === "summary" && entry) {
      // Odometer only — flight is velocity, meaning is reserved for the holds (§2).
      caption = (
        <>
          {heroLine(`ROUND ${entry.rd} · PICK ${entry.pick} OF ${classTotal}`, null)}
          <div className="sb-def">&nbsp;</div>
          <div className="sb-util">&nbsp;</div>
        </>
      );
    } else if (entry && p) {
      // Named — the caption exactly as before (pick slot + team chip / Name · POS / kth taken).
      const colors = resolveTeamColors(p.team_drafted);
      const code = teamCodeFromFullName(resolveTeamName(p.team_drafted));
      const k = posTaken.get(p.player_id) ?? 1;
      const chip = (
        <span
          className="sb-team-chip"
          style={{ background: colors.primary, color: colors.onPrimary }}
          aria-hidden="true"
        >{code}</span>
      );
      caption = (
        <>
          {heroLine(<>R{p.rd_drafted ?? "—"} · PICK {p.pick_drafted}</>, chip)}
          <div className="sb-def"><strong>{p.name}</strong> · {p.pos}</div>
          <div className="sb-util">{ordinal(k)} {p.pos} taken</div>
        </>
      );
    } else {
      // No safe player yet (transient) — keep the slot present but inert (no crash/blank).
      caption = <div className="sb-def">&nbsp;</div>;
    }
  } else if (chartMode === "projection") {
    // ── State 1: Act 1 rest ─────────────────────────────────────────────────────
    if (!stats.hasProjection) {
      // No projection data — supporting line only, never fabricate (Part 1).
      if (typeof console !== "undefined") {
        console.warn(`[scoreboard] no projection data for ${selectedYear} — supporting line only`);
      }
      caption = (
        <>
          <div className="sb-statelabel sb-x-fade">THE BOARD</div>
          <div className="sb-def sb-x-fade">consensus not yet posted</div>
          <div className="sb-util">consensus board</div>
        </>
      );
    } else {
      caption = (
        <>
          <div className="sb-statelabel sb-x-fade">THE BOARD</div>
          <div className="sb-herofig sb-x-fade"><span className="sb-num"><CountUp n={stats.firstRoundGradeCount} animate={animateCount} /></span> first-round grades</div>
          <div className="sb-promise sb-x-fade">
            Relive the {selectedYear} NFL Draft, then see every pick graded by the league
            itself: snap counts and second contracts.
          </div>
        </>
      );
    }
  } else if (chartMode === "draft-results") {
    // ── State 3: Act 2 rest ─────────────────────────────────────────────────────
    caption = (
      <>
        <div className="sb-statelabel sb-x-fade">DRAFT DAY</div>
        <div className="sb-herofig sb-x-fade"><span className="sb-num"><CountUp n={stats.steals} animate={animateCount} /></span> steals · <span className="sb-num"><CountUp n={stats.reaches} animate={animateCount} /></span> reaches</div>
        <div className="sb-def sb-x-fade">vs. where the consensus ranked them</div>
        <div className="sb-util">final draft order</div>
        {act2Strip}
      </>
    );
  } else if (chartMode === "verdict") {
    // ── State 5: Act 3 rest — RESOLVED ──────────────────────────────────────────
    // GOT PAID = money family (MIDDLE+TOP10+TOP5) over plotted_pop. Every number is
    // live-data-derived (denominator sweep).
    caption = (
      <>
        <div className="sb-statelabel sb-x-fade">SUBSTANTIAL GUARANTEES</div>
        {/* The hero IS the money counter (spec §6): during a resolved 2→3 it climbs
            live on each money-thread arrival (sweepValue) and stalls through the ink
            mass; at rest / reduced-motion / skip it shows the final moneyFamilyCount.
            heroFigRef takes the once-per-run invitation pulse (scale + gold ring);
            heroRef (#sb-got-paid-hero) takes the per-band value change-fade. transform-
            origin left keeps the pulse anchored to the reading edge (no sideways drift). */}
        <div ref={heroFigRef} className="sb-herofig sb-x-fade" style={{ transformOrigin: "left center" }}><span id="sb-got-paid-hero" ref={heroRef} className="sb-num">{sweeping ? sweepValue : <CountUp n={stats.moneyFamilyCount} animate={animateCount} />}</span> <DenomFigure n={stats.plottedPop} tip={MONEY_DENOM_TOOLTIP} /></div>
        <div className="sb-def sb-x-fade"><span className="sb-num">{stats.becameStartersCount}</span> became starters</div>
        <div className="sb-util">of {stats.plottedPop} = drafted or signed at a position with a second-contract market</div>
        {unmatched.length > 0 && (
          <div className="sb-util sb-util--warn">⚠ {unmatched.length} unmatched</div>
        )}
        {sixBandStrip}
      </>
    );
  } else if (chartMode === "pending") {
    // ── State 6: Act 3 rest — PENDING ───────────────────────────────────────────
    caption = (
      <>
        <div className="sb-statelabel sb-x-fade">STILL IN THE LEAGUE</div>
        <div className="sb-herofig sb-x-fade"><span className="sb-num"><CountUp n={stats.stillInLeagueCount} animate={animateCount} /></span> <DenomFigure n={stats.N} /></div>
        <div className="sb-def sb-x-fade"><span className="sb-num">{stats.becameStartersCount}</span> became starters so far</div>
        <div className="sb-util">second-contract window through {selectedYear + 5}</div>
        {pendingStrip}
      </>
    );
  } else if (chartMode === "floor") {
    // ── State 7: 2026 floor — the one state where count grammar breaks on purpose ─
    caption = (
      <>
        <div className="sb-statelabel sb-x-fade">FIRST SNAPS</div>
        <div className="sb-herofig sb-x-fade">September {selectedYear}</div>
        <div className="sb-def sb-x-fade">no results yet · awaiting first snaps · {selectedYear}</div>
        <div className="sb-util">&nbsp;</div>
      </>
    );
  } else {
    // Defensive fallback (production/career are not reachable via the 3-beat bar).
    caption = <div className="sb-def">&nbsp;</div>;
  }

  // ARIA (spec §6): during the live money climb the hero updates every frame — keep the
  // live region OFF so screen readers aren't spammed. At handoff/rest sweeping goes false
  // → "polite" announces the settled final value once.
  if (sweeping) live = "off";

  // THREE-COLUMN layout (fix-pass-2 §2) — IDENTITY | STORY | CONTROLS, left→right: the
  // when/who → what → do reading order, now literal. Regions stay INVISIBLE (no labels;
  // felt through spacing + hairline dividers, smallest-effective-difference). The
  // CONTROLS column is the HEIGHT ANCHOR: it's the tallest, constant-height column, so
  // the strip appearing in Act 2/3 grows the STORY column only WITHIN that height — the
  // header height stays fixed across all three acts (no act-to-act resize). The
  // instrument FRAME + motion-on-change stay as built.
  return (
    <div className="sb-root">
      {/* IDENTITY (left) — a "navigate" stack, TOP-aligned: NFL DRAFT CLASS eyebrow → big
          year (chevrons balanced around it, centered as a unit) → player-search FIELD
          beneath (fix-pass-3 §2). Widened so NFL DRAFT CLASS fits one line + the search reads
          as a field. Hairline divider on its right edge. */}
      <div className="sb-region sb-region--id">
        <div className="sb-eyebrow">NFL DRAFT CLASS</div>
        <ClassSwitcher
          selectedYear={selectedYear}
          availableYears={availableYears}
          onYearChange={onYearChange}
          disabled={animating1to2 || phase2to3}
          pulseKey={yearPulseKey}
        />
        {searchSlot && <div className="sb-search-slot">{searchSlot}</div>}
      </div>

      {/* STORY (middle) — the only speaking slot at rest: state label → hero figure →
          support → fine print → strip. KEEPS its width so the strip never squeezes. */}
      <div className="sb-region sb-region--story sb-caption" aria-live={live}>
        {caption}
      </div>

      {/* CONTROLS (right) — vertical stack + height anchor: PLAY (top, prominent) ·
          Skip/Restart (horizontal pair) · bottom row = speed dropdown | ☆ MY TEAM side
          by side (fix-pass-3 §3). The transport quiets but never reflows in non-playable
          states. */}
      <div className="sb-region sb-region--action">
        {cluster}
      </div>
    </div>
  );
}
