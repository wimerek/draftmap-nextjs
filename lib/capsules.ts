/**
 * lib/capsules.ts
 *
 * Piece 2 — the six insight capsules for the crawlable-twin position pages.
 *
 * Pure module: given a prepped position class, the year, and the position's spend
 * baseline, it produces the capsule list for the current maturity state. Headings
 * are the FAQPage questions; answers are pure templates (numbers first, ~40–60
 * words). Never throws on sparse data — capsules omit gracefully.
 *
 * Draft-day capsule set (the only set reachable while SUPPORTED_TWIN_YEARS=[2026]):
 *   1 THE STEAL · 2 THE CONVICTION PICK · 3 THE CLIFF
 *   4 THE SPEND · 5 THE BET · 6 THE ONE WHO SLIPPED
 */

import type { PreppedClass, PosPlayer } from './twinData';
import { posRankLabel } from './twinData';
import type { ClassMaturity } from './classMaturity';
import { resolveTeamName } from './chartConstants';
import pickCurveRaw from '@/public/pick_value_curve_smooth.json';

export interface Capsule {
  /** stable id: steal | conviction | cliff | spend | bet | slipped */
  id: string;
  /** FAQPage question — rendered as the capsule heading */
  question: string;
  /** answer text — rendered as capsule body + FAQPage acceptedAnswer */
  answer: string;
}

export interface SpendBaselineEntry {
  avgDrafted: number;
  avgFirstTwoRounds: number;
}

// ── Smoothed pick-value curve (THE BET) ──────────────────────────────────────
// MUST be the smoothed curve. Do not substitute public/pick_value_curve.json.
const PICK_VALUE = new Map<number, number>(
  (pickCurveRaw as Array<{ pick: number; normalized: number }>).map((e) => [e.pick, e.normalized]),
);

function pickValue(pick: number): number {
  const v = PICK_VALUE.get(pick);
  if (v != null) return v;
  if (pick < 1) return PICK_VALUE.get(1) ?? 0;
  // Beyond the table (rare comp-pick overflow) → value of the last pick.
  return PICK_VALUE.get(256) ?? 0;
}

// ── Formatting helpers ───────────────────────────────────────────────────────
function teamName(p: PosPlayer): string {
  return resolveTeamName(p.player.team_drafted) || 'the team';
}

function formatPickList(picks: number[]): string {
  const sorted = [...picks].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return `pick ${sorted[0]}`;
  if (sorted.length === 2) return `picks ${sorted[0]} and ${sorted[1]}`;
  return `picks ${sorted.slice(0, -1).join(', ')} and ${sorted[sorted.length - 1]}`;
}

// ── Capsule 1: THE STEAL ──────────────────────────────────────────────────────
function steal(prep: PreppedClass, position: string, year: number): Capsule | null {
  const candidates = prep.drafted.filter((p) => p.delta != null && p.delta > 0);
  if (candidates.length === 0) return null;

  // Max positive Δ; tie-break: lower consensus rank wins.
  candidates.sort((a, b) => {
    if (b.delta! !== a.delta!) return b.delta! - a.delta!;
    return (a.player.rank ?? Infinity) - (b.player.rank ?? Infinity);
  });
  const top = candidates[0];
  const r = top.player.rd_drafted;
  const roundClause = r != null ? ` in Round ${r}` : '';

  let answer =
    `${top.player.name} was ranked ${posRankLabel(position, top.posRank)} on the consensus board ` +
    `— #${top.player.rank} overall — but lasted until pick ${top.player.pick_drafted}, where the ` +
    `${teamName(top)} took him${roundClause}. A ${top.delta}-spot fall, the largest gap between ` +
    `expectation and draft day of any ${position} in the class.`;

  // Runner-up sentence: only OTHER drafted players with Δ ≥ +10.
  const runners = candidates.slice(1).filter((p) => (p.delta as number) >= 10);
  if (runners.length >= 2) {
    answer +=
      ` Behind him, ${runners[0].player.name} (+${runners[0].delta}) and ` +
      `${runners[1].player.name} (+${runners[1].delta}) also outlasted their rankings.`;
  } else if (runners.length === 1) {
    answer += ` Behind him, ${runners[0].player.name} (+${runners[0].delta}) also outlasted his ranking.`;
  }

  return { id: 'steal', question: `Who was the steal of the ${year} ${position} class?`, answer };
}

