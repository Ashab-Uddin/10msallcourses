import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from './src/lib/csrf';
import { decodeCourseSlug, isReservedCategorySlug } from './src/lib/courseSlug';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 301 Permanent Redirect from legacy /category/{slug} and /categories/{slug} to /{slug}
  if (
    pathname === '/category' ||
    pathname === '/category/' ||
    pathname.startsWith('/category/') ||
    pathname === '/categories' ||
    pathname === '/categories/' ||
    pathname.startsWith('/categories/')
  ) {
    const rawRest = pathname.replace(/^\/categor(?:y|ies)\/?/i, '');
    const rawSegment = rawRest.split('/')[0] || '';
    const decoded = decodeCourseSlug(rawSegment)
      .normalize('NFC')
      .replace(/[\s]+/g, '-')
      .replace(/^\/+|\/+$/g, '');

    if (decoded.toLowerCase() === 'admission') {
      return NextResponse.redirect(new URL(`/programs/admission${search || ''}`, req.url), 301);
    }
    if (decoded && !isReservedCategorySlug(decoded)) {
      const canonicalPath = `/${encodeURIComponent(decoded)}${search || ''}`;
      return NextResponse.redirect(new URL(canonicalPath, req.url), 301);
    }
    return NextResponse.redirect(new URL(`/${search || ''}`, req.url), 301);
  }

  // 301 Redirect malformed/double-encoded or trailing-slash legacy course URLs to clean canonical path
  if (pathname.startsWith('/courses/')) {
    const rawSegment = pathname.slice('/courses/'.length);
    const hasTrailingSlash = rawSegment.endsWith('/') && rawSegment.length > 1;
    const cleanRawSegment = rawSegment.replace(/\/+$/, '');
    const isDoubleEncoded = /%25[0-9a-fA-F]{2}/.test(cleanRawSegment);

    if (isDoubleEncoded || hasTrailingSlash) {
      const decoded = decodeCourseSlug(cleanRawSegment);
      if (decoded) {
        const canonicalPath = `/courses/${encodeURIComponent(decoded)}${search || ''}`;
        return NextResponse.redirect(new URL(canonicalPath, req.url), 301);
      }
    }
    return NextResponse.next();
  }

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
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/courses/:path*',
    '/category',
    '/category/:path*',
    '/categories',
    '/categories/:path*',
  ],
};
