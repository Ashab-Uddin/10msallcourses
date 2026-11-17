import { NextRequest, NextResponse } from 'next/server';
import { getAdminOverviewData, updatePortalSettings } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { validateExternalHttpUrl } from '@/src/lib/affiliateUrl';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await getAdminOverviewData();
    return NextResponse.json(data.settings || null, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Admin settings failed:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    if (typeof body?.whatsappLink === 'string' && body.whatsappLink.trim()) {
      const check = validateExternalHttpUrl(body.whatsappLink);
      if (!check.valid) {
        return NextResponse.json(
          { error: 'বৈধ হোয়াটসঅ্যাপ লিংক (https://wa.me/...) প্রদান করুন।' },
          { status: 400 }
        );
      }
      body.whatsappLink = check.normalized;
    }

    if (typeof body?.messengerLink === 'string' && body.messengerLink.trim()) {
      const check = validateExternalHttpUrl(body.messengerLink);
      if (!check.valid) {
        return NextResponse.json(
          { error: 'বৈধ ফেসবুক মেসেঞ্জার লিংক (https://m.me/...) প্রদান করুন।' },
          { status: 400 }
        );
      }
      body.messengerLink = check.normalized;
    }

    const data = await updatePortalSettings(body);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Save settings failed:', error);
    return NextResponse.json({ error: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
