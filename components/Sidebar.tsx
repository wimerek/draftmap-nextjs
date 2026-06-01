"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { ChartMode } from "@/lib/dataAvailability";
import { POSITION_ORDER } from "@/lib/chartConstants";
import { TEAM_COLORS } from "@/lib/chartConstants";
import FilterDropdown from "@/components/sidebar/FilterDropdown";

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
  onClearAllFilters: () => void;
  liveMode: boolean;
  onLiveModeToggle: () => void;
  showLines: boolean;
  onShowLinesToggle: () => void;
  chartMode?: ChartMode;
  availableTeams: string[];
  availableSchools: string[];
  hasActiveFilters: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEF_POSITIONS = ["EDGE", "DT", "LB", "CB", "S"];
const OFF_POSITIONS = ["RB", "WR", "TE", "OT", "IOL", "QB"];
const ROUND_OPTIONS: (number | "UDFA")[] = [1, 2, 3, 4, 5, 6, 7, "UDFA"];

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
    onClearAllFilters,
    liveMode, onLiveModeToggle,
    showLines, onShowLinesToggle,
    chartMode,
    availableTeams, availableSchools,
    hasActiveFilters,
  } = props;

  const [collapsed, setCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"position" | "round" | "team" | "school" | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const showTrailsToggle =
    chartMode === undefined ||
    chartMode === "draft-results" ||
    chartMode === "player-production";

  const toggleDropdown = (key: "position" | "round" | "team" | "school") => {
    setOpenDropdown(prev => (prev === key ? null : key));
  };

  return (
    <aside className={`dm-sidebar${collapsed ? " dm-sidebar--collapsed" : ""}`}>

      {/* ── Brand header ── */}
      <div className={`sb-brand${collapsed ? " sb-brand--collapsed" : ""}`}>
        <Image
          src="/brand/draftmap-mark.svg"
          alt="DraftMap"
          width={collapsed ? 34 : 72}
          height={collapsed ? 34 : 72}
          className="sb-brand-mark"
        />
        {!collapsed && (
          <div className="sb-brand-text">
            <span className="sb-brand-name">DraftMap</span>
            <span className="sb-brand-tagline">NFL Draft at a glance.</span>
          </div>
        )}
      </div>

      {/* ── Collapse button row (+ active filter badge when collapsed) ── */}
      <div className="sb-collapse-row">
        <button
          className="sb-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? "›" : "‹"}
        </button>
        {collapsed && hasActiveFilters && (
          <span className="sb-filter-badge" aria-label="Filters active" />
        )}
      </div>

      {/* ── FILTERS section (manually rendered — no SidebarSection, needs Clear all slot) ── */}
      {!collapsed ? (
        <div className="sb-section sb-section--open">
          <div className="sb-section-header sb-section-header--no-toggle">
            <span className="sb-section-icon">📋</span>
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
                className="sb-fd-search"
                type="text"
                placeholder="Search teams..."
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
              />
              <div className="sb-fd-list">
                {availableTeams
                  .filter(t => t.toLowerCase().includes(teamSearch.toLowerCase()))
                  .map(team => {
                    const tc = TEAM_COLORS[team];
                    const isSelected = teamFilter.includes(team);
                    return (
                      <button
                        key={team}
                        className={`sb-fd-item${isSelected ? " sb-fd-item--checked" : ""}`}
                        onClick={() => {
                          const next = isSelected
                            ? teamFilter.filter(t => t !== team)
                            : [...teamFilter, team];
                          onTeamFilterChange(next);
                        }}
                      >
                        {tc && (
                          <span className="sb-fd-swatch" style={{ background: tc.fill }} />
                        )}
                        {team}
                      </button>
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

            {/* Hide Drafted toggle */}
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

          </div>
        </div>
      ) : (
        <div className="sb-section sb-section--icon-only" title="Filters">
          <span className="sb-section-icon">📋</span>
        </div>
      )}

      {/* ── MAP DISPLAY ── */}
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

      {/* ── Spacer ── */}
      <div className="sb-spacer" />

      {/* ── HOW TO READ (collapsed by default) ── */}
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

      {/* ── Player List link (very bottom) ── */}
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

    </aside>
  );
}
