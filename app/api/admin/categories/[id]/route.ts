import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  deleteCategoryById,
  updateExistingCategory,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const categoryId = parsePositiveId(id);
    if (!categoryId) {
      return NextResponse.json({ error: 'অবৈধ ক্যাটাগরি আইডি।' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const data = await updateExistingCategory(categoryId, body);
    if (!data) {
      return NextResponse.json({ error: 'ক্যাটাগরিটি পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Update category failed:', error);
    return NextResponse.json({ error: 'ক্যাটাগরি আপডেট ব্যর্থ হয়েছে।' }, { status: 500 });
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
    const categoryId = parsePositiveId(id);
    if (!categoryId) {
      return NextResponse.json({ error: 'অবৈধ ক্যাটাগরি আইডি।' }, { status: 400 });
    }

    const result = await deleteCategoryById(categoryId);
    if (!result.found) {
      return NextResponse.json({ error: 'ক্যাটাগরিটি পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Delete category failed:', error);
    return NextResponse.json({ error: 'ক্যাটাগরি মুছে ফেলতে ব্যর্থ হয়েছে।' }, { status: 500 });
  }
}
