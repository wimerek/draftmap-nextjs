"use client";
import { useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VALID_DRAFT_YEARS } from "@/lib/sheets";
import type { SidebarProps, ViewMode } from "@/components/Sidebar";

// Reusable segmented control for the drawer
function DrawerSegmented({
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
    viewMode, onViewModeChange,
    view, onViewChange,
    year, liveMode, onLiveModeToggle,
    showLines, onShowLinesToggle,
  } = sidebarProps;

  const router = useRouter();

  const handleYearChange = useCallback((y: number) => {
    if (y !== year) { onClose(); router.push(`/draft/${y}`); }
  }, [year, router, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Handle bar */}
      <div
        className="mb-handle-bar"
        onClick={open ? onClose : onOpen}
        role="button"
        aria-label={open ? "Close filters and options" : "Open filters and options"}
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") open ? onClose() : onOpen(); }}
      >
        <div className="mb-handle-pill" />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            className="mb-handle-chevron"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >∧</span>
          <span className="mb-handle-label">Filters &amp; Options</span>
        </div>
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
        <div className="mb-drawer-handle" style={{ position: "relative" }}>
          <div className="mb-drawer-handle-pill" />
          <button
            className="mb-drawer-done-btn"
            onClick={onClose}
            aria-label="Close filters"
          >Done</button>
        </div>

        {/* Brand row inside drawer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px 12px",
          borderBottom: "2px solid #D4A017",
        }}>
          <Image src="/brand/draftmap-mark.svg" alt="DraftMap" width={34} height={34} style={{ borderRadius: 4 }} />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: "#F5F0E8", lineHeight: 1 }}>DraftMap</div>
            <div style={{ fontSize: 10, color: "rgba(245,240,232,0.45)", fontStyle: "italic" }}>NFL Draft at a glance.</div>
          </div>
        </div>

        <div className="mb-drawer-content">
          {/* View Mode */}
          <DrawerSection label="View Mode">
            <DrawerSegmented
              value={viewMode}
              options={[{ value: "projected", label: "Projected" }, { value: "drafted", label: "Drafted" }]}
              onChange={v => onViewModeChange(v as ViewMode)}
            />
            <div className="sb-view-hint">
              {viewMode === "projected" ? "Derek's pre-draft board" : "Where players were actually picked"}
            </div>
          </DrawerSection>

          {/* Filters */}
          <DrawerSection label="Filters">
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
              <button className={`sb-live-btn${liveMode ? " active" : ""}`} onClick={onLiveModeToggle}>
                <span className="sb-live-dot" />
                Drafted Players
              </button>
              <div className="sb-field-hint">Greys out drafted players in Projected view</div>
            </div>
          </DrawerSection>

          {/* Map Display */}
          <DrawerSection label="Map Display">
            <div className="sb-field-group">
              <button className={`sb-toggle-btn${showLines ? " active" : ""}`} onClick={onShowLinesToggle}>
                <span className={`sb-toggle-dot${showLines ? " active" : ""}`} />
                Show Movement Lines
              </button>
              <div className="sb-field-hint">Display all projection-to-actual lines</div>
            </div>
          </DrawerSection>

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
              href={`/players?year=${year}`}
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
