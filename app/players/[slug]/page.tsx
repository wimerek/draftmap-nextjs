import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { fetchPlayers, fetchOutcomeScores, CURRENT_DRAFT_YEAR, type Player } from '@/lib/sheets';
import { generateBaseSlug } from '@/lib/slugs';
import { getPlayerSlugIndex } from '@/lib/playerSlugIndex';
import { resolveTeamLabel } from '@/lib/chartConstants';
import { buildPlayerLede } from '@/lib/playerLede';
import PlayerCardWrapper from '@/components/PlayerCardWrapper';
import { isSupportedTwinYear, positionToSlug, slugToPosition } from '@/lib/twinConfig';
import { VALID_DRAFT_YEARS } from '@/lib/draftYears';

// Player profile data changes rarely; live-draft freshness is handled by the
// /api route handlers (60s), so daily revalidation is sufficient here.
export const revalidate = 86400;

/** Smallest real class in the snapshot is 2024 at 339. A read under this is broken data. */
const PLAYERS_YEAR_FLOOR = 250;

/**
 * Destination for the standalone page's CTA and meta-row links (2026-09-12).
 *   1. Twin page — crawlable, position-filtered chart — when the class AND position have one.
 *   2. The class chart alone when only the year has a page. Today that is exactly the 167
 *      specialists: pos "ST" is not in POSITION_ORDER, so slugToPosition("st") is null and
 *      /draft/{year}/st would 404. /draft/[year] pre-renders every VALID_DRAFT_YEARS entry
 *      (app/draft/[year]/page.tsx:12), so this fallback always resolves.
 *   3. /draft (307 → DEFAULT_LANDING_YEAR, 2022 today) if the year has no page. 0 rows
 *      today — every draft_year in the search index is 2016–2026, which both lists cover.
 */
function journeyHrefFor(player: Player): string {
  const year = player.draft_year;
  const validYears: readonly number[] = VALID_DRAFT_YEARS;
  const posSlug = positionToSlug(player.pos);
  if (isSupportedTwinYear(year) && slugToPosition(posSlug) !== null) {
    return `/draft/${year}/${posSlug}`;
  }
  if (validYears.includes(year)) return `/draft/${year}`;
  return '/draft';
}

interface Props {
  params: { slug: string };
}

// React.cache dedupes within a request: generateMetadata + the page body
// share a single execution instead of running this twice.
const getPlayerForSlug = cache(async (slug: string): Promise<Player | null> => {
  const { bySlug, byPid } = await getPlayerSlugIndex();
  const hit = bySlug.get(slug);

  if (hit) {
    const yearPlayers = await fetchPlayers(hit.draft_year);
    if (yearPlayers.length < PLAYERS_YEAR_FLOOR) {
      throw new Error(
        `[players/${slug}] ${hit.draft_year} returned ${yearPlayers.length} players ` +
        `(floor ${PLAYERS_YEAR_FLOOR}) — refusing to cache a 404`,
      );
    }
    return yearPlayers.find(p => p.player_id === hit.player_id) ?? null;
  }

  // Snapshot lag: a player Derek added since the last search-index rebuild has no entry.
  // Bounded fallback — current class only, base slug only, and only rows the snapshot
  // does not already know about (so it can never contradict a canonical suffixed slug).
  const current = await fetchPlayers(CURRENT_DRAFT_YEAR);
  if (current.length < PLAYERS_YEAR_FLOOR) {
    throw new Error(
      `[players/${slug}] current class returned ${current.length} players ` +
      `(floor ${PLAYERS_YEAR_FLOOR}) — refusing to cache a 404`,
    );
  }
  return current.find(p => !byPid.has(p.player_id) && generateBaseSlug(p.name) === slug) ?? null;
});

export async function generateStaticParams() {
  // Player pages render on first request via ISR (revalidate=86400).
  // Pre-generating at build time causes timeouts: fetchOutcomeScores() (10k rows)
  // doesn't share cache across Vercel's parallel build workers. Now that slug
  // resolution costs one cached year-fetch instead of eleven, restoring
  // current-year params is a future option if build time allows.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = await getPlayerForSlug(params.slug);
  if (!player) return { title: 'Player Not Found' };

  const slug = params.slug;

  // One sentence, shared with the visible lede and the JSON-LD (lib/playerLede.ts), so the
  // snippet candidate Google sees in <meta> is the same prose it sees on the page.
  const lede = buildPlayerLede(player);
  const schoolTitle = player.school ? `, ${player.school}` : '';

  return {
    title: `${player.name} NFL Draft Profile: ${player.pos}${schoolTitle}`,
    description: `${lede} Measurables vs the ${player.draft_year} ${player.pos} class on DraftMap.`,
    openGraph: {
      title: `${player.name} NFL Draft Profile: ${player.pos}${schoolTitle} | DraftMap`,
      description: lede,
      url: `https://draftmap.app/players/${slug}`,
      siteName: 'DraftMap',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${player.name} NFL Draft Profile: ${player.pos}${schoolTitle} | DraftMap`,
      description: lede,
    },
    alternates: {
      canonical: `https://draftmap.app/players/${slug}`,
    },
  };
}

export default async function PlayerPage({ params }: Props) {
  const player = await getPlayerForSlug(params.slug);
  if (!player) notFound();

  // Fetch outcome scores and all players from same draft year in parallel
  const [outcomeMap, classPeers] = await Promise.all([
    fetchOutcomeScores(),
    fetchPlayers(player.draft_year),
  ])
  // ISR-write reduction (2026-09-07). PlayerCard's three consumers of `players` all narrow to
  // same-position rows before use (buildPeerArr L145, posRank L526, classPeers L559), so
  // shipping the whole class serialised ~340-500 rows into every one of 4,795 RSC payloads for
  // nothing — ~145 KB written to the ISR cache per page, never read back. Narrowing here is
  // output-identical. Do NOT also filter by draft_year: classPeers is already single-year
  // (fetchPlayers(player.draft_year)).
  const positionPeers = classPeers.filter(p => p.pos === player.pos)

  // Merge outcome data into player object
  const outcome = outcomeMap.get(player.player_id)
  const enrichedPlayer: Player = {
    ...player,
    outcomeScore: outcome?.arcScore ?? null,
    stepScores:   outcome?.stepScores ?? null,
    seasonData:   outcome?.seasonData ?? null,
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    url: `https://draftmap.app/players/${params.slug}`,
    description: buildPlayerLede(player),
    ...(player.school ? {
      affiliation: {
        '@type': 'Organization',
        name: player.school,
      }
    } : {}),
    ...(player.team_drafted ? {
      memberOf: {
        '@type': 'SportsTeam',
        name: resolveTeamLabel(player.team_drafted),
        sport: 'American Football',
      }
    } : {}),
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PlayerCardWrapper
        player={enrichedPlayer}
        players={positionPeers}
        journeyHref={journeyHrefFor(player)}
        slug={params.slug}
      />
    </main>
  );
}
