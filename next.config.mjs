/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images from external domains can be added here when needed
  // images: { remotePatterns: [] },

  async redirects() {
    return [
      {
        // Land directly on the draft chart — landing page is just a hub.
        // Deploy this after dot-size fixes are confirmed in production.
        source: '/',
        destination: '/draft',
        permanent: false, // 307 — flip to true (308) once structure is settled
      },
    ];
  },
};

export default nextConfig;
