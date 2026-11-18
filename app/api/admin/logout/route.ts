import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation, signOutAdminSession } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) {
    return NextResponse.json(
      { error: 'Cross-site request blocked by CSRF protection.' },
      {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  const res = NextResponse.json(
    { success: true },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
  await signOutAdminSession(req, res);
  return res;
}
