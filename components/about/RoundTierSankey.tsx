'use client';

/**
 * components/about/RoundTierSankey.tsx
 *
 * The About page's signature interactive: draft round → second-contract MONEY BAND flow,
 * for drafted players across the resolved window (classes 2018–2021). d3-sankey is used
 * for LAYOUT MATH ONLY; its geometry is rendered as hand-written SVG (repo rule).
 *
 * Six-band rebuild (2026-07-13): the five-tier ContractTier taxonomy was replaced by the
 * shipped six-band MoneyBand ladder. Band names / descriptors / colors are reused VERBATIM
 * from lib/act3FieldConstants.ts ACT3_BANDS (one-voice rule). Node order = ACT3_WALL_ORDER
 * (money family at top, matching the Act 3 wall). Special-teams (blank money_band) are
 * excluded upstream in lib/aboutFlows.ts.
 *
 * Static-first: nothing auto-plays. Engagement is click-to-trace. Accessible: keyboard-
 * focusable flows/nodes, aria-labels, honors prefers-reduced-motion (no transitions).
 */

import { useEffect, useMemo, useState } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { ACT3_BANDS, ACT3_WALL_ORDER } from '@/lib/act3FieldConstants';
import { MONEY_FAMILY_BANDS } from '@/lib/verdict';
import type { AboutFlows, FlowMatrix, Round, MoneyBand } from '@/lib/aboutFlowsTypes';

// ── Static config ───────────────────────────────────────────────────────────────

const ROUNDS: Round[] = [1, 2, 3, 4, 5, 6, 7];
/** Right column order, top → bottom = highest money at top (matches the Act 3 wall). */
const BAND_ORDER: MoneyBand[] = ACT3_WALL_ORDER; // TOP5·TOP10·MIDDLE·MIN·ZERO·NEVER

/** Money family (a real guaranteed deal above the vet-min floor) — for the round readout. */
const MONEY_FAMILY = new Set<MoneyBand>(MONEY_FAMILY_BANDS); // MIDDLE, TOP10, TOP5

const UMBER = '#6B5D45'; // round-node fill (warm neutral; deliberately NOT navy)
const NAVY = '#0B2239';

// Labels/descriptors/colors reused VERBATIM from ACT3_BANDS. NOTE: `.labelPlaceholder`
// is the FINAL locked name (wall-label lock 2026-07-11) despite the legacy field name.
const BAND_LABEL: Record<MoneyBand, string> = {
  TOP5: ACT3_BANDS.TOP5.labelPlaceholder,
  TOP10: ACT3_BANDS.TOP10.labelPlaceholder,
  MIDDLE: ACT3_BANDS.MIDDLE.labelPlaceholder,
  MIN: ACT3_BANDS.MIN.labelPlaceholder,
  ZERO: ACT3_BANDS.ZERO.labelPlaceholder,
  NEVER: ACT3_BANDS.NEVER.labelPlaceholder,
};
const BAND_DESC: Record<MoneyBand, string> = {
  TOP5: ACT3_BANDS.TOP5.descriptor,
  TOP10: ACT3_BANDS.TOP10.descriptor,
  MIDDLE: ACT3_BANDS.MIDDLE.descriptor,
  MIN: ACT3_BANDS.MIN.descriptor,
  ZERO: ACT3_BANDS.ZERO.descriptor,
  NEVER: ACT3_BANDS.NEVER.descriptor,
};
const BAND_COLOR: Record<MoneyBand, string> = {
  TOP5: ACT3_BANDS.TOP5.color,
  TOP10: ACT3_BANDS.TOP10.color,
  MIDDLE: ACT3_BANDS.MIDDLE.color,
  MIN: ACT3_BANDS.MIN.color,
  ZERO: ACT3_BANDS.ZERO.color,
  NEVER: ACT3_BANDS.NEVER.color,
};

/** Legend columns, top-down: money family LEFT, ink family RIGHT. */
const LEGEND_MONEY: MoneyBand[] = ['TOP5', 'TOP10', 'MIDDLE'];
const LEGEND_INK: MoneyBand[] = ['MIN', 'ZERO', 'NEVER'];

// SVG layout (viewBox; scales to container width). VB_H + NODE_PAD are bumped from the
// five-tier version (440 / 13) to give the two thin top nodes (TOP5 ~48, TOP10 ~41 of
// 1,002) room for their two-line labels. If TOP5/TOP10 labels still collide at render,
// bump NODE_PAD to 26 (see brief §Verify).
const VB_W = 1000;
const VB_H = 470;
const M = { top: 20, right: 172, bottom: 20, left: 70 };
const NODE_W = 13;
const NODE_PAD = 22;

// ── Sankey node/link shapes (post-layout, d3-sankey mutates in place) ────────────

type SNodeKind = 'round' | 'band';
interface SNode {
  id: string;
  kind: SNodeKind;
  order: number;
  round?: Round;
  band?: MoneyBand;
  x0?: number; x1?: number; y0?: number; y1?: number;
}
interface SLink {
  source: string | SNode;
  target: string | SNode;
  value: number;
  round: Round;
  band: MoneyBand;
  width?: number;
  y0?: number; y1?: number;
}

