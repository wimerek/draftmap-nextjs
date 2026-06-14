/**
 * app/api/draft/route.ts
 *
 * Draft data endpoint — returns players filtered and shaped for the Draft Chart.
 * Internally calls the same Google Sheets data as /api/players, but this endpoint
 * can add chart-specific transformations (sorting, filtering, derived fields)
 * without coupling that logic to the generic players endpoint.
 *
 * GET /api/draft            → draft data for current year
 * GET /api/draft?year=X     → draft data for a specific year
 * GET /api/draft?live=1     → 60-second cache for Live Draft mode
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchPlayers, fetchOutcomeScores, fetchSecondContracts, resolveVerdicts } from "@/lib/sheets";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get("year") ?? "2026", 10);
    const isLive = searchParams.get("live") === "1";
    const skipScores = searchParams.get("scores") === "0";

    // Verdicts are always fetched (cheap, slug-keyed) — the resolved jellyfish
    // (beat 3) needs verdict_share even on the scores=0 fast path.
    const [players, outcomeScores, verdictMap] = await Promise.all([
      fetchPlayers(year),
      skipScores ? Promise.resolve(new Map()) : fetchOutcomeScores(),
      fetchSecondContracts(),
    ]);

    // Attach outcome scores, step scores, season data, and usage (null when no data)
    const scored = players.map(p => {
      const od = outcomeScores.get(p.player_id);
      return {
        ...p,
        outcomeScore: od?.arcScore   ?? null,
        stepScores:   od?.stepScores ?? null,
        seasonData:   od?.seasonData ?? null,
        usage:        od?.usage      ?? null,
      };
    });

    // Join second-contract verdicts; collect resolved-class join failures.
    const { players: withVerdicts, unmatched } = resolveVerdicts(scored, verdictMap);

    // Sort: by round, then by rank within round (rank=0 treated as 9999)
    const sorted = [...withVerdicts].sort((a, b) => {
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
      // Rider 2 (brief d): resolved-class join failures, surfaced by the scoreboard
      // as the muted "⚠ N unmatched" line. The data layer already computes this; the
      // route previously discarded it.
      unmatched,
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
