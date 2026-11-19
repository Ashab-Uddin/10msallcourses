import { NextRequest, NextResponse } from 'next/server';
import { RepositoryError, swapCategoryOrder } from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const firstId = Number(body?.firstId);
    const secondId = Number(body?.secondId);

    if (
      !Number.isInteger(firstId) ||
      !Number.isInteger(secondId) ||
      firstId <= 0 ||
      secondId <= 0 ||
      firstId === secondId
    ) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'ক্রম পরিবর্তনের জন্য দুইটি ভিন্ন বৈধ ক্যাটাগরি নির্বাচন করুন।' },
          { status: 400 }
        )
      );
    }

    const categories = await swapCategoryOrder(firstId, secondId);
    return auth.withSessionCookies(
      NextResponse.json(
        { categories },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Swap category order failed:', error);
    return auth.withSessionCookies(
      NextResponse.json({ error: 'ক্যাটাগরি ক্রম পরিবর্তন ব্যর্থ হয়েছে।' }, { status: 500 })
    );
  }
}
