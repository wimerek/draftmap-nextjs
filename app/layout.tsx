import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import PostHogProvider from "@/components/PostHogProvider";

export const metadata: Metadata = {
  title: {
    default: "DraftMap | NFL Draft analysis",
    template: "%s | DraftMap",
  },
  description:
    "NFL Draft analysis platform. Visual tools to chart prospects by position and round, surface positional depth and talent cliffs, and weigh draft value.",
  metadataBase: new URL("https://draftmap.app"),
  openGraph: {
    type: "website",
    siteName: "DraftMap",
    title: "DraftMap | NFL Draft analysis",
    description:
      "Visual tools to chart NFL Draft prospects by position and round, surface depth and talent cliffs, and weigh draft value.",
    url: "https://draftmap.app",
    // og:image added per-route via generateMetadata()
  },
  twitter: {
    card: "summary_large_image",
    site: "@nfldraftmap",
  },
};

export const viewport: Viewport = {
  width: 1280,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
        {/* Microsoft Clarity — session replay / heatmaps (project xdbjz6otce). */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","xdbjz6otce");`}
        </Script>
      </body>
    </html>
  );
}
