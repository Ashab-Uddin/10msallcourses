import { NextRequest, NextResponse } from 'next/server';
import { RepositoryError, importCourseFeaturesFromCourse } from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: unknown): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const targetCourseId = parsePositiveId(id);
    if (!targetCourseId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ লক্ষ্য কোর্স আইডি।' }, { status: 400 })
      );
    }

    const body = await req.json().catch(() => ({}));
    const sourceCourseId = parsePositiveId(body?.sourceCourseId);
    if (!sourceCourseId) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'অনুগ্রহ করে একটি বৈধ উৎস (Source) কোর্স নির্বাচন করুন।' },
          { status: 400 }
        )
      );
    }

    const selectAll = Boolean(body?.selectAll);
    const featureIds = Array.isArray(body?.featureIds)
      ? body.featureIds
          .map((val: unknown) => Number(val))
          .filter((n: number) => Number.isInteger(n) && n > 0)
      : undefined;

    const result = await importCourseFeaturesFromCourse(targetCourseId, sourceCourseId, {
      featureIds,
      selectAll,
    });

    return auth.withSessionCookies(
      NextResponse.json(
        {
          targetCourseId,
          sourceCourseId,
          ...result,
        },
        {
          status: result.addedCount > 0 ? 201 : 200,
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
    console.error('Import course features failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'কোর্স ফিচার ইম্পোর্ট করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}
