import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  reorderCoursePosition,
  swapCourseOrder,
} from '@/src/db/repository';
import { parseCourseDisplayOrder } from '@/src/db/repositoryShared';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));

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
