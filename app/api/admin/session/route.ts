import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdminWithCookies } from '@/src/lib/adminAuth';
import { applyPendingSupabaseCookies } from '@/src/lib/supabase/server';
import { getAdminOverviewData } from '@/src/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { admin, pendingCookies } = await getAuthenticatedAdminWithCookies(req);
  if (!admin) {
    const res = NextResponse.json(
      { authenticated: false, error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
    applyPendingSupabaseCookies(res, pendingCookies, req);
    return res;
  }

  const includeOverview = req.nextUrl.searchParams.get('includeOverview') === '1';
  const initialDashboardData = includeOverview
    ? await getAdminOverviewData().catch((err) => {
        console.warn('[admin/session] Preloading overview data failed:', err);
        return null;
      })
    : null;

  const res = NextResponse.json(
    {
      authenticated: true,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      provider: admin.provider,
      expiresAt: new Date(admin.exp * 1000).toISOString(),
      ...(initialDashboardData ? { initialDashboardData } : {}),
    },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
  applyPendingSupabaseCookies(res, pendingCookies, req);
  return res;
}

