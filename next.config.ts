import type { NextConfig } from 'next';

const isDevCommand =
  process.argv.includes('dev') || process.env.npm_lifecycle_event === 'dev';
const isVercel = process.env.VERCEL === '1';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  ...(isVercel
    ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]
    : []),
];

const nextConfig: NextConfig = {
  ...(isDevCommand ? { distDir: '.next-dev' } : {}),
  ...(isVercel ? {} : { output: 'standalone' as const }),
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
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
        headers: securityHeaders,
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
