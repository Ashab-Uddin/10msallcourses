import { NextRequest, NextResponse } from 'next/server';
import { RepositoryError, createOfferTimer, getOfferTimers } from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const data = await getOfferTimers();
    return auth.withSessionCookies(
      NextResponse.json(data, {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      })
    );
  } catch (error) {
    console.error('Failed to load offer timers:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অফার টাইমার তালিকা লোড করতে ব্যর্থ হয়েছে।' },
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
    const body = await req.json();
    const result = await createOfferTimer({
      courseId: body?.courseId,
      offerLabel: body?.offerLabel,
      startAt: body?.startAt,
      endAt: body?.endAt,
      isPaused: body?.isPaused,
    });

    if (!result.ok) {
      return auth.withSessionCookies(
        NextResponse.json({ error: result.error }, { status: result.status })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(
        { timer: result.timer, serverNow: result.serverNow },
        {
          status: 201,
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
    console.error('Failed to create offer timer:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অফার টাইমার তৈরি করতে ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
