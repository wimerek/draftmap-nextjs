"use client";
/**
 * components/chart/Act3Field.tsx
 *
 * Phase Lambda — Act 3 REFRAME resting field (Brief 3). Pure SVG: every coordinate
 * arrives pre-computed from computeAct3FieldLayout (lib/chartMath.ts). This file only
 * paints — no layout math, no D3.
 *
 *   X = draft pick (linear, fixed 1–262) + UDFA gutter.
 *   Y = window_usage percentile within position (top = 100) + too-few-snaps strip.
 *   COLOR = six-band money ladder (TOP5 gold → NEVER light-grey).
 *   Threads (one per banded dot) → six true-count wall nodes at the far right.
 *   "Most players never reach real money" reads as the dense grey ink weave.
 *
 * ADDITIVE — the legacy JellyfishField is untouched and still reachable via
 * ACT3_FIELD_VERSION. At rest (litIds null) this renders byte-identical every time;
 * it is the exact skip-state target frame for the Brief-4 2→3 animation.
 */

import type { Player } from "@/lib/sheets";
import type { Act3FieldLayout, Act3FieldDot, Act3WallNode } from "@/lib/chartMath";
import { teamDotColors } from "@/lib/chartConstants";
import { act3FieldGlyph } from "@/lib/act3FieldGlyph";
import { AwardGlyphMark } from "@/components/chart/AwardGlyphMark";
import {
  ACT3_BANDS, ACT3_WALL_ORDER,
  ACT3_DOT_R, ACT3_DOT_STROKE_W, ACT3_DOT_STROKE, ACT3_NAVY, ACT3_FIELD_BG,
  ACT3_TAB_BAR_W, ACT3_TAB_DX, ACT3_PENDING_BAND1_LABEL,
  ACT3_GRIDLINE_COLOR, ACT3_GRIDLINE_W, ACT3_RD_LABEL_COLOR, ACT3_RD_LABEL_SIZE,
  ACT3_AXIS_PICK_COLOR, ACT3_STRIP_FILL, ACT3_STRIP_DASH_COLOR, ACT3_STRIP_DASH,
  ACT3_CORNER_FILL, ACT3_UDFA_FRAME_COLOR, ACT3_UDFA_LABEL, ACT3_STRIP_LABEL,
  ACT3_Y_AXIS_TITLE, ACT3_Y_AXIS_QUALIFIER, ACT3_LENS_GHOST_OPACITY,
} from "@/lib/act3FieldConstants";

interface Act3FieldProps {
  layout: Act3FieldLayout;
  isMobile: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
  /** Lens (brief f): in-scope player_ids. null = NO lens → render byte-identical. */
  litIds?: Set<string> | null;
  /** Player search spotlight (independent of the lens; rings the located dot). */
  highlightedId?: string | null;
}

const GREY = "#6B7280";

