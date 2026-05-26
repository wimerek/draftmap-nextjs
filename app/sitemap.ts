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

  // Sitemap lists ONLY canonical destinations — never URLs that 3xx redirect.
  // / and /draft are excluded because they redirect to /draft/[year]; listing
  // them caused Google to flag them as "Redirect error" pages.
  return [
    ...VALID_DRAFT_YEARS.map(year => ({
      url: `https://draftmap.app/draft/${year}`,
      priority: year === CURRENT_DRAFT_YEAR ? 1.0 : 0.8,
    })),
    { url: 'https://draftmap.app/players', priority: 0.7 },
    ...playerEntries,
  ];
}
