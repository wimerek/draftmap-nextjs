/**
 * lib/playerSearch.ts
 *
 * Year-agnostic player search matcher (Epsilon 4 brief f, item 3). LEAN-FORGIVING,
 * NAME-ONLY (sub-decisions 1 + 2):
 *   - tokenized AND: split the query into words; a player matches when EVERY query word
 *     hits SOME name word → last-name-alone works, order-independent, a correct surname
 *     is never killed by a wrong first name;
 *   - per-token fuzzy: Fuse.js (Bitap) scores each token, so a misspelled first name
 *     still surfaces;
 *   - normalization: lowercase, strip diacritics (NFD), drop apostrophes/periods,
 *     collapse spaced initials → "jamarr"/"ja'marr", "tj"/"t.j.", "st brown"/"st. brown"
 *     all match;
 *   - last-name weighted high; ranking = match quality, then draft prominence (earlier
 *     pick / better consensus rank first).
 *
 * pos/class/team are dropdown disambiguation only — never match fields (lenses' job).
 * Phonetic matching is deferred.
 */

import Fuse from "fuse.js";
import type { SearchIndexEntry } from "./sheets";

export interface IndexedEntry {
  entry: SearchIndexEntry;
  tokens: string[];
  lastToken: string;
}

export interface SearchIndex {
  fuse: Fuse<IndexedEntry>;
  byId: Map<string, IndexedEntry>;
}

export interface HighlightSegment {
  text: string;
  bold: boolean;
}

/** lowercase · strip diacritics · drop apostrophes + periods · punctuation→space · collapse ws. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // strip combining diacritic marks
    .replace(/['’.]/g, "")                          // straight + curly apostrophes, periods
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a normalized string into word tokens, merging runs of single letters so spaced
 *  initials collapse ("t j watt" → ["tj","watt"], "ja'marr chase" → ["jamarr","chase"]). */
export function tokensOf(normalized: string): string[] {
  const raw = normalized.split(" ").filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const t of raw) {
    if (t.length === 1) {
      buf += t;
    } else {
      if (buf) { out.push(buf); buf = ""; }
      out.push(t);
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** Build the Fuse index over per-player name TOKENS (so a query token matches any one
 *  name word with per-token fuzziness). `threshold` is the lean recall dial. */
export function buildIndex(entries: SearchIndexEntry[]): SearchIndex {
  const indexed: IndexedEntry[] = entries.map((entry) => {
    const tokens = tokensOf(normalize(entry.name));
    return { entry, tokens, lastToken: tokens[tokens.length - 1] ?? "" };
  });
  const byId = new Map(indexed.map((i) => [i.entry.player_id, i]));
  const fuse = new Fuse(indexed, {
    keys: ["tokens"],
    threshold: 0.4,      // lean — recall dial
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
    distance: 100,
  });
  return { fuse, byId };
}

/**
 * Tokenized AND search. Each query token runs through Fuse; results are intersected by
 * player_id so every token must hit some name word. Ranking = mean match score with a
 * last-name exact/prefix boost (so the surname outranks a fuzzy first-name hit), then
 * draft prominence (pick, else consensus rank) as the tie-break.
 */
export function searchPlayers(
  index: SearchIndex,
  query: string,
  limit = 8,
): SearchIndexEntry[] {
  const qNorm = normalize(query);
  if (qNorm.length < 2) return [];
  const qTokens = tokensOf(qNorm);
  if (qTokens.length === 0) return [];

  let candidates: Map<string, number> | null = null;
  for (const qt of qTokens) {
    if (qt.length < 2) {
      // A lone 1-char token can't match (minMatchCharLength). Ignore it as an AND term
      // unless it's the only token, in which case there's nothing searchable.
      if (qTokens.length === 1) return [];
      continue;
    }
    const res = index.fuse.search(qt);
    const m = new Map<string, number>();
    for (const r of res) {
      const id = r.item.entry.player_id;
      const sc = r.score ?? 1;
      if (!m.has(id) || sc < m.get(id)!) m.set(id, sc);
    }
    if (candidates === null) {
      candidates = m;
    } else {
      const prev = candidates;
      const next = new Map<string, number>();
      m.forEach((sc, id) => {
        if (prev.has(id)) next.set(id, prev.get(id)! + sc);
      });
      candidates = next;
    }
    if (candidates.size === 0) return [];
  }
  if (!candidates || candidates.size === 0) return [];

  const scored = Array.from(candidates).map(([id, scoreSum]) => {
    const ix = index.byId.get(id)!;
    const lnBoost = qTokens.some(
      (qt) => qt.length >= 2 && (ix.lastToken.startsWith(qt) || qt.startsWith(ix.lastToken)),
    ) ? -0.3 : 0;
    const matchScore = scoreSum / qTokens.length + lnBoost;
    const prominence = ix.entry.pick_drafted ?? ix.entry.rank ?? 9999;
    return { entry: ix.entry, matchScore, prominence };
  });
  scored.sort((a, b) => a.matchScore - b.matchScore || a.prominence - b.prominence);
  return scored.slice(0, limit).map((s) => s.entry);
}

// ── Highlight (cosmetic; computed on the DISPLAY name, independent of Fuse indices) ──

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

const fuzzyDist = (w: string) => (w.length >= 5 ? 2 : 1);

/** Bold the matched letters of a display name. Char-accurate prefix where ASCII-safe
 *  (e.g. "Jeff" in "Jefferson"), else whole-word for fuzzy/diacritic tokens. */
export function highlightSegments(name: string, query: string): HighlightSegment[] {
  const qTokens = tokensOf(normalize(query)).filter((t) => t.length >= 2);
  if (qTokens.length === 0) return [{ text: name, bold: false }];

  const parts = name.split(/(\s+)/); // keep whitespace runs as their own parts
  const segs: HighlightSegment[] = [];
  for (const part of parts) {
    if (part === "" || /^\s+$/.test(part)) { segs.push({ text: part, bold: false }); continue; }
    const wn = normalize(part);
    let prefixLen = 0;
    let whole = false;
    for (const qt of qTokens) {
      if (wn === qt) { whole = true; break; }
      if (wn.startsWith(qt)) {
        if (normalize(part.slice(0, qt.length)) === qt) prefixLen = Math.max(prefixLen, qt.length);
        else { whole = true; break; }
      } else if (qt.startsWith(wn) || levenshtein(wn, qt) <= fuzzyDist(wn)) {
        whole = true; break;
      }
    }
    if (whole) {
      segs.push({ text: part, bold: true });
    } else if (prefixLen > 0) {
      segs.push({ text: part.slice(0, prefixLen), bold: true });
      segs.push({ text: part.slice(prefixLen), bold: false });
    } else {
      segs.push({ text: part, bold: false });
    }
  }
  return segs;
}
