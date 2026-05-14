"use client";
import type { ChartLayout, DotPosition } from "@/lib/chartMath";
import TierBands from "@/components/chart/TierBands";
import PlayerDots from "@/components/chart/PlayerDots";
import type { ViewMode } from "@/components/Sidebar";

interface Props {
  layout: ChartLayout;
  dotPositions: DotPosition[];
  viewMode: ViewMode;
  posLabel: string;
  posIdx: number;
  totalPositions: number;
  mobileView: "overview" | "zoomed";
  onPrev: () => void;
  onNext: () => void;
  onMiniMapTap: () => void;
}

// Mini-map: full chart rendered at tiny scale
function MiniMap({ layout, dotPositions, viewMode }: {
  layout: ChartLayout;
  dotPositions: DotPosition[];
  viewMode: ViewMode;
}) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${layout.svgW} ${layout.svgH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <TierBands layout={layout} />
      <PlayerDots
        dotPositions={dotPositions}
        liveMode={false}
        viewMode={viewMode}
        isAnimating={false}
        showLines={false}
        onDotClick={() => {}}
        onDotHover={() => {}}
        onDotLeave={() => {}}
      />
    </svg>
  );
}

export default function MobileTopBar({
  layout, dotPositions, viewMode,
  posLabel, posIdx, totalPositions,
  mobileView,
  onPrev, onNext, onMiniMapTap,
}: Props) {
  const atFirst = posIdx === 0;
  const atLast  = posIdx === totalPositions - 1;

  return (
    <div className="mb-top-bar">
      {/* Mini-map — tapping returns to overview */}
      <button
        className="mb-minimap-btn"
        onClick={onMiniMapTap}
        aria-label="View full chart overview"
        title="Full chart overview"
      >
        <MiniMap layout={layout} dotPositions={dotPositions} viewMode={viewMode} />
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
          <span className="mb-pos-label">{posLabel}</span>
          <button
            className="mb-chevron"
            onClick={onNext}
            disabled={atLast}
            aria-label="Next position"
          >›</button>
        </div>
      ) : (
        <div className="mb-pos-nav">
          <span className="mb-overview-label">All Positions</span>
        </div>
      )}

      {/* Right spacer so mini-map stays left-aligned */}
      <div style={{ width: 56, flexShrink: 0 }} />
    </div>
  );
}
