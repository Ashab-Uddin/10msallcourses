import { NextRequest, NextResponse } from 'next/server';
import { getAdminOverviewData } from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const data = await getAdminOverviewData();
    return auth.withSessionCookies(
      NextResponse.json(data, {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      })
    );
  } catch (error) {
    console.error('Admin overview failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'Failed to load admin overview' }, { status: 500 })
    );
  }
}
