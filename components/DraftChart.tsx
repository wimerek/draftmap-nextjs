"use client";

import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Player, SearchIndexEntry } from "@/lib/sheets";
import { VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR, DEFAULT_LANDING_YEAR } from "@/lib/draftYears";
import { TEAM_COLORS, SCHOOL_COLORS, teamDotColors, sameTeam, resolveTeamName } from "@/lib/chartConstants";
import { generateBaseSlug } from "@/lib/slugs";
import { posRankMap } from "@/lib/twinData";
import { classifyDraftMove, teamCodeFromFullName, type DraftMove } from "@/lib/scoreboardStats";
import type { MoneyBand } from "@/lib/verdict";
import { isPlayerFiltered } from "@/lib/lensFilter";
import {
  computeChartLayout,
  computeAllDotPositions,
  computeJellyfishLayout,
  computePendingFieldLayout,
  computeFloorLayout,
  computeAct3FieldLayout,
  scoreToProductionY,
  stSnapPctToGlobalPercentile,
  type ChartLayout,
  type DotPosition,
  type ChartView,
  type PickValueEntry,
} from "@/lib/chartMath";
import { getJourneySteps, type ChartMode } from "@/lib/dataAvailability";
import { selectClassState } from "@/lib/classMaturity";
import { useFirstSessionHints } from "@/lib/useFirstSessionHints";
import { usageTierLabel, DEFAULT_SPEED, KP_STRIP_COPY } from "@/lib/act3Constants";
import { fmtHeight } from "@/lib/utils";
import JellyfishField from "@/components/chart/JellyfishField";
import Act3Field from "@/components/chart/Act3Field";
import Act3Choreography from "@/components/chart/Act3Choreography";
import { computeAct3Choreography, computeSweep } from "@/lib/choreography";
import { ACT3_FIELD_VERSION } from "@/lib/act3FieldConstants";
import PlayerCard from "@/components/PlayerCard";
import PlayerSearch from "@/components/PlayerSearch";
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

/** Shape of the /api/draft JSON payload (rider 2 adds `unmatched`). */
interface DraftApiResponse {
  year: number;
  count: number;
  players: Player[];
  /** Resolved-class verdict join failures (rider 2). Absent on older cached responses. */
  unmatched?: string[];
}

// ── Hover cards (desktop only) ────────────────────────────────────────────────
// One card system across all three acts: navy #0B2239, parchment text, a color top
// strip following the journey step (school → drafted team → career team), three
// blocks with the middle one evolving per act. Legacy ChartTooltip removed —
// Act 1 = Act1HoverCard, Act 2 + leftover post-draft modes = Act2HoverCard.

interface TooltipState {
  player: Player;
  x: number;
  y: number;
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

/**
 * SIX-BAND money hero + deal line + tag/option note (Phase Lambda reframe — the old
 * five-tier heroes are dead). Block label is "THE SECOND CONTRACT", never "verdict".
 * Heroes are FACTUAL (voice = data-tells-the-story, no editorial adjectives) and use
 * the same money vocabulary as the chart's wall. The never-re-signed base-rate reads
 * LIVE off the class NEVER count (denominator sweep — no hand-carried literal).
 */
function verdictBlock2(
  v: NonNullable<Player["verdict"]>,
  neverCount: number,
): { hero: string; gold: boolean; sub: string | null; deal: string | null; tagLine: string | null } {
  const gtd = fmtMoney(v.gtdDollars);
  const yrs = v.contractYears ?? "—";
  const dealGtd = `${yrs} yr · ${gtd} guaranteed`;

  // Tag / option note (SPIKE RESOLUTION #4) — hover-only, no glyph, no band shift. Reads
  // the tag_option column; the line keeps the ladder from understating a franchise tag
  // (which reads MIDDLE by construction) or a fifth-year option (a rookie-deal mechanism).
  let tagLine: string | null = null;
  if (v.tagOption === "franchise_tag") tagLine = "Franchise tagged — one year at top-5-level pay";
  else if (v.tagOption === "5th_year_option") tagLine = "Fifth-year option exercised.";

  switch (v.moneyBand) {
    case "TOP5":
      return { hero: "TOP-OF-MARKET MONEY", gold: true, sub: null, deal: dealGtd, tagLine };
    case "TOP10":
      return { hero: "TOP-OF-POSITION MONEY", gold: false, sub: null, deal: dealGtd, tagLine };
    case "MIDDLE":
      return { hero: "MIDDLE-OF-MARKET MONEY", gold: false, sub: null, deal: dealGtd, tagLine };
    case "MIN":
      return { hero: "MINIMUM-LEVEL MONEY", gold: false, sub: null, deal: dealGtd, tagLine };
    case "ZERO":
      return { hero: "SIGNED, $0 GUARANTEED", gold: false, sub: null,
        deal: `${yrs} yr · $0 guaranteed`, tagLine };
    case "NEVER":
      return { hero: "NEVER RE-SIGNED", gold: false,
        sub: `one of ${neverCount} never re-signed`, deal: null, tagLine };
    default:
      // money_band null = K/P/LS (out of the money market) — not plotted on the field,
      // so not normally hovered. Minimal honest fallback if one is ever reached.
      return { hero: "SECOND CONTRACT", gold: false, sub: null,
        deal: v.gtdDollars != null ? dealGtd : null, tagLine };
  }
}

function VerdictHoverCard({ player, x, y, neverCount }: TooltipState & { neverCount: number }) {
  const v = player.verdict;
  // Dot-fill treatment (no luminance flip). Dot-color doctrine (§1): the Act-3 dot wears
  // the PAYING team, so the strip follows signingTeam (falling back to drafted for a
  // never-re-signed / unsigned player, where signingTeam is null).
  const strip = teamDotColors(v?.signingTeam ?? player.team_drafted).fill;
  const ivory = "#F5F0E8";

  // Team codes for the compact both-teams identity line.
  const codeOf = (t: string | null | undefined): string =>
    t ? teamCodeFromFullName(resolveTeamName(t)) : "—";

  const hw = `${fmtHeight(player.height)}${player.weight ? `, ${player.weight} lb` : ""}`;
  const isUDFA = !(player.pick_drafted && player.pick_drafted > 0);
  const payTeam = v?.signingTeam ?? null;
  // Guardrail (§3f): a UDFA (synthetic "round 8" pick internally) NEVER surfaces a pick
  // number — the hover says "Undrafted", full stop.
  const originStr = isUDFA
    ? "Undrafted"
    : `Drafted ${codeOf(player.team_drafted)} · Pick ${player.pick_drafted}`;
  // Both-teams identity (§3b): show the payer only when it differs from the drafting
  // team; when equal, the origin line already carries it (one team, once).
  const differs = payTeam && !sameTeam(payTeam, player.team_drafted ?? "");
  const paidStr = differs ? ` · Paid by ${codeOf(payTeam)}` : "";
  const identity = [player.pos, `${originStr}${paidStr}`, hw].filter(Boolean).join(" · ");

  const b2 = v ? verdictBlock2(v, neverCount) : null;

  // Block 3 — usage. The Act-3 dot is placed by window_usage (first four seasons), NOT
  // career usage (the Player Card figure). Name the window so the dot and the card can
  // never appear to disagree (§3a). Strip members (window_usage null) mirror the field's
  // too-few-snaps strip.
  const usage = player.usage;
  let block3: ReactNode = <span style={{ color: "rgba(245,240,232,0.5)" }}>—</span>;
  if (usage) {
    if (usage.stPrimary && usage.stripMember) {
      // ST-in-strip case (§3e verbatim): an ST-primary player whose scrimmage snaps
      // fall below the ranking threshold sits in the too-few-snaps strip.
      block3 = (
        <span style={{ color: "rgba(245,240,232,0.7)" }}>
          special-teams primary; scrimmage snaps below threshold
        </span>
      );
    } else if (!usage.stripMember && usage.windowUsagePercentile != null) {
      const tier = usageTierLabel(usage.windowUsagePercentile) ?? "—";
      block3 = (
        <>
          <strong style={{ color: ivory }}>{tier}</strong>
          <span style={{ color: "rgba(245,240,232,0.7)" }}>
            {" "}· {ordinal(usage.windowUsagePercentile)} pct usage · first four seasons
          </span>
        </>
      );
    } else {
      // Strip member — too few snaps to rank across the window; raw window share if any.
      const sharePct = usage.windowUsage != null ? `${Math.round(usage.windowUsage * 100)}% snaps` : "—";
      block3 = (
        <span style={{ color: "rgba(245,240,232,0.7)" }}>
          {sharePct} · too few snaps to rank · first four seasons
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
            {b2.tagLine && <div style={{ fontSize: 11, color: "rgba(245,240,232,0.55)", marginTop: 2, fontStyle: "italic" }}>{b2.tagLine}</div>}
          </div>
        )}

        {/* Block 3 — on the field */}
        <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.12)" }}>
          <div style={{ fontSize: 9, letterSpacing: 0.6, color: "rgba(245,240,232,0.4)" }}>ON THE FIELD</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>{block3}</div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 9, fontSize: 10, color: "rgba(245,240,232,0.4)" }}>
          › Click dot for the full Player Card
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
  const W = 132, H = 32, PAD = 4;
  // Y-axis auto-scales to THIS player's own min/max rather than a fixed 0–100%, which
  // otherwise compresses real usage movement into a few pixels. The hover headline
  // carries the absolute percentile; the sparkline carries the SHAPE. MIN_SPAN sets a
  // floor on the visible window so a trivial wiggle doesn't fill the canvas and read as
  // a cliff — set to 0 for pure min/max auto-scale.
  const MIN_SPAN = 0.12;
  const pts = points.filter(p => p.value != null) as Array<{ season: number; value: number }>;
  if (pts.length === 0) return null;
  const xs = pts.map((_, i) => pts.length === 1 ? W / 2 : PAD + (i / (pts.length - 1)) * (W - 2 * PAD));
  const vals = pts.map(p => Math.max(0, Math.min(1, p.value)));
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const mid = (vMin + vMax) / 2;
  const lo = Math.min(vMin, mid - MIN_SPAN / 2);
  const hi = Math.max(vMax, mid + MIN_SPAN / 2);
  const span = hi - lo;
  const usableH = H - 2 * PAD;
  const ys = vals.map(v => span < 1e-6
    ? PAD + usableH / 2
    : PAD + (1 - (v - lo) / span) * usableH);
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
  // Dot-fill treatment (no luminance flip) so the strip matches the chart dot — see
  // Act2HoverCard. Same shipped-strip alignment as VerdictHoverCard, this commit.
  const strip = teamDotColors(player.team_drafted).fill;
  const ivory = "#F5F0E8";
  const dim   = "rgba(245,240,232,0.7)";

  // Block 1 — identity (same shape as resolved).
  const hw = `${fmtHeight(player.height)}${player.weight ? `, ${player.weight} lb` : ""}`;
  const isUDFA = !(player.pick_drafted && player.pick_drafted > 0);
  // Guardrail (§3f): UDFA hover says "Undrafted", never a (synthetic) pick number.
  const pickStr = isUDFA ? "Undrafted" : `Pick ${player.pick_drafted}`;
  const identity = [player.pos, isUDFA ? pickStr : `${player.team_drafted ?? "—"} · ${pickStr}`, hw].filter(Boolean).join(" · ");

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
    // Rider 4: drafted K/P/LS have zero player_seasons rows by design (snap share is
    // not tracked) → usage null → they fall into the strip. Honest specialist copy,
    // NOT "too few snaps to rank yet" (which would imply a future rank that won't come).
    const isSpecialist = ["K", "P", "LS"].includes((player.pos ?? "").toUpperCase());
    if (chartMode === "floor" && !hasSeasons) {
      headline = <span style={{ color: dim }}>Yet to take a pro snap</span>;
    } else if (isSpecialist) {
      headline = <span style={{ color: dim }}>{KP_STRIP_COPY}</span>;
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
          › Click dot for the full Player Card
        </div>
      </div>
    </div>
  );
}

