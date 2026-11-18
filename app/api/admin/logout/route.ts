import { NextRequest, NextResponse } from 'next/server';
import { signOutAdminSession } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const res = NextResponse.json(
    { success: true },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
  await signOutAdminSession(req, res);
  return res;
}
