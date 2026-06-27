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
        // Land on the default landing year (DEFAULT_LANDING_YEAR in
        // lib/draftYears.ts — a resolved class, NOT the pending one). Edge-level
        // redirect avoids the RSC-variant cache bug from calling redirect() in
        // app/draft/page.tsx.
        // NOTE: This is a JS literal and can't import DEFAULT_LANDING_YEAR — when
        // that constant flips, update this destination by hand to match.
        // 307 (not 308): the default rotates each year, and a permanent redirect
        // is cached hard by browsers/Google and would not propagate on rotation.
        source: '/draft',
        destination: '/draft/2022',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
