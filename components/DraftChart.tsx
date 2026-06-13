"use client";

import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Player } from "@/lib/sheets";
import { VALID_DRAFT_YEARS } from "@/lib/draftYears";
import { TEAM_COLORS, resolveTeamColors } from "@/lib/chartConstants";
import { generateBaseSlug } from "@/lib/slugs";
import {
  computeChartLayout,
  computeAllDotPositions,
  computeJellyfishLayout,
  computePendingFieldLayout,
  computeFloorLayout,
  scoreToProductionY,
  stSnapPctToGlobalPercentile,
  type ChartLayout,
  type DotPosition,
  type ChartView,
  type PickValueEntry,
} from "@/lib/chartMath";
import { getJourneySteps, type ChartMode } from "@/lib/dataAvailability";
import { selectClassState } from "@/lib/classMaturity";
import { usageTierLabel } from "@/lib/act3Constants";
import { fmtHeight } from "@/lib/utils";
import JellyfishField from "@/components/chart/JellyfishField";
import PlayerCard from "@/components/PlayerCard";
import TierBands from "@/components/chart/TierBands";
import TierArrows from "@/components/chart/TierArrows";
import TierAxisLabels from "@/components/chart/TierAxisLabels";
import PositionColumns from "@/components/chart/PositionColumns";
import RoundZones from "@/components/chart/RoundZones";
import PlayerDots from "@/components/chart/PlayerDots";
import UDFAZone from "@/components/chart/UDFAZone";
import HowToReadModal from "@/components/HowToReadModal";
import HeaderZone from "@/components/HeaderZone";
import Sidebar, {
  type ViewMode,
} from "@/components/Sidebar";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileHandleBar from "@/components/mobile/MobileHandleBar";
import MobilePlayerLabels from "@/components/chart/MobilePlayerLabels";
import MobileRoundTicks from "@/components/chart/MobileRoundTicks";


// ── Props ─────────────────────────────────────────────────────────────────────

interface DraftChartProps {
  year?: number;
  /**
   * Seed the position filter on mount (crawlable-twin position pages render at a
   * clean URL with no ?pos= param). Feeds the SAME positionFilter state the URL
   * param does — not a separate filtering path. Ignored if ?pos= is present.
   */
  initialPosition?: string;
  /**
   * Seed the journey step on mount (e.g. "draft" to land on draft results).
   * Feeds the SAME currentStepId state ?step= does. Ignored if ?step= is present.
   */
  initialStepId?: string;
}

// ── Tooltip (desktop only) ────────────────────────────────────────────────────

interface TooltipState {
  player: Player;
  x: number;
  y: number;
}

function ChartTooltip({ player, x, y }: TooltipState) {
  const strengths = [player.s1, player.s2, player.s3].filter(
    (s): s is string => !!s && s !== "N/A",
  );
  const strengthColors  = ["#B8D4C4", "#9ABFAD", "#7EA896"];
  const strengthWeights = ["700", "600", "500"];

  return (
    <div className="dm-tooltip" style={{ left: x, top: y }}>
      <div className="dm-tooltip-line">
        <strong>{player.name}</strong> — {player.pos}
      </div>
      <div className="dm-tooltip-line">
        <span className="dm-tooltip-label">School:</span> {player.school || "N/A"}
      </div>
      <div className="dm-tooltip-line">
        <span className="dm-tooltip-label">Role:</span> {player.role || "—"}
      </div>
      <div className="dm-tooltip-line">
        <span className="dm-tooltip-label">Proj. Pick</span> #{player.rank}
      </div>
      {player.pick_drafted && (
        <div className="dm-tooltip-line">
          <span className="dm-tooltip-label">Actual Pick</span> #{player.pick_drafted}
          {player.team_drafted ? ` — ${player.team_drafted}` : ""}
        </div>
      )}
      {strengths.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {strengths.map((s, i) => (
            <div
              key={i}
              style={{ color: strengthColors[i], fontWeight: strengthWeights[i], fontSize: 11 }}
            >• {s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Act 3 resolved hover card (verdict brief b, Part 8) ─────────────────────────

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const s = ["th", "st", "nd", "rd"];
  return `${n}${s[n % 10] ?? "th"}`;
}

/** Tier hero + raw-deal line. Block label is "THE SECOND CONTRACT", never "verdict". */
function verdictBlock2(
  v: NonNullable<Player["verdict"]>,
  noneCount: number,
): { hero: string; gold: boolean; sub: string | null; deal: string | null } {
  const gtd = fmtMoney(v.gtdDollars);
  switch (v.tier) {
    case "PREMIUM":
      return { hero: "TOP-OF-MARKET GUARANTEES", gold: true, sub: null,
        deal: `${v.contractYears ?? "—"} yr · ${gtd} guaranteed` };
    case "SOLID":
      return { hero: "MULTI-YEAR GUARANTEES", gold: false, sub: null,
        deal: `${v.contractYears ?? "—"} yr · ${gtd} guaranteed` };
    case "BRIDGE": {
      let deal: string;
      if (v.tagOption === "5th_year_option") deal = `5th-year option exercised · ${v.signingTeam ?? "—"}`;
      else if (v.tagOption === "franchise_tag") deal = "franchise tag"; // forward-compat (unused today)
      else deal = `1 yr · ${gtd} guaranteed`;
      return { hero: "ONE YEAR, TOP RATE", gold: false, sub: null, deal };
    }
    case "PROVE_IT":
      return { hero: "LITTLE TO NO GUARANTEES", gold: false, sub: null,
        deal: `${v.contractYears ?? "—"} yr · ${gtd} guaranteed` };
    case "NONE":
    default:
      return { hero: "NO NEW CONTRACT", gold: false,
        sub: `never signed again · one of ${noneCount}`, deal: null };
  }
}

function VerdictHoverCard({ player, x, y, noneCount }: TooltipState & { noneCount: number }) {
  const v = player.verdict;
  const strip = resolveTeamColors(player.team_drafted).primary;
  const ivory = "#F5F0E8";

  const hw = `${fmtHeight(player.height)}${player.weight ? `, ${player.weight} lb` : ""}`;
  const pickStr = player.pick_drafted ? `Pick ${player.pick_drafted}` : "UDFA";
  const identity = [player.pos, player.team_drafted ?? "—", pickStr, hw]
    .filter(Boolean)
    .join(" · ");

  const b2 = v ? verdictBlock2(v, noneCount) : null;

  // Block 3 — usage
  const usage = player.usage;
  let block3: ReactNode = <span style={{ color: "rgba(245,240,232,0.5)" }}>—</span>;
  if (usage) {
    if (usage.qualified && usage.careerUsagePercentile != null) {
      const tier = usageTierLabel(usage.careerUsagePercentile) ?? "—";
      block3 = (
        <>
          <strong style={{ color: ivory }}>{tier}</strong>
          <span style={{ color: "rgba(245,240,232,0.7)" }}>
            {" "}· {ordinal(usage.careerUsagePercentile)} pct usage
          </span>
        </>
      );
    } else {
      // Unqualified — raw snap share + games, NEVER a fabricated rank.
      const sharePct = usage.careerUsage != null ? `${Math.round(usage.careerUsage * 100)}% snaps` : "—";
      block3 = (
        <span style={{ color: "rgba(245,240,232,0.7)" }}>
          {sharePct}{usage.games != null ? ` · ${usage.games} g` : ""} — too few snaps to rank
        </span>
      );
    }
  }

  return (
    <div className="dm-tooltip" style={{ left: x, top: y, width: 250, background: "#0B2239", padding: 0, overflow: "hidden" }}>
      <div style={{ height: 4, background: strip }} />
      <div style={{ padding: "10px 12px" }}>
        {/* Block 1 — identity */}
        <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 13 }}>{player.name}</div>
        <div style={{ color: "rgba(245,240,232,0.65)", fontSize: 11, marginTop: 2 }}>{identity}</div>

        {/* Block 2 — the second contract */}
        {b2 && (
          <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.12)" }}>
            <div style={{ fontSize: 9, letterSpacing: 0.6, color: "rgba(245,240,232,0.4)" }}>THE SECOND CONTRACT</div>
            <div style={{ fontWeight: 700, fontSize: 12, marginTop: 2, color: b2.gold ? "#D4A017" : "#F5F0E8" }}>
              {b2.hero}
            </div>
            {b2.sub && <div style={{ fontSize: 11, color: "rgba(245,240,232,0.7)", marginTop: 1 }}>{b2.sub}</div>}
            {b2.deal && <div style={{ fontSize: 11, color: "rgba(245,240,232,0.7)", marginTop: 1 }}>{b2.deal}</div>}
          </div>
        )}

        {/* Block 3 — on the field */}
        <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.12)" }}>
          <div style={{ fontSize: 9, letterSpacing: 0.6, color: "rgba(245,240,232,0.4)" }}>ON THE FIELD</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>{block3}</div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 9, fontSize: 10, color: "rgba(245,240,232,0.4)" }}>
          › Click dot for full Player Card
        </div>
      </div>
    </div>
  );
}

