'use client';

/**
 * components/about/RoundTierSankey.tsx
 *
 * The About page's signature interactive: draft round → second-contract tier flow,
 * for drafted players across the resolved window (classes 2018–2021). d3-sankey is
 * used for LAYOUT MATH ONLY; the geometry it returns is rendered as hand-written SVG
 * (repo rule: "D3 is imported only for math; SVG is rendered by hand").
 *
 * Static-first: nothing auto-plays. Engagement is click-to-trace (Rev-2 removed the
 * year filter — the full 2018–2021 view is the only one rendered). Accessible:
 * keyboard-focusable flows/nodes, aria-labels, a text summary in the SVG title/desc;
 * honors prefers-reduced-motion (no transitions).
 */

import { useEffect, useMemo, useState } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { TIER_THREAD_COLOR } from '@/lib/act3Constants';
import type { AboutFlows, FlowMatrix, Round, Tier } from '@/lib/aboutFlowsTypes';

// ── Static config ───────────────────────────────────────────────────────────────

const ROUNDS: Round[] = [1, 2, 3, 4, 5, 6, 7];
/** Right column order, top → bottom (matches WALL_TIER_ORDER). */
const TIER_ORDER: Tier[] = ['PREMIUM', 'SOLID', 'BRIDGE', 'PROVE_IT', 'NONE'];

const UMBER = '#6B5D45'; // round-node fill (warm neutral; deliberately NOT navy)
const NAVY = '#0B2239';

const TIER_LABEL: Record<Tier, string> = {
  PREMIUM: 'Premium',
  SOLID: 'Solid',
  BRIDGE: 'Bridge',
  PROVE_IT: 'Prove-it',
  NONE: 'None',
};

const TIER_DESC: Record<Tier, string> = {
  PREMIUM: 'paid like one of the best at his position',
  SOLID: 'real money, multiple years',
  BRIDGE: 'top-of-position money, one year',
  PROVE_IT: 'another shot, almost nothing guaranteed',
  NONE: 'never signed a second contract',
};

// SVG layout (viewBox; the element scales to its container width).
const VB_W = 1000;
const VB_H = 440;
const M = { top: 18, right: 168, bottom: 18, left: 70 };
const NODE_W = 13;
const NODE_PAD = 13;

// ── Sankey node/link shapes (post-layout, d3-sankey mutates in place) ────────────

type SNodeKind = 'round' | 'tier';
interface SNode {
  id: string;
  kind: SNodeKind;
  order: number;
  round?: Round;
  tier?: Tier;
  // filled by d3-sankey:
  x0?: number; x1?: number; y0?: number; y1?: number;
}
interface SLink {
  source: string | SNode;
  target: string | SNode;
  value: number;
  round: Round;
  tier: Tier;
  // filled by d3-sankey:
  width?: number;
  y0?: number; y1?: number;
}

type Focus =
  | { type: 'link'; round: Round; tier: Tier }
  | { type: 'round'; round: Round }
  | { type: 'tier'; tier: Tier }
  | null;

// ── Matrix helpers ──────────────────────────────────────────────────────────────

