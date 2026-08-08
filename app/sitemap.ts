import type { MetadataRoute } from 'next';
import { fetchSearchIndex, VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR } from '@/lib/sheets';
import { getPlayerSlugIndex } from '@/lib/playerSlugIndex';
import { SUPPORTED_TWIN_YEARS, POSITION_SLUGS, APEX } from '@/lib/twinConfig';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Build from the lean, cached search index (a single shared CSV parse) rather
  // than fetchPlayers() — the sitemap only needs current-year player_id + slug,
  // and a crawler hit shouldn't re-parse the whole players CSV.
  // Slugs come from the all-years canonical map — the same map /players/[slug]
  // resolves against. A current-year-only map emits base slugs for names that
  // collide across classes, which the route then 404s.
  const { byPid } = await getPlayerSlugIndex();
  const currentPlayers = (await fetchSearchIndex()).filter(
    (p) => p.draft_year === CURRENT_DRAFT_YEAR,
  );

  const playerEntries: MetadataRoute.Sitemap = currentPlayers
    .map(p => {
      const slug = byPid.get(p.player_id);
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
  // Crawlable-twin position pages — only years in the allowlist (Piece 6).
  const twinEntries: MetadataRoute.Sitemap = SUPPORTED_TWIN_YEARS.flatMap(year =>
    POSITION_SLUGS.map(slug => ({
      url: `${APEX}/draft/${year}/${slug}`,
      priority: 0.8,
    })),
  );

  return [
    ...VALID_DRAFT_YEARS.map(year => ({
      url: `https://draftmap.app/draft/${year}`,
      priority: year === CURRENT_DRAFT_YEAR ? 1.0 : 0.8,
    })),
    ...twinEntries,
    { url: 'https://draftmap.app/players', priority: 0.7 },
    ...playerEntries,
  ];
}
