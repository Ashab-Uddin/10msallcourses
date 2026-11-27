import type {
  OnlineBatchPageConfig,
  OnlineBatchPageHeaderConfig,
  OnlineBatchPageIconItem,
  OnlineBatchPageSectionConfig,
  OnlineBatchSectionKey,
} from '../types.ts';
import { normalizeCategoryIconKey, type CategoryIconKey } from './categoryIcons.ts';
import type { SelectorIconId } from './selectorIconOrder.ts';

export const ONLINE_BATCH_ICON_IDS = [
  'hsc-27',
  'hsc-28',
  'class-6',
  'class-7',
  'class-8',
  'ssc-28',
  'ssc-27',
] as const;

export type OnlineBatchIconId = (typeof ONLINE_BATCH_ICON_IDS)[number];

const VALID_ONLINE_BATCH_ICON_ID_SET = new Set<string>(ONLINE_BATCH_ICON_IDS);
const VALID_SECTION_KEYS = new Set<OnlineBatchSectionKey>([
  'academic_program',
  'online_batch',
]);

export const ONLINE_BATCH_HEADER_LIMITS = {
  titleMax: 120,
  subtitleMax: 120,
  descriptionMax: 400,
} as const;

export const ONLINE_BATCH_SECTION_LIMITS = {
  titleMax: 140,
  descriptionMax: 360,
} as const;

export const ONLINE_BATCH_ICON_LIMITS = {
  tagMax: 24,
  titleMax: 48,
  subLabelMax: 72,
} as const;

export const DEFAULT_ONLINE_BATCH_HEADER: OnlineBatchPageHeaderConfig = {
  title: 'একাডেমিক অনলাইন ব্যাচ 2027',
  subtitle: 'এসএসসি ও এইচএসসি একাডেমিক প্রোগ্রাম',
  description:
    'আপনার শ্রেণি বা ব্যাচ নির্বাচন করে সরাসরি নির্ধারিত একাডেমিক ক্যাটাগরি ও লাইভ কোর্সসমূহে যান।',
};

export const DEFAULT_ONLINE_BATCH_SECTIONS: OnlineBatchPageSectionConfig[] = [
  {
    id: 'academic_program',
    title: 'এসএসসি ও এইচএসসি একাডেমিক প্রোগ্রাম',
    description:
      'আপনার শ্রেণি বা ব্যাচ নির্বাচন করে সরাসরি নির্ধারিত একাডেমিক ক্যাটাগরি ও লাইভ কোর্সসমূহে যান।',
    position: 1,
    isVisible: true,
  },
  {
    id: 'online_batch',
    title: 'একাডেমিক অনলাইন ব্যাচ',
    description:
      'শ্রেণি ও ব্যাচভিত্তিক চলমান লাইভ কোর্সসমূহ দেখুন এবং সরাসরি পছন্দের ব্যাচে ভর্তি হোন।',
    position: 2,
    isVisible: true,
  },
];

export const DEFAULT_ONLINE_BATCH_ICON_ITEMS: OnlineBatchPageIconItem[] = [
  {
    id: 'hsc-27',
    tag: 'HSC 27',
    title: 'HSC ২৭',
    subLabel: 'অনলাইন ব্যাচ চলছে',
    iconKey: 'target',
    position: 1,
    isVisible: true,
  },
  {
    id: 'hsc-28',
    tag: 'HSC 28',
    title: 'HSC ২৮',
    subLabel: 'অনলাইন ব্যাচ চলছে',
    iconKey: 'compass',
    position: 2,
    isVisible: true,
  },
  {
    id: 'class-6',
    tag: 'CLASS 6',
    title: '৬ষ্ঠ শ্রেণি',
    subLabel: 'বার্ষিক অনলাইন ব্যাচ',
    iconKey: 'notebook-pen',
    position: 3,
    isVisible: true,
  },
  {
    id: 'class-7',
    tag: 'CLASS 7',
    title: '৭ম শ্রেণি',
    subLabel: 'বার্ষিক অনলাইন ব্যাচ',
    iconKey: 'book-marked',
    position: 4,
    isVisible: true,
  },
  {
    id: 'class-8',
    tag: 'CLASS 8',
    title: '৮ম শ্রেণি',
    subLabel: 'বার্ষিক অনলাইন ব্যাচ',
    iconKey: 'backpack',
    position: 5,
    isVisible: true,
  },
  {
    id: 'ssc-28',
    tag: 'SSC 29',
    title: '৯ম শ্রেণি',
    subLabel: 'SSC ২০২৯ ব্যাচ',
    iconKey: 'lightbulb',
    position: 6,
    isVisible: true,
  },
  {
    id: 'ssc-27',
    tag: 'SSC 28',
    title: 'দশম শ্রেণি',
    subLabel: 'SSC ২০২৮ ব্যাচ',
    iconKey: 'book-open',
    position: 7,
    isVisible: true,
  },
];

