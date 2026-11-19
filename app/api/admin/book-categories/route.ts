import { NextRequest, NextResponse } from 'next/server';
import { createNewBookCategory, getBookCategories } from '@/src/db/bookRepository';
import { RepositoryError } from '@/src/db/repositoryShared';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const categories = await getBookCategories(true);
    return auth.withSessionCookies(
      NextResponse.json(categories, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('[GET /api/admin/book-categories] Failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'বুক ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawName = String(body?.name ?? body?.categoryName ?? body?.category_name ?? '').trim();
    if (!rawName) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'ক্যাটাগরির নাম পূরণ করা আবশ্যক।' },
          { status: 400 }
        )
      );
    }

    const created = await createNewBookCategory(body);
    return auth.withSessionCookies(
      NextResponse.json(created, {
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('[POST /api/admin/book-categories] Failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'নতুন বুক ক্যাটাগরি তৈরি করতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
