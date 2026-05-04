import type { Metadata } from "next";
import PlayerList from "@/components/PlayerList";

export const metadata: Metadata = {
  title: "2026 NFL Draft Prospects",
  description:
    "Search and filter every 2026 NFL Draft prospect — measurables, scouting grades, and projected round.",
  openGraph: {
    title: "2026 NFL Draft Prospects | DraftMap",
    description:
      "Every 2026 NFL Draft prospect with measurables, scouting grades, and projected round.",
  },
};

export default function PlayersPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#F5EFE4", padding: "24px 20px" }}>
      <PlayerList year={2026} />
    </main>
  );
}
