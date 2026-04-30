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
    <main className="min-h-screen bg-dm-bg px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-condensed font-bold text-dm-text mb-6">
          2026 Draft Prospects
        </h1>
        {/*
          PlayerList fetches from /api/players client-side.
          Scaffold only — filtering/sorting logic in Stage 1 build.
        */}
        <PlayerList year={2026} />
      </div>
    </main>
  );
}