export default function Act3Field(props: Act3FieldProps) {
  const { layout, isMobile, onDotClick, onDotHover, onDotLeave, litIds, highlightedId } = props;
  const {
    svgW, svgH, fieldTop, fieldBottom, stripTop, stripBottom,
    pickLeft, pickRight, udfaLeft, udfaRight, udfaCenterX,
    wallX, wallNodeW, maxPick, dots, wallNodes, roundAnchors, isPending,
  } = layout;

  // Lens: null litIds → no lens → isLit() true for all → resting render.
  const lensed = !!litIds;
  const isLit = (pid: string) => !litIds || litIds.has(pid);

  // Payer-color rest state (dot-color doctrine): banded dots wear the PAYING team;
  // signingTeam is null exactly for NEVER + unsigned, so those fall back to drafted
  // colors (Ken Walker rests Chiefs-red; a never-re-signed dot keeps its drafted hue).
  const dotColors = (p: Player) => teamDotColors(p.verdict?.signingTeam ?? p.team_drafted);

  // Full-fidelity dot — one definition for the resting field AND lit dots under a lens.
  const renderDot = (d: Act3FieldDot) => {
    const p = d.player;
    const c = dotColors(p);
    const glyph = act3FieldGlyph(p);
    return (
      <g key={`dot-${p.player_id}`} style={{ cursor: "pointer" }}>
        <circle
          cx={d.x} cy={d.y} r={ACT3_DOT_R}
          fill={c.fill}
          stroke={ACT3_DOT_STROKE}
          strokeWidth={ACT3_DOT_STROKE_W}
          onMouseEnter={isMobile ? undefined : (e) => onDotHover(p, e.clientX, e.clientY)}
          onMouseLeave={isMobile ? undefined : onDotLeave}
          onClick={() => onDotClick(p)}
        />
        <AwardGlyphMark glyph={glyph} cx={d.x} cy={d.y} r={ACT3_DOT_R} />
      </g>
    );
  };

  // Flattened ghost (fill-only) for non-lit dots under a lens — one uniform group
  // opacity, no glyphs, pointer-inert (mirrors the jellyfish ghost).
  const ghostDot = (d: Act3FieldDot) => {
    const c = dotColors(d.player);
    return <circle key={`gh-${d.player.player_id}`} cx={d.x} cy={d.y} r={ACT3_DOT_R} fill={c.fill} />;
  };

  // Y-axis furniture (rotated left title). Sits just left of the pick scale.
  const yTitleX = pickLeft - 46;
  const yAxisCy = (fieldTop + fieldBottom) / 2;
  const rdLabelY = stripBottom + 18;

  return (
    <svg
      width={isMobile ? "100%" : svgW}
      height={isMobile ? undefined : svgH}
      viewBox={isMobile ? `0 0 ${svgW} ${svgH}` : undefined}
      style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
    >
      <defs>
        {/* Two-register thread gradients: ink = faint-at-dot → firmer-at-wall (0.10→0.20);
            money = flat (dot==wall). Horizontal userSpace gradient pickLeft→wall. */}
        {ACT3_WALL_ORDER.map((band) => {
          const spec = ACT3_BANDS[band];
          return (
            <linearGradient
              key={`a3-thread-${band}`}
              id={`a3-thread-${band}`}
              gradientUnits="userSpaceOnUse"
              x1={pickLeft} y1={0} x2={wallX} y2={0}
            >
              <stop offset="0%"   stopColor={spec.color} stopOpacity={spec.threadOpacityDot} />
              <stop offset="100%" stopColor={spec.color} stopOpacity={spec.threadOpacityWall} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Background — parchment (register continuity with Acts 1–2). */}
      <rect x={0} y={0} width={svgW} height={svgH} fill={ACT3_FIELD_BG} />

      {/* ── Field furniture (behind data) ─────────────────────────────────── */}
      <g aria-hidden="true">
        {/* Round gridlines — vertical hairlines at each round's first pick (per-class). */}
        {roundAnchors.map((a) => (
          <line
            key={`grid-${a.rd}`}
            x1={a.x} y1={fieldTop} x2={a.x} y2={stripBottom}
            stroke={ACT3_GRIDLINE_COLOR} strokeWidth={ACT3_GRIDLINE_W}
          />
        ))}
        {/* Bottom axis hairline. */}
        <line x1={pickLeft} y1={stripBottom} x2={udfaRight} y2={stripBottom} stroke={ACT3_GRIDLINE_COLOR} strokeWidth={1} />
        {/* R1–R7 labels below the axis. */}
        {roundAnchors.map((a) => (
          <text key={`rl-${a.rd}`} x={a.x} y={rdLabelY} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_RD_LABEL_COLOR} textAnchor="start">
            R{a.rd}
          </text>
        ))}
        {/* The two shown pick numbers — 1 and 262 (all others live in hover). */}
        <text x={pickLeft} y={rdLabelY + 14} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_AXIS_PICK_COLOR} textAnchor="start">1</text>
        <text x={pickRight} y={rdLabelY + 14} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_AXIS_PICK_COLOR} textAnchor="middle">{maxPick}</text>

        {/* Too-few-snaps strip — navy ~4.5% fill + dashed top hairline (full field width,
            spanning under the UDFA column so the corner exists). */}
        <rect x={pickLeft} y={stripTop} width={udfaRight - pickLeft} height={stripBottom - stripTop} fill={ACT3_STRIP_FILL} />
        {/* Corner — a SECOND 4.5% fill in the UDFA×strip cell → renders ~9%. */}
        <rect x={udfaLeft} y={stripTop} width={udfaRight - udfaLeft} height={stripBottom - stripTop} fill={ACT3_CORNER_FILL} />
        <line x1={pickLeft} y1={stripTop} x2={udfaRight} y2={stripTop} stroke={ACT3_STRIP_DASH_COLOR} strokeWidth={1} strokeDasharray={ACT3_STRIP_DASH} />
        {/* Strip left edge-tab: TOO FEW SNAPS · n */}
        <text x={pickLeft + 2} y={stripTop + 15} fontSize={10} fontWeight={700} fill={ACT3_NAVY} letterSpacing={0.5}>
          {ACT3_STRIP_LABEL} · {layout.stripCount}
        </text>

        {/* UDFA strip — vertical band right of pick 262; dashed frame + gutter axis break. */}
        <line x1={udfaLeft} y1={fieldTop} x2={udfaLeft} y2={stripBottom} stroke={ACT3_UDFA_FRAME_COLOR} strokeWidth={1} strokeDasharray={ACT3_STRIP_DASH} />
        <line x1={udfaRight} y1={fieldTop} x2={udfaRight} y2={stripBottom} stroke={ACT3_UDFA_FRAME_COLOR} strokeWidth={1} strokeDasharray={ACT3_STRIP_DASH} />
        <text x={udfaCenterX} y={rdLabelY} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_RD_LABEL_COLOR} textAnchor="middle" letterSpacing={0.5}>
          {ACT3_UDFA_LABEL}
        </text>

        {/* Rotated left Y-axis title — USAGE · share of position's snaps. */}
        <text
          transform={`rotate(-90 ${yTitleX} ${yAxisCy})`}
          x={yTitleX} y={yAxisCy}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={11} letterSpacing={1}
        >
          <tspan fontWeight={700} fill={ACT3_NAVY}>{ACT3_Y_AXIS_TITLE}</tspan>
          <tspan fontWeight={400} fill={GREY}> · {ACT3_Y_AXIS_QUALIFIER}</tspan>
        </text>
      </g>

      {/* ── Threads (behind dots) — two-register weave ────────────────────── */}
      <g fill="none">
        {dots.map((d) => {
          if (!(d.threadPath && d.band)) return null;
          const spec = ACT3_BANDS[d.band];
          const lit = isLit(d.player.player_id);
          return (
            <path
              key={`th-${d.player.player_id}`}
              d={d.threadPath}
              stroke={`url(#a3-thread-${d.band})`}
              strokeWidth={spec.threadW}
              opacity={lensed && !lit ? ACT3_LENS_GHOST_OPACITY : undefined}
            />
          );
        })}
      </g>

      {/* ── The wall — six true-count nodes + right-rail edge tabs ─────────── */}
      <g>
        {wallNodes.map((n) => (
          <Act3WallTab key={`wall-${n.band}`} node={n} wallNodeW={wallNodeW} isPending={isPending} />
        ))}
      </g>

      {/* ── Dots (front) ──────────────────────────────────────────────────── */}
      <g>
        {lensed ? (
          <>
            <g opacity={ACT3_LENS_GHOST_OPACITY} style={{ pointerEvents: "none" }}>
              {dots.map((d) => (isLit(d.player.player_id) ? null : ghostDot(d)))}
            </g>
            {dots.map((d) => (isLit(d.player.player_id) ? renderDot(d) : null))}
          </>
        ) : (
          dots.map((d) => renderDot(d))
        )}
      </g>

      {/* Search spotlight — independent of the lens; rings the located dot. */}
      {highlightedId && (() => {
        const hd = dots.find((d) => d.player.player_id === highlightedId);
        return hd ? (
          <circle cx={hd.x} cy={hd.y} r={ACT3_DOT_R + 5} fill="none" stroke="#D4A017" strokeWidth={2} pointerEvents="none">
            <animate attributeName="r" values={`${ACT3_DOT_R + 3};${ACT3_DOT_R + 7};${ACT3_DOT_R + 3}`} dur="1.4s" repeatCount="indefinite" />
          </circle>
        ) : null;
      })()}
    </svg>
  );
}

