"use client";
import type { ViewMode } from "@/components/Sidebar";

interface Props {
  posLabel: string;
  posIdx: number;
  totalPositions: number;
  mobileView: "overview" | "zoomed";
  viewMode: ViewMode;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  onMiniMapTap: () => void;
}

export default function MobileTopBar({
  posLabel, posIdx, totalPositions,
  mobileView, viewMode, year,
  onPrev, onNext, onMiniMapTap,
}: Props) {
  const atFirst = posIdx === 0;
  const atLast  = posIdx === totalPositions - 1;
  const subtitle = viewMode === "drafted" ? `${year} Draft Results` : "Consensus Rankings";

  return (
    <div className="mb-top-bar">
      {/* Map icon button — tapping returns to full chart overview */}
      <button
        className="mb-minimap-btn"
        onClick={onMiniMapTap}
        aria-label="View full chart overview"
        title="Full chart overview"
      >
        🗺
      </button>

      {/* Position navigator or overview label */}
      {mobileView === "zoomed" ? (
        <div className="mb-pos-nav">
          <button
            className="mb-chevron"
            onClick={onPrev}
            disabled={atFirst}
            aria-label="Previous position"
          >‹</button>
          <div className="mb-pos-nav-center">
            <span className="mb-pos-label">{posLabel}</span>
            <span className="mb-pos-subtitle">{subtitle}</span>
          </div>
          <button
            className="mb-chevron"
            onClick={onNext}
            disabled={atLast}
            aria-label="Next position"
          >›</button>
        </div>
      ) : (
        <div className="mb-pos-nav">
          <div className="mb-pos-nav-center">
            <span className="mb-overview-label">All Positions</span>
            <span className="mb-pos-subtitle">{subtitle}</span>
          </div>
        </div>
      )}

      {/* Right spacer mirrors the minimap button width for centered nav */}
      <div style={{ width: 56, flexShrink: 0 }} />
    </div>
  );
}
