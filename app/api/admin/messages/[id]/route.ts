import { NextRequest, NextResponse } from 'next/server';
import {
  deleteCustomerInquiry,
  updateCustomerInquiryStatus,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const inquiryId = parsePositiveId(id);
    if (!inquiryId) {
      return NextResponse.json({ error: 'অবৈধ বার্তা আইডি।' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const status = body?.status;
    if (status !== 'new' && status !== 'resolved') {
      return NextResponse.json({ error: 'অবৈধ স্ট্যাটাস মান।' }, { status: 400 });
    }
    const updated = await updateCustomerInquiryStatus(inquiryId, status);
    if (!updated) {
      return NextResponse.json({ error: 'বার্তাটি পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Update message failed:', error);
    return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 });
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
    const inquiryId = parsePositiveId(id);
    if (!inquiryId) {
      return NextResponse.json({ error: 'অবৈধ বার্তা আইডি।' }, { status: 400 });
    }
    const result = await deleteCustomerInquiry(inquiryId);
    if (!result.found) {
      return NextResponse.json({ error: 'বার্তাটি পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Delete message failed:', error);
    return NextResponse.json({ error: 'Failed to delete inquiry' }, { status: 500 });
  }
}
