import PlayerList from "@/components/PlayerList";
import { VALID_DRAFT_YEARS, CURRENT_DRAFT_YEAR } from "@/lib/sheets";
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

export default function PlayersPage({ searchParams }: Props) {
  const year = resolveYear(searchParams.year);
  return (
    <main style={{ minHeight: "100vh", background: "#F5EFE4", padding: "24px 20px" }}>
      <PlayerList year={year} />
    </main>
  );
}
