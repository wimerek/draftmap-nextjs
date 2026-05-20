import type { MetadataRoute } from 'next';
import { fetchPlayers, VALID_DRAFT_YEARS, type Player } from '@/lib/sheets';
import { buildSlugMap } from '@/lib/slugs';

async function fetchAllPlayers(): Promise<Player[]> {
  const results = await Promise.all(VALID_DRAFT_YEARS.map(y => fetchPlayers(y)));
  return results.flat();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPlayers = await fetchAllPlayers();
  const slugMap = buildSlugMap(allPlayers);

  const playerEntries: MetadataRoute.Sitemap = allPlayers
    .map(p => {
      const slug = slugMap.get(p.player_id);
      if (!slug) return null;
      return {
        url: `https://draftmap.app/players/${slug}`,
        priority: 0.6,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return [
    { url: 'https://draftmap.app/',       priority: 1.0 },
    { url: 'https://draftmap.app/draft',  priority: 0.9 },
    ...VALID_DRAFT_YEARS.map(year => ({
      url: `https://draftmap.app/draft/${year}`,
      priority: 0.8,
    })),
    { url: 'https://draftmap.app/players', priority: 0.7 },
    ...playerEntries,
  ];
}
