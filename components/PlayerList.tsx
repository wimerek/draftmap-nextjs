"use client";

/**
 * components/PlayerList.tsx
 *
 * Sortable / filterable player table.
 * Scaffold — typed shell. Full implementation in Stage 1.
 *
 * Mirrors the Streamlit list view (pages/2_Position_Breakdown.py) but as
 * a proper React component with client-side filtering.
 */

import { useEffect, useState } from "react";
import type { Player } from "@/lib/airtable";
import { fmtHeight, ALL_POSITIONS } from "@/lib/utils";

interface PlayerListProps {
  year?: number;
}

type SortKey = "rank" | "rd" | "name" | "pos";

export default function PlayerList({ year = 2026 }: PlayerListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [posFilter, setPosFilter] = useState<string>("ALL");
  const [rdFilter, setRdFilter] = useState<number | null>(null);
  const [nameSearch, setNameSearch] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetch(`/api/players?year=${year}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Player[]) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [year]);

  // Apply filters + sort
  const visible = players
    .filter((p) => posFilter === "ALL" || p.pos === posFilter)
    .filter((p) => rdFilter === null || p.rd === rdFilter)
    .filter((p) =>
      nameSearch === "" ||
      p.name.toLowerCase().includes(nameSearch.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "rank") {
        cmp = (a.rank ?? 9999) - (b.rank ?? 9999);
      } else if (sortKey === "rd") {
        cmp = (a.rd ?? 99) - (b.rd ?? 99);
      } else if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "pos") {
        cmp = a.pos.localeCompare(b.pos);
      }
      return sortAsc ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  if (loading) {
    return <p className="text-dm-text-secondary text-sm">Loading players…</p>;
  }
  if (error) {
    return <p className="text-red-400 text-sm">Error: {error}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Name search */}
        <input
          type="text"
          placeholder="Search player…"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          className="bg-dm-panel text-dm-text text-sm px-3 py-1.5 rounded-lg border border-white/10 placeholder:text-dm-text-secondary focus:outline-none focus:border-dm-accent"
        />

        {/* Position filter */}
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="bg-dm-panel text-dm-text text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-dm-accent"
        >
          <option value="ALL">All Positions</option>
          {ALL_POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Round filter */}
        <select
          value={rdFilter ?? ""}
          onChange={(e) =>
            setRdFilter(e.target.value === "" ? null : parseInt(e.target.value, 10))
          }
          className="bg-dm-panel text-dm-text text-sm px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-dm-accent"
        >
          <option value="">All Rounds</option>
          {[1, 2, 3, 4, 5, 6, 7].map((r) => (
            <option key={r} value={r}>Round {r}</option>
          ))}
        </select>

        <span className="text-dm-text-secondary text-sm ml-auto">
          {visible.length} players
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="bg-dm-panel text-dm-text-secondary uppercase text-xs tracking-wider">
            <tr>
              {(
                [
                  ["rank",  "#"],
                  ["name",  "Player"],
                  ["pos",   "Pos"],
                  ["rd",    "Rd"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="px-4 py-3 cursor-pointer hover:text-dm-text select-none"
                >
                  {label} {sortKey === key ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              ))}
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Ht</th>
              <th className="px-4 py-3">Wt</th>
              <th className="px-4 py-3">40</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visible.map((p) => (
              <tr key={p.id} className="hover:bg-dm-panel/50 transition-colors">
                <td className="px-4 py-2 text-dm-text-secondary">{p.rank ?? "—"}</td>
                <td className="px-4 py-2 text-dm-text font-medium">{p.name}</td>
                <td className="px-4 py-2 text-dm-text-secondary">{p.pos}</td>
                <td className="px-4 py-2 text-dm-text-secondary">{p.rd ?? "—"}</td>
                <td className="px-4 py-2 text-dm-text-secondary">{p.school ?? "—"}</td>
                <td className="px-4 py-2 text-dm-text-secondary">{fmtHeight(p.height)}</td>
                <td className="px-4 py-2 text-dm-text-secondary">{p.weight ?? "—"}</td>
                <td className="px-4 py-2 text-dm-text-secondary">{p.forty ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
