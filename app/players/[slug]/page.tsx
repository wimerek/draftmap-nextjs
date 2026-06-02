import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPlayers, fetchOutcomeScores, VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR, type Player } from '@/lib/sheets';
import { buildSlugMap } from '@/lib/slugs';
import PlayerCardWrapper from '@/components/PlayerCardWrapper';

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

async function fetchAllPlayers(): Promise<Player[]> {
  const results = await Promise.all(VALID_DRAFT_YEARS.map(y => fetchPlayers(y)));
  return results.flat();
}

async function getPlayerForSlug(slug: string): Promise<Player | null> {
  const allPlayers = await fetchAllPlayers();
  const slugMap = buildSlugMap(allPlayers);
  const playerById = new Map(allPlayers.map(p => [p.player_id, p]));
  let found: Player | null = null;
  slugMap.forEach((s, pid) => {
    if (s === slug && found === null) {
      found = playerById.get(pid) ?? null;
    }
  });
  return found;
}

export async function generateStaticParams() {
  try {
    const players = await fetchPlayers(CURRENT_DRAFT_YEAR);
    const slugMap = buildSlugMap(players);
    return players
      .map(p => ({ slug: slugMap.get(p.player_id) }))
      .filter((p): p is { slug: string } => p.slug !== undefined);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = await getPlayerForSlug(params.slug);
  if (!player) return { title: 'Player Not Found' };

  const slug = params.slug;

  return {
    title: `${player.name} NFL Draft Profile | DraftMap`,
    description: `${player.name} — ${player.pos}, ${player.school}. Projected Round ${player.rd}, Rank #${player.rank}. View measurables and draft analysis on DraftMap.`,
    openGraph: {
      title: `${player.name} NFL Draft Profile | DraftMap`,
      description: `${player.name} — ${player.pos}, ${player.school}. ${player.rd_drafted ? `Drafted Round ${player.rd_drafted}, Pick ${player.pick_drafted} by ${player.team_drafted}.` : `Projected Round ${player.rd}.`}`,
      url: `https://draftmap.app/players/${slug}`,
      siteName: 'DraftMap',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${player.name} NFL Draft Profile | DraftMap`,
      description: `${player.name} — ${player.pos}, ${player.school}.`,
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
    description: `${player.name} — ${player.pos}, ${player.school}. ${player.rd_drafted ? `Drafted Round ${player.rd_drafted}, Pick ${player.pick_drafted} by ${player.team_drafted}.` : `Projected Round ${player.rd}, Rank #${player.rank} in the ${player.draft_year} NFL Draft.`}`,
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
