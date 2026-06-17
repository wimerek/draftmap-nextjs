/**
 * app/api/search-index/route.ts
 *
 * Year-agnostic player search index (Epsilon 4 brief f, item 3). Returns the lean
 * all-classes player list the client search bar matches against. The whole `players`
 * tab is fetched ONCE behind unstable_cache (no per-year loop); this route adds the
 * HTTP ISR layer. The client loads it lazily on first search focus, once per session.
 *
 * GET /api/search-index → SearchIndexEntry[] (player_id · name · pos · draft_year ·
 *                         school · pick_drafted · rank · team_drafted · drafted)
 */

import { NextResponse } from "next/server";
import { fetchSearchIndex } from "@/lib/sheets";

// Names + picks are stable minute-to-minute; the teleport loads the full fresh class
// on arrival regardless, so a 5-minute window is plenty.
export const revalidate = 300;

export async function GET() {
  try {
    const index = await fetchSearchIndex();
    const response = NextResponse.json(index);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=60",
    );
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/search-index] Error:", message);
    return NextResponse.json(
      { error: "Failed to build the search index.", detail: message },
      { status: 500 },
    );
  }
}
