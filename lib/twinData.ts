/**
 * lib/twinData.ts
 *
 * Shared, pure data prep for the crawlable-twin position pages.
 *
 * Single source of truth: capsules (lib/capsules.ts), the data table
 * (lib/classTable.ts), and the JSON-LD (lib/twinJsonLd.ts) all consume the
 * PosPlayer[] this produces, so the visible markup and the structured data can
 * never drift.
 *
 * Definitions used throughout the twin feature:
 *   - "drafted"   = a real draft pick was spent (pick_drafted != null).
 *                   A player with only team_drafted is a UDFA SIGNING, not drafted.
 *   - "undrafted" = pick_drafted == null (includes UDFA-signed players).
 *   - delta (Δ)   = pick - consensus rank. Positive = fell (steal); negative =
 *                   drafted ahead of the board (conviction).
 *   - posRank     = 1-based index within the position by consensus rank ascending.
 */

import type { Player } from './sheets';
import { buildSlugMap } from './slugs';

export interface PosPlayer {
  player: Player;
  /** 1-based rank within the position by consensus rank asc. Null if no consensus rank. */
  posRank: number | null;
  /** pick_drafted - rank. Null unless both pick and rank are present. */
  delta: number | null;
  /** Resolved /players/[slug] slug for this player (collision-aware within the class). */
  slug: string;
}

export interface PreppedClass {
  /** Every player at the position (drafted + undrafted), enriched. */
  posPlayers: PosPlayer[];
  /** Drafted players (pick != null), sorted by pick ascending. */
  drafted: PosPlayer[];
  /** Undrafted players (pick == null), sorted by consensus rank ascending. */
  undrafted: PosPlayer[];
  /** Max pick number across the WHOLE class (all positions). Computed, never hardcoded. */
  totalPicks: number;
  /**
   * team_drafted → every drafted pick number that team made in this class (ALL
   * positions). Drives THE BET's denominator (team's total draft investment).
   */
  teamPicks: Map<string, number[]>;
}

/**
 * Enrich one position's slice of a draft class.
 *
 * @param classPlayers ALL players in the draft class (every position) — needed for
 *                     a collision-aware slug map and the class-wide totalPicks.
 * @param position     canonical position token (e.g. "WR").
 */
export function prepPositionClass(classPlayers: Player[], position: string): PreppedClass {
  // Slug map over the whole class so within-class name collisions resolve the same
  // way the live /players/[slug] route does for this cohort.
  const slugMap = buildSlugMap(classPlayers);
  const slugFor = (p: Player) => slugMap.get(p.player_id) ?? '';

  // Class-wide max pick (compensatory picks vary by year — always compute).
  const totalPicks = classPlayers.reduce(
    (max, p) => (p.pick_drafted != null && p.pick_drafted > max ? p.pick_drafted : max),
    0,
  );

  const atPos = classPlayers.filter((p) => p.pos === position);

  // Position rank: rank ascending, 1-based, only players with a consensus rank.
  const ranked = atPos
    .filter((p) => p.rank != null)
    .sort((a, b) => (a.rank as number) - (b.rank as number));
  const posRankByPid = new Map<string, number>();
  ranked.forEach((p, i) => posRankByPid.set(p.player_id, i + 1));

  const posPlayers: PosPlayer[] = atPos.map((player) => {
    const pick = player.pick_drafted;
    const rank = player.rank;
    const delta = pick != null && rank != null ? pick - rank : null;
    return {
      player,
      posRank: posRankByPid.get(player.player_id) ?? null,
      delta,
      slug: slugFor(player),
    };
  });

  const drafted = posPlayers
    .filter((pp) => pp.player.pick_drafted != null)
    .sort((a, b) => (a.player.pick_drafted as number) - (b.player.pick_drafted as number));

  const undrafted = posPlayers
    .filter((pp) => pp.player.pick_drafted == null)
    .sort((a, b) => (a.player.rank ?? Infinity) - (b.player.rank ?? Infinity));

  // Class-wide team → drafted pick numbers (every position).
  const teamPicks = new Map<string, number[]>();
  for (const p of classPlayers) {
    if (p.pick_drafted == null || !p.team_drafted) continue;
    const list = teamPicks.get(p.team_drafted) ?? [];
    list.push(p.pick_drafted);
    teamPicks.set(p.team_drafted, list);
  }

  return { posPlayers, drafted, undrafted, totalPicks, teamPicks };
}

/** Position rank label, e.g. "WR4". Null posRank → just the position token. */
export function posRankLabel(position: string, posRank: number | null): string {
  return posRank != null ? `${position}${posRank}` : position;
}

/** Render a delta with an explicit sign: +38 / −12 / 0. Uses a true minus sign. */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return '0';
}
