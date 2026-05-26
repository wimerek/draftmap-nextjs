/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images from external domains can be added here when needed
  // images: { remotePatterns: [] },

  async redirects() {
    return [
      {
        // Land directly on the draft chart — landing page is just a hub.
        source: '/',
        destination: '/draft',
        permanent: true, // 308 — structure is settled, helps Google consolidate signal
      },
      {
        // Land on the current draft year. Edge-level redirect avoids the
        // RSC-variant cache bug from calling redirect() in app/draft/page.tsx.
        // NOTE: When CURRENT_DRAFT_YEAR flips (lib/sheets.ts), update this too.
        source: '/draft',
        destination: '/draft/2026',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
