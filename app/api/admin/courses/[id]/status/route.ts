import { NextRequest, NextResponse } from 'next/server';
import { updateExistingCourse } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const courseId = Number(id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json({ error: 'অবৈধ কোর্স আইডি।' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const status = body?.status;
    if (status !== 'active' && status !== 'inactive' && status !== 'closed') {
      return NextResponse.json(
        { error: 'সঠিক স্ট্যাটাস (active, inactive অথবা closed) প্রদান করুন।' },
        { status: 400 }
      );
    }

    const data = await updateExistingCourse(courseId, { status });
    if (!data) {
      return NextResponse.json({ error: 'কোর্সটি খুঁজে পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Update course status failed:', error);
    return NextResponse.json({ error: 'কোর্সের স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।' }, { status: 500 });
  }
}