// ── Act 1 hover card ("THE BOARD") — brief e Item 2 ─────────────────────────────
// Same one-card / middle-block-evolves system as the Act 3 cards. Two blocks + CTA
// (no ON-THE-FIELD block — no career exists yet in Act 1). School-color top strip
// (journey-step color = SCHOOL here). Hero = consensus POSITIONAL RANK, IVORY never
// gold (gold is Act 3 PREMIUM only). Drops role + the actual draft selection — the
// selection spoils Act 2 (three-act discipline). posRank comes from the shared
// posRankMap (lib/twinData) so the hover label can never drift from the hub pages.

function Act1HoverCard({ player, x, y, posRank }: TooltipState & { posRank: number | null }) {
  const sc = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };
  const ivory = "#F5F0E8";
  const dim   = "rgba(245,240,232,0.7)";

  const hw = `${fmtHeight(player.height)}${player.weight ? `, ${player.weight} lb` : ""}`;
  const identity = [player.pos, (player.school ?? "—").toUpperCase(), hw]
    .filter(Boolean)
    .join(" · ");

  // Block 2 — THE BOARD. Hero = positional rank (ivory). Unranked prospect (no
  // consensus rank → sits in the UDFA zone of the projection board) gets a plain
  // designation and no "Ranked:" line.
  const ranked = posRank != null;
  const hero = ranked
    ? `${ordinal(posRank).toUpperCase()}-RANKED ${player.pos}`
    : "UNRANKED PROSPECT";

  // def line: "Ranked: Round 1 · Pick 10" (rd = projected round, rank = consensus
  // overall projected rank, shown as the projected pick). "Ranked:" sets up Act 2's
  // "Selected:" reveal. Only rendered for ranked players.
  const defParts: string[] = [];
  if (player.rd != null)   defParts.push(`Round ${player.rd}`);
  if (player.rank != null) defParts.push(`No. ${player.rank}`);
  const defLine = ranked && defParts.length > 0 ? `Ranked: ${defParts.join(" · ")}` : null;

  return (
    <div className="dm-tooltip" style={{ left: x, top: y, width: 250, background: "#0B2239", padding: 0, overflow: "hidden" }}>
      <div style={{ height: 4, background: sc.fill }} />
      <div style={{ padding: "10px 12px" }}>
        {/* Block 1 — identity */}
        <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 13 }}>{player.name}</div>
        <div style={{ color: "rgba(245,240,232,0.65)", fontSize: 11, marginTop: 2 }}>{identity}</div>

        {/* Block 2 — the board */}
        <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.12)" }}>
          <div style={{ fontSize: 9, letterSpacing: 0.6, color: "rgba(245,240,232,0.4)" }}>THE BOARD</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginTop: 2, color: ivory }}>{hero}</div>
          {defLine && <div style={{ fontSize: 11, color: dim, marginTop: 1 }}>{defLine}</div>}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 9, fontSize: 10, color: "rgba(245,240,232,0.4)" }}>
          › Click dot for the full Player Card
        </div>
      </div>
    </div>
  );
}

// ── Act 2 hover card ("DRAFT DAY") — brief e Item 2 ─────────────────────────────
// Same one-card system. Block 2 = the draft-day move: ivory hero (REACH / STEAL /
// PICKED IN EXPECTED RANGE) + three aligned rows (Ranked · Selected · Gap). Gap
// value IVORY, never gold. Reach/steal via the SHARED classifyDraftMove so the hero
// can never disagree with the scoreboard count. A drafted-but-unranked player is
// imputed to maxPick+1 for the LABEL only — the Ranked row shows "Unranked", never a
// fabricated pick. UDFA variant = "WENT UNDRAFTED".

