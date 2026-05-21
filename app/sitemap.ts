import type { MetadataRoute } from 'next';
import { fetchPlayers, VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR } from '@/lib/sheets';
import { buildSlugMap } from '@/lib/slugs';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentPlayers = await fetchPlayers(CURRENT_DRAFT_YEAR);
  const slugMap = buildSlugMap(currentPlayers);

  const playerEntries: MetadataRoute.Sitemap = currentPlayers
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
