import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminLogin } from '@/src/lib/adminAuth';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit(req, 'admin_login', 10, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `অতিরিক্ত লগইন প্রচেষ্টা করা হয়েছে। অনুগ্রহ করে ${rate.retryAfterSeconds} সেকেন্ড পর আবার চেষ্টা করুন।`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.retryAfterSeconds),
            'Cache-Control': 'private, no-store',
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '');
    const password = String(body?.password || '');

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

    const res = NextResponse.json(
      {
        success: true,
        email: result.admin.email,
        name: result.admin.name,
        role: result.admin.role,
        provider: result.admin.provider,
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
