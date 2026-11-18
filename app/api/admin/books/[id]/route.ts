import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import {
  countBooksUsingImageUrl,
  deleteBookById,
  getBookById,
  normalizeBookStatus,
  updateExistingBook,
} from '@/src/db/bookRepository';
import { RepositoryError, parseSafePrice } from '@/src/db/repositoryShared';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import { validateCoursePricing } from '@/src/lib/courseValidation';
import { deleteImageKitFileByUrl, isManagedImageKitUrl } from '@/src/lib/imagekit';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

async function cleanupOrphanedBookCover(
  previousCoverUrl: string | null | undefined,
  excludeBookId: number
): Promise<void> {
  if (!previousCoverUrl) return;
  try {
    const remainingRefs = await countBooksUsingImageUrl(previousCoverUrl, excludeBookId);
    if (remainingRefs > 0) return;

    if (isManagedImageKitUrl(previousCoverUrl)) {
      await deleteImageKitFileByUrl(previousCoverUrl);
      return;
    }

    // Safe local cleanup strictly inside public/images/books/
    if (
      previousCoverUrl.startsWith('/images/books/') &&
      !previousCoverUrl.includes('..') &&
      process.env.VERCEL !== '1'
    ) {
      const booksDir = path.resolve(process.cwd(), 'public', 'images', 'books');
      const targetPath = path.resolve(process.cwd(), 'public', previousCoverUrl.replace(/^\/+/, ''));
      if (targetPath.startsWith(booksDir + path.sep) && fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[admin/books] Best-effort cover cleanup warning:', err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  try {
    const { id } = await params;
    const bookId = parsePositiveId(id);
    if (!bookId) {
      return NextResponse.json({ error: 'অবৈধ বই আইডি।' }, { status: 400 });
    }

    const book = await getBookById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'বইটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }

    return NextResponse.json(book, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/admin/books/[id]] Failed:', error);
    return NextResponse.json({ error: 'বইয়ের তথ্য লোড করতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  try {
    const { id } = await params;
    const bookId = parsePositiveId(id);
    if (!bookId) {
      return NextResponse.json({ error: 'অবৈধ বই আইডি।' }, { status: 400 });
    }

    const existing = await getBookById(bookId);
    if (!existing) {
      return NextResponse.json({ error: 'বইটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.coverImageUrl !== undefined || body.cover_image !== undefined) {
      const rawCover =
        body.coverImageUrl !== undefined ? body.coverImageUrl : body.cover_image;
      const coverCheck = sanitizeImageUrl(rawCover);
      if (!coverCheck.valid) {
        return NextResponse.json(
          { error: coverCheck.error || 'অবৈধ বুক কভার ইমেজ লিংক।' },
          { status: 400 }
        );
      }
      body.coverImageUrl = coverCheck.value;
    }

    if (
      body.affiliateUrl !== undefined ||
      body.affiliate_url !== undefined ||
      body.orderUrl !== undefined
    ) {
      const rawAff =
        body.affiliateUrl !== undefined
          ? body.affiliateUrl
          : body.affiliate_url !== undefined
          ? body.affiliate_url
          : body.orderUrl;
      if (typeof rawAff === 'string' && rawAff.trim()) {
        const urlCheck = validateExternalHttpUrl(rawAff);
        if (!urlCheck.valid) {
          return NextResponse.json(
            { error: urlCheck.error || 'অবৈধ অ্যাফিলিয়েট লিংক (https://...)।' },
            { status: 400 }
          );
        }
        body.affiliateUrl = urlCheck.normalized || '';
      } else {
        body.affiliateUrl = '';
      }
      delete body.orderUrl;
      delete body.affiliate_url;
    }

    const origCheck =
      body.originalPrice !== undefined
        ? body.originalPrice === ''
          ? { valid: true, value: 0 }
          : parseSafePrice(body.originalPrice)
        : null;
    const priceCheck =
      body.price !== undefined ? parseSafePrice(body.price) : null;

    if ((origCheck && !origCheck.valid) || (priceCheck && !priceCheck.valid)) {
      return NextResponse.json(
        { error: 'বইয়ের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' },
        { status: 400 }
      );
    }

    if (origCheck || priceCheck) {
      const effectiveOriginal = origCheck ? origCheck.value : existing.originalPrice;
      const effectivePrice = priceCheck ? priceCheck.value : existing.price;
      const pricingCheck = validateCoursePricing(effectiveOriginal, effectivePrice);
      if (!pricingCheck.valid) {
        return NextResponse.json(
          {
            error:
              pricingCheck.error ||
              'বিক্রয় মূল্য পূর্বের মূল মূল্যের চেয়ে বেশি হতে পারবে না।',
          },
          { status: 400 }
        );
      }
    }

    const sanitizedBody = { ...body };
    if (origCheck) sanitizedBody.originalPrice = origCheck.value;
    if (priceCheck) sanitizedBody.price = priceCheck.value;
    if (sanitizedBody.status !== undefined) {
      sanitizedBody.status = normalizeBookStatus(sanitizedBody.status, existing.status);
    }

    const updated = await updateExistingBook(bookId, sanitizedBody);
    if (!updated) {
      return NextResponse.json({ error: 'বইটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }

    if (
      body.coverImageUrl !== undefined &&
      existing.coverImageUrl &&
      existing.coverImageUrl !== updated.coverImageUrl
    ) {
      await cleanupOrphanedBookCover(existing.coverImageUrl, bookId);
    }

    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[PUT /api/admin/books/[id]] Failed:', error);
    return NextResponse.json({ error: 'বইয়ের তথ্য আপডেট করতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  try {
    const { id } = await params;
    const bookId = parsePositiveId(id);
    if (!bookId) {
      return NextResponse.json({ error: 'অবৈধ বই আইডি।' }, { status: 400 });
    }

    const result = await deleteBookById(bookId);
    if (!result.found) {
      return NextResponse.json({ error: 'বইটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }

    if (result.previousCoverUrl) {
      await cleanupOrphanedBookCover(result.previousCoverUrl, bookId);
    }

    return NextResponse.json(
      { deleted: result.deleted, found: result.found },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[DELETE /api/admin/books/[id]] Failed:', error);
    return NextResponse.json({ error: 'বইটি মুছে ফেলতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}
