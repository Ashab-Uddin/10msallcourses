import { NextRequest, NextResponse } from 'next/server';
import { createNewBookCategory, getBookCategories } from '@/src/db/bookRepository';
import { RepositoryError } from '@/src/db/repositoryShared';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  try {
    const categories = await getBookCategories(true);
    return NextResponse.json(categories, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/admin/book-categories] Failed:', error);
    return NextResponse.json(
      { error: 'বুক ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
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
    const rawName = String(body?.name ?? body?.categoryName ?? body?.category_name ?? '').trim();
    if (!rawName) {
      return NextResponse.json(
        { error: 'ক্যাটাগরির নাম পূরণ করা আবশ্যক।' },
        { status: 400 }
      );
    }

    const created = await createNewBookCategory(body);
    return NextResponse.json(created, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[POST /api/admin/book-categories] Failed:', error);
    return NextResponse.json(
      { error: 'নতুন বুক ক্যাটাগরি তৈরি করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
