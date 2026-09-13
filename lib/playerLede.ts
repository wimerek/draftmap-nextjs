/**
 * lib/playerLede.ts (2026-09-13)
 *
 * The one factual sentence pair that describes a player from the data the page already
 * holds: who he is, where the consensus had him, what teams did. Rendered under the meta
 * block on the standalone player page AND used as that page's meta / OG / JSON-LD
 * description, so Google's snippet candidate and the visible page agree.
 *
 * Voice (locked): factual, no verdicts, no em dashes, "the consensus" for Act 1.
 * Four shapes, chosen by (rank present?) × (rd_drafted present?):
 *   A  Ranked #72 overall on the 2021 consensus board (Round 3 projection); Kansas City drafted him in Round 6, pick 226.
 *   B  Ranked #360 overall on the 2026 consensus board (Round 7 projection); went undrafted.
 *   C  Not on the 2018 consensus board; Philadelphia drafted him in Round 7, pick 233.
 *   D  Not on the 2026 consensus board; went undrafted.
 * plus two guards: rank present but rd null drops the parenthetical; a drafted row with no
 * team_drafted prints "drafted in Round N" with no team. Head is "{name}, {pos}, {school}."
 * (school omitted when blank: 875 rows). A row with team_drafted but no rd_drafted is a UDFA
 * signing (twinData.ts:13), so "went undrafted" is correct for it.
 */

import type { Player } from './sheets';
import { resolveTeamLabel } from './chartConstants';

export function buildPlayerLede(p: Player): string {
  const head = `${p.name}, ${p.pos}${p.school ? `, ${p.school}` : ''}.`;

  const board = p.rank != null
    ? `Ranked #${p.rank} overall on the ${p.draft_year} consensus board${
        p.rd != null ? ` (Round ${p.rd} projection)` : ''
      }`
    : `Not on the ${p.draft_year} consensus board`;

  let result: string;
  if (p.rd_drafted != null) {
    const team = resolveTeamLabel(p.team_drafted);
    const pick = p.pick_drafted != null ? `, pick ${p.pick_drafted}` : '';
    result = team
      ? `${team} drafted him in Round ${p.rd_drafted}${pick}`
      : `drafted in Round ${p.rd_drafted}${pick}`;
  } else {
    result = 'went undrafted';
  }

  return `${head} ${board}; ${result}.`;
}
