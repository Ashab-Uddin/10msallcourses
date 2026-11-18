import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from './src/lib/csrf';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/admin') && MUTATING_METHODS.has(req.method.toUpperCase())) {
    if (!isSameOriginMutation(req)) {
      return NextResponse.json(
        { error: 'Cross-site request blocked by CSRF protection.' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'private, no-store, max-age=0',
            'X-Robots-Tag': 'noindex, nofollow, noarchive',
          },
        }
      );
    }
  }

  const res = NextResponse.next();
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
