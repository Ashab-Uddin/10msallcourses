import { NextRequest, NextResponse } from 'next/server';
import { createOfferTimer, getOfferTimers } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await getOfferTimers();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Failed to load offer timers:', error);
    return NextResponse.json(
      { error: 'অফার টাইমার তালিকা লোড করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { timer: result.timer, serverNow: result.serverNow },
      {
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (error) {
    console.error('Failed to create offer timer:', error);
    return NextResponse.json(
      { error: 'অফার টাইমার তৈরি করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
