import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { getAdminClassGuides } from '@/src/db/classGuideRepository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const guides = await getAdminClassGuides();
    return auth.withSessionCookies(
      NextResponse.json(
        { guides },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      )
    );
  } catch (error) {
    console.error('Failed to load admin class guides:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'গাইড কনফিগারেশন লোড করতে সমস্যা হয়েছে।' },
        { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }
}
