import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  deleteOfferTimer,
  setOfferTimerPaused,
  updateOfferTimer,
} from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'Invalid timer id' }, { status: 400 })
      );
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
      return auth.withSessionCookies(
        NextResponse.json({ error: result.error }, { status: result.status })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(
        { timer: result.timer, serverNow: result.serverNow },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Failed to update offer timer:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অফার টাইমার আপডেট করতে ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'Invalid timer id' }, { status: 400 })
      );
    }

    const body = await req.json();
    if (typeof body?.isPaused !== 'boolean') {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'সঠিক স্ট্যাটাস মান (isPaused) প্রদান করুন।' },
          { status: 400 }
        )
      );
    }

    const result = await setOfferTimerPaused(numericId, body.isPaused);
    if (!result.ok) {
      return auth.withSessionCookies(
        NextResponse.json({ error: result.error }, { status: result.status })
      );
    }

    return auth.withSessionCookies(
      NextResponse.json(
        { timer: result.timer, serverNow: result.serverNow },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Failed to toggle offer timer pause state:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অফার টাইমারের অবস্থা পরিবর্তন করা যায়নি।' },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'Invalid timer id' }, { status: 400 })
      );
    }

    const res = await deleteOfferTimer(numericId);
    if (!res.found) {
      return auth.withSessionCookies(
        NextResponse.json({ error: 'অফার টাইমারটি পাওয়া যায়নি।' }, { status: 404 })
      );
    }
    return auth.withSessionCookies(
      NextResponse.json(res, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json({ error: error.message }, { status: error.status })
      );
    }
    console.error('Failed to delete offer timer:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অফার টাইমার মুছে ফেলতে ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}