// ── Act 3 PENDING hover card (brief c, Part 5) ──────────────────────────────────
// One hover component, middle block evolves (b's architecture). No legal words,
// no award line (brief e). Block 2 hero = STILL ON ROOKIE DEAL; Block 3 = usage
// tier + percentile + season-usage sparkline.

/**
 * Mini season sparkline — a dot at EVERY data point (a one-season player reads as
 * one season of evidence). Values are RATES (0–1); the headline carries the
 * percentile. UNIT DISCIPLINE: the caller labels the axis so a 70% snap share and
 * a 70th percentile can never be read as the same number.
 */
function Sparkline({ points }: { points: Array<{ season: number; value: number | null }> }) {
  const W = 132, H = 26, PAD = 4;
  const pts = points.filter(p => p.value != null) as Array<{ season: number; value: number }>;
  if (pts.length === 0) return null;
  const xs = pts.map((_, i) => pts.length === 1 ? W / 2 : PAD + (i / (pts.length - 1)) * (W - 2 * PAD));
  const ys = pts.map(p => PAD + (1 - Math.max(0, Math.min(1, p.value))) * (H - 2 * PAD));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block", marginTop: 4 }}>
      {pts.length > 1 && (
        <path d={path} fill="none" stroke="rgba(212,160,23,0.55)" strokeWidth={1.2} />
      )}
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={2.1} fill="#D4A017" stroke="#0B2239" strokeWidth={0.5} />
      ))}
    </svg>
  );
}

function PendingHoverCard({ player, x, y, chartMode }: TooltipState & { chartMode: ChartMode }) {
  const strip = resolveTeamColors(player.team_drafted).primary;
  const ivory = "#F5F0E8";
  const dim   = "rgba(245,240,232,0.7)";

  // Block 1 — identity (same shape as resolved).
  const hw = `${fmtHeight(player.height)}${player.weight ? `, ${player.weight} lb` : ""}`;
  const isUDFA = !(player.pick_drafted && player.pick_drafted > 0);
  const pickStr = isUDFA ? "UDFA" : `Pick ${player.pick_drafted}`;
  const identity = [player.pos, player.team_drafted ?? "—", pickStr, hw].filter(Boolean).join(" · ");

  // Block 2 — STILL ON ROOKIE DEAL. Deterministic from draft year + round (NOT
  // contract data): base CBA = 4 years; R1 appends the 5th-year team option (as an
  // option — never asserted as exercised); UDFA = 3-year deal, no option line.
  const dy = player.draft_year;
  let dealLine: string;
  if (isUDFA)                       dealLine = `Rookie deal through ${dy + 2}`;
  else if (player.rd_drafted === 1) dealLine = `Rookie deal through ${dy + 3} · + team option ${dy + 4}`;
  else                              dealLine = `Rookie deal through ${dy + 3}`;

  // Block 3 — ON THE FIELD. Exactly one path, mirroring the placement waterfall.
  const u = player.usage;
  let headline: ReactNode;
  let sparkPoints: Array<{ season: number; value: number | null }> = [];
  let sparkLabel = "";

  if (u && u.stPrimary) {
    // ST-primary: show the RAW stPercentile labeled ST (never a position-usage rank).
    headline = (
      <>
        <strong style={{ color: ivory }}>Core special-teamer</strong>
        {u.stPercentile != null && (
          <span style={{ color: dim }}> · {ordinal(Math.round(u.stPercentile))} pct ST snaps</span>
        )}
      </>
    );
    sparkPoints = u.stSeasons.map(s => ({ season: s.season, value: s.stShare }));
    sparkLabel = "ST snap share / season";
  } else if (u && u.qualified && u.careerUsagePercentile != null) {
    const tier = usageTierLabel(u.careerUsagePercentile) ?? "—";
    headline = (
      <>
        <strong style={{ color: ivory }}>{tier}</strong>
        <span style={{ color: dim }}> · {ordinal(u.careerUsagePercentile)} pct usage</span>
      </>
    );
    sparkPoints = (u.seasons ?? []).map(s => ({ season: s.season, value: s.snapPct }));
    sparkLabel = "snap share / season";
  } else {
    // Unqualified / strip — or a floor dot that hasn't snapped yet.
    const hasSeasons = (u?.seasons?.length ?? 0) > 0;
    if (chartMode === "floor" && !hasSeasons) {
      headline = <span style={{ color: dim }}>Yet to take an NFL snap</span>;
    } else {
      headline = <span style={{ color: dim }}>too few snaps to rank yet</span>;
    }
    sparkPoints = (u?.seasons ?? []).map(s => ({ season: s.season, value: s.snapPct }));
    sparkLabel = "snap share / season";
  }

  return (
    <div className="dm-tooltip" style={{ left: x, top: y, width: 250, background: "#0B2239", padding: 0, overflow: "hidden" }}>
      <div style={{ height: 4, background: strip }} />
      <div style={{ padding: "10px 12px" }}>
        {/* Block 1 — identity */}
        <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 13 }}>{player.name}</div>
        <div style={{ color: "rgba(245,240,232,0.65)", fontSize: 11, marginTop: 2 }}>{identity}</div>

        {/* Block 2 — still on rookie deal */}
        <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.12)" }}>
          <div style={{ fontSize: 9, letterSpacing: 0.6, color: "rgba(245,240,232,0.4)" }}>ROOKIE DEAL</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginTop: 2, color: "#F5F0E8" }}>STILL ON ROOKIE DEAL</div>
          <div style={{ fontSize: 11, color: dim, marginTop: 1 }}>{dealLine}</div>
        </div>

        {/* Block 3 — on the field */}
        <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.12)" }}>
          <div style={{ fontSize: 9, letterSpacing: 0.6, color: "rgba(245,240,232,0.4)" }}>ON THE FIELD</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>{headline}</div>
          {sparkPoints.some(p => p.value != null) && (
            <>
              <Sparkline points={sparkPoints} />
              <div style={{ fontSize: 9, color: "rgba(245,240,232,0.4)", marginTop: 1 }}>{sparkLabel}</div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 9, fontSize: 10, color: "rgba(245,240,232,0.4)" }}>
          › Click dot for full Player Card
        </div>
      </div>
    </div>
  );
}

