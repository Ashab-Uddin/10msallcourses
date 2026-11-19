export const DEFAULT_SELECTOR_ICON_IDS = [
  'hsc-26',
  'hsc-27',
  'hsc-28',
  'ssc-27',
  'ssc-28',
  'class-8',
  'class-7',
  'class-6',
  'class-5',
  'book-store',
  'skills',
  'free-course',
] as const;

export type SelectorIconId = (typeof DEFAULT_SELECTOR_ICON_IDS)[number];

export interface SelectorIconPositionEntry {
  iconId: SelectorIconId;
  position: number;
}

const VALID_SELECTOR_ICON_ID_SET = new Set<string>(DEFAULT_SELECTOR_ICON_IDS);

export function isValidSelectorIconId(value: unknown): value is SelectorIconId {
  return typeof value === 'string' && VALID_SELECTOR_ICON_ID_SET.has(value);
}

export function normalizeSelectorIconOrder(
  input?:
    | ReadonlyArray<string>
    | ReadonlyArray<{ iconId?: unknown; icon_id?: unknown; position?: unknown }>
    | null
): SelectorIconId[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...DEFAULT_SELECTOR_ICON_IDS];
  }

  const seen = new Set<SelectorIconId>();
  const ordered: SelectorIconId[] = [];

  if (typeof input[0] === 'string') {
    for (const raw of input) {
      if (isValidSelectorIconId(raw) && !seen.has(raw)) {
        seen.add(raw);
        ordered.push(raw);
      }
    }
  } else {
    const defaultIndexMap = new Map<SelectorIconId, number>();
    DEFAULT_SELECTOR_ICON_IDS.forEach((id, idx) => defaultIndexMap.set(id, idx));

    const entries: Array<{ id: SelectorIconId; pos: number }> = [];
    for (const row of input) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as { iconId?: unknown; icon_id?: unknown; position?: unknown };
      const rawId = rec.iconId ?? rec.icon_id;
      if (!isValidSelectorIconId(rawId)) continue;
      const rawPos = Number(rec.position);
      const pos =
        Number.isFinite(rawPos) && rawPos >= 1
          ? Math.round(rawPos)
          : Number.MAX_SAFE_INTEGER;
      entries.push({ id: rawId, pos });
    }

    entries.sort(
      (a, b) =>
        a.pos - b.pos ||
        (defaultIndexMap.get(a.id) ?? 999) - (defaultIndexMap.get(b.id) ?? 999)
    );

    for (const entry of entries) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        ordered.push(entry.id);
      }
    }
  }

  for (const fallbackId of DEFAULT_SELECTOR_ICON_IDS) {
    if (!seen.has(fallbackId)) {
      seen.add(fallbackId);
      ordered.push(fallbackId);
    }
  }

  return ordered;
}

export function toSelectorIconPositions(
  orderedIds: ReadonlyArray<SelectorIconId>
): SelectorIconPositionEntry[] {
  const normalized = normalizeSelectorIconOrder(orderedIds);
  return normalized.map((iconId, idx) => ({
    iconId,
    position: idx + 1,
  }));
}

export function parseSelectorPositionInput(
  rawValue: unknown,
  totalCount: number = DEFAULT_SELECTOR_ICON_IDS.length
): { valid: true; value: number } | { valid: false; error: string } {
  const invalidMsg = `পজিশন নম্বর অবশ্যই ১ থেকে ${totalCount} এর মধ্যে একটি পূর্ণসংখ্যা হতে হবে।`;

  if (typeof rawValue === 'number') {
    if (!Number.isInteger(rawValue) || rawValue < 1 || rawValue > totalCount) {
      return { valid: false, error: invalidMsg };
    }
    return { valid: true, value: rawValue };
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return { valid: false, error: invalidMsg };
    }
    const ascii = trimmed.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    if (!/^\d+$/.test(ascii)) {
      return { valid: false, error: invalidMsg };
    }
    const num = Number(ascii);
    if (!Number.isInteger(num) || num < 1 || num > totalCount) {
      return { valid: false, error: invalidMsg };
    }
    return { valid: true, value: num };
  }

  return { valid: false, error: invalidMsg };
}

