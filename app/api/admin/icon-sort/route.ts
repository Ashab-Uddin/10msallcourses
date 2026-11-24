import { NextRequest, NextResponse } from 'next/server';
import {
  RepositoryError,
  getSelectorIconConfig,
  saveSelectorIconConfig,
} from '@/src/db/repository';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import {
  DEFAULT_SELECTOR_ICON_IDS,
  DEFAULT_SELECTOR_ICON_TEXTS,
  cloneDefaultSelectorIconLabels,
  isValidSelectorIconId,
  normalizeSelectorIconOrder,
  toSelectorIconConfigItems,
  validateSelectorIconTextFields,
  type SelectorIconId,
  type SelectorIconLabelsMap,
} from '@/src/lib/selectorIconOrder';

export const dynamic = 'force-dynamic';

function validateIconOrderPart(
  rec: { orderedIds?: unknown; positions?: unknown },
  fallbackOrder: SelectorIconId[]
): { ok: true; orderedIds: SelectorIconId[]; provided: boolean } | { ok: false; error: string } {
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

    return { ok: true, orderedIds: validated, provided: true };
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
      provided: true,
    };
  }

  return {
    ok: true,
    orderedIds: normalizeSelectorIconOrder(fallbackOrder),
    provided: false,
  };
}

function validateIconLabelsPart(
  rec: { labels?: unknown; items?: unknown },
  existingLabels: SelectorIconLabelsMap
): { ok: true; labels: SelectorIconLabelsMap; provided: boolean } | { ok: false; error: string } {
  const mergedLabels: SelectorIconLabelsMap = {
    ...cloneDefaultSelectorIconLabels(),
    ...Object.fromEntries(
      DEFAULT_SELECTOR_ICON_IDS.map((id) => [id, { ...existingLabels[id] }])
    ),
  } as SelectorIconLabelsMap;

  const rawSource = rec.labels ?? rec.items;
  if (rawSource === undefined) {
    return { ok: true, labels: mergedLabels, provided: false };
  }

  if (Array.isArray(rawSource)) {
    for (const entry of rawSource) {
      if (!entry || typeof entry !== 'object') {
        return { ok: false, error: 'অবৈধ আইকন টেক্সট ডেটা পাওয়া গেছে।' };
      }
      const item = entry as {
        iconId?: unknown;
        icon_id?: unknown;
        id?: unknown;
        tag?: unknown;
        badgeText?: unknown;
        badge_text?: unknown;
        title?: unknown;
        subLabel?: unknown;
        sub_label?: unknown;
      };
      const rawId = item.iconId ?? item.icon_id ?? item.id;
      if (!isValidSelectorIconId(rawId)) {
        return { ok: false, error: 'আইকন টেক্সট আপডেটে অবৈধ আইকন আইডি পাওয়া গেছে।' };
      }
      const rawTag =
        item.tag !== undefined
          ? item.tag
          : item.badgeText !== undefined
          ? item.badgeText
          : item.badge_text !== undefined
          ? item.badge_text
          : existingLabels[rawId]?.tag ?? DEFAULT_SELECTOR_ICON_TEXTS[rawId].tag;

      const check = validateSelectorIconTextFields(
        item.title,
        item.subLabel ?? item.sub_label,
        rawTag
      );
      if (!check.valid) {
        return { ok: false, error: check.error };
      }
      mergedLabels[rawId] = {
        tag: check.tag,
        title: check.title,
        subLabel: check.subLabel,
      };
    }
    return { ok: true, labels: mergedLabels, provided: true };
  }

  if (rawSource && typeof rawSource === 'object') {
    const labelRecord = rawSource as Record<string, unknown>;
    const keys = Object.keys(labelRecord);
    if (keys.length === 0) {
      return { ok: false, error: 'কমপক্ষে একটি আইকনের নাম ও সাব-নাম প্রদান করুন।' };
    }

    for (const key of keys) {
      if (!isValidSelectorIconId(key)) {
        return { ok: false, error: `অবৈধ আইকন আইডি "${key}" পাওয়া গেছে।` };
      }
      const entry = labelRecord[key];
      if (!entry || typeof entry !== 'object') {
        return { ok: false, error: 'প্রতিটি আইকনের জন্য বৈধ tag, title এবং subLabel প্রদান করুন।' };
      }
      const item = entry as {
        tag?: unknown;
        badgeText?: unknown;
        badge_text?: unknown;
        title?: unknown;
        subLabel?: unknown;
        sub_label?: unknown;
      };
      const rawTag =
        item.tag !== undefined
          ? item.tag
          : item.badgeText !== undefined
          ? item.badgeText
          : item.badge_text !== undefined
          ? item.badge_text
          : existingLabels[key]?.tag ?? DEFAULT_SELECTOR_ICON_TEXTS[key].tag;

      const check = validateSelectorIconTextFields(
        item.title,
        item.subLabel ?? item.sub_label,
        rawTag
      );
      if (!check.valid) {
        return { ok: false, error: check.error };
      }
      mergedLabels[key] = {
        tag: check.tag,
        title: check.title,
        subLabel: check.subLabel,
      };
    }
    return { ok: true, labels: mergedLabels, provided: true };
  }

  return { ok: false, error: 'অবৈধ আইকন নাম/সাব-নাম ফরম্যাট প্রদান করা হয়েছে।' };
}

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const config = await getSelectorIconConfig();
    return auth.withSessionCookies(
      NextResponse.json(
        {
          orderedIds: config.orderedIds,
          labels: config.labels,
          items: toSelectorIconConfigItems(config.orderedIds, config.labels),
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
    console.error('Failed to load icon config:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'আইকন পজিশন ও টেক্সট তালিকা লোড করতে সমস্যা হয়েছে।' },
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
    if (!body || typeof body !== 'object') {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: 'সঠিক JSON অনুরোধ ডেটা প্রদান করুন।' },
          { status: 400 }
        )
      );
    }

    const rec = body as {
      orderedIds?: unknown;
      positions?: unknown;
      labels?: unknown;
      items?: unknown;
    };

    const existingConfig = await getSelectorIconConfig();
    const orderResult = validateIconOrderPart(rec, existingConfig.orderedIds);
    if (!orderResult.ok) {
      return auth.withSessionCookies(
        NextResponse.json({ error: orderResult.error }, { status: 400 })
      );
    }

    const labelsResult = validateIconLabelsPart(rec, existingConfig.labels);
    if (!labelsResult.ok) {
      return auth.withSessionCookies(
        NextResponse.json({ error: labelsResult.error }, { status: 400 })
      );
    }

    if (!orderResult.provided && !labelsResult.provided) {
      return auth.withSessionCookies(
        NextResponse.json(
          {
            error:
              'সঠিক আইকন পজিশন (`orderedIds` / `positions`) অথবা নাম/সাব-নাম (`labels`) ডেটা প্রদান করুন।',
          },
          { status: 400 }
        )
      );
    }

    const saved = await saveSelectorIconConfig({
      orderedIds: orderResult.orderedIds,
      labels: labelsResult.labels,
    });

    return auth.withSessionCookies(
      NextResponse.json(
        {
          ok: true,
          orderedIds: saved.orderedIds,
          labels: saved.labels,
          items: toSelectorIconConfigItems(saved.orderedIds, saved.labels),
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
    console.error('Failed to save icon config:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'আইকনের পজিশন ও নাম সংরক্ষণ করতে ব্যর্থ হয়েছে।' },
        { status: 500 }
      )
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