/** One wall node + its right-rail edge tab (3px bookmark bar + Oswald name + Inter n·%).
 *  TRUE-COUNT node height (no floor); pending band-1 renders dashed + relabeled. */
function Act3WallTab({ node, wallNodeW, isPending }: { node: Act3WallNode; wallNodeW: number; isPending: boolean }) {
  const spec = ACT3_BANDS[node.band];
  const pendingBand1 = isPending && node.band === "NEVER";
  const name = pendingBand1 ? ACT3_PENDING_BAND1_LABEL : spec.labelPlaceholder;
  const barX = node.x + wallNodeW + ACT3_TAB_DX;
  const textX = barX + ACT3_TAB_BAR_W + 6;
  const tabH = 26;
  return (
    <g>
      {/* Node — solid fill (resolved) or dashed outline (pending band-1, no threads). */}
      {pendingBand1 ? (
        <rect
          x={node.x} y={node.y} width={wallNodeW} height={node.h}
          fill="none" stroke={spec.color} strokeWidth={1} strokeDasharray="3 2" rx={2}
        />
      ) : (
        <rect x={node.x} y={node.y} width={wallNodeW} height={node.h} fill={node.color} rx={2} />
      )}

      {/* Nudge connector — hairline from the tab back to the node center when the tab
          was pushed to keep its pitch (LABEL nudges, node never moves). Suppressed for
          empty (count 0) nodes: the pending-class case stacks five zero-height money
          nodes whose connectors would converge and read as errant threads. The tab +
          bookmark bar + 0·0% line still render; the connector returns once count > 0. */}
      {node.tabNudged && node.count > 0 && (
        <line
          x1={node.x + wallNodeW} y1={node.cy} x2={barX} y2={node.tabY}
          stroke={spec.color} strokeWidth={0.75} opacity={0.6}
        />
      )}

      {/* 3px bookmark bar in band color. */}
      <rect x={barX} y={node.tabY - tabH / 2} width={ACT3_TAB_BAR_W} height={tabH} fill={spec.color} rx={1} />

      {/* Oswald small-caps name. */}
      <text
        x={textX} y={node.tabY - 3}
        fontSize={11} fontWeight={600} fill={ACT3_NAVY}
        fontFamily="var(--font-oswald, 'Oswald', sans-serif)"
        style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {name}
      </text>
      {/* Inter n · % line. */}
      <text x={textX} y={node.tabY + 11} fontSize={9.5} fill={GREY}>
        {node.count} · {node.pct}%
      </text>
    </g>
  );
}