export function moveSelectorIconInList(
  currentOrderedIds: ReadonlyArray<SelectorIconId>,
  iconId: SelectorIconId,
  targetPosition: number
): SelectorIconId[] {
  const ordered = normalizeSelectorIconOrder(currentOrderedIds);
  const currentIdx = ordered.indexOf(iconId);
  if (currentIdx === -1) return ordered;

  const clampedPos = Math.min(Math.max(1, Math.round(targetPosition)), ordered.length);
  const targetIdx = clampedPos - 1;
  if (currentIdx === targetIdx) return ordered;

  const next = [...ordered];
  const [moved] = next.splice(currentIdx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

export function resolveBatchSelectorIconOrder(
  currentOrderedIds: ReadonlyArray<SelectorIconId>,
  draftPositions: Record<string, string | number>
):
  | { ok: true; orderedIds: SelectorIconId[]; changedCount: number }
  | { ok: false; error: string; conflictingIds: SelectorIconId[] } {
  const baseline = normalizeSelectorIconOrder(currentOrderedIds);
  const total = baseline.length;

  const parsedMap = new Map<SelectorIconId, number>();
  const changedEntries: Array<{ id: SelectorIconId; targetPos: number; currentPos: number }> = [];

  for (let idx = 0; idx < baseline.length; idx++) {
    const id = baseline[idx];
    const currentPos = idx + 1;
    const rawDraft = draftPositions[id];
    const parsed = parseSelectorPositionInput(
      rawDraft !== undefined ? rawDraft : currentPos,
      total
    );
    if (!parsed.valid) {
      return {
        ok: false,
        error: parsed.error,
        conflictingIds: [id],
      };
    }
    parsedMap.set(id, parsed.value);
    if (parsed.value !== currentPos) {
      changedEntries.push({ id, targetPos: parsed.value, currentPos });
    }
  }

  if (changedEntries.length === 0) {
    return { ok: true, orderedIds: baseline, changedCount: 0 };
  }

  // Detect explicit duplicate target positions among modified inputs
  const byTargetPos = new Map<number, SelectorIconId[]>();
  for (const entry of changedEntries) {
    const list = byTargetPos.get(entry.targetPos) || [];
    list.push(entry.id);
    byTargetPos.set(entry.targetPos, list);
  }

  const conflictingIds: SelectorIconId[] = [];
  let conflictPos: number | null = null;
  for (const [pos, ids] of byTargetPos.entries()) {
    if (ids.length > 1) {
      conflictPos = pos;
      conflictingIds.push(...ids);
    }
  }

  if (conflictingIds.length > 0) {
    return {
      ok: false,
      error: `একাধিক পরিবর্তিত আইকনে একই পজিশন (${conflictPos}) দেওয়া হয়েছে। প্রতিটি পরিবর্তিত আইকনের জন্য ভিন্ন পজিশন দিন।`,
      conflictingIds,
    };
  }

  // Place all explicitly moved icons at their target slots, then fill untouched icons cleanly in relative order
  const changedSet = new Set<SelectorIconId>(changedEntries.map((e) => e.id));
  const slots: Array<SelectorIconId | null> = Array(total).fill(null);

  for (const entry of changedEntries) {
    slots[entry.targetPos - 1] = entry.id;
  }

  const untouched = baseline.filter((id) => !changedSet.has(id));
  let untouchedCursor = 0;
  for (let i = 0; i < total; i++) {
    if (slots[i] === null) {
      slots[i] = untouched[untouchedCursor++];
    }
  }

  return {
    ok: true,
    orderedIds: normalizeSelectorIconOrder(slots as SelectorIconId[]),
    changedCount: changedEntries.length,
  };
}
