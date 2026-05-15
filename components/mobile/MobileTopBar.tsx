"use client";

interface Props {
  posLabel: string;
  posIdx: number;
  totalPositions: number;
  mobileView: "overview" | "zoomed";
  onPrev: () => void;
  onNext: () => void;
  onMiniMapTap: () => void;
}

export default function MobileTopBar({
  posLabel, posIdx, totalPositions,
  mobileView, onPrev, onNext, onMiniMapTap,
}: Props) {
  const atFirst = posIdx === 0;
  const atLast  = posIdx === totalPositions - 1;

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

      {/* Right spacer mirrors the minimap button width for centered nav */}
      <div style={{ width: 56, flexShrink: 0 }} />
    </div>
  );
}
