/**
 * lib/classTable.ts
 *
 * Piece 3 — the position class data table.
 *
 * Builds the row model (drafted in draft order; UDFA appendix by consensus rank)
 * and the column model. The column model includes the future early-returns /
 * graduated columns as INACTIVE entries keyed to maturity state, so the August
 * activation is additive (new columns light up) rather than a structural rewrite.
 */

import type { PreppedClass, PosPlayer } from './twinData';
import { posRankLabel } from './twinData';
import type { ClassMaturity } from './classMaturity';

export interface TableColumn {
  key: string;
  label: string;
  /** Rendered only when active. Future columns are inactive at draft-day. */
  active: boolean;
}

export interface TableRow {
  pick: number | null;
  round: number | null;
  playerName: string;
  slug: string;
  posRank: string;
  consensus: number | null;
  delta: number | null;
  school: string | null;
  team: string | null;
}

/** Column model for the given maturity. Draft-day = first seven; rest inactive. */
export function getTableColumns(maturity: ClassMaturity): TableColumn[] {
  const future = maturity !== 'draft-day';
  return [
    { key: 'pick', label: 'Pick', active: true },
    { key: 'player', label: 'Player', active: true },
    { key: 'posRank', label: 'Pos Rank', active: true },
    { key: 'consensus', label: 'Consensus', active: true },
    { key: 'delta', label: 'Δ', active: true },
    { key: 'school', label: 'School', active: true },
    { key: 'team', label: 'Team', active: true },
    // Future (early-returns / graduated) — additive, not structural:
    { key: 'usagePctl', label: 'Usage Pctl', active: future },
    { key: 'zone', label: 'Zone', active: future },
    { key: 'verdict', label: 'Verdict', active: future },
  ];
}

function toRow(pp: PosPlayer, position: string): TableRow {
  return {
    pick: pp.player.pick_drafted,
    round: pp.player.rd_drafted,
    playerName: pp.player.name,
    slug: pp.slug,
    posRank: posRankLabel(position, pp.posRank),
    consensus: pp.player.rank,
    delta: pp.delta,
    school: pp.player.school,
    team: pp.player.team_drafted,
  };
}

export function buildClassTable(prep: PreppedClass, position: string): {
  drafted: TableRow[];
  udfa: TableRow[];
} {
  return {
    drafted: prep.drafted.map((pp) => toRow(pp, position)),
    udfa: prep.undrafted.map((pp) => toRow(pp, position)),
  };
}