function grandTotal(m: FlowMatrix): number {
  let s = 0;
  for (const r of ROUNDS) for (const t of TIER_ORDER) s += m[r][t];
  return s;
}
function roundTotal(m: FlowMatrix, r: Round): number {
  let s = 0;
  for (const t of TIER_ORDER) s += m[r][t];
  return s;
}
function roundPaid(m: FlowMatrix, r: Round): number {
  let s = 0;
  for (const t of ['BRIDGE', 'SOLID', 'PREMIUM'] as Tier[]) s += m[r][t];
  return s;
}
function tierTotal(m: FlowMatrix, t: Tier): number {
  let s = 0;
  for (const r of ROUNDS) s += m[r][t];
  return s;
}
function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoundTierSankey({ flows }: { flows: AboutFlows }) {
  const [focus, setFocus] = useState<Focus>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const titleId = 'round-tier-sankey-title';

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Rev-2: render only the full 2018–2021 view (no year control).
  const matrix = flows.all;
  const total = grandTotal(matrix);

  // d3-sankey MUTATES its inputs, so build fresh copies and key the layout on the
  // (constant) grand total.
  const layout = useMemo(() => {
    if (total === 0) return null;

    const nodes: SNode[] = [
      ...ROUNDS.map((r) => ({ id: `R${r}`, kind: 'round' as const, order: r - 1, round: r })),
      ...TIER_ORDER.map((t, i) => ({ id: `T_${t}`, kind: 'tier' as const, order: i, tier: t })),
    ];

    const links: SLink[] = [];
    for (const r of ROUNDS) {
      for (const t of TIER_ORDER) {
        const v = matrix[r][t];
        if (v > 0) links.push({ source: `R${r}`, target: `T_${t}`, value: v, round: r, tier: t });
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

    // fresh copies — gen mutates these
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
    if (focus.type === 'link') return l.round === focus.round && l.tier === focus.tier ? 0.9 : 0.06;
    if (focus.type === 'round') return l.round === focus.round ? 0.9 : 0.06;
    return l.tier === focus.tier ? 0.9 : 0.06; // tier focus
  }
  function nodeDimmed(n: SNode): boolean {
    if (!focus) return false;
    if (focus.type === 'link') return !((n.kind === 'round' && n.round === focus.round) || (n.kind === 'tier' && n.tier === focus.tier));
    if (focus.type === 'round') return n.kind === 'round' && n.round !== focus.round;
    return n.kind === 'tier' && n.tier !== focus.tier;
  }

  const transition = reduceMotion ? 'none' : 'opacity 220ms ease';

  // Readout text reflecting the current focus (default = hint).
  const readout: string = (() => {
    if (!focus) return 'Tap a flow, round, or tier to trace it.';
    if (focus.type === 'link') {
      const v = matrix[focus.round][focus.tier];
      return `Round ${focus.round} → ${TIER_LABEL[focus.tier]}: ${v} player${v === 1 ? '' : 's'} (${pct(v, roundTotal(matrix, focus.round))}% of round ${focus.round}).`;
    }
    if (focus.type === 'round') {
      const m = roundTotal(matrix, focus.round);
      return `Round ${focus.round}: ${m} drafted · ${pct(roundPaid(matrix, focus.round), m)}% reached a paid tier.`;
    }
    const m = tierTotal(matrix, focus.tier);
    return `${TIER_LABEL[focus.tier]}: ${m} player${m === 1 ? '' : 's'} · ${pct(m, total)}% of all drafted.`;
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
          aria-label="Sankey diagram: draft round to second-contract tier, drafted players 2018 to 2021."
          style={{ display: 'block', maxWidth: '100%', cursor: focus ? 'pointer' : 'default' }}
          onClick={() => setFocus(null)}
        >
          {/* Background catcher for reset (covers the field) */}
          <rect x={0} y={0} width={VB_W} height={VB_H} fill="transparent" />

          {/* Ribbons (colored by target tier, raw-count widths) */}
          <g fill="none">
            {(layout.links as SLink[]).map((l) => {
              const d = linkPath(l) ?? undefined;
              return (
                <path
                  key={`${l.round}-${l.tier}`}
                  className="sankey-focusable"
                  d={d}
                  stroke={TIER_THREAD_COLOR[l.tier]}
                  strokeWidth={Math.max(1, l.width ?? 1)}
                  strokeOpacity={linkOpacity(l)}
                  style={{ transition, cursor: 'pointer' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Round ${l.round} to ${TIER_LABEL[l.tier]}, ${l.value} player${l.value === 1 ? '' : 's'}, ${pct(l.value, roundTotal(matrix, l.round))} percent of round ${l.round}.`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocus({ type: 'link', round: l.round, tier: l.tier });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFocus({ type: 'link', round: l.round, tier: l.tier });
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
                      aria-label={`Round ${r}: ${m} drafted, ${pct(roundPaid(matrix, r), m)} percent reached a paid tier.`}
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
              // tier node
              const t = n.tier!;
              const tt = tierTotal(matrix, t);
              return (
                <g key={n.id} style={{ opacity: dim ? 0.25 : 1, transition }}>
                  <rect
                    className="sankey-focusable"
                    x={x0}
                    y={y0}
                    width={NODE_W}
                    height={Math.max(1, h)}
                    fill={TIER_THREAD_COLOR[t]}
                    rx={1.5}
                    tabIndex={0}
                    role="button"
                    aria-label={`${TIER_LABEL[t]}: ${tt} players, ${pct(tt, total)} percent of all drafted. ${TIER_DESC[t]}.`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setFocus({ type: 'tier', tier: t }); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus({ type: 'tier', tier: t }); }
                    }}
                  />
                  <text x={x0 + NODE_W + 8} y={y0 + h / 2 - 5} dominantBaseline="central" fontSize={11.5} fontWeight={700} fill={NAVY}>
                    {TIER_LABEL[t]}
                  </text>
                  <text x={x0 + NODE_W + 8} y={y0 + h / 2 + 8} dominantBaseline="central" fontSize={10} fill="#4A6274">
                    {pct(tt, total)}% · {tt}
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

      {/* Legend — five tiers, muted, two columns (round-nodes row dropped per Rev-2) */}
      <ul
        className="mt-3"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          columnGap: 18,
          rowGap: 5,
          fontSize: 11,
        }}
      >
        {TIER_ORDER.map((t) => (
          <li key={t} className="flex items-baseline gap-1.5">
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: TIER_THREAD_COLOR[t],
                flex: '0 0 auto',
                transform: 'translateY(1px)',
              }}
            />
            <span style={{ color: '#4A6274' }}>
              <strong style={{ fontWeight: 700, color: NAVY }}>{TIER_LABEL[t]}</strong>
              {' — '}
              {TIER_DESC[t]}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
