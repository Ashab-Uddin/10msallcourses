import { NextRequest, NextResponse } from 'next/server';
import { recordBookClick } from '@/src/db/bookRepository';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rate = await checkRateLimit(req, 'public_book_click', 60, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  try {
    const { slug } = await params;
    let cleanSlug = '';
    try {
      cleanSlug = decodeURIComponent(slug || '').trim();
    } catch {
      cleanSlug = (slug || '').trim();
    }

    if (!cleanSlug) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const clickCount = await recordBookClick(cleanSlug);
    return NextResponse.json(
      { ok: true, clickCount },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[POST /api/public/books/click/[slug]] Failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
