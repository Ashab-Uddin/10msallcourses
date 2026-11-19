import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  createCourseFeature,
  getCourseFeatures,
  reorderCourseFeatures,
  replaceCourseFeatures,
} from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function GET(
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

    const features = await getCourseFeatures(courseId);
    return auth.withSessionCookies(
      NextResponse.json(
        { courseId, features },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Get course features failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'কোর্স ফিচার লোড করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
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
    const courseId = parsePositiveId(id);
    if (!courseId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ কোর্স আইডি।' }, { status: 400 })
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await createCourseFeature(courseId, {
      title: body?.title,
      icon: body?.icon,
      isActive: body?.isActive,
      sortOrder: body?.sortOrder,
    });

    return auth.withSessionCookies(
      NextResponse.json(result, {
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
    console.error('Create course feature failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'ফিচার যোগ করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}

export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.orderedIds)) {
      const orderedIds = body.orderedIds
        .map((val: unknown) => Number(val))
        .filter((n: number) => Number.isInteger(n) && n > 0);
      if (orderedIds.length === 0) {
        return auth.withSessionCookies(
          NextResponse.json({ error: 'বৈধ ফিচার ক্রম তালিকা প্রদান করুন।' }, { status: 400 })
        );
      }
      const features = await reorderCourseFeatures(courseId, orderedIds);
      return auth.withSessionCookies(
        NextResponse.json(
          { courseId, features },
          { headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    if (Array.isArray(body?.features)) {
      const features = await replaceCourseFeatures(courseId, body.features);
      return auth.withSessionCookies(
        NextResponse.json(
          { courseId, features },
          { headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    return auth.withSessionCookies(
      NextResponse.json({ error: 'অনুগ্রহ করে orderedIds অথবা features তালিকা পাঠান।' }, { status: 400 })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Patch course features failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'ফিচার আপডেট করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}
