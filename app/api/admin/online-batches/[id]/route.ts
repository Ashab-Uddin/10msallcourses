import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import {
  RepositoryError,
  normalizeCourseStatus,
  parseSafePrice,
} from '@/src/db/repository';
import {
  deleteOnlineBatchCourse,
  updateOnlineBatchCourse,
} from '@/src/db/onlineBatchRepository';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import {
  validateCourseDuration,
  validateCoursePricing,
  validateCourseRating,
  validateCourseStudentCount,
} from '@/src/lib/courseValidation';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handleUpdate(req: NextRequest, context: RouteContext) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const entryId = Number(id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ ব্যাচ এন্ট্রি আইডি।' }, { status: 400 })
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCourseUpdates =
      body?.courseUpdates && typeof body.courseUpdates === 'object'
        ? (body.courseUpdates as Record<string, unknown>)
        : null;

    const cleanCourseUpdates: Record<string, unknown> = {};
    if (rawCourseUpdates) {
      if (rawCourseUpdates.title !== undefined) {
        const t = String(rawCourseUpdates.title || '').trim();
        if (!t) {
          return auth.withSessionCookies(
            NextResponse.json({ error: 'কোর্সের নাম খালি রাখা যাবে না।' }, { status: 400 })
          );
        }
        cleanCourseUpdates.title = t;
      }

      if (rawCourseUpdates.affiliateUrl !== undefined) {
        const affCheck = validateExternalHttpUrl(rawCourseUpdates.affiliateUrl);
        if (!affCheck.valid) {
          return auth.withSessionCookies(
            NextResponse.json(
              { error: affCheck.error || 'বৈধ অ্যাফিলিয়েট লিংক প্রদান করুন।' },
              { status: 400 }
            )
          );
        }
        cleanCourseUpdates.affiliateUrl = affCheck.normalized;
      }

      if (rawCourseUpdates.imageUrl !== undefined) {
        const imgCheck = sanitizeImageUrl(rawCourseUpdates.imageUrl);
        if (!imgCheck.valid) {
          return auth.withSessionCookies(
            NextResponse.json(
              { error: imgCheck.error || 'অবৈধ ইমেজ লিংক।' },
              { status: 400 }
            )
          );
        }
        cleanCourseUpdates.imageUrl = imgCheck.value;
      }

      if (
        rawCourseUpdates.originalPrice !== undefined ||
        rawCourseUpdates.discountPrice !== undefined
      ) {
        const origCheck =
          rawCourseUpdates.originalPrice !== undefined
            ? parseSafePrice(rawCourseUpdates.originalPrice)
            : { valid: true, value: 0 };
        const discCheck =
          rawCourseUpdates.discountPrice !== undefined
            ? parseSafePrice(rawCourseUpdates.discountPrice)
            : { valid: true, value: 0 };

        if (!origCheck.valid || !discCheck.valid) {
          return auth.withSessionCookies(
            NextResponse.json(
              { error: 'কোর্সের মূল্য বৈধ সংখ্যা হতে হবে।' },
              { status: 400 }
            )
          );
        }

        if (
          rawCourseUpdates.originalPrice !== undefined &&
          rawCourseUpdates.discountPrice !== undefined
        ) {
          const pricingCheck = validateCoursePricing(origCheck.value, discCheck.value);
          if (!pricingCheck.valid) {
            return auth.withSessionCookies(
              NextResponse.json(
                { error: pricingCheck.error || 'অবৈধ মূল্য।' },
                { status: 400 }
              )
            );
          }
          cleanCourseUpdates.originalPrice = origCheck.value;
          cleanCourseUpdates.discountPrice = discCheck.value;
        } else if (rawCourseUpdates.originalPrice !== undefined) {
          cleanCourseUpdates.originalPrice = origCheck.value;
        } else if (rawCourseUpdates.discountPrice !== undefined) {
          cleanCourseUpdates.discountPrice = discCheck.value;
        }
      }

      if (rawCourseUpdates.duration !== undefined) {
        const durCheck = validateCourseDuration(rawCourseUpdates.duration);
        if (!durCheck.valid) {
          return auth.withSessionCookies(
            NextResponse.json(
              { error: durCheck.error || 'অবৈধ মেয়াদ।' },
              { status: 400 }
            )
          );
        }
        cleanCourseUpdates.duration = durCheck.value;
      }

      if (rawCourseUpdates.studentCount !== undefined) {
        const scCheck = validateCourseStudentCount(rawCourseUpdates.studentCount);
        if (!scCheck.valid) {
          return auth.withSessionCookies(
            NextResponse.json(
              { error: scCheck.error || 'অবৈধ শিক্ষার্থীর সংখ্যা।' },
              { status: 400 }
            )
          );
        }
        cleanCourseUpdates.studentCount = scCheck.storageValue;
      }

      if (rawCourseUpdates.rating !== undefined) {
        const rCheck = validateCourseRating(rawCourseUpdates.rating);
        if (!rCheck.valid) {
          return auth.withSessionCookies(
            NextResponse.json(
              { error: rCheck.error || 'অবৈধ রেটিং।' },
              { status: 400 }
            )
          );
        }
        cleanCourseUpdates.rating = rCheck.storageValue;
      }

      if (rawCourseUpdates.shortBadge !== undefined) {
        cleanCourseUpdates.shortBadge = String(rawCourseUpdates.shortBadge || '').trim();
      }
      if (rawCourseUpdates.description !== undefined) {
        cleanCourseUpdates.description = String(rawCourseUpdates.description || '').trim();
      }
      if (rawCourseUpdates.status !== undefined) {
        cleanCourseUpdates.status = normalizeCourseStatus(rawCourseUpdates.status, 'active');
      }
      if (Array.isArray(rawCourseUpdates.courseFeatures)) {
        cleanCourseUpdates.courseFeatures = rawCourseUpdates.courseFeatures;
      }
    }

    const updated = await updateOnlineBatchCourse(entryId, {
      batchClassId:
        body?.batchClassId !== undefined ? Number(body.batchClassId) : undefined,
      customBadge:
        body?.customBadge !== undefined ? String(body.customBadge) : undefined,
      displayOrder:
        body?.displayOrder !== undefined &&
        body?.displayOrder !== null &&
        String(body.displayOrder).trim() !== ''
          ? Number(body.displayOrder)
          : undefined,
      status:
        body?.status !== undefined
          ? body.status === 'inactive'
            ? 'inactive'
            : 'active'
          : undefined,
      courseUpdates:
        Object.keys(cleanCourseUpdates).length > 0 ? cleanCourseUpdates : undefined,
    });

    if (!updated) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'ব্যাচ কোর্স এন্ট্রিটি পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(updated, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Update online batch course failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'ব্যাচ কোর্স আপডেট করতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return handleUpdate(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return handleUpdate(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const entryId = Number(id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ ব্যাচ এন্ট্রি আইডি।' }, { status: 400 })
      );
    }

    const deleteUnderlying = req.nextUrl.searchParams.get('deleteCourse') === '1';
    const result = await deleteOnlineBatchCourse(entryId, {
      deleteUnderlyingCourse: deleteUnderlying,
    });

    if (!result.found) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'ব্যাচ কোর্স এন্ট্রিটি পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json({ deleted: result.deleted, id: entryId })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Delete online batch course failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'ব্যাচ কোর্স মুছে ফেলতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
