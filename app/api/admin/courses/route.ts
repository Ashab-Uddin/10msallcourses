import { NextRequest, NextResponse } from 'next/server';
import { createNewCourse, getAdminOverviewData } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await getAdminOverviewData();
    return NextResponse.json(data.courses || []);
  } catch (error) {
    console.error('Admin courses failed:', error);
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const data = await createNewCourse(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create course failed:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
