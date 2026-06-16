"use client";
/**
 * components/chart/JellyfishField.tsx
 *
 * Act 3 — the resolved "second contract" jellyfish field (verdict brief b).
 *
 * Pure SVG: every coordinate arrives pre-computed from computeJellyfishLayout
 * (lib/chartMath.ts). This file only paints — no layout math, no D3.
 *
 *   X = draft capital (pick).        Y = √(verdict_share) + floor strips.
 *   Threads (one per dot)  →  the 5 tier wall nodes at the far right.
 *   "Most never get paid" reads as the grey wash-out mass of NONE/PROVE-IT threads.
 *
 * Y-scale is a swappable strategy upstream (resolved = verdict-share); brief c
 * plugs in a usage-percentile strategy without touching this component.
 */

import type { Player } from "@/lib/sheets";
import type { JellyfishLayout, PendingZone } from "@/lib/chartMath";
import { teamDotColors } from "@/lib/chartConstants";
import { rookieAwardGlyph, type AwardGlyph } from "@/lib/awardGlyph";
import {
  DOT_R, LINE_GOLD, GRAB_RING_OPACITY, GRAB_RING_W,
  THREAD_OPACITY_MIN, THREAD_OPACITY_MAX, THREAD_W,
  DATA_GAP_FILL, DATA_GAP_STROKE, UNRANKED_DOT_OPACITY, WALL_TIER_ORDER, TIER_THREAD_COLOR,
  WALL_LABEL_DX,
  COULDNT_STICK_STROKE,
  ZONE_TAB_FILL, ZONE_TAB_BAR, ZONE_TAB_BAR_W, ZONE_TAB_W, ZONE_TAB_H,
  ZONE_LINE_COLOR, ZONE_LABEL_COLOR, ZONE_COUNT_COLOR,
  RD_LABEL_COLOR, RD_AXIS_RULE_COLOR,
  PENDING_REACH_THREAD_OPACITY,
  GLYPH_FILL, GLYPH_KEYLINE, GLYPH_KEYLINE_W, GLYPH_DOT_FRAC,
  LENS_GHOST_OPACITY, LENS_LIT_THREAD_OPACITY_MIN, LENS_LIT_THREAD_OPACITY_MAX,
  LENS_WALL_LIT_COLOR, LENS_WALL_DIM_COLOR, LENS_WALL_LIT_SIZE,
} from "@/lib/act3Constants";

const PARCHMENT = "#F5F0E8";
const NAVY = "#0B2239";

interface JellyfishFieldProps {
  layout: JellyfishLayout;
  isMobile: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
  /**
   * Lens (brief f): the set of in-scope player_ids. null = NO lens active → render
   * byte-identical to the resting field (every lens branch below is guarded on this).
   * When non-null, lit dots/threads re-light LOUD and the rest ghost; geometry (dot
   * positions, thread paths, wall heights) is UNCHANGED — opacity/stroke only.
   */
  litIds?: Set<string> | null;
}

