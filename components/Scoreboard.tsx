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
import TransportCluster from "@/components/TransportCluster";

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
  /** FULL class player set (class-scope — ruling 2). */
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
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const s = ["th", "st", "nd", "rd"];
  return `${n}${s[n % 10] ?? "th"}`;
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

// ── Class-year switcher — THE one home for class switching (3c item 14) ─────────
// The scope label IS the class switcher: ◀ ▶ steppers (±1 yr) + click-to-open
// dropdown. The HeaderZone Row 1 scrubber is SUPERSEDED and retired. brief f APPENDS
// the lens dims (`· SEA · WR`) + the × exit to THIS same label — leave room.
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
      <button
        type="button"
        className="sb-scope-step"
        onClick={() => prevYear != null && onYearChange(prevYear)}
        disabled={disabled || prevYear == null}
        aria-label="Previous draft class"
      >◀</button>
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
      >▶</button>
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
}: ScoreboardProps) {
  const stats = useMemo(() => computeScoreboardStats(players, selectedYear), [players, selectedYear]);

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
    />
  );

  // ── Caption body per view-state ────────────────────────────────────────────────
  const sourceUtil =
    stats.consensusSources.length > 0
      ? `consensus · ${stats.consensusSources[0]}${stats.consensusSources.length > 1 ? ` +${stats.consensusSources.length - 1}` : ""}`
      : "consensus board";

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
          <div className="sb-def">projections not yet posted</div>
          <div className="sb-util">{sourceUtil}</div>
        </>
      );
    } else {
      caption = (
        <>
          <div className="sb-hero"><span className="sb-num">{stats.firstRoundGradeCount}</span> FIRST-ROUND GRADES</div>
          <div className="sb-def"><span className="sb-num">{stats.rankedCount}</span> prospects ranked</div>
          <div className="sb-util">{sourceUtil}</div>
        </>
      );
    }
  } else if (chartMode === "draft-results") {
    // ── State 3: Act 2 rest ─────────────────────────────────────────────────────
    caption = (
      <>
        <div className="sb-hero"><span className="sb-num">{stats.reaches}</span> REACHES · <span className="sb-num">{stats.steals}</span> STEALS</div>
        <div className="sb-def">vs. where the consensus ranked them</div>
        <div className="sb-util">final board · data thru 2025</div>
      </>
    );
  } else if (chartMode === "verdict") {
    // ── State 5: Act 3 rest — RESOLVED ──────────────────────────────────────────
    caption = (
      <>
        <div className="sb-hero">GOT PAID: <span className="sb-num">{stats.gotPaidCount}</span> <DenomFigure n={stats.N} /></div>
        <div className="sb-def"><span className="sb-num">{stats.becameStartersCount}</span> became starters</div>
        <div className="sb-util">the book&apos;s closed · {selectedYear}</div>
        {unmatched.length > 0 && (
          <div className="sb-util sb-util--warn">⚠ {unmatched.length} unmatched</div>
        )}
      </>
    );
  } else if (chartMode === "pending") {
    // ── State 6: Act 3 rest — PENDING ───────────────────────────────────────────
    caption = (
      <>
        <div className="sb-hero">STILL IN THE LEAGUE: <span className="sb-num">{stats.stillInLeagueCount}</span> <DenomFigure n={stats.N} /></div>
        <div className="sb-def"><span className="sb-num">{stats.becameStartersCount}</span> became starters so far</div>
        <div className="sb-util">second deals through {selectedYear + 5}</div>
      </>
    );
  } else if (chartMode === "floor") {
    // ── State 7: 2026 floor — the one state where count grammar breaks on purpose ─
    caption = (
      <>
        <div className="sb-hero">FIRST SNAPS — SEPTEMBER {selectedYear}</div>
        <div className="sb-def">the chase begins this fall</div>
        <div className="sb-util">&nbsp;</div>
      </>
    );
  } else {
    // Defensive fallback (production/career are not reachable via the 3-beat bar).
    caption = <div className="sb-def">&nbsp;</div>;
  }

  return (
    <div className="sb-root">
      <div className="sb-topline">
        <ClassSwitcher
          selectedYear={selectedYear}
          availableYears={availableYears}
          onYearChange={onYearChange}
          disabled={animating1to2}
        />
        {cluster}
      </div>
      <div className="sb-caption" aria-live={live}>
        {caption}
      </div>
    </div>
  );
}
