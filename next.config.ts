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
  async redirects() {
    // Alias URLs -> single canonical URL (keeps canonicals, links and sitemap aligned)
    const alias = (source: string, destination: string) => ({
      source,
      destination,
      statusCode: 301 as const,
    });
    return [
      alias('/sitemap', '/sitemap.xml'),
      alias('/ssc/ssc-29', '/class-9'),
      alias('/academic/ssc/ssc-29', '/class-9'),
      alias('/ssc-29', '/class-9'),
      alias('/academic/class-9', '/class-9'),
      alias('/academic/class9', '/class-9'),
      alias('/academic', '/online-batch'),
      alias('/hsc', '/online-batch'),
      alias('/academic/hsc', '/online-batch'),
      alias('/hsc/hsc-28', '/online-batch'),
      alias('/academic/hsc/hsc-28', '/online-batch'),
      alias('/academic/hsc/:batch(hsc-26|hsc-27)', '/hsc/:batch'),
      alias('/ssc', '/ssc/ssc-27'),
      alias('/academic/ssc', '/ssc/ssc-27'),
      alias('/class-10', '/ssc/ssc-27'),
      alias('/academic/class-10', '/ssc/ssc-27'),
      alias('/academic/class10', '/ssc/ssc-27'),
      alias('/academic/ssc/:batch(ssc-27|ssc-28)', '/ssc/:batch'),
      alias('/academic/class-:n([5-8])', '/class-:n'),
      alias('/academic/class:n([5-8])', '/class-:n'),
      alias('/free', '/free-course'),
      alias('/free-courses', '/free-course'),
      alias('/book-store', '/books'),
      alias('/admission', '/programs/admission'),
    ];
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
        source: '/og/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, s-maxage=31536000, immutable',
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
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/og/course/:file',
          destination: '/api/og-course?file=:file',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
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
