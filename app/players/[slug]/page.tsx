import { Fragment } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchPlayers, VALID_DRAFT_YEARS, type Player } from '@/lib/sheets';
import { buildSlugMap } from '@/lib/slugs';
import { fmtHeight } from '@/lib/utils';

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
    const allPlayers = await fetchAllPlayers();
    const slugMap = buildSlugMap(allPlayers);
    return allPlayers
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

  const measurables = [
    { label: 'Height',       value: fmtHeight(player.height) },
    { label: 'Weight',       value: player.weight    ? `${player.weight} lbs`  : '—' },
    { label: '40-Yard Dash', value: player.forty     ? `${player.forty}s`      : '—' },
    { label: 'Vertical',     value: player.vertical  ? `${player.vertical}"`   : '—' },
    { label: 'Broad Jump',   value: player.broad     ? `${player.broad}"`      : '—' },
    { label: '3-Cone',       value: player.cone3     ? `${player.cone3}s`      : '—' },
    { label: 'Shuttle',      value: player.shuttle   ? `${player.shuttle}s`    : '—' },
    { label: 'Bench',        value: player.bench     ? `${player.bench} reps`  : '—' },
    { label: 'Arm Length',   value: player.arm       ? `${player.arm}"`        : '—' },
    { label: 'Hand Size',    value: player.hand      ? `${player.hand}"`       : '—' },
  ].filter(m => m.value !== '—');

  return (
    <main className="min-h-screen bg-dm-bg px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <p className="text-dm-text-secondary text-sm uppercase tracking-wider font-semibold">
            {player.pos} · {player.school ?? '—'} · {player.draft_year} NFL Draft
          </p>
          <h1 className="text-4xl font-condensed font-bold text-dm-text">
            {player.name}
          </h1>
        </div>

        <div className="bg-dm-panel rounded-xl p-5 space-y-2">
          <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold">
            Projection
          </p>
          <p className="text-dm-text text-lg">
            Round {player.rd ?? '—'} · Overall #{player.rank ?? '—'}
          </p>
        </div>

        {player.drafted && (
          <div className="bg-dm-panel rounded-xl p-5 space-y-2">
            <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold">
              Draft Result
            </p>
            <p className="text-dm-text text-lg">
              {player.team_drafted ?? '—'} · Round {player.rd_drafted ?? '—'}, Pick {player.pick_drafted ?? '—'}
            </p>
          </div>
        )}

        {measurables.length > 0 && (
          <div className="bg-dm-panel rounded-xl p-5">
            <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold mb-3">
              Measurables
            </p>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              {measurables.map(m => (
                <Fragment key={m.label}>
                  <dt className="text-dm-text-secondary">{m.label}</dt>
                  <dd className="text-dm-text">{m.value}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        )}

        {(player.s1 || player.s2 || player.s3) && (
          <div className="bg-dm-panel rounded-xl p-5">
            <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold mb-3">
              Strengths
            </p>
            <ul className="space-y-1 text-sm text-dm-text">
              {[player.s1, player.s2, player.s3].filter(Boolean).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {player.notes && (
          <div className="bg-dm-panel rounded-xl p-5">
            <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold mb-3">
              Notes
            </p>
            <p className="text-dm-text text-sm leading-relaxed">{player.notes}</p>
          </div>
        )}

        <Link
          href={`/draft/${player.draft_year}?pos=${player.pos}`}
          className="inline-block text-dm-text-secondary hover:text-dm-text text-sm transition-colors"
        >
          View on DraftMap →
        </Link>
      </div>
    </main>
  );
}
