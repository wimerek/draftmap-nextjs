import { fetchSearchIndex } from './sheets';
import { buildSlugMap } from './slugs';

export interface SlugHit {
  player_id: string;
  draft_year: number;
  slug: string;
}

/** The snapshot carries 4,795 rows across 11 classes. Anything under this is a broken read. */
const INDEX_SANITY_FLOOR = 3000;

let memo: { bySlug: Map<string, SlugHit>; byPid: Map<string, string> } | null = null;

async function build() {
  const entries = await fetchSearchIndex();
  if (!Array.isArray(entries) || entries.length < INDEX_SANITY_FLOOR) {
    throw new Error(
      `[playerSlugIndex] search index short: ${entries?.length ?? 'null'} < ${INDEX_SANITY_FLOOR}`,
    );
  }
  const slugMap = buildSlugMap(entries);
  const byEntryId = new Map(entries.map(e => [e.player_id, e]));
  const bySlug = new Map<string, SlugHit>();
  const byPid = new Map<string, string>();

  slugMap.forEach((slug, pid) => {
    const e = byEntryId.get(pid);
    if (!e) return;
    byPid.set(pid, slug);
    // FIRST WINS. buildSlugMap can emit one slug for two players when name + pos +
    // first-3-school-chars all match; today `michael-jurgens-iol-unk` is such a pair
    // (2023 and 2024 Michael Jurgens, IOL, both with a BLANK school). The route's
    // current linear scan returns the FIRST match, so first-wins keeps the live page
    // pointing at the same player it points at today. Do not change to last-wins.
    if (!bySlug.has(slug)) bySlug.set(slug, { player_id: pid, draft_year: e.draft_year, slug });
  });

  return { bySlug, byPid };
}

/** Memoised per lambda instance. NOT unstable_cache — a bad read must never persist. */
export async function getPlayerSlugIndex() {
  if (!memo) memo = await build();
  return memo;
}
