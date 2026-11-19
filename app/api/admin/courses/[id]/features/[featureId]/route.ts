import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  deleteCourseFeature,
  updateCourseFeature,
} from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; featureId: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const { id, featureId: rawFeatureId } = await params;
    const courseId = parsePositiveId(id);
    const featureId = parsePositiveId(rawFeatureId);
    if (!courseId || !featureId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ কোর্স বা ফিচার আইডি।' }, { status: 400 })
      );
    }

    const body = await req.json().catch(() => ({}));
    const updated = await updateCourseFeature(courseId, featureId, {
      title: body?.title,
      icon: body?.icon,
      isActive: body?.isActive,
      sortOrder: body?.sortOrder,
    });

    if (!updated) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'ফিচারটি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
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
    console.error('Update course feature failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'ফিচার আপডেট করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; featureId: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const { id, featureId: rawFeatureId } = await params;
    const courseId = parsePositiveId(id);
    const featureId = parsePositiveId(rawFeatureId);
    if (!courseId || !featureId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ কোর্স বা ফিচার আইডি।' }, { status: 400 })
      );
    }

    const result = await deleteCourseFeature(courseId, featureId);
    if (!result.deleted) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'ফিচারটি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Delete course feature failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'ফিচার মুছে ফেলতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}
