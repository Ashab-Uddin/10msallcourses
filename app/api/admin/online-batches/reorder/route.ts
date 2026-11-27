import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { RepositoryError } from '@/src/db/repository';
import { reorderOnlineBatchCourses } from '@/src/db/onlineBatchRepository';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const batchClassId = Number(body?.batchClassId);
    const orderedIds = Array.isArray(body?.orderedEntryIds)
      ? body.orderedEntryIds.map((v: unknown) => Number(v))
      : [];

    const reordered = await reorderOnlineBatchCourses(batchClassId, orderedIds);
    return auth.withSessionCookies(
      NextResponse.json(
        { ok: true, batchClassId, entries: reordered },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Reorder online batch courses failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'কোর্সের পজিশন সাজাতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
