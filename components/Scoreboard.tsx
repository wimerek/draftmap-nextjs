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
  STRIP_TIER_COLOR,
  STRIP_STILL_COLOR,
  STRIP_COULDNT_COLOR,
  STRIP_HEIGHT,
  STRIP_RADIUS,
  STRIP_PAID_LINE_COLOR,
  STRIP_PAID_LINE_W,
  STRIP_BOUNDARY_TICK_COLOR,
  STRIP_BOUNDARY_TICK_W,
} from "@/lib/scoreboardStrip";
import { WALL_TIER_ORDER } from "@/lib/act3Constants";
import TransportCluster from "@/components/TransportCluster";
import TeamChip from "@/components/TeamChip";

const DENOM_TOOLTIP =
  "= everyone drafted from this class, plus undrafted players who logged an NFL snap.";

/** Transport bits owned by DraftChart (handlers + live flags), forwarded to the cluster. */
export interface ScoreboardTransport {
  speed: number;
  restartPulseKey: number;
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
  /** Effective 1→2 duration (ms, already speed-adjusted) — paces the per-pick ticker. */
  animDurationMs: number;
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
}

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
function DenomFigure({ n }: { n: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="sb-denom"
      tabIndex={0}
      title={`${n} ${DENOM_TOOLTIP}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      of <span className="sb-num">{n}</span>
      {open && (
        <span className="sb-denom-tip" role="tooltip">
          <strong>{n}</strong> {DENOM_TOOLTIP}
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
  selectedYear, availableYears, onYearChange, disabled,
}: {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (y: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
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
        className="sb-scope-year"
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
  animDurationMs,
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

  // ── Per-pick ticker (RAF; pause-aware via ref so a pause toggle never restarts it) ─
  const [tickIdx, setTickIdx] = useState(0);
  // Last pick the State-2 caption successfully rendered. Lets the slot survive a
  // transient tickIdx/draftedSorted desync without blanking OR crashing.
  const lastPickRef = useRef<Player | null>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => {
    if (!animating1to2 || draftedSorted.length === 0) { setTickIdx(0); return; }
    const n = draftedSorted.length;
    const dur = Math.max(300, animDurationMs);
    let raf = 0;
    let last = performance.now();
    let active = 0;
    const frame = (now: number) => {
      const dt = now - last; last = now;
      if (!pausedRef.current) active += dt;
      const prog = Math.min(active / dur, 1);
      setTickIdx(Math.min(n - 1, Math.floor(prog * n)));
      if (prog < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [animating1to2, draftedSorted.length, animDurationMs]);

  // ── Cluster presentation (derived here; the cluster itself is dumb) ────────────
  let playLabel = "";
  let playDisabled = true;
  let canSkip = false;
  let canRestart = false;
  let restartLabel = "Restart";
  if (animating1to2) {
    playDisabled = false; canSkip = true; canRestart = true; restartLabel = "Restart";
  } else if (chartMode === "projection") {
    playLabel = "PLAY DRAFT DAY"; playDisabled = false;
  } else if (chartMode === "draft-results") {
    playLabel = "PLAY NEXT 4 YRS"; playDisabled = false; canRestart = true; restartLabel = "Replay";
  } // verdict / pending / floor → all disabled in place (no Act 4 / no replayable chapter in d)

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
      isAnimating={animating1to2}
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
  // Act 3 resolved: five-tier strip + bright paid-line at the PREMIUM+SOLID+BRIDGE edge.
  const verdictStrip = (
    <ProportionStrip
      total={stats.N}
      subLabel={`${stats.gotPaidCount} paid · ${stats.N - stats.gotPaidCount} didn't`}
      paidFraction={stats.N > 0 ? stats.gotPaidCount / stats.N : undefined}
      segments={WALL_TIER_ORDER.map((t) => ({
        key: t,
        label: t.replace("_", " "),
        count: stats.tierCounts[t],
        color: STRIP_TIER_COLOR[t],
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

  if (animating1to2 && draftedSorted.length > 0) {
    // ── State 2: 1→2 per-pick caption (slot NEVER blanks mid-show) ──────────────
    live = "off"; // high-frequency hero — no SR spam (Part 2 ARIA)
    // Defensive: clamp the index and NEVER read .team_drafted off an undefined
    // player. A tickIdx/draftedSorted desync (observed on 2026's projection-less
    // partial-draft shape) was returning undefined here and throwing mid-RAF.
    // Math.max guards a stale/negative/NaN tickIdx; ?? falls back to the last
    // good pick so the slot holds its caption instead of blanking or crashing.
    const idx = Math.min(Math.max(tickIdx, 0), draftedSorted.length - 1);
    const p = draftedSorted[idx] ?? lastPickRef.current;
    if (!p) {
      // No safe player yet — log the live shape so the desync can be traced, then
      // keep the slot present but inert for this frame (no crash, no blank reflow).
      if (typeof console !== "undefined") {
        console.warn(
          `[scoreboard] State-2 ticker desync for ${selectedYear}: ` +
            `players.length=${players.length} draftedSorted.length=${draftedSorted.length} ` +
            `tickIdx=${tickIdx} idx=${idx} ` +
            `firstPickShape=${JSON.stringify(draftedSorted[0])}`,
        );
      }
      caption = <div className="sb-def">&nbsp;</div>;
    } else {
      lastPickRef.current = p; // cache the last good pick for the fallback above
      const colors = resolveTeamColors(p.team_drafted);
      const code = teamCodeFromFullName(resolveTeamName(p.team_drafted));
      const k = posTaken.get(p.player_id) ?? 1;
      caption = (
        <>
          <div className="sb-hero sb-hero--pick">
            <span className="sb-pick-slot">R{p.rd_drafted ?? "—"} · PICK {p.pick_drafted}</span>
            <span
              className="sb-team-chip"
              style={{ background: colors.primary, color: colors.onPrimary }}
              aria-hidden="true"
            >{code}</span>
          </div>
          <div className="sb-def">
            <strong>{p.name}</strong> · {p.pos}
          </div>
          <div className="sb-util">{ordinal(k)} {p.pos} taken</div>
        </>
      );
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
          <div className="sb-def sb-x-fade"><span className="sb-num">{stats.rankedCount}</span> prospects ranked</div>
          <div className="sb-util">consensus board</div>
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
    caption = (
      <>
        <div className="sb-statelabel sb-x-fade">SUBSTANTIAL GUARANTEES</div>
        <div className="sb-herofig sb-x-fade"><span className="sb-num"><CountUp n={stats.gotPaidCount} animate={animateCount} /></span> <DenomFigure n={stats.N} /></div>
        <div className="sb-def sb-x-fade"><span className="sb-num">{stats.becameStartersCount}</span> became starters</div>
        <div className="sb-util">second contracts resolved</div>
        {unmatched.length > 0 && (
          <div className="sb-util sb-util--warn">⚠ {unmatched.length} unmatched</div>
        )}
        {verdictStrip}
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
          disabled={animating1to2}
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
