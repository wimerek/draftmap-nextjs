import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import DraftChart from '@/components/DraftChart';
import PositionNavStrip from '@/components/twin/PositionNavStrip';
import CapsuleStrip from '@/components/twin/CapsuleStrip';
import ClassTable from '@/components/twin/ClassTable';

import { fetchPlayers } from '@/lib/sheets';
import {
  SUPPORTED_TWIN_YEARS,
  POSITION_SLUGS,
  slugToPosition,
  positionToSlug,
  isSupportedTwinYear,
  APEX,
} from '@/lib/twinConfig';
import { getClassMaturity } from '@/lib/classMaturity';
import { prepPositionClass } from '@/lib/twinData';
import { computeCapsules, type SpendBaselineEntry } from '@/lib/capsules';
import { buildClassTable, getTableColumns } from '@/lib/classTable';
import { buildFaqJsonLd, buildDatasetJsonLd, buildBreadcrumbJsonLd } from '@/lib/twinJsonLd';
import spendBaseline from '@/data/position_spend_baseline.json';

// ISR — see the Vercel build-timeout lesson (2026-06-02, /players/[slug]).
// generateStaticParams returns 2026 × 11 only; pages render/refresh via ISR.
export const revalidate = 3600;

interface Props {
  params: { year: string; position: string };
}

const BASELINE = spendBaseline.positions as Record<string, SpendBaselineEntry>;

export function generateStaticParams() {
  return SUPPORTED_TWIN_YEARS.flatMap((year) =>
    POSITION_SLUGS.map((position) => ({ year: String(year), position })),
  );
}

/** Resolve + validate params, fetch the class, and compute everything the page needs. */
async function loadTwin(yearStr: string, positionSlug: string) {
  const year = parseInt(yearStr, 10);
  if (!Number.isInteger(year) || !isSupportedTwinYear(year)) return null;

  const position = slugToPosition(positionSlug);
  if (!position) return null;

  const players = await fetchPlayers(year);
  const prep = prepPositionClass(players, position);
  const maturity = getClassMaturity(year);
  const baseline = BASELINE[position];

  const capsules = computeCapsules({ prep, position, year, baseline, maturity });
  const { drafted, udfa } = buildClassTable(prep, position);
  const columns = getTableColumns(maturity);

  return { year, position, positionSlug, prep, maturity, capsules, drafted, udfa, columns };
}

function truncate(text: string, max = 150): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadTwin(params.year, params.position);
  if (!data) return {};

  const { year, position, positionSlug, capsules } = data;
  const steal = capsules.find((c) => c.id === 'steal');
  const description = steal
    ? truncate(steal.answer)
    : `Consensus pre-draft rankings versus actual ${year} NFL Draft results for every ${position}.`;

  return {
    title: `${year} NFL Draft ${position} Class | DraftMap`,
    description,
    alternates: {
      canonical: `${APEX}/draft/${year}/${positionSlug}`,
    },
  };
}

export default async function PositionTwinPage({ params }: Props) {
  const data = await loadTwin(params.year, params.position);
  if (!data) notFound();

  const { year, position, positionSlug, maturity, capsules, drafted, udfa, columns } = data;
  const pageUrl = `${APEX}/draft/${year}/${positionSlug}`;

  const faq = buildFaqJsonLd(capsules);
  const dataset = buildDatasetJsonLd({ year, position, pageUrl, maturity });
  const breadcrumb = buildBreadcrumbJsonLd({ year, position, positionSlug });

  return (
    <main className="twin-page">
      {/* ── JSON-LD (Piece 5) — in the initial HTML, from the same data as the markup ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="twin-header">
        <h1 className="twin-title">
          {year} NFL Draft {position} Class
        </h1>
        <p className="twin-subtitle">Consensus board vs. draft day: the full {position} class, charted.</p>
      </header>

      {/* ── Chart (position-filtered, draft-results state) ── */}
      <section className="twin-chart" aria-label={`${year} ${position} draft chart`}>
        <Suspense fallback={null}>
          <DraftChart year={year} initialPosition={position} initialStepId="draft" />
        </Suspense>
      </section>

      {/* ── Position nav strip (crawlable internal mesh) ── */}
      <PositionNavStrip year={year} current={position} />

      {/* ── Capsule strip ── */}
      <CapsuleStrip capsules={capsules} />

      {/* ── Data table ── */}
      <ClassTable columns={columns} drafted={drafted} udfa={udfa} position={position} year={year} />
    </main>
  );
}
