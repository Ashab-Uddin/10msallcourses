import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { RepositoryError } from '@/src/db/repository';
import {
  createOnlineBatchClass,
  deleteOnlineBatchClass,
  getAdminOnlineBatchData,
  reorderOnlineBatchClasses,
  updateOnlineBatchClass,
} from '@/src/db/onlineBatchRepository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const data = await getAdminOnlineBatchData();
    return auth.withSessionCookies(
      NextResponse.json(data.classes, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    console.error('Failed to fetch online batch classes:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'শ্রেণি লোড করতে সমস্যা হয়েছে।' }, { status: 500 })
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
    const created = await createOnlineBatchClass(body);
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
    console.error('Create online batch class failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'শ্রেণি তৈরি করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    const updated = await updateOnlineBatchClass(id, body);
    if (!updated) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'শ্রেণিটি পাওয়া যায়নি।' }, { status: 404 })
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
    console.error('Update online batch class failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'শ্রেণি আপডেট করতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderedIds = Array.isArray(body?.orderedIds)
      ? body.orderedIds.map((id: unknown) => Number(id))
      : [];
    const classes = await reorderOnlineBatchClasses(orderedIds);
    return auth.withSessionCookies(
      NextResponse.json({ ok: true, classes }, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Reorder online batch classes failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'শ্রেণি ক্রম সাজাতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const idParam = req.nextUrl.searchParams.get('id');
    const id = Number(idParam);
    const deleted = await deleteOnlineBatchClass(id);
    if (!deleted) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'শ্রেণিটি পাওয়া যায়নি।' }, { status: 404 })
      );
    }
    return auth.withSessionCookies(NextResponse.json({ deleted: true, id }));
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Delete online batch class failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'শ্রেণি মুছে ফেলতে সমস্যা হয়েছে।' }, { status: 500 })
    );
  }
}
