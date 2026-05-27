"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Player } from "@/lib/sheets";
import type { DisplaySeasonRow } from "@/lib/scoring";
import { getTierForScore } from "@/lib/tierLabels";
import { cardPositionalRangeData, resolveTeamColors, resolveSchoolColors } from "@/lib/chartConstants";
import { scoutToInches, inchesToHeightDisplay } from "@/lib/chartMath";
import { getFunFact } from "@/lib/funFacts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetricDef {
  key: string;
  label: string;
  better: "higher" | "lower";
  value: number | null;
  display: string;
  groupId: "pcmGroupSizeLength" | "pcmGroupExplosion" | "pcmGroupAgility" | "pcmGroupStrength";
  description: string;
  lowest: number | null;
  good: number | null;
  great: number | null;
  highest: number | null;
  isKey: boolean;
  peers: number[];
}

interface PlayerCardProps {
  player: Player | null;
  players: Player[];
  onClose: () => void;
  isMobile?: boolean;
  playerSlug?: string;
  currentStepId?: string;
}

// ── Card color resolution ─────────────────────────────────────────────────────

function computeCardColors(player: Player) {
  const c = player.drafted
    ? resolveTeamColors(player.team_drafted)
    : resolveSchoolColors(player.school);

  return {
    "--team-primary":       c.primary,
    "--team-secondary":     c.secondary,
    "--team-on-primary":    c.onPrimary,
    "--team-on-secondary":  c.onSecondary,
    // Legacy aliases — keep until all pcm-* classes are migrated
    "--pcm-team-primary":   c.primary,
    "--pcm-team-secondary": c.secondary,
    "--pcm-team-primary-wash": `${c.primary}33`,
  } as React.CSSProperties;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function formatThreshold(key: string, val: number | null): string {
  if (val == null) return "";
  if (key === "height") return inchesToHeightDisplay(val) ?? "";
  if (["arm", "hand", "vertical", "broad"].includes(key)) return `${val}"`;
  if (key === "weight") return `${val} lbs`;
  if (key === "bench") return `${val} reps`;
  return String(val);
}

function getTier(
  better: "higher" | "lower",
  value: number | null,
  good: number | null,
  great: number | null
): "great" | "good" | "below" | "na" {
  if (value == null || good == null || great == null) return "na";
  if (better === "higher") {
    if (value >= great) return "great";
    if (value >= good) return "good";
    return "below";
  } else {
    if (value <= great) return "great";
    if (value <= good) return "good";
    return "below";
  }
}

// Deterministic jitter — no Math.random, identical on every render
function jitter(idx: number, seed: number): number {
  return Math.sin(idx * 2.618 + seed * 0.41) * 8;
}

function keyToSeed(key: string): number {
  return key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

// Build metric definitions for a player, including positional peer arrays
function buildMetricDefs(player: Player, players: Player[]): MetricDef[] {
  const pos = player.pos;
  const ranges = cardPositionalRangeData[pos as keyof typeof cardPositionalRangeData] ?? {};

  function buildPeerArr(key: string): number[] {
    return players
      .filter((p) => p.pos === pos && p.name !== player.name && p.draft_year === player.draft_year)
      .map((p) => {
        if (key === "height") {
          const h = parseInt(String(p.height ?? ""), 10);
          return isNaN(h) ? null : scoutToInches(h);
        }
        const v = (p as unknown as Record<string, unknown>)[key];
        return v != null && !isNaN(Number(v)) ? Number(v) : null;
      })
      .filter((v): v is number => v !== null);
  }

  function makeDef(
    key: string,
    label: string,
    better: "higher" | "lower",
    value: number | null | undefined,
    display: string,
    groupId: MetricDef["groupId"],
    description: string
  ): MetricDef {
    const r = ranges[key] ?? {};
    return {
      key,
      label,
      better,
      value: value ?? null,
      display,
      groupId,
      description,
      lowest: (r as { lowest?: number }).lowest ?? null,
      good: (r as { good?: number }).good ?? null,
      great: (r as { great?: number }).great ?? null,
      highest: (r as { highest?: number }).highest ?? null,
      isKey: (r as { isKey?: boolean }).isKey ?? false,
      peers: buildPeerArr(key),
    };
  }

  const w = player.weight && player.weight > 0 ? player.weight : null;

  // Height: convert scout format → real inches for linear zone-track math
  const rH = ranges["height"] ?? {};
  const heightNum = parseInt(String(player.height ?? ""), 10);
  const hInches = isNaN(heightNum) ? null : scoutToInches(heightNum);
  const heightDef: MetricDef = {
    key: "height",
    label: "Height",
    better: "higher",
    value: hInches,
    display: inchesToHeightDisplay(hInches) ?? "N/A",
    groupId: "pcmGroupSizeLength",
    description: "Frame profile.",
    lowest: scoutToInches((rH as { lowest?: number }).lowest ?? null),
    good: scoutToInches((rH as { good?: number }).good ?? null),
    great: scoutToInches((rH as { great?: number }).great ?? null),
    highest: scoutToInches((rH as { highest?: number }).highest ?? null),
    isKey: (rH as { isKey?: boolean }).isKey ?? false,
    peers: buildPeerArr("height"),
  };

  return [
    heightDef,
    makeDef("weight", "Weight", "higher", w, w ? `${w} lbs` : "N/A", "pcmGroupSizeLength", "Body mass profile."),
    makeDef("arm", "Arm Length", "higher", player.arm, player.arm != null ? `${player.arm}"` : "N/A", "pcmGroupSizeLength", "Length profile."),
    makeDef("hand", "Hand Size", "higher", player.hand, player.hand != null ? `${player.hand}"` : "N/A", "pcmGroupSizeLength", "Grip profile."),
    makeDef("forty", "40 Yard Dash", "lower", player.forty, player.forty != null ? `${player.forty} sec.` : "N/A", "pcmGroupExplosion", "Speed over distance."),
    makeDef("vertical", "Vertical Jump", "higher", player.vertical, player.vertical != null ? `${player.vertical}"` : "N/A", "pcmGroupExplosion", "Explosiveness and leg strength."),
    makeDef("broad", "Broad Jump", "higher", player.broad, player.broad != null ? `${player.broad}"` : "N/A", "pcmGroupExplosion", "Explosiveness and leg strength."),
    makeDef("split10", "10 Yard Split", "lower", player.split10, player.split10 != null ? `${player.split10} sec.` : "N/A", "pcmGroupAgility", "Initial burst."),
    makeDef("cone3", "3 Cone", "lower", player.cone3, player.cone3 != null ? `${player.cone3} sec.` : "N/A", "pcmGroupAgility", "Agility and change of direction."),
    makeDef("shuttle", "Short Shuttle", "lower", player.shuttle, player.shuttle != null ? `${player.shuttle} sec.` : "N/A", "pcmGroupAgility", "Flexibility, burst, and balance."),
    makeDef("bench", "Bench Press", "higher", player.bench, player.bench != null ? `${player.bench} reps` : "N/A", "pcmGroupStrength", "Upper-body strength."),
  ];
}

// ── Zone track sub-component ──────────────────────────────────────────────────

function ZoneTrack({ m }: { m: MetricDef }) {
  if (m.lowest == null || m.highest == null || m.good == null || m.great == null) {
    return (
      <div className="pcm-zone-track-wrap">
        <span className="pcm-zone-na-label">—</span>
      </div>
    );
  }

  const totalRange =
    m.better === "higher" ? m.highest - m.lowest : m.lowest - m.highest;
  if (totalRange <= 0) return <div className="pcm-zone-track-wrap" />;

  let belowPct: number, goodPct: number, greatPct: number;
  if (m.better === "higher") {
    belowPct = ((m.good - m.lowest) / totalRange) * 100;
    goodPct = ((m.great - m.good) / totalRange) * 100;
    greatPct = ((m.highest - m.great) / totalRange) * 100;
  } else {
    belowPct = ((m.lowest - m.good) / totalRange) * 100;
    goodPct = ((m.good - m.great) / totalRange) * 100;
    greatPct = ((m.great - m.highest) / totalRange) * 100;
  }

  function toDisplayPct(val: number): number {
    const raw =
      m.better === "higher"
        ? ((val - m.lowest!) / totalRange) * 100
        : ((m.lowest! - val) / totalRange) * 100;
    return Math.max(3, Math.min(97, raw));
  }

  const seed = keyToSeed(m.key);
  const goodBoundaryPct = belowPct;
  const greatBoundaryPct = belowPct + goodPct;

  return (
    <div className="pcm-zone-track-wrap">
      {/* Bar segments */}
      <div className="pcm-zone-track">
        <div className="pcm-zone-seg pcm-zone-below" style={{ width: `${belowPct.toFixed(2)}%` }} />
        <div className="pcm-zone-seg pcm-zone-good" style={{ width: `${goodPct.toFixed(2)}%` }} />
        <div className="pcm-zone-seg pcm-zone-great" style={{ width: `${greatPct.toFixed(2)}%` }} />
      </div>

      {/* Overlay: peer dots, player callout, threshold ticks, area labels */}
      <div className="pcm-zone-overlay">
        {/* Peer dots */}
        {m.peers.map((val, idx) => {
          const pct = toDisplayPct(val);
          const j = jitter(idx, seed);
          return (
            <div
              key={idx}
              className="pcm-peer-dot"
              style={{ left: `${pct}%`, top: `calc(20px + ${j}px)` }}
            />
          );
        })}

        {/* Player callout + halo + dot */}
        {m.value != null && (() => {
          const pct = toDisplayPct(m.value);
          return (
            <>
              <div className="pcm-player-callout" style={{ left: `${pct}%` }}>
                {m.display}
              </div>
              <div className="pcm-player-dot-halo" style={{ left: `${pct}%` }} />
              <div className="pcm-player-dot-marker" style={{ left: `${pct}%` }} />
            </>
          );
        })()}

        {/* Zone area labels */}
        {[
          { text: "Avg", left: 0, width: belowPct },
          { text: "Good", left: belowPct, width: goodPct },
          { text: "Great", left: belowPct + goodPct, width: greatPct },
        ].map(({ text, left, width }) => (
          <div
            key={text}
            className="pcm-zone-area-lbl"
            style={{ left: `${left.toFixed(2)}%`, width: `${width.toFixed(2)}%` }}
          >
            {text}
          </div>
        ))}

        {/* Threshold ticks + value labels */}
        {[
          { pct: goodBoundaryPct, val: m.good },
          { pct: greatBoundaryPct, val: m.great },
        ].map(({ pct, val }, i) => (
          <div key={i}>
            <div className="pcm-threshold-tick" style={{ left: `${pct.toFixed(2)}%` }} />
            <div className="pcm-threshold-val" style={{ left: `${pct.toFixed(2)}%` }}>
              {formatThreshold(m.key, val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metric row sub-component ──────────────────────────────────────────────────

function MetricRow({ m }: { m: MetricDef }) {
  const tier = getTier(m.better, m.value, m.good, m.great);
  const isNa = m.value == null;
  const hasRange = m.lowest != null;

  const valueCls =
    isNa || !hasRange
      ? "pcm-metric-value pcm-tier-below"
      : tier === "great"
      ? "pcm-metric-value pcm-tier-great"
      : tier === "good"
      ? "pcm-metric-value pcm-tier-good"
      : "pcm-metric-value pcm-tier-below";

  const betterSymbol =
    isNa || !hasRange ? "—" : m.better === "higher" ? "→" : "←";

  return (
    <div className={`pcm-metric-item${m.isKey ? " key" : ""}${isNa ? " na" : ""}`}>
      {/* Col 1: label */}
      <div className="pcm-metric-name">
        <span>{m.label}</span>
        {m.isKey && <span className="pcm-key-marker" aria-label="Key metric" />}
      </div>

      {/* Col 2: value pill */}
      <div className={valueCls}>{m.display}</div>

      {/* Col 3: zone track */}
      {isNa ? (
        <div className="pcm-zone-track-wrap">
          <span className="pcm-zone-na-label">—</span>
        </div>
      ) : (
        <ZoneTrack m={m} />
      )}

      {/* Col 4: better direction */}
      <div className={`pcm-metric-better${isNa || !hasRange ? " na" : ""}`}>
        {betterSymbol}
      </div>

      {/* Col 5: context */}
      <div className="pcm-metric-desc">{m.description}</div>
    </div>
  );
}

// ── MetricHeader component ────────────────────────────────────────────────────

function MetricHeader({ pos, draftYear }: { pos: string; draftYear: number }) {
  return (
    <div className="pcm-metric-head">
      <div>Metric</div>
      <div>Value</div>
      <div>
        <div style={{ textAlign: "center" }}>Range Profile</div>
        <div className="pcm-metric-legend">
          <span className="pcm-legend-zone">
            <span className="pcm-legend-swatch below" />Avg/Below
          </span>
          <span className="pcm-legend-zone">
            <span className="pcm-legend-swatch good" />Good
          </span>
          <span className="pcm-legend-zone">
            <span className="pcm-legend-swatch great" />Great
          </span>
          <span className="pcm-legend-peer">
            <span className="pcm-legend-peer-dot" />
            <span className="pcm-peer-label-wrap">
              Class Peers *
              <span className="pcm-peer-tooltip">
                All {pos} in the {draftYear} draft class.
              </span>
            </span>
          </span>
        </div>
      </div>
      <div>Better</div>
      <div>Context</div>
    </div>
  );
}

// ── Stat grid helpers ─────────────────────────────────────────────────────────

// Local client-safe version — mirrors lib/scoring.ts (scoring.ts pulls in server-only teamContext)
function computeRookieContractARC(
  allSeasonData: Array<{ season: number; score: number }>,
  draftYear: number,
): number {
  const rookieSeasons = allSeasonData.filter(
    (s) => s.season >= draftYear && s.season <= draftYear + 3,
  )
  if (rookieSeasons.length === 0) return 0
  const scores = rookieSeasons.map((s) => s.score)
  const topN = [...scores].sort((a, b) => b - a).slice(0, Math.min(3, scores.length))
  const apex = topN.reduce((s, v) => s + v, 0) / topN.length
  const rookieWindow = rookieSeasons
  const rookieMean = rookieWindow.reduce((s, d) => s + d.score, 0) / rookieWindow.length
  const consistency = scores.reduce((s, v) => s + v, 0) / scores.length
  return Math.round(apex * 0.45 + rookieMean * 0.35 + consistency * 0.20)
}

type StatCol = {
  header: string
  getValue: (row: DisplaySeasonRow) => number | null
  isTotalsSum: boolean
}

const STAT_COLUMNS: Partial<Record<string, StatCol[]>> = {
  QB: [
    { header: 'YDS',  getValue: (r) => r.passYards,    isTotalsSum: true },
    { header: 'TD',   getValue: (r) => r.passTDs,      isTotalsSum: true },
    { header: 'INT',  getValue: (r) => r.intsThrownQB ?? null, isTotalsSum: true },
    { header: 'RUSH', getValue: (r) => r.rushYards,    isTotalsSum: true },
  ],
  RB: [
    { header: 'RUSH', getValue: (r) => r.rushYards,    isTotalsSum: true },
    { header: 'REC',  getValue: (r) => r.recYards,     isTotalsSum: true },
    { header: 'TD',   getValue: (r) => (r.rushTDs ?? 0) + (r.recTDs ?? 0), isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,      isTotalsSum: false },
  ],
  WR: [
    { header: 'YDS',  getValue: (r) => r.recYards,     isTotalsSum: true },
    { header: 'TD',   getValue: (r) => r.recTDs,       isTotalsSum: true },
    { header: 'REC',  getValue: (r) => r.receptions,   isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,      isTotalsSum: false },
  ],
  TE: [
    { header: 'YDS',  getValue: (r) => r.recYards,     isTotalsSum: true },
    { header: 'TD',   getValue: (r) => r.recTDs,       isTotalsSum: true },
    { header: 'REC',  getValue: (r) => r.receptions,   isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,      isTotalsSum: false },
  ],
  OT: [
    { header: 'G',    getValue: (r) => r.gamesPlayed,  isTotalsSum: true },
    { header: 'GS',   getValue: (r) => r.gamesStarted, isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,      isTotalsSum: false },
  ],
  IOL: [
    { header: 'G',    getValue: (r) => r.gamesPlayed,  isTotalsSum: true },
    { header: 'GS',   getValue: (r) => r.gamesStarted, isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,      isTotalsSum: false },
  ],
  EDGE: [
    { header: 'SACK', getValue: (r) => r.sacks,         isTotalsSum: true },
    { header: 'TFL',  getValue: (r) => r.tfl,           isTotalsSum: true },
    { header: 'QBH',  getValue: (r) => r.qbHits,        isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,       isTotalsSum: false },
  ],
  DT: [
    { header: 'TFL',  getValue: (r) => r.tfl,           isTotalsSum: true },
    { header: 'QBH',  getValue: (r) => r.qbHits,        isTotalsSum: true },
    { header: 'TKL',  getValue: (r) => r.soloTackles,   isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,       isTotalsSum: false },
  ],
  LB: [
    { header: 'TKL',  getValue: (r) => r.soloTackles,   isTotalsSum: true },
    { header: 'TFL',  getValue: (r) => r.tfl,           isTotalsSum: true },
    { header: 'PD',   getValue: (r) => r.passDeflections, isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,       isTotalsSum: false },
  ],
  CB: [
    { header: 'INT',  getValue: (r) => r.defInts,        isTotalsSum: true },
    { header: 'PD',   getValue: (r) => r.passDeflections, isTotalsSum: true },
    { header: 'TKL',  getValue: (r) => r.soloTackles,    isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,        isTotalsSum: false },
  ],
  S: [
    { header: 'INT',  getValue: (r) => r.defInts,        isTotalsSum: true },
    { header: 'PD',   getValue: (r) => r.passDeflections, isTotalsSum: true },
    { header: 'TKL',  getValue: (r) => r.soloTackles,    isTotalsSum: true },
    { header: 'SNP%', getValue: (r) => r.snapPct,        isTotalsSum: false },
  ],
}

function sumStat(rows: DisplaySeasonRow[], getValue: (r: DisplaySeasonRow) => number | null): number | null {
  const vals = rows.map(getValue).filter((v): v is number => v !== null)
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null
}

function weightedSnapPct(rows: DisplaySeasonRow[]): number | null {
  const entries = rows
    .map((r) => ({ snapPct: r.snapPct, weight: r.snapCount ?? r.gamesPlayed }))
    .filter((e) => e.snapPct !== null && e.weight > 0) as Array<{ snapPct: number; weight: number }>
  if (entries.length === 0) return null
  const totalWeight = entries.reduce((a, e) => a + e.weight, 0)
  return totalWeight > 0
    ? entries.reduce((a, e) => a + e.snapPct * e.weight, 0) / totalWeight
    : null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlayerCard({ player, players, onClose, isMobile = false, playerSlug, currentStepId }: PlayerCardProps) {
  if (!player) return null;

  const draftYear = player.draft_year;
  const draftClassSuffix = `DC${String(draftYear).slice(-2)}`;

  const cardColorVars = useMemo(
    () => computeCardColors(player),
    [player]
  );

  const metricDefs = useMemo(
    () => buildMetricDefs(player, players),
    [player, players]
  );

  const { posRank, totalDraftedAtPos } = useMemo(() => {
    const draftedAtPos = players
      .filter((p) => p.pos === player.pos && p.drafted && p.pick_drafted != null)
      .sort((a, b) => (a.pick_drafted ?? 9999) - (b.pick_drafted ?? 9999));
    const idx = draftedAtPos.findIndex((p) => p.name === player.name);
    return {
      posRank: idx >= 0 ? idx + 1 : null,
      totalDraftedAtPos: draftedAtPos.length,
    };
  }, [player, players]);

  const cardId = useMemo(() => {
    const pos = player.pos;
    const rdStr = player.rd != null ? String(player.rd).padStart(2, "0") : "??";
    if (!player.drafted) {
      return `${pos}-${rdStr} ${draftClassSuffix}`;
    }
    if (player.rd_drafted == null) {
      return `${pos}-UD${rdStr} ${draftClassSuffix}`;
    }
    const rankStr  = posRank != null ? String(posRank).padStart(2, "0") : "??";
    const totalStr = totalDraftedAtPos > 0 ? String(totalDraftedAtPos) : "??";
    return `${pos}-${rankStr}/${totalStr} ${draftClassSuffix}`;
  }, [player, posRank, totalDraftedAtPos, draftClassSuffix]);

  const role = player.role && player.role !== "N/A" ? player.role : "Balanced";

  // Height display for meta block
  const heightNum = parseInt(String(player.height ?? ""), 10);
  const heightDisplay = isNaN(heightNum) ? null : inchesToHeightDisplay(scoutToInches(heightNum));

  const sizeLengthDefs = metricDefs.filter((m) => m.groupId === "pcmGroupSizeLength");
  const explosionDefs  = metricDefs.filter((m) => m.groupId === "pcmGroupExplosion");
  const agilityDefs    = metricDefs.filter((m) => m.groupId === "pcmGroupAgility");
  const strengthDefs   = metricDefs.filter((m) => m.groupId === "pcmGroupStrength");

  const classPeers = players.filter(
    p => p.pos === player.pos && p.draft_year === player.draft_year && p.player_id !== player.player_id
  );
  const funFact = player ? getFunFact(player, classPeers) : "";

  const currentTeamDisplay = useMemo(() => {
    const stepYear = currentStepId ? parseInt(currentStepId, 10) : NaN
    if (!isNaN(stepYear) && player.seasonData) {
      const row = player.seasonData.find((r) => r.season === stepYear)
      if (row && row.teams.length > 0) return row.teams[0]
      return '—'
    }
    if (currentStepId === 'career' && player.seasonData && player.seasonData.length > 0) {
      const lastSeason = player.seasonData[player.seasonData.length - 1]
      return lastSeason.teams[0] ?? '—'
    }
    if (player.drafted && player.team_drafted) return player.team_drafted
    return '—'
  }, [player, currentStepId])

  const hasProductionData = (player.seasonData?.length ?? 0) > 0
  const sectionLabel = hasProductionData ? 'Player Production' : 'Player Profile'

  const mostRecentSeason = player.seasonData
    ? [...player.seasonData].sort((a, b) => b.season - a.season)[0]
    : null
  const arcSnapYear = mostRecentSeason
    ? `'${String(mostRecentSeason.season).slice(-2)}`
    : null

  const tierLabelDisplay = player.outcomeScore != null
    ? getTierForScore(player.outcomeScore).label
    : '—'

  return (
    // Backdrop
    <div
      id="pcm-bd"
      style={{ display: "flex" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Card */}
      <div id="pcm-wrap" className="dm-card-wrap" style={cardColorVars} onClick={(e) => e.stopPropagation()}>

        {/* Drag handle — mobile bottom sheet only, outside dm-card-inner */}
        {isMobile && (
          <div className="pcm-drag-handle" onClick={onClose} aria-label="Close">
            <div className="pcm-drag-handle-pill" />
          </div>
        )}

        {/* dm-card-inner: structural border (replaces dm-frame overlay) */}
        <div className="dm-card-inner">

        {/* ── Header (pinned) ─────────────────────────────────────── */}
        <div className="dm-header">
          <button id="pcm-close" aria-label="Close player card" onClick={onClose}>&#x2715;</button>

          {/* Player name bar */}
          <div className="dm-name-bar">
            {/* Card Number — upper right, pennant shape */}
            <div className="dm-card-number">{cardId}</div>
            <h1 className="dm-player-name">{player.name}</h1>
            <div className="dm-secondary-rail" />
          </div>

          {/* Meta block */}
          <div className="dm-meta-block">
            {/* Row 1: Vitals */}
            <div className="dm-meta-row dm-meta-vitals">
              <span><span className="dm-meta-label">Pos.</span>&nbsp;<span className="dm-meta-value">{player.pos}</span></span>
              <span><span className="dm-meta-label">College</span>&nbsp;<span className="dm-meta-value">{player.school ?? "—"}</span></span>
              {heightDisplay && (
                <span><span className="dm-meta-label">Ht.</span>&nbsp;<span className="dm-meta-value">{heightDisplay}</span></span>
              )}
              {player.weight != null && player.weight > 0 && (
                <span><span className="dm-meta-label">Wt.</span>&nbsp;<span className="dm-meta-value">{player.weight}</span></span>
              )}
            </div>

            <div className="dm-meta-spacer" />

            {/* Row 2: Projected */}
            <div className="dm-meta-row">
              <span className="dm-meta-label">Projected</span>
              <span className="dm-meta-value">{player.rd != null ? `Round ${player.rd}` : "UDFA"}</span>
            </div>

            {/* Row 3: Drafted */}
            <div className="dm-meta-row">
              <span className="dm-meta-label">Drafted</span>
              {player.drafted ? (
                player.rd_drafted != null ? (
                  <span className="dm-meta-value">
                    {player.team_drafted ?? "—"}
                    &ensp;Rd&nbsp;{player.rd_drafted}
                    &ensp;Pick&nbsp;#{player.pick_drafted}
                    &ensp;{draftYear}
                  </span>
                ) : (
                  <span className="dm-meta-value">UDFA&ensp;{draftYear}</span>
                )
              ) : (
                <span className="dm-meta-value">—</span>
              )}
            </div>

            <div className="dm-meta-spacer" />

            {/* Row 4: Current — dynamic per Journey Step year */}
            <div className="dm-meta-row">
              <span className="dm-meta-label">Current</span>
              <span className="dm-meta-value">{currentTeamDisplay}</span>
            </div>
          </div>
        </div>

        {/* ── Body (scrolling) ──────────────────────────────────────── */}
        <div className="dm-body">

          {/* ── Player Production / Player Profile ──────────────────── */}
          <div className="dm-band">{sectionLabel}</div>
          {hasProductionData ? (
            <div className="pcm-section-block dm-production-body">
              {/* ARC Score snapshot */}
              {arcSnapYear && (
                <div className="dm-arc">
                  <div>
                    <div className="dm-arc-cap">ARC Score &middot; {arcSnapYear}</div>
                    <div className="dm-arc-num">{player.outcomeScore ?? '—'}</div>
                  </div>
                  <div className="dm-arc-pill">{tierLabelDisplay}</div>
                </div>
              )}

              {/* Stat grid */}
              {player.seasonData && (() => {
                const statCols = STAT_COLUMNS[player.pos] ?? []
                const allRows = player.seasonData!
                const rookieRows = allRows.filter((r) => r.season >= draftYear && r.season <= draftYear + 3)
                const hasPostRookie = allRows.some((r) => r.season > draftYear + 3)

                const seasonScoreData = allRows
                  .filter((r) => r.arcScore !== null)
                  .map((r) => ({ season: r.season, score: r.arcScore! }))
                const rookieARC = computeRookieContractARC(seasonScoreData, draftYear)
                const careerARC = player.outcomeScore

                const fmtStat = (v: number | null) => v !== null ? Math.round(v).toLocaleString('en-US') : '—'
                const fmtSnap = (v: number | null) => v !== null ? `${Math.round(v * 100)}%` : '—'
                const fmtARC  = (v: number | null) => v !== null ? String(Math.round(v)) : '—'

                const renderStatCell = (col: StatCol, row: DisplaySeasonRow) => {
                  const v = col.getValue(row)
                  return col.header === 'SNP%' ? fmtSnap(v) : fmtStat(v)
                }
                const renderTotalsStatCell = (col: StatCol, rows: DisplaySeasonRow[]) => {
                  if (col.header === 'SNP%') return fmtSnap(weightedSnapPct(rows))
                  return fmtStat(sumStat(rows, col.getValue))
                }

                return (
                  <table className="dm-stats">
                    <thead>
                      <tr>
                        <th>Yr</th>
                        <th>Team</th>
                        {statCols.map((c) => <th key={c.header}>{c.header}</th>)}
                        {statCols.length === 3 && <th />}
                        <th>ARC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rookieRows.map((row) => (
                        <tr key={row.season}>
                          <td>&apos;{String(row.season).slice(-2)}</td>
                          <td>{row.teams.join(' / ')}</td>
                          {statCols.map((c) => (
                            <td key={c.header} style={{ textAlign: 'right' }}>{renderStatCell(c, row)}</td>
                          ))}
                          {statCols.length === 3 && <td />}
                          <td style={{ textAlign: 'right' }}>
                            <span className="dm-award-flags">
                              {row.allPro  && <span title="All-Pro">★</span>}
                              {row.proBowl && <span title="Pro Bowl">†</span>}
                            </span>
                            <b>{fmtARC(row.arcScore)}</b>
                          </td>
                        </tr>
                      ))}

                      <tr className="dm-stats-total">
                        <td colSpan={2}>Rookie Contract</td>
                        {statCols.map((c) => (
                          <td key={c.header} style={{ textAlign: 'right' }}>{renderTotalsStatCell(c, rookieRows)}</td>
                        ))}
                        {statCols.length === 3 && <td />}
                        <td style={{ textAlign: 'right' }}>{fmtARC(rookieARC)}</td>
                      </tr>

                      {hasPostRookie && (
                        <tr className="dm-grid-spacer" aria-hidden="true">
                          <td colSpan={7} style={{ height: '14px', background: 'transparent', border: 'none' }} />
                        </tr>
                      )}

                      {hasPostRookie && allRows
                        .filter((r) => r.season > draftYear + 3)
                        .map((row) => (
                          <tr key={row.season}>
                            <td>&apos;{String(row.season).slice(-2)}</td>
                            <td>{row.teams.join(' / ')}</td>
                            {statCols.map((c) => (
                              <td key={c.header} style={{ textAlign: 'right' }}>{renderStatCell(c, row)}</td>
                            ))}
                            {statCols.length === 3 && <td />}
                            <td style={{ textAlign: 'right' }}>
                              <span className="dm-award-flags">
                                {row.allPro  && <span title="All-Pro">★</span>}
                                {row.proBowl && <span title="Pro Bowl">†</span>}
                              </span>
                              <b>{fmtARC(row.arcScore)}</b>
                            </td>
                          </tr>
                        ))
                      }

                      <tr className="dm-stats-total">
                        <td colSpan={2}>Career</td>
                        {statCols.map((c) => (
                          <td key={c.header} style={{ textAlign: 'right' }}>{renderTotalsStatCell(c, allRows)}</td>
                        ))}
                        {statCols.length === 3 && <td />}
                        <td style={{ textAlign: 'right' }}>{fmtARC(careerARC)}</td>
                      </tr>
                    </tbody>
                  </table>
                )
              })()}
            </div>
          ) : (
            <div className="pcm-section-block">
              <div className="pcm-profile-rail">
                {/* Role pennant */}
                <div>
                  <div className="pcm-profile-label">Role</div>
                  <div className="pcm-role-pennant">{role}</div>
                </div>

                {/* Strengths panel */}
                <div className="pcm-strengths-panel">
                  <div className="pcm-profile-label">Strengths Profile</div>
                  <div className="pcm-strength-stack">
                    {[
                      { s: player.s1, mod: "", kicker: "Primary" },
                      { s: player.s2, mod: " pcm-s-secondary", kicker: "Secondary" },
                      { s: player.s3, mod: " pcm-s-supportive", kicker: "Supportive" },
                    ].map(({ s, mod, kicker }) => (
                      <div key={kicker} className={`pcm-strength-row${mod}`}>
                        <div className="pcm-pennant-tail">
                          <div className="pcm-tail-strip upper" />
                          <div className="pcm-tail-strip lower" />
                        </div>
                        <div className="pcm-pennant-flag">
                          <div className="pcm-pennant-kicker">{kicker}</div>
                          <span className="pcm-pennant-text">
                            {s && s !== "N/A" ? s : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Size & Length ───────────────────────────────────────── */}
          <div className="dm-band">Size &amp; Length</div>
          <div className="pcm-section-block">
            <div className="pcm-metric-table">
              <MetricHeader pos={player.pos} draftYear={draftYear} />
              <div id="pcmGroupSizeLength">
                {sizeLengthDefs.map((m) => (
                  <MetricRow key={m.key} m={m} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Athletic Profile ────────────────────────────────────── */}
          <div className="dm-band">Athletic Profile</div>
          <div className="pcm-section-block">
            <div className="pcm-metric-table">
              <MetricHeader pos={player.pos} draftYear={draftYear} />
              <div id="pcmGroupExplosion">
                <h3 className="pcm-metric-subtitle">Speed &amp; Explosion</h3>
                {explosionDefs.map((m) => (
                  <MetricRow key={m.key} m={m} />
                ))}
              </div>
              <div id="pcmGroupAgility">
                <h3 className="pcm-metric-subtitle">Agility</h3>
                {agilityDefs.map((m) => (
                  <MetricRow key={m.key} m={m} />
                ))}
              </div>
              <div id="pcmGroupStrength">
                <h3 className="pcm-metric-subtitle">Strength</h3>
                {strengthDefs.map((m) => (
                  <MetricRow key={m.key} m={m} />
                ))}
              </div>
            </div>
          </div>

          {/* ── View full profile link (above Chalk Talk) ─────────────── */}
          {playerSlug && (
            <div className="dm-profile-link">
              <Link href={`/players/${playerSlug}`}>View full profile →</Link>
            </div>
          )}

          {/* ── Fun Fact Panel ────────────────────────────────────────── */}
          <div className="dm-funfact">
            {/* Left tag: team secondary colored — label: CHALK TALK */}
            <div className="dm-funfact-tag">
              <span>CHALK</span>
              <span>TALK</span>
            </div>

            {/* Right body: mascot + fact text + football stamp */}
            <div className="dm-funfact-body">
              <img
                src="/brand/dm-mascot.png"
                alt="DraftMap mascot"
                className="dm-funfact-mascot"
                width={96}
                height={96}
              />
              {funFact && (
                <p className="dm-funfact-text">
                  {funFact}
                </p>
              )}
              {/* Quiet football stamp — bottom-right corner flourish */}
              <svg className="dm-funfact-football" viewBox="0 0 22 14" aria-hidden="true">
                <ellipse cx="11" cy="7" rx="10" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="11" y1="1" x2="11" y2="13" stroke="currentColor" strokeWidth="1"/>
                <line x1="7" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="0.8"/>
                <line x1="6" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="0.8"/>
                <line x1="7" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="0.8"/>
              </svg>
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div className="dm-footer">
            &copy; DRAFTMAP {draftYear} &middot; CLASS OF &apos;{String(draftYear).slice(-2)} &middot; PRTD. IN U.S.A.
          </div>

        </div>{/* end dm-body */}
        </div>{/* end dm-card-inner */}
      </div>{/* end pcm-wrap */}
    </div>
  );
}
