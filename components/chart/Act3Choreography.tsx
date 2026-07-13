"use client";
/**
 * components/chart/Act3Choreography.tsx
 *
 * Phase Lambda — Brief 4. The animated 2→3 transition, rendered in the SAME Act-3 SVG
 * canvas (1600×960) the resting field (Act3Field) uses, so the terminal frame is
 * pixel-identical to the Brief-3 rest state (frame-identity gate §8.4). Pure paint from
 * ONE input: `elapsedMs` off DraftChart's RAF master clock. All geometry + timing come
 * pre-computed from computeAct3Choreography (lib/choreography.ts). No layout math here.
 *
 * Three movements (spec §§3–5):
 *   I  THE PIVOT     — columns dissolve, dots swing to pick-on-floor (radius act2_r→r5.5),
 *                      furniture + wall outlines + strip fade in, 800ms breath.
 *   II THE AUDITION  — pick-by-pick rise to usage height (or into the strip), settle
 *                      pulse + glyph fade-in, drafted colors, no threads.
 *   III THE PAYDAY   — band-by-band tab-lights (the legend) + node fills + threads lash
 *                      wall→dot, grab flare, dot color drafted→paying, counter climbs
 *                      then STALLS on the ink fog. In-SVG counter fades out at handoff.
 *
 * On completion / Skip, DraftChart unmounts this and mounts Act3Field (the rest frame).
 */

import type { Player } from "@/lib/sheets";
import type { Act3FieldDot, Act3WallNode } from "@/lib/chartMath";
import { teamDotColors } from "@/lib/chartConstants";
import { act3FieldGlyph } from "@/lib/act3FieldGlyph";
import { AwardGlyphMark } from "@/components/chart/AwardGlyphMark";
import {
  type Act3Choreography as Choreo,
  sampleDot, fadeIn, fadeOut, clamp01, easeOutQuad,
  CH_PIVOT_COL_FADE_MS, CH_PIVOT_FURNITURE_IN, CH_PIVOT_WALL_IN,
  CH_THREAD_FLIGHT_MS, CH_COLOR_CROSSFADE_MS, CH_FLARE_MS, CH_TAB_LIGHT_MS,
} from "@/lib/choreography";
import {
  ACT3_BANDS, ACT3_WALL_ORDER,
  ACT3_DOT_STROKE_W, ACT3_DOT_STROKE, ACT3_NAVY, ACT3_FIELD_BG,
  ACT3_TAB_BAR_W, ACT3_TAB_DX, ACT3_PENDING_BAND1_LABEL,
  ACT3_GRIDLINE_COLOR, ACT3_GRIDLINE_W, ACT3_RD_LABEL_COLOR, ACT3_RD_LABEL_SIZE,
  ACT3_AXIS_PICK_COLOR, ACT3_STRIP_FILL, ACT3_STRIP_DASH_COLOR, ACT3_STRIP_DASH,
  ACT3_CORNER_FILL, ACT3_UDFA_FRAME_COLOR, ACT3_UDFA_LABEL, ACT3_STRIP_LABEL,
  ACT3_Y_AXIS_TITLE, ACT3_Y_AXIS_QUALIFIER, ACT3_LENS_GHOST_OPACITY,
  ACT3_WALL_NODE_W,
} from "@/lib/act3FieldConstants";

interface Props {
  choreo: Choreo;
  elapsedMs: number;
  isMobile: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
  litIds?: Set<string> | null;
}

