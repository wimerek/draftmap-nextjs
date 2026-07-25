/**
 * lib/tourTrackedPlayer.ts
 *
 * "How to read" tour — THE NARRATIVE SPINE (v2.2 addendum §A).
 *
 * The tour follows ONE player from start to finish instead of a different example dot per
 * beat: undervalued on the board → fell on draft day (a steal) → the league paid him. He is
 * ringed on all four card pages, so the whole DraftMap thesis lands on one face.
 *
 * Selection is DATA-DRIVEN, never hand-picked, so it auto-updates as the default landing
 * class advances:
 *
 *   pool      drafted players in a PAID money band who fell past their consensus rank
 *   prefer    the TOP5/TOP10 pool; only if it is empty, the MIDDLE pool
 *   maximize  fall = pick_drafted − rank   (the biggest slide past the board)
 *   tie-break higher band → career honors (All-Pro, then Pro Bowl) → higher ARC
 *
 * Inputs are exactly what Act 2 and Act 3 already read — `rank` and `pick_drafted` (the
 * consensus/actual pair the steal metric uses) and `verdict.moneyBand` — all of which arrive
 * from the GOOGLE SHEET at runtime (§D). `data/players_combined.csv` is the upcoming-prospect
 * file (2024–2026, no bands) and must never be used to derive the tracked dot.
 *
 * A PENDING class has no money bands at all, so this returns null there and the tour's callers
 * fall back to their v2 designations (top-QB example dot / biggest-steal hero). Act 3 borrows
 * the resolved default class on its own (§10.9), so the spine is intact on any resolved class.
 */
import type { Player } from "@/lib/sheets";
import type { MoneyBand } from "@/lib/verdict";

/**
 * Optional per-class override — Derek naming a specific face for a class (§A). Keyed by
 * draft_year → player_id slug. Empty by default: the rule below is the intended path, and an
 * entry here is a deliberate editorial exception, not a data patch.
 */
export const TOUR_TRACKED_OVERRIDE: Record<number, string> = {};

/** Preference order for the paid pool: try the top tier first, then the middle class. */
const TRACKED_BAND_POOLS: MoneyBand[][] = [["TOP5", "TOP10"], ["MIDDLE"]];

/** Band rank for the first tie-break (higher = better). */
const BAND_RANK: Record<string, number> = { TOP5: 3, TOP10: 2, MIDDLE: 1 };

/** Career honors, cheapest-first, for the second tie-break. */
function honors(p: Player): { allPro: boolean; proBowl: boolean } {
  const rows = p.seasonData ?? [];
  return {
    allPro:  rows.some(r => r.allPro),
    proBowl: rows.some(r => r.proBowl),
  };
}

/**
 * The tracked player for `players` (one draft class), or null when the class can't support
 * the arc (pending class, no verdicts joined, or nobody both fell and got paid).
 */
export function selectTourTrackedPlayer(players: Player[]): Player | null {
  if (players.length === 0) return null;

  // Editorial override first — it names a face, so it wins outright when it resolves.
  const overrideId = TOUR_TRACKED_OVERRIDE[players[0].draft_year];
  if (overrideId) {
    const named = players.find(p => p.player_id === overrideId);
    if (named) return named;
  }

  for (const pool of TRACKED_BAND_POOLS) {
    let best: Player | null = null;
    let bestFall = 0;

    for (const p of players) {
      const band = p.verdict?.moneyBand;
      if (!band || !pool.includes(band)) continue;
      const pick = p.pick_drafted;
      if (p.rank == null || pick == null || pick <= 0) continue;
      const fall = pick - p.rank;
      if (fall <= 0) continue; // a reach or an on-board pick is not a steal

      if (best === null || fall > bestFall || (fall === bestFall && beatsOnTieBreak(p, best))) {
        best = p;
        bestFall = fall;
      }
    }

    if (best) return best;
  }

  return null;
}

/** True when `a` should displace the incumbent `b` at an equal fall (§A tie-break order). */
function beatsOnTieBreak(a: Player, b: Player): boolean {
  const ba = BAND_RANK[a.verdict?.moneyBand ?? ""] ?? 0;
  const bb = BAND_RANK[b.verdict?.moneyBand ?? ""] ?? 0;
  if (ba !== bb) return ba > bb;

  const ha = honors(a);
  const hb = honors(b);
  if (ha.allPro !== hb.allPro) return ha.allPro;
  if (ha.proBowl !== hb.proBowl) return ha.proBowl;

  return (a.outcomeScore ?? -1) > (b.outcomeScore ?? -1);
}
