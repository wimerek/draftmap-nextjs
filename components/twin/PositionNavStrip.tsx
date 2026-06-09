/**
 * components/twin/PositionNavStrip.tsx
 *
 * Piece 5 (nav) — server-rendered text links to all 11 sibling position pages.
 * This is the crawlable internal mesh: present in the initial HTML, no JS needed.
 * The current position is bold and non-linked.
 */

import Link from 'next/link';
import { POSITION_ORDER } from '@/lib/chartConstants';
import { positionToSlug } from '@/lib/twinConfig';

interface Props {
  year: number;
  /** Canonical position token of the current page, e.g. "WR". */
  current: string;
}

export default function PositionNavStrip({ year, current }: Props) {
  return (
    <nav className="twin-nav" aria-label="NFL Draft positions">
      {POSITION_ORDER.map((pos) =>
        pos === current ? (
          <span key={pos} className="twin-nav__item twin-nav__item--current" aria-current="page">
            {pos}
          </span>
        ) : (
          <Link key={pos} href={`/draft/${year}/${positionToSlug(pos)}`} className="twin-nav__item">
            {pos}
          </Link>
        ),
      )}
    </nav>
  );
}
