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
      // Collision slugs. buildSlugMap suffixes BOTH players when a base name collides,
      // so the bare slug resolves to nobody and 404s. Rule: send it to whichever player
      // was drafted higher (undrafted last) — data-driven, no editorial call. 308 because
      // the assignment is structural and stable; unlike /draft above, these do not rotate.
      // JS literal, can't import the slug map — re-check when a class is added.
      { source: '/players/justin-jefferson', destination: '/players/justin-jefferson-wr', permanent: true },
      { source: '/players/cam-smith',        destination: '/players/cam-smith-cb',        permanent: true },
      { source: '/players/nick-martin',      destination: '/players/nick-martin-iol',     permanent: true },
      { source: '/players/marcus-allen',     destination: '/players/marcus-allen-s',      permanent: true },
    ];
  },
};

export default nextConfig;
