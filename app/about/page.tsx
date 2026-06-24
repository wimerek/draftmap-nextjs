import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { fetchAboutFlows } from "@/lib/aboutFlows";
import RoundTierSankey from "@/components/about/RoundTierSankey";
import AboutRailNav from "@/components/about/AboutRailNav";

export const metadata: Metadata = {
  title: "About",
  description:
    "DraftMap is a map of the NFL Draft: what the consensus projected, how teams drafted, and what became of every pick — measured by the league's own signal, the second contract.",
  openGraph: {
    title: "About DraftMap",
    description:
      "Outside the first round, only about a third of drafted players ever get a real second contract: the league's own signal that a pick paid off.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// ISR — the flow aggregation is cached for a day in the data layer.
export const revalidate = 86400;

const heading = { fontFamily: "Oswald, sans-serif", fontWeight: 600, letterSpacing: "0.01em" } as const;

// Rail brand tokens.
const NAVY = "#0B2239";
const IVORY = "#F5F0E8";
const IVORY_MUTED = "rgba(245,240,232,0.5)";
const GOLD = "#D4A017";

export default async function AboutPage() {
  const flows = await fetchAboutFlows();

  return (
    <div className="flex min-h-screen bg-dm-bg text-dm-text">
      {/* ── Persistent navy left rail (desktop) ─────────────────────────────── */}
      <aside
        className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col px-6 py-7 md:flex"
        style={{ background: NAVY, color: IVORY }}
      >
        {/* Logo + tagline */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/draftmap-mark.svg"
            alt=""
            width={30}
            height={30}
            aria-hidden
            priority
          />
          <span
            className="text-[22px] leading-none"
            style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, color: IVORY }}
          >
            DraftMap
          </span>
        </div>
        <p
          className="mt-2 text-[10px] italic"
          style={{ fontFamily: "Inter, sans-serif", color: IVORY_MUTED }}
        >
          Projection. Selection. Outcome.
        </p>

        {/* Back to the map */}
        <Link
          href="/draft"
          className="mt-6 text-[13px] font-semibold transition-colors hover:text-[#D4A017]"
          style={{ color: IVORY }}
        >
          ← The map
        </Link>

        {/* Table of contents (scroll-spy client island) */}
        <AboutRailNav />

        {/* Base: contact + copyright */}
        <div className="mt-auto pt-8">
          <div className="flex items-center gap-3" style={{ color: IVORY }}>
            <a
              href="https://x.com/NFLDraftMap"
              target="_blank"
              rel="noopener"
              aria-label="DraftMap on X"
              className="transition-colors hover:text-[#D4A017]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://reddit.com/user/DraftMap"
              target="_blank"
              rel="noopener"
              aria-label="DraftMap on Reddit"
              className="transition-colors hover:text-[#D4A017]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
              </svg>
            </a>
            <a
              href="mailto:data@draftmap.app"
              aria-label="Email DraftMap"
              className="transition-colors hover:text-[#D4A017]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m2 7 10 6 10-6" />
              </svg>
            </a>
          </div>
          <Link
            href="/"
            className="mt-4 block text-[11px] transition-colors hover:text-[#D4A017]"
            style={{ color: IVORY_MUTED }}
          >
            © 2026 DraftMap · draftmap.app
          </Link>
        </div>
      </aside>

      {/* ── Narrow / mobile top bar (dormant under the 1280 viewport pin) ────── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 md:hidden"
        style={{ background: NAVY, color: IVORY }}
      >
        <div className="flex items-center gap-2">
          <Image src="/brand/draftmap-mark.svg" alt="" width={26} height={26} aria-hidden />
          <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, fontSize: 19 }}>
            DraftMap
          </span>
        </div>
        <Link href="/draft" className="text-[13px] font-semibold" style={{ color: IVORY }}>
          ← The map
        </Link>
      </header>

      {/* ── Main column — single, full main-width ───────────────────────────── */}
      <main className="min-w-0 flex-1 px-8 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-[900px]">
        {/* ① Hook (full width) — only slightly larger than the headers */}
        <section className="mb-12">
          <p
            className="mb-2"
            style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B07F0E" }}
          >
            The NFL Draft
          </p>
          <p className="text-dm-text leading-[1.18] text-[24px] sm:text-[28px]" style={heading}>
            Outside the first round, only about a third of drafted players ever
            receive substantial guaranteed money on a second contract: the
            league&rsquo;s own signal that a pick paid off.
          </p>
        </section>

        {/* ② Sankey — the hero, full main-width */}
        <section className="mb-16">
          <div className="rounded-lg border border-[#e2dac9] bg-dm-panel/60 p-4 sm:p-5">
            <RoundTierSankey flows={flows} />
          </div>
        </section>

        {/* ③ What-it-is — first row of the editorial grid; orientation key in the margin */}
        <section className="mb-16">
          <EditorialRow aside={<OrientationKey />}>
            <h2 id="what-is-draftmap" className="scroll-mt-24 mb-3 text-xl sm:text-2xl text-dm-text" style={heading}>
              What is DraftMap?
            </h2>
            <p className="text-base sm:text-lg text-[#2A3F50] leading-relaxed">
              DraftMap is a map of the NFL Draft. It lays out, in a single view, what the
              consensus projected, how teams actually drafted, and what became of every pick.
              You can take in a full class all at once and explore at your own pace.
            </p>
          </EditorialRow>
        </section>

        {/* ④ Narrative — editorial grid: prose + (mostly sparse) margin */}
        <section>
          {/* Why It Exists — margin intentionally clear (the "rest beat") */}
          <NarrativeSection id="why-it-exists" title="Why It Exists">
            <p>
              Leading up to the draft, the coverage piles up: rankings, mock
              drafts, profiles, takes, more rankings. And it starts earlier every
              year.
            </p>
            <p>Most of us tune out for a while just to clear our heads.</p>
            <p>
              What was missing was something visual. The eye naturally takes in a
              whole field faster than any list can.
            </p>
            <p>
              A way to run what-ifs. To see the cliffs where talent drops off. To
              follow along on draft day. To chase down the question you ask every
              year: whatever happened to the player your team passed on?
            </p>
            <p>That&rsquo;s why I built DraftMap.</p>
          </NarrativeSection>

          <NarrativeSection id="the-unexpected-challenge" title="The Unexpected Challenge" aside={<AlgorithmNote />}>
            <p>
              Visually painting the consensus rankings and the actual picks was the
              easy part.
            </p>
            <p>
              The hard part was everything after: measuring what each player became
              on the field against where he was drafted.
            </p>
            <p>
              There&rsquo;s no shortage of opinions, and I&rsquo;m no scout, so most
              are better than mine. But the honest truth is that even the scouts and
              front offices are guessing on draft night.
            </p>
            <p>
              So, underneath it all, one question kept surfacing: is there an
              objective measure of how a player actually performs on the field after being drafted?
            </p>
            <p>
              After all, the NFL season ends with a Super Bowl champion. One team
              left standing above every preseason ranking. Does the draft have an
              answer like that?
            </p>
          </NarrativeSection>

          {/* Letting the League Answer — method notes in the margin. */}
          <EditorialRow className="mb-12 last:mb-0" aside={<MethodNotes />}>
            <h2
              id="letting-the-league-answer"
              className="scroll-mt-24 mb-3 text-xl sm:text-2xl text-dm-text"
              style={heading}
            >
              Letting the League Answer
            </h2>
            <div className="space-y-4 text-base sm:text-lg text-[#2A3F50] leading-relaxed">
              <p>
                It does. And the answer, surprisingly, comes from the league itself.
              </p>
              <p>
                Part of it is playing time. A team can only field eleven men at once,
                so how often a draft pick plays isn&rsquo;t opinion. It&rsquo;s a
                deliberate decision by the coaching staff.
              </p>
              <p>
                But playing time only gets us halfway. Every team plays its best
                players, but some teams&rsquo; best are better than others.
              </p>
              <p>
                The full answer arrives when a player&rsquo;s rookie deal ends and the
                league&rsquo;s open market sets his value, in guaranteed money. Real
                dollars. Real cap space. Front office jobs on the line.
              </p>
              <p>
                Neither measure is perfect. But together they&rsquo;re the closest the
                sport has to an objective measure of a player&rsquo;s value.
              </p>
              <p>
                DraftMap normalizes both by position so they&rsquo;re comparable, and
                that&rsquo;s it.
              </p>
              <p>
                I&rsquo;m not asking you to trust my opinion, because I don&rsquo;t
                offer one. I just show you what the league decided.
              </p>
            </div>
          </EditorialRow>
        </section>

        {/* ⑤ Credibility band — full-width breakout pull-quote + Sources sidenote */}
        <section className="mt-16 border-t border-[#e2dac9] pt-10">
          {/* Heading + intro — on the page's editorial measure; Sources rides up
              beside the heading line. */}
          <EditorialRow aside={<SourcesNote />}>
            <h2 id="we-werent-the-only-ones" className="scroll-mt-24 text-xl sm:text-2xl text-dm-text" style={heading}>
              We Weren&rsquo;t the Only Ones
            </h2>
            <div className="mt-4 space-y-4 text-base sm:text-lg text-[#2A3F50] leading-relaxed">
              <p>
                While reasoning these concepts out on my own for DraftMap, I was stunned
                to learn that others had reached the same conclusion, only far more
                rigorously.
              </p>
              <p>
                Researchers led by Jason Merrick of Virginia Commonwealth University,
                with Wharton&rsquo;s Cade Massey among them, had landed on the same
                measure of true draft value: a player&rsquo;s second contract as a share
                of the cap. An NFL team had handed them twelve years of its private
                scouting data to work from. Their study is far more comprehensive than
                anything I could do, and Massey himself co-wrote &ldquo;The Loser&rsquo;s
                Curse,&rdquo; the foundational study of how teams overvalue their top
                draft picks.
              </p>
            </div>
          </EditorialRow>

          {/* Merrick pull-quote — bounded to the prose column (no aside), the
              section's "exhale" between the intro and the closing paragraph. */}
          <EditorialRow>
            <figure
              className="my-7 border-l-[3px] pl-5 w-full"
              style={{ borderColor: GOLD }}
            >
              <blockquote
                className="text-lg sm:text-xl leading-snug text-dm-text"
                style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500, fontStyle: "italic" }}
              >
                &ldquo;A player&rsquo;s first contract is based on draft position, so
                it&rsquo;s a prediction: how good a team thinks you&rsquo;ll be. But your
                second contract is based on your market value to the team, so it&rsquo;s an
                outcome.&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-dm-text-secondary">
                — Jason Merrick, Virginia Commonwealth University
              </figcaption>
            </figure>
          </EditorialRow>

          {/* Closing paragraph (de-linked prose), no aside. */}
          <EditorialRow>
            <div className="space-y-4 text-base sm:text-lg text-[#2A3F50] leading-relaxed">
              <p>
                For the details, I defer to their Wharton School research paper.
                It&rsquo;s exceptional, and well worth your time. (See also the VCU
                write-up.)
              </p>
            </div>
          </EditorialRow>
        </section>

        {/* ⑥ Get in Touch — founder photo + signature move into the gutter */}
        <EditorialRow
          className="mt-16 border-t border-[#e2dac9] pt-10"
          aside={
            <div className="flex flex-col items-start gap-3">
              {/* Founder photo + signature.
                  Default treatment is pure grayscale (shipped). To preview the soft
                  navy-duotone alternative in-browser, swap the filter below to:
                  filter: "grayscale(100%) sepia(40%) hue-rotate(175deg) saturate(180%) brightness(0.92)" */}
              <Image
                src="/brand/derek.png"
                alt="Derek, founder of DraftMap"
                width={66}
                height={66}
                className="object-cover"
                style={{
                  borderRadius: 9999,
                  filter: "grayscale(100%)",
                  boxShadow: "0 0 0 1px #e2dac9",
                }}
              />
              <span
                className="text-dm-text"
                style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500, fontStyle: "italic", fontSize: 20 }}
              >
                — Derek
              </span>
            </div>
          }
        >
          <h2 id="get-in-touch" className="scroll-mt-24 text-xl sm:text-2xl text-dm-text" style={heading}>
            Get in Touch
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#2A3F50] leading-relaxed">
            Have an idea, found a bug, or want to build something together? Reach me at{" "}
            <a
              href="mailto:data@draftmap.app"
              className="text-dm-text underline decoration-dm-accent decoration-2 underline-offset-2 hover:text-dm-accent transition-colors"
            >
              ✉ data@draftmap.app
            </a>
            . DraftMap is a labor of love, and I personally read every message.
          </p>

          <Link
            href="/draft"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-dm-accent px-6 py-3 text-base font-semibold text-dm-text shadow-sm transition-opacity hover:opacity-90"
          >
            Open the map →
          </Link>
        </EditorialRow>

        {/* ⑦ Footer copyright */}
        <footer className="mt-16 border-t border-[#e2dac9] pt-6 pb-4 max-w-[72ch]">
          <Link
            href="/"
            className="text-sm text-dm-text-secondary transition-colors hover:text-dm-text"
          >
            © 2026 DraftMap · draftmap.app
          </Link>
        </footer>
        </div>
      </main>
    </div>
  );
}

