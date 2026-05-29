"use client";

import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Player } from "@/lib/sheets";
import { VALID_DRAFT_YEARS } from "@/lib/draftYears";
import { generateBaseSlug } from "@/lib/slugs";
import {
  computeChartLayout,
  computeAllDotPositions,
  scoreToProductionY,
  type ChartLayout,
  type DotPosition,
  type ChartView,
} from "@/lib/chartMath";
import { getJourneySteps, type ChartMode } from "@/lib/dataAvailability";
import PlayerCard from "@/components/PlayerCard";
import TierBands from "@/components/chart/TierBands";
import TierArrows from "@/components/chart/TierArrows";
import TierAxisLabels from "@/components/chart/TierAxisLabels";
import PositionColumns from "@/components/chart/PositionColumns";
import RoundZones from "@/components/chart/RoundZones";
import PlayerDots from "@/components/chart/PlayerDots";
import UDFAZone from "@/components/chart/UDFAZone";
import HeaderZone from "@/components/HeaderZone";
import Sidebar, {
  type ViewMode,
  type AnimationState,
} from "@/components/Sidebar";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileHandleBar from "@/components/mobile/MobileHandleBar";
import MobilePlayerLabels from "@/components/chart/MobilePlayerLabels";
import MobileRoundTicks from "@/components/chart/MobileRoundTicks";


// ── Props ─────────────────────────────────────────────────────────────────────

interface DraftChartProps {
  year?: number;
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

export default function DraftChart({ year = 2026 }: DraftChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Delta-2: Journey navigation state ────────────────────────────────────
  const [selectedYear,  setSelectedYear]  = useState<number>(year);
  const [currentStepId, setCurrentStepId] = useState<string>(() =>
    searchParams.get('step') ?? 'projection'
  );
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync selectedYear when the URL year prop changes (e.g. back-button)
  useEffect(() => {
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
  const chartMode: ChartMode = currentStep?.mode ?? 'projection';

  // Derived viewMode for backward compat with existing chart/sidebar
  const legacyViewMode: ViewMode = chartMode === 'projection' ? 'projected' : 'drafted';

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

  // ── Play button auto-advance ──────────────────────────────────────────────
  // Use a ref so the interval closure stays stable (only depends on isPlaying).
  // The ref is updated every render so it always sees current state without
  // the interval needing to be torn down and recreated on every step change.
  // isAnimating guard prevents advancing mid-animation (dot transition can take
  // several seconds — don't skip to the next step while dots are still moving).
  const advanceStepRef = useRef<(() => void) | null>(null);
  advanceStepRef.current = () => {
    if (isAnimating) return;
    const currentIdx = journeySteps.findIndex(s => s.id === currentStepId);
    if (currentIdx === journeySteps.length - 1) {
      setIsPlaying(false);
      return;
    }
    animateToStep(journeySteps[currentIdx + 1].id);
  };

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => advanceStepRef.current?.(), 1500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [players,   setPlayers]   = useState<Player[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const yearCache = useRef<Map<string, Player[]>>(new Map());
  const [liveMode,  setLiveMode]  = useState(false);
  const [showLines, setShowLines] = useState(false);

  // Reset showLines to true when entering a mode that supports trails
  useEffect(() => {
    if (chartMode === 'draft-results' || chartMode === 'player-production') {
      setShowLines(true);
    }
  }, [chartMode]);
  const [view,      setView]      = useState<ChartView>(() => {
    const pos = searchParams.get('pos');
    if (pos === 'offense' || pos === 'defense') return pos;
    return 'all';
  });
  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);

  // ── View/animation state (legacy — kept for Sidebar backward compat) ─────
  const [viewMode,    setViewMode]    = useState<ViewMode>(() =>
    searchParams.get('mode') === 'drafted' ? 'drafted' : 'projected'
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [animState,   setAnimState]   = useState<AnimationState>({ playing: false, step: 0 });

  // Keep legacyViewMode in sync with chartMode for components that use viewMode
  useEffect(() => {
    setViewMode(legacyViewMode);
    setAnimState(s => ({
      ...s,
      step: legacyViewMode === 'drafted' ? 1 : 0,
      playing: false,
    }));
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

  // ── Layout ───────────────────────────────────────────────────────────────
  const layout = useMemo<ChartLayout>(
    () => computeChartLayout(players, view),
    [players, view],
  );

  const dotPositions = useMemo<DotPosition[]>(
    () => computeAllDotPositions(players, layout),
    [players, layout],
  );

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
      map.set(dp.player.player_id, {
        y:       scoreToProductionY(score, layout),
        opacity: score === null ? 0.35 : 1.0,
      });
    }
    return map;
  }, [dotPositions, currentStepId, chartMode, layout]);

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
      setLoading(false);
      return () => { cancelled = true; };
    }

    // Phase 1: fast fetch (no scores) — renders chart immediately
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
            setPlayers(full);
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
            setAnimState({ playing: true, step: 1 });
            const layout1 = computeChartLayout(players, view);
            const dots1 = computeAllDotPositions(players, layout1);
            const longestDelay = dots1.length * 22 + 550;
            setTimeout(() => {
              setAnimState(s => ({ ...s, playing: false }));
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

  // ── Desktop animation controls ───────────────────────────────────────────
  const handlePlay = useCallback(() => {
    // Step 1: Reset to projection (instant — no CSS transition yet)
    setIsAnimating(false);
    setViewMode("projected");
    setCurrentStepId("projection");
    setAnimState({ playing: false, step: 0 });
    setIsPlaying(false);

    // Step 2: Double rAF ensures the browser paints the projected state before
    // we flip isAnimating=true. Without this, React batches both updates into
    // the same paint frame and the CSS transition has nothing to animate from.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
        setViewMode("drafted");
        setAnimState({ playing: true, step: 1 });
        const longestDelay = dotPositions.length * 22 + 550;
        setTimeout(() => {
          setAnimState(s => ({ ...s, playing: false }));
          setIsAnimating(false);
          setCurrentStepId("draft"); // switch to draft-results for tier colors
        }, longestDelay);
      });
    });
  }, [dotPositions.length]);

