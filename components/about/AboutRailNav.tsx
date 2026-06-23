'use client';

/**
 * components/about/AboutRailNav.tsx
 *
 * The navy rail's table-of-contents. Anchor links work WITHOUT JS (progressive
 * enhancement); JS only adds the gold "active section" highlight via an
 * IntersectionObserver watching each section <h2>. Everything else in the rail
 * (logo, contact, copyright) stays server-rendered in app/about/page.tsx.
 */

import { useEffect, useState } from 'react';

const GOLD = '#D4A017';
const IVORY_MUTED = 'rgba(245,240,232,0.62)';

/** Must match the id + label of each section <h2> in page.tsx. */
export const ABOUT_SECTIONS: Array<{ id: string; label: string }> = [
  { id: 'what-is-draftmap', label: 'What is DraftMap?' },
  { id: 'why-it-exists', label: 'Why It Exists' },
  { id: 'the-unexpected-challenge', label: 'The Unexpected Challenge' },
  { id: 'letting-the-league-answer', label: 'Letting the League Answer' },
  { id: 'we-werent-the-only-ones', label: "We Weren't the Only Ones" },
  { id: 'get-in-touch', label: 'Get in Touch' },
];

export default function AboutRailNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = ABOUT_SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // Light up the section whose heading is nearest the top of the viewport.
    // rootMargin pulls the trigger line up so a section activates once it has
    // scrolled into the upper portion of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -65% 0px', threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="On this page" className="mt-7">
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-2.5">
        {ABOUT_SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? 'true' : undefined}
                className="block text-[13px] leading-snug transition-colors hover:text-[#F5F0E8]"
                style={{
                  color: isActive ? GOLD : IVORY_MUTED,
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: `2px solid ${isActive ? GOLD : 'transparent'}`,
                  paddingLeft: 10,
                  marginLeft: -12,
                }}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
