import PlayerList from "@/components/PlayerList";
import { VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR, fetchSearchIndex } from "@/lib/sheets";
import { getPlayerSlugIndex } from "@/lib/playerSlugIndex";
import type { Metadata } from "next";

interface Props {
  searchParams: { year?: string };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const year = resolveYear(searchParams.year);
  return {
    title: `${year} NFL Draft Prospects`,
    description: `Search and filter every ${year} NFL Draft prospect by measurables, scouting grades, and projected round.`,
    openGraph: {
      title: `${year} NFL Draft Prospects | DraftMap`,
      description: `Every ${year} NFL Draft prospect with measurables, scouting grades, and projected round.`,
    },
  };
}

function resolveYear(raw: string | undefined): number {
  const y = parseInt(raw ?? String(CURRENT_DRAFT_YEAR), 10);
  const valid: readonly number[] = VALID_DRAFT_YEARS;
  return valid.includes(y) ? y : CURRENT_DRAFT_YEAR;
}

export default async function PlayersPage({ searchParams }: Props) {
  const year = resolveYear(searchParams.year);

  // Canonical all-years slugs for this year's rows only — a raw base slug 404s
  // for any name that collides across classes.
  const { byPid } = await getPlayerSlugIndex();
  const index = await fetchSearchIndex();
  const slugByPid: Record<string, string> = {};
  for (const e of index) {
    if (e.draft_year !== year) continue;
    const s = byPid.get(e.player_id);
    if (s) slugByPid[e.player_id] = s;
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F5EFE4", padding: "24px 20px" }}>
      <PlayerList year={year} slugByPid={slugByPid} />
    </main>
  );
}
