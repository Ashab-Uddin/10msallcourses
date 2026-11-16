import { NextRequest, NextResponse } from 'next/server';
import { getAdminOverviewData, updatePortalSettings } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await getAdminOverviewData();
    return NextResponse.json(data.settings || null);
  } catch (error) {
    console.error('Admin settings failed:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const data = await updatePortalSettings(body);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Save settings failed:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
