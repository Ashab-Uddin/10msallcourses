import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  reorderCoursePosition,
  saveCategoryCourseOrder,
  swapCourseOrder,
} from '@/src/db/repository';
import { parseCourseDisplayOrder } from '@/src/db/repositoryShared';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { normalizeCategorySortSlug, normalizeOrderedCourseIds } from '@/src/lib/courseSorting';

export const dynamic = 'force-dynamic';

async function handleCategoryBatchReorder(
  req: NextRequest,
  auth: Extract<Awaited<ReturnType<typeof authorizeAdminRequest>>, { ok: true }>,
  body: Record<string, unknown>
) {
  const categorySlug = normalizeCategorySortSlug(String(body?.categorySlug || ''));
  if (!categorySlug) {
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অনুগ্রহ করে একটি বৈধ ক্যাটাগরি নির্বাচন করুন।' },
        { status: 400 }
      )
    );
  }

  if (!Array.isArray(body?.orderedCourseIds) || body.orderedCourseIds.length === 0) {
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'কোর্সের নতুন ক্রমের তালিকা খালি রাখা যাবে না।' },
        { status: 400 }
      )
    );
  }

  const rawIds = body.orderedCourseIds as unknown[];
  const cleanIds = normalizeOrderedCourseIds(rawIds);
  if (cleanIds.length !== rawIds.length) {
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'কোর্স তালিকায় অবৈধ বা ডুপ্লিকেট আইডি পাওয়া গেছে।' },
        { status: 400 }
      )
    );
  }

  const result = await saveCategoryCourseOrder(categorySlug, cleanIds);
  return auth.withSessionCookies(
    NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    )
  );
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return await handleCategoryBatchReorder(req, auth, body);
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Save category course positions failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'ক্যাটাগরি অনুযায়ী কোর্সের পজিশন সংরক্ষণ ব্যর্থ হয়েছে।' },
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
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Mode 0: Category-wise Drag & Drop Batch Save (`{ categorySlug, orderedCourseIds }`)
    if (body?.categorySlug !== undefined || body?.orderedCourseIds !== undefined) {
      return await handleCategoryBatchReorder(req, auth, body);
    }

    // Mode 1: Direct move to specific Serial / Position Number (`{ courseId, targetPosition }`)
    if (body?.courseId !== undefined || body?.targetPosition !== undefined) {
      const courseId = Number(body?.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: 'সঠিক কোর্স নির্বাচন করা হয়নি।' },
            { status: 400 }
          )
        );
      }

      const parsedOrder = parseCourseDisplayOrder(body?.targetPosition);
      if (!parsedOrder.valid) {
        return auth.withSessionCookies(
          NextResponse.json({ error: parsedOrder.error }, { status: 400 })
        );
      }

      const courses = await reorderCoursePosition(courseId, parsedOrder.value);
      return auth.withSessionCookies(
        NextResponse.json(
          { courses },
          {
            headers: { 'Cache-Control': 'private, no-store' },
          }
        )
      );
    }

    // Mode 2: Two-course swap (`{ firstId, secondId }`)
    const firstId = Number(body?.firstId);
    const secondId = Number(body?.secondId);
    if (
      !Number.isInteger(firstId) ||
      !Number.isInteger(secondId) ||
      firstId <= 0 ||
      secondId <= 0 ||
      firstId === secondId
    ) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'পজিশন পরিবর্তনের জন্য বৈধ কোর্স ও সিরিয়াল নম্বর প্রদান করুন।' },
          { status: 400 }
        )
      );
    }

    const courses = await swapCourseOrder(firstId, secondId);
    return auth.withSessionCookies(
      NextResponse.json(
        { courses },
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
    console.error('Reorder course position failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'কোর্সের পজিশন পরিবর্তন ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