// ── Capsule 2: THE CONVICTION PICK ────────────────────────────────────────────
function conviction(prep: PreppedClass, position: string, year: number): Capsule | null {
  const candidates = prep.drafted.filter((p) => p.delta != null && p.delta < 0);
  if (candidates.length === 0) return null;

  // Biggest negative Δ (drafted furthest ahead of the board); tie-break: lower rank.
  candidates.sort((a, b) => {
    if (a.delta! !== b.delta!) return a.delta! - b.delta!;
    return (a.player.rank ?? Infinity) - (b.player.rank ?? Infinity);
  });
  const top = candidates[0];
  const ahead = Math.abs(top.delta as number);

  let answer =
    `The ${teamName(top)} took ${top.player.name} at pick ${top.player.pick_drafted} ` +
    `— ${ahead} spots ahead of his #${top.player.rank} consensus rank. ` +
    `The league's biggest vote of confidence against the public board at the position.`;

  // Runner-up sentence: OTHER drafted players with Δ ≤ −10. Positive register only.
  const runners = candidates.slice(1).filter((p) => (p.delta as number) <= -10);
  if (runners.length >= 2) {
    answer +=
      ` Teams showed similar conviction on ${runners[0].player.name} ` +
      `(${Math.abs(runners[0].delta as number)} spots) and ${runners[1].player.name} ` +
      `(${Math.abs(runners[1].delta as number)} spots).`;
  } else if (runners.length === 1) {
    answer +=
      ` Teams showed similar conviction on ${runners[0].player.name} ` +
      `(${Math.abs(runners[0].delta as number)} spots).`;
  }

  return {
    id: 'conviction',
    question: `Which ${position} did teams value above the consensus board?`,
    answer,
  };
}

// ── Capsule 3: THE CLIFF ──────────────────────────────────────────────────────
function cliff(prep: PreppedClass, position: string, year: number): Capsule | null {
  const drafted = prep.drafted; // already sorted by pick asc
  if (drafted.length < 2) return null; // need at least two to describe a span

  const picks = drafted.map((p) => p.player.pick_drafted as number);
  const first = picks[0];
  const last = picks[picks.length - 1];

  const fallback: Capsule = {
    id: 'cliff',
    question: `Where did the ${position} talent drop off in ${year}?`,
    answer:
      `No cliff this year — teams drained the ${position} board steadily from pick ${first} ` +
      `to pick ${last}.`,
  };

  // Cliff detection requires ≥4 drafted players (position-relative gap calibration).
  if (drafted.length < 4) return fallback;

  const gaps: number[] = [];
  for (let i = 1; i < picks.length; i++) gaps.push(picks[i] - picks[i - 1]);

  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const mid = Math.floor(sortedGaps.length / 2);
  const median =
    sortedGaps.length % 2 === 0
      ? (sortedGaps[mid - 1] + sortedGaps[mid]) / 2
      : sortedGaps[mid];

  const maxGap = Math.max(...gaps);
  // Qualifies only if the largest gap is ≥ 2× the median gap.
  if (median <= 0 || maxGap < 2 * median) return fallback;

  const gapIdx = gaps.indexOf(maxGap); // gap is between drafted[gapIdx] and drafted[gapIdx+1]
  const before = drafted[gapIdx];

  const answer =
    `After ${before.player.name} went at pick ${before.player.pick_drafted}, the next ${position} ` +
    `didn't come off the board for ${maxGap} picks. The sharpest drop in the class — teams that ` +
    `waited paid for it.`;

  return { id: 'cliff', question: `Where did the ${position} talent drop off in ${year}?`, answer };
}

