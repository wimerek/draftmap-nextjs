"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
/**
 * components/Sidebar.tsx
 *
 * Session G: Map-control-panel sidebar.
 * Left side, collapsible. Expanded 280px / collapsed 56px (icons + tooltips).
 * Four zones:
 *   1. View Mode — Projected / Drafted segmented control + animation player
 *   2. Draft Context — Year selector, Team filter
 *   3. Map Display — Labels toggle, dot size legend
 *   4. How to Read — collapsed by default; help text
 * All zones collapsible by the user. Only "How to Read" starts closed.
 *
 * Multi-year update: Year selector navigates to /draft/[year].
 * Live Draft Mode only shown for the most current year.
 */

import { useState, useCallback } from "react";
import { VALID_DRAFT_YEARS } from "@/lib/airtable";

// ── Types passed in from DraftChart ──────────────────────────────────────────

export type ViewMode = "projected" | "drafted";

export interface AnimationState {
  playing: boolean;
  /** 0 = at projected positions, 1 = at drafted positions. */
  step: number;
}

export interface SidebarProps {
  // View
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Animation player
  animState: AnimationState;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onJumpEnd: () => void;
  // Filters
  view: "all" | "offense" | "defense";
  onViewChange: (v: "all" | "offense" | "defense") => void;
  year: number;
  liveMode: boolean;
  onLiveModeToggle: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SidebarSection({
  label,
  icon,
  defaultOpen = true,
  collapsed: sidebarCollapsed,
  children,
}: {
  label: string;
  icon: string;
  defaultOpen?: boolean;
  collapsed: boolean;
  children: React.ReactNode;
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
      <button
        className="sb-section-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="sb-section-icon">{icon}</span>
        <span className="sb-section-label">{label}</span>
        <span className="sb-section-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="sb-section-body">{children}</div>}
    </div>
  );
}

// Segmented control for View Mode
function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="sb-segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`sb-seg-btn${value === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Animation player controls
function AnimPlayer({
  animState,
  viewMode,
  onPlay,
  onPause,
  onReset,
  onStepBack,
  onStepForward,
  onJumpEnd,
}: Pick<SidebarProps, "animState" | "viewMode" | "onPlay" | "onPause" | "onReset" | "onStepBack" | "onStepForward" | "onJumpEnd">) {
  // In "projected" mode there is only one step so < and > are greyed out.
  const stepsDisabled = viewMode === "projected";
  const { playing, step } = animState;
  const atStart = step === 0;
  const atEnd   = step === 1;

  return (
    <div className="sb-player">
      {/* Reset — always enabled */}
      <button
        className="sb-player-btn"
        onClick={onReset}
        title="Reset to projected"
        disabled={atStart}
      >
        &#x23EE;
      </button>
      {/* Step back */}
      <button
        className="sb-player-btn"
        onClick={onStepBack}
        title="Step back"
        disabled={stepsDisabled || atStart}
      >
        &#x23EA;
      </button>
      {/* Play / Pause */}
      {playing ? (
        <button
          className="sb-player-btn sb-player-btn--primary"
          onClick={onPause}
          title="Pause"
        >
          &#x23F8;
        </button>
      ) : (
        <button
          className="sb-player-btn sb-player-btn--primary"
          onClick={onPlay}
          title="Play"
          disabled={atEnd}
        >
          &#x23F5;
        </button>
      )}
      {/* Step forward */}
      <button
        className="sb-player-btn"
        onClick={onStepForward}
        title="Step forward"
        disabled={stepsDisabled || atEnd}
      >
        &#x23E9;
      </button>
      {/* Jump to end */}
      <button
        className="sb-player-btn"
        onClick={onJumpEnd}
        title="Jump to end"
        disabled={atEnd}
      >
        &#x23ED;
      </button>
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
  } = props;

  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const handleYearChange = useCallback((selectedYear: number) => {
    if (selectedYear !== year) {
      router.push(`/draft/${selectedYear}`);
    }
  }, [year, router]);


  return (
    <aside className={`dm-sidebar${collapsed ? " dm-sidebar--collapsed" : ""}`}>
      {/* Collapse toggle */}
      <button
        className="sb-collapse-btn"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? "Expand panel" : "Collapse panel"}
        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
      >
        {collapsed ? "›" : "‹"}
      </button>

      {/* Brand header — always visible, dark navy with logo mark */}
      <div className={`sb-brand${collapsed ? " sb-brand--collapsed" : ""}`}>
        <Image
          src="/brand/draftmap-mark.svg"
          alt="DraftMap"
          width={collapsed ? 30 : 36}
          height={collapsed ? 30 : 36}
          className="sb-brand-mark"
        />
        {!collapsed && (
          <div className="sb-brand-text">
            <span className="sb-brand-name">DRAFTMAP</span>
            <span className="sb-brand-tagline">NFL Draft at a glance.</span>
          </div>
        )}
      </div>

      {/* ── Nav link: Player List ── */}
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
          {viewMode === "projected"
            ? "Derek's pre-draft board"
            : "Where players were actually picked"}
        </div>
        <AnimPlayer
          animState={animState}
          viewMode={viewMode}
          onPlay={onPlay} onPause={onPause} onReset={onReset}
          onStepBack={onStepBack} onStepForward={onStepForward}
          onJumpEnd={onJumpEnd}
        />
      </SidebarSection>

      {/* ── Zone 2: Draft Context ── */}
      <SidebarSection label="Draft Context" icon="📋" collapsed={collapsed}>
        <div className="sb-field-group">
          <label className="sb-field-label">Year</label>
          <div className="sb-btn-group">
            {[...VALID_DRAFT_YEARS].reverse().map(y => (
              <button
                key={y}
                className={`sb-filter-btn${year === y ? " active" : ""}`}
                onClick={() => handleYearChange(y)}
              >
                {y}
              </button>
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
              >
                {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="sb-field-group">
            <button
              className={`sb-live-btn${liveMode ? " active" : ""}`}
              onClick={onLiveModeToggle}
            >
              <span className="sb-live-dot" />
              Mark Picked Players
            </button>
            <div className="sb-field-hint">Greys out drafted players in Projected view</div>
          </div>
      </SidebarSection>

      {/* ── Zone 3: Map Display ── */}
      <SidebarSection label="Map Display" icon="🗺" collapsed={collapsed}>
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
          <strong>Y-axis:</strong> Draft position — top picks are highest, late rounds
          are lowest. The gap between dots in a position column is a talent cliff.
        </p>
        <p className="sb-help-text">
          <strong>X-axis:</strong> Position groups, sized by class depth.
        </p>
        <p className="sb-help-text">
          <strong>Projected view:</strong> Each dot sits at Derek's pre-draft ranking.
          Dot color = player's college.
        </p>
        <p className="sb-help-text">
          <strong>Drafted view:</strong> Dots animate to where each player was actually
          picked. Color transitions from college to NFL team. Larger dots = bigger surprise.
          UDFA zone shows players who went undrafted.
        </p>
      </SidebarSection>
    </aside>
  );
}
