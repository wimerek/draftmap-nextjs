"use client";

/**
 * components/PlayerList.tsx  — Session K rebuild
 *
 * Full 21-column prospect table with:
 *   - Back-to-map navigation
 *   - Position-specific gold shading (good / great tiers) on all measurable cells
 *   - Star (★) marker on key metrics per position
 *   - Sticky player-name column
 *   - Sortable headers
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Player } from "@/lib/sheets";
import { VALID_DRAFT_YEARS } from "@/lib/draftYears";
import { fmtHeight, ALL_POSITIONS } from "@/lib/utils";
import { generateBaseSlug } from "@/lib/slugs";
import { cardPositionalRangeData } from "@/lib/chartConstants";

interface PlayerListProps {
  year?: number;
}

type SortKey =
  | "rank" | "name" | "pos" | "rd"
  | "height" | "weight" | "hand" | "arm"
  | "forty" | "split10" | "vertical" | "broad" | "cone3" | "shuttle" | "bench"
  | "rd_drafted" | "pick_drafted" | "team_drafted";

// ── Measurable column definitions ─────────────────────────────────────────────

interface MeasCol {
  key: keyof Player;
  label: string;
  abbr: string;
  better: "higher" | "lower";
}

const MEAS_COLS: MeasCol[] = [
  { key: "hand",     label: "Hand",    abbr: "Hand",   better: "higher" },
  { key: "arm",      label: "Arm",     abbr: "Arm",    better: "higher" },
  { key: "forty",    label: "40 YD",   abbr: "40",     better: "lower"  },
  { key: "split10",  label: "10 Split",abbr: "10-Yd",  better: "lower"  },
  { key: "vertical", label: "Vert",    abbr: "Vert",   better: "higher" },
  { key: "broad",    label: "Broad",   abbr: "Broad",  better: "higher" },
  { key: "cone3",    label: "3-Cone",  abbr: "3C",     better: "lower"  },
  { key: "shuttle",  label: "Shuttle", abbr: "Sht",    better: "lower"  },
  { key: "bench",    label: "Bench",   abbr: "Bench",  better: "higher" },
];

// ── Tier classification ───────────────────────────────────────────────────────

type Tier = "great" | "good" | "below" | "na";

function getMeasTier(
  pos: string,
  metric: string,
  value: number | null,
  better: "higher" | "lower",
): { tier: Tier; isKey: boolean } {
  const posRanges = cardPositionalRangeData[pos as keyof typeof cardPositionalRangeData];
  if (!posRanges) return { tier: "na", isKey: false };
  const range = posRanges[metric];
  if (!range || value == null) return { tier: "na", isKey: range?.isKey ?? false };

  const { good, great, isKey } = range;
  let tier: Tier;
  if (better === "higher") {
    tier = value >= great ? "great" : value >= good ? "good" : "below";
  } else {
    tier = value <= great ? "great" : value <= good ? "good" : "below";
  }
  return { tier, isKey };
}

// ── Cell background for tier ──────────────────────────────────────────────────

function tierBg(tier: Tier): string {
  if (tier === "great") return "rgba(212,160,23,0.32)";
  if (tier === "good")  return "rgba(212,160,23,0.13)";
  return "transparent";
}

function tierColor(tier: Tier): string {
  if (tier === "great") return "#7A5000";
  if (tier === "good")  return "#8A6010";
  return "inherit";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayerList({ year = 2026 }: PlayerListProps) {
  const [players,    setPlayers]    = useState<Player[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [posFilter,  setPosFilter]  = useState<string>("ALL");
  const [rdFilter,   setRdFilter]   = useState<number | null>(null);
  const [nameSearch, setNameSearch] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const router = useRouter();
  const handleYearChange = useCallback((y: number) => {
    if (y !== year) router.push(`/players?year=${y}`);
  }, [year, router]);

  useEffect(() => {
    fetch(`/api/players?year=${year}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: Player[]) => { setPlayers(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [year]);

  const visible = players
    .filter(p => posFilter === "ALL" || p.pos === posFilter)
    .filter(p => rdFilter === null || p.rd === rdFilter)
    .filter(p => nameSearch === "" || p.name.toLowerCase().includes(nameSearch.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      const sk = sortKey as string;
      if (sk === "rank")        cmp = (a.rank       ?? 9999) - (b.rank       ?? 9999);
      else if (sk === "rd")     cmp = (a.rd         ?? 99)   - (b.rd         ?? 99);
      else if (sk === "name")   cmp = a.name.localeCompare(b.name);
      else if (sk === "pos")    cmp = a.pos.localeCompare(b.pos);
      else if (sk === "height")       cmp = (parseInt(a.height ?? "0") || 0) - (parseInt(b.height ?? "0") || 0);
      else if (sk === "rd_drafted")   cmp = (a.rd_drafted   ?? 99) - (b.rd_drafted   ?? 99);
      else if (sk === "pick_drafted") cmp = (a.pick_drafted ?? 9999) - (b.pick_drafted ?? 9999);
      else if (sk === "team_drafted") cmp = (a.team_drafted ?? "").localeCompare(b.team_drafted ?? "");
      else {
        // numeric measurable
        const av = a[sortKey as keyof Player] as number | null;
        const bv = b[sortKey as keyof Player] as number | null;
        cmp = (av ?? -Infinity) - (bv ?? -Infinity);
      }
      return sortAsc ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return <span style={{ marginLeft: 3, opacity: 0.7 }}>{sortAsc ? "↑" : "↓"}</span>;
  }

  const thBase: React.CSSProperties = {
    padding: "8px 10px",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#7a8a9a",
    background: "#F0EAE0",
    borderBottom: "1px solid #D4C8B8",
    borderRight: "1px solid #DDD5C8",
    position: "sticky" as const,
    top: 0,
    zIndex: 2,
  };
  const thHover = { color: "#2a3a4a" };

  const tdBase: React.CSSProperties = {
    padding: "6px 10px",
    whiteSpace: "nowrap",
    fontSize: 12,
    borderBottom: "1px solid #E8E0D4",
    borderRight: "1px solid #EDE8E0",
    color: "#3a3028",
  };

  if (loading) return <p style={{ color: "#7a8a9a", fontSize: 14 }}>Loading players…</p>;
  if (error)   return <p style={{ color: "#c0392b", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Back to map nav ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href={`/draft/${year}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "#D4A017", fontWeight: 700, fontSize: 13,
            textDecoration: "none", padding: "6px 12px",
            border: "1px solid rgba(212,160,23,0.4)",
            borderRadius: 8,
          }}
        >
          ← Map View
        </Link>
        <span style={{ color: "#9a8a7a", fontSize: 13 }}>
          {visible.length} prospects
        </span>
      </div>

      {/* ── Year selector ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#9a8a7a", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Draft Year</span>
        {[...VALID_DRAFT_YEARS].reverse().map(y => (
          <button
            key={y}
            onClick={() => handleYearChange(y)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: `1px solid ${year === y ? "#D4A017" : "rgba(180,160,120,0.4)"}`,
              background: year === y ? "rgba(212,160,23,0.12)" : "transparent",
              color: year === y ? "#7A5000" : "#9a8a7a",
              fontWeight: year === y ? 700 : 500,
              fontSize: 13,
              cursor: year === y ? "default" : "pointer",
            }}
          >
            {y}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search player…"
          value={nameSearch}
          onChange={e => setNameSearch(e.target.value)}
          style={{
            background: "#F8F3EA", color: "#2a2018", fontSize: 13,
            padding: "6px 12px", borderRadius: 8,
            border: "1px solid #D4C8B8", outline: "none",
          }}
        />
        <select
          value={posFilter}
          onChange={e => setPosFilter(e.target.value)}
          style={{
            background: "#F8F3EA", color: "#2a2018", fontSize: 13,
            padding: "6px 10px", borderRadius: 8,
            border: "1px solid #D4C8B8", outline: "none",
          }}
        >
          <option value="ALL">All Positions</option>
          {ALL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={rdFilter ?? ""}
          onChange={e => setRdFilter(e.target.value === "" ? null : parseInt(e.target.value, 10))}
          style={{
            background: "#F8F3EA", color: "#2a2018", fontSize: 13,
            padding: "6px 10px", borderRadius: 8,
            border: "1px solid #D4C8B8", outline: "none",
          }}
        >
          <option value="">All Rounds</option>
          {[1,2,3,4,5,6,7].map(r => <option key={r} value={r}>Round {r}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #D4C8B8" }}>
        <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              {/* Sticky player name column */}
              <th
                onClick={() => toggleSort("rank")}
                style={{ ...thBase, position: "sticky", left: 0, zIndex: 3, minWidth: 32 }}
              >
                # <SortArrow col="rank" />
              </th>
              <th
                onClick={() => toggleSort("name")}
                style={{ ...thBase, position: "sticky", left: 46, zIndex: 3, minWidth: 160, background: "#EDE8DD" }}
              >
                Player <SortArrow col="name" />
              </th>
              <th onClick={() => toggleSort("pos")}   style={thBase}>Pos <SortArrow col="pos" /></th>
              <th onClick={() => toggleSort("rd")}    style={thBase}>Proj Rd <SortArrow col="rd" /></th>
              <th style={{ ...thBase, cursor: "default" }}>School</th>
              <th onClick={() => toggleSort("height")} style={thBase}>Ht <SortArrow col="height" /></th>
              <th onClick={() => toggleSort("weight")} style={thBase}>Wt <SortArrow col="weight" /></th>
              {MEAS_COLS.map(m => (
                <th key={m.key as string} onClick={() => toggleSort(m.key as SortKey)} style={thBase}>
                  {m.abbr} <SortArrow col={m.key as SortKey} />
                </th>
              ))}
              <th onClick={() => toggleSort("rd_drafted")}   style={thBase}>Rd <SortArrow col="rd_drafted" /></th>
              <th onClick={() => toggleSort("pick_drafted")} style={thBase}>Pick <SortArrow col="pick_drafted" /></th>
              <th onClick={() => toggleSort("team_drafted")} style={thBase}>Team <SortArrow col="team_drafted" /></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, rowIdx) => {
              const rowBg = rowIdx % 2 === 0 ? "#FDFAF5" : "#F5EFE4";
              return (
                <tr key={p.player_id} style={{ background: rowBg }}>
                  {/* # */}
                  <td style={{ ...tdBase, position: "sticky", left: 0, background: rowBg, color: "#9a8a7a", zIndex: 1 }}>
                    {p.rank ?? "—"}
                  </td>
                  {/* Player name — sticky */}
                  <td style={{ ...tdBase, position: "sticky", left: 46, background: rowBg, fontWeight: 700, zIndex: 1 }}>
                    <Link href={`/players/${generateBaseSlug(p.name)}`} style={{ color: "inherit", textDecoration: "none" }}>
                      {p.name}
                    </Link>
                  </td>
                  {/* Pos */}
                  <td style={{ ...tdBase, color: "#6a5a4a", fontWeight: 600 }}>{p.pos}</td>
                  {/* Proj Round */}
                  <td style={{ ...tdBase, color: "#6a5a4a" }}>{p.rd ?? "—"}</td>
                  {/* School */}
                  <td style={{ ...tdBase, color: "#6a5a4a" }}>{p.school ?? "—"}</td>
                  {/* Height */}
                  <td style={{ ...tdBase }}>{fmtHeight(p.height)}</td>
                  {/* Weight */}
                  <td style={{ ...tdBase }}>{p.weight ?? "—"}</td>
                  {/* Measurable columns with gold shading + star */}
                  {MEAS_COLS.map(m => {
                    const val = p[m.key] as number | null;
                    const { tier, isKey } = getMeasTier(p.pos, m.key as string, val, m.better);
                    const bg    = tierBg(tier);
                    const color = tierColor(tier);
                    const displayVal = val != null ? String(val) : "—";
                    return (
                      <td
                        key={m.key as string}
                        style={{ ...tdBase, background: bg, color, fontWeight: tier !== "below" && tier !== "na" ? 700 : 400 }}
                      >
                        {displayVal}
                        {isKey && val != null && (
                          <span
                            className="pcm-key-marker"
                            style={{ marginLeft: 4, verticalAlign: "middle", flexShrink: 0 }}
                            aria-label="Key metric for this position"
                          />
                        )}
                      </td>
                    );
                  })}
                  {/* Draft results */}
                  <td style={{ ...tdBase, color: "#6a5a4a" }}>{p.rd_drafted ?? "—"}</td>
                  <td style={{ ...tdBase, color: "#6a5a4a" }}>{p.pick_drafted ?? "—"}</td>
                  <td style={{ ...tdBase, color: "#6a5a4a", fontSize: 11 }}>{p.team_drafted ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