type Focus =
  | { type: 'link'; round: Round; band: MoneyBand }
  | { type: 'round'; round: Round }
  | { type: 'band'; band: MoneyBand }
  | null;

// ── Matrix helpers ──────────────────────────────────────────────────────────────

function grandTotal(m: FlowMatrix): number {
  let s = 0;
  for (const r of ROUNDS) for (const b of BAND_ORDER) s += m[r][b];
  return s;
}
function roundTotal(m: FlowMatrix, r: Round): number {
  let s = 0;
  for (const b of BAND_ORDER) s += m[r][b];
  return s;
}
function roundMoneyFamily(m: FlowMatrix, r: Round): number {
  let s = 0;
  for (const b of BAND_ORDER) if (MONEY_FAMILY.has(b)) s += m[r][b];
  return s;
}
function bandTotal(m: FlowMatrix, b: MoneyBand): number {
  let s = 0;
  for (const r of ROUNDS) s += m[r][b];
  return s;
}
function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoundTierSankey({ flows }: { flows: AboutFlows }) {
  const [focus, setFocus] = useState<Focus>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const titleId = 'round-band-sankey-title';

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Render only the full 2018–2021 view (no year control).
  const matrix = flows.all;
  const total = grandTotal(matrix);

  // d3-sankey MUTATES its inputs, so build fresh copies and key the layout on the
  // (constant) grand total.
  const layout = useMemo(() => {
    if (total === 0) return null;

    const nodes: SNode[] = [
      ...ROUNDS.map((r) => ({ id: `R${r}`, kind: 'round' as const, order: r - 1, round: r })),
      ...BAND_ORDER.map((b, i) => ({ id: `B_${b}`, kind: 'band' as const, order: i, band: b })),
    ];

    const links: SLink[] = [];
    for (const r of ROUNDS) {
      for (const b of BAND_ORDER) {
        const v = matrix[r][b];
        if (v > 0) links.push({ source: `R${r}`, target: `B_${b}`, value: v, round: r, band: b });
      }
    }

    const gen = sankey<SNode, SLink>()
      .nodeId((d) => d.id)
      .nodeWidth(NODE_W)
      .nodePadding(NODE_PAD)
      .nodeSort((a, b) => a.order - b.order)
      .extent([
        [M.left, M.top],
        [VB_W - M.right, VB_H - M.bottom],
      ]);

    const graph = gen({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });

    return graph;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const linkPath = useMemo(() => sankeyLinkHorizontal<SNode, SLink>(), []);

  // ── Focus → opacity / readout ──────────────────────────────────────────────
  function linkOpacity(l: SLink): number {
    if (!focus) return 0.42;
    if (focus.type === 'link') return l.round === focus.round && l.band === focus.band ? 0.9 : 0.06;
    if (focus.type === 'round') return l.round === focus.round ? 0.9 : 0.06;
    return l.band === focus.band ? 0.9 : 0.06; // band focus
  }
  function nodeDimmed(n: SNode): boolean {
    if (!focus) return false;
    if (focus.type === 'link') return !((n.kind === 'round' && n.round === focus.round) || (n.kind === 'band' && n.band === focus.band));
    if (focus.type === 'round') return n.kind === 'round' && n.round !== focus.round;
    return n.kind === 'band' && n.band !== focus.band;
  }

  const transition = reduceMotion ? 'none' : 'opacity 220ms ease';

  // Readout text reflecting the current focus (default = hint).
  const readout: string = (() => {
    if (!focus) return 'Tap a flow, round, or band to trace it.';
    if (focus.type === 'link') {
      const v = matrix[focus.round][focus.band];
      return `Round ${focus.round} → ${BAND_LABEL[focus.band]}: ${v} player${v === 1 ? '' : 's'} (${pct(v, roundTotal(matrix, focus.round))}% of round ${focus.round}).`;
    }
    if (focus.type === 'round') {
      const m = roundTotal(matrix, focus.round);
      return `Round ${focus.round}: ${m} drafted · ${pct(roundMoneyFamily(matrix, focus.round), m)}% received substantial guarantees.`;
    }
    const m = bandTotal(matrix, focus.band);
    return `${BAND_LABEL[focus.band]}: ${m} player${m === 1 ? '' : 's'} · ${pct(m, total)}% of all drafted.`;
  })();

  return (
    <figure
      className="m-0"
      aria-labelledby={titleId}
      style={{ fontFamily: 'Inter, sans-serif', color: NAVY }}
    >
      <figcaption id={titleId} className="mb-1 text-base font-semibold" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.01em' }}>
        Rookie Second Contracts
      </figcaption>
      <p className="mb-3 text-xs" style={{ color: '#4A6274' }}>
        Drafted players, 2018&ndash;2021.
      </p>

      {/* The chart */}
      {layout ? (
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          role="img"
          aria-label="Sankey diagram: draft round to second-contract money band, drafted players 2018 to 2021."
          style={{ display: 'block', maxWidth: '100%', cursor: focus ? 'pointer' : 'default' }}
          onClick={() => setFocus(null)}
        >
          {/* Background catcher for reset (covers the field) */}
          <rect x={0} y={0} width={VB_W} height={VB_H} fill="transparent" />

          {/* Ribbons (colored by target band, raw-count widths) */}
          <g fill="none">
            {(layout.links as SLink[]).map((l) => {
              const d = linkPath(l) ?? undefined;
              return (
                <path
                  key={`${l.round}-${l.band}`}
                  className="sankey-focusable"
                  d={d}
                  stroke={BAND_COLOR[l.band]}
                  strokeWidth={Math.max(1, l.width ?? 1)}
                  strokeOpacity={linkOpacity(l)}
                  style={{ transition, cursor: 'pointer' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Round ${l.round} to ${BAND_LABEL[l.band]}, ${l.value} player${l.value === 1 ? '' : 's'}, ${pct(l.value, roundTotal(matrix, l.round))} percent of round ${l.round}.`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocus({ type: 'link', round: l.round, band: l.band });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFocus({ type: 'link', round: l.round, band: l.band });
                    }
                  }}
                />
              );
            })}
          </g>

          {/* Nodes + labels */}
          <g>
            {(layout.nodes as SNode[]).map((n) => {
              const x0 = n.x0 ?? 0;
              const y0 = n.y0 ?? 0;
              const h = (n.y1 ?? 0) - y0;
              const dim = nodeDimmed(n);
              if (n.kind === 'round') {
                const r = n.round!;
                const m = roundTotal(matrix, r);
                return (
                  <g key={n.id} style={{ opacity: dim ? 0.25 : 1, transition }}>
                    <rect
                      className="sankey-focusable"
                      x={x0}
                      y={y0}
                      width={NODE_W}
                      height={Math.max(1, h)}
                      fill={UMBER}
                      rx={1.5}
                      tabIndex={0}
                      role="button"
                      aria-label={`Round ${r}: ${m} drafted, ${pct(roundMoneyFamily(matrix, r), m)} percent received substantial guarantees.`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); setFocus({ type: 'round', round: r }); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus({ type: 'round', round: r }); }
                      }}
                    />
                    <text
                      x={x0 - 8}
                      y={y0 + h / 2}
                      textAnchor="end"
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={600}
                      fill={NAVY}
                    >
                      Round {r}
                    </text>
                  </g>
                );
              }
              // band node
              const b = n.band!;
              const bt = bandTotal(matrix, b);
              return (
                <g key={n.id} style={{ opacity: dim ? 0.25 : 1, transition }}>
                  <rect
                    className="sankey-focusable"
                    x={x0}
                    y={y0}
                    width={NODE_W}
                    height={Math.max(1, h)}
                    fill={BAND_COLOR[b]}
                    rx={1.5}
                    tabIndex={0}
                    role="button"
                    aria-label={`${BAND_LABEL[b]}: ${bt} players, ${pct(bt, total)} percent of all drafted. ${BAND_DESC[b]}.`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setFocus({ type: 'band', band: b }); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus({ type: 'band', band: b }); }
                    }}
                  />
                  <text x={x0 + NODE_W + 8} y={y0 + h / 2 - 5} dominantBaseline="central" fontSize={11.5} fontWeight={700} fill={NAVY}>
                    {BAND_LABEL[b]}
                  </text>
                  <text x={x0 + NODE_W + 8} y={y0 + h / 2 + 8} dominantBaseline="central" fontSize={10} fill="#4A6274">
                    {pct(bt, total)}% · {bt}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      ) : (
        <p className="py-12 text-center text-sm" style={{ color: '#4A6274' }}>
          Flow data is unavailable right now.
        </p>
      )}

      {/* Live readout / hint */}
      <p aria-live="polite" className="mt-2 min-h-[1.5em] text-sm" style={{ color: '#4A6274' }}>
        {readout}
      </p>

      {/* Legend — six bands, two columns split by family (money LEFT, ink RIGHT),
          centered as a block under the chart. Interleave money[i]/ink[i] so the
          row-major grid lands money in the left column, ink in the right. */}
      <div className="mt-3 flex justify-center">
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, max-content)',
            columnGap: 28,
            rowGap: 5,
            fontSize: 11,
          }}
        >
          {[0, 1, 2].flatMap((i) => [LEGEND_MONEY[i], LEGEND_INK[i]]).map((b) => (
            <li key={b} className="flex items-baseline gap-1.5">
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: BAND_COLOR[b],
                  flex: '0 0 auto',
                  transform: 'translateY(1px)',
                }}
              />
              <span style={{ color: '#4A6274' }}>
                <strong style={{ fontWeight: 700, color: NAVY }}>{BAND_LABEL[b]}</strong>
                {' — '}
                {BAND_DESC[b]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
