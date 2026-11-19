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

export interface SelectorIconText {
  title: string;
  subLabel: string;
}

export type SelectorIconLabelsMap = Record<SelectorIconId, SelectorIconText>;

export interface SelectorIconConfig {
  orderedIds: SelectorIconId[];
  labels: SelectorIconLabelsMap;
}

export interface SelectorIconConfigItem {
  iconId: SelectorIconId;
  position: number;
  title: string;
  subLabel: string;
}

export const SELECTOR_ICON_TITLE_MAX_LENGTH = 40;
export const SELECTOR_ICON_SUBLABEL_MAX_LENGTH = 60;

export const DEFAULT_SELECTOR_ICON_TEXTS: Record<SelectorIconId, SelectorIconText> = {
  'hsc-26': { title: 'HSC ২৬', subLabel: 'এডমিশন ভর্তি চলছে' },
  'hsc-27': { title: 'HSC ২৭', subLabel: 'অনলাইন ব্যাচ চলছে' },
  'hsc-28': { title: 'HSC ২৮', subLabel: 'অনলাইন ব্যাচ চলছে' },
  'ssc-27': { title: 'দশম শ্রেণি', subLabel: 'SSC ২০২৭ ব্যাচ' },
  'ssc-28': { title: '৯ম শ্রেণি', subLabel: 'SSC ২০২৮ ব্যাচ' },
  'class-8': { title: '৮ম শ্রেণি', subLabel: 'বার্ষিক অনলাইন ব্যাচ' },
  'class-7': { title: '৭ম শ্রেণি', subLabel: 'বার্ষিক অনলাইন ব্যাচ' },
  'class-6': { title: '৬ষ্ঠ শ্রেণি', subLabel: 'বার্ষিক অনলাইন ব্যাচ' },
  'class-5': { title: '৫ম শ্রেণি', subLabel: 'প্রাথমিক অনলাইন ব্যাচ' },
  'book-store': { title: 'বুক স্টোর', subLabel: 'প্রিন্টেড মাস্টারবুক' },
  skills: { title: 'স্কিলস', subLabel: 'ক্যারিয়ার ও আইটি কোর্স' },
  'free-course': { title: 'ফ্রি কোর্স', subLabel: 'বিনামূল্যে শিখুন' },
};

export function sanitizeSelectorIconText(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateSelectorIconTextFields(
  rawTitle: unknown,
  rawSubLabel: unknown
):
  | { valid: true; title: string; subLabel: string }
  | { valid: false; error: string; fieldErrors: { title?: string; subLabel?: string } } {
  const title = sanitizeSelectorIconText(rawTitle);
  const subLabel = sanitizeSelectorIconText(rawSubLabel);
  const fieldErrors: { title?: string; subLabel?: string } = {};

  if (!title) {
    fieldErrors.title = 'আইকনের মূল নাম (Title) খালি রাখা যাবে না।';
  } else if (Array.from(title).length > SELECTOR_ICON_TITLE_MAX_LENGTH) {
    fieldErrors.title = `মূল নাম সর্বোচ্চ ${SELECTOR_ICON_TITLE_MAX_LENGTH} অক্ষরের মধ্যে হতে হবে।`;
  }

  if (!subLabel) {
    fieldErrors.subLabel = 'আইকনের সাব নাম (Sub Name) খালি রাখা যাবে না।';
  } else if (Array.from(subLabel).length > SELECTOR_ICON_SUBLABEL_MAX_LENGTH) {
    fieldErrors.subLabel = `সাব নাম সর্বোচ্চ ${SELECTOR_ICON_SUBLABEL_MAX_LENGTH} অক্ষরের মধ্যে হতে হবে।`;
  }

  if (fieldErrors.title || fieldErrors.subLabel) {
    return {
      valid: false,
      error: fieldErrors.title || fieldErrors.subLabel || 'অবৈধ ইনপুট।',
      fieldErrors,
    };
  }

  return { valid: true, title, subLabel };
}

export function cloneDefaultSelectorIconLabels(): SelectorIconLabelsMap {
  const map = {} as SelectorIconLabelsMap;
  for (const id of DEFAULT_SELECTOR_ICON_IDS) {
    map[id] = { ...DEFAULT_SELECTOR_ICON_TEXTS[id] };
  }
  return map;
}

export function normalizeSelectorIconLabels(
  input?:
    | Partial<Record<string, Partial<SelectorIconText> | null | undefined>>
    | ReadonlyArray<{
        iconId?: unknown;
        icon_id?: unknown;
        title?: unknown;
        subLabel?: unknown;
        sub_label?: unknown;
      }>
    | null
): SelectorIconLabelsMap {
  const normalized = cloneDefaultSelectorIconLabels();
  if (!input) return normalized;

  const applyEntry = (
    id: SelectorIconId,
    rawTitle: unknown,
    rawSubLabel: unknown
  ) => {
    const cleanTitle = sanitizeSelectorIconText(rawTitle);
    const cleanSubLabel = sanitizeSelectorIconText(rawSubLabel);
    if (
      cleanTitle &&
      Array.from(cleanTitle).length <= SELECTOR_ICON_TITLE_MAX_LENGTH
    ) {
      normalized[id].title = cleanTitle;
    }
    if (
      cleanSubLabel &&
      Array.from(cleanSubLabel).length <= SELECTOR_ICON_SUBLABEL_MAX_LENGTH
    ) {
      normalized[id].subLabel = cleanSubLabel;
    }
  };

  if (Array.isArray(input)) {
    for (const row of input) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as {
        iconId?: unknown;
        icon_id?: unknown;
        title?: unknown;
        subLabel?: unknown;
        sub_label?: unknown;
      };
      const rawId = rec.iconId ?? rec.icon_id;
      if (!isValidSelectorIconId(rawId)) continue;
      applyEntry(rawId, rec.title, rec.subLabel ?? rec.sub_label);
    }
  } else if (typeof input === 'object') {
    const recMap = input as Record<string, unknown>;
    for (const id of DEFAULT_SELECTOR_ICON_IDS) {
      const entry = recMap[id];
      if (!entry || typeof entry !== 'object') continue;
      const rec = entry as { title?: unknown; subLabel?: unknown; sub_label?: unknown };
      applyEntry(id, rec.title, rec.subLabel ?? rec.sub_label);
    }
  }

  return normalized;
}

export function toSelectorIconConfigItems(
  orderedIds: ReadonlyArray<SelectorIconId>,
  labels?: Partial<Record<string, Partial<SelectorIconText>>> | null
): SelectorIconConfigItem[] {
  const normalizedOrder = normalizeSelectorIconOrder(orderedIds);
  const normalizedLabels = normalizeSelectorIconLabels(labels);
  return normalizedOrder.map((iconId, idx) => ({
    iconId,
    position: idx + 1,
    title: normalizedLabels[iconId].title,
    subLabel: normalizedLabels[iconId].subLabel,
  }));
}

