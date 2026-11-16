import { NextRequest, NextResponse } from 'next/server';
import {
  deleteCourseById,
  getAdminOverviewData,
  normalizeCourseStatus,
  parseSafePrice,
  updateExistingCourse,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { validateCoursePricing, validateSingleBatchKeyword } from '@/src/lib/courseValidation';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const courseId = Number(id);
    const body = await req.json().catch(() => ({}));

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
      const effectiveOriginal = origCheck ? origCheck.value : existing?.originalPrice ?? 0;
      const effectiveDiscount = discCheck ? discCheck.value : existing?.discountPrice ?? 0;
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
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update course failed:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
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
    const result = await deleteCourseById(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete course failed:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
