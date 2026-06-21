"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ChartMode } from "@/lib/dataAvailability";
import type { DraftMove } from "@/lib/scoreboardStats";
import { POSITION_ORDER } from "@/lib/chartConstants";
import { TEAM_COLORS, sameTeam, resolveTeamName } from "@/lib/chartConstants";
import FilterDropdown from "@/components/sidebar/FilterDropdown";
import ActKey from "@/components/sidebar/ActKey";

// ViewMode must remain exported — PlayerDots.tsx imports it
export type ViewMode = "projected" | "drafted";

export interface SidebarProps {
  positionFilter: string[];
  onPositionFilterChange: (positions: string[]) => void;
  roundFilter: (number | "UDFA")[];
  onRoundFilterChange: (rounds: (number | "UDFA")[]) => void;
  teamFilter: string[];
  onTeamFilterChange: (teams: string[]) => void;
  schoolFilter: string[];
  onSchoolFilterChange: (schools: string[]) => void;
  // vs-consensus (Brief 3) — a 5th, act-aware filter. STEAL/IN_RANGE/REACH multi-select;
  // rendered only in Act 2 & 3 (chartMode !== 'projection'). Selection persists in state.
  consensusFilter: DraftMove[];
  onConsensusFilterChange: (moves: DraftMove[]) => void;
  onClearAllFilters: () => void;
  liveMode: boolean;
  onLiveModeToggle: () => void;
  showLines: boolean;
  onShowLinesToggle: () => void;
  chartMode?: ChartMode;
  availableTeams: string[];
  availableSchools: string[];
  hasActiveFilters: boolean;
  // "Showing N of X players" (Brief 1, Piece 5): N = lit (scope-filtered) count, X = total.
  litCount: number;
  totalCount: number;
  // Reset (Brief 1, Piece 6): clears filters + pin + search, returns to Act 1 / newest class.
  // Wired to BOTH the brand logo and the footer house.
  onResetView: () => void;
  // Your team (brief f, item 2) — the ☆ MY TEAM row + per-row pin icons. The pin is
  // identity (onPinTeam); selecting a team still flows through onTeamFilterChange.
  pinnedTeam: string | null;
  onToggleTeam: (team: string) => void;
  onPinTeam: (team: string | null) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// HIDDEN 2026-06-18 — Brief 1 declutter. Legacy sidebar sections (Hide Drafted,
// Map Display, How to Read, Player List link) are gated behind this flag, NOT
// deleted: components + handlers stay intact for later resurfacing (the Act-2 key
// in Brief 2 restores a movement-lines toggle via the same handler). Flip to true
// to bring them all back.
const SHOW_LEGACY = false;

const DEF_POSITIONS = ["EDGE", "DT", "LB", "CB", "S"];
const OFF_POSITIONS = ["RB", "WR", "TE", "OT", "IOL", "QB"];
const ROUND_OPTIONS: (number | "UDFA")[] = [1, 2, 3, 4, 5, 6, 7, "UDFA"];

// vs-consensus (Brief 3) — the 3-way chip set, in SCOREBOARD-STRIP order
// (steals · on-target · reaches). `tone` keys the strip-palette chip color (CSS):
// steal = gold, ontarget = grey, reach = sky. One concept, three touchpoints
// (this scope twin + the Act-2 key lines row + the scoreboard strip counts).
const CONSENSUS_OPTIONS: { move: DraftMove; label: string; tone: "steal" | "ontarget" | "reach" }[] = [
  { move: "STEAL",    label: "↓ Steals",  tone: "steal" },
  { move: "IN_RANGE", label: "On-target", tone: "ontarget" },
  { move: "REACH",    label: "↑ Reaches", tone: "reach" },
];
const CONSENSUS_SUMMARY_LABEL: Record<string, string> = {
  STEAL: "Steals", IN_RANGE: "On-target", REACH: "Reaches",
};

// ── Summary helpers ───────────────────────────────────────────────────────────

function isAllDefense(f: string[]) {
  return f.length === DEF_POSITIONS.length && DEF_POSITIONS.every(p => f.includes(p));
}
function isAllOffense(f: string[]) {
  return f.length === OFF_POSITIONS.length && OFF_POSITIONS.every(p => f.includes(p));
}
function getPositionSummary(f: string[]) {
  if (f.length === 0) return "All Positions";
  if (isAllOffense(f)) return "All Offense";
  if (isAllDefense(f)) return "All Defense";
  if (f.length === 1) return f[0];
  return `${f.length} positions`;
}
function getRoundSummary(f: (number | "UDFA")[]) {
  if (f.length === 0) return "All Rounds";
  const labels = f.map(r => (r === "UDFA" ? "UDFA" : `R${r}`));
  if (labels.length <= 2) return labels.join(", ");
  return `${f.length} rounds`;
}
function getTeamSummary(f: string[]) {
  if (f.length === 0) return "All Teams";
  if (f.length <= 2) return f.join(", ");
  return `${f.length} teams`;
}
function getSchoolSummary(f: string[]) {
  if (f.length === 0) return "All Schools";
  if (f.length <= 2) return f.join(", ");
  return `${f.length} schools`;
}
function getConsensusSummary(f: DraftMove[]) {
  if (f.length === 0) return "All Picks";
  if (f.length === 1) return CONSENSUS_SUMMARY_LABEL[f[0]] ?? "1 selected";
  return `${f.length} selected`;
}

// ── Panel-collapse icons (Tabler ti-layout-sidebar-left-*) ───────────────────────
// Hollow stroked layout box at rest; the `.sb-collapse-fill` body fills on hover
// (CSS), mirroring the HouseIcon grammar. Collapse = chevron-in (expanded state),
// Expand = chevron-out (collapsed rail).
//
// Stroked in a solid, full-opacity muted-parchment hex (NOT the button's translucent
// currentColor): with alpha < 1, the divider's round caps overlapped the box edges
// and two 0.7-alpha strokes composited into dark blobs. A solid color can't compound.
// The divider is inset (M9 6v12) so its caps land inside the box, never on its edges.
const SB_ICON_STROKE = "#FBF8F2"; // ivory — matches GLYPH_FILL (lib/act3Constants.ts), full opacity
function SidebarCollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
      stroke={SB_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect className="sb-collapse-fill" x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 6v12" />
      <path d="M15 10l-2 2l2 2" />
    </svg>
  );
}
function SidebarExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
      stroke={SB_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect className="sb-collapse-fill" x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 6v12" />
      <path d="M14 10l2 2l-2 2" />
    </svg>
  );
}

