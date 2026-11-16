import { NextRequest, NextResponse } from 'next/server';
import {
  createNewCourse,
  getAdminOverviewData,
  normalizeCourseStatus,
  parseSafePrice,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { validateCoursePricing, validateSingleBatchKeyword } from '@/src/lib/courseValidation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await getAdminOverviewData();
    return NextResponse.json(data.courses || []);
  } catch (error) {
    console.error('Admin courses failed:', error);
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!String(body?.title || '').trim() || !String(body?.slug || '').trim()) {
      return NextResponse.json(
        { error: 'কোর্সের শিরোনাম এবং স্লাগ পূরণ করা আবশ্যক।' },
        { status: 400 }
      );
    }

    const batchCheck = validateSingleBatchKeyword(body.targetStudents);
    if (!batchCheck.valid) {
      return NextResponse.json(
        { error: batchCheck.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।' },
        { status: 400 }
      );
    }

    const origCheck =
      body.originalPrice !== undefined && body.originalPrice !== ''
        ? parseSafePrice(body.originalPrice)
        : { valid: true, value: 0 };
    const discCheck =
      body.discountPrice !== undefined && body.discountPrice !== ''
        ? parseSafePrice(body.discountPrice)
        : { valid: false, value: 0 };

    if (!origCheck.valid || !discCheck.valid) {
      return NextResponse.json(
        { error: 'কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' },
        { status: 400 }
      );
    }

    const pricingCheck = validateCoursePricing(origCheck.value, discCheck.value);
    if (!pricingCheck.valid) {
      return NextResponse.json(
        { error: pricingCheck.error || 'অবৈধ মূল্য প্রদান করা হয়েছে।' },
        { status: 400 }
      );
    }

    const data = await createNewCourse({
      ...body,
      originalPrice: origCheck.value,
      discountPrice: discCheck.value,
      discountPercent: pricingCheck.discountPercent,
      shortBadge: typeof body.shortBadge === 'string' ? body.shortBadge.trim() : '',
      status: normalizeCourseStatus(body.status, 'active'),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create course failed:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
