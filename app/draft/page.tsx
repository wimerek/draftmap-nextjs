import type { Metadata } from "next";
import DraftChart from "@/components/DraftChart";

export const metadata: Metadata = {
  title: "2026 NFL Draft Map",
  description:
    "2026 NFL Draft chart — visualize every prospect by position, round, and tier. Spot depth cliffs and find sleepers.",
  openGraph: {
    title: "2026 NFL Draft Map | DraftMap",
    description:
      "Visual 2026 NFL Draft analysis. Every prospect charted by position and tier.",
  },
};

export default function DraftPage() {
  return (
    <main className="min-h-screen bg-dm-bg">
      {/*
        Chart does not render yet — scaffold only.
        DraftChart.tsx will be the useRef wrapper around the existing JS chart.
        Data will be fetched client-side from /api/draft.
      */}
      <DraftChart year={2026} />
    </main>
  );
}
