import { NextRequest, NextResponse } from 'next/server';
import { recordCourseClick } from '@/src/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const referrer = body.referrer || req.headers.get('referer') || null;
    const userAgent = body.userAgent || req.headers.get('user-agent') || null;

    const record = await recordCourseClick(slug, referrer, userAgent);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    console.error('Click record failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
