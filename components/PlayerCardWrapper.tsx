'use client'

import Link from 'next/link'
import Image from 'next/image'
import PlayerCard from '@/components/PlayerCard'
import posthog, { POSTHOG_KEY } from '@/lib/posthog'
import type { Player } from '@/lib/sheets'

interface Props {
  player: Player
  players: Player[]
  /** CTA + meta-link destination. Computed server-side by journeyHrefFor() in page.tsx. */
  journeyHref: string
  /** Route slug — analytics property only. */
  slug: string
}

// Guarded capture — same shape as DraftChart.tsx:2488-2491 (no-op without PostHog).
function capture(event: string, props: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  try { posthog.capture(event, props) } catch { /* analytics best-effort */ }
}

export default function PlayerCardWrapper({ player, players, journeyHref, slug }: Props) {
  const ctaTitle = `See ${player.name} on the ${player.draft_year} draft map`
  const ctaSub = 'The board · Draft day · 4 years later'
  const onCta = (placement: 'mast' | 'foot') => () =>
    capture('player_page_cta', { placement, slug, href: journeyHref })

  // The arrow lives in its own span: Oswald's Google subset has no U+2192, so it must
  // fall to Inter deliberately rather than to the UA sans-serif by accident.
  const cta = (placement: 'mast' | 'foot') => (
    <Link href={journeyHref} className="pcm-standalone-cta" onClick={onCta(placement)}>
      <span className="pcm-standalone-cta-title">
        {ctaTitle} <span className="pcm-standalone-cta-arrow" aria-hidden="true">{'→'}</span>
      </span>
      <span className="pcm-standalone-cta-sub">{ctaSub}</span>
    </Link>
  )

  return (
    <div
      className="pcm-standalone-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '32px 16px 64px',
        background: '#0B2239',
      }}
    >
      <header className="pcm-standalone-mast">
        <Link href="/draft" className="pcm-standalone-brand" aria-label="DraftMap — the draft map">
          <Image
            src="/brand/draftmap-mark.svg"
            alt=""
            width={30}
            height={30}
            className="pcm-standalone-mark"
            aria-hidden
          />
          <span className="pcm-standalone-brand-name">DraftMap</span>
        </Link>
        {cta('mast')}
      </header>

      <PlayerCard
        player={player}
        players={players}
        onClose={() => {}}
        isMobile={false}
        currentStepId="career"
        standalone
        journeyHref={journeyHref}
      />

      <footer className="pcm-standalone-foot">
        {cta('foot')}
        <Link href="/players" className="pcm-standalone-all">All players</Link>
      </footer>
    </div>
  )
}