export const ONLINE_BATCH_ICON_ROUTE_HINTS: Record<OnlineBatchIconId, string> = {
  'hsc-27': '/programs/hsc-27',
  'hsc-28': '/programs/hsc-28',
  'class-6': '/class-6',
  'class-7': '/class-7',
  'class-8': '/class-8',
  'ssc-28': '/class-9 (৯ম শ্রেণি)',
  'ssc-27': '/ssc/ssc-27 (দশম শ্রেণি)',
};

export function sanitizeCleanText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function cloneDefaultOnlineBatchPageConfig(): OnlineBatchPageConfig {
  return {
    header: { ...DEFAULT_ONLINE_BATCH_HEADER },
    sections: DEFAULT_ONLINE_BATCH_SECTIONS.map((s) => ({ ...s })),
    classIcons: DEFAULT_ONLINE_BATCH_ICON_ITEMS.map((item) => ({ ...item })),
    updatedAt: null,
  };
}

export function isValidOnlineBatchIconId(id: unknown): id is SelectorIconId & OnlineBatchIconId {
  return typeof id === 'string' && VALID_ONLINE_BATCH_ICON_ID_SET.has(id);
}

export function normalizeOnlineBatchPageConfig(raw: unknown): OnlineBatchPageConfig {
  const defaults = cloneDefaultOnlineBatchPageConfig();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;
  const rawHeader =
    obj.header && typeof obj.header === 'object'
      ? (obj.header as Record<string, unknown>)
      : null;

  const header: OnlineBatchPageHeaderConfig = {
    title:
      sanitizeCleanText(
        rawHeader?.title ?? obj.headerTitle ?? obj.header_title,
        ONLINE_BATCH_HEADER_LIMITS.titleMax
      ) || defaults.header.title,
    subtitle:
      sanitizeCleanText(
        rawHeader?.subtitle ?? obj.headerSubtitle ?? obj.header_subtitle,
        ONLINE_BATCH_HEADER_LIMITS.subtitleMax
      ) || defaults.header.subtitle,
    description:
      sanitizeCleanText(
        rawHeader?.description ?? obj.headerDescription ?? obj.header_description,
        ONLINE_BATCH_HEADER_LIMITS.descriptionMax
      ) || defaults.header.description,
  };

  // Normalize Sections
  const defaultSectionsById = new Map<OnlineBatchSectionKey, OnlineBatchPageSectionConfig>(
    defaults.sections.map((s) => [s.id, s])
  );
  const sectionCandidates: OnlineBatchPageSectionConfig[] = [];
  const seenSections = new Set<OnlineBatchSectionKey>();

  const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
  for (const row of rawSections) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const rawId = String(rec.id || '').trim() as OnlineBatchSectionKey;
    if (!VALID_SECTION_KEYS.has(rawId) || seenSections.has(rawId)) continue;
    const fallback = defaultSectionsById.get(rawId)!;
    seenSections.add(rawId);

    const parsedPos = Number(rec.position);
    sectionCandidates.push({
      id: rawId,
      title:
        sanitizeCleanText(rec.title, ONLINE_BATCH_SECTION_LIMITS.titleMax) ||
        fallback.title,
      description:
        sanitizeCleanText(rec.description, ONLINE_BATCH_SECTION_LIMITS.descriptionMax) ||
        fallback.description,
      position:
        Number.isFinite(parsedPos) && parsedPos >= 1
          ? Math.round(parsedPos)
          : fallback.position,
      isVisible: rec.isVisible !== false,
    });
  }

  for (const fallback of defaults.sections) {
    if (!seenSections.has(fallback.id)) {
      sectionCandidates.push({ ...fallback });
    }
  }

  sectionCandidates.sort(
    (a, b) =>
      a.position - b.position ||
      (defaultSectionsById.get(a.id)?.position ?? 99) -
        (defaultSectionsById.get(b.id)?.position ?? 99)
  );
  const sections = sectionCandidates.map((section, idx) => ({
    ...section,
    position: idx + 1,
  }));

  // Normalize Class Icons
  const defaultIconsById = new Map<string, OnlineBatchPageIconItem>(
    defaults.classIcons.map((item) => [item.id, item])
  );
  const iconCandidates: OnlineBatchPageIconItem[] = [];
  const seenIcons = new Set<string>();

  const rawIcons = Array.isArray(obj.classIcons)
    ? obj.classIcons
    : Array.isArray(obj.class_icons)
    ? obj.class_icons
    : [];

  for (const row of rawIcons) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const rawId = String(rec.id || '').trim();
    if (!isValidOnlineBatchIconId(rawId) || seenIcons.has(rawId)) continue;
    const fallback = defaultIconsById.get(rawId)!;
    seenIcons.add(rawId);

    const parsedPos = Number(rec.position);
    const normalizedIconKey: CategoryIconKey =
      rec.iconKey && rec.iconKey !== 'auto'
        ? normalizeCategoryIconKey(rec.iconKey)
        : fallback.iconKey;

    iconCandidates.push({
      id: rawId,
      tag:
        sanitizeCleanText(rec.tag, ONLINE_BATCH_ICON_LIMITS.tagMax) || fallback.tag,
      title:
        sanitizeCleanText(rec.title, ONLINE_BATCH_ICON_LIMITS.titleMax) ||
        fallback.title,
      subLabel:
        sanitizeCleanText(rec.subLabel, ONLINE_BATCH_ICON_LIMITS.subLabelMax) ||
        fallback.subLabel,
      iconKey:
        normalizedIconKey === 'auto' ? fallback.iconKey : normalizedIconKey,
      position:
        Number.isFinite(parsedPos) && parsedPos >= 1
          ? Math.round(parsedPos)
          : fallback.position,
      isVisible: rec.isVisible !== false,
    });
  }

  for (const fallback of defaults.classIcons) {
    if (!seenIcons.has(fallback.id)) {
      iconCandidates.push({ ...fallback });
    }
  }

  iconCandidates.sort(
    (a, b) =>
      a.position - b.position ||
      (defaultIconsById.get(a.id)?.position ?? 99) -
        (defaultIconsById.get(b.id)?.position ?? 99)
  );
  const classIcons = iconCandidates.map((item, idx) => ({
    ...item,
    position: idx + 1,
  }));

  return {
    header,
    sections,
    classIcons,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : null,
  };
}