// ── Chart borders ─────────────────────────────────────────────────────────────

function ChartBorders({ layout }: { layout: ChartLayout }) {
  const { margin, chartW, totalChartH } = layout;
  return (
    <g>
      <rect x={margin.left} y={0} width={chartW} height={4} fill="#0B2239" opacity={0.12} />
      <line
        x1={margin.left} y1={margin.top - 8}
        x2={margin.left} y2={margin.top + totalChartH + 8}
        stroke="rgba(11,34,57,0.12)" strokeWidth={1}
      />
    </g>
  );
}

// ── Viewbox animation helper ──────────────────────────────────────────────────

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function animateViewBox(
  from: [number, number, number, number],
  to: [number, number, number, number],
  durationMs: number,
  onFrame: (vb: string) => void,
  onDone: () => void,
): () => void {
  let rafId = 0;
  const start = performance.now();
  function frame(now: number) {
    const t = Math.min((now - start) / durationMs, 1);
    const e = easeInOut(t);
    const vb = from.map((f, i) => f + (to[i] - f) * e);
    onFrame(`${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`);
    if (t < 1) rafId = requestAnimationFrame(frame);
    else onDone();
  }
  rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}

// ── Mobile viewBox computation ────────────────────────────────────────────────

const MOBILE_PAD_L = 8;
const MOBILE_PAD_R = 16;

function posViewBox(
  layout: ChartLayout,
  posName: string,
): [number, number, number, number] {
  const x0 = (layout.colXMap[posName] ?? layout.margin.left) - MOBILE_PAD_L;
  const w  = (layout.colWidths[posName] ?? 120) + MOBILE_PAD_L + MOBILE_PAD_R;
  const EXTRA_TOP = 20;
  return [x0, layout.margin.top - EXTRA_TOP, w, layout.svgH - layout.margin.top + EXTRA_TOP];
}

