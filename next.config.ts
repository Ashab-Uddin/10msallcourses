import type { NextConfig } from 'next';

const isDevCommand =
  process.argv.includes('dev') || process.env.npm_lifecycle_event === 'dev';
const isVercel = process.env.VERCEL === '1';

const cspReportOnlyDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevCommand ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://ik.imagekit.io https://cdn.10minuteschool.com https://10minuteschool.com https://*.10minuteschool.com https://10mscourses.com https://*.10mscourses.com https://*.public.blob.vercel-storage.com https://res.cloudinary.com https://images.unsplash.com https://picsum.photos https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://upload.imagekit.io https://ik.imagekit.io",
  "media-src 'self' https://ik.imagekit.io https://cdn.10minuteschool.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isVercel ? ["frame-ancestors 'self'", 'upgrade-insecure-requests'] : []),
].join('; ');

const coreSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  ...(isVercel
    ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]
    : []),
];

const documentSecurityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: cspReportOnlyDirectives,
  },
];

const nextConfig: NextConfig = {
  ...(isDevCommand ? { distDir: '.next-dev' } : {}),
  ...(isVercel ? {} : { output: 'standalone' as const }),
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  htmlLimitedBots: /.*/,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.10minuteschool.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '10minuteschool.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.10minuteschool.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '10mscourses.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.10mscourses.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: coreSecurityHeaders,
      },
      {
        source: '/((?!api/).*)',
        headers: documentSecurityHeaders,
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/og-image.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/api/og/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'X-Robots-Tag',
            value: 'all',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
        ],
      },
    ];
  },
  transpilePackages: ['motion'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
  webpack: (config, { dev }) => {
    // Preserve DISABLE_HMR file watcher guard when explicitly enabled in preview environments.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
