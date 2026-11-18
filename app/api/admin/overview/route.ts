import { NextRequest, NextResponse } from 'next/server';
import { getAdminOverviewData } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  try {
    const data = await getAdminOverviewData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    return NextResponse.json({ error: 'Failed to load admin overview' }, { status: 500 });
  }
}
