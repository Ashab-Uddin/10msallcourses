import { NextRequest, NextResponse } from 'next/server';
import { getCourseBySlug, recordCourseClick } from '@/src/db/repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const course = await getCourseBySlug(slug);

    if (!course) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const referrer = req.headers.get('referer') || 'direct';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Record click asynchronously
    recordCourseClick(slug, referrer, userAgent).catch(() => {});

    // Redirect directly to 10MS affiliate URL
    const targetUrl = course.affiliateUrl || 'https://10minuteschool.com';
    return NextResponse.redirect(targetUrl, 307);
  } catch (error) {
    console.error('Redirect failed:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
