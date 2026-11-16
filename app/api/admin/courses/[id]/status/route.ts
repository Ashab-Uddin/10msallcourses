import { NextRequest, NextResponse } from 'next/server';
import { updateExistingCourse } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = await updateExistingCourse(Number(id), {
      status: String(body?.status || 'active'),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update course status failed:', error);
    return NextResponse.json({ error: 'Failed to update course status' }, { status: 500 });
  }
}
