import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "DraftMap — NFL Draft at a glance",
    template: "%s | DraftMap",
  },
  description:
    "NFL Draft analysis platform. Visual tools to find sleepers, spot depth cliffs, and understand draft value — without the talking heads.",
  metadataBase: new URL("https://draftmap.app"),
  openGraph: {
    type: "website",
    siteName: "DraftMap",
    title: "DraftMap — NFL Draft at a glance",
    description:
      "NFL Draft analysis platform. Visual tools to find sleepers, spot depth cliffs, and understand draft value.",
    url: "https://draftmap.app",
    // og:image added per-route via generateMetadata()
  },
  twitter: {
    card: "summary_large_image",
    site: "@nfldraftmap",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
