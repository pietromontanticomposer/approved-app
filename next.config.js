/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable type checking in production builds to catch errors early
    ignoreBuildErrors: false,
  },
  eslint: {
    // Still run eslint during builds to catch issues
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        source: '/flow.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
