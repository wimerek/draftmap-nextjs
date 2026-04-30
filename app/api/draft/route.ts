/**
 * app/api/draft/route.ts
 *
 * Draft data endpoint — returns players filtered and shaped for the Draft Chart.
 * Internally calls the same Airtable data as /api/players, but this endpoint
 * can add chart-specific transformations (sorting, filtering, derived fields)
 * without coupling that logic to the generic players endpoint.
 *
 * GET /api/draft            → draft data for current year
 * GET /api/draft?year=X     → draft data for a specific year
 * GET /api/draft?live=1     → 60-second cache for Live Draft mode
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchPlayers } from "@/lib/airtable";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get("year") ?? "2026", 10);
    const isLive = searchParams.get("live") === "1";

    const players = await fetchPlayers(year);

    // Sort: by round, then by rank within round (rank=0 treated as 9999)
    const sorted = [...players].sort((a, b) => {
      const rdA = a.rd ?? 99;
      const rdB = b.rd ?? 99;
      if (rdA !== rdB) return rdA - rdB;

      const rkA = !a.rank || a.rank === 0 ? 9999 : a.rank;
      const rkB = !b.rank || b.rank === 0 ? 9999 : b.rank;
      return rkA - rkB;
    });

    const response = NextResponse.json({
      year,
      count: sorted.length,
      players: sorted,
    });

    if (isLive) {
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=30"
      );
    } else {
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=60"
      );
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/draft] Error:", message);

    return NextResponse.json(
      { error: "Failed to fetch draft data.", detail: message },
      { status: 500 }
    );
  }
}
