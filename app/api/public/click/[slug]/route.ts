import { NextRequest, NextResponse } from 'next/server';
import { recordCourseClick } from '@/src/db/repository';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const rate = await checkRateLimit(req, 'public_click', 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();
    if (!cleanSlug) {
      return NextResponse.json({ ok: false, error: 'Invalid course slug' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const referrer =
      typeof body?.referrer === 'string'
        ? body.referrer
        : req.headers.get('referer') || null;
    const userAgent =
      typeof body?.userAgent === 'string'
        ? body.userAgent
        : req.headers.get('user-agent') || null;

    const record = await recordCourseClick(cleanSlug, referrer, userAgent);
    if (!record) {
      return NextResponse.json({ ok: false, error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    console.error('Click record failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
