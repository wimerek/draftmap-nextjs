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

const LABEL_GROUP_H = 26;
const DOT_OFFSET = 10;
const LABEL_WIDTH_EST = 130;

export default function MobilePlayerLabels({
  dotPositions, currentPos, viewMode, viewBoxX, viewBoxW, viewBoxTop,
}: Props) {
  const viewBoxRight = viewBoxX + viewBoxW;

  const nameFontSize  = Math.round((11 / 390) * viewBoxW * 10) / 10;
  const infoFontSize  = Math.round((10 / 390) * viewBoxW * 10) / 10;

  // Build position rank map: sort players by overall rank within position, assign 1-based index.
  const positionRankMap = new Map<string, number>();
  const sortedByRank = dotPositions
    .filter(d => d.player.pos === currentPos && (d.player.rank ?? 0) > 0)
    .sort((a, b) => (a.player.rank ?? 0) - (b.player.rank ?? 0));
  sortedByRank.forEach((d, idx) => {
    positionRankMap.set(d.player.player_id, idx + 1);
  });

  // Active dots for current position, sorted top-to-bottom by current Y
  const dots = dotPositions
    .filter(d => d.player.pos === currentPos && (d.player.rank ?? 0) > 0)
    .map(d => ({
      player: d.player,
      x: d.x,
      cy: viewMode === "drafted" ? d.actualY : d.projectedY,
      posRank: positionRankMap.get(d.player.player_id) ?? 0,
    }))
    .sort((a, b) => a.cy - b.cy);

  let lastLabelBottom = -Infinity;

  return (
    <g pointerEvents="none">
      {dots.map(({ player, x, cy, posRank }) => {
        if (cy < viewBoxTop - 20) return null;

        const rightX = x + DOT_OFFSET;
        const goRight = rightX + LABEL_WIDTH_EST <= viewBoxRight;
        const labelX  = goRight ? rightX : x - DOT_OFFSET;
        const anchor  = goRight ? "start" : "end";

        let labelY = cy - nameFontSize * 0.4;
        if (labelY < lastLabelBottom + 4) {
          labelY = lastLabelBottom + 4;
        }
        lastLabelBottom = labelY + LABEL_GROUP_H;

        const infoY = labelY + nameFontSize + 2;

        return (
          <g key={player.player_id}>
            <text
              x={labelX} y={labelY}
              textAnchor={anchor}
              fontSize={nameFontSize}
              fontWeight={700}
              fontFamily="Inter, system-ui, sans-serif"
              fill="#0B2239"
            >
              {player.name}
            </text>
            <text
              x={labelX} y={infoY}
              textAnchor={anchor}
              fontSize={infoFontSize}
              fontWeight={400}
              fontFamily="Inter, system-ui, sans-serif"
              fill="#4A6274"
            >
              #{posRank}
            </text>
          </g>
        );
      })}
    </g>
  );
}
