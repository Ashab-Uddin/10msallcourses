import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminLogin, isSameOriginMutation } from '@/src/lib/adminAuth';
import { checkRateLimit } from '@/src/lib/rateLimit';
import { getAdminOverviewData } from '@/src/db/repository';

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

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '');
    const password = String(body?.password || '');
    const includeOverview = body?.includeOverview === true;

    const cleanEmail = email.trim().toLowerCase();
    const emailDigest = cleanEmail
      ? crypto
          .createHash('sha256')
          .update(cleanEmail)
          .digest('hex')
          .slice(0, 24)
      : null;

    // Run IP and email rate-limit checks concurrently (cuts ~100ms sequential DB wait)
    const [ipRate, emailRate] = await Promise.all([
      checkRateLimit(req, 'admin_login', 10, 15 * 60 * 1000),
      emailDigest
        ? checkRateLimit(req, 'admin_login_email', 10, 15 * 60 * 1000, emailDigest)
        : Promise.resolve({ allowed: true, retryAfterSeconds: 0 }),
    ]);

    if (!ipRate.allowed) {
      return NextResponse.json(
        {
          error: `অতিরিক্ত লগইন প্রচেষ্টা করা হয়েছে। অনুগ্রহ করে ${ipRate.retryAfterSeconds} সেকেন্ড পর আবার চেষ্টা করুন।`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipRate.retryAfterSeconds),
            'Cache-Control': 'private, no-store',
          },
        }
      );
    }

    if (!emailRate.allowed) {
      return NextResponse.json(
        {
          error: `অতিরিক্ত লগইন প্রচেষ্টা করা হয়েছে। অনুগ্রহ করে ${emailRate.retryAfterSeconds} সেকেন্ড পর আবার চেষ্টা করুন।`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(emailRate.retryAfterSeconds),
            'Cache-Control': 'private, no-store',
          },
        }
      );
    }

    const result = await authenticateAdminLogin(req, email, password);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        {
          status: result.status,
          headers: { 'Cache-Control': 'private, no-store' },
        }
      );
    }

    // Optional single-round-trip dashboard preload so the dashboard renders immediately post-login
    const initialDashboardData = includeOverview
      ? await getAdminOverviewData().catch((err) => {
          console.warn('[admin/login] Preloading overview data failed:', err);
          return null;
        })
      : null;

    const res = NextResponse.json(
      {
        success: true,
        email: result.admin.email,
        name: result.admin.name,
        role: result.admin.role,
        provider: result.admin.provider,
        ...(initialDashboardData ? { initialDashboardData } : {}),
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
    result.applySessionCookies(res);
    return res;
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { error: 'লগইন প্রসেসে সমস্যা হয়েছে।' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}

