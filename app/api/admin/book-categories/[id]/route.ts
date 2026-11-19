import { NextRequest, NextResponse } from 'next/server';
import {
  deleteBookCategoryById,
  updateExistingBookCategory,
} from '@/src/db/bookRepository';
import { RepositoryError } from '@/src/db/repositoryShared';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

function parsePositiveId(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const categoryId = parsePositiveId(id);
    if (!categoryId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ ক্যাটাগরি আইডি।' }, { status: 400 })
      );
    }

    const body = await req.json().catch(() => ({}));
    const updated = await updateExistingBookCategory(categoryId, body);
    if (!updated) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'ক্যাটাগরি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(updated, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('[PUT /api/admin/book-categories/[id]] Failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'বুক ক্যাটাগরি আপডেট করতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const categoryId = parsePositiveId(id);
    if (!categoryId) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অবৈধ ক্যাটাগরি আইডি।' }, { status: 400 })
      );
    }

    const result = await deleteBookCategoryById(categoryId);
    if (!result.found) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'ক্যাটাগরি খুঁজে পাওয়া যায়নি।' }, { status: 404 })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('[DELETE /api/admin/book-categories/[id]] Failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'বুক ক্যাটাগরি মুছে ফেলতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
