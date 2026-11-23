import { NextRequest, NextResponse } from 'next/server';
import { getNextCategoryDisplayOrder } from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const nextDisplayOrder = await getNextCategoryDisplayOrder();
    return auth.withSessionCookies(
      NextResponse.json(
        { nextDisplayOrder },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      )
    );
  } catch (error) {
    console.error('Failed to resolve next category display order:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'পরবর্তী ক্যাটাগরি ক্রম নম্বর নির্ধারণ ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
