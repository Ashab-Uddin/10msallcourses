import { NextRequest, NextResponse } from 'next/server';
import { getCustomerInquiries } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const inquiries = await getCustomerInquiries();
    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error('Admin messages failed:', error);
    return NextResponse.json({ error: 'Failed to load inquiries' }, { status: 500 });
  }
}
