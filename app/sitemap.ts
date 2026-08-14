import type { MetadataRoute } from 'next';
import { fetchSearchIndex, VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR } from '@/lib/sheets';
import { getPlayerSlugIndex } from '@/lib/playerSlugIndex';
import { SUPPORTED_TWIN_YEARS, POSITION_SLUGS, APEX } from '@/lib/twinConfig';

/** Player classes declared in the sitemap. Deliberately NOT all 11 — Googlebot was
 *  observed at ~18 requests/day on 2026-08-13, so declaring all 4,795 player pages
 *  would spread a scarce crawl budget across thin pages. 2016 + 2017 are here because
 *  they are the only classes with no other discovery path (nothing linked them before
 *  2026-08-14). They double as the measurement batch: re-read GSC ~2026-09-05 to learn
 *  whether player pages index at all before declaring the remaining ~3,400. */
const SITEMAP_PLAYER_YEARS: readonly number[] = [CURRENT_DRAFT_YEAR, 2017, 2016];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Build from the lean, cached search index (a single shared CSV parse) rather
  // than fetchPlayers() — the sitemap only needs player_id + slug for the declared
  // classes, and a crawler hit shouldn't re-parse the whole players CSV.
  // Slugs come from the all-years canonical map — the same map /players/[slug]
  // resolves against. A narrower map emits base slugs for names that collide
  // across classes, which the route then 404s.
  const { byPid } = await getPlayerSlugIndex();
  const sitemapPlayers = (await fetchSearchIndex()).filter(
    (p) => SITEMAP_PLAYER_YEARS.includes(p.draft_year),
  );

  const playerEntries: MetadataRoute.Sitemap = sitemapPlayers
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

  const entries: MetadataRoute.Sitemap = [
    ...VALID_DRAFT_YEARS.map(year => ({
      url: `https://draftmap.app/draft/${year}`,
      priority: year === CURRENT_DRAFT_YEAR ? 1.0 : 0.8,
    })),
    ...twinEntries,
    { url: 'https://draftmap.app/players', priority: 0.7 },
    { url: 'https://draftmap.app/about', priority: 0.7 },
    ...playerEntries,
  ];

  // Dedupe by URL. buildSlugMap can emit ONE slug for TWO players when name + pos +
  // first-3-school-chars all match — lib/playerSlugIndex.ts documents
  // `michael-jurgens-iol-unk` (2023 + 2024) as exactly such a pair, and byPid maps BOTH
  // player_ids to it. Not triggered by the current SITEMAP_PLAYER_YEARS (verified
  // 2026-08-14: 1,377 rows → 1,377 distinct slugs), but it fires the moment anyone
  // widens the year list. Map keeps the last entry per key; immaterial here since every
  // colliding pair would carry identical url + priority.
  return Array.from(new Map(entries.map(e => [e.url, e])).values());
}
