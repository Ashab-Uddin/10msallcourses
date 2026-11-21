import { NextRequest, NextResponse } from 'next/server';
import { getCourseBySlug } from '@/src/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    let cleanSlug = '';
    try {
      cleanSlug = decodeURIComponent(slug || '').trim();
    } catch {
      cleanSlug = (slug || '').trim();
    }
    const course = await getCourseBySlug(cleanSlug);
    if (!course) {
      return NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (error) {
    console.error('Public course fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}
