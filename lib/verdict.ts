/**
 * lib/verdict.ts
 *
 * Types + maturity helper for the Act 3 "Second Contract" verdict layer.
 *
 * The verdict answers one question per drafted player: when his rookie deal
 * expired, what did the league pay him? That answer (the `contract_tier`) and
 * its magnitude (`verdict_share`, precomputed in build_second_contracts.py)
 * drive the resolved jellyfish field.
 *
 * This module is intentionally tiny and dependency-free so it can be imported
 * from both the server data layer (lib/sheets.ts) and pure chart math
 * (lib/chartMath.ts) without pulling in either.
 */

// ── Contract tier ───────────────────────────────────────────────────────────

/**
 * The five second-contract outcomes, lowest → highest. Authoritative when a
 * `second_contracts` row exists (including explicit NONE rows for resolved
 * classes — absence is NEVER a NONE; see lib/sheets.ts join-failure handling).
 */
export type ContractTier = 'NONE' | 'PROVE_IT' | 'BRIDGE' | 'SOLID' | 'PREMIUM';

/** All paid tiers (carry a real dollar deal). NONE/PROVE_IT render on floor strips. */
export const PAID_TIERS: ContractTier[] = ['BRIDGE', 'SOLID', 'PREMIUM'];

// ── Money band (Phase Lambda — Act 3 reframe) ───────────────────────────────
//
// The SIX-band money ladder that supersedes the five-tier waterfall AS THE ACT-3
// COLOR ENCODING (the tier above stays in the data + drives the legacy jellyfish;
// it is not deleted — Lambda "new before delete"). BAKED in the Sheet as
// second_contracts column L (`money_band`) — the render parses it, never derives it
// (boundaries are a sniff-test reference only). Blank for the 39 K/P/LS rows (ST
// positions excluded from the money market), which parse to `null`.
//
//   NEVER  — no second contract exists (apy ≤ 0)
//   ZERO   — re-signed, $0 guaranteed
//   MIN    — first guaranteed dollar → below the 1× vet-min floor line
//   MIDDLE — above the min floor, below the position's top-10 guarantee line
//   TOP10  — clears the position's top-10 (Nth-value) guarantee line
//   TOP5   — clears the position's top-5 (Nth-value) guarantee line
//
// Order = lowest → highest money (the reverse of the wall's top→bottom stack).
export type MoneyBand = 'NEVER' | 'ZERO' | 'MIN' | 'MIDDLE' | 'TOP10' | 'TOP5';

/** Money family (the three bands that "pop" — a real guaranteed deal above the
 *  vet-min floor). GOT PAID = these three (Lambda scoreboard definition). The
 *  bottom three (NEVER/ZERO/MIN) are the ink family and recede. */
export const MONEY_FAMILY_BANDS: MoneyBand[] = ['MIDDLE', 'TOP10', 'TOP5'];

/** True when a band is in the money family (guaranteed deal above the floor). */
export function isMoneyBand(band: MoneyBand | null): boolean {
  return band !== null && MONEY_FAMILY_BANDS.includes(band);
}

// ── Verdict record (one resolved-or-signed player) ──────────────────────────

export interface Verdict {
  /** DraftMap slug — the join key to a Player. */
  playerId: string;
  tier: ContractTier;
  contractYears: number | null;
  gtdDollars: number | null;
  gtdPctOfCap: number | null;
  apy: number | null;
  signingTeam: string | null;
  signingYear: number | null;
  /** '' (ordinary deal), '5th_year_option', or a forward-compat value like 'franchise_tag'. */
  tagOption: string;
  /**
   * gtd_pct / premium_line[(pos, signing_year)] — precomputed in a2.
   * Null for NONE rows and for any position with no market line (premium_line == 0,
   * i.e. the ST kicker/punter SOLIDs). PROVE_IT carries a value but renders on its floor strip.
   */
  verdictShare: number | null;
  /**
   * Phase Lambda six-band money ladder (second_contracts col L, BAKED). Null for
   * the 39 K/P/LS rows (blank money_band — ST positions out of the money market).
   * Parsed, never derived — the render reads this column; boundaries live only in
   * the sniff-test reference CSV. The Act-3 field colors dots off this.
   */
  moneyBand: MoneyBand | null;
  notes: string | null;
}

// ── Maturity gate ───────────────────────────────────────────────────────────

/**
 * Last draft class whose second-contract verdicts have been resolved + uploaded.
 *
 * Bumped MANUALLY when the annual contracts re-run uploads the next class's
 * resolved verdicts. NOT calendar-derived: resolution is a property of the
 * loaded data, not of the current date. (Calendar math would flip the next
 * class to "resolved" on Jan 1, months before the spring re-run lands, turning
 * every still-unsigned player into a false join-failure alarm.)
 */
export const VERDICT_RESOLVED_THROUGH = 2022;

/**
 * Whether a draft class's verdicts are loaded ('resolved') or not yet ('pending').
 *
 * A class is 'resolved' only when a2 has emitted its full slate of
 * `second_contracts` rows (including explicit NONE rows). For a resolved class,
 * a missing row is a slug mismatch — NOT a silent NONE.
 *
 * NOTE: deliberately separate from lib/classMaturity.ts, which calls a class
 * "graduated" at 4 seasons — that is one FA cycle too early for the verdict.
 */
export function getVerdictMaturity(draftYear: number): 'resolved' | 'pending' {
  return draftYear <= VERDICT_RESOLVED_THROUGH ? 'resolved' : 'pending';
}
