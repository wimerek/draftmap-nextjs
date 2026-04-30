/**
 * app/api/players/route.ts
 *
 * Server-side proxy for Airtable player data.
 * The AIRTABLE_API_TOKEN never reaches the client bundle — it only runs here.
 *
 * GET /api/players          → all players for the current year (2026)
 * GET /api/players?year=X   → players for a specific year (future: multi-year)
 *
 * Caching: ISR via `revalidate = 300` (5 minutes).
 * For Live Draft mode, the client should append `?live=1` and this route
 * will respond with revalidate = 60. (Future enhancement — wired for it now.)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchPlayers } from "@/lib/airtable";

// Default revalidation for ISR — 5 minutes
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get("year") ?? "2026", 10);
    const isLive = searchParams.get("live") === "1";

    // Fetch all players from Airtable (paginated, server-side)
    const players = await fetchPlayers(year);

    const response = NextResponse.json(players);

    // Live Draft mode: shorter cache so Airtable edits appear within ~60 seconds
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
    console.error("[/api/players] Error:", message);

    return NextResponse.json(
      { error: "Failed to fetch player data.", detail: message },
      { status: 500 }
    );
  }
}
