import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DraftMap | NFL Draft, charted from projection to outcome",
  description:
    "Visual NFL draft analysis. Every prospect charted by position, round, and tier, with positional depth and talent cliffs made plain.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-dm-bg px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo / wordmark placeholder */}
        <div className="space-y-2">
          <h1 className="text-5xl font-condensed font-bold text-dm-text tracking-tight">
            DraftMap
          </h1>
          <p className="text-lg text-dm-text-secondary">
            NFL Draft: Projection. Selection. Outcome.
          </p>
        </div>

        {/* Primary CTA */}
        <Link
          href="/draft"
          className="inline-block bg-dm-accent text-dm-bg font-semibold text-lg px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Open Draft Map →
        </Link>

        {/* Secondary nav */}
        <nav className="flex justify-center gap-6 text-dm-text-secondary text-sm">
          <Link href="/draft" className="hover:text-dm-text transition-colors">
            Draft Chart
          </Link>
          <Link href="/players" className="hover:text-dm-text transition-colors">
            Players
          </Link>
        </nav>
      </div>
    </main>
  );
}