/** One aligned label/value row in the Act 2 DRAFT DAY block. Module-scope so it is a
 *  stable component (avoids react/no-unstable-nested-components). */
function Act2Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", fontSize: 11, marginTop: 1 }}>
      <span style={{ width: 60, flexShrink: 0, color: "rgba(245,240,232,0.45)" }}>{label}</span>
      <span style={{ color: valueColor ?? "rgba(245,240,232,0.7)" }}>{value}</span>
    </div>
  );
}

function Act2HoverCard({ player, x, y, maxPick }: TooltipState & { maxPick: number }) {
  // Strip = the DOT-fill treatment (no luminance flip) so it matches the player's
  // dot on the chart; resolveTeamColors() would demote SEA/PIT/JAX/NO/LV/TEN to a
  // near-black strip that vanishes on the navy card.
  const strip = teamDotColors(player.team_drafted).fill;
  const ivory = "#F5F0E8";

  const hw = `${fmtHeight(player.height)}${player.weight ? `, ${player.weight} lb` : ""}`;
  const identity = [player.pos, player.team_drafted ?? "—", hw].filter(Boolean).join(" · ");

  const pick = player.pick_drafted;
  const isUDFA = !(pick && pick > 0);
  const rankReal = player.rank;
  const move = classifyDraftMove(isUDFA ? null : (rankReal ?? maxPick + 1), isUDFA ? null : pick);

  const hero =
    isUDFA            ? "WENT UNDRAFTED" :
    move === "REACH"  ? "REACH" :
    move === "STEAL"  ? "STEAL" :
                        "PICKED IN EXPECTED RANGE";

  // Row values. "Unranked" is shown literally — the imputed rank only drove the hero.
  const rankedVal = rankReal != null
    ? [player.rd != null ? `Round ${player.rd}` : null, `Pick ${rankReal}`].filter(Boolean).join(" · ")
    : "Unranked";

  const selectedVal = isUDFA
    ? `Undrafted${player.team_drafted ? ` (signed by ${player.team_drafted})` : ""}`
    : [player.rd_drafted != null ? `Round ${player.rd_drafted}` : null, `Pick ${pick}`]
        .filter(Boolean).join(" · ");

  // Gap row — words, never a signed number (dodges reach/steal sign confusion). The
  // "· sizes the dot" tie is kept ONLY where the dot's size encoding genuinely tracks
  // the stated quantity (chartMath pickValueDelta):
  //   - ranked drafted → sizes off the move (tier-adjusted |rank−pick|). Kept.
  //   - ranked UDFA   → sizes off how far he fell (the projection). Kept.
  //   - unranked drafted → sizes off a bottom-of-board anchor, NOT "(maxPick+1)−pick";
  //     that number is also mis-anchored (not measured from the real board bottom), so
  //     the Gap row is OMITTED — hero + "Unranked" + Selected carry it. (Gate-2 items 3+4.)
  let gapVal: string | null = null;
  if (isUDFA) {
    if (rankReal != null) gapVal = `fell ${maxPick + 1 - rankReal} picks past the board · sizes the dot`;
  } else if (rankReal != null) {
    const n = Math.abs(pick! - rankReal);
    gapVal = n === 0
      ? "picked right where ranked"
      : `${n} picks ${pick! < rankReal ? "earlier" : "later"} · sizes the dot`;
  }
  // unranked drafted (rankReal == null, not UDFA) → gapVal stays null (row omitted).

  return (
    <div className="dm-tooltip" style={{ left: x, top: y, width: 250, background: "#0B2239", padding: 0, overflow: "hidden" }}>
      <div style={{ height: 4, background: strip }} />
      <div style={{ padding: "10px 12px" }}>
        {/* Block 1 — identity */}
        <div style={{ fontWeight: 700, color: "#F5F0E8", fontSize: 13 }}>{player.name}</div>
        <div style={{ color: "rgba(245,240,232,0.65)", fontSize: 11, marginTop: 2 }}>{identity}</div>

        {/* Block 2 — draft day */}
        <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(245,240,232,0.12)" }}>
          <div style={{ fontSize: 9, letterSpacing: 0.6, color: "rgba(245,240,232,0.4)" }}>DRAFT DAY</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginTop: 2, color: ivory }}>{hero}</div>
          <div style={{ marginTop: 4 }}>
            <Act2Row label="Ranked" value={rankedVal} />
            <Act2Row label="Selected" value={selectedVal} />
            {gapVal && <Act2Row label="Gap" value={gapVal} valueColor={ivory} />}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 9, fontSize: 10, color: "rgba(245,240,232,0.4)" }}>
          › Click dot for the full Player Card
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
  // Rider 2: resolved-class verdict join failures, forwarded by /api/draft.
  const [unmatched, setUnmatched] = useState<string[]>([]);

  // ── Transport (brief d) — speed, pause, and the post-skip pulse token ────────
  const [speed,  setSpeed]  = useState<number>(DEFAULT_SPEED);
  const [paused, setPaused] = useState(false);
  const [restartPulseKey, setRestartPulseKey] = useState(0);
  // First-session navigation hints — incrementing tokens that breathe the PLAY button
  // (advance-act nudge) and the year switcher (Act-3 explore nudge) ONCE per bump. Driven
  // by useFirstSessionHints (below); the buttons stay dumb and react to the key.
  const [playPulseKey, setPlayPulseKey] = useState(0);
  const [yearPulseKey, setYearPulseKey] = useState(0);
  const speedRef        = useRef(speed);
  const pausedRef       = useRef(paused);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // ── Act 1→2 master frame clock (brief 2026-06-25) ────────────────────────────
  // The visible projection→draft-results dot motion is now driven by ONE rAF-advanced
  // clock owned here (replaces the fire-and-forget CSS transition that Pause could not
  // stop). `oneToTwoElapsedMs` is null when not in the chapter, a number (0…total) while
  // running/paused; PlayerDots interpolates every dot from it. elapsedRef is the source
  // of truth the rAF loop mutates; the state mirror drives render. totalDurationRef is
  // captured at chapter start = dotPositions.length*22 + 550 (the SAME stagger window the
  // retired oneToTwoDurationMs used). Speed multiplies the per-frame advance, so the clock
  // reaches `total` faster — it does NOT shrink `total`.
  const [oneToTwoElapsedMs, setOneToTwoElapsedMs] = useState<number | null>(null);
  const oneToTwoRafRef   = useRef<number | null>(null);
  const lastFrameTsRef   = useRef<number>(0);
  const elapsedRef       = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);

  // ── Act 2→3 choreography master clock (Brief 4) ──────────────────────────────
  // A SECOND rAF clock, same shape as the 1→2 one (single `progress` timeline, pause/
  // resume freezes anywhere, speed multiplies the per-frame advance). `twoToThreeElapsedMs`
  // is null when not in the 2→3 chapter, a number (0…total) while running/paused;
  // Act3Choreography samples every dot/thread/beat/counter from it. On reaching total (or
  // Skip) DraftChart hands off to Act3Field — the pixel-identical rest frame (gate §8.4).
  const [twoToThreeElapsedMs, setTwoToThreeElapsedMs] = useState<number | null>(null);
  const t23RafRef     = useRef<number | null>(null);
  const t23LastTsRef  = useRef<number>(0);
  const t23ElapsedRef = useRef<number>(0);
  const t23TotalRef   = useRef<number>(0);
  const t23RunningRef = useRef<boolean>(false);


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

  // Consensus positional rank for the Act 1 ("THE BOARD") hover hero. One shared
  // definition (lib/twinData posRankMap) feeds both this hover and the hub pages,
  // so the labels can never drift. Filter to the selected class first (matching the
  // hub pages' per-class pool + the defensive filter used elsewhere here).
  const posRankByPid = useMemo(
    () => posRankMap(players.filter(p => p.draft_year === selectedYear)),
    [players, selectedYear],
  );

  // Class max pick — used by the Act 2 hover to impute rank for a drafted-but-unranked
  // player (maxPick+1) and to size a UDFA's gap. Same selected-class pool as above, so
  // it matches the scoreboard's own maxPick (one universe).
  const classMaxPick = useMemo(
    () => players
      .filter(p => p.draft_year === selectedYear)
      .reduce((m, p) => (p.pick_drafted != null && p.pick_drafted > m ? p.pick_drafted : m), 0),
    [players, selectedYear],
  );

  // Mirror chartMode into a ref so the window keydown handler (below) can decide
  // canPlay without re-binding the listener on every mode change.
  const chartModeRef = useRef(chartMode);
  useEffect(() => { chartModeRef.current = chartMode; }, [chartMode]);

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
  // vs-consensus (Brief 3) — a categorical SCOPE filter (STEAL/IN_RANGE/REACH), act-aware:
  // it scopes only in Act 2+ (the predicate ignores it in 'projection'). The selection is
  // REMEMBERED across act switches — never wiped on entering Act 1 — so it re-applies on
  // return. Surfaced in the sidebar only in Act 2 & 3.
  const [consensusFilter, setConsensusFilter] = useState<DraftMove[]>([]);

  // ── Your team (brief f, item 2) — identity persistence, NOT a parallel filter ──
  // `pinnedTeam` is the saved IDENTITY (your team); the active lens is still plain
  // `teamFilter`. "Clicks filter, pins remember": only an explicit pin writes
  // localStorage; browsing/picking just toggles `teamFilter` (session-only). NO
  // auto-lens on load — a pin hydrates the chip "off"; one tap lights it. Hydrated
  // post-mount (SSR starts null → no hydration mismatch, no flash). One state, two
  // surfaces (chip + sidebar) — both read pinnedTeam + teamFilter so they can't disagree.
  const [pinnedTeam, setPinnedTeam] = useState<string | null>(null);
  // One soft pulse on the chip at the first Act-3-rest arrival, once ever, only while
  // unpinned (it invites the PICKER — declaration stays the fan's move).
  const [chipPulse, setChipPulse] = useState(false);
  const pulseFiredRef = useRef(false);

  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);

  // Band focus (iterative-fixes #6) — a clicked wall node isolates that money band on the
  // Act-3 field. PURE VISUAL EMPHASIS: it never enters litIds / lensFilter / the scoreboard
  // scope (the #6 finding: display emphasis must stay out of the lit set). Cleared on any
  // class/act change so it can't linger onto a field it doesn't describe.
  const [focusedBand, setFocusedBand] = useState<MoneyBand | null>(null);

  // ── Player search (brief f, item 3) ─────────────────────────────────────────
  // The glow-ring highlight is a SEPARATE state — SEARCH HIGHLIGHTS, NEVER SCOPES:
  // it never touches teamFilter/litIds/computeScoreboardStats (dims nothing, recomputes
  // nothing). `pendingTeleportRef` holds the picked player_id until the destination
  // class finishes loading (scoredReady), then the resolver lands the act + opens the card.
  const [highlightedPlayerId, setHighlightedPlayerId] = useState<string | null>(null);
  const pendingTeleportRef = useRef<{ playerId: string; year: number } | null>(null);
  // Reset (Brief 1, Piece 6) clears the search field by remounting PlayerSearch (its
  // query/expanded state is internal) — bumping this key is the clear signal.
  const [searchResetKey, setSearchResetKey] = useState(0);

  // ── "How to Read" modal ───────────────────────────────────────────────────
  const [htrOpen, setHtrOpen] = useState(false);

  // First-visit auto-open DISABLED 2026-06-19 — the "How to Read" modal no longer
  // pops up for new users; it opens on demand via the help button only. Pending the
  // help-button / first-time-orientation overhaul (Zeta/E6). To restore: re-add a
  // useEffect that calls setHtrOpen(true) when !localStorage.getItem('dm_htr_seen').

  // Hydrate the pinned team AFTER mount (read in an effect, never during render) so
  // SSR + first client render both start null → no hydration mismatch and no flash.
  // This only restores IDENTITY; it never applies the lens (no auto-lens on load).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('dm_pinned_team');
      if (saved) setPinnedTeam(saved);
    } catch { /* private mode / disabled storage — chip just stays unpinned */ }
  }, []);

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

  // ── First-session navigation hints (contingent pulse + Act-3 explore nudge) ──
  // Desktop only (mobile mode is off; don't nudge on phones). `act` = the current beat;
  // `engaged` = a hover card or player card is open (suppress the pulse while the user
  // is interacting). The controller owns cadence/stop-on-use/reduced-motion; it only
  // bumps the two pulse keys. recordInteraction feeds the analytics funnel from the real
  // control handlers (handleTransportPlay / handleYearChange below).
  const hints = useFirstSessionHints({
    enabled: !isMobile && !loading && !error && players.length > 0,
    act: chartMode === 'projection' ? 1 : chartMode === 'draft-results' ? 2 : 3,
    year: selectedYear,
    isAnimating,
    engaged: tooltip != null || openPlayer != null,
    onPulsePlay: () => setPlayPulseKey(k => k + 1),
    onPulseYear: () => setYearPulseKey(k => k + 1),
  });

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
  // vs-consensus counts as active ONLY in Act 2+ — in Act 1 it's inert (scopes nothing),
  // so a remembered selection must not light the lens / "Clear all" while on the board.
  const consensusActive = consensusFilter.length > 0 && chartMode !== 'projection';
  const hasActiveFilters =
    positionFilter.length > 0 ||
    roundFilter.length > 0 ||
    teamFilter.length > 0 ||
    schoolFilter.length > 0 ||
    consensusActive;

  // ── Lens (brief f) — ONE membership pass, three reads ──────────────────────
  // The shared scope predicate (lib/lensFilter) decides "who's in scope" ONCE here;
  // the lit set then fans out to (1) the Act 3 chart (JellyfishField ghosts the rest,
  // re-lights the lit weave), (2) the wall lit sub-counts, and (3) the scoreboard
  // recompute — so the slot can never contradict the chart. Geometry never changes;
  // this is opacity/stroke + a scoped count only. Pure SCOPE (pos/round/team/school) —
  // display toggles (Hide Drafted / movement lines / dot size) never enter here.
  const litPlayers = useMemo(
    () => players.filter(p => !isPlayerFiltered(
      p, positionFilter, roundFilter, teamFilter, schoolFilter, currentStepId, chartMode,
      consensusFilter, classMaxPick,
    )),
    [players, positionFilter, roundFilter, teamFilter, schoolFilter, currentStepId, chartMode,
     consensusFilter, classMaxPick],
  );
  // null when no lens is active → JellyfishField renders the resting field byte-identical.
  const litIds = useMemo(
    () => (hasActiveFilters ? new Set(litPlayers.map(p => p.player_id)) : null),
    [hasActiveFilters, litPlayers],
  );
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

  // Phase Lambda — the NEW Act-3 reframe field (six-band money / window_usage). Built
  // additively alongside the jellyfish; ACT3_FIELD_VERSION selects which renders (the
  // jellyfish stays reachable for A/B until the sniff test passes — Lambda "new before
  // delete"). One layout fn covers all three field states via isPending (resolved =
  // false; pending/floor = true → band-1 relabel + unsigned dots carry no thread).
  const act3FieldLayout = useMemo(() => {
    if (ACT3_FIELD_VERSION !== 'new' || !isFieldMode) return null;
    return computeAct3FieldLayout(players, chartMode !== 'verdict');
  }, [players, chartMode, isFieldMode]);

  // #6: band focus is transient — clear it on ANY class or act change so it can never
  // linger onto a field it doesn't describe (setting null when already null no-ops).
  useEffect(() => {
    setFocusedBand(null);
  }, [selectedYear, chartMode, isFieldMode]);

  // Phase Lambda Brief 4 — the full 2→3 choreography schedule for the current class.
  // Built off `act3Mode` (not chartMode) so it is READY while still in Act 2 (chartMode
  // 'draft-results'): pressing Play must launch Movement I instantly. Its terminal frame
  // equals act3FieldLayout's rest field (both from computeAct3FieldLayout). isPending =
  // any non-resolved field (pending/floor) — band-1 relabel + unsigned dots carry no thread.
  const act3Choreo = useMemo(() => {
    if (ACT3_FIELD_VERSION !== 'new' || players.length === 0) return null;
    return computeAct3Choreography(players, act3Mode !== 'verdict');
  }, [players, act3Mode]);

  // Movement-III scoreboard sweep (spec §6) — the money-beat schedule that drives the
  // resolved hero's LIVE climb + capped attention (invitation pulse / value change-fade /
  // cumulative strip). RESOLVED classes only: pending/floor show State-6/7 (no GOT PAID
  // hero, no six-band strip), so there is nothing to sweep. Null otherwise.
  const act3Sweep = useMemo(
    () => (act3Choreo && act3Mode === 'verdict' ? computeSweep(act3Choreo) : null),
    [act3Choreo, act3Mode],
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
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DraftApiResponse>; })
        .then(d => { if (!cancelled) { setPlayers(d.players ?? []); setUnmatched(d.unmatched ?? []); setLoading(false); } })
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
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DraftApiResponse>; })
      .then(d => {
        if (cancelled) return;
        const fast = d.players ?? [];
        yearCache.current.set(cacheKey, fast);
        setPlayers(fast);
        setUnmatched(d.unmatched ?? []);
        setLoading(false);

        // Phase 2: background fetch for full scored data
        fetch(`/api/draft?year=${selectedYear}`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DraftApiResponse>; })
          .then(d2 => {
            if (cancelled) return;
            const full = d2.players ?? [];
            setUnmatched(d2.unmatched ?? []);
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
    setConsensusFilter([]);
    updateURL({ pos: null, round: null, team: null, school: null });
  }, [updateURL]);

  // ── Your team (brief f, item 2) handlers ───────────────────────────────────
  // Toggle ONE team's membership in the existing teamFilter (others preserved —
  // membership toggle, NOT replace; stacking stays free). Routes through the same
  // handleTeamFilterChange every sidebar checkbox uses → one lens path, no parallel
  // filter. Alias-agnostic via sameTeam so the chip and the sidebar checkbox agree
  // even when the pin and the class data use different team-string formats.
  const handleToggleTeam = useCallback((team: string) => {
    const exists = teamFilter.some(t => sameTeam(t, team));
    const next = exists
      ? teamFilter.filter(t => !sameTeam(t, team))
      : [...teamFilter, team];
    handleTeamFilterChange(next);
  }, [teamFilter, handleTeamFilterChange]);

  // Claim / change / unclaim. The ONLY writer of dm_pinned_team. Pure identity —
  // never touches teamFilter, so pinning does not apply the lens ("pins remember").
  const handlePinTeam = useCallback((team: string | null) => {
    setPinnedTeam(team);
    if (typeof window === 'undefined') return;
    try {
      if (team) localStorage.setItem('dm_pinned_team', team);
      else localStorage.removeItem('dm_pinned_team');
    } catch { /* storage disabled — pin holds for the session only */ }
  }, []);

  // One soft pulse on the chip at the FIRST arrival at Act-3 rest, ONCE EVER
  // (dm_team_pulse_seen), and ONLY while unpinned. `isFieldMode && !isAnimating` is
  // the Act-3-rest condition; cold load is Act 1, so this can't fire on first paint.
  // ⚠ The 2→3 transition is an instant jump-cut today (the animated handoff is
  // Epsilon 5), so there is no distinct "terminal handoff" event to bind to — this
  // fires on the first Act-3-rest arrival regardless of which control got the user
  // there. localStorage is read fresh (not the hydrating `pinnedTeam` state) so a
  // returning pinned user deep-linking straight to Act 3 never sees a spurious pulse.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pulseFiredRef.current) return;
    if (!isFieldMode || isAnimating) return;
    let seen = false, pinned: string | null = null;
    try {
      seen = !!localStorage.getItem('dm_team_pulse_seen');
      pinned = localStorage.getItem('dm_pinned_team');
    } catch { return; }
    if (seen || pinned) return;
    pulseFiredRef.current = true;
    try { localStorage.setItem('dm_team_pulse_seen', '1'); } catch { /* non-fatal */ }
    setChipPulse(true);
    const t = setTimeout(() => setChipPulse(false), 1000);
    return () => clearTimeout(t);
  }, [isFieldMode, isAnimating]);

  // ── Transport: 1→2 master-clock helpers (speed + pause aware) ────────────────
  // The per-dot 550ms ease + i*22ms stagger is preserved EXACTLY (PlayerDots, DO-NOT-
  // TOUCH the numbers) — only its driver moved from a CSS transition to this rAF clock so
  // Pause can freeze it. cancelOneToTwo = sanitize (kill rAF + clear chapter flags), used
  // on every act-nav site so no zombie "paused-forever" state rides along. commitOneToTwo
  // = sanitize THEN land on draft (clock-end or Skip). startOneToTwo = run the clock 0→total.
  // Declared here (before the nav handlers) so every act-nav site can list it as a dep
  // without hitting a temporal-dead-zone reference.
  const cancelOneToTwo = useCallback(() => {
    if (oneToTwoRafRef.current != null) { cancelAnimationFrame(oneToTwoRafRef.current); oneToTwoRafRef.current = null; }
    elapsedRef.current = 0;
    setOneToTwoElapsedMs(null);
    setIsAnimating(false);
    setPaused(false);
  }, []);

  const commitOneToTwo = useCallback(() => {
    cancelOneToTwo();
    setViewMode('drafted');
    setCurrentStepId('draft');
  }, [cancelOneToTwo]);

  const startOneToTwo = useCallback(() => {
    if (oneToTwoRafRef.current != null) { cancelAnimationFrame(oneToTwoRafRef.current); oneToTwoRafRef.current = null; }
    // viewMode='drafted' up front matches today (UDFA zone / labels appear at play start);
    // during the chapter PlayerDots interpolates from the clock regardless of viewMode.
    setViewMode('drafted');

    // Reduced motion: skip the rAF entirely — instant snap to drafted (no-motion contract).
    if (prefersReduced.current) {
      commitOneToTwo();
      return;
    }

    totalDurationRef.current = dotPositions.length * 22 + 550;
    elapsedRef.current  = 0;
    lastFrameTsRef.current = 0; // sentinel — seeded on the first frame
    setIsAnimating(true);
    setPaused(false);
    setOneToTwoElapsedMs(0);

    const frame = (ts: number) => {
      if (lastFrameTsRef.current === 0) lastFrameTsRef.current = ts;
      // Paused: keep lastFrameTs fresh so no time accrues, but do not advance the clock.
      if (pausedRef.current) {
        lastFrameTsRef.current = ts;
        oneToTwoRafRef.current = requestAnimationFrame(frame);
        return;
      }
      const delta = ts - lastFrameTsRef.current;
      lastFrameTsRef.current = ts;
      elapsedRef.current = Math.min(
        elapsedRef.current + delta * speedRef.current,
        totalDurationRef.current,
      );
      if (elapsedRef.current >= totalDurationRef.current) {
        // At elapsed=total every dot's localT ≥ 1 (p=1), so the committed snap matches
        // the final interpolated frame — no one-frame pop.
        commitOneToTwo();
        return;
      }
      setOneToTwoElapsedMs(elapsedRef.current);
      oneToTwoRafRef.current = requestAnimationFrame(frame);
    };
    oneToTwoRafRef.current = requestAnimationFrame(frame);
  }, [dotPositions.length, commitOneToTwo]);

  // Tear down the rAF clock if the component unmounts mid-chapter.
  useEffect(() => () => {
    if (oneToTwoRafRef.current != null) cancelAnimationFrame(oneToTwoRafRef.current);
    if (t23RafRef.current != null) cancelAnimationFrame(t23RafRef.current);
  }, []);

  // ── Transport: 2→3 choreography clock (Brief 4) ──────────────────────────────
  // Same clock shape as 1→2 (single timeline, pause/resume freeze anywhere, speed
  // multiplies the advance so authored rhythm survives). cancel = sanitize (kill rAF +
  // clear chapter flags). commit = sanitize then land on Act-3 rest (Act3Field renders,
  // pixel-identical to the last animated frame). start = run 0→total from Movement I.
  const cancelTwoToThree = useCallback(() => {
    if (t23RafRef.current != null) { cancelAnimationFrame(t23RafRef.current); t23RafRef.current = null; }
    t23RunningRef.current = false;
    t23ElapsedRef.current = 0;
    setTwoToThreeElapsedMs(null);
    setIsAnimating(false);
    setPaused(false);
  }, []);

  const commitTwoToThree = useCallback(() => {
    cancelTwoToThree();
    setCurrentStepId('act3'); // land on the Act-3 rest field (already there mid-chapter)
  }, [cancelTwoToThree]);

  const startTwoToThree = useCallback(() => {
    // Enter the Act-3 field mode up front (isFieldMode true); the choreography renders
    // Movement-I frame 0 = the class in Act-2 geometry, so there is no Act3Field flash.
    setCurrentStepId('act3');

    // No new field build / reduced motion → HARD CUT to the rest frame (no movements).
    if (!act3Choreo || ACT3_FIELD_VERSION !== 'new' || prefersReduced.current) {
      cancelTwoToThree();
      return;
    }

    if (t23RafRef.current != null) { cancelAnimationFrame(t23RafRef.current); t23RafRef.current = null; }
    t23TotalRef.current   = act3Choreo.timeline.total;
    t23ElapsedRef.current = 0;
    t23LastTsRef.current  = 0; // sentinel — seeded on the first frame
    t23RunningRef.current = true;
    setIsAnimating(true);
    setPaused(false);
    setTwoToThreeElapsedMs(0);

    const frame = (ts: number) => {
      if (t23LastTsRef.current === 0) t23LastTsRef.current = ts;
      if (pausedRef.current) {                 // freeze the clock; dots hold in place
        t23LastTsRef.current = ts;
        t23RafRef.current = requestAnimationFrame(frame);
        return;
      }
      const delta = ts - t23LastTsRef.current;
      t23LastTsRef.current = ts;
      t23ElapsedRef.current = Math.min(
        t23ElapsedRef.current + delta * speedRef.current,
        t23TotalRef.current,
      );
      if (t23ElapsedRef.current >= t23TotalRef.current) {
        commitTwoToThree();                    // hand off to Act3Field (frame-identical)
        return;
      }
      setTwoToThreeElapsedMs(t23ElapsedRef.current);
      t23RafRef.current = requestAnimationFrame(frame);
    };
    t23RafRef.current = requestAnimationFrame(frame);
  }, [act3Choreo, cancelTwoToThree, commitTwoToThree]);

  // ── HeaderZone handlers ───────────────────────────────────────────────────
  const handleYearChange = useCallback((newYear: number) => {
    hints.recordInteraction('year', { from: selectedYear, to: newYear }); // funnel: class_switched (+ hint_clicked if nudged)
    cancelOneToTwo(); // a year switch fired mid-1→2 must not leave a zombie chapter
    cancelTwoToThree(); // ...nor mid-2→3
    setSelectedYear(newYear);
    setCurrentStepId('projection');
    setIsPlaying(false);
    router.replace(`/draft/${newYear}`, { scroll: false });
  }, [router, hints, cancelOneToTwo, cancelTwoToThree, selectedYear]);

  // ── Player search teleport (brief f, item 3) ────────────────────────────────
  // Resolve a pending teleport once the destination class's SCORED data is in (landing
  // act is data-driven via selectClassState, which needs usage). Lands the act, opens the
  // card, arms the glow-ring. The ring is the search highlight — it scopes NOTHING.
  const resolveTeleport = useCallback(() => {
    const pending = pendingTeleportRef.current;
    if (!pending || selectedYear !== pending.year || !scoredReady) return;
    const player = players.find(p => p.player_id === pending.playerId);
    if (!player) return;
    // no completed season → floor → drafted? Act 2 : Act 1 · any completed season → Act 3.
    const state = selectClassState(players, selectedYear);
    const classHasPicks = players.some(p => p.drafted);
    const landingStep = state === 'floor' ? (classHasPicks ? 'draft' : 'projection') : 'act3';
    cancelOneToTwo(); // a search teleport fired mid-1→2 must not leave a zombie chapter
    cancelTwoToThree(); // ...nor mid-2→3
    setCurrentStepId(landingStep);
    setOpenPlayer(player);
    setHighlightedPlayerId(player.player_id);
    pendingTeleportRef.current = null;
  }, [players, selectedYear, scoredReady, cancelOneToTwo, cancelTwoToThree]);

  const handleSearchSelect = useCallback((entry: SearchIndexEntry) => {
    pendingTeleportRef.current = { playerId: entry.player_id, year: entry.draft_year };
    setHighlightedPlayerId(null); // clear any prior ring until this teleport resolves
    if (entry.draft_year !== selectedYear) {
      setIsPlaying(false);
      setSelectedYear(entry.draft_year);
      router.replace(`/draft/${entry.draft_year}`, { scroll: false });
      // The resolver effect lands it once the class's scored data arrives.
    } else {
      resolveTeleport(); // same class — resolve now if ready (else the effect catches it)
    }
  }, [selectedYear, router, resolveTeleport]);

  // Fires resolveTeleport whenever players / selectedYear / scoredReady change — i.e.,
  // the moment the teleported-to class finishes loading.
  useEffect(() => { resolveTeleport(); }, [resolveTeleport]);

  // ESC clears the glow-ring — but only once no card is open (the first ESC closes the
  // card; the ring shows; the next ESC clears it). Click-away clears it via dm-main.
  useEffect(() => {
    if (!highlightedPlayerId) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !openPlayer) setHighlightedPlayerId(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [highlightedPlayerId, openPlayer]);

  // Shared step-animation logic — used by both manual clicks and auto-play.
  // Does NOT touch isPlaying so auto-play can call it without killing itself.
  const animateToStep = useCallback((stepId: string) => {
    // Projection → Draft Results: animate dots from projected to actual positions.
    // Don't set currentStepId until animation completes — doing it early triggers
    // the chartMode useEffect which instantly snaps viewMode, killing the transition.
    // Check viewMode (not currentStepId) because the sidebar toggle can set
    // currentStepId='draft' while viewMode stays 'projected'.
    if (stepId === 'draft' && viewMode === 'projected') {
      startOneToTwo();
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

    // Projection (and any other plain step): sanitize the 1→2 chapter so no zombie
    // isAnimating/paused rides into the destination act, then set the step.
    cancelOneToTwo();
    setCurrentStepId(stepId);
  }, [viewMode, dotPositions.length, journeySteps, startOneToTwo, cancelOneToTwo]);

  // Manual step click — stops auto-play then delegates to animateToStep.
  const handleStepChange = useCallback((stepId: string) => {
    setIsPlaying(false);
    animateToStep(stepId);
  }, [animateToStep]);

  // ── Transport handler API (the contract the cluster calls; ruling 1) ─────────
  // The cluster owns NO animation logic — these live here. Epsilon 5 swaps the 2→3
  // jump-cut below for its staged pivot+sweep behind the SAME onPlay, untouched cluster.
  const handleTransportSkip = useCallback(() => {
    // 2→3 in flight → jump to the Act-3 rest state (instant, no intermediate frames).
    if (t23RunningRef.current) {
      commitTwoToThree();
      setRestartPulseKey(k => k + 1);
      return;
    }
    if (!isAnimatingRef.current) return; // skip only finalizes an in-flight animation
    commitOneToTwo();                    // jump clock to end + land on draft
    setRestartPulseKey(k => k + 1);      // Btn3 pulses once (accidental-skip recovery)
  }, [commitOneToTwo, commitTwoToThree]);

  const handleTransportPlay = useCallback(() => {
    hints.recordInteraction('play'); // funnel: hint_clicked if a play pulse was pending
    setPaused(false);
    // Act 1 → run the EXISTING projected→drafted (1→2) animation.
    if (currentStep?.mode === 'projection' && currentStepId === 'projection') {
      animateToStep('draft');
      return;
    }
    // Act 2 → the 2→3 CHOREOGRAPHY (Brief 4). startTwoToThree runs Movements I–III (or
    // hard-cuts to the rest field under reduced motion / the legacy jellyfish flag).
    if (chartMode === 'draft-results') {
      cancelOneToTwo(); // sanitize before leaving the act (no zombie rides into Act 3)
      startTwoToThree();
    }
  }, [animateToStep, cancelOneToTwo, chartMode, currentStep, currentStepId, hints, startTwoToThree]);

  const handleTransportPause = useCallback(() => {
    if (!isAnimatingRef.current) return;
    setPaused(true); // the rAF loop freezes the clock; dots hold exactly where they are
  }, []);

  const handleTransportResume = useCallback(() => {
    if (!isAnimatingRef.current) return;
    setPaused(false); // the rAF loop resumes advancing from the frozen elapsed value
  }, []);

  const handleTransportReset = useCallback(() => {
    // Reset (quick-pass #3a): seat the dots back on the projected board, PAUSED — do
    // NOT auto-play. cancelOneToTwo kills any running 1→2 chapter and clears
    // isAnimating/paused/clock; setCurrentStepId + setViewMode seat Act 1 at rest. The
    // explicit setViewMode('projected') matters mid-animation: there chartMode is already
    // 'projection', so the chartMode→viewMode sync effect won't fire and viewMode would
    // otherwise linger at 'drafted' (set by startOneToTwo). The user presses Play to run.
    // Because isAnimating goes false, the year/class switcher (disabled only while
    // animating) re-enables on its own — no separate unlock needed.
    //
    // Brief 4: in an Act-3 field state (mid-2→3 OR at rest) Btn3 is ↺ Restart/Replay —
    // it re-runs the 2→3 from Movement I (spec §1 replay: reset to Act-2 geometry +
    // drafted colors + no threads + dark wall, then play; no reverse animation).
    if (isFieldMode && ACT3_FIELD_VERSION === 'new' && act3Choreo && !prefersReduced.current) {
      startTwoToThree();
      return;
    }
    cancelOneToTwo();
    setCurrentStepId('projection');
    setViewMode('projected');
  }, [cancelOneToTwo, isFieldMode, act3Choreo, startTwoToThree]);

  const handleTransportSpeed = useCallback((x: number) => { setSpeed(x); }, []);

  // ── Keyboard map (Part 3): Space = play/pause toggle (NEVER skip) · Esc = skip ─
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      if (e.code === 'Space' || e.key === ' ') {
        if (isAnimatingRef.current) {
          e.preventDefault();
          if (pausedRef.current) handleTransportResume(); else handleTransportPause();
        } else if (chartModeRef.current === 'projection' || chartModeRef.current === 'draft-results') {
          e.preventDefault();
          handleTransportPlay();
        }
      } else if (e.key === 'Escape' && isAnimatingRef.current) {
        e.preventDefault();
        handleTransportSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleTransportPlay, handleTransportPause, handleTransportResume, handleTransportSkip]);

  // ── Journey Bar v3: three beats → step ids ────────────────────────────────
  // Beat 1 THE BOARD → projection · Beat 2 DRAFT DAY → draft ·
  // Beat 3 "4 YEARS LATER" → verdict (resolved class) or career (pending class).
  const activeBeat: 1 | 2 | 3 =
    chartMode === 'projection'    ? 1 :
    chartMode === 'draft-results' ? 2 :
    3; // player-production / career / verdict

  const handleSelectBeat = useCallback((beat: 1 | 2 | 3) => {
    setIsPlaying(false);
    // Click beat = start; click again while animating = skip (Part 3 skip path).
    if (isAnimatingRef.current) {
      handleTransportSkip();
      if (beat === 2) return; // second click on the destination beat = skip only
    }
    if (beat === 1) { animateToStep('projection'); return; } // sanitizes via cancelOneToTwo
    if (beat === 2) { animateToStep('draft'); return; }
    // Beat 3 — ONE synthetic id. The field is derived at render time from the
    // loaded class data (act3Mode), NOT captured here, so a click fired while a
    // year's fetch is still in flight self-corrects once the data lands (all
    // instant; the 2→3 pivot animation is Epsilon 5 and does not exist yet).
    cancelOneToTwo(); // sanitize before leaving for Act 3 (no zombie chapter state)
    cancelTwoToThree();
    setCurrentStepId('act3');
  }, [animateToStep, handleTransportSkip, cancelOneToTwo, cancelTwoToThree]);

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
  // Click-away on the chart area clears the tooltip AND the search glow-ring (highlight
  // never scopes, so clearing it touches no filter/scoreboard state).
  const handleChartAreaClick = useCallback(() => { dismissTooltip(); setHighlightedPlayerId(null); }, [dismissTooltip]);
  const handleLiveToggle = useCallback(() => setLiveMode(l => !l), []);
  const handleShowLinesToggle = useCallback(() => setShowLines(l => !l), []);

  // ── Reset (Brief 1, Piece 6) — one handler, two affordances (logo + footer house) ──
  // Instant snap (no animated rewind): clears every filter, the pinned-team identity
  // (handlePinTeam(null) also wipes localStorage so it doesn't rehydrate), the search
  // field + glow-ring, and returns to Act 1 / THE BOARD ('projection'). "Home" is
  // the default landing class (DEFAULT_LANDING_YEAR — a resolved class), NOT the
  // pending newest class: a first-timer who lands on the default and clicks the
  // logo should stay on that resolved story. If not already there, navigates
  // (which drops the query string).
  const handleResetView = useCallback(() => {
    setPositionFilter([]);
    setRoundFilter([]);
    setTeamFilter([]);
    setSchoolFilter([]);
    setConsensusFilter([]);
    handlePinTeam(null);
    setHighlightedPlayerId(null);
    setSearchResetKey(k => k + 1);
    cancelOneToTwo(); // sanitize the 1→2 chapter before the reset snaps to Act 1
    cancelTwoToThree();
    setCurrentStepId('projection');
    if (selectedYear !== DEFAULT_LANDING_YEAR) {
      setSelectedYear(DEFAULT_LANDING_YEAR);
      router.replace(`/draft/${DEFAULT_LANDING_YEAR}`, { scroll: false });
    } else {
      updateURL({ pos: null, round: null, team: null, school: null, step: null });
    }
  }, [handlePinTeam, selectedYear, router, updateURL, cancelOneToTwo, cancelTwoToThree]);

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
    // vs-consensus (Brief 3) — remembered in state only (no URL), re-applies on return to
    // Act 2+. The sidebar renders the control only when chartMode !== 'projection'.
    consensusFilter,
    onConsensusFilterChange: setConsensusFilter,
    onClearAllFilters: handleClearAllFilters,
    liveMode,
    onLiveModeToggle: handleLiveToggle,
    showLines,
    onShowLinesToggle: handleShowLinesToggle,
    chartMode,
    availableTeams,
    availableSchools,
    hasActiveFilters,
    // "Showing N of X players" (Brief 1, Piece 5): N = lit subset, X = full class.
    litCount: hasActiveFilters ? litPlayers.length : players.length,
    totalCount: players.length,
    // Reset (Brief 1, Piece 6) — wired to the logo + footer house inside the sidebar.
    onResetView: handleResetView,
    // Your team (brief f): the ☆ MY TEAM row + per-row pin icons. Same teamFilter
    // writer as the checkboxes (no parallel filter); onPinTeam is the only pin writer.
    pinnedTeam,
    onToggleTeam: handleToggleTeam,
    onPinTeam: handlePinTeam,
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

  // Effective 1→2 duration (speed-adjusted) — paces the scoreboard per-pick ticker.
  const animDurationMs = useMemo(
    () => (dotPositions.length * 22 + 550) / speed,
    [dotPositions.length, speed],
  );

  const tierAxisVisible = yAxisPhase === 'results';

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
      <main className="dm-main" onClick={handleChartAreaClick}>

        {/* ── HeaderZone: journey bar + persistent scoreboard slot ── */}
        <HeaderZone
          activeBeat={activeBeat}
          onSelectBeat={handleSelectBeat}
          scoreboard={{
            // Player search re-homed into the identity column (fix-pass-3 §2) — was the
            // header top-right slot. Same matcher/teleport/glow-ring; only its home moved.
            searchSlot: <PlayerSearch key={searchResetKey} onSelect={handleSearchSelect} />,
            // Lens (brief f): under an active lens the slot counts the SCOPE-FILTERED
            // (lit) subset — the SAME set the chart re-lights — so the slot can't
            // contradict the chart. No lens → the full class set (byte-identical to d).
            players: hasActiveFilters ? litPlayers : players,
            selectedYear,
            onYearChange: handleYearChange,
            availableYears: [...VALID_DRAFT_YEARS],
            chartMode,
            isAnimating,
            paused,
            // Brief 4 — the 2→3 choreography is running (drives Pause/Skip/Restart + speed
            // availability during the animation). canReplay lights Btn3 at Act-3 rest.
            phase2to3: twoToThreeElapsedMs != null,
            // Movement-III sweep (spec §6): live elapsed + money-beat schedule drive the
            // resolved hero's live climb + capped attention. sweep is null off-resolved.
            twoToThreeElapsedMs,
            sweep: act3Sweep,
            canReplay: ACT3_FIELD_VERSION === 'new' && isFieldMode && !!act3Choreo && !prefersReduced.current,
            animDurationMs,
            unmatched,
            // Class-pinned imputation anchor (one value, also fed to the Act 2 hover).
            classMaxPick,
            // Your team chip (brief f, item 2) — present in all acts. Reads pinnedTeam +
            // teamFilter (one state, two surfaces); tap toggles the lens, ▾ opens the
            // picker. chipPulse = the one-time invite. (The lens nameplate that used to
            // sit by the year was removed in fix-pass 5 — it bumped the year sideways.)
            teamFilter,
            availableTeams,
            pinnedTeam,
            onToggleTeam: handleToggleTeam,
            onPinTeam: handlePinTeam,
            chipPulse,
            // First-session hints: year switcher breathes once per bump (Act-3 explore nudge).
            yearPulseKey,
            transport: {
              speed,
              restartPulseKey,
              // First-session hints: PLAY button breathes once per bump (advance-act nudge).
              playPulseKey,
              onPlay: handleTransportPlay,
              onPause: handleTransportPause,
              onResume: handleTransportResume,
              onSkip: handleTransportSkip,
              onRestart: handleTransportReset,
              onSpeedChange: handleTransportSpeed,
            },
          }}
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
            onDoubleClick={handleTransportSkip}
          >
            {isFieldMode && twoToThreeElapsedMs != null && act3Choreo ? (
              /* 2→3 choreography in flight (Brief 4) — the pivot/audition/payday. On
                 completion or Skip DraftChart swaps to Act3Field below (frame-identical). */
              <Act3Choreography
                choreo={act3Choreo}
                elapsedMs={twoToThreeElapsedMs}
                isMobile={isMobile}
                onDotClick={handleDotClick}
                onDotHover={handleDotHover}
                onDotLeave={handleDotLeave}
                litIds={litIds}
              />
            ) : isFieldMode && act3FieldLayout ? (
              <Act3Field
                layout={act3FieldLayout}
                isMobile={isMobile}
                onDotClick={handleDotClick}
                onDotHover={handleDotHover}
                onDotLeave={handleDotLeave}
                litIds={litIds}
                highlightedId={highlightedPlayerId}
                focusedBand={focusedBand}
                onBandFocus={setFocusedBand}
              />
            ) : isFieldMode && jellyfishLayout ? (
              <JellyfishField
                layout={jellyfishLayout}
                isMobile={isMobile}
                onDotClick={handleDotClick}
                onDotHover={handleDotHover}
                onDotLeave={handleDotLeave}
                litIds={litIds}
                highlightedId={highlightedPlayerId}
              />
            ) : (
            <svg
              width={isMobile ? "100%" : layout.svgW}
              height={isMobile ? undefined : layout.svgH}
              viewBox={isMobile ? (mobileVB ?? defaultMobileVB) : undefined}
              style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
            >
              <defs>
                {/* tierPillGradient REMOVED with <TierArrows> (brief-f parchment unification). */}
                <filter id="wavy-outline" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="turbulence" baseFrequency="0.08" numOctaves="2" seed="2" result="noise"/>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
              </defs>
              {/* Brief-f parchment unification: BOTH the subtle tier-tint <TierBands> AND
                  the legacy gold <TierArrows> quality-arrow (tierPillGradient) are REMOVED —
                  orphaned in Acts 1/2 (Y = rounds, not tiers). Rounds come from RoundZones,
                  tier labels from TierAxisLabels; nothing load-bearing lost. No replacement
                  spine this pass (separate decision). */}
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
                /* onHowToReadClick hidden 2026-06-22 — stale content, restore when help is rebuilt */
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
                consensusFilter={consensusFilter}
                classMaxPick={classMaxPick}
                highlightedId={highlightedPlayerId}
                oneToTwoElapsedMs={oneToTwoElapsedMs}
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
          ? <VerdictHoverCard {...tooltip} neverCount={act3FieldLayout?.bandCounts.NEVER ?? jellyfishLayout?.noneCount ?? 0} />
          : (chartMode === 'pending' || chartMode === 'floor')
            ? <PendingHoverCard {...tooltip} chartMode={chartMode} />
            : chartMode === 'projection'
              ? <Act1HoverCard {...tooltip} posRank={posRankByPid.get(tooltip.player.player_id) ?? null} />
              // 'draft-results' + any leftover deep-link modes (player-production /
              // career) all resolve to the Act 2 "DRAFT DAY" card.
              : <Act2HoverCard {...tooltip} maxPick={classMaxPick} />
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
