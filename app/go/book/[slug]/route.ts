import { NextRequest, NextResponse } from 'next/server';
import { getPublicBookByIdOrSlug, recordBookClick } from '@/src/db/bookRepository';
import { getPortalSettings } from '@/src/db/repository';
import { buildAffiliateRedirectUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const rate = checkRateLimit(req, 'public_go_book_redirect', 60, 60 * 1000);
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
      return NextResponse.redirect(new URL('/books', req.url), 307);
    }

    const book = await getPublicBookByIdOrSlug(cleanSlug);

    // Safe fallback: if book is missing, inactive, or has no valid admin-configured Affiliate URL,
    // redirect safely back to /books without ever falling back to a hardcoded or demo link.
    if (!book || book.status !== 'active' || !book.affiliateUrl?.trim()) {
      return NextResponse.redirect(new URL('/books', req.url), 307);
    }

    const urlCheck = validateExternalHttpUrl(book.affiliateUrl);
    if (!urlCheck.valid || !urlCheck.normalized) {
      return NextResponse.redirect(new URL('/books', req.url), 307);
    }

    const settings = await getPortalSettings();
    await recordBookClick(book.slug).catch((err) => {
      console.error('[GET /go/book/[slug]] Click tracking warning:', err);
    });

    const targetUrl = buildAffiliateRedirectUrl(
      urlCheck.normalized,
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
    console.error('[GET /go/book/[slug]] Redirect failed:', error);
    return NextResponse.redirect(new URL('/books', req.url), 307);
  }
}
