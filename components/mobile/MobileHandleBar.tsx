"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { SidebarProps } from "@/components/Sidebar";
import { POSITION_ORDER, TEAM_COLORS } from "@/lib/chartConstants";
import FilterDropdown from "@/components/sidebar/FilterDropdown";

const DEF_POSITIONS = ["EDGE", "DT", "LB", "CB", "S"];
const OFF_POSITIONS = ["RB", "WR", "TE", "OT", "IOL", "QB"];
const ROUND_OPTIONS: (number | "UDFA")[] = [1, 2, 3, 4, 5, 6, 7, "UDFA"];

function getPositionSummary(f: string[]) {
  if (f.length === 0) return "All Positions";
  if (OFF_POSITIONS.every(p => f.includes(p)) && f.length === OFF_POSITIONS.length) return "All Offense";
  if (DEF_POSITIONS.every(p => f.includes(p)) && f.length === DEF_POSITIONS.length) return "All Defense";
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

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="sb-section sb-section--open" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <button className="sb-section-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="sb-section-label">{label}</span>
        <span className="sb-section-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="sb-section-body">{children}</div>}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  sidebarProps: SidebarProps;
}

export default function MobileHandleBar({ open, onOpen, onClose, sidebarProps }: Props) {
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
  } = sidebarProps;

  const showTrailsToggle =
    chartMode === undefined ||
    chartMode === "draft-results" ||
    chartMode === "player-production";

  const [openDropdown, setOpenDropdown] = useState<"position" | "round" | "team" | "school" | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");

  const toggleDropdown = (key: "position" | "round" | "team" | "school") => {
    setOpenDropdown(prev => (prev === key ? null : key));
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Filter pill button */}
      <div className="mb-handle-bar">
        <button
          className="mb-filter-pill-btn"
          onClick={open ? onClose : onOpen}
          aria-label={open ? "Close filters and options" : "Open filters and options"}
          aria-expanded={open}
        >
          <svg
            className="mb-filter-funnel-icon"
            width="16" height="16" viewBox="0 0 20 20"
            fill="none" aria-hidden="true"
          >
            <line x1="2" y1="5" x2="18" y2="5" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="5" y1="10" x2="15" y2="10" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="8" y1="15" x2="12" y2="15" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span className="mb-filter-pill-label">FILTERS &amp; OPTIONS</span>
        </button>
      </div>

      {/* Backdrop */}
      <div
        className={`mb-drawer-backdrop${open ? " mb-drawer-backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`mb-drawer${open ? " mb-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filters and Options"
      >
        <div className="mb-drawer-header">
          <button
            className="mb-drawer-close-btn"
            onClick={onClose}
            aria-label="Close filters"
          >✕ Close</button>
        </div>

        {/* Brand row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px 12px",
          borderBottom: "2px solid #D4A017",
        }}>
          <Image src="/brand/draftmap-mark.svg" alt="DraftMap" width={34} height={34} style={{ borderRadius: 4 }} />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: "#F5F0E8", lineHeight: 1 }}>DraftMap</div>
            <div style={{ fontSize: 10, color: "rgba(245,240,232,0.45)", fontStyle: "italic" }}>NFL Draft: Projection. Selection. Outcome.</div>
          </div>
        </div>

        <div className="mb-drawer-content">

          {/* Filters */}
          <DrawerSection label={`Filters${hasActiveFilters ? " ·" : ""}`}>
            {hasActiveFilters && (
              <button
                className="sb-clear-all"
                onClick={() => { onClearAllFilters(); }}
                style={{ marginBottom: 4 }}
              >Clear all filters</button>
            )}

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
                  className={`sb-fd-quick-btn${OFF_POSITIONS.every(p => positionFilter.includes(p)) && positionFilter.length === OFF_POSITIONS.length ? " active" : ""}`}
                  onClick={() => onPositionFilterChange([...OFF_POSITIONS])}
                >All Offense</button>
                <button
                  className={`sb-fd-quick-btn${DEF_POSITIONS.every(p => positionFilter.includes(p)) && positionFilter.length === DEF_POSITIONS.length ? " active" : ""}`}
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
                        {tc && <span className="sb-fd-swatch" style={{ background: tc.fill }} />}
                        {team}
                      </button>
                    );
                  })}
              </div>
            </FilterDropdown>

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
                  })}
              </div>
            </FilterDropdown>

            <div className="sb-field-group" style={{ marginTop: 4 }}>
              <button className={`sb-live-btn${liveMode ? " active" : ""}`} onClick={onLiveModeToggle}>
                <span className="sb-live-dot" />
                Hide Drafted
              </button>
              <div className="sb-field-hint">Dims players who were drafted — useful during a live draft or to spot who went undrafted.</div>
            </div>
          </DrawerSection>

          {/* Map Display */}
          {showTrailsToggle && (
            <DrawerSection label="Map Display">
              <div className="sb-field-group">
                <button className={`sb-toggle-btn${showLines ? " active" : ""}`} onClick={onShowLinesToggle}>
                  <span className={`sb-toggle-dot${showLines ? " active" : ""}`} />
                  Show Movement Lines
                </button>
                <div className="sb-field-hint">Display all projection-to-actual lines</div>
              </div>
            </DrawerSection>
          )}

          {/* How to Read */}
          <DrawerSection label="How to Read">
            <p className="sb-help-text"><strong>Y-axis:</strong> Draft position — top picks are highest, late rounds are lowest.</p>
            <p className="sb-help-text"><strong>X-axis:</strong> Position groups, sized by class depth.</p>
            <p className="sb-help-text"><strong>Projected view:</strong> Derek's pre-draft ranking. Dot color = college.</p>
            <p className="sb-help-text"><strong>Drafted view:</strong> Where each player was actually picked. Color = NFL team. Larger dots = bigger surprise.</p>
          </DrawerSection>

          {/* Player List link */}
          <div style={{ padding: "12px 14px" }}>
            <Link
              href="/players"
              className="sb-nav-link"
              onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 8, padding: "8px 10px", color: "rgba(245,240,232,0.60)", fontSize: 12, fontWeight: 600 }}
            >
              <span>☰</span>
              <span>Player List</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
