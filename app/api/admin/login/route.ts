import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cleanEmail = String(body?.email || '').trim().toLowerCase();
    const cleanPass = String(body?.password || '').trim();

    if (
      (cleanEmail === 'ashabuddin2274@gmail.com' && cleanPass === 'admin123') ||
      (cleanEmail === 'admin@10ms.com' && cleanPass === 'admin123')
    ) {
      return NextResponse.json({
        success: true,
        token: 'DEMO_ADMIN_TOKEN',
        email: cleanEmail,
        name:
          cleanEmail === 'ashabuddin2274@gmail.com'
            ? 'Ashab Uddin'
            : 'Site Admin',
      });
    }

    return NextResponse.json(
      { error: 'ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক ক্রেডেনশিয়াল দিন।' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { error: 'লগইন প্রসেসে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
