import { NextRequest, NextResponse } from 'next/server';
import { deleteCustomerInquiry } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const result = await deleteCustomerInquiry(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete message failed:', error);
    return NextResponse.json({ error: 'Failed to delete inquiry' }, { status: 500 });
  }
}
