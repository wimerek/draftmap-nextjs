"use client";

/**
 * components/PlayerCard.tsx
 *
 * Modal card for individual player details.
 * Scaffold — typed shell. Full implementation in Stage 1 (ported from
 * the existing player card design in draftmap_player_card_FINAL.html).
 *
 * Props:
 *   player  — the Player to display (null = card is closed)
 *   onClose — called when the user dismisses the card
 */

import type { Player } from "@/lib/airtable";
import { fmtHeight, fmtNum, getTier } from "@/lib/utils";

interface PlayerCardProps {
  player: Player | null;
  onClose: () => void;
}

export default function PlayerCard({ player, onClose }: PlayerCardProps) {
  if (!player) return null;

  const tier = getTier(player.rd, player.rank);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-dm-panel rounded-2xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: tier.color }}
            >
              {player.pos} · {tier.label}
            </p>
            <h2 className="text-xl font-condensed font-bold text-dm-text mt-0.5">
              {player.name}
            </h2>
            <p className="text-sm text-dm-text-secondary">{player.school ?? "—"}</p>
          </div>
          <button
            onClick={onClose}
            className="text-dm-text-secondary hover:text-dm-text text-lg leading-none mt-0.5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Projection */}
        <div className="flex gap-4 text-sm">
          <div>
            <p className="text-dm-text-secondary text-xs">Round</p>
            <p className="text-dm-text font-semibold">{player.rd ?? "—"}</p>
          </div>
          <div>
            <p className="text-dm-text-secondary text-xs">Rank</p>
            <p className="text-dm-text font-semibold">#{player.rank ?? "—"}</p>
          </div>
          {player.drafted && (
            <div>
              <p className="text-dm-text-secondary text-xs">Drafted</p>
              <p className="text-dm-text font-semibold">
                {player.team_drafted} R{player.rd_drafted} #{player.pick_drafted}
              </p>
            </div>
          )}
        </div>

        {/* Measurables — scaffold grid */}
        <div className="grid grid-cols-3 gap-y-2 text-xs border-t border-white/10 pt-4">
          {[
            ["Height",  fmtHeight(player.height)],
            ["Weight",  player.weight ? `${player.weight}` : "—"],
            ["40 Yard", player.forty ? `${player.forty}` : "—"],
            ["Vertical", player.vertical ? `${player.vertical}"` : "—"],
            ["Broad",   player.broad ? `${player.broad}"` : "—"],
            ["3-Cone",  player.cone3 ? `${player.cone3}` : "—"],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-dm-text-secondary">{label}</p>
              <p className="text-dm-text font-medium">{val}</p>
            </div>
          ))}
        </div>

        {/* Strengths */}
        {(player.s1 || player.s2 || player.s3) && (
          <div className="border-t border-white/10 pt-4 space-y-1">
            <p className="text-dm-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
              Strengths
            </p>
            {[player.s1, player.s2, player.s3]
              .filter(Boolean)
              .map((s, i) => (
                <p key={i} className="text-dm-text text-sm">{s}</p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
