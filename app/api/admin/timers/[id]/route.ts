import { NextRequest, NextResponse } from 'next/server';
import {
  deleteOfferTimer,
  setOfferTimerPaused,
  updateOfferTimer,
} from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid timer id' }, { status: 400 });
    }

    const body = await req.json();
    const result = await updateOfferTimer(numericId, {
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
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Failed to update offer timer:', error);
    return NextResponse.json(
      { error: 'অফার টাইমার আপডেট করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid timer id' }, { status: 400 });
    }

    const body = await req.json();
    if (typeof body?.isPaused !== 'boolean') {
      return NextResponse.json(
        { error: 'সঠিক স্ট্যাটাস মান (isPaused) প্রদান করুন।' },
        { status: 400 }
      );
    }

    const result = await setOfferTimerPaused(numericId, body.isPaused);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { timer: result.timer, serverNow: result.serverNow },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Failed to toggle offer timer pause state:', error);
    return NextResponse.json(
      { error: 'অফার টাইমারের অবস্থা পরিবর্তন করা যায়নি।' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid timer id' }, { status: 400 });
    }

    const res = await deleteOfferTimer(numericId);
    if (!res.found) {
      return NextResponse.json({ error: 'অফার টাইমারটি পাওয়া যায়নি।' }, { status: 404 });
    }
    return NextResponse.json(res, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Failed to delete offer timer:', error);
    return NextResponse.json(
      { error: 'অফার টাইমার মুছে ফেলতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
