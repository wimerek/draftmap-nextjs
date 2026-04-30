import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPlayers, findBySlug, toSlug } from "@/lib/airtable";
import { fmtHeight } from "@/lib/utils";

interface Props {
  params: { slug: string };
}

// Generate static pages for all players at build time (SEO surface)
export async function generateStaticParams() {
  const players = await fetchPlayers(2026);
  return players.map((p) => ({ slug: toSlug(p.name) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const players = await fetchPlayers(2026);
  const player = findBySlug(players, params.slug);

  if (!player) return { title: "Player Not Found" };

  const heightStr = fmtHeight(player.height);
  const weightStr = player.weight ? `${player.weight} lbs` : "";
  const desc = [player.pos, player.school, heightStr, weightStr]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${player.name} — 2026 NFL Draft`,
    description: `${player.name} (${desc}) — 2026 NFL Draft prospect scouting profile, measurables, and projection.`,
    openGraph: {
      title: `${player.name} | DraftMap`,
      description: desc,
    },
  };
}

export default async function PlayerPage({ params }: Props) {
  const players = await fetchPlayers(2026);
  const player = findBySlug(players, params.slug);

  if (!player) notFound();

  return (
    <main className="min-h-screen bg-dm-bg px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-dm-text-secondary text-sm uppercase tracking-wider font-semibold">
            {player.pos} · {player.school ?? "—"}
          </p>
          <h1 className="text-4xl font-condensed font-bold text-dm-text">
            {player.name}
          </h1>
        </div>

        {/* Projection */}
        <div className="bg-dm-panel rounded-xl p-5 space-y-2">
          <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold">
            Derek's Projection
          </p>
          <p className="text-dm-text text-lg">
            Round {player.rd ?? "—"} · Overall #{player.rank ?? "—"}
          </p>
        </div>

        {/* Measurables — scaffold placeholder */}
        <div className="bg-dm-panel rounded-xl p-5">
          <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold mb-3">
            Measurables
          </p>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-dm-text-secondary">Height</span>
            <span className="text-dm-text">{fmtHeight(player.height)}</span>
            <span className="text-dm-text-secondary">Weight</span>
            <span className="text-dm-text">{player.weight ? `${player.weight} lbs` : "—"}</span>
            <span className="text-dm-text-secondary">40-Yard Dash</span>
            <span className="text-dm-text">{player.forty ? `${player.forty}s` : "—"}</span>
            <span className="text-dm-text-secondary">Vertical</span>
            <span className="text-dm-text">{player.vertical ? `${player.vertical}"` : "—"}</span>
          </div>
        </div>

        {/* Strengths */}
        {(player.s1 || player.s2 || player.s3) && (
          <div className="bg-dm-panel rounded-xl p-5">
            <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold mb-3">
              Strengths
            </p>
            <ul className="space-y-1 text-sm text-dm-text">
              {[player.s1, player.s2, player.s3]
                .filter(Boolean)
                .map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {player.notes && (
          <div className="bg-dm-panel rounded-xl p-5">
            <p className="text-dm-text-secondary text-xs uppercase tracking-wider font-semibold mb-3">
              Notes
            </p>
            <p className="text-dm-text text-sm leading-relaxed">{player.notes}</p>
          </div>
        )}
      </div>
    </main>
  );
}
