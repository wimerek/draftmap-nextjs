import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { fetchPlayers, fetchOutcomeScores, CURRENT_DRAFT_YEAR, type Player } from '@/lib/sheets';
import { generateBaseSlug } from '@/lib/slugs';
import { getPlayerSlugIndex } from '@/lib/playerSlugIndex';
import PlayerCardWrapper from '@/components/PlayerCardWrapper';

// Player profile data changes rarely; live-draft freshness is handled by the
// /api route handlers (60s), so daily revalidation is sufficient here.
export const revalidate = 86400;

/** Smallest real class in the snapshot is 2024 at 339. A read under this is broken data. */
const PLAYERS_YEAR_FLOOR = 250;

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
