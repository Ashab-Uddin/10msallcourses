import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  getAdminOverviewData,
  updatePortalSettings,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { validateExternalHttpUrl } from '@/src/lib/affiliateUrl';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
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
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));

    if (typeof body?.whatsappLink === 'string') {
      if (body.whatsappLink.trim()) {
        const check = validateExternalHttpUrl(body.whatsappLink);
        if (!check.valid) {
          return NextResponse.json(
            { error: 'বৈধ হোয়াটসঅ্যাপ লিংক (https://wa.me/...) প্রদান করুন।' },
            { status: 400 }
          );
        }
        body.whatsappLink = check.normalized;
      } else {
        body.whatsappLink = '';
      }
    }

    if (typeof body?.messengerLink === 'string') {
      if (body.messengerLink.trim()) {
        const check = validateExternalHttpUrl(body.messengerLink);
        if (!check.valid) {
          return NextResponse.json(
            { error: 'বৈধ ফেসবুক মেসেঞ্জার লিংক (https://m.me/...) প্রদান করুন।' },
            { status: 400 }
          );
        }
        body.messengerLink = check.normalized;
      } else {
        body.messengerLink = '';
      }
    }

    const data = await updatePortalSettings(body);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Save settings failed:', error);
    return NextResponse.json({ error: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