// ── Capsule 4: THE SPEND ──────────────────────────────────────────────────────
function spend(
  prep: PreppedClass,
  position: string,
  year: number,
  baseline: SpendBaselineEntry | undefined,
): Capsule | null {
  const n = prep.drafted.length;
  if (n === 0 || !baseline) return null;

  const k = prep.drafted.filter((p) => {
    const rd = p.player.rd_drafted;
    return rd != null && rd <= 2;
  }).length;

  const avg = baseline.avgDrafted;
  let comparison: string;
  if (Math.abs(n - avg) <= 0.5) comparison = `right at the position's average of ${avg}`;
  else if (n > avg) comparison = `above the position's average of ${avg}`;
  else comparison = `below the position's average of ${avg}`;

  const answer =
    `Teams spent ${n} picks on ${position} — ${k} in the first two rounds. ` +
    `That's ${comparison} since 2018.`;

  return { id: 'spend', question: `How much did teams invest in ${position} in the ${year} draft?`, answer };
}

// ── Capsule 5: THE BET ────────────────────────────────────────────────────────
function bet(prep: PreppedClass, position: string, year: number): Capsule | null {
  if (prep.drafted.length === 0) return null;

  // Per team: sum of (smoothed) pick value of its drafted players AT THIS POSITION.
  const byTeam = new Map<string, { picks: number[]; posValue: number }>();
  for (const p of prep.drafted) {
    const team = p.player.team_drafted;
    const pick = p.player.pick_drafted as number;
    if (!team) continue;
    const entry = byTeam.get(team) ?? { picks: [], posValue: 0 };
    entry.picks.push(pick);
    entry.posValue += pickValue(pick);
    byTeam.set(team, entry);
  }
  if (byTeam.size === 0) return null;

  // Winner = max summed position value; tie-break: earliest (lowest) pick.
  let winnerTeam = '';
  let winner = { picks: [] as number[], posValue: -Infinity };
  byTeam.forEach((entry, team) => {
    const tie = entry.posValue === winner.posValue;
    const better = tie
      ? Math.min(...entry.picks) < Math.min(...winner.picks)
      : entry.posValue > winner.posValue;
    if (better) {
      winnerTeam = team;
      winner = entry;
    }
  });

  // {pct} = winner's POS pick-value ÷ winner's TOTAL drafted pick-value across the class.
  const winnerAllPicks = prep.teamPicks.get(winnerTeam) ?? [];
  const totalValue = winnerAllPicks.reduce((sum, pick) => sum + pickValue(pick), 0);
  const pct = totalValue > 0 ? Math.round((winner.posValue / totalValue) * 100) : 0;

  const answer =
    `The ${resolveTeamName(winnerTeam)} spent more draft capital on ${position} than any other club — ` +
    `${formatPickList(winner.picks)} — ${pct}% of their total draft investment.`;

  return { id: 'bet', question: `Which team bet biggest on ${position} in ${year}?`, answer };
}

// ── Capsule 6: THE ONE WHO SLIPPED ────────────────────────────────────────────
function slipped(prep: PreppedClass, position: string, year: number): Capsule | null {
  // Highest-ranked (min consensus rank) UNDRAFTED player at the position.
  const rankedUdfa = prep.undrafted.filter((p) => p.player.rank != null);
  if (rankedUdfa.length === 0) return null; // OMIT — do not pad

  // undrafted is already sorted by rank asc.
  const top = rankedUdfa[0];

  // Deliberately NO "signed with {team}" clause — UDFA-signed team data has a known
  // accuracy problem (Epsilon 4: UDFA-signed accuracy fix). Activates after that lands.
  const answer =
    `${top.player.name}, ranked #${top.player.rank} on the consensus board, ` +
    `heard ${prep.totalPicks} names called — and not his.`;

  return {
    id: 'slipped',
    question: `Who was the highest-ranked ${position} to go undrafted in ${year}?`,
    answer,
  };
}

/**
 * Compute the capsule set for a position class at a given maturity.
 * Only 'draft-day' is implemented (the reachable state). Other states return the
 * draft-day set for now; their capsule definitions are an additive future change.
 */
export function computeCapsules(args: {
  prep: PreppedClass;
  position: string;
  year: number;
  baseline: SpendBaselineEntry | undefined;
  maturity: ClassMaturity;
}): Capsule[] {
  const { prep, position, year, baseline } = args;
  const ordered = [
    steal(prep, position, year),
    conviction(prep, position, year),
    cliff(prep, position, year),
    spend(prep, position, year, baseline),
    bet(prep, position, year),
    slipped(prep, position, year),
  ];
  return ordered.filter((c): c is Capsule => c !== null);
}
