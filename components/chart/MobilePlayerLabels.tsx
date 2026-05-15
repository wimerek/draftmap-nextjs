"use client";
import type { DotPosition } from "@/lib/chartMath";
import type { ViewMode } from "@/components/Sidebar";

interface Props {
  dotPositions: DotPosition[];
  currentPos: string;
  viewMode: ViewMode;
  viewBoxX: number;
  viewBoxW: number;
  viewBoxTop: number;
}

const DOT_OFFSET = 10;
const LABEL_WIDTH_EST = 130;
const CLUSTER_THRESHOLD = 40;

export default function MobilePlayerLabels({
  dotPositions, currentPos, viewMode, viewBoxX, viewBoxW, viewBoxTop,
}: Props) {
  const viewBoxRight = viewBoxX + viewBoxW;

  const nameFontSize = Math.round((11 / 390) * viewBoxW * 10) / 10;

  // Active dots for current position, sorted top-to-bottom by current Y
  const dots = dotPositions
    .filter(d => d.player.pos === currentPos && (d.player.rank ?? 0) > 0)
    .map(d => ({
      player: d.player,
      x: d.x,
      cy: viewMode === "drafted" ? d.actualY : d.projectedY,
    }))
    .sort((a, b) => a.cy - b.cy);

  // Suppress labels for dots that have any neighbor within CLUSTER_THRESHOLD px
  const suppressedIds = new Set<string>();
  for (let i = 0; i < dots.length; i++) {
    for (let j = 0; j < dots.length; j++) {
      if (i === j) continue;
      if (Math.abs(dots[i].cy - dots[j].cy) < CLUSTER_THRESHOLD) {
        suppressedIds.add(dots[i].player.player_id);
        break;
      }
    }
  }

  return (
    <g pointerEvents="none">
      {dots.map(({ player, x, cy }) => {
        if (cy < viewBoxTop - 20) return null;
        if (suppressedIds.has(player.player_id)) return null;

        const rightX = x + DOT_OFFSET;
        const goRight = rightX + LABEL_WIDTH_EST <= viewBoxRight;
        const labelX  = goRight ? rightX : x - DOT_OFFSET;
        const anchor  = goRight ? "start" : "end";
        const labelY  = cy - nameFontSize * 0.4;

        return (
          <text
            key={player.player_id}
            x={labelX} y={labelY}
            textAnchor={anchor}
            fontSize={nameFontSize}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
            fill="#0B2239"
          >
            {player.name}
          </text>
        );
      })}
    </g>
  );
}
