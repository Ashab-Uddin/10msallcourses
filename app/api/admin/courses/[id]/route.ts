import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  countCoursesUsingImageUrl,
  deleteCourseById,
  getCourseById,
  normalizeCourseStatus,
  parseSafePrice,
  updateExistingCourse,
} from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { sanitizeImageUrl, validateExternalHttpUrl } from '@/src/lib/affiliateUrl';
import { syncTargetStudentsMetadata, validateCoursePricing } from '@/src/lib/courseValidation';
import { deleteImageKitFileByUrl, isManagedImageKitUrl } from '@/src/lib/imagekit';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

async function cleanupOrphanedImageKitThumbnail(
  previousImageUrl: string | null | undefined,
  excludeCourseId: number
): Promise<void> {
  if (!previousImageUrl || !isManagedImageKitUrl(previousImageUrl)) {
    return;
  }
  try {
    const remainingRefs = await countCoursesUsingImageUrl(previousImageUrl, excludeCourseId);
    if (remainingRefs === 0) {
      await deleteImageKitFileByUrl(previousImageUrl);
    }
  } catch (err) {
    console.warn('[courses] Best-effort ImageKit thumbnail cleanup warning:', err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const courseId = parsePositiveId(id);
    if (!courseId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ কোর্স আইডি।' }, { status: 400 })
      );
    }

    const existing = await getCourseById(courseId);
    if (!existing) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    const body = await req.json().catch(() => ({}));

    if (body.affiliateUrl !== undefined) {
      const affiliateCheck = validateExternalHttpUrl(body.affiliateUrl);
      if (!affiliateCheck.valid) {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: affiliateCheck.error || 'বৈধ অ্যাফিলিয়েট লিংক (https://...) প্রদান করুন।' },
            { status: 400 }
          )
        );
      }
      body.affiliateUrl = affiliateCheck.normalized;
    }

    if (body.imageUrl !== undefined) {
      const imageCheck = sanitizeImageUrl(body.imageUrl);
      if (!imageCheck.valid) {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: imageCheck.error || 'অবৈধ ইমেজ লিংক।' },
            { status: 400 }
          )
        );
      }
      body.imageUrl = imageCheck.value;
    }

    let syncedTargetMetadata: {
      targetStudents: string;
      targetBatch: string | null;
      targetGroups: ReturnType<typeof syncTargetStudentsMetadata>['targetGroups'];
    } | null = null;

    if (
      body.targetStudents !== undefined ||
      body.targetBatch !== undefined ||
      body.targetGroups !== undefined
    ) {
      const targetSync = syncTargetStudentsMetadata({
        targetStudents:
          body.targetStudents !== undefined ? body.targetStudents : existing.targetStudents,
        targetBatch: body.targetBatch,
        targetGroups: body.targetGroups,
      });
      if (!targetSync.valid) {
        return auth.withSessionCookies(
          NextResponse.json(
            {
              error:
                targetSync.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।',
            },
            { status: 400 }
          )
        );
      }
      syncedTargetMetadata = {
        targetStudents: targetSync.targetStudents,
        targetBatch: targetSync.targetBatch,
        targetGroups: targetSync.targetGroups,
      };
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
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' },
          { status: 400 }
        )
      );
    }

    if (origCheck || discCheck) {
      const effectiveOriginal = origCheck ? origCheck.value : existing.originalPrice;
      const effectiveDiscount = discCheck ? discCheck.value : existing.discountPrice;
      const pricingCheck = validateCoursePricing(effectiveOriginal, effectiveDiscount);
      if (!pricingCheck.valid) {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: pricingCheck.error || 'অবৈধ মূল্য প্রদান করা হয়েছে।' },
            { status: 400 }
          )
        );
      }
    }

    const sanitizedBody = { ...body };
    if (syncedTargetMetadata) {
      sanitizedBody.targetStudents = syncedTargetMetadata.targetStudents;
      sanitizedBody.targetBatch = syncedTargetMetadata.targetBatch;
      sanitizedBody.targetGroups = syncedTargetMetadata.targetGroups;
    }
    if (origCheck) sanitizedBody.originalPrice = origCheck.value;
    if (discCheck) sanitizedBody.discountPrice = discCheck.value;
    if (sanitizedBody.shortBadge !== undefined && typeof sanitizedBody.shortBadge === 'string') {
      sanitizedBody.shortBadge = sanitizedBody.shortBadge.trim();
    }
    if (sanitizedBody.status !== undefined) {
      sanitizedBody.status = normalizeCourseStatus(sanitizedBody.status, 'active');
    }
    if (
      sanitizedBody.description !== undefined &&
      !String(sanitizedBody.description || '').trim() &&
      Array.isArray(sanitizedBody.courseFeatures)
    ) {
      sanitizedBody.description = sanitizedBody.courseFeatures
        .filter((f: { isActive?: boolean; title?: string }) => f?.isActive !== false && f?.title)
        .slice(0, 3)
        .map((f: { title?: string }) => String(f.title).trim())
        .join(' • ');
    }

    const data = await updateExistingCourse(courseId, sanitizedBody);
    if (!data) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    // Best-effort ImageKit cleanup if an old managed thumbnail was replaced or removed
    if (
      body.imageUrl !== undefined &&
      existing.imageUrl &&
      existing.imageUrl !== data.imageUrl
    ) {
      await cleanupOrphanedImageKitThumbnail(existing.imageUrl, courseId);
    }

    return auth.withSessionCookies(
      NextResponse.json(data, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Update course failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'কোর্স আপডেট করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const courseId = parsePositiveId(id);
    if (!courseId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ কোর্স আইডি।' }, { status: 400 })
      );
    }
    const result = await deleteCourseById(courseId);
    if (!result.found) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    if (result.previousImageUrl) {
      await cleanupOrphanedImageKitThumbnail(result.previousImageUrl, courseId);
    }

    return auth.withSessionCookies(
      NextResponse.json(
        { deleted: result.deleted, found: result.found },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Delete course failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'কোর্স মুছে ফেলতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}