// ── Editorial grid ─────────────────────────────────────────────────────────
// Prose (≤68ch, left) + margin/aside (~232px, right) with a ~3rem gutter.
// Hero sections (hook + Sankey) sit OUTSIDE this grid; everything below uses it.
// The lg: breakpoint is defensive — if mobile mode is ever re-enabled the aside
// stacks below the prose. Margin content is never hidden.
function EditorialRow({
  aside,
  className = "",
  children,
}: {
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-y-3 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-x-10 lg:items-start ${className}`}
    >
      <div className="min-w-0">{children}</div>
      <aside className="lg:pt-1">{aside}</aside>
    </div>
  );
}

function NarrativeSection({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <EditorialRow className="mb-12 last:mb-0" aside={aside}>
      <h2 id={id} className="scroll-mt-24 mb-3 text-xl sm:text-2xl text-dm-text" style={heading}>
        {title}
      </h2>
      <div className="space-y-4 text-base sm:text-lg text-[#2A3F50] leading-relaxed">
        {children}
      </div>
    </EditorialRow>
  );
}

// ── Margin asides ──────────────────────────────────────────────────────────

// §What-is: the orientation key — a "connected rail" of I/II/III. Numerals,
// not colored dots, carry the structure; labels use the tagline words
// (Projection/Selection/Outcome), withholding the chart's act names.
function OrientationKey() {
  const rows = [
    { num: "I", label: "Projection", sub: "Where the consensus ranked them" },
    { num: "II", label: "Selection", sub: "Where teams drafted them" },
    { num: "III", label: "Outcome", sub: "What became of them" },
  ];
  return (
    <div>
      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9a7611", marginBottom: 10 }}>
        How to read it
      </p>
      <div className="relative">
        <div
          aria-hidden
          className="absolute"
          style={{ left: 8.75, top: 26, bottom: 26, width: 1.5, background: "#e3c98f", zIndex: 0 }}
        />
        {rows.map((r) => (
          <div key={r.num} className="flex items-center gap-2.5" style={{ height: 52 }}>
            <span
              className="relative flex shrink-0 items-center justify-center"
              style={{
                width: 21,
                height: 21,
                borderRadius: 9999,
                border: "1.5px solid #B8860B",
                background: IVORY,
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 10,
                color: "#9a7611",
                zIndex: 1,
              }}
            >
              {r.num}
            </span>
            <span className="min-w-0">
              <span
                className="block"
                style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, fontSize: 14, color: "#0B2239", lineHeight: 1.1 }}
              >
                {r.label}
              </span>
              <span
                className="block"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11.5, color: "#5a6b78", lineHeight: 1.25 }}
              >
                {r.sub}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// §Letting-the-league-answer: two method notes. Type only — no numerals
// (reserved for the acts), no icons, no color. ONE hairline between the items.
function MethodNotes() {
  return (
    <div>
      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9a7611" }}>
        The two measures
      </p>
      <div className="mt-3">
        <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, fontSize: 14, color: "#0B2239" }}>
          Playing time
        </p>
        <p className="mt-0.5" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11.5, color: "#5a6b78", lineHeight: 1.4 }}>
          A coaching decision, not opinion.
        </p>
      </div>
      <div className="my-3 border-t" style={{ borderColor: "#e2dac9" }} />
      <div>
        <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, fontSize: 14, color: "#0B2239" }}>
          Market value
        </p>
        <p className="mt-0.5" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11.5, color: "#5a6b78", lineHeight: 1.4 }}>
          Guaranteed money after the rookie deal.
        </p>
      </div>
      <p className="mt-3" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontStyle: "italic", fontSize: 11, color: "#9a7611" }}>
        Both normalized by position.
      </p>
    </div>
  );
}

// §We-werent-the-only-ones: the citations, moved out of the prose into a quiet
// Sources sidenote. Two entries, hairline between; gold-underline link style.
function SourcesNote() {
  const link =
    "underline decoration-dm-accent decoration-2 underline-offset-2 transition-opacity hover:opacity-70";
  return (
    <div>
      <p
        className="border-b pb-1.5"
        style={{ borderColor: "#e2dac9", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9a7611" }}
      >
        Sources
      </p>

      <div className="mt-3">
        <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, fontSize: 14, color: "#0B2239" }}>
          Merrick et al.
        </p>
        <p className="mt-0.5" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11.5, color: "#5a6b78", lineHeight: 1.4 }}>
          VCU &amp; Wharton &mdash; draft value &amp; the second contract.
        </p>
        <p className="mt-1.5" style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#9a7611", lineHeight: 1.5 }}>
          <a href="https://ssrn.com/abstract=5035307" target="_blank" rel="noopener" className={link}>
            SSRN 5035307
          </a>
          <span style={{ color: "#a99a78" }}> &middot; </span>
          <a href="https://news.vcu.edu/article/nfl-draft-statistical-modeling-research" target="_blank" rel="noopener" className={link}>
            VCU write-up
          </a>
        </p>
      </div>

      <div className="my-3 border-t" style={{ borderColor: "#e2dac9" }} />

      <div>
        <p style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, fontSize: 14, color: "#0B2239" }}>
          Massey &amp; Thaler
        </p>
        <p className="mt-0.5" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11.5, color: "#5a6b78", lineHeight: 1.4 }}>
          <span style={{ fontStyle: "italic" }}>The Loser&rsquo;s Curse</span> (2013).
        </p>
        <p className="mt-1.5" style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "#9a7611", lineHeight: 1.5 }}>
          <a href="https://ssrn.com/abstract=697121" target="_blank" rel="noopener" className={link}>
            SSRN 697121
          </a>
        </p>
      </div>
    </div>
  );
}

// §The-unexpected-challenge: a small margin note on measurement. Type + a quiet
// flowchart glyph (model inputs → a single output), then one diminished line
// ceding the contest to NFL front offices.
function AlgorithmNote() {
  return (
    <div>
      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9a7611", marginBottom: 10 }}>
        Measuring Performance
      </p>
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none" stroke="#0B2239" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", margin: "2px auto 0" }}>
        <rect x="24" y="5" width="16" height="11" rx="2.5" />
        <rect x="5" y="28" width="16" height="11" rx="2.5" />
        <rect x="43" y="28" width="16" height="11" rx="2.5" />
        <circle cx="32" cy="53" r="6.5" />
        <path d="M32,16 V22 M13,22 H51 M13,22 V28 M51,22 V28" />
        <path d="M13,39 V46 H32 M51,39 V46 H32 M32,46 V46.5" />
      </svg>
      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11.5, color: "#2A3F50", lineHeight: 1.5, marginTop: 10 }}>
        No algorithm beats an NFL front office. They have more firepower and more at stake than I&rsquo;ll ever have.
      </p>
    </div>
  );
}