// ── Color lerp (drafted → paying, matches PlayerDots.rgbLerp) ────────────────────
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbLerp(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)}, ${Math.round(g1 + (g2 - g1) * t)}, ${Math.round(b1 + (b2 - b1) * t)})`;
}

export default function Act3Choreography(props: Props) {
  const { choreo, elapsedMs: t, isMobile, onDotClick, onDotHover, onDotLeave, litIds } = props;
  const L = choreo.fieldLayout;
  const {
    svgW, svgH, fieldTop, fieldBottom, stripTop, stripBottom,
    pickLeft, pickRight, udfaLeft, udfaRight, udfaCenterX,
    wallX, maxPick, wallNodes, roundAnchors, isPending,
  } = L;

  const lensed = !!litIds;
  const isLit = (pid: string) => !litIds || litIds.has(pid);

  // Movement-I furniture opacities.
  const colFade   = fadeOut(t, 0, CH_PIVOT_COL_FADE_MS);                    // columns dissolve
  const furniture = fadeIn(t, CH_PIVOT_FURNITURE_IN.start, CH_PIVOT_FURNITURE_IN.end);
  const wallIn    = fadeIn(t, CH_PIVOT_WALL_IN.start, CH_PIVOT_WALL_IN.end); // outlines + strip

  const yTitleX = pickLeft - 46;
  const yAxisCy = (fieldTop + fieldBottom) / 2;
  const rdLabelY = stripBottom + 18;

  // ── Beat lookup (per band: when its tab lights / node fills) ──────────────────
  const beatOf = new Map(choreo.beats.map(b => [b.band, b]));

  // The GOT PAID counter is NO LONGER on-field (spec §6, revised): the scoreboard hero
  // is the live money counter now. Nothing draws it here — the chart terminal frame is
  // Act3Field with zero counter residue in any state (§8.4).

  return (
    <svg
      width={isMobile ? "100%" : svgW}
      height={isMobile ? undefined : svgH}
      viewBox={isMobile ? `0 0 ${svgW} ${svgH}` : undefined}
      style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
    >
      <defs>
        {ACT3_WALL_ORDER.map((band) => {
          const spec = ACT3_BANDS[band];
          return (
            <linearGradient
              key={`a3-thread-${band}`} id={`a3c-thread-${band}`}
              gradientUnits="userSpaceOnUse" x1={pickLeft} y1={0} x2={wallX} y2={0}
            >
              <stop offset="0%"   stopColor={spec.color} stopOpacity={spec.threadOpacityDot} />
              <stop offset="100%" stopColor={spec.color} stopOpacity={spec.threadOpacityWall} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Background — parchment (continuous with Acts 1–2, so no flash at Play-press). */}
      <rect x={0} y={0} width={svgW} height={svgH} fill={ACT3_FIELD_BG} />

      {/* ── Movement I: position columns dissolving (0–300ms) ──────────────────── */}
      {colFade > 0 && (
        <g aria-hidden="true" opacity={colFade}>
          {choreo.pivotColumns.map((c) => (
            <g key={`piv-${c.label}`}>
              <line x1={c.xLeft} y1={fieldTop} x2={c.xLeft} y2={fieldBottom}
                stroke="rgba(11,34,57,0.10)" strokeWidth={1} />
              <text x={c.xCenter} y={fieldTop - 8} fontSize={11} fontWeight={700}
                fill={ACT3_NAVY} textAnchor="middle" letterSpacing={0.5}>{c.label}</text>
            </g>
          ))}
        </g>
      )}

      {/* ── Field furniture (fades in 600–1000ms; full at rest) ────────────────── */}
      <g aria-hidden="true" opacity={furniture}>
        {roundAnchors.map((a) => (
          <line key={`grid-${a.rd}`} x1={a.x} y1={fieldTop} x2={a.x} y2={stripBottom}
            stroke={ACT3_GRIDLINE_COLOR} strokeWidth={ACT3_GRIDLINE_W} />
        ))}
        <line x1={pickLeft} y1={stripBottom} x2={udfaRight} y2={stripBottom} stroke={ACT3_GRIDLINE_COLOR} strokeWidth={1} />
        {roundAnchors.map((a) => (
          <text key={`rl-${a.rd}`} x={a.x} y={rdLabelY} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_RD_LABEL_COLOR} textAnchor="start">R{a.rd}</text>
        ))}
        <text x={pickLeft} y={rdLabelY + 14} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_AXIS_PICK_COLOR} textAnchor="start">1</text>
        <text x={pickRight} y={rdLabelY + 14} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_AXIS_PICK_COLOR} textAnchor="middle">{maxPick}</text>
        <line x1={udfaLeft} y1={fieldTop} x2={udfaLeft} y2={stripBottom} stroke={ACT3_UDFA_FRAME_COLOR} strokeWidth={1} strokeDasharray={ACT3_STRIP_DASH} />
        <line x1={udfaRight} y1={fieldTop} x2={udfaRight} y2={stripBottom} stroke={ACT3_UDFA_FRAME_COLOR} strokeWidth={1} strokeDasharray={ACT3_STRIP_DASH} />
        <text x={udfaCenterX} y={rdLabelY} fontSize={ACT3_RD_LABEL_SIZE} fill={ACT3_RD_LABEL_COLOR} textAnchor="middle" letterSpacing={0.5}>{ACT3_UDFA_LABEL}</text>
        {/* LABEL READABILITY PASS (§3g) — mirror Act3Field exactly so the terminal
            frame stays pixel-identical to the rest field (Brief-4 skip-frame gate). */}
        <text transform={`rotate(-90 ${yTitleX} ${yAxisCy})`} x={yTitleX} y={yAxisCy}
          textAnchor="middle" dominantBaseline="middle" fontSize={13.5} letterSpacing={1}>
          <tspan fontWeight={700} fill={ACT3_NAVY}>{ACT3_Y_AXIS_TITLE}</tspan>
          <tspan fontWeight={500} fill="#4B5563"> · {ACT3_Y_AXIS_QUALIFIER}</tspan>
        </text>
      </g>

      {/* ── Too-few-snaps strip + corner (fades in 700–1000ms with the wall) ───── */}
      <g aria-hidden="true" opacity={wallIn}>
        <rect x={pickLeft} y={stripTop} width={udfaRight - pickLeft} height={stripBottom - stripTop} fill={ACT3_STRIP_FILL} />
        <rect x={udfaLeft} y={stripTop} width={udfaRight - udfaLeft} height={stripBottom - stripTop} fill={ACT3_CORNER_FILL} />
        <line x1={pickLeft} y1={stripTop} x2={udfaRight} y2={stripTop} stroke={ACT3_STRIP_DASH_COLOR} strokeWidth={1} strokeDasharray={ACT3_STRIP_DASH} />
        <text x={pickLeft + 2} y={stripTop + 15} fontSize={11.5} fontWeight={700} fill={ACT3_NAVY} letterSpacing={0.5}>
          {ACT3_STRIP_LABEL} · {L.stripCount}
        </text>
      </g>

      {/* ── Threads (behind dots) — money draw-on, ink fog fade-in ─────────────── */}
      <g fill="none">
        {L.dots.map((d) => {
          if (!(d.threadPath && d.band)) return null;
          const s = choreo.dotSchedules.get(d.player.player_id);
          if (!s || !s.threaded || s.threadStart == null || t < s.threadStart) return null;
          const spec = ACT3_BANDS[d.band];
          const lit = isLit(d.player.player_id);
          const ghost = lensed && !lit ? ACT3_LENS_GHOST_OPACITY : undefined;
          if (s.isMoney) {
            // Draw-on wall→dot over the flight window (easeOutQuad).
            const p = easeOutQuad(clamp01((t - s.threadStart) / CH_THREAD_FLIGHT_MS));
            if (p >= 1) {
              return <path key={`th-${d.player.player_id}`} d={d.threadPath} stroke={`url(#a3c-thread-${d.band})`} strokeWidth={spec.threadW} opacity={ghost} />;
            }
            return (
              <path key={`th-${d.player.player_id}`} d={d.threadPath}
                stroke={`url(#a3c-thread-${d.band})`} strokeWidth={spec.threadW}
                pathLength={1} strokeDasharray="1" strokeDashoffset={-(1 - p)}
                opacity={ghost} />
            );
          }
          // Ink — fade in along full length (no lash). Opacity 0→1 multiplies the gradient.
          const inkP = clamp01((t - s.threadStart) / 1800);
          const op = ghost != null ? ghost * inkP : inkP;
          return <path key={`th-${d.player.player_id}`} d={d.threadPath} stroke={`url(#a3c-thread-${d.band})`} strokeWidth={spec.threadW} opacity={op} />;
        })}
      </g>

      {/* ── The wall — outlines fade in (Movement I), fill + tabs light per beat ─ */}
      <g>
        {wallNodes.map((n) => (
          <ChoreoWallTab key={`wall-${n.band}`} node={n} isPending={isPending}
            wallIn={wallIn} beat={beatOf.get(n.band) ?? null} elapsed={t}
            fallbackTabStart={choreo.timeline.paydayStart} />
        ))}
      </g>

      {/* ── Dots ───────────────────────────────────────────────────────────────── */}
      <g>
        {L.dots.map((d) => {
          const p = d.player;
          const s = choreo.dotSchedules.get(p.player_id);
          if (!s) return null;
          const f = sampleDot(choreo, d, t);
          const lit = isLit(p.player_id);
          const draftedFill = teamDotColors(p.team_drafted).fill;
          const payingFill = teamDotColors(p.verdict?.signingTeam ?? p.team_drafted).fill;
          const colorP = s.colorStart == null ? 0 : clamp01((t - s.colorStart) / CH_COLOR_CROSSFADE_MS);
          const fill = rgbLerp(draftedFill, payingFill, colorP);
          const glyph = f.glyphOpacity > 0 ? act3FieldGlyph(p) : null;
          const effR = f.r * f.scale;
          const groupOpacity = lensed && !lit ? ACT3_LENS_GHOST_OPACITY : 1;

          // Grab flare — money only, at thread arrival, blooms + fades (gone by rest).
          let flare = null;
          if (s.flareStart != null && t >= s.flareStart) {
            const fp = clamp01((t - s.flareStart) / CH_FLARE_MS);
            if (fp < 1 && d.band) {
              flare = (
                <circle cx={f.x} cy={f.y} r={effR + 2 + fp * 8} fill="none"
                  stroke={ACT3_BANDS[d.band].color} strokeWidth={1.5} opacity={(1 - fp) * 0.9}
                  pointerEvents="none" />
              );
            }
          }

          return (
            <g key={`dot-${p.player_id}`} opacity={groupOpacity} style={{ cursor: "pointer" }}>
              {flare}
              <circle
                cx={f.x} cy={f.y} r={effR}
                fill={fill} stroke={ACT3_DOT_STROKE} strokeWidth={ACT3_DOT_STROKE_W}
                onMouseEnter={isMobile ? undefined : (e) => onDotHover(p, e.clientX, e.clientY)}
                onMouseLeave={isMobile ? undefined : onDotLeave}
                onClick={() => onDotClick(p)}
              />
              {glyph && (
                <g opacity={f.glyphOpacity}>
                  <AwardGlyphMark glyph={glyph} cx={f.x} cy={f.y} r={effR} />
                </g>
              )}
            </g>
          );
        })}
      </g>

    </svg>
  );
}

