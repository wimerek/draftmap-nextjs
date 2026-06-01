"use client";
import { useEffect } from "react";

const HTR_STORAGE_KEY = "dm_htr_seen";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HowToReadModal({ open, onClose }: Props) {
  useEffect(() => {
    if (open) {
      localStorage.setItem(HTR_STORAGE_KEY, "1");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="dm-htr-overlay"
      onClick={onClose}
    >
      <div
        className="dm-htr-modal"
        onClick={e => e.stopPropagation()}
      >
        <button className="dm-htr-close" onClick={onClose}>✕</button>
        <h2 className="dm-htr-title">How to Read DraftMap</h2>
        <div className="dm-htr-points">
          <div className="dm-htr-point">
            <span className="dm-htr-icon" style={{ color: '#D4A017' }}>■</span>
            <div>
              <strong>Zones show career outcomes.</strong> Players rise into STARTER, ROLE PLAYER, or FRINGE based on how often they played vs. peers at their position. WASHED OUT = no longer in the league.
            </div>
          </div>
          <div className="dm-htr-point">
            <span className="dm-htr-icon">→</span>
            <div>
              <strong>The Journey Bar tells the story.</strong> Step through Draft Projections → Draft Results → individual seasons → career to watch a class develop over time.
            </div>
          </div>
          <div className="dm-htr-point">
            <span className="dm-htr-icon">⬤</span>
            <div>
              <strong>Dot size = performance surprise.</strong> In Draft Results, larger dots mean the player landed far from where they were projected — up or down.
            </div>
          </div>
          <div className="dm-htr-point">
            <span className="dm-htr-icon">🎨</span>
            <div>
              <strong>Dot color = team identity.</strong> Colors follow the player through their career — same color = loyalty, color change = trade or free agency.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { HTR_STORAGE_KEY };
