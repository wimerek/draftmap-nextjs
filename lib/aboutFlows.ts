/**
 * lib/aboutFlows.ts
 *
 * Server-only aggregation for the About page Sankey: draft round → second-contract
 * tier flow matrices, for the resolved second-contract window (drafted players,
 * classes 2018–2021). This is the SAME window as the cold-open stat, so the visual
 * and the claim agree by construction.
 *
 * Numbers are DERIVED from the live data layer (fetchPlayers + fetchSecondContracts),
 * never hardcoded. Wrapped in unstable_cache (revalidate 86400) like fetchOutcomeScores.
 *
 * The window is fixed because verdicts resolve through 2021 (lib/verdict.ts
 * VERDICT_RESOLVED_THROUGH) — `second_contracts` holds nothing usable outside it.
 *
 * Acceptance: the computed matrices must equal the verified numbers in the build
 * brief's Appendix A (n = 1,024; outside-round-1 paid = 34.3%).
 */

import { unstable_cache } from 'next/cache';
import { fetchPlayers, fetchSecondContracts } from './sheets';
import type { AboutFlows, FlowMatrix, Round, RoundRow, Tier } from './aboutFlowsTypes';

// Types + the year list live in aboutFlowsTypes.ts (client-safe). Re-export so
// existing server-side imports of `AboutFlows` from this module keep working.
export type { Tier, Round, RoundRow, FlowMatrix, AboutFlows, AboutYearKey } from './aboutFlowsTypes';
export { ABOUT_YEARS } from './aboutFlowsTypes';

const RESOLVED_CLASS_YEARS = [2018, 2019, 2020, 2021] as const;
const ROUNDS: Round[] = [1, 2, 3, 4, 5, 6, 7];
const TIERS: Tier[] = ['NONE', 'PROVE_IT', 'BRIDGE', 'SOLID', 'PREMIUM'];

// ── Matrix helpers ──────────────────────────────────────────────────────────────

function emptyRow(): RoundRow {
  return { NONE: 0, PROVE_IT: 0, BRIDGE: 0, SOLID: 0, PREMIUM: 0 };
}

function emptyMatrix(): FlowMatrix {
  return {
    1: emptyRow(), 2: emptyRow(), 3: emptyRow(), 4: emptyRow(),
    5: emptyRow(), 6: emptyRow(), 7: emptyRow(),
  };
}

function isRound(n: number | null): n is Round {
  return n !== null && n >= 1 && n <= 7;
}

function addInto(target: FlowMatrix, source: FlowMatrix): void {
  for (const r of ROUNDS) {
    for (const t of TIERS) {
      target[r][t] += source[r][t];
    }
  }
}

// ── Aggregation ───────────────────────────────────────────────────────────────

async function computeAboutFlows(): Promise<AboutFlows> {
  const verdicts = await fetchSecondContracts();

  const perYear: Record<number, FlowMatrix> = {};
  let unmatched = 0;

  for (const year of RESOLVED_CLASS_YEARS) {
    const matrix = emptyMatrix();
    const players = await fetchPlayers(year);

    for (const p of players) {
      if (!p.drafted) continue;
      if (!isRound(p.rd_drafted)) continue;

      const verdict = verdicts.get(p.player_id);
      if (!verdict) {
        // Resolved-class drafted players should always have a verdict row.
        unmatched += 1;
        continue;
      }
      matrix[p.rd_drafted][verdict.tier] += 1;
    }

    perYear[year] = matrix;
  }

  if (unmatched > 0) {
    console.warn(
      `[aboutFlows] ${unmatched} drafted resolved-class player(s) had no second_contracts row (slug join failure); excluded from the Sankey.`
    );
  }

  const all = emptyMatrix();
  for (const year of RESOLVED_CLASS_YEARS) addInto(all, perYear[year]);

  return {
    all,
    y2018: perYear[2018],
    y2019: perYear[2019],
    y2020: perYear[2020],
    y2021: perYear[2021],
  };
}

const getCachedAboutFlows = unstable_cache(
  computeAboutFlows,
  ['about-flows-v1'],
  { revalidate: 86400 }
);

/**
 * Fetch the round → tier flow matrices for the About Sankey. ISR-cached (86400s).
 * Graceful empty-matrices on failure (mirrors fetchSecondContracts / fetchOutcomeScores).
 */
export async function fetchAboutFlows(): Promise<AboutFlows> {
  try {
    return await getCachedAboutFlows();
  } catch {
    return {
      all: emptyMatrix(),
      y2018: emptyMatrix(),
      y2019: emptyMatrix(),
      y2020: emptyMatrix(),
      y2021: emptyMatrix(),
    };
  }
}
