import { NextRequest, NextResponse } from 'next/server';
import { RepositoryError, updateExistingCourse } from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

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
    const courseId = Number(id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ কোর্স আইডি।' }, { status: 400 })
      );
    }

    const body = await req.json().catch(() => ({}));
    const status = body?.status;
    if (status !== 'active' && status !== 'inactive' && status !== 'closed') {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'সঠিক স্ট্যাটাস (active, inactive অথবা closed) প্রদান করুন।' },
          { status: 400 }
        )
      );
    }

    const data = await updateExistingCourse(courseId, { status });
    if (!data) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
      );
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
    console.error('Update course status failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'কোর্সের স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।' }, { status: 500 })
    );
  }
}
