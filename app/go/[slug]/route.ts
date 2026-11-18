import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseBySlug,
  getPortalSettings,
  recordCourseClick,
} from '@/src/db/repository';
import { buildAffiliateRedirectUrl } from '@/src/lib/affiliateUrl';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const rate = await checkRateLimit(req, 'public_go_redirect', 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'অতিরিক্ত অনুরোধ করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.retryAfterSeconds),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const { slug } = await params;
    let cleanSlug = '';
    try {
      cleanSlug = decodeURIComponent(slug || '').trim();
    } catch {
      cleanSlug = (slug || '').trim();
    }

    if (!cleanSlug) {
      return NextResponse.redirect(new URL('/', req.url), 307);
    }

    const course = await getCourseBySlug(cleanSlug);

    // Block missing or inactive/closed courses from redirecting to checkout
    if (!course || course.status !== 'active') {
      return NextResponse.redirect(new URL('/', req.url), 307);
    }

    const referrer = req.headers.get('referer') || 'direct';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const settings = await getPortalSettings();

    // Await click recording so serverless runtimes (Vercel) do not drop the write
    await recordCourseClick(cleanSlug, referrer, userAgent).catch((err) => {
      console.error('Click tracking error on /go redirect:', err);
    });

    const targetUrl = buildAffiliateRedirectUrl(
      course.affiliateUrl,
      settings?.defaultAffiliateRef,
      req.nextUrl.searchParams
    );

    return NextResponse.redirect(targetUrl, {
      status: 307,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('Redirect failed:', error);
    return NextResponse.redirect(new URL('/', req.url), 307);
  }
}