// ── House icon (footer reset) ───────────────────────────────────────────────────
// Hollow stroked outline at rest; the `.sb-house-fill` body fills on hover (CSS).
function HouseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none"
      stroke={SB_ICON_STROKE} strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path className="sb-house-fill" d="M3 9.2 10 3.5l7 5.7V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.2Z" />
    </svg>
  );
}

// ── SidebarSection ────────────────────────────────────────────────────────────

function SidebarSection({
  label, icon, defaultOpen = true, collapsed: sidebarCollapsed, children,
}: {
  label: string; icon: string; defaultOpen?: boolean;
  collapsed: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (sidebarCollapsed) {
    return (
      <div className="sb-section sb-section--icon-only" title={label}>
        <span className="sb-section-icon">{icon}</span>
      </div>
    );
  }
  return (
    <div className={`sb-section${open ? " sb-section--open" : ""}`}>
      <button className="sb-section-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="sb-section-icon">{icon}</span>
        <span className="sb-section-label">{label}</span>
        <span className="sb-section-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="sb-section-body">{children}</div>}
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar(props: SidebarProps) {
  const {
    positionFilter, onPositionFilterChange,
    roundFilter, onRoundFilterChange,
    teamFilter, onTeamFilterChange,
    schoolFilter, onSchoolFilterChange,
    consensusFilter, onConsensusFilterChange,
    onClearAllFilters,
    liveMode, onLiveModeToggle,
    showLines, onShowLinesToggle,
    chartMode,
    availableTeams, availableSchools,
    hasActiveFilters,
    litCount, totalCount,
    onResetView,
    pinnedTeam, onToggleTeam, onPinTeam,
  } = props;

  const [collapsed, setCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"position" | "round" | "team" | "school" | "consensus" | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const teamSearchRef = useRef<HTMLInputElement>(null);

  // The in-class string for the pinned team (so the ☆ row toggles the SAME teamFilter
  // entry the checkboxes use); falls back to the raw pin if the team isn't in this class.
  const pinnedInClass = pinnedTeam
    ? (availableTeams.find(t => sameTeam(t, pinnedTeam)) ?? pinnedTeam)
    : null;
  const pinnedLit = pinnedTeam != null && teamFilter.some(t => sameTeam(t, pinnedTeam));

  const showTrailsToggle =
    chartMode === undefined ||
    chartMode === "draft-results" ||
    chartMode === "player-production";

  const toggleDropdown = (key: "position" | "round" | "team" | "school" | "consensus") => {
    setOpenDropdown(prev => (prev === key ? null : key));
  };

  // vs-consensus is rendered only in Act 2 & 3 — the deviation is undefined before the
  // draft. chartMode === 'projection' is Act 1; everything else (draft-results / field
  // modes) is Act 2+. `undefined` (no mode yet) stays hidden — Act 1 is the default beat.
  const showConsensusFilter = chartMode !== undefined && chartMode !== "projection";

  return (
    <aside className={`dm-sidebar${collapsed ? " dm-sidebar--collapsed" : ""}`}>

      {/* ── Brand header (logo doubles as Reset — Brief 1, Piece 6) ── */}
      <div className={`sb-brand${collapsed ? " sb-brand--collapsed" : ""}`}>
        <button
          className="sb-brand-logo-btn"
          onClick={onResetView}
          title="Reset — clears filters and pinned team"
          aria-label="Reset — clears filters and pinned team"
        >
          <Image
            src="/brand/draftmap-mark.svg"
            alt="DraftMap"
            width={collapsed ? 34 : 72}
            height={collapsed ? 34 : 72}
            className="sb-brand-mark"
          />
        </button>
        {!collapsed && (
          <div className="sb-brand-text">
            <span className="sb-brand-name">DraftMap</span>
            <span className="sb-brand-tagline">NFL Draft: Projection. Selection. Outcome.</span>
          </div>
        )}
      </div>

      {/* ── Collapsed-rail toggle: expand button at the top of the 54px rail, carrying
            the filter-active gold badge. (Expanded, the toggle lives in the FILTERS
            header row instead.) ── */}
      {collapsed && (
        <div className="sb-rail-toggle">
          <button
            className="sb-collapse-btn"
            onClick={() => setCollapsed(false)}
            title="Expand panel"
            aria-label="Expand panel"
            aria-expanded={false}
          >
            <SidebarExpandIcon />
            {hasActiveFilters && (
              <span className="sb-collapse-badge" aria-label="Filters active" />
            )}
          </button>
        </div>
      )}

      {/* ── FILTERS section (manually rendered — no SidebarSection, needs Clear all slot).
            Emoji icon dropped (Brief 1): with the legacy sections hidden, FILTERS is the
            only header, so the collapse button + label + "Clear all" carry it.
            Collapsed → not rendered; the rail toggle's badge signals active filters. ── */}
      {!collapsed && (
        <div className="sb-section sb-section--open">
          <div className="sb-section-header sb-section-header--no-toggle">
            <button
              className="sb-collapse-btn"
              onClick={() => setCollapsed(true)}
              title="Collapse panel"
              aria-label="Collapse panel"
              aria-expanded={true}
            >
              <SidebarCollapseIcon />
            </button>
            <span className="sb-section-label">Filters</span>
            {hasActiveFilters && (
              <button className="sb-clear-all" onClick={onClearAllFilters}>Clear all</button>
            )}
          </div>
          <div className="sb-section-body">

            {/* Position */}
            <FilterDropdown
              label="Position"
              summary={getPositionSummary(positionFilter)}
              isOpen={openDropdown === "position"}
              onToggle={() => toggleDropdown("position")}
              hasSelection={positionFilter.length > 0}
              onClear={() => onPositionFilterChange([])}
            >
              <div className="sb-fd-quick">
                <button
                  className={`sb-fd-quick-btn${positionFilter.length === 0 ? " active" : ""}`}
                  onClick={() => onPositionFilterChange([])}
                >All Positions</button>
                <button
                  className={`sb-fd-quick-btn${isAllOffense(positionFilter) ? " active" : ""}`}
                  onClick={() => onPositionFilterChange([...OFF_POSITIONS])}
                >All Offense</button>
                <button
                  className={`sb-fd-quick-btn${isAllDefense(positionFilter) ? " active" : ""}`}
                  onClick={() => onPositionFilterChange([...DEF_POSITIONS])}
                >All Defense</button>
              </div>
              <div className="sb-fd-separator" />
              <div className="sb-fd-pos-grid">
                {POSITION_ORDER.map(pos => (
                  <button
                    key={pos}
                    className={`sb-fd-pos-btn${positionFilter.includes(pos) ? " active" : ""}`}
                    onClick={() => {
                      const next = positionFilter.includes(pos)
                        ? positionFilter.filter(p => p !== pos)
                        : [...positionFilter, pos];
                      onPositionFilterChange(next);
                    }}
                  >{pos}</button>
                ))}
              </div>
            </FilterDropdown>

            {/* Round */}
            <FilterDropdown
              label="Round"
              summary={getRoundSummary(roundFilter)}
              isOpen={openDropdown === "round"}
              onToggle={() => toggleDropdown("round")}
              hasSelection={roundFilter.length > 0}
              onClear={() => onRoundFilterChange([])}
            >
              <div className="sb-fd-rounds">
                {ROUND_OPTIONS.map(rd => {
                  const label = rd === "UDFA" ? "UDFA" : `R${rd}`;
                  const isSelected = roundFilter.includes(rd);
                  return (
                    <button
                      key={label}
                      className={`sb-fd-pos-btn${isSelected ? " active" : ""}`}
                      onClick={() => {
                        const next = isSelected
                          ? roundFilter.filter(r => r !== rd)
                          : [...roundFilter, rd];
                        onRoundFilterChange(next);
                      }}
                    >{label}</button>
                  );
                })}
              </div>
            </FilterDropdown>

            {/* NFL Team */}
            <FilterDropdown
              label="Team"
              summary={getTeamSummary(teamFilter)}
              isOpen={openDropdown === "team"}
              onToggle={() => toggleDropdown("team")}
              hasSelection={teamFilter.length > 0}
              onClear={() => onTeamFilterChange([])}
            >
              <input
                ref={teamSearchRef}
                className="sb-fd-search"
                type="text"
                placeholder="Search teams..."
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
              />
              <div className="sb-fd-list">
                {/* ☆ MY TEAM — shortcut row pinned to the TOP (brief f, item 2).
                    Unpinned = quiet invite (focuses search — the team list IS the
                    picker here). Pinned = clicks exactly like a team row (toggles the
                    lens); the ★ removes the pin. One state, shared with the chip. */}
                {pinnedTeam ? (
                  <div className="sb-fd-row sb-fd-row--myteam">
                    <button
                      className={`sb-fd-item${pinnedLit ? " sb-fd-item--checked" : ""}`}
                      onClick={() => pinnedInClass && onToggleTeam(pinnedInClass)}
                      title={pinnedLit ? "Hide your team" : "Show only your team"}
                    >
                      <span className="sb-fd-star" aria-hidden="true">★</span>
                      {TEAM_COLORS[pinnedInClass ?? ""] && (
                        <span className="sb-fd-swatch" style={{ background: TEAM_COLORS[pinnedInClass ?? ""].fill }} />
                      )}
                      <span className="sb-fd-myteam-label">MY TEAM</span>
                      <span className="sb-fd-myteam-name">{resolveTeamName(pinnedTeam).split(/\s+/).pop()}</span>
                    </button>
                    <button
                      className="sb-fd-pin sb-fd-pin--active"
                      onClick={() => onPinTeam(null)}
                      aria-pressed={true}
                      title="Remove your team"
                    >★</button>
                  </div>
                ) : (
                  <button
                    className="sb-fd-item sb-fd-myteam-empty"
                    onClick={() => teamSearchRef.current?.focus()}
                    title="Pin your team — one click, every visit"
                  >
                    <span className="sb-fd-star" aria-hidden="true">☆</span>
                    <span className="sb-fd-myteam-label">MY TEAM</span>
                    <span className="sb-fd-myteam-hint">pick below ↓</span>
                  </button>
                )}
                {availableTeams
                  .filter(t => t.toLowerCase().includes(teamSearch.toLowerCase()))
                  .map(team => {
                    const tc = TEAM_COLORS[team];
                    const isSelected = teamFilter.some(t => sameTeam(t, team));
                    const isPinned = sameTeam(team, pinnedTeam);
                    return (
                      <div key={team} className="sb-fd-row">
                        <button
                          className={`sb-fd-item${isSelected ? " sb-fd-item--checked" : ""}`}
                          onClick={() => onToggleTeam(team)}
                        >
                          {tc && (
                            <span className="sb-fd-swatch" style={{ background: tc.fill }} />
                          )}
                          {team}
                        </button>
                        <button
                          className={`sb-fd-pin${isPinned ? " sb-fd-pin--active" : ""}`}
                          onClick={() => onPinTeam(isPinned ? null : team)}
                          aria-pressed={isPinned}
                          title={isPinned ? "Remove your team" : "Make this your team"}
                        >{isPinned ? "★" : "☆"}</button>
                      </div>
                    );
                  })
                }
              </div>
            </FilterDropdown>

            {/* School */}
            <FilterDropdown
              label="School"
              summary={getSchoolSummary(schoolFilter)}
              isOpen={openDropdown === "school"}
              onToggle={() => toggleDropdown("school")}
              hasSelection={schoolFilter.length > 0}
              onClear={() => onSchoolFilterChange([])}
            >
              <input
                className="sb-fd-search"
                type="text"
                placeholder="Search schools..."
                value={schoolSearch}
                onChange={e => setSchoolSearch(e.target.value)}
              />
              <div className="sb-fd-list">
                {availableSchools
                  .filter(s => s.toLowerCase().includes(schoolSearch.toLowerCase()))
                  .map(school => {
                    const isSelected = schoolFilter.includes(school);
                    return (
                      <button
                        key={school}
                        className={`sb-fd-item${isSelected ? " sb-fd-item--checked" : ""}`}
                        onClick={() => {
                          const next = isSelected
                            ? schoolFilter.filter(s => s !== school)
                            : [...schoolFilter, school];
                          onSchoolFilterChange(next);
                        }}
                      >{school}</button>
                    );
                  })
                }
              </div>
            </FilterDropdown>

            {/* Vs. consensus (Brief 3) — act-aware: Act 2 & 3 only. A categorical SCOPE
                twin of the Act-2 key's lines row (explains) and the scoreboard strip
                (counts) — chips carry the STRIP palette so the three touchpoints rhyme. */}
            {showConsensusFilter && (
              <FilterDropdown
                label="Vs. consensus"
                summary={getConsensusSummary(consensusFilter)}
                isOpen={openDropdown === "consensus"}
                onToggle={() => toggleDropdown("consensus")}
                hasSelection={consensusFilter.length > 0}
                onClear={() => onConsensusFilterChange([])}
              >
                <div className="sb-fd-vc-chips">
                  {CONSENSUS_OPTIONS.map(({ move, label, tone }) => {
                    const isSelected = consensusFilter.includes(move);
                    return (
                      <button
                        key={move}
                        className={`sb-fd-vc-chip sb-fd-vc-chip--${tone}${isSelected ? " active" : ""}`}
                        onClick={() => {
                          const next = isSelected
                            ? consensusFilter.filter(m => m !== move)
                            : [...consensusFilter, move];
                          onConsensusFilterChange(next);
                        }}
                        aria-pressed={isSelected}
                      >{label}</button>
                    );
                  })}
                </div>
              </FilterDropdown>
            )}

            {/* HIDDEN 2026-06-18 — Brief 1 declutter. "Hide Drafted" toggle (handler +
                component kept intact behind SHOW_LEGACY; resurface later). */}
            {SHOW_LEGACY && (
              <div className="sb-field-group">
                <button
                  className={`sb-live-btn${liveMode ? " active" : ""}`}
                  onClick={onLiveModeToggle}
                >
                  <span className="sb-live-dot" />
                  Hide Drafted
                </button>
                <div className="sb-field-hint">
                  Dims players who were drafted — useful during a live draft or to spot who went undrafted.
                </div>
              </div>
            )}

            {/* Showing N of X players (Brief 1, Piece 5) — live-updates with the filters */}
            <div className="sb-count">
              Showing <span className="sb-count-n">{litCount}</span> of {totalCount} players
            </div>

          </div>
        </div>
      )}

      {/* ── Zone B: the act-aware Key (Brief 2). Reads the current act off chartMode +
            the existing showLines flag; presentation only. Desktop, expanded only. ── */}
      {!collapsed && (
        <ActKey
          chartMode={chartMode}
          showLines={showLines}
          onShowLinesToggle={onShowLinesToggle}
        />
      )}

      {/* HIDDEN 2026-06-18 — Brief 1 declutter. MAP DISPLAY section (movement-lines
          toggle + dot-size legend + projection note). The Act-2 key in Brief 2 restores
          a lines toggle via the same handleShowLinesToggle. */}
      {SHOW_LEGACY && (
      <SidebarSection label="Map Display" icon="🗺" collapsed={collapsed}>
        {showTrailsToggle && (
          <div className="sb-field-group">
            <button
              className={`sb-toggle-btn${showLines ? " active" : ""}`}
              onClick={onShowLinesToggle}
            >
              <span className={`sb-toggle-dot${showLines ? " active" : ""}`} />
              Show Movement Lines
            </button>
            <div className="sb-field-hint">Display all projection-to-actual lines</div>
          </div>
        )}
        {chartMode === "draft-results" && (
          <div className="sb-legend">
            <div className="sb-legend-title">Dot Size</div>
            <div className="sb-legend-row">
              <svg width="40" height="16" style={{ overflow: "visible" }}>
                <circle cx="8"  cy="8" r="4"  fill="#9CA3AF" stroke="#555" strokeWidth="1" />
                <circle cx="24" cy="8" r="8"  fill="#9CA3AF" stroke="#555" strokeWidth="1" />
                <circle cx="40" cy="8" r="12" fill="#9CA3AF" stroke="#555" strokeWidth="1" />
              </svg>
              <span className="sb-legend-label">= size of surprise vs. projection</span>
            </div>
            <div className="sb-legend-subtext">
              Larger dot = bigger gap between projected and actual draft value
            </div>
          </div>
        )}
        {chartMode === "projection" && (
          <div className="sb-legend-subtext sb-legend-subtext--muted">
            Dot size is uniform in Projected view. Switch to Drafted to see surprises.
          </div>
        )}
      </SidebarSection>
      )}

      {/* ── Spacer ── */}
      <div className="sb-spacer" />

      {/* HIDDEN 2026-06-18 — Brief 1 declutter. HOW TO READ section (kept behind
          SHOW_LEGACY; the in-chart "How to Read" modal still covers this content). */}
      {SHOW_LEGACY && (
      <SidebarSection label="How to Read" icon="?" defaultOpen={false} collapsed={collapsed}>
        <p className="sb-help-text">
          <strong>Zones:</strong> STARTER (top), ROLE PLAYER (mid), FRINGE (bottom), WASHED OUT (below field). Based on snap share vs. peers at each position.
        </p>
        <p className="sb-help-text">
          <strong>Journey Bar:</strong> Step through Draft Projections → Draft Results → seasons → career.
        </p>
        <p className="sb-help-text">
          <strong>Dot size:</strong> In Draft Results, larger dots = bigger surprise vs. projection.
        </p>
        <p className="sb-help-text">
          <strong>Dot color:</strong> College colors in projection; NFL team colors after draft day.
        </p>
      </SidebarSection>
      )}

      {/* HIDDEN 2026-06-18 — Brief 1 declutter. In-app "Player List" link (the /players
          route stays in the sitemap; only this in-app nav link hides). */}
      {SHOW_LEGACY && (
      <div className="sb-nav-link-row">
        <Link
          href="/players"
          className={`sb-nav-link${collapsed ? " sb-nav-link--icon-only" : ""}`}
          title="Player List"
        >
          <span className="sb-nav-link-icon">☰</span>
          {!collapsed && <span className="sb-nav-link-label">Player List</span>}
        </Link>
      </div>
      )}

      {/* ── Footer meta cluster: Home (reset) + About (Brief 1, Piece 6) ── */}
      <div className={`sb-footer${collapsed ? " sb-footer--collapsed" : ""}`}>
        <button
          className="sb-footer-home"
          onClick={onResetView}
          title="Reset — clears filters and pinned team"
          aria-label="Reset — clears filters and pinned team"
        >
          <HouseIcon />
        </button>
        {!collapsed && (
          <Link href="/about" className="sb-footer-about">About</Link>
        )}
      </div>

    </aside>
  );
}
