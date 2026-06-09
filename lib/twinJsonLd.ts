/**
 * lib/twinJsonLd.ts
 *
 * Piece 5 — JSON-LD for the crawlable-twin position pages.
 *
 * All three graphs are generated from the SAME data objects that render the
 * visible capsules/table (single source — markup and structured data can't drift).
 * Emitted in the initial server HTML so non-JS AI crawlers see them.
 */

import { APEX } from './twinConfig';
import type { Capsule } from './capsules';
import type { ClassMaturity } from './classMaturity';

// Graduated-state pages cite the underlying research. Draft-day pages do NOT emit it.
const SSRN_DOI = 'https://doi.org/10.2139/ssrn.5035307';

/** FAQPage from the rendered capsules' Q/A pairs (5 or 6, matching the page). */
export function buildFaqJsonLd(capsules: Capsule[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: capsules.map((c) => ({
      '@type': 'Question',
      name: c.question,
      acceptedAnswer: { '@type': 'Answer', text: c.answer },
    })),
  };
}

/** Dataset describing the consensus-vs-actual class data on the page. */
export function buildDatasetJsonLd(args: {
  year: number;
  position: string;
  pageUrl: string;
  maturity: ClassMaturity;
}): Record<string, unknown> {
  const { year, position, pageUrl, maturity } = args;
  const org = { '@type': 'Organization', name: 'DraftMap', url: APEX };

  const dataset: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${year} NFL Draft ${position} Class — Consensus vs. Actual`,
    description:
      `Pre-draft consensus rankings versus actual ${year} NFL Draft results for every ${position} ` +
      `in the class, including the delta between projected and actual draft position.`,
    variableMeasured: ['consensus rank', 'draft pick', 'delta'],
    creator: org,
    publisher: org,
    url: pageUrl,
  };

  // citation hook keyed to maturity — graduated only (not emitted for draft-day).
  if (maturity === 'graduated') {
    dataset.citation = SSRN_DOI;
  }

  return dataset;
}

/** BreadcrumbList: Draft → {year} → {POS}, absolute apex URLs. */
export function buildBreadcrumbJsonLd(args: {
  year: number;
  position: string;
  positionSlug: string;
}): Record<string, unknown> {
  const { year, position, positionSlug } = args;
  const yearUrl = `${APEX}/draft/${year}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Draft', item: yearUrl },
      { '@type': 'ListItem', position: 2, name: String(year), item: yearUrl },
      {
        '@type': 'ListItem',
        position: 3,
        name: position,
        item: `${yearUrl}/${positionSlug}`,
      },
    ],
  };
}
