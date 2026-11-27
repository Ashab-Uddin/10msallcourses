import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { RepositoryError } from '@/src/db/repository';
import {
  getOnlineBatchPageConfig,
  saveOnlineBatchPageConfig,
} from '@/src/db/onlineBatchRepository';
import { validateOnlineBatchPageConfigInput } from '@/src/lib/onlineBatchPageConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const pageConfig = await getOnlineBatchPageConfig({ bypassCache: true });
    return auth.withSessionCookies(
      NextResponse.json(
        { pageConfig },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      )
    );
  } catch (error) {
    console.error('Failed to load online batch page config:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অনলাইন ব্যাচ পেজ কনফিগারেশন লোড করতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

async function handleSave(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => null);
    const candidate =
      body && typeof body === 'object' && 'pageConfig' in body
        ? (body as Record<string, unknown>).pageConfig
        : body;

    const check = validateOnlineBatchPageConfigInput(candidate);
    if (!check.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: check.error },
          {
            status: 400,
            headers: { 'Cache-Control': 'private, no-store' },
          }
        )
      );
    }

    const pageConfig = await saveOnlineBatchPageConfig(check.config);
    return auth.withSessionCookies(
      NextResponse.json(
        { pageConfig },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: error.message },
          {
            status: error.status,
            headers: { 'Cache-Control': 'private, no-store' },
          }
        )
      );
    }
    console.error('Save online batch page config failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অনলাইন ব্যাচ পেজ কনফিগারেশন সংরক্ষণ করতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function PUT(req: NextRequest) {
  return handleSave(req);
}

export async function POST(req: NextRequest) {
  return handleSave(req);
}
