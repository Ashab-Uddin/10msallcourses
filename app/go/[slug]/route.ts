import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseBySlug,
  getPortalSettings,
  recordCourseClick,
} from '@/src/db/repository';
import { buildAffiliateRedirectUrl } from '@/src/lib/affiliateUrl';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const course = await getCourseBySlug(slug);

    // Block missing or inactive/closed courses from redirecting to checkout
    if (!course || course.status !== 'active') {
      return NextResponse.redirect(new URL('/', req.url), 307);
    }

    const referrer = req.headers.get('referer') || 'direct';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const settings = await getPortalSettings();

    // Await click recording so serverless runtimes (Vercel) do not drop the write
    await recordCourseClick(slug, referrer, userAgent).catch((err) => {
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
