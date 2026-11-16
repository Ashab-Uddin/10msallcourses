import { NextRequest, NextResponse } from 'next/server';
import {
  deleteCourseById,
  normalizeCourseStatus,
  parseSafePrice,
  updateExistingCourse,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const origCheck =
      body.originalPrice !== undefined ? parseSafePrice(body.originalPrice) : null;
    const discCheck =
      body.discountPrice !== undefined ? parseSafePrice(body.discountPrice) : null;

    if ((origCheck && !origCheck.valid) || (discCheck && !discCheck.valid)) {
      return NextResponse.json(
        { error: 'কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' },
        { status: 400 }
      );
    }

    const sanitizedBody = { ...body };
    if (origCheck) sanitizedBody.originalPrice = origCheck.value;
    if (discCheck) sanitizedBody.discountPrice = discCheck.value;
    if (sanitizedBody.status !== undefined) {
      sanitizedBody.status = normalizeCourseStatus(sanitizedBody.status, 'active');
    }

    const data = await updateExistingCourse(Number(id), sanitizedBody);
    if (!data) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update course failed:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const result = await deleteCourseById(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete course failed:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