function overviewViewBox(layout: ChartLayout): [number, number, number, number] {
  return [0, 0, layout.svgW, layout.svgH];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DraftChart({ year = 2026, initialPosition, initialStepId }: DraftChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Delta-2: Journey navigation state ────────────────────────────────────
  const [selectedYear,  setSelectedYear]  = useState<number>(year);
  const [currentStepId, setCurrentStepId] = useState<string>(() => {
    // Beat-3 collapses to ONE synthetic id 'act3'; the field is derived at render
    // time (selectClassState below). Map any legacy beat-3 id from the URL/seed.
    const raw = searchParams.get('step') ?? initialStepId ?? 'projection';
    return (raw === 'verdict' || raw === 'pending-field' || raw === 'floor') ? 'act3' : raw;
  });
  // isPlaying retained as a no-op latch (several handlers still clear it); the
  // auto-play button was removed with the multi-step bar (journey bar v3 navigates).
  const [, setIsPlaying] = useState(false);

  // Sync selectedYear when the URL year prop changes (e.g. back-button).
  // Skip the first run so a seeded initialStepId (e.g. "draft" on twin position
  // pages) isn't reset to 'projection' on mount.
  const didMountYearSync = useRef(false);
  useEffect(() => {
    if (!didMountYearSync.current) {
      didMountYearSync.current = true;
      return;
    }
    setSelectedYear(year);
    setCurrentStepId('projection');
    setIsPlaying(false);
  }, [year]);

  // Derive current journey step and chart mode
  const journeySteps = useMemo(() => getJourneySteps(selectedYear), [selectedYear]);
  const currentStep  = useMemo(
    () => journeySteps.find(s => s.id === currentStepId) ?? journeySteps[0],
    [journeySteps, currentStepId],
  );

  // chartMode is derived AFTER the players state is declared — beat 3 ('act3')
  // resolves its field from the loaded class data, not from a value captured at
  // click time. See the act3Mode useMemo further down.

  // ── Y-axis animation phase ────────────────────────────────────────────────
  type YAxisPhase = 'projection' | 'results';
  const [yAxisPhase, setYAxisPhase] = useState<YAxisPhase>('projection');
  const yAxisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Tier labels fire at Year 1 (player-production), not Draft Results.
    // Depend directly on currentStepId so the effect re-runs on every step change.
    const step = journeySteps.find(s => s.id === currentStepId);
    const isProduction = step?.mode === 'player-production' || step?.mode === 'career';

    if (yAxisTimerRef.current) clearTimeout(yAxisTimerRef.current);

    if (isProduction) {
      setYAxisPhase('results');
    } else {
      yAxisTimerRef.current = setTimeout(() => setYAxisPhase('projection'), 400);
    }

    return () => {
      if (yAxisTimerRef.current) clearTimeout(yAxisTimerRef.current);
    };
  }, [currentStepId, journeySteps]);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [players,   setPlayers]   = useState<Player[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const yearCache = useRef<Map<string, Player[]>>(new Map());
  // Phase-2 fetch guard: defer setPlayers while animation is running
  const isAnimatingRef        = useRef(false);
  const pendingFullPlayersRef = useRef<Player[] | null>(null);
  const scoredReadyRef        = useRef(false);
  const [scoredReady, setScoredReady] = useState(false);
  const [pickValueCurve, setPickValueCurve] = useState<PickValueEntry[]>([]);
  const [liveMode,  setLiveMode]  = useState(false);
  const [showLines, setShowLines] = useState(false);

  // ── Beat-3 ('act3') field — DERIVED at render time, not captured at click ──
  // selectClassState on an empty players array returns 'floor'; deriving here
  // (recomputed whenever `players` changes) self-corrects after a year's fetch
  // lands, so a beat-3 click fired mid-fetch can't stick 'floor' across a year
  // scrub. The three field modes are no longer distinct step ids — they fan out
  // from this one selector:
  //   resolved → the verdict jellyfish (brief b)
  //   pending  → the usage field (brief c)
  //   floor    → the 2026 capital-floor state (brief c)
  const act3Mode: ChartMode = useMemo(() => {
    const state = selectClassState(players, selectedYear);
    return state === 'resolved' ? 'verdict' : state === 'pending' ? 'pending' : 'floor';
  }, [players, selectedYear]);

  // 'act3' is a synthetic beat-3 step id not in getJourneySteps — its mode comes
  // from act3Mode above; everything else falls through to the step's own mode.
  const chartMode: ChartMode =
    currentStepId === 'act3' ? act3Mode : (currentStep?.mode ?? 'projection');

  // A "field" mode is any of the three Act-3 beat-3 fields (resolved/pending/floor).
  const isFieldMode = chartMode === 'verdict' || chartMode === 'pending' || chartMode === 'floor';

  // Derived viewMode for backward compat with existing chart/sidebar
  const legacyViewMode: ViewMode = chartMode === 'projection' ? 'projected' : 'drafted';

  // Reset showLines to true when entering a mode that supports trails
  useEffect(() => {
    if (chartMode === 'draft-results' || chartMode === 'player-production') {
      setShowLines(true);
    }
  }, [chartMode]);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [positionFilter, setPositionFilter] = useState<string[]>(() => {
    const pos = searchParams.get('pos');
    if (!pos) return initialPosition ? [initialPosition] : [];
    if (pos === 'offense') return ['RB', 'WR', 'TE', 'OT', 'IOL', 'QB'];
    if (pos === 'defense') return ['EDGE', 'DT', 'LB', 'CB', 'S'];
    return pos.split(',').filter(Boolean);
  });
  const [roundFilter,  setRoundFilter]  = useState<(number | 'UDFA')[]>([]);
  const [teamFilter,   setTeamFilter]   = useState<string[]>([]);
  const [schoolFilter, setSchoolFilter] = useState<string[]>([]);

  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);

  // ── "How to Read" modal ───────────────────────────────────────────────────
  const [htrOpen, setHtrOpen] = useState(false);

  // First-visit auto-open — once data has loaded.
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      if (!localStorage.getItem('dm_htr_seen')) {
        setHtrOpen(true);
      }
    }
  }, [loading]);

  // ── Legacy view mode (kept for animation, PlayerDots, UDFAZone, etc.) ───
  const [viewMode,    setViewMode]    = useState<ViewMode>('projected');
  const [isAnimating, setIsAnimating] = useState(false);

  // Keep animation/scoredReady refs in sync with state
  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);
  useEffect(() => { scoredReadyRef.current = scoredReady; }, [scoredReady]);

  // Flush deferred Phase-2 players the moment animation ends
  useEffect(() => {
    if (!isAnimating && pendingFullPlayersRef.current) {
      setPlayers(pendingFullPlayersRef.current);
      pendingFullPlayersRef.current = null;
    }
  }, [isAnimating]);

  // Load pick value curve once (static asset — no auth needed)
  useEffect(() => {
    fetch('/pick_value_curve.json')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPickValueCurve(data as PickValueEntry[]); })
      .catch(() => { /* non-fatal — production dots won't size by delta */ });
  }, []);

  // Keep viewMode in sync with chartMode for components that use viewMode
  useEffect(() => {
    setViewMode(legacyViewMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartMode]);

  // ── Mobile state ─────────────────────────────────────────────────────────
  const [isMobile,      setIsMobile]      = useState(false);
  const [mobilePosIdx,  setMobilePosIdx]  = useState(0);   // EDGE = 0
  const [mobileView,    setMobileView]    = useState<"overview" | "zoomed">("zoomed");
  const [mobileVB,      setMobileVB]      = useState<string | null>(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [isSwiping,     setIsSwiping]     = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const chartFrameRef  = useRef<HTMLDivElement>(null);
  const dragRef        = useRef<{ active: boolean; startX: number; scrollLeft: number }>({ active: false, startX: 0, scrollLeft: 0 });
  const touchStartX    = useRef(0);
  const touchStartY    = useRef(0);
  const touchStartTime = useRef(0);
  const cancelVBAnimRef = useRef<(() => void) | null>(null);
  const prefersReduced = useRef(false);

  // ── Derive view (column layout) from positionFilter ──────────────────────
  const DEF_POS = ['EDGE', 'DT', 'LB', 'CB', 'S'];
  const OFF_POS = ['RB', 'WR', 'TE', 'OT', 'IOL', 'QB'];
  const view: ChartView = useMemo(() => {
    if (positionFilter.length === 0) return 'all';
    const isAllDef = DEF_POS.every(p => positionFilter.includes(p)) && positionFilter.length === DEF_POS.length;
    const isAllOff = OFF_POS.every(p => positionFilter.includes(p)) && positionFilter.length === OFF_POS.length;
    if (isAllDef) return 'defense';
    if (isAllOff) return 'offense';
    return 'all';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionFilter]);

  // ── Filter computed values ────────────────────────────────────────────────
  const hasActiveFilters =
    positionFilter.length > 0 ||
    roundFilter.length > 0 ||
    teamFilter.length > 0 ||
    schoolFilter.length > 0;

  const availableTeams = useMemo(() => {
    // Deduplicate by TEAM_COLORS entry reference so "Pittsburgh Steelers" and "PIT"
    // don't appear as two separate entries for the same team.
    const seenEntries = new Set<object>();
    const teams: string[] = [];
    const addTeam = (raw: string) => {
      const entry = TEAM_COLORS[raw] ?? TEAM_COLORS[raw.toLowerCase()];
      if (entry) {
        if (!seenEntries.has(entry)) { seenEntries.add(entry); teams.push(raw); }
      } else {
        if (!teams.includes(raw)) teams.push(raw);
      }
    };
    players.forEach(p => {
      if (p.team_drafted) addTeam(p.team_drafted);
      (p.stepScores ?? []).forEach(s => { if (s.team) addTeam(s.team); });
    });
    return teams.sort();
  }, [players]);

  const availableSchools = useMemo(() =>
    Array.from(new Set(players.map(p => p.school).filter(Boolean) as string[])).sort(),
    [players]
  );

  // ── Layout ───────────────────────────────────────────────────────────────
  const layout = useMemo<ChartLayout>(
    () => computeChartLayout(players, view),
    [players, view],
  );

  const dotPositions = useMemo<DotPosition[]>(
    () => computeAllDotPositions(players, layout, pickValueCurve),
    [players, layout, pickValueCurve],
  );

  // Beat-3 field layout — built per field mode (resolved jellyfish / pending usage
  // field / 2026 capital floor). Null in the non-field journey steps.
  const jellyfishLayout = useMemo(() => {
    if (chartMode === 'verdict') return computeJellyfishLayout(players);
    if (chartMode === 'pending') return computePendingFieldLayout(players);
    if (chartMode === 'floor')   return computeFloorLayout(players, selectedYear);
    return null;
  }, [chartMode, players, selectedYear]);

  // Per-dot production Y positions and opacities for the current journey step.
  // Recomputed whenever the step or chart mode changes.
  const productionPositions = useMemo<Map<string, { y: number; opacity: number }>>(() => {
    const isProductionStep = chartMode === 'player-production' || chartMode === 'career';
    if (!isProductionStep) return new Map();
    const map = new Map<string, { y: number; opacity: number }>();
    for (const dp of dotPositions) {
      let score: number | null = null;
      if (chartMode === 'career') {
        score = dp.player.outcomeScore;
      } else {
        const entry = (dp.player.stepScores ?? []).find(s => s.stepId === currentStepId);
        score = entry?.score ?? null;
      }

      // ST-primary override: use global ST snap percentile for Y-position so
      // special-teams aces aren't understated by their tiny position-snap share.
      // Condition mirrors PlayerDots.tsx isSTprimary logic. Per-step only —
      // career uses outcomeScore, which already accounts for the career arc.
      if (score !== null && chartMode !== 'career') {
        const season = currentStepId ? parseInt(currentStepId, 10) : NaN;
        if (!isNaN(season)) {
          const row = dp.player.seasonData?.find(s => s.season === season);
          if (
            row &&
            row.stSnapCount != null && row.stSnapCount >= 50 &&
            row.snapCount   != null && row.stSnapCount > row.snapCount &&
            row.stSnapPct   != null
          ) {
            score = Math.min(stSnapPctToGlobalPercentile(row.stSnapPct), 62);
          }
        }
      }

      map.set(dp.player.player_id, {
        y:       scoreToProductionY(score, layout),
        opacity: score === null ? 0.35 : 1.0,
      });
    }
    return map;
  }, [dotPositions, currentStepId, chartMode, layout]);

  // Zone occupancy stats for the current draft class at the current journey step.
  // Drives the count/percentage readouts in the left-margin zone labels and the
  // Washed Out zone. Null in non-production steps (no career outcome to bucket).
  const zoneStats = useMemo(() => {
    const isProductionStep = chartMode === 'player-production' || chartMode === 'career';
    if (!isProductionStep) return null;

    const classPlayers = players.filter(p => p.draft_year === selectedYear);
    const total = classPlayers.length;
    if (total === 0) return null;

    let starter = 0, role = 0, fringe = 0, washedOut = 0;

    for (const player of classPlayers) {
      let score: number | null = null;
      if (chartMode === 'career') {
        score = player.outcomeScore ?? null;
      } else {
        const entry = (player.stepScores ?? []).find(s => s.stepId === currentStepId);
        score = entry?.score ?? null;
      }

      if (score === null)  washedOut++;
      else if (score >= 65) starter++;
      else if (score >= 25) role++;
      else                  fringe++;
    }

    const pct = (n: number) => Math.round((n / total) * 100);

    return {
      starter:   { count: starter,   pct: pct(starter)   },
      role:      { count: role,      pct: pct(role)      },
      fringe:    { count: fringe,    pct: pct(fringe)    },
      washedOut: { count: washedOut, pct: pct(washedOut) },
    };
  }, [players, selectedYear, chartMode, currentStepId]);

  // Positions that have data and are currently visible
  const visiblePositions = useMemo(
    () => layout.visiblePositions as string[],
    [layout],
  );

  // ── Detect mobile ─────────────────────────────────────────────────────────
  // Use matchMedia for both initial check and resize — same source as CSS, immune
  // to Brave fingerprint-resistance spoofing of window.innerWidth.
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    prefersReduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsMobile(mq.matches);
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── Clamp mobilePosIdx when visiblePositions changes ─────────────────────
  useEffect(() => {
    if (visiblePositions.length > 0) {
      setMobilePosIdx(i => Math.min(i, visiblePositions.length - 1));
    }
  }, [visiblePositions]);

  // ── Sync mobileVB with current position (non-animated) ───────────────────
  useEffect(() => {
    if (!isMobile || visiblePositions.length === 0 || loading) return;
    if (mobileView === "overview") {
      setMobileVB(overviewViewBox(layout).join(" "));
    } else {
      const pos = visiblePositions[mobilePosIdx];
      if (pos) {
        const [x, y, w, h] = posViewBox(layout, pos);
        setMobileVB(`${x} ${y} ${w} ${h}`);
      }
    }
  }, [isMobile, layout, mobilePosIdx, mobileView, visiblePositions, loading]);

  // ── Data fetch (two-phase for normal mode; single-fetch for live mode) ────
  useEffect(() => {
    let cancelled = false;
    const cacheKey  = `${selectedYear}`;
    const scoredKey = `${selectedYear}-scored`;

    // Live mode: preserve exact existing single-fetch behavior
    if (liveMode) {
      setLoading(true);
      fetch(`/api/draft?year=${selectedYear}&live=1`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(d => { if (!cancelled) { setPlayers(d.players ?? []); setLoading(false); } })
        .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
      return () => { cancelled = true; };
    }

    // Normal mode: skip all fetches if fully-scored data already cached
    if (yearCache.current.has(scoredKey)) {
      setPlayers(yearCache.current.get(scoredKey)!);
      setScoredReady(true);
      setLoading(false);
      return () => { cancelled = true; };
    }

    // Phase 1: fast fetch (no scores) — renders chart immediately
    setScoredReady(false);
    setLoading(true);
    fetch(`/api/draft?year=${selectedYear}&scores=0`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => {
        if (cancelled) return;
        const fast = d.players ?? [];
        yearCache.current.set(cacheKey, fast);
        setPlayers(fast);
        setLoading(false);

        // Phase 2: background fetch for full scored data
        fetch(`/api/draft?year=${selectedYear}`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
          .then(d2 => {
            if (cancelled) return;
            const full = d2.players ?? [];
            yearCache.current.set(scoredKey, full);
            setScoredReady(true);
            // Defer setPlayers if an animation is running — apply when it ends
            if (isAnimatingRef.current) {
              pendingFullPlayersRef.current = full;
            } else {
              setPlayers(full);
            }
          })
          .catch(() => { /* silent — chart is visible; scores arrive on next open */ });
      })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [selectedYear, liveMode]);

  // Auto-open player card if ?player= param is present on load
  useEffect(() => {
    if (players.length === 0) return;
    const playerParam = searchParams.get('player');
    if (!playerParam) return;
    const match = players.find(p => generateBaseSlug(p.name) === playerParam);
    if (match) setOpenPlayer(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // ── Opening animation (first visit, mobile only) ─────────────────────────
  useEffect(() => {
    if (!isMobile || loading || players.length === 0) return;
    const visited = localStorage.getItem("draftmap_visited");
    if (visited) {
      // Return visit: land in EDGE zoomed view
      setMobileView("zoomed");
      setMobilePosIdx(0);
      return;
    }

    if (prefersReduced.current) {
      localStorage.setItem("draftmap_visited", "1");
      setMobileView("zoomed");
      setMobilePosIdx(0);
      return;
    }

    // First visit animation
    const hasDraftResults = players.some(p => p.rd_drafted != null);
    const layout0 = computeChartLayout(players, view);
    const overviewVB = overviewViewBox(layout0);
    const edgePos = layout0.visiblePositions[0] ?? "EDGE";
    const edgeVB = posViewBox(layout0, edgePos);

    // Stage 1: show full overview
    setMobileView("overview");
    setMobileVB(overviewVB.join(" "));

    const t1 = setTimeout(() => {
      // Stage 2: animate zoom into EDGE
      cancelVBAnimRef.current?.();
      const cancel = animateViewBox(overviewVB, edgeVB, 600, setMobileVB, () => {
        setMobileView("zoomed");
        setMobilePosIdx(0);

        // Stage 3: animate dots if draft results exist
        if (hasDraftResults) {
          const t2 = setTimeout(() => {
            setIsAnimating(true);
            setViewMode("drafted");
            const layout1 = computeChartLayout(players, view);
            const dots1 = computeAllDotPositions(players, layout1, pickValueCurve);
            const longestDelay = dots1.length * 22 + 550;
            setTimeout(() => {
              setIsAnimating(false);
              localStorage.setItem("draftmap_visited", "1");
            }, longestDelay);
          }, 200);
          return () => clearTimeout(t2);
        } else {
          localStorage.setItem("draftmap_visited", "1");
        }
      });
      cancelVBAnimRef.current = cancel;
    }, 800);

    return () => {
      clearTimeout(t1);
      cancelVBAnimRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, loading, players.length]);

  // ── Position navigation helpers ───────────────────────────────────────────
  const goToPos = useCallback((idx: number, animated = true) => {
    if (idx < 0 || idx >= visiblePositions.length) return;
    const pos = visiblePositions[idx];
    if (!pos) return;

    if (!animated || prefersReduced.current) {
      setMobilePosIdx(idx);
      setMobileView("zoomed");
      return;
    }

    const fromVB = mobileView === "overview"
      ? overviewViewBox(layout)
      : posViewBox(layout, visiblePositions[mobilePosIdx] ?? pos);
    const toVB = posViewBox(layout, pos);

    cancelVBAnimRef.current?.();
    const cancel = animateViewBox(fromVB, toVB, 300, setMobileVB, () => {
      setMobilePosIdx(idx);
      setMobileView("zoomed");
    });
    cancelVBAnimRef.current = cancel;
    // NOTE: do NOT set mobileView here — the sync effect would race with the animation.
    // mobileView is set in the onDone callback once animation completes.
  }, [layout, mobileView, mobilePosIdx, visiblePositions]);

  const goToPrev = useCallback(() => goToPos(mobilePosIdx - 1), [goToPos, mobilePosIdx]);
  const goToNext = useCallback(() => goToPos(mobilePosIdx + 1), [goToPos, mobilePosIdx]);

  const goToOverview = useCallback(() => {
    if (prefersReduced.current) { setMobileView("overview"); return; }
    const fromVB = posViewBox(layout, visiblePositions[mobilePosIdx] ?? "EDGE");
    const toVB = overviewViewBox(layout);
    cancelVBAnimRef.current?.();
    const cancel = animateViewBox(fromVB, toVB, 400, setMobileVB, () => setMobileView("overview"));
    cancelVBAnimRef.current = cancel;
  }, [layout, mobilePosIdx, visiblePositions]);

  // ── Touch / swipe handling (mobile) ──────────────────────────────────────
  const SWIPE_THRESHOLD = 40;
  const LEFT_DEAD_ZONE  = 20;

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    touchStartX.current    = e.touches[0].clientX;
    touchStartY.current    = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsSwiping(false);
  }, [isMobile]);

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile || mobileView !== "zoomed") return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const elapsed = Date.now() - touchStartTime.current;

    // Skip if: more vertical than horizontal, too slow, or in left dead zone
    if (
      Math.abs(dx) < SWIPE_THRESHOLD ||
      Math.abs(dy) > Math.abs(dx) ||
      elapsed > 400 ||
      touchStartX.current <= LEFT_DEAD_ZONE
    ) {
      setIsSwiping(false);
      return;
    }

    setIsSwiping(false);
    if (dx < 0) goToNext(); // swipe left = next position
    else         goToPrev(); // swipe right = previous position
  }, [isMobile, mobileView, goToNext, goToPrev]);

  // Tap-to-skip opening animation
  const handleMobileChartTap = useCallback(() => {
    cancelVBAnimRef.current?.();
    cancelVBAnimRef.current = null;
    setIsAnimating(false);
    setMobileView("zoomed");
    setMobilePosIdx(0);
    if (visiblePositions[0]) {
      const [x, y, w, h] = posViewBox(layout, visiblePositions[0]);
      setMobileVB(`${x} ${y} ${w} ${h}`);
    }
    localStorage.setItem("draftmap_visited", "1");
  }, [layout, visiblePositions]);

  const updateURL = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const newSearch = params.toString();
    const path = window.location.pathname;
    router.replace(`${path}${newSearch ? `?${newSearch}` : ''}`, { scroll: false });
  }, [router, searchParams]);

  const handleOpenPlayer = useCallback((player: Player) => {
    setOpenPlayer(player);
    updateURL({ player: generateBaseSlug(player.name) });
  }, [updateURL]);

  const handleClosePlayer = useCallback(() => {
    setOpenPlayer(null);
    updateURL({ player: null });
  }, [updateURL]);

  // ── Filter change handlers ────────────────────────────────────────────────
  const handlePositionFilterChange = useCallback((positions: string[]) => {
    setPositionFilter(positions);
    const def = ['EDGE', 'DT', 'LB', 'CB', 'S'];
    const off = ['RB', 'WR', 'TE', 'OT', 'IOL', 'QB'];
    if (positions.length === 0) {
      updateURL({ pos: null });
    } else if (positions.length === def.length && def.every(p => positions.includes(p))) {
      updateURL({ pos: 'defense' });
    } else if (positions.length === off.length && off.every(p => positions.includes(p))) {
      updateURL({ pos: 'offense' });
    } else {
      updateURL({ pos: positions.join(',') });
    }
  }, [updateURL]);

  const handleRoundFilterChange = useCallback((rounds: (number | 'UDFA')[]) => {
    setRoundFilter(rounds);
    if (rounds.length === 0) {
      updateURL({ round: null });
    } else {
      updateURL({ round: rounds.join(',') });
    }
  }, [updateURL]);

  const handleTeamFilterChange = useCallback((teams: string[]) => {
    setTeamFilter(teams);
    updateURL({ team: teams.length === 0 ? null : teams.join(',') });
  }, [updateURL]);

  const handleSchoolFilterChange = useCallback((schools: string[]) => {
    setSchoolFilter(schools);
    updateURL({ school: schools.length === 0 ? null : schools.join(',') });
  }, [updateURL]);

  const handleClearAllFilters = useCallback(() => {
    setPositionFilter([]);
    setRoundFilter([]);
    setTeamFilter([]);
    setSchoolFilter([]);
    updateURL({ pos: null, round: null, team: null, school: null });
  }, [updateURL]);

  // ── HeaderZone handlers ───────────────────────────────────────────────────
  const handleYearChange = useCallback((newYear: number) => {
    setSelectedYear(newYear);
    setCurrentStepId('projection');
    setIsPlaying(false);
    router.replace(`/draft/${newYear}`, { scroll: false });
  }, [router]);

  // Shared step-animation logic — used by both manual clicks and auto-play.
  // Does NOT touch isPlaying so auto-play can call it without killing itself.
  const animateToStep = useCallback((stepId: string) => {
    // Projection → Draft Results: animate dots from projected to actual positions.
    // Don't set currentStepId until animation completes — doing it early triggers
    // the chartMode useEffect which instantly snaps viewMode, killing the transition.
    // Check viewMode (not currentStepId) because the sidebar toggle can set
    // currentStepId='draft' while viewMode stays 'projected'.
    if (stepId === 'draft' && viewMode === 'projected') {
      setIsAnimating(false);
      setViewMode("projected");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
          setViewMode("drafted");
          const longestDelay = dotPositions.length * 22 + 550;
          setTimeout(() => {
            setIsAnimating(false);
            setCurrentStepId('draft');
          }, longestDelay);
        });
      });
      return;
    }

    // Production steps (year-N or career): animate dots vertically to ARC score positions.
    // Setting currentStepId triggers productionPositions recomputation → new cy values.
    // CSS transitions on each dot handle the staggered animation.
    const targetStep = journeySteps.find(s => s.id === stepId);
    if (targetStep?.mode === 'player-production' || targetStep?.mode === 'career') {
      if (!scoredReadyRef.current) return;
      setIsAnimating(true);
      setCurrentStepId(stepId);
      const longestDelay = dotPositions.length * 22 + 550;
      setTimeout(() => {
        setIsAnimating(false);
      }, longestDelay);
      return;
    }

    setCurrentStepId(stepId);
  }, [viewMode, dotPositions.length, journeySteps]);

  // Manual step click — stops auto-play then delegates to animateToStep.
  const handleStepChange = useCallback((stepId: string) => {
    setIsPlaying(false);
    animateToStep(stepId);
  }, [animateToStep]);

  // ── Journey Bar v3: three beats → step ids ────────────────────────────────
  // Beat 1 THE BOARD → projection · Beat 2 DRAFT DAY → draft ·
  // Beat 3 "4 YEARS LATER" → verdict (resolved class) or career (pending class).
  const activeBeat: 1 | 2 | 3 =
    chartMode === 'projection'    ? 1 :
    chartMode === 'draft-results' ? 2 :
    3; // player-production / career / verdict

  const handleSelectBeat = useCallback((beat: 1 | 2 | 3) => {
    setIsPlaying(false);
    if (beat === 1) { animateToStep('projection'); return; }
    if (beat === 2) { animateToStep('draft'); return; }
    // Beat 3 — ONE synthetic id. The field is derived at render time from the
    // loaded class data (act3Mode), NOT captured here, so a click fired while a
    // year's fetch is still in flight self-corrects once the data lands (all
    // instant; the 2→3 pivot animation is Epsilon 5 and does not exist yet).
    setCurrentStepId('act3');
  }, [animateToStep]);

  // ── Desktop event handlers ────────────────────────────────────────────────
  const handleDotClick = useCallback((player: Player) => {
    setTooltip(null);
    handleOpenPlayer(player);
  }, [handleOpenPlayer]);

  const handleDotHover = useCallback((player: Player, clientX: number, clientY: number) => {
    if (isMobile) return;
    // Safety net: check matchMedia directly in case isMobile state is still false
    // during the brief window between mount and the first useEffect run.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) return;
    const nearRight = clientX > window.innerWidth - 280;
    setTooltip({ player, x: nearRight ? clientX - 248 : clientX + 40, y: clientY - 115 });
  }, [isMobile]);

  const handleDotLeave   = useCallback(() => setTooltip(null), []);
  const dismissTooltip   = useCallback(() => setTooltip(null), []);
  const handleLiveToggle = useCallback(() => setLiveMode(l => !l), []);
  const handleShowLinesToggle = useCallback(() => setShowLines(l => !l), []);

  // ── Desktop drag-to-scroll ────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const frame = chartFrameRef.current;
    if (!frame) return;
    dragRef.current = { active: true, startX: e.pageX, scrollLeft: frame.scrollLeft };
    frame.style.cursor = "grabbing";
    e.preventDefault();
  }, [isMobile]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    const frame = chartFrameRef.current;
    if (!frame) return;
    frame.scrollLeft = d.scrollLeft - (e.pageX - d.startX);
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current.active = false;
    if (chartFrameRef.current) chartFrameRef.current.style.cursor = "grab";
  }, []);

  // ── Sidebar props (shared between desktop sidebar and mobile drawer) ───────
  const sidebarProps = {
    positionFilter,
    onPositionFilterChange: handlePositionFilterChange,
    roundFilter,
    onRoundFilterChange: handleRoundFilterChange,
    teamFilter,
    onTeamFilterChange: handleTeamFilterChange,
    schoolFilter,
    onSchoolFilterChange: handleSchoolFilterChange,
    onClearAllFilters: handleClearAllFilters,
    liveMode,
    onLiveModeToggle: handleLiveToggle,
    showLines,
    onShowLinesToggle: handleShowLinesToggle,
    chartMode,
    availableTeams,
    availableSchools,
    hasActiveFilters,
  };

  // ── Default mobile viewBox (EDGE zoomed) before state settles ────────────
  const defaultMobileVB = useMemo(() => {
    const pos = visiblePositions[0];
    if (!pos) return `0 0 ${layout.svgW} ${layout.svgH}`;
    const [x, y, w, h] = posViewBox(layout, pos);
    return `${x} ${y} ${w} ${h}`;
  }, [layout, visiblePositions]);

  // ── Zoomed-mobile derived values (Group 2: chart structure) ──────────────
  const isZoomedMobile = isMobile && mobileView === "zoomed";
  const currentMobilePos = isZoomedMobile ? (visiblePositions[mobilePosIdx] ?? null) : null;
  const mobileZoomedViewBoxW = currentMobilePos
    ? (layout.colWidths[currentMobilePos] ?? 120) + MOBILE_PAD_L + MOBILE_PAD_R
    : 0;
  const mobileZoomedX = currentMobilePos !== null
    ? (layout.colXMap[currentMobilePos] ?? layout.margin.left) - MOBILE_PAD_L
    : undefined;

  // Live viewBox x parsed from the animated mobileVB string so round-tick
  // labels stay at the left edge even during the 300ms column-pan animation
  // (mobileZoomedX only updates after animation completes).
  const mobileVBX = useMemo(() => {
    if (!mobileVB) return mobileZoomedX ?? 0;
    const x = parseFloat(mobileVB);
    return isNaN(x) ? (mobileZoomedX ?? 0) : x;
  }, [mobileVB, mobileZoomedX]);

  const tierAxisVisible = yAxisPhase === 'results';
  const tierBandsHiding = yAxisPhase === 'results';
  const showTierArrows  = chartMode === 'projection' || chartMode === 'draft-results';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="dm-app-layout">
      {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
      <Sidebar {...sidebarProps} />

      {/* ── Mobile top bar ── */}
      {isMobile && !loading && !error && !isFieldMode && (
        <MobileTopBar
          posLabel={visiblePositions[mobilePosIdx] ?? ""}
          posIdx={mobilePosIdx}
          totalPositions={visiblePositions.length}
          mobileView={mobileView}
          viewMode={viewMode}
          year={selectedYear}
          onPrev={goToPrev}
          onNext={goToNext}
          onMiniMapTap={mobileView === "zoomed" ? goToOverview : () => goToPos(0)}
        />
      )}

      {/* ── Main chart area ── */}
      <main className="dm-main" onClick={dismissTooltip}>

        {/* ── HeaderZone: year scrubber + journey bar ── */}
        <HeaderZone
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          availableYears={[...VALID_DRAFT_YEARS]}
          activeBeat={activeBeat}
          onSelectBeat={handleSelectBeat}
        />

        {loading && null}
        {error && <div className="dm-state-msg dm-state-error"><p>Failed to load chart: {error}</p></div>}

        {!loading && !error && (
          <div
            className="dm-chart-frame"
            ref={chartFrameRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={isMobile && mobileView === "overview" ? handleMobileChartTap : undefined}
          >
            {isFieldMode && jellyfishLayout ? (
              <JellyfishField
                layout={jellyfishLayout}
                isMobile={isMobile}
                onDotClick={handleDotClick}
                onDotHover={handleDotHover}
                onDotLeave={handleDotLeave}
              />
            ) : (
            <svg
              width={isMobile ? "100%" : layout.svgW}
              height={isMobile ? undefined : layout.svgH}
              viewBox={isMobile ? (mobileVB ?? defaultMobileVB) : undefined}
              style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
            >
              <defs>
                <linearGradient
                  id="tierPillGradient"
                  x1="0" y1={layout.tierBandDefs[0].y1}
                  x2="0" y2={layout.margin.top + layout.totalChartH}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%"   stopColor="#D4A017" stopOpacity={0.88} />
                  <stop offset="100%" stopColor="#D4A017" stopOpacity={0.08} />
                </linearGradient>
                <filter id="wavy-outline" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="turbulence" baseFrequency="0.08" numOctaves="2" seed="2" result="noise"/>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
              </defs>
              <TierBands
                key={`bands-${selectedYear}`}
                layout={layout}
                labelsHiding={tierBandsHiding}
                prefersReducedMotion={prefersReduced.current}
              />
              {showTierArrows && <TierArrows layout={layout} />}
              <TierAxisLabels
                key={`tier-labels-${selectedYear}`}
                layout={layout}
                visible={tierAxisVisible}
                prefersReducedMotion={prefersReduced.current}
                isMobile={isMobile}
                draftYear={selectedYear}
                currentStep={currentStep}
                zoneStats={zoneStats}
              />
              <PositionColumns
                layout={layout}
                isZoomedMobile={isZoomedMobile}
                onHowToReadClick={() => setHtrOpen(true)}
                linkYear={selectedYear}
              />
              <RoundZones layout={layout} mobileZoomedX={mobileZoomedX} mobileZoomedViewBoxW={mobileZoomedViewBoxW} chartMode={chartMode} />
              <UDFAZone
                layout={layout}
                viewMode={viewMode}
                chartMode={chartMode}
                isZoomedMobile={isZoomedMobile}
                viewBoxX={mobileZoomedX}
                viewBoxW={mobileZoomedViewBoxW || undefined}
                washedOutStat={zoneStats?.washedOut ?? null}
              />
              <PlayerDots
                dotPositions={dotPositions}
                liveMode={liveMode}
                viewMode={viewMode}
                chartMode={chartMode}
                currentStepId={currentStepId}
                isAnimating={isAnimating}
                showLines={showLines}
                isMobile={isMobile}
                isZoomedMobile={isZoomedMobile}
                productionPositions={productionPositions}
                onDotClick={handleDotClick}
                onDotHover={handleDotHover}
                onDotLeave={handleDotLeave}
                positionFilter={positionFilter}
                roundFilter={roundFilter}
                teamFilter={teamFilter}
                schoolFilter={schoolFilter}
              />
              {isZoomedMobile && currentMobilePos && (
                <MobilePlayerLabels
                  dotPositions={dotPositions}
                  currentPos={currentMobilePos}
                  viewMode={viewMode}
                  viewBoxX={mobileZoomedX ?? 0}
                  viewBoxW={mobileZoomedViewBoxW}
                  viewBoxTop={layout.margin.top}
                />
              )}
              {isZoomedMobile && (
                <MobileRoundTicks
                  layout={layout}
                  viewBoxX={mobileVBX}
                  viewBoxW={mobileZoomedViewBoxW}
                />
              )}
              <ChartBorders layout={layout} />
            </svg>
            )}
          </div>
        )}
      </main>

      {/* ── Mobile pagination dots ── */}
      {isMobile && !loading && !error && !isFieldMode && (
        <div className="mb-pagination" aria-hidden="true">
          {visiblePositions.map((pos, i) => (
            <div
              key={pos}
              className={[
                "mb-dot",
                i === mobilePosIdx && mobileView === "zoomed" ? "mb-dot--active" : "",
                isSwiping ? "mb-dot--swiping" : "",
              ].join(" ")}
            />
          ))}
        </div>
      )}

      {/* ── Mobile handle bar + drawer (always in DOM; CSS hides on desktop) ── */}
      <MobileHandleBar
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        sidebarProps={sidebarProps}
      />

      {/* ── Desktop floating tooltip ── */}
      {!isMobile && tooltip && (
        chartMode === 'verdict'
          ? <VerdictHoverCard {...tooltip} noneCount={jellyfishLayout?.noneCount ?? 0} />
          : (chartMode === 'pending' || chartMode === 'floor')
            ? <PendingHoverCard {...tooltip} chartMode={chartMode} />
            : <ChartTooltip {...tooltip} />
      )}

      {/* ── "How to Read" modal ── */}
      <HowToReadModal open={htrOpen} onClose={() => setHtrOpen(false)} />

      {/* ── Player card (modal on desktop, bottom sheet on mobile) ── */}
      <PlayerCard
        player={openPlayer}
        players={players}
        onClose={handleClosePlayer}
        isMobile={isMobile}
        playerSlug={openPlayer ? generateBaseSlug(openPlayer.name) : undefined}
        currentStepId={currentStepId}
      />
    </div>
  );
}