/**
 * One wall node during the choreography. Movement I: 1px band-color outline @0.35 fades
 * in (no fill, tab unlit). Its money/ink beat: outline crossfades to a solid fill (or
 * dashed, pending band-1) and the right-rail tab (bookmark bar + name + n·%) lights over
 * 250ms. At rest this equals Act3Field's Act3WallTab.
 */
function ChoreoWallTab({
  node, isPending, wallIn, beat, elapsed, fallbackTabStart,
}: {
  node: Act3WallNode;
  isPending: boolean;
  wallIn: number;
  beat: { tabLightStart: number; nodeFillStart: number } | null;
  elapsed: number;
  /** For an empty money band (no beat, spec §7.8): light its tab quietly during payday
   *  so the terminal frame still shows all six tabs (frame-identity with Act3Field). */
  fallbackTabStart: number;
}) {
  const spec = ACT3_BANDS[node.band];
  const pendingBand1 = isPending && node.band === "NEVER";
  const name = pendingBand1 ? ACT3_PENDING_BAND1_LABEL : spec.labelPlaceholder;
  const barX = node.x + ACT3_WALL_NODE_W + ACT3_TAB_DX;
  const textX = barX + ACT3_TAB_BAR_W + 6;
  const tabH = 26;

  const fillP = beat ? fadeIn(elapsed, beat.nodeFillStart, beat.nodeFillStart + CH_TAB_LIGHT_MS) : 0;
  const tabP  = beat
    ? fadeIn(elapsed, beat.tabLightStart, beat.tabLightStart + CH_TAB_LIGHT_MS)
    : fadeIn(elapsed, fallbackTabStart, fallbackTabStart + CH_TAB_LIGHT_MS);
  // Outline present from Movement I; recedes as the node fills.
  const outlineOp = wallIn * 0.35 * (1 - fillP);

  return (
    <g>
      {/* Movement-I outline (band color @0.35), recedes as the node fills. */}
      {outlineOp > 0.001 && (
        <rect x={node.x} y={node.y} width={ACT3_WALL_NODE_W} height={node.h}
          fill="none" stroke={spec.color} strokeWidth={1} opacity={outlineOp} rx={2} />
      )}
      {/* Node fill — solid (resolved) or dashed outline (pending band-1, no fill). */}
      {pendingBand1 ? (
        <rect x={node.x} y={node.y} width={ACT3_WALL_NODE_W} height={node.h}
          fill="none" stroke={spec.color} strokeWidth={1} strokeDasharray="3 2" rx={2}
          opacity={Math.max(wallIn * 0.35, tabP)} />
      ) : (
        fillP > 0.001 && (
          <rect x={node.x} y={node.y} width={ACT3_WALL_NODE_W} height={node.h}
            fill={node.color} rx={2} opacity={fillP} />
        )
      )}

      {/* Right-rail tab — lights with the beat (name + count = the legend). */}
      {tabP > 0.001 && (
        <g opacity={tabP}>
          {node.tabNudged && node.count > 0 && (
            <line x1={node.x + ACT3_WALL_NODE_W} y1={node.cy} x2={barX} y2={node.tabY}
              stroke={spec.color} strokeWidth={0.75} opacity={0.6} />
          )}
          <rect x={barX} y={node.tabY - tabH / 2} width={ACT3_TAB_BAR_W} height={tabH} fill={spec.color} rx={1} />
          {/* Oswald uppercase 600 (wall-label lock 2026-07-11): Oswald has no true small-cap
              glyphs, so font-variant synthesized them — replaced per Butterick/Datawrapper caps
              doctrine (uppercase + tracking, weight unchanged).
              MUST mirror Act3Field's Act3WallTab exactly (frame-identity gate §8.4). */}
          <text x={textX} y={node.tabY - 4} fontSize={13} fontWeight={600} fill={ACT3_NAVY}
            fontFamily="var(--font-oswald, 'Oswald', sans-serif)"
            style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{name}</text>
          <text x={textX} y={node.tabY + 13} fontSize={11.5} fill="#4B5563">{node.count} · {node.pct}%</text>
        </g>
      )}
    </g>
  );
}
