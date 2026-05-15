import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DraftChart from "@/components/DraftChart";
import { VALID_DRAFT_YEARS } from "@/lib/sheets";

interface Props {
  params: { year: string };
}

export async function generateStaticParams() {
  return VALID_DRAFT_YEARS.map((year) => ({ year: String(year) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = parseInt(params.year, 10);
  const validYears: readonly number[] = VALID_DRAFT_YEARS;
  if (!validYears.includes(year)) return {};

  return {
    title: `${year} NFL Draft Map`,
    description: `${year} NFL Draft chart — visualize every prospect by position, round, and tier. Spot depth cliffs and find sleepers.`,
    openGraph: {
      title: `${year} NFL Draft Map | DraftMap`,
      description: `Visual ${year} NFL Draft analysis. Every prospect charted by position and tier.`,
    },
    alternates: {
      canonical: `https://draftmap.app/draft/${year}`,
    },
  };
}

export default function DraftYearPage({ params }: Props) {
  const year = parseInt(params.year, 10);
  const validYears: readonly number[] = VALID_DRAFT_YEARS;

  if (!validYears.includes(year)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-dm-bg">
      <DraftChart year={year} />
    </main>
  );
}
