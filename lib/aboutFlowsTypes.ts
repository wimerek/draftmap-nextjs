/**
 * lib/aboutFlowsTypes.ts
 *
 * Client-safe types + constants for the About Sankey. Kept SEPARATE from
 * lib/aboutFlows.ts because that module imports the server-only data layer
 * (lib/sheets.ts → fs); a client component must not transitively pull that in.
 * The RoundTierSankey client component imports from HERE; the server aggregation
 * in aboutFlows.ts re-uses these same types.
 */

import type { ContractTier } from './verdict';

export type Tier = ContractTier; // 'NONE'|'PROVE_IT'|'BRIDGE'|'SOLID'|'PREMIUM'
export type Round = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RoundRow = Record<Tier, number>;
export type FlowMatrix = Record<Round, RoundRow>;

export interface AboutFlows {
  all: FlowMatrix;
  y2018: FlowMatrix;
  y2019: FlowMatrix;
  y2020: FlowMatrix;
  y2021: FlowMatrix;
}

/** Year keys, in display order. 'all' is the default/leftmost. */
export type AboutYearKey = 'all' | 'y2018' | 'y2019' | 'y2020' | 'y2021';

export const ABOUT_YEARS: Array<{ key: AboutYearKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'y2018', label: '2018' },
  { key: 'y2019', label: '2019' },
  { key: 'y2020', label: '2020' },
  { key: 'y2021', label: '2021' },
];
