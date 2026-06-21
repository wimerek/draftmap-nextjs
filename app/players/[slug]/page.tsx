import type { Metadata } from 'next';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { fetchPlayers, fetchOutcomeScores, VALID_DRAFT_YEARS, type Player } from '@/lib/sheets';
import { buildSlugMap } from '@/lib/slugs';
import PlayerCardWrapper from '@/components/PlayerCardWrapper';

// Player profile data changes rarely; live-draft freshness is handled by the
// /api route handlers (60s), so daily revalidation is sufficient here.
export const revalidate = 86400;

interface Props {
  params: { slug: string };
}

// Cache the all-years fetch + parse + slug-map build as one unit across
// requests, so crawlers walking ~500 player URLs don't re-run it per page.
// Map serialized as entries (Maps don't survive the cache's JSON round-trip).
const getCachedPlayersAndSlugs = unstable_cache(
  async (): Promise<{ players: Player[]; slugEntries: Array<[string, string]> }> => {
    const results = await Promise.all(VALID_DRAFT_YEARS.map(y => fetchPlayers(y)));
    const players = results.flat();
    return { players, slugEntries: Array.from(buildSlugMap(players).entries()) };
  },
  ['players-slug-map-v1'],
  { revalidate: 3600 }
);

// React.cache dedupes within a request: generateMetadata + the page body
// share a single execution instead of running this twice.
const getPlayerForSlug = cache(async (slug: string): Promise<Player | null> => {
  const { players, slugEntries } = await getCachedPlayersAndSlugs();
  const playerById = new Map(players.map(p => [p.player_id, p]));
  for (const [pid, s] of slugEntries) {
    if (s === slug) return playerById.get(pid) ?? null;
  }
  return null;
});

export async function generateStaticParams() {
  // Player pages render on first request via ISR (revalidate=86400).
  // Pre-generating at build time causes timeouts: fetchOutcomeScores() (10k rows)
  // doesn't share cache across Vercel's parallel build workers. With the
  // unstable_cache compute caching now in place, restoring current-year
  // params is a future option if build time allows.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = await getPlayerForSlug(params.slug);
  if (!player) return { title: 'Player Not Found' };

  const slug = params.slug;

  return {
    title: `${player.name} NFL Draft Profile | DraftMap`,
    description: `${player.name}: ${player.pos}, ${player.school}. Projected Round ${player.rd}, Rank #${player.rank}. View measurables and draft analysis on DraftMap.`,
    openGraph: {
      title: `${player.name} NFL Draft Profile | DraftMap`,
      description: `${player.name}: ${player.pos}, ${player.school}. ${player.rd_drafted ? `Drafted Round ${player.rd_drafted}, Pick ${player.pick_drafted} by ${player.team_drafted}.` : `Projected Round ${player.rd}.`}`,
      url: `https://draftmap.app/players/${slug}`,
      siteName: 'DraftMap',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${player.name} NFL Draft Profile | DraftMap`,
      description: `${player.name}: ${player.pos}, ${player.school}.`,
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
    description: `${player.name}: ${player.pos}, ${player.school}. ${player.rd_drafted ? `Drafted Round ${player.rd_drafted}, Pick ${player.pick_drafted} by ${player.team_drafted}.` : `Projected Round ${player.rd}, Rank #${player.rank} in the ${player.draft_year} NFL Draft.`}`,
    affiliation: {
      '@type': 'Organization',
      name: player.school,
    },
    ...(player.team_drafted ? {
      memberOf: {
        '@type': 'SportsTeam',
        name: player.team_drafted,
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
      <PlayerCardWrapper player={enrichedPlayer} players={classPeers} />
    </main>
  );
}
