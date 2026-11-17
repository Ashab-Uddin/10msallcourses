import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  deleteCourseById,
  getAdminOverviewData,
  normalizeCourseStatus,
  parseSafePrice,
  updateExistingCourse,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import { validateCoursePricing, validateSingleBatchKeyword } from '@/src/lib/courseValidation';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const courseId = parsePositiveId(id);
    if (!courseId) {
      return NextResponse.json({ error: 'অবৈধ কোর্স আইডি।' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.affiliateUrl !== undefined) {
      const affiliateCheck = validateExternalHttpUrl(body.affiliateUrl);
      if (!affiliateCheck.valid) {
        return NextResponse.json(
          { error: affiliateCheck.error || 'বৈধ অ্যাফিলিয়েট লিংক (https://...) প্রদান করুন।' },
          { status: 400 }
        );
      }
      body.affiliateUrl = affiliateCheck.normalized;
    }

    if (body.imageUrl !== undefined) {
      const imageCheck = sanitizeImageUrl(body.imageUrl);
      if (!imageCheck.valid) {
        return NextResponse.json(
          { error: imageCheck.error || 'অবৈধ ইমেজ লিংক।' },
          { status: 400 }
        );
      }
      body.imageUrl = imageCheck.value;
    }

    if (body.targetStudents !== undefined) {
      const batchCheck = validateSingleBatchKeyword(body.targetStudents);
      if (!batchCheck.valid) {
        return NextResponse.json(
          { error: batchCheck.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।' },
          { status: 400 }
        );
      }
    }

    const origCheck =
      body.originalPrice !== undefined
        ? body.originalPrice === ''
          ? { valid: true, value: 0 }
          : parseSafePrice(body.originalPrice)
        : null;
    const discCheck =
      body.discountPrice !== undefined ? parseSafePrice(body.discountPrice) : null;

    if ((origCheck && !origCheck.valid) || (discCheck && !discCheck.valid)) {
      return NextResponse.json(
        { error: 'কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' },
        { status: 400 }
      );
    }

    if (origCheck || discCheck) {
      const overview = await getAdminOverviewData();
      const existing = overview.courses.find((c) => c.id === courseId);
      if (!existing) {
        return NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
      }
      const effectiveOriginal = origCheck ? origCheck.value : existing.originalPrice;
      const effectiveDiscount = discCheck ? discCheck.value : existing.discountPrice;
      const pricingCheck = validateCoursePricing(effectiveOriginal, effectiveDiscount);
      if (!pricingCheck.valid) {
        return NextResponse.json(
          { error: pricingCheck.error || 'অবৈধ মূল্য প্রদান করা হয়েছে।' },
          { status: 400 }
        );
      }
    }

    const sanitizedBody = { ...body };
    if (origCheck) sanitizedBody.originalPrice = origCheck.value;
    if (discCheck) sanitizedBody.discountPrice = discCheck.value;
    if (sanitizedBody.shortBadge !== undefined && typeof sanitizedBody.shortBadge === 'string') {
      sanitizedBody.shortBadge = sanitizedBody.shortBadge.trim();
    }
    if (sanitizedBody.status !== undefined) {
      sanitizedBody.status = normalizeCourseStatus(sanitizedBody.status, 'active');
    }

    const data = await updateExistingCourse(courseId, sanitizedBody);
    if (!data) {
      return NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Update course failed:', error);
    return NextResponse.json({ error: 'কোর্স আপডেট করতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const courseId = parsePositiveId(id);
    if (!courseId) {
      return NextResponse.json({ error: 'অবৈধ কোর্স আইডি।' }, { status: 400 });
    }
    const result = await deleteCourseById(courseId);
    if (!result.found) {
      return NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Delete course failed:', error);
    return NextResponse.json({ error: 'কোর্স মুছে ফেলতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}
