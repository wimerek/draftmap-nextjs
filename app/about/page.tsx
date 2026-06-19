import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "About DraftMap — visual NFL Draft analysis. See depth by position, spot talent cliffs, and find sleepers.",
};

// Brief 1, Piece 6 — minimal stub. Real content lands in a later session.
export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-dm-bg px-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-4xl font-condensed font-bold text-dm-text tracking-tight">
          About DraftMap
        </h1>
        <p className="text-lg text-dm-text-secondary">
          The NFL Draft at a glance — depth by position, talent cliffs, and sleepers.
          More on the story behind the map is coming soon.
        </p>
        <Link
          href="/draft"
          className="inline-block text-dm-accent font-semibold hover:opacity-90 transition-opacity"
        >
          ← Back to the map
        </Link>
      </div>
    </main>
  );
}
