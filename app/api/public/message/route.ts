import { NextRequest, NextResponse } from 'next/server';
import { saveCustomerInquiry } from '@/src/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: 'অনুগ্রহ করে আপনার বার্তা লিখুন।' }, { status: 400 });
    }
    const inquiry = await saveCustomerInquiry({
      name: String(body?.name || 'Anonymous'),
      phoneOrEmail: String(body?.phoneOrEmail || ''),
      message,
      courseTitle: body?.courseTitle ? String(body.courseTitle) : undefined,
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
