import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import {
  RepositoryError,
  normalizeCourseStatus,
  parseSafePrice,
} from '@/src/db/repository';
import {
  addOnlineBatchCourse,
  getAdminOnlineBatchData,
} from '@/src/db/onlineBatchRepository';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import {
  syncTargetStudentsMetadata,
  validateCourseDuration,
  validateCoursePricing,
  validateCourseRating,
  validateCourseStudentCount,
} from '@/src/lib/courseValidation';
import {
  deriveCourseSummaryDescription,
  extractActiveFeatureTitles,
  MIN_ACTIVE_COURSE_FEATURES,
  normalizeCourseFeatureItems,
} from '@/src/lib/courseFeatures';
import { generateUnicodeCourseSlug } from '@/src/lib/courseSlug';
import { toBengaliNumber } from '@/src/utils/format';

export const dynamic = 'force-dynamic';

const DEFAULT_BATCH_COURSE_FEATURES = [
  'লাইভ ক্লাস ও রেকর্ডেড ভিডিও আর্কাইভ',
  'লেকচার শিট ও পিডিএফ নোট',
  'অধ্যায়ভিত্তিক কুইজ ও মডেল টেস্ট',
];

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = await getAdminOnlineBatchData();
    return auth.withSessionCookies(
      NextResponse.json(payload, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    console.error('Failed to load admin online batch data:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অনলাইন ব্যাচ ডেটা লোড করতে সমস্যা হয়েছে।' },
        { status: 500 }
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
    const batchClassId = Number(body?.batchClassId);
    if (!Number.isInteger(batchClassId) || batchClassId <= 0) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'অনুগ্রহ করে একটি বৈধ শ্রেণি নির্বাচন করুন।' },
          { status: 400 }
        )
      );
    }

    const mode = body?.mode === 'new' ? 'new' : 'existing';
    const customBadge = typeof body?.customBadge === 'string' ? body.customBadge.trim() : '';
    const status = body?.status === 'inactive' ? 'inactive' : 'active';
    const displayOrder =
      body?.displayOrder !== undefined &&
      body?.displayOrder !== null &&
      String(body.displayOrder).trim() !== ''
        ? Number(body.displayOrder)
        : undefined;

    if (mode === 'existing') {
      const courseId = Number(body?.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: 'অনুগ্রহ করে একটি বৈধ কোর্স নির্বাচন করুন।' },
            { status: 400 }
          )
        );
      }

      const entry = await addOnlineBatchCourse({
        mode: 'existing',
        batchClassId,
        courseId,
        customBadge,
        displayOrder,
        status,
      });

      return auth.withSessionCookies(
        NextResponse.json(entry, {
          status: 201,
          headers: { 'Cache-Control': 'private, no-store' },
        })
      );
    }

    // Mode === 'new': validate full new course payload safely
    const rawCourse =
      body?.newCourse && typeof body.newCourse === 'object' ? body.newCourse : body;

    const title = String(rawCourse?.title || '').trim();
    const slug =
      String(rawCourse?.slug || '').trim() || generateUnicodeCourseSlug(title);
    if (!title || !slug) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'কোর্সের শিরোনাম এবং বৈধ স্লাগ পূরণ করা আবশ্যক।' },
          { status: 400 }
        )
      );
    }

    const rawFeaturesInput =
      Array.isArray(rawCourse?.courseFeatures) && rawCourse.courseFeatures.length > 0
        ? rawCourse.courseFeatures
        : Array.isArray(rawCourse?.features) && rawCourse.features.length > 0
        ? rawCourse.features
        : DEFAULT_BATCH_COURSE_FEATURES;

    const normalizedFeatureItems = normalizeCourseFeatureItems(rawFeaturesInput);
    const activeFeatureTitles = extractActiveFeatureTitles(normalizedFeatureItems);
    if (activeFeatureTitles.length < MIN_ACTIVE_COURSE_FEATURES) {
      return auth.withSessionCookies(
        NextResponse.json(
          {
            error: `কোর্স কার্ডে প্রদর্শনের জন্য ন্যূনতম ${toBengaliNumber(
              MIN_ACTIVE_COURSE_FEATURES
            )}টি সক্রিয় ফিচার যুক্ত করতে হবে।`,
          },
          { status: 400 }
        )
      );
    }

    const affiliateCheck = validateExternalHttpUrl(rawCourse?.affiliateUrl || '');
    if (!affiliateCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          {
            error:
              affiliateCheck.error ||
              'বৈধ অ্যাফিলিয়েট/ভর্তি লিংক (https://...) প্রদান করুন।',
          },
          { status: 400 }
        )
      );
    }

    const imageCheck = sanitizeImageUrl(rawCourse?.imageUrl || null);
    if (!imageCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: imageCheck.error || 'অবৈধ ইমেজ লিংক।' },
          { status: 400 }
        )
      );
    }

    const origCheck =
      rawCourse?.originalPrice !== undefined && rawCourse?.originalPrice !== ''
        ? parseSafePrice(rawCourse.originalPrice)
        : { valid: true, value: 0 };
    const discCheck =
      rawCourse?.discountPrice !== undefined && rawCourse?.discountPrice !== ''
        ? parseSafePrice(rawCourse.discountPrice)
        : { valid: true, value: 0 };

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

    const durationCheck = validateCourseDuration(rawCourse?.duration);
    if (!durationCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: durationCheck.error || 'অবৈধ কোর্স মেয়াদ প্রদান করা হয়েছে।' },
          { status: 400 }
        )
      );
    }

    const studentCountCheck = validateCourseStudentCount(rawCourse?.studentCount);
    if (!studentCountCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: studentCountCheck.error || 'অবৈধ শিক্ষার্থীর সংখ্যা প্রদান করা হয়েছে।' },
          { status: 400 }
        )
      );
    }

    const ratingCheck = validateCourseRating(rawCourse?.rating);
    if (!ratingCheck.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: ratingCheck.error || 'কোর্সের রেটিং ০ থেকে ৫-এর মধ্যে হতে হবে।' },
          { status: 400 }
        )
      );
    }

    const targetSync = syncTargetStudentsMetadata({
      targetStudents: rawCourse?.targetStudents,
      targetBatch: rawCourse?.targetBatch,
      targetGroups: rawCourse?.targetGroups,
    });
    if (!targetSync.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: targetSync.error || 'টার্গেট ব্যাচ তথ্য বৈধ নয়।' },
          { status: 400 }
        )
      );
    }

    const summaryDescription = deriveCourseSummaryDescription(
      rawCourse?.description || rawCourse?.fullDescription,
      normalizedFeatureItems,
      title
    );

    const entry = await addOnlineBatchCourse({
      mode: 'new',
      batchClassId,
      customBadge,
      displayOrder,
      status,
      newCoursePayload: {
        ...rawCourse,
        title,
        slug,
        description: summaryDescription,
        courseFeatures: normalizedFeatureItems,
        features: activeFeatureTitles,
        affiliateUrl: affiliateCheck.normalized,
        imageUrl: imageCheck.value,
        originalPrice: origCheck.value,
        discountPrice: discCheck.value,
        discountPercent: pricingCheck.discountPercent,
        duration: durationCheck.value,
        studentCount: studentCountCheck.storageValue,
        rating: ratingCheck.storageValue,
        targetStudents: targetSync.targetStudents,
        targetBatch: targetSync.targetBatch,
        targetGroups: targetSync.targetGroups,
        shortBadge:
          typeof rawCourse?.shortBadge === 'string'
            ? rawCourse.shortBadge.trim()
            : customBadge,
        status: normalizeCourseStatus(rawCourse?.status, 'active'),
      },
    });

    return auth.withSessionCookies(
      NextResponse.json(entry, {
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
    console.error('Add online batch course failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অনলাইন ব্যাচে কোর্স যুক্ত করতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
