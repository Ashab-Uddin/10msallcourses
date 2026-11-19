import { NextRequest, NextResponse } from 'next/server';
import {
  createNewBook,
  getAdminBookStoreData,
  normalizeBookStatus,
} from '@/src/db/bookRepository';
import { RepositoryError, parseSafePrice } from '@/src/db/repositoryShared';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import { validateCoursePricing } from '@/src/lib/courseValidation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const data = await getAdminBookStoreData();
    const { searchParams } = req.nextUrl;

    let books = data.books || [];

    const status = searchParams.get('status')?.trim();
    if (status && status !== 'all') {
      books = books.filter((b) => b.status === status);
    }

    const category = searchParams.get('category')?.trim();
    if (category && category !== 'all') {
      books = books.filter((b) => b.categorySlug === category);
    }

    const q = searchParams.get('q')?.trim().toLowerCase();
    if (q) {
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.bookType.toLowerCase().includes(q)
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(
        {
          stats: data.stats,
          bookCategories: data.bookCategories,
          books,
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: error.message },
          { status: error.status, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }
    console.error('[GET /api/admin/books] Failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'বইয়ের তালিকা লোড করতে ব্যর্থ হয়েছে।' },
        { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (!String(body?.title || '').trim()) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'বইয়ের নাম (Book Name) পূরণ করা আবশ্যক।' },
          { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    const rawCover =
      body?.coverImageUrl !== undefined ? body.coverImageUrl : body?.cover_image;
    const coverCheck = sanitizeImageUrl(rawCover);
    if (!coverCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: coverCheck.error || 'অবৈধ বুক কভার ইমেজ লিংক।' },
          { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    const rawAffiliateUrl =
      body?.affiliateUrl !== undefined
        ? body.affiliateUrl
        : body?.affiliate_url !== undefined
        ? body.affiliate_url
        : body?.orderUrl;

    let normalizedAffiliateUrl = '';
    if (typeof rawAffiliateUrl === 'string' && rawAffiliateUrl.trim()) {
      const urlCheck = validateExternalHttpUrl(rawAffiliateUrl);
      if (!urlCheck.valid) {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: urlCheck.error || 'অবৈধ অ্যাফিলিয়েট লিংক (https://...)।' },
            { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
          )
        );
      }
      normalizedAffiliateUrl = urlCheck.normalized || '';
    }

    const origCheck =
      body.originalPrice !== undefined && body.originalPrice !== ''
        ? parseSafePrice(body.originalPrice)
        : { valid: true, value: 0 };
    const priceCheck =
      body.price !== undefined && body.price !== ''
        ? parseSafePrice(body.price)
        : { valid: false, value: 0 };

    if (!origCheck.valid || !priceCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'বইয়ের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' },
          { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    const pricingCheck = validateCoursePricing(origCheck.value, priceCheck.value);
    if (!pricingCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          {
            error:
              pricingCheck.error ||
              'বিক্রয় মূল্য পূর্বের মূল মূল্যের চেয়ে বেশি হতে পারবে না।',
          },
          { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    const created = await createNewBook({
      ...body,
      coverImageUrl: coverCheck.value,
      affiliateUrl: normalizedAffiliateUrl,
      originalPrice: origCheck.value,
      price: priceCheck.value,
      status: normalizeBookStatus(body.status, 'active'),
    });

    return auth.withSessionCookies(
      NextResponse.json(created, {
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: error.message },
          { status: error.status, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }
    console.error('[POST /api/admin/books] Failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'নতুন বই যুক্ত করতে সমস্যা হয়েছে।' },
        { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }
}
