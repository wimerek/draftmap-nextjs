"use client";
/**
 * components/PlayerSearch.tsx
 *
 * Year-agnostic player search (Epsilon 4 brief f, item 3). Collapsed 🔍 in the header
 * band; expands to an input with a disambiguation dropdown. Picking a result teleports
 * (the parent owns selectedYear/step/card + the glow-ring) — this component is just the
 * matcher UI.
 *
 * Index is lazy: the all-classes list loads on FIRST focus/expand (never on page load),
 * cached for the session. Matching is NAME-ONLY, lean-forgiving (see lib/playerSearch).
 *
 * ⚠ SEARCH HIGHLIGHTS, NEVER SCOPES — selecting a result calls onSelect; it never
 * touches teamFilter/litIds/the scoreboard. The glow-ring is the parent's separate state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SearchIndexEntry } from "@/lib/sheets";
import { buildIndex, searchPlayers, highlightSegments, type SearchIndex } from "@/lib/playerSearch";
import { resolveTeamName } from "@/lib/chartConstants";
import { teamCodeFromFullName } from "@/lib/scoreboardStats";

/** Flat stroked magnifying glass — brand chrome (parchment at rest, gold on hover via
 *  currentColor), replaces the 3D 🔍 emoji so search matches the Act 1–3 icon/font feel. */
function SearchIcon() {
  return (
    <svg className="dm-search-glass" viewBox="0 0 16 16" width="15" height="15" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.6" y1="10.6" x2="14" y2="14" />
    </svg>
  );
}

export default function PlayerSearch({ onSelect }: { onSelect: (entry: SearchIndexEntry) => void }) {
  const [expanded, setExpanded]         = useState(false);
  const [query, setQuery]               = useState("");
  const [index, setIndex]               = useState<SearchIndex | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [activeIdx, setActiveIdx]       = useState(0);
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy, once-per-session index load (first focus/expand — not on page load).
  const loadIndex = useCallback(() => {
    if (index || loadingIndex) return;
    setLoadingIndex(true);
    fetch("/api/search-index")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: SearchIndexEntry[]) => setIndex(buildIndex(data)))
      .catch(() => { /* non-fatal — the bar just returns no matches */ })
      .finally(() => setLoadingIndex(false));
  }, [index, loadingIndex]);

  const results = useMemo(
    () => (index && query.trim().length >= 2 ? searchPlayers(index, query, 8) : []),
    [index, query],
  );

  const collapse = () => { setExpanded(false); setQuery(""); };
  const choose = (entry: SearchIndexEntry) => { onSelect(entry); collapse(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown")      { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter")     { if (results[activeIdx]) { e.preventDefault(); choose(results[activeIdx]); } }
    else if (e.key === "Escape")    { e.preventDefault(); if (query) setQuery(""); else collapse(); }
  };

  useEffect(() => { setActiveIdx(0); }, [query]);
  useEffect(() => { if (expanded) inputRef.current?.focus(); }, [expanded]);
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) collapse();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [expanded]);

  const showDropdown   = expanded && query.trim().length >= 2;
  const showNoResults  = showDropdown && index != null && results.length === 0;

  return (
    <div className="dm-search" ref={rootRef}>
      {!expanded ? (
        <button
          type="button"
          className="dm-search-toggle"
          aria-label="Search players"
          onClick={() => { setExpanded(true); loadIndex(); }}
        ><SearchIcon /></button>
      ) : (
        <div className="dm-search-open">
          <span className="dm-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            ref={inputRef}
            className="dm-search-input"
            type="text"
            placeholder="Search any player…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={loadIndex}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="dm-search-listbox"
            aria-autocomplete="list"
          />
          {showDropdown && (
            <div className="dm-search-menu" id="dm-search-listbox" role="listbox">
              {results.map((entry, i) => {
                const where = entry.team_drafted
                  ? teamCodeFromFullName(resolveTeamName(entry.team_drafted))
                  : (entry.school ?? "UDFA");
                return (
                  <button
                    key={entry.player_id}
                    type="button"
                    role="option"
                    aria-selected={i === activeIdx}
                    className={`dm-search-row${i === activeIdx ? " dm-search-row--active" : ""}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => choose(entry)}
                  >
                    <span className="dm-search-name">
                      {highlightSegments(entry.name, query).map((seg, j) =>
                        seg.bold
                          ? <strong key={j}>{seg.text}</strong>
                          : <span key={j}>{seg.text}</span>,
                      )}
                    </span>
                    <span className="dm-search-meta">
                      {entry.pos} · &apos;{String(entry.draft_year).slice(2)} · {where}
                    </span>
                  </button>
                );
              })}
              {showNoResults && <div className="dm-search-empty">No players found</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
