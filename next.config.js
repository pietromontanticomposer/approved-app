/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable type checking in production builds to catch errors early
    ignoreBuildErrors: false,
  },
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
  },
  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  async headers() {
    return [
      // ── Security headers applied to every response ──────────────────────
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Reflected XSS filter (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Don't send Referer to cross-origin destinations
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS — enforce HTTPS for 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Disable unnecessary browser features
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
      {
        source: '/flow.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache API responses that are safe to cache
      {
        source: '/api/projects/full',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=0, stale-while-revalidate=30',
          },
        ],
      },
      // Cache media streaming with long TTL
      {
        source: '/api/media/stream',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache i18n and other static JS
      {
        source: '/i18n.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/flow-auth.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/flow-init.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/share-handler.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
