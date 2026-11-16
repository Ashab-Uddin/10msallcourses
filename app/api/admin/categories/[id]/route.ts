import { NextRequest, NextResponse } from 'next/server';
import { deleteCategoryById, updateExistingCategory } from '@/src/db/repository';
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
    const data = await updateExistingCategory(Number(id), body);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update category failed:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
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
    const result = await deleteCategoryById(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete category failed:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
