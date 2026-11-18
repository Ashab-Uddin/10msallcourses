import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  createNewCourse,
  getAdminOverviewData,
  normalizeCourseStatus,
  parseSafePrice,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import { validateCoursePricing, validateSingleBatchKeyword } from '@/src/lib/courseValidation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  try {
    const data = await getAdminOverviewData();
    const { searchParams } = req.nextUrl;
    const hasPagination = searchParams.has('page') || searchParams.has('limit');

    let courses = data.courses || [];

    const status = searchParams.get('status')?.trim();
    if (status && status !== 'all') {
      courses = courses.filter((c) => c.status === status);
    }

    const category = searchParams.get('category')?.trim();
    if (category && category !== 'all') {
      courses = courses.filter((c) => c.categorySlug === category);
    }

    const q = searchParams.get('q')?.trim().toLowerCase();
    if (q) {
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.targetStudents || '').toLowerCase().includes(q)
      );
    }

    if (hasPagination) {
      const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20)
      );
      const total = courses.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return NextResponse.json(
        {
          items: courses.slice(start, start + limit),
          pagination: { page, limit, total, totalPages },
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    return NextResponse.json(courses, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Admin courses failed:', error);
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (!String(body?.title || '').trim() || !String(body?.slug || '').trim()) {
      return NextResponse.json(
        { error: 'কোর্সের শিরোনাম এবং স্লাগ পূরণ করা আবশ্যক।' },
        { status: 400 }
      );
    }

    if (!String(body?.description || '').trim()) {
      return NextResponse.json(
        { error: 'কোর্সের সংক্ষিপ্ত বিবরণ পূরণ করা আবশ্যক।' },
        { status: 400 }
      );
    }

    const affiliateCheck = validateExternalHttpUrl(body?.affiliateUrl);
    if (!affiliateCheck.valid) {
      return NextResponse.json(
        { error: affiliateCheck.error || 'বৈধ অ্যাফিলিয়েট লিংক (https://...) প্রদান করুন।' },
        { status: 400 }
      );
    }

    const imageCheck = sanitizeImageUrl(body?.imageUrl);
    if (!imageCheck.valid) {
      return NextResponse.json(
        { error: imageCheck.error || 'অবৈধ ইমেজ লিংক।' },
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
      affiliateUrl: affiliateCheck.normalized,
      imageUrl: imageCheck.value,
      originalPrice: origCheck.value,
      discountPrice: discCheck.value,
      discountPercent: pricingCheck.discountPercent,
      shortBadge: typeof body.shortBadge === 'string' ? body.shortBadge.trim() : '',
      status: normalizeCourseStatus(body.status, 'active'),
    });

    return NextResponse.json(data, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Create course failed:', error);
    return NextResponse.json({ error: 'কোর্স তৈরি করতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}
