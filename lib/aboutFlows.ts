/**
 * lib/aboutFlows.ts
 *
 * Server-only aggregation for the About page Sankey: draft round → second-contract
 * MONEY BAND flow matrices, for the resolved second-contract window (drafted players,
 * classes 2018–2021). Same window as the cold-open stat, so the visual and the claim
 * agree by construction.
 *
 * Six-band rebuild (2026-07-13): re-derives round → money_band (six bands) from the live
 * data layer (fetchPlayers + fetchSecondContracts), replacing the retired five-tier
 * contract_tier taxonomy. Special-teams players (K/P/LS) carry a blank money_band and are
 * EXCLUDED (they sit outside the money market — same exclusion the Act 3 field makes).
 * A blank band is NOT a join failure.
 *
 * WINDOW IS A DELIBERATE ABOUT-PAGE CLAMP to the fully-resolved classes 2018–2021 (every
 * drafted player in that span has a money_band; zero join failures). It is NOT driven by
 * lib/verdict.ts VERDICT_RESOLVED_THROUGH (now 2022) — the 2022 class is held out pending
 * the graduation-rule review. Do NOT widen this to 2022.
 *
 * Acceptance (2018–2021, ST excluded): n = 1,002. Outside-round-1 money family
 * (MIDDLE+TOP10+TOP5) = 40.3% (matches the cold-open "about 40%"). Full golden matrix in
 * the build brief.
 */

import { unstable_cache } from 'next/cache';
import { fetchPlayers, fetchSecondContracts } from './sheets';
import type { AboutFlows, FlowMatrix, Round, RoundRow, MoneyBand } from './aboutFlowsTypes';

// Types + the year list live in aboutFlowsTypes.ts (client-safe). Re-export so existing
// server-side imports keep working.
export type { MoneyBand, Round, RoundRow, FlowMatrix, AboutFlows, AboutYearKey } from './aboutFlowsTypes';
export { ABOUT_YEARS } from './aboutFlowsTypes';

const RESOLVED_CLASS_YEARS = [2018, 2019, 2020, 2021] as const;
const ROUNDS: Round[] = [1, 2, 3, 4, 5, 6, 7];
const BANDS: MoneyBand[] = ['NEVER', 'ZERO', 'MIN', 'MIDDLE', 'TOP10', 'TOP5'];

// ── Matrix helpers ──────────────────────────────────────────────────────────────

function emptyRow(): RoundRow {
  return { NEVER: 0, ZERO: 0, MIN: 0, MIDDLE: 0, TOP10: 0, TOP5: 0 };
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
    for (const b of BANDS) {
      target[r][b] += source[r][b];
    }
  }
}

// ── Aggregation ───────────────────────────────────────────────────────────────

async function computeAboutFlows(): Promise<AboutFlows> {
  const verdicts = await fetchSecondContracts();

  const perYear: Record<number, FlowMatrix> = {};
  let unmatched = 0;
  let stExcluded = 0;

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
      if (verdict.moneyBand === null) {
        // Special teams (K/P/LS): blank money_band, outside the money market.
        // NOT a join failure — a legitimate exclusion (parallels the Act 3 field).
        stExcluded += 1;
        continue;
      }
      matrix[p.rd_drafted][verdict.moneyBand] += 1;
    }

    perYear[year] = matrix;
  }

  if (unmatched > 0) {
    console.warn(
      `[aboutFlows] ${unmatched} drafted resolved-class player(s) had no second_contracts row (slug join failure); excluded from the Sankey.`
    );
  }
  if (stExcluded > 0) {
    console.info(
      `[aboutFlows] ${stExcluded} special-teams player(s) (blank money_band) excluded — outside the money market, not a join failure.`
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
  ['about-flows-v2'],
  { revalidate: 86400 }
);

/**
 * Fetch the round → money-band flow matrices for the About Sankey. ISR-cached (86400s).
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
