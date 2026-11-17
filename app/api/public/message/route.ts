import { NextRequest, NextResponse } from 'next/server';
import { saveCustomerInquiry } from '@/src/db/repository';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit(req, 'public_message', 8, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `অনেকগুলো বার্তা পাঠানো হয়েছে। অনুগ্রহ করে ${rate.retryAfterSeconds} সেকেন্ড পর আবার চেষ্টা করুন।`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    const name = String(body?.name || 'Anonymous').trim();
    const phoneOrEmail = String(body?.phoneOrEmail || '').trim();
    const courseTitle = body?.courseTitle ? String(body.courseTitle).trim() : undefined;

    if (message.length < 2) {
      return NextResponse.json(
        { error: 'অনুগ্রহ করে আপনার বার্তা লিখুন।' },
        { status: 400 }
      );
    }
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'বার্তাটি সর্বোচ্চ ২০০০ অক্ষরের মধ্যে হতে হবে।' },
        { status: 400 }
      );
    }
    if (name.length > 100 || phoneOrEmail.length > 120) {
      return NextResponse.json(
        { error: 'নাম বা যোগাযোগের তথ্য অতিরিক্ত দীর্ঘ।' },
        { status: 400 }
      );
    }

    const inquiry = await saveCustomerInquiry({
      name,
      phoneOrEmail,
      message,
      courseTitle,
    });

    return NextResponse.json(
      {
        success: true,
        inquiry,
        reply: `ধন্যবাদ ${inquiry.name}! আপনার বার্তাটি সফলভাবে সংরক্ষিত হয়েছে। আমাদের কোর্স কাউন্সেলর টিম দ্রুত আপনার সাথে যোগাযোগ করবেন।`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Customer message failed:', error);
    return NextResponse.json({ error: 'বার্তা পাঠাতে সমস্যা হয়েছে।' }, { status: 500 });
  }
}