export default function JellyfishField(props: JellyfishFieldProps) {
  // Pending / floor fields are net-new render layers, keyed off layout.mode.
  // The resolved branch below is left untouched (DO-NOT-TOUCH).
  if (props.layout.mode === "pending") return <PendingJellyfishField {...props} />;
  if (props.layout.mode === "floor")   return <FloorJellyfishField {...props} />;

  const { layout, isMobile, onDotClick, onDotHover, onDotLeave, litIds } = props;
  const { svgW, svgH, margin, wallX, wallNodeW, dots, wallNodes, bandTop, bandH } = layout;

  // ── Lens (brief f): re-light the in-scope weave, ghost the rest ──────────────
  // null litIds → no lens → isLit() true for all → every branch collapses to the
  // resting render (gradients/opacity/sub-counts all skipped). One membership check;
  // geometry never changes.
  const lensed = !!litIds;
  const isLit = (pid: string) => !litIds || litIds.has(pid);
  // Wall RE-LIGHT: per-node count of LIT dots threading to it. Heights NEVER recompute
  // — this is an additive sub-count beside the frozen global label (7.0).
  const litWall = lensed
    ? dots.reduce((m, d) => {
        if (d.tier && isLit(d.player.player_id)) m.set(d.tier, (m.get(d.tier) ?? 0) + 1);
        return m;
      }, new Map<string, number>())
    : null;

  // Full-fidelity resolved dot (grab-ring + glyph + hover). ONE definition used for
  // the resting field (no lens) AND for LIT dots under a lens, so lit == resting.
  const renderResolvedDot = (d: JellyfishLayout["dots"][number]) => {
    const p = d.player;
    if (d.isDataGap) {
      return (
        <circle
          key={`dot-${p.player_id}`}
          cx={d.x} cy={d.y} r={DOT_R}
          fill={DATA_GAP_FILL}
          stroke={DATA_GAP_STROKE}
          strokeWidth={1}
          strokeDasharray="1.5 1.5"
          style={{ cursor: "pointer" }}
          onMouseEnter={isMobile ? undefined : (e) => onDotHover(p, e.clientX, e.clientY)}
          onMouseLeave={isMobile ? undefined : onDotLeave}
          onClick={() => onDotClick(p)}
        >
          <title>{p.name} — data gap (no contract row)</title>
        </circle>
      );
    }
    const teamColors = teamDotColors(p.team_drafted);
    const glyph = rookieAwardGlyph(p);
    return (
      <g key={`dot-${p.player_id}`} style={{ cursor: "pointer" }}>
        {/* Grab ring — flares toward the thread (wall) side. */}
        <circle
          cx={d.x} cy={d.y} r={DOT_R + 2.2}
          fill="none"
          stroke="url(#jf-grab-ring)"
          strokeWidth={GRAB_RING_W}
          pointerEvents="none"
        />
        <circle
          cx={d.x} cy={d.y} r={DOT_R}
          fill={teamColors.fill}
          stroke={teamColors.stroke}
          strokeWidth={1}
          onMouseEnter={isMobile ? undefined : (e) => onDotHover(p, e.clientX, e.clientY)}
          onMouseLeave={isMobile ? undefined : onDotLeave}
          onClick={() => onDotClick(p)}
        />
        <AwardGlyphMark glyph={glyph} cx={d.x} cy={d.y} r={DOT_R} />
      </g>
    );
  };

  return (
    <svg
      width={isMobile ? "100%" : svgW}
      height={isMobile ? undefined : svgH}
      viewBox={isMobile ? `0 0 ${svgW} ${svgH}` : undefined}
      style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
    >
      <defs>
        {/* Per-tier thread opacity gradient: faint at the dot, firmer toward the wall. */}
        {WALL_TIER_ORDER.map((tier) => (
          <linearGradient
            key={`tg-${tier}`}
            id={`jf-thread-${tier}`}
            gradientUnits="userSpaceOnUse"
            x1={margin.left} y1={0} x2={wallX} y2={0}
          >
            <stop offset="0%"   stopColor={TIER_THREAD_COLOR[tier]} stopOpacity={THREAD_OPACITY_MIN} />
            <stop offset="100%" stopColor={TIER_THREAD_COLOR[tier]} stopOpacity={THREAD_OPACITY_MAX} />
          </linearGradient>
        ))}
        {/* Lens (brief f): brighter per-tier gradient for LIT threads only — exists in
            defs solely while a lens is active, so the resting field is byte-identical. */}
        {lensed && WALL_TIER_ORDER.map((tier) => (
          <linearGradient
            key={`tgl-${tier}`}
            id={`jf-thread-lit-${tier}`}
            gradientUnits="userSpaceOnUse"
            x1={margin.left} y1={0} x2={wallX} y2={0}
          >
            <stop offset="0%"   stopColor={TIER_THREAD_COLOR[tier]} stopOpacity={LENS_LIT_THREAD_OPACITY_MIN} />
            <stop offset="100%" stopColor={TIER_THREAD_COLOR[tier]} stopOpacity={LENS_LIT_THREAD_OPACITY_MAX} />
          </linearGradient>
        ))}
        {/* Grab ring: object-bbox gradient so it flares toward the wall (right) per-dot. */}
        <linearGradient id="jf-grab-ring" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%"   stopColor={LINE_GOLD} stopOpacity={0} />
          <stop offset="70%"  stopColor={LINE_GOLD} stopOpacity={GRAB_RING_OPACITY * 0.4} />
          <stop offset="100%" stopColor={LINE_GOLD} stopOpacity={GRAB_RING_OPACITY} />
        </linearGradient>
      </defs>

      {/* Background — parchment (navy is chrome only). */}
      <rect x={0} y={0} width={svgW} height={svgH} fill={PARCHMENT} />

      {/* Rider 1 — left-edge Y-label tabs (LABELS ONLY; behind threads/dots so no
          existing position moves). Tab grammar = c.2 verbatim, no boundary line. */}
      <g>
        {(layout.resolvedYTabs ?? []).map((z) => (
          <ZoneTab key={z.label} zone={z} x0={margin.left} lineX2={wallX} faint={false} />
        ))}
      </g>

      {/* Floor-strip baselines + labels. */}
      <g aria-hidden="true">
        <line
          x1={margin.left} y1={layout.proveItStripY} x2={wallX} y2={layout.proveItStripY}
          stroke={TIER_THREAD_COLOR.PROVE_IT} strokeWidth={1} strokeDasharray="2 4" opacity={0.35}
        />
        <line
          x1={margin.left} y1={layout.noneStripY} x2={wallX} y2={layout.noneStripY}
          stroke={TIER_THREAD_COLOR.NONE} strokeWidth={1} strokeDasharray="2 4" opacity={0.35}
        />
        <text x={margin.left} y={layout.proveItStripY - 6} fontSize={10} fill="#6B7280" letterSpacing={0.5}>
          PROVE IT
        </text>
        <text x={margin.left} y={layout.noneStripY - 6} fontSize={10} fill="#6B7280" letterSpacing={0.5}>
          NEVER PAID AGAIN
        </text>
      </g>

      {/* Threads (behind dots). Every dot threads — grey NONE/PROVE-IT included.
          Lens: lit threads stroke the brighter gradient (pop above the resting
          weave); non-lit threads drop to LENS_GHOST_OPACITY. No lens → unchanged. */}
      <g fill="none">
        {dots.map((d) => {
          if (!(d.threadPath && d.tier)) return null;
          const lit = isLit(d.player.player_id);
          return (
            <path
              key={`th-${d.player.player_id}`}
              d={d.threadPath}
              stroke={`url(#jf-thread-${lensed && lit ? `lit-${d.tier}` : d.tier})`}
              strokeWidth={THREAD_W}
              opacity={lensed && !lit ? LENS_GHOST_OPACITY : undefined}
            />
          );
        })}
      </g>

      {/* Tier wall. */}
      <g>
        {wallNodes.map((n) => (
          <g key={`wall-${n.tier}`}>
            <rect x={n.x} y={n.y} width={wallNodeW} height={n.h} fill={n.color} rx={2} />
            <text
              x={n.x + wallNodeW + WALL_LABEL_DX}
              y={n.cy - 4}
              fontSize={11}
              fontWeight={700}
              fill={NAVY}
            >
              {n.label}
            </text>
            <text
              x={n.x + wallNodeW + WALL_LABEL_DX}
              y={n.cy + 10}
              fontSize={10}
              fill={lensed ? LENS_WALL_DIM_COLOR : "#6B7280"}
            >
              {n.count} · {n.pct}%
            </text>
            {/* Lens RE-LIGHT: lit sub-count beside the FROZEN global label (height
                never recomputes). Navy ink, bold + larger so it wins the hierarchy
                while the global count above steps muted. Absent at rest. */}
            {lensed && (
              <text
                x={n.x + wallNodeW + WALL_LABEL_DX}
                y={n.cy + 24}
                fontSize={LENS_WALL_LIT_SIZE}
                fontWeight={700}
                fill={LENS_WALL_LIT_COLOR}
              >
                {litWall?.get(n.tier) ?? 0} lit
              </text>
            )}
          </g>
        ))}
      </g>

      {/* Dots + grab rings (front). Lens (brief f): lit dots render full-fidelity;
          the rest render as ONE flattened ghost layer — a single group-opacity over
          fill-only circles, so a dense stack stays a clean uniform 12% instead of an
          alpha-stacked smear, and there are no gold rings / glyphs to haze. No lens →
          the resting single pass, byte-identical (same renderResolvedDot). */}
      <g>
        {lensed ? (
          <>
            <g opacity={LENS_GHOST_OPACITY} style={{ pointerEvents: "none" }}>
              {dots.map((d) =>
                isLit(d.player.player_id) ? null : <GhostDot key={`gh-${d.player.player_id}`} d={d} />,
              )}
            </g>
            {dots.map((d) => (isLit(d.player.player_id) ? renderResolvedDot(d) : null))}
          </>
        ) : (
          dots.map((d) => renderResolvedDot(d))
        )}
      </g>

      {/* Field title (left). */}
      <text x={margin.left} y={bandTop - 28} fontSize={13} fontWeight={700} fill={NAVY} letterSpacing={1}>
        THE SECOND CONTRACT
      </text>
      <text x={margin.left} y={bandTop - 12} fontSize={11} fill="#6B7280">
        Where the league&apos;s money landed — {layout.fieldCount} players
      </text>

      {/* Round-start anchors + axis hairline (ride-along — all three field modes). */}
      <RoundAnchorAxis layout={layout} />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Shared sub-components (round-start X axis + zone edge-tabs)
// ════════════════════════════════════════════════════════════════════════════

/** Round-start anchor labels on the X axis (Part 6b). No tick gridlines; low-
 *  contrast text. Round boundaries come from the class's own pick→round data. */
function RoundAnchorAxis({ layout }: { layout: JellyfishLayout }) {
  const { roundAnchors, bandTop, bandH, margin, wallX } = layout;
  const y = bandTop + bandH + 34;
  const ruleY = bandTop + bandH + 20; // full-width hairline just above the RD label row
  return (
    <g aria-hidden="true">
      {/* Axis furniture: a single full-width hairline (NOT a round gridline). */}
      <line x1={margin.left} y1={ruleY} x2={wallX} y2={ruleY} stroke={RD_AXIS_RULE_COLOR} strokeWidth={1} />
      {roundAnchors.map(a => (
        <text
          key={`rd-${a.rd}`}
          x={a.x}
          y={y}
          fontSize={9.5}
          fill={RD_LABEL_COLOR}
          textAnchor="middle"
          fontWeight={600}
          letterSpacing={0.6}
        >
          {a.label}
        </text>
      ))}
    </g>
  );
}

/** A pending-field edge-tab label, flush to the left frame (Part 3c). The boundary
 *  LINE (when present) sits at zone.y, full width; the label TAB sits at zone.tabY —
 *  just inside the top of the zone it names (Part 2 grammar). The strip tab renders
 *  text + bookmark bar only — no tint rect (Part 3); the other three keep the tint. */
function ZoneTab({
  zone, x0, lineX2, faint,
}: { zone: PendingZone; x0: number; lineX2: number; faint: boolean }) {
  const tabTop = zone.tabY - ZONE_TAB_H / 2;
  const labelOpacity = faint ? 0.32 : 1;
  return (
    <g aria-hidden="true" opacity={labelOpacity}>
      {zone.hasLine && (
        <line
          x1={x0} y1={zone.y} x2={lineX2} y2={zone.y}
          stroke={ZONE_LINE_COLOR}
          strokeWidth={1}
          strokeDasharray={zone.dashed ? "3 3" : undefined}
          opacity={faint ? 0.4 : 0.55}
        />
      )}
      {zone.tint && (
        <rect x={x0} y={tabTop} width={ZONE_TAB_W} height={ZONE_TAB_H} fill={ZONE_TAB_FILL} rx={2} />
      )}
      <rect x={x0} y={tabTop} width={ZONE_TAB_BAR_W} height={ZONE_TAB_H} fill={ZONE_TAB_BAR} />
      <text x={x0 + 10} y={zone.tabY + 4} fontSize={12} fontWeight={600} fill={ZONE_LABEL_COLOR} letterSpacing={2}>
        {zone.label}
        {zone.showCount !== false && (
          <tspan fontSize={9.5} fontWeight={400} fill={ZONE_COUNT_COLOR} letterSpacing={0.48}>
            {`  · ${zone.count}`}
          </tspan>
        )}
      </text>
    </g>
  );
}

/** One award glyph centered on a dot — ivory fill + navy keyline, painted under the
 *  fill so the outline reads at small size. Highest rung only (rookieAwardGlyph).
 *  pointer-events off so the dot keeps its own hover/click. */
function AwardGlyphMark({
  glyph, cx, cy, r,
}: { glyph: AwardGlyph; cx: number; cy: number; r: number }) {
  if (!glyph) return null;
  // Size by RANK (salience tracks importance): star biggest → triangle smallest.
  const RANK: Record<NonNullable<AwardGlyph>, number> = {
    star: 1.15, sparkle: 1.0, chevron: 1.0, triangle: 0.78,
  };
  const s = r * GLYPH_DOT_FRAC * RANK[glyph]; // glyph half-extent (px)
  const pt = (x: number, y: number) => `${(cx + x * s).toFixed(2)},${(cy + y * s).toFixed(2)}`;
  const poly = (pts: Array<[number, number]>) => "M" + pts.map(([x, y]) => pt(x, y)).join("L") + "Z";
  let d = "";
  if (glyph === "star") {
    d = poly([[0, -1], [0.25, -0.34], [0.95, -0.31], [0.4, 0.13], [0.59, 0.81], [0, 0.42], [-0.59, 0.81], [-0.4, 0.13], [-0.95, -0.31], [-0.25, -0.34]]);
  } else if (glyph === "sparkle") {
    d = poly([[0, -1], [0.2, -0.2], [1, 0], [0.2, 0.2], [0, 1], [-0.2, 0.2], [-1, 0], [-0.2, -0.2]]);
  } else if (glyph === "triangle") {
    d = poly([[0, -0.82], [0.8, 0.62], [-0.8, 0.62]]);
  } else { // chevron — rising double
    d = poly([[-0.9, -0.12], [0, -0.62], [0.9, -0.12], [0.9, 0.16], [0, -0.34], [-0.9, 0.16]])
      + poly([[-0.9, 0.5], [0, 0.0], [0.9, 0.5], [0.9, 0.78], [0, 0.28], [-0.9, 0.78]]);
  }
  return (
    <path
      d={d} fill={GLYPH_FILL} stroke={GLYPH_KEYLINE} strokeWidth={GLYPH_KEYLINE_W}
      strokeLinejoin="round" paintOrder="stroke" style={{ pointerEvents: "none" }}
    />
  );
}

/** Fill-only dot for the FLATTENED lens-ghost layer (no ring / glyph / stroke / hover).
 *  Shared by all three fields. The single wrapping <g opacity> (in each field) keeps
 *  overlaps FLAT — opaque children occlude, the group is dimmed once — so a dense stack
 *  reads as a clean uniform ghost instead of an alpha-stacked smear. Lens-ghost is its
 *  OWN dimension (NOT the pending UNRANKED_DOT_OPACITY/`muted` flag). */
function GhostDot({ d }: { d: JellyfishLayout["dots"][number] }) {
  const fill = d.isDataGap ? DATA_GAP_FILL : teamDotColors(d.player.team_drafted).fill;
  return <circle cx={d.x} cy={d.y} r={DOT_R} fill={fill} />;
}

/** Team-colored field dot with hover/click (shared by pending + floor). `muted` = the
 *  pending UNRANKED/strip ink flag. Lens-ghosting is handled UPSTREAM by the flattened
 *  GhostDot layer (not here) — a lit dot always renders full-fidelity. */
function FieldDot({
  d, isMobile, onDotClick, onDotHover, onDotLeave, muted,
}: {
  d: JellyfishLayout["dots"][number];
  isMobile: boolean;
  onDotClick: (p: Player) => void;
  onDotHover: (p: Player, x: number, y: number) => void;
  onDotLeave: () => void;
  muted?: boolean;
}) {
  const p = d.player;
  const teamColors = teamDotColors(p.team_drafted);
  const glyph = rookieAwardGlyph(p);
  return (
    <g>
      <circle
        cx={d.x} cy={d.y} r={DOT_R}
        fill={teamColors.fill}
        stroke={teamColors.stroke}
        strokeWidth={1}
        opacity={muted ? UNRANKED_DOT_OPACITY : 1}
        style={{ cursor: "pointer" }}
        onMouseEnter={isMobile ? undefined : (e) => onDotHover(p, e.clientX, e.clientY)}
        onMouseLeave={isMobile ? undefined : onDotLeave}
        onClick={() => onDotClick(p)}
      />
      <AwardGlyphMark glyph={glyph} cx={d.x} cy={d.y} r={DOT_R} />
    </g>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PENDING FIELD (Parts 2–3, 6b)
// ════════════════════════════════════════════════════════════════════════════

function PendingJellyfishField({
  layout, isMobile, onDotClick, onDotHover, onDotLeave, litIds,
}: JellyfishFieldProps) {
  const { svgW, svgH, margin, wallX, wallNodeW, dots, bandTop, bandH, zones, stripTopY, reachNodes } = layout;
  const stripTop = stripTopY ?? bandTop + bandH;

  // Lens (brief f) — same membership check as the resolved field; null → no ghosting.
  const lensed = !!litIds;
  const isLit = (pid: string) => !litIds || litIds.has(pid);
  const litReach = lensed
    ? dots.reduce((m, d) => {
        if (d.tier && d.threadPath && isLit(d.player.player_id)) m.set(d.tier, (m.get(d.tier) ?? 0) + 1);
        return m;
      }, new Map<string, number>())
    : null;

  return (
    <svg
      width={isMobile ? "100%" : svgW}
      height={isMobile ? undefined : svgH}
      viewBox={isMobile ? `0 0 ${svgW} ${svgH}` : undefined}
      style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
    >
      {/* Background — parchment. */}
      <rect x={0} y={0} width={svgW} height={svgH} fill={PARCHMENT} />

      {/* COULDN'T STICK strip — full team-color dots (matches the NONE / PROVE IT strips);
          the dashed top edge + zone label carry "unranked · too few snaps to rank". */}
      <line
        x1={margin.left} y1={stripTop} x2={wallX} y2={stripTop}
        stroke={COULDNT_STICK_STROKE} strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
      />

      {/* Zone boundary lines + edge-tabs (counts on ALL tabs, live-shifting). */}
      <g>
        {(zones ?? []).map(z => (
          <ZoneTab key={z.label} zone={z} x0={margin.left} lineX2={wallX} faint={false} />
        ))}
      </g>

      {/* Rider 3 — reaching threads (faint, behind dots) for already-signed players.
          The dot stays at its usage-Y; the thread reaches UP to the tier node. */}
      <g fill="none">
        {dots.map(d => {
          if (!d.threadPath) return null;
          const lit = isLit(d.player.player_id);
          return (
            <path
              key={`reach-${d.player.player_id}`}
              d={d.threadPath}
              stroke={d.threadColor || NAVY}
              strokeWidth={THREAD_W}
              opacity={
                !lensed ? PENDING_REACH_THREAD_OPACITY
                : lit ? LENS_LIT_THREAD_OPACITY_MAX
                : LENS_GHOST_OPACITY
              }
            />
          );
        })}
      </g>

      {/* Rider 3 — pending tier nodes (subset of tiers present among signed dots). */}
      <g>
        {(reachNodes ?? []).map(n => (
          <g key={`reach-node-${n.tier}`}>
            <rect x={n.x} y={n.y} width={wallNodeW} height={n.h} fill={n.color} rx={2} opacity={0.85} />
            <text x={n.x + wallNodeW + WALL_LABEL_DX} y={n.cy - 2} fontSize={10} fontWeight={700} fill={NAVY}>
              {n.label}
            </text>
            <text x={n.x + wallNodeW + WALL_LABEL_DX} y={n.cy + 10} fontSize={9} fill={lensed ? LENS_WALL_DIM_COLOR : "#6B7280"}>
              {n.count}
            </text>
            {lensed && (
              <text x={n.x + wallNodeW + WALL_LABEL_DX} y={n.cy + 24} fontSize={LENS_WALL_LIT_SIZE} fontWeight={700} fill={LENS_WALL_LIT_COLOR}>
                {litReach?.get(n.tier) ?? 0} lit
              </text>
            )}
          </g>
        ))}
      </g>

      {/* Dots — strip dots take the grey/unranked ink (locked register); body dots
          keep team colors. */}
      <g>
        {lensed ? (
          <>
            <g opacity={LENS_GHOST_OPACITY} style={{ pointerEvents: "none" }}>
              {dots.map(d =>
                isLit(d.player.player_id) ? null : <GhostDot key={`gh-${d.player.player_id}`} d={d} />,
              )}
            </g>
            {dots.map(d =>
              isLit(d.player.player_id) ? (
                <FieldDot
                  key={`dot-${d.player.player_id}`}
                  d={d} isMobile={isMobile}
                  muted={d.y >= stripTop}
                  onDotClick={onDotClick} onDotHover={onDotHover} onDotLeave={onDotLeave}
                />
              ) : null,
            )}
          </>
        ) : (
          dots.map(d => (
            <FieldDot
              key={`dot-${d.player.player_id}`}
              d={d} isMobile={isMobile}
              muted={d.y >= stripTop}
              onDotClick={onDotClick} onDotHover={onDotHover} onDotLeave={onDotLeave}
            />
          ))
        )}
      </g>

      {/* Field title (left). */}
      <text x={margin.left} y={bandTop - 28} fontSize={13} fontWeight={700} fill={NAVY} letterSpacing={1}>
        ON THE FIELD
      </text>
      <text x={margin.left} y={bandTop - 12} fontSize={11} fill="#6B7280">
        Still on the rookie deal — where they line up · {dots.length} players
      </text>

      <RoundAnchorAxis layout={layout} />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CAPITAL-FLOOR STATE (Part 4) — static; the 2→3 animation is Epsilon 5.
// ════════════════════════════════════════════════════════════════════════════

function FloorJellyfishField({
  layout, isMobile, onDotClick, onDotHover, onDotLeave, litIds,
}: JellyfishFieldProps) {
  const { svgW, svgH, margin, wallX, wallNodeW, dots, wallNodes, bandTop, bandH, zones, stripTopY, floorY, scoreboardText } = layout;
  const stripTop = stripTopY ?? bandTop + bandH;
  const floor = floorY ?? bandTop + 0.82 * bandH;

  // Lens (brief f) — floor has no threads/wall counts; only dots ghost.
  const lensed = !!litIds;
  const isLit = (pid: string) => !litIds || litIds.has(pid);

  return (
    <svg
      width={isMobile ? "100%" : svgW}
      height={isMobile ? undefined : svgH}
      viewBox={isMobile ? `0 0 ${svgW} ${svgH}` : undefined}
      style={{ display: "block", maxWidth: isMobile ? undefined : "none" }}
    >
      <rect x={0} y={0} width={svgW} height={svgH} fill={PARCHMENT} />

      {/* Faint EMPTY zone tabs above (counts 0 — nobody has played yet). */}
      <g>
        {(zones ?? []).map(z => (
          <ZoneTab key={z.label} zone={z} x0={margin.left} lineX2={wallX} faint />
        ))}
      </g>

      {/* COULDN'T STICK vacant — dashed top edge, no fill. */}
      <line
        x1={margin.left} y1={stripTop} x2={wallX} y2={stripTop}
        stroke={COULDNT_STICK_STROKE} strokeWidth={1} strokeDasharray="3 3" opacity={0.3}
      />

      {/* Dashed-empty wall (outline only — no tier has been earned yet). */}
      <g fill="none">
        {wallNodes.map(n => (
          <rect
            key={`wall-${n.tier}`}
            x={n.x} y={n.y} width={wallNodeW} height={n.h}
            stroke={n.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} rx={2}
          />
        ))}
      </g>

      {/* The floor line + the full drafted class pinned on it in pick order. */}
      <line
        x1={margin.left} y1={floor} x2={wallX} y2={floor}
        stroke={NAVY} strokeWidth={1} opacity={0.18}
      />
      <g>
        {lensed ? (
          <>
            <g opacity={LENS_GHOST_OPACITY} style={{ pointerEvents: "none" }}>
              {dots.map(d =>
                isLit(d.player.player_id) ? null : <GhostDot key={`gh-${d.player.player_id}`} d={d} />,
              )}
            </g>
            {dots.map(d =>
              isLit(d.player.player_id) ? (
                <FieldDot
                  key={`dot-${d.player.player_id}`}
                  d={d} isMobile={isMobile}
                  onDotClick={onDotClick} onDotHover={onDotHover} onDotLeave={onDotLeave}
                />
              ) : null,
            )}
          </>
        ) : (
          dots.map(d => (
            <FieldDot
              key={`dot-${d.player.player_id}`}
              d={d} isMobile={isMobile}
              onDotClick={onDotClick} onDotHover={onDotHover} onDotLeave={onDotLeave}
            />
          ))
        )}
      </g>

      {/* Field title (left). */}
      <text x={margin.left} y={bandTop - 28} fontSize={13} fontWeight={700} fill={NAVY} letterSpacing={1}>
        ON THE CLOCK
      </text>
      <text x={margin.left} y={bandTop - 12} fontSize={11} fill="#6B7280">
        Drafted, not yet snapped — {dots.length} players on the floor
      </text>

      {/* Scoreboard area — static text label (the live scoreboard is brief d). */}
      {scoreboardText && (
        <text x={wallX} y={bandTop - 16} fontSize={13} fontWeight={700} fill={NAVY} textAnchor="end" letterSpacing={1}>
          {scoreboardText}
        </text>
      )}

      <RoundAnchorAxis layout={layout} />
    </svg>
  );
}
