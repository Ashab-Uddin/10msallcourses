import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  getAdminOverviewData,
  updatePortalSettings,
} from '@/src/db/repository';
import {
  authorizeAdminRequest,
  updateAdminDisplayName,
} from '@/src/lib/adminAuth';
import { validateExternalHttpUrl } from '@/src/lib/affiliateUrl';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const data = await getAdminOverviewData();
    return auth.withSessionCookies(
      NextResponse.json(data.settings || null, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    console.error('Admin settings failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  const { admin } = auth;
  try {
    const body = await req.json().catch(() => ({}));

    if (typeof body?.whatsappLink === 'string') {
      if (body.whatsappLink.trim()) {
        const check = validateExternalHttpUrl(body.whatsappLink);
        if (!check.valid) {
          return auth.withSessionCookies(
            NextResponse.json(
              { error: 'বৈধ হোয়াটসঅ্যাপ লিংক (https://wa.me/...) প্রদান করুন।' },
              { status: 400 }
            )
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
          return auth.withSessionCookies(
            NextResponse.json(
              { error: 'বৈধ ফেসবুক মেসেঞ্জার লিংক (https://m.me/...) প্রদান করুন।' },
              { status: 400 }
            )
          );
        }
        body.messengerLink = check.normalized;
      } else {
        body.messengerLink = '';
      }
    }

    let updatedAdminName = admin.name;
    let applySessionCookies: ((res: NextResponse) => void) | undefined;

    if (body?.adminName !== undefined) {
      if (typeof body.adminName !== 'string') {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: 'অ্যাডমিনের নাম সঠিক ফরম্যাটে প্রদান করুন।' },
            { status: 400 }
          )
        );
      }
      const nameUpdateResult = await updateAdminDisplayName(req, admin, body.adminName);
      if (nameUpdateResult.ok === false) {
        return auth.withSessionCookies(
          NextResponse.json(
            { error: nameUpdateResult.error },
            { status: nameUpdateResult.status }
          )
        );
      }
      updatedAdminName = nameUpdateResult.name;
      applySessionCookies = nameUpdateResult.applySessionCookies;
    }

    const data = await updatePortalSettings(body);
    const res = NextResponse.json(
      {
        ...data,
        adminName: updatedAdminName,
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
    auth.withSessionCookies(res);
    applySessionCookies?.(res);
    return res;
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Save settings failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।' }, { status: 500 })
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
