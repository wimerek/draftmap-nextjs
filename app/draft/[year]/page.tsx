import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DraftChart from "@/components/DraftChart";

interface Props {
  params: { year: string };
}

// Valid historical years we have data for
const VALID_YEARS = [2023, 2024, 2025, 2026];

export async function generateStaticParams() {
  return VALID_YEARS.map((year) => ({ year: String(year) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = parseInt(params.year, 10);
  if (!VALID_YEARS.includes(year)) return {};

  return {
    title: `${year} NFL Draft Map`,
    description: `${year} NFL Draft chart — visualize every prospect by position, round, and tier.`,
    openGraph: {
      title: `${year} NFL Draft Map | DraftMap`,
      description: `Visual ${year} NFL Draft analysis. Every prospect charted by position and tier.`,
    },
  };
}

export default function DraftYearPage({ params }: Props) {
  const year = parseInt(params.year, 10);

  if (!VALID_YEARS.includes(year)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-dm-bg">
      <DraftChart year={year} />
    </main>
  );
}
