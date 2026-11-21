import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  createNewCourse,
  getAdminCoursesList,
  normalizeCourseStatus,
  parseSafePrice,
} from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import {
  normalizeTargetGroups,
  syncTargetStudentsMetadata,
  validateCourseDuration,
  validateCoursePricing,
  validateCourseRating,
  validateCourseStudentCount,
} from '@/src/lib/courseValidation';
import {
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
  resolveCourseDepartments,
} from '@/src/lib/categoryMatching';
import {
  deriveCourseSummaryDescription,
  extractActiveFeatureTitles,
  MIN_ACTIVE_COURSE_FEATURES,
  normalizeCourseFeatureItems,
} from '@/src/lib/courseFeatures';
import { toBengaliNumber } from '@/src/utils/format';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    let courses = await getAdminCoursesList();
    const { searchParams } = req.nextUrl;
    const hasPagination = searchParams.has('page') || searchParams.has('limit');

    const status = searchParams.get('status')?.trim();
    if (status && status !== 'all') {
      courses = courses.filter((c) => c.status === status);
    }

    const category = searchParams.get('category')?.trim();
    if (category && category !== 'all') {
      courses = courses.filter((c) => courseMatchesCategorySlug(c, category));
    }

    const batch = searchParams.get('batch')?.trim();
    if (batch && batch !== 'all') {
      courses = courses.filter((c) => courseMatchesAcademicBatch(c, batch));
    }

    const group = searchParams.get('group')?.trim();
    if (group && group !== 'all') {
      const targetGroups = normalizeTargetGroups(group);
      if (targetGroups.length > 0) {
        courses = courses.filter((c) =>
          resolveCourseDepartments(c).some((g) => targetGroups.includes(g))
        );
      }
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
      return auth.withSessionCookies(
        NextResponse.json(
          {
            items: courses.slice(start, start + limit),
            pagination: { page, limit, total, totalPages },
          },
          { headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(courses, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    console.error('Admin courses failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'Failed to load courses' }, { status: 500 })
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
    if (!String(body?.title || '').trim() || !String(body?.slug || '').trim()) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'কোর্সের শিরোনাম এবং স্লাগ পূরণ করা আবশ্যক।' },
          { status: 400 }
        )
      );
    }

    const normalizedFeatureItems = Array.isArray(body?.courseFeatures)
      ? normalizeCourseFeatureItems(body.courseFeatures)
      : Array.isArray(body?.features)
      ? normalizeCourseFeatureItems(body.features)
      : [];

    const activeFeatureTitles = extractActiveFeatureTitles(normalizedFeatureItems);
    if (activeFeatureTitles.length < MIN_ACTIVE_COURSE_FEATURES) {
      return auth.withSessionCookies(
        NextResponse.json(
          {
            error: `কোর্স কার্ডে প্রদর্শনের জন্য ন্যূনতম ${toBengaliNumber(
              MIN_ACTIVE_COURSE_FEATURES
            )}টি সক্রিয় (Published) ফিচার যুক্ত করতে হবে।`,
          },
          { status: 400 }
        )
      );
    }

    body.description = deriveCourseSummaryDescription(
      body?.description || body?.fullDescription,
      normalizedFeatureItems,
      body?.title
    );

    const affiliateCheck = validateExternalHttpUrl(body?.affiliateUrl);
    if (!affiliateCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: affiliateCheck.error || 'বৈধ অ্যাফিলিয়েট লিংক (https://...) প্রদান করুন।' },
          { status: 400 }
        )
      );
    }

    const imageCheck = sanitizeImageUrl(body?.imageUrl);
    if (!imageCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: imageCheck.error || 'অবৈধ ইমেজ লিংক।' },
          { status: 400 }
        )
      );
    }

    const targetSync = syncTargetStudentsMetadata({
      targetStudents: body.targetStudents,
      targetBatch: body.targetBatch,
      targetGroups: body.targetGroups,
    });
    if (!targetSync.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: targetSync.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।' },
          { status: 400 }
        )
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
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' },
          { status: 400 }
        )
      );
    }

    const pricingCheck = validateCoursePricing(origCheck.value, discCheck.value);
    if (!pricingCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: pricingCheck.error || 'অবৈধ মূল্য প্রদান করা হয়েছে।' },
          { status: 400 }
        )
      );
    }

    const durationCheck = validateCourseDuration(body.duration);
    if (!durationCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: durationCheck.error || 'অবৈধ কোর্স মেয়াদ প্রদান করা হয়েছে।' },
          { status: 400 }
        )
      );
    }

    const studentCountCheck = validateCourseStudentCount(body.studentCount);
    if (!studentCountCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: studentCountCheck.error || 'অবৈধ শিক্ষার্থীর সংখ্যা প্রদান করা হয়েছে।' },
          { status: 400 }
        )
      );
    }

    const ratingCheck = validateCourseRating(body.rating);
    if (!ratingCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: ratingCheck.error || 'কোর্সের রেটিং অবশ্যই ০ থেকে ৫-এর মধ্যে হতে হবে।' },
          { status: 400 }
        )
      );
    }

    const data = await createNewCourse({
      ...body,
      targetStudents: targetSync.targetStudents,
      targetBatch: targetSync.targetBatch,
      targetGroups: targetSync.targetGroups,
      affiliateUrl: affiliateCheck.normalized,
      imageUrl: imageCheck.value,
      originalPrice: origCheck.value,
      discountPrice: discCheck.value,
      discountPercent: pricingCheck.discountPercent,
      duration: durationCheck.value,
      studentCount: studentCountCheck.storageValue,
      rating: ratingCheck.storageValue,
      shortBadge: typeof body.shortBadge === 'string' ? body.shortBadge.trim() : '',
      status: normalizeCourseStatus(body.status, 'active'),
    });

    return auth.withSessionCookies(
      NextResponse.json(data, {
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Create course failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'কোর্স তৈরি করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}
