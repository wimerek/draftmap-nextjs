/**
 * components/twin/CapsuleStrip.tsx
 *
 * Piece 2 (render) — the six insight capsules, server-rendered HTML.
 * Each capsule's <h3> is the FAQPage question (same source as the JSON-LD), so
 * the visible copy and the structured data always match.
 */

import type { Capsule } from '@/lib/capsules';

const KICKERS: Record<string, string> = {
  steal: 'The Steal',
  conviction: 'The Conviction Pick',
  cliff: 'The Cliff',
  spend: 'The Spend',
  bet: 'The Bet',
  slipped: 'The One Who Slipped',
};

export default function CapsuleStrip({ capsules }: { capsules: Capsule[] }) {
  if (capsules.length === 0) return null;
  return (
    <section className="twin-capsules" aria-label="Class insights">
      {capsules.map((c) => (
        <article key={c.id} className="twin-capsule">
          <p className="twin-capsule__kicker">{KICKERS[c.id] ?? c.id}</p>
          <h3 className="twin-capsule__q">{c.question}</h3>
          <p className="twin-capsule__a">{c.answer}</p>
        </article>
      ))}
    </section>
  );
}