  const handlePause = useCallback(() => {
    setAnimState(s => ({ ...s, playing: false }));
    setIsAnimating(false);
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsAnimating(false);
    setIsPlaying(false);
    setCurrentStepId("projection");
    setAnimState({ playing: false, step: 0 });
  }, []);

  const handleStepForward = useCallback(() => {
    setIsAnimating(false);
    setIsPlaying(false);
    setCurrentStepId("draft");
    setAnimState({ playing: false, step: 1 });
  }, []);

  const handleStepBack = useCallback(() => {
    setIsAnimating(false);
    setIsPlaying(false);
    setCurrentStepId("projection");
    setAnimState({ playing: false, step: 0 });
  }, []);

  const handleJumpEnd = useCallback(() => {
    setIsAnimating(false);
    setIsPlaying(false);
    setCurrentStepId("draft");
    setAnimState({ playing: false, step: 1 });
  }, []);

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

  const handleSetView = useCallback((v: ChartView) => {
    setView(v);
    updateURL({ pos: v === 'all' ? null : v });
  }, [updateURL]);

  const handleOpenPlayer = useCallback((player: Player) => {
    setOpenPlayer(player);
    updateURL({ player: generateBaseSlug(player.name) });
  }, [updateURL]);

  const handleClosePlayer = useCallback(() => {
    setOpenPlayer(null);
    updateURL({ player: null });
  }, [updateURL]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setIsAnimating(false);
    setViewMode(mode);
    setAnimState(s => ({ ...s, step: mode === "drafted" ? 1 : 0, playing: false }));
    // Mirror legacy viewMode change into journey step
    setCurrentStepId(mode === 'drafted' ? 'draft' : 'projection');
    setIsPlaying(false);
    updateURL({ mode: mode === 'projected' ? null : mode });
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
      setAnimState({ playing: false, step: 0 });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
          setViewMode("drafted");
          setAnimState({ playing: true, step: 1 });
          const longestDelay = dotPositions.length * 22 + 550;
          setTimeout(() => {
            setAnimState(s => ({ ...s, playing: false }));
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

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(p => {
      if (!p) {
        // If at last step, reset to start before playing
        const steps = getJourneySteps(selectedYear);
        if (currentStepId === steps[steps.length - 1]?.id) {
          setCurrentStepId('projection');
        }
      }
      return !p;
    });
  }, [selectedYear, currentStepId]);

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
    viewMode, onViewModeChange: handleViewModeChange,
    animState, onPlay: handlePlay, onPause: handlePause, onReset: handleReset,
    onStepBack: handleStepBack, onStepForward: handleStepForward, onJumpEnd: handleJumpEnd,
    view, onViewChange: handleSetView,
    year: selectedYear, liveMode, onLiveModeToggle: handleLiveToggle,
    showLines, onShowLinesToggle: handleShowLinesToggle,
    chartMode,
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
      {isMobile && !loading && !error && (
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
          currentStepId={currentStepId}
          onStepChange={handleStepChange}
          availableYears={[...VALID_DRAFT_YEARS]}
          isPlaying={isPlaying}
          onPlayToggle={handlePlayToggle}
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
              />
              <PositionColumns layout={layout} isZoomedMobile={isZoomedMobile} />
              <RoundZones layout={layout} mobileZoomedX={mobileZoomedX} mobileZoomedViewBoxW={mobileZoomedViewBoxW} chartMode={chartMode} />
              <UDFAZone
                layout={layout}
                viewMode={viewMode}
                chartMode={chartMode}
                isZoomedMobile={isZoomedMobile}
                viewBoxX={mobileZoomedX}
                viewBoxW={mobileZoomedViewBoxW || undefined}
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
          </div>
        )}
      </main>

      {/* ── Mobile pagination dots ── */}
      {isMobile && !loading && !error && (
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
      {!isMobile && tooltip && <ChartTooltip {...tooltip} />}

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
