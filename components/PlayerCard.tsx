"use client";

/**
 * components/PlayerCard.tsx
 *
 * Phase 2b: Full implementation of the player detail modal as a React component.
 *
 * Uses the same CSS classes and element IDs as the original chart-engine.js
 * pcm* functions so the existing <style> block in chartTemplate.ts applies
 * without any changes. Team colors are applied via CSS custom properties on
 * the wrapper element (--pcm-team-primary, etc.).
 *
 * Props:
 *   player  — the Player to display (null = card is closed / not rendered)
 *   players — full player array, needed to build positional peer comparisons
 *   onClose — called when user dismisses the card
 */

"use client";

import { useMemo } from "react";
import type { Player } from "@/lib/sheets";
import { SCHOOL_COLORS, cardPositionalRangeData } from "@/lib/chartConstants";
import { scoutToInches, inchesToHeightDisplay } from "@/lib/chartMath";

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
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toRgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function computeTeamColors(school: string | null) {
  const sc = SCHOOL_COLORS[school ?? ""] ?? { fill: "#4A4A4A", stroke: "#6B7280" };
  const effectiveSecondary =
    luminance(sc.stroke) > 0.7 ? toRgba(sc.fill, 0.65) : sc.stroke;
  return {
    "--pcm-team-primary": sc.fill,
    "--pcm-team-secondary": effectiveSecondary,
    "--pcm-team-primary-wash": toRgba(sc.fill, 0.2),
  } as React.CSSProperties;
}

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
      .filter((p) => p.pos === pos && p.name !== player.name)
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

// ── Metric section with header ────────────────────────────────────────────────

const METRIC_HEADER = (
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
          <span className="pcm-peer-label">2026 class</span>
        </span>
      </div>
    </div>
    <div>Better</div>
    <div>Context</div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function PlayerCard({ player, players, onClose, isMobile = false }: PlayerCardProps) {
  if (!player) return null;

  const teamColorVars = useMemo(
    () => computeTeamColors(player.school),
    [player.school]
  );

  const metricDefs = useMemo(
    () => buildMetricDefs(player, players),
    [player, players]
  );

  // Compute position rank (1-indexed rank within this position)
  const posRank = useMemo(() => {
    const ranked = players
      .filter((p) => p.pos === player.pos && (p.rank ?? 0) > 0)
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
    const idx = ranked.findIndex((p) => p.name === player.name);
    return idx >= 0 ? idx + 1 : 1;
  }, [player, players]);

  const cardId = `${player.pos}-${String(posRank).padStart(2, "0")}`;
  const role = player.role && player.role !== "N/A" ? player.role : "Balanced";
  const year = 2026; // TODO: make dynamic when multi-year support lands

  const sizeLengthDefs = metricDefs.filter((m) => m.groupId === "pcmGroupSizeLength");
  const explosionDefs  = metricDefs.filter((m) => m.groupId === "pcmGroupExplosion");
  const agilityDefs    = metricDefs.filter((m) => m.groupId === "pcmGroupAgility");
  const strengthDefs   = metricDefs.filter((m) => m.groupId === "pcmGroupStrength");

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
      <div id="pcm-wrap" style={teamColorVars} onClick={(e) => e.stopPropagation()}>
        {/* Drag handle — mobile bottom sheet only */}
        {isMobile && (
          <div className="pcm-drag-handle" onClick={onClose} aria-label="Close">
            <div className="pcm-drag-handle-pill" />
          </div>
        )}

        <button id="pcm-close" aria-label="Close player card" onClick={onClose}>
          &#x2715;
        </button>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ position: "relative", padding: "4px 2px 0" }}>
          <div className="pcm-card-id">{cardId}</div>

          {/* Draft result badge — desktop only */}
          {player.drafted && !isMobile && (
            <div id="pcmDraftResult" style={{ display: "block" }}>
              <div className="pcm-draft-badge-label">Drafted</div>
              <table className="pcm-draft-table">
                <tbody>
                  <tr><td>Team</td><td>{player.team_drafted ?? "—"}</td></tr>
                  <tr><td>Round</td><td>{player.rd_drafted != null ? `Rd ${player.rd_drafted}` : "—"}</td></tr>
                  <tr><td>Pick</td><td>{player.pick_drafted != null ? `#${player.pick_drafted}` : "—"}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          <div style={{ textAlign: "center", margin: "2px 48px 8px" }}>
            <h1 className="pcm-player-name">{player.name}</h1>
          </div>

          <div className="pcm-identity-line">
            <span>{player.pos}</span>
            <span className="pcm-meta-divider" />
            <span>{player.school ?? ""}</span>
          </div>

          {/* Mobile: static drafted info line */}
          {isMobile && player.drafted && (player.rd_drafted != null || player.team_drafted) && (
            <div style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--pcm-text-muted, rgba(30,26,22,0.55))", paddingTop: 4, paddingBottom: 2 }}>
              {`Drafted${player.rd_drafted != null ? `: Rd ${player.rd_drafted}` : ""}${player.pick_drafted != null ? `, Pick #${player.pick_drafted}` : ""}${player.team_drafted ? ` — ${player.team_drafted}` : ""}`}
            </div>
          )}
        </div>

        {/* ── Player Profile ──────────────────────────────────────── */}
        <div className="pcm-section-band">Player Profile</div>
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

        {/* ── Size & Length ───────────────────────────────────────── */}
        <div className="pcm-section-band">Size &amp; Length</div>
        <div className="pcm-section-block">
          <div className="pcm-metric-table">
            {METRIC_HEADER}
            <div id="pcmGroupSizeLength">
              {sizeLengthDefs.map((m) => (
                <MetricRow key={m.key} m={m} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Athletic Profile ────────────────────────────────────── */}
        <div className="pcm-section-band">Athletic Profile</div>
        <div className="pcm-section-block">
          <div className="pcm-metric-table">
            {METRIC_HEADER}
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
      </div>
    </div>
  );
}
