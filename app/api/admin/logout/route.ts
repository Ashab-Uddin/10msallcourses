import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
  clearAdminSessionCookie(res);
  return res;
}
