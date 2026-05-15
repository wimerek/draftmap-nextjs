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

// Vertical gap between consecutive label groups (name + rank line)
const LABEL_GROUP_H = 26;
// Horizontal offset from dot center to label start/end
const DOT_OFFSET = 10;
// Estimated label width in SVG units (worst-case player name ~20 chars)
const LABEL_WIDTH_EST = 130;

export default function MobilePlayerLabels({
  dotPositions, currentPos, viewMode, viewBoxX, viewBoxW, viewBoxTop,
}: Props) {
  const viewBoxRight = viewBoxX + viewBoxW;

  // Scale font sizes to read at ~11px and ~10px on a standard 390px mobile screen
  const nameFontSize  = Math.round((11 / 390) * viewBoxW * 10) / 10;
  const infoFontSize  = Math.round((10 / 390) * viewBoxW * 10) / 10;

  // Filter to current position, compute active Y, sort top-to-bottom
  const dots = dotPositions
    .filter(d => d.player.pos === currentPos && (d.player.rank ?? 0) > 0)
    .map(d => ({
      player: d.player,
      x: d.x,
      cy: viewMode === "drafted" ? d.actualY : d.projectedY,
    }))
    .sort((a, b) => a.cy - b.cy);

  let lastLabelBottom = -Infinity;

  return (
    <g pointerEvents="none">
      {dots.map(({ player, x, cy }) => {
        // Skip dots above the visible area
        if (cy < viewBoxTop - 20) return null;

        // Determine left vs right placement
        const rightX = x + DOT_OFFSET;
        const goRight = rightX + LABEL_WIDTH_EST <= viewBoxRight;
        const labelX  = goRight ? rightX : x - DOT_OFFSET;
        const anchor  = goRight ? "start" : "end";

        // Collision avoidance: push label down if it would overlap previous group
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
              {player.school} | #{player.rank}
            </text>
          </g>
        );
      })}
    </g>
  );
}
