import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  getSelectorIconOrder,
  saveSelectorIconOrder,
} from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import {
  DEFAULT_SELECTOR_ICON_IDS,
  isValidSelectorIconId,
  toSelectorIconPositions,
  type SelectorIconId,
} from '@/src/lib/selectorIconOrder';

export const dynamic = 'force-dynamic';

function validateIconOrderPayload(
  body: unknown
): { ok: true; orderedIds: SelectorIconId[] } | { ok: false; error: string } {
  const rec = (body && typeof body === 'object' ? body : {}) as {
    orderedIds?: unknown;
    positions?: unknown;
  };

  const expectedCount = DEFAULT_SELECTOR_ICON_IDS.length;

  if (Array.isArray(rec.orderedIds)) {
    if (rec.orderedIds.length !== expectedCount) {
      return {
        ok: false,
        error: `সকল ${expectedCount}টি আইকনের তালিকা প্রদান করা আবশ্যক।`,
      };
    }

    const seen = new Set<SelectorIconId>();
    const validated: SelectorIconId[] = [];

    for (const rawId of rec.orderedIds) {
      if (!isValidSelectorIconId(rawId)) {
        return {
          ok: false,
          error: 'অবৈধ আইকন আইডি পাওয়া গেছে।',
        };
      }
      if (seen.has(rawId)) {
        return {
          ok: false,
          error: 'তালিকায় ডুপ্লিকেট আইকন রয়েছে। প্রতিটি আইকনের পজিশন আলাদা হতে হবে।',
        };
      }
      seen.add(rawId);
      validated.push(rawId);
    }

    return { ok: true, orderedIds: validated };
  }

  if (Array.isArray(rec.positions)) {
    if (rec.positions.length !== expectedCount) {
      return {
        ok: false,
        error: `সকল ${expectedCount}টি আইকনের পজিশন প্রদান করা আবশ্যক।`,
      };
    }

    const seenIds = new Set<SelectorIconId>();
    const seenPositions = new Set<number>();
    const parsedEntries: Array<{ iconId: SelectorIconId; position: number }> = [];

    for (const rawItem of rec.positions) {
      if (!rawItem || typeof rawItem !== 'object') {
        return { ok: false, error: 'অবৈধ পজিশন ডেটা পাওয়া গেছে।' };
      }
      const item = rawItem as { iconId?: unknown; icon_id?: unknown; position?: unknown };
      const rawId = item.iconId ?? item.icon_id;
      if (!isValidSelectorIconId(rawId)) {
        return { ok: false, error: 'অবৈধ আইকন আইডি পাওয়া গেছে।' };
      }
      if (seenIds.has(rawId)) {
        return { ok: false, error: 'ডুপ্লিকেট আইকন আইডি গ্রহণযোগ্য নয়।' };
      }
      const pos = Number(item.position);
      if (!Number.isInteger(pos) || pos < 1 || pos > expectedCount) {
        return {
          ok: false,
          error: `পজিশন নম্বর অবশ্যই ১ থেকে ${expectedCount} এর মধ্যে হতে হবে।`,
        };
      }
      if (seenPositions.has(pos)) {
        return {
          ok: false,
          error: `পজিশন ${pos} একাধিক আইকনে ব্যবহৃত হয়েছে। ডুপ্লিকেট পজিশন দেওয়া যাবে না।`,
        };
      }
      seenIds.add(rawId);
      seenPositions.add(pos);
      parsedEntries.push({ iconId: rawId, position: pos });
    }

    parsedEntries.sort((a, b) => a.position - b.position);
    return {
      ok: true,
      orderedIds: parsedEntries.map((entry) => entry.iconId),
    };
  }

  return {
    ok: false,
    error: 'সঠিক আইকন অর্ডার ডেটা (`orderedIds` বা `positions`) প্রদান করুন।',
  };
}

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const orderedIds = await getSelectorIconOrder();
    return auth.withSessionCookies(
      NextResponse.json(
        {
          orderedIds,
          items: toSelectorIconPositions(orderedIds),
        },
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
    console.error('Failed to load icon order:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'আইকন পজিশন তালিকা লোড করতে সমস্যা হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json().catch(() => null);
    const validated = validateIconOrderPayload(body);
    if (!validated.ok) {
      return auth.withSessionCookies(
        NextResponse.json({ error: validated.error }, { status: 400 })
      );
    }

    const saved = await saveSelectorIconOrder(validated.orderedIds);
    return auth.withSessionCookies(
      NextResponse.json(
        {
          ok: true,
          orderedIds: saved,
          items: toSelectorIconPositions(saved),
        },
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
    console.error('Failed to save icon order:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'আইকনের পজিশন সংরক্ষণ করতে ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