export function moveArrayItemToPosition<T>(
  items: ReadonlyArray<T>,
  fromIndex: number,
  targetPosition: number
): T[] {
  if (fromIndex < 0 || fromIndex >= items.length) return [...items];
  const clampedIndex = Math.max(0, Math.min(items.length - 1, Math.round(targetPosition) - 1));
  if (clampedIndex === fromIndex) return [...items];
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedIndex, 0, moved);
  return next;
}

export function validateOnlineBatchPageConfigInput(raw: unknown):
  | { valid: true; config: OnlineBatchPageConfig }
  | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'অনলাইন ব্যাচ পেজ কনফিগারেশন ডেটা সঠিক নয়।' };
  }

  const obj = raw as Record<string, unknown>;
  const rawHeader =
    obj.header && typeof obj.header === 'object'
      ? (obj.header as Record<string, unknown>)
      : null;

  if (!rawHeader) {
    return { valid: false, error: 'পেজ হেডার কনফিগারেশন পাওয়া যায়নি।' };
  }

  const headerTitle = sanitizeCleanText(
    rawHeader.title,
    ONLINE_BATCH_HEADER_LIMITS.titleMax + 20
  );
  const headerSubtitle = sanitizeCleanText(
    rawHeader.subtitle,
    ONLINE_BATCH_HEADER_LIMITS.subtitleMax + 20
  );
  const headerDescription = sanitizeCleanText(
    rawHeader.description,
    ONLINE_BATCH_HEADER_LIMITS.descriptionMax + 20
  );

  if (!headerTitle) {
    return { valid: false, error: 'পেজ টাইটেল (Page Title) খালি রাখা যাবে না।' };
  }
  if (Array.from(headerTitle).length > ONLINE_BATCH_HEADER_LIMITS.titleMax) {
    return {
      valid: false,
      error: `পেজ টাইটেল সর্বোচ্চ ${ONLINE_BATCH_HEADER_LIMITS.titleMax} অক্ষরের মধ্যে হতে হবে।`,
    };
  }
  if (!headerSubtitle) {
    return { valid: false, error: 'পেজ সাবটাইটেল (Subtitle) খালি রাখা যাবে না।' };
  }
  if (Array.from(headerSubtitle).length > ONLINE_BATCH_HEADER_LIMITS.subtitleMax) {
    return {
      valid: false,
      error: `সাবটাইটেল সর্বোচ্চ ${ONLINE_BATCH_HEADER_LIMITS.subtitleMax} অক্ষরের মধ্যে হতে হবে।`,
    };
  }
  if (!headerDescription) {
    return { valid: false, error: 'পেজ বিবরণ (Description) খালি রাখা যাবে না।' };
  }
  if (Array.from(headerDescription).length > ONLINE_BATCH_HEADER_LIMITS.descriptionMax) {
    return {
      valid: false,
      error: `পেজ বিবরণ সর্বোচ্চ ${ONLINE_BATCH_HEADER_LIMITS.descriptionMax} অক্ষরের মধ্যে হতে হবে।`,
    };
  }

  if (Array.isArray(obj.sections)) {
    for (const s of obj.sections) {
      if (!s || typeof s !== 'object') continue;
      const rec = s as Record<string, unknown>;
      const t = sanitizeCleanText(rec.title, ONLINE_BATCH_SECTION_LIMITS.titleMax + 20);
      if (!t) {
        return { valid: false, error: 'সেকশন টাইটেল খালি রাখা যাবে না।' };
      }
      if (Array.from(t).length > ONLINE_BATCH_SECTION_LIMITS.titleMax) {
        return {
          valid: false,
          error: `সেকশন টাইটেল সর্বোচ্চ ${ONLINE_BATCH_SECTION_LIMITS.titleMax} অক্ষরের মধ্যে হতে হবে।`,
        };
      }
    }
  }

  if (Array.isArray(obj.classIcons)) {
    for (const icon of obj.classIcons) {
      if (!icon || typeof icon !== 'object') continue;
      const rec = icon as Record<string, unknown>;
      const title = sanitizeCleanText(rec.title, ONLINE_BATCH_ICON_LIMITS.titleMax + 20);
      const tag = sanitizeCleanText(rec.tag, ONLINE_BATCH_ICON_LIMITS.tagMax + 20);
      if (!title) {
        return { valid: false, error: 'ক্লাস/ব্যাচ আইকনের নাম খালি রাখা যাবে না।' };
      }
      if (Array.from(title).length > ONLINE_BATCH_ICON_LIMITS.titleMax) {
        return {
          valid: false,
          error: `আইকনের নাম সর্বোচ্চ ${ONLINE_BATCH_ICON_LIMITS.titleMax} অক্ষরের মধ্যে হতে হবে।`,
        };
      }
      if (!tag) {
        return { valid: false, error: 'আইকনের ব্যাজ টেক্সট (Tag) খালি রাখা যাবে না।' };
      }
    }
  }

  const normalized = normalizeOnlineBatchPageConfig({
    ...obj,
    updatedAt: new Date().toISOString(),
  });
  return { valid: true, config: normalized };
}
