"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
/**
 * components/Sidebar.tsx
 *
 * Session S restructure:
 *   - Collapse button moved below brand header (small right-aligned pill)
 *   - "Draft Context" renamed to "Filters"
 *   - "Mark Picked Players" renamed to "Drafted Players"
 *   - Section order: View Mode -> Filters -> [spacer] -> Player List -> Map Display -> How to Read
 *   - "Show Movement Lines" toggle added to Map Display
 *   - showLines / onShowLinesToggle props added
 *
 * Delta-2: chartMode prop added. Trails toggle only shown in draft-results
 *   and player-production modes. ViewMode / animation controls remain for
 *   backward compat (complemented by HeaderZone journey bar).
 */

import { useState, useCallback } from "react";
import { VALID_DRAFT_YEARS } from "@/lib/draftYears";
import type { ChartMode } from "@/lib/dataAvailability";

export type ViewMode = "projected" | "drafted";

export interface AnimationState {
  playing: boolean;
  step: number;
}

export interface SidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  animState: AnimationState;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onJumpEnd: () => void;
  view: "all" | "offense" | "defense";
  onViewChange: (v: "all" | "offense" | "defense") => void;
  year: number;
  liveMode: boolean;
  onLiveModeToggle: () => void;
  showLines: boolean;
  onShowLinesToggle: () => void;
  chartMode?: ChartMode;
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

// ── Segmented control ─────────────────────────────────────────────────────────

function SegmentedControl({
  value, options, onChange,
}: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="sb-segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`sb-seg-btn${value === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ── Animation player ──────────────────────────────────────────────────────────

function AnimPlayer({
  animState, viewMode, onPlay, onPause, onReset, onStepBack, onStepForward, onJumpEnd,
}: Pick<SidebarProps, "animState" | "viewMode" | "onPlay" | "onPause" | "onReset" | "onStepBack" | "onStepForward" | "onJumpEnd">) {
  const stepsDisabled = viewMode === "projected";
  const { playing, step } = animState;
  const atStart = step === 0;
  const atEnd   = step === 1;
  return (
    <div className="sb-player">
      <button className="sb-player-btn" onClick={onReset} title="Reset to projected" disabled={atStart}>&#x23EE;</button>
      <button className="sb-player-btn" onClick={onStepBack} title="Step back" disabled={stepsDisabled || atStart}>&#x23EA;</button>
      {playing
        ? <button className="sb-player-btn sb-player-btn--primary" onClick={onPause} title="Pause">&#x23F8;</button>
        : <button className="sb-player-btn sb-player-btn--primary" onClick={onPlay} title="Play" disabled={atEnd}>&#x23F5;</button>
      }
      <button className="sb-player-btn" onClick={onStepForward} title="Step forward" disabled={stepsDisabled || atEnd}>&#x23E9;</button>
      <button className="sb-player-btn" onClick={onJumpEnd} title="Jump to end" disabled={atEnd}>&#x23ED;</button>
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar(props: SidebarProps) {
  const {
    viewMode, onViewModeChange,
    animState, onPlay, onPause, onReset, onStepBack, onStepForward, onJumpEnd,
    view, onViewChange,
    year, liveMode, onLiveModeToggle,
    showLines, onShowLinesToggle,
    chartMode,
  } = props;

  const showTrailsToggle =
    chartMode === undefined ||
    chartMode === "draft-results" ||
    chartMode === "player-production";

  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const handleYearChange = useCallback((selectedYear: number) => {
    if (selectedYear !== year) router.push(`/draft/${selectedYear}`);
  }, [year, router]);

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

      {/* ── Collapse button — small pill below brand header ── */}
      <div className="sb-collapse-row">
        <button
          className="sb-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* ── Zone 1: View Mode ── */}
      <SidebarSection label="View Mode" icon="⊞" collapsed={collapsed}>
        <SegmentedControl
          value={viewMode}
          options={[
            { value: "projected", label: "Projected" },
            { value: "drafted",   label: "Drafted"   },
          ]}
          onChange={v => onViewModeChange(v as ViewMode)}
        />
        <div className="sb-view-hint">
          {viewMode === "projected" ? "Derek's pre-draft board" : "Where players were actually picked"}
        </div>
        <AnimPlayer
          animState={animState} viewMode={viewMode}
          onPlay={onPlay} onPause={onPause} onReset={onReset}
          onStepBack={onStepBack} onStepForward={onStepForward} onJumpEnd={onJumpEnd}
        />
      </SidebarSection>

      {/* ── Zone 2: Filters (was Draft Context) ── */}
      <SidebarSection label="Filters" icon="📋" collapsed={collapsed}>
        <div className="sb-field-group">
          <label className="sb-field-label">Year</label>
          <div className="sb-btn-group">
            {[...VALID_DRAFT_YEARS].reverse().map(y => (
              <button
                key={y}
                className={`sb-filter-btn${year === y ? " active" : ""}`}
                onClick={() => handleYearChange(y)}
              >{y}</button>
            ))}
          </div>
        </div>
        <div className="sb-field-group">
          <label className="sb-field-label">Position Group</label>
          <div className="sb-btn-group">
            {(["all", "offense", "defense"] as const).map(v => (
              <button
                key={v}
                className={`sb-filter-btn${view === v ? " active" : ""}`}
                onClick={() => onViewChange(v)}
              >{v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="sb-field-group">
          <button
            className={`sb-live-btn${liveMode ? " active" : ""}`}
            onClick={onLiveModeToggle}
          >
            <span className="sb-live-dot" />
            Drafted Players
          </button>
          <div className="sb-field-hint">Greys out drafted players in Projected view</div>
        </div>
      </SidebarSection>

      {/* ── Spacer — pushes remaining sections to bottom ── */}
      <div className="sb-spacer" />

      {/* ── Player List link (bottom) ── */}
      <div className="sb-nav-link-row">
        <Link
          href={`/players?year=${year}`}
          className={`sb-nav-link${collapsed ? " sb-nav-link--icon-only" : ""}`}
          title="Player List"
        >
          <span className="sb-nav-link-icon">☰</span>
          {!collapsed && <span className="sb-nav-link-label">Player List</span>}
        </Link>
      </div>

      {/* ── Zone 3: Map Display ── */}
      <SidebarSection label="Map Display" icon="🗺" collapsed={collapsed}>
        {/* Trails toggle — only visible in draft-results / player-production modes */}
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

        {viewMode === "drafted" && (
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
        {viewMode === "projected" && (
          <div className="sb-legend-subtext sb-legend-subtext--muted">
            Dot size is uniform in Projected view. Switch to Drafted to see surprises.
          </div>
        )}
      </SidebarSection>

      {/* ── Zone 4: How to Read (collapsed by default) ── */}
      <SidebarSection label="How to Read" icon="?" defaultOpen={false} collapsed={collapsed}>
        <p className="sb-help-text">
          <strong>Y-axis:</strong> Draft position — top picks are highest, late rounds are lowest.
        </p>
        <p className="sb-help-text">
          <strong>X-axis:</strong> Position groups, sized by class depth.
        </p>
        <p className="sb-help-text">
          <strong>Projected view:</strong> Derek's pre-draft ranking. Dot color = college.
        </p>
        <p className="sb-help-text">
          <strong>Drafted view:</strong> Where each player was actually picked. Color = NFL team. Larger dots = bigger surprise. Hover a dot to see projected vs. actual movement.
        </p>
      </SidebarSection>
    </aside>
  );
}
