/**
 * lib/consensusCredit.ts
 *
 * Full-form publication credit for Act 1's consensus projections.
 *
 * The raw `consensus_source` value is NEVER rendered (it carries em dashes) —
 * prefix-match "Wide Left" / "Jack" and map to the published display copy.
 * Strings below are locked (Derek, 2026-08-02); do not redraft.
 *
 * The About page's Consensus sources card owns the long-form treatment; this is
 * the one-line page-level credit used by the chart sidebar and the /players table.
 * Act1HoverCard uses a shorter trimmed form (250px card, one line) — see DraftChart.
 */

export interface ConsensusCredit {
  /** Everything before the separator — plain text. */
  lead: string;
  /** Linked domain text. */
  domain: string;
  href: string;
}

const WIDE_LEFT: ConsensusCredit = {
  lead: "Consensus projections: Wide Left Consensus Big Board, compiled by Arif Hasan",
  domain: "wideleft.football",
  href: "https://wideleft.football",
};

const JACK: ConsensusCredit = {
  lead: "Consensus projections: Jack Lichtenstein Consensus Big Board (derivative)",
  domain: "jacklich10.com",
  href: "https://jacklich10.com/bigboard/nfl/",
};

/** Map a raw `consensus_source` to its published credit. Unknown/blank → null. */
export function consensusCredit(source: string | null | undefined): ConsensusCredit | null {
  if (!source) return null;
  if (source.startsWith("Wide Left")) return WIDE_LEFT;
  if (source.startsWith("Jack")) return JACK;
  return null;
}

/** Credit for a loaded class: taken from the first ranked player carrying a source. */
export function classConsensusCredit(
  players: { rank: number | null; consensus_source: string | null }[]
): ConsensusCredit | null {
  return consensusCredit(
    players.find((p) => p.rank != null && p.consensus_source)?.consensus_source
  );
}
