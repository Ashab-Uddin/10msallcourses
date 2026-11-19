import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  createNewCategory,
  getAdminOverviewData,
} from '@/src/db/repository';
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
      NextResponse.json(data.categories || [], {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    console.error('Admin categories failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const body = await req.json().catch(() => ({}));
    const data = await createNewCategory(body);
    return auth.withSessionCookies(
      NextResponse.json(data, {
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Create category failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'ক্যাটাগরি তৈরি ব্যর্থ হয়েছে।' }, { status: 500 })
    );
  }
}
