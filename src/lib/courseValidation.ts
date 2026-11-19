import { CourseGroupKey } from '../types.ts';
import { toBengaliNumber } from '../utils/format.ts';

export interface BatchKeywordOption {
  id: string;
  label: string;
  subLabel: string;
  matcher: RegExp;
}

export const BATCH_KEYWORD_OPTIONS: BatchKeywordOption[] = [
  {
    id: 'hsc-26',
    label: 'HSC 26',
    subLabel: 'HSC ২০২৬',
    matcher:
      /(?:^|[\s,|/(\[])(?:hsc[\s-]*(?:26|2026|২৬|২০২৬)|এইচএসসি[\s-]*(?:26|2026|২৬|২০২৬))(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'hsc-27',
    label: 'HSC 27',
    subLabel: 'HSC ২০২৭',
    matcher:
      /(?:^|[\s,|/(\[])(?:hsc[\s-]*(?:27|2027|২৭|২০২৭)|এইচএসসি[\s-]*(?:27|2027|২৭|২০২৭))(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'hsc-28',
    label: 'HSC 28',
    subLabel: 'HSC ২০২৮',
    matcher:
      /(?:^|[\s,|/(\[])(?:hsc[\s-]*(?:28|2028|২৮|২০২৮)|এইচএসসি[\s-]*(?:28|2028|২৮|২০২৮))(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'ssc-2027',
    label: 'SSC 2027',
    subLabel: '১০ম শ্রেণি',
    matcher:
      /(?:^|[\s,|/(\[])(?:ssc[\s-]*(?:2027|27|২০২৭|২৭)|এসএসসি[\s-]*(?:2027|27|২০২৭|২৭)|class[\s-]*10|(?:১০ম|দশম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'ssc-2028',
    label: 'SSC 2028',
    subLabel: '৯ম শ্রেণি',
    matcher:
      /(?:^|[\s,|/(\[])(?:ssc[\s-]*(?:2028|28|২০২৮|২৮)|এসএসসি[\s-]*(?:2028|28|২০২৮|২৮)|class[\s-]*9|(?:৯ম|নবম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'class-5',
    label: 'Class 5',
    subLabel: '৫ম শ্রেণি',
    matcher: /(?:^|[\s,|/(\[])(?:class[\s-]*5|(?:৫ম|পঞ্চম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'class-6',
    label: 'Class 6',
    subLabel: '৬ষ্ঠ শ্রেণি',
    matcher: /(?:^|[\s,|/(\[])(?:class[\s-]*6|(?:৬ষ্ঠ|ষষ্ঠ)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'class-7',
    label: 'Class 7',
    subLabel: '৭ম শ্রেণি',
    matcher: /(?:^|[\s,|/(\[])(?:class[\s-]*7|(?:৭ম|সপ্তম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'class-8',
    label: 'Class 8',
    subLabel: '৮ম শ্রেণি',
    matcher: /(?:^|[\s,|/(\[])(?:class[\s-]*8|(?:৮ম|অষ্টম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
];

export const DEPARTMENT_KEYWORD_OPTIONS = [
  'বিজ্ঞান বিভাগ',
  'ব্যবসায় শিক্ষা',
  'মানবিক বিভাগ',
  'এডমিশন',
  'ভার্সিটি',
  'মেডিকেল',
  'বুয়েট',
] as const;

export const CANONICAL_GROUP_OPTIONS: ReadonlyArray<{
  key: CourseGroupKey;
  label: string;
  enLabel: string;
}> = [
  { key: 'science', label: 'বিজ্ঞান বিভাগ', enLabel: 'Science' },
  { key: 'business', label: 'ব্যবসায় শিক্ষা', enLabel: 'Business Studies' },
  { key: 'humanities', label: 'মানবিক বিভাগ', enLabel: 'Humanities' },
];

export function normalizeValidationText(input: string): string {
  return (input || '')
    .normalize('NFC')
    .replace(/য\u09BC/g, 'য়')
    .replace(/ড\u09BC/g, 'ড়')
    .replace(/ঢ\u09BC/g, 'ঢ়')
    .trim();
}

export function extractMatchedBatchKeywords(input: string): BatchKeywordOption[] {
  const normalized = normalizeValidationText(input);
  if (!normalized) return [];

  return BATCH_KEYWORD_OPTIONS.filter((opt) => opt.matcher.test(normalized));
}

export function normalizeTargetBatchId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = normalizeValidationText(raw).toLowerCase();
  if (!trimmed) return null;

  const aliasMap: Record<string, string> = {
    'hsc-26': 'hsc-26',
    hsc26: 'hsc-26',
    'hsc-27': 'hsc-27',
    hsc27: 'hsc-27',
    'hsc-28': 'hsc-28',
    hsc28: 'hsc-28',
    'ssc-27': 'ssc-2027',
    ssc27: 'ssc-2027',
    'ssc-2027': 'ssc-2027',
    ssc2027: 'ssc-2027',
    class10: 'ssc-2027',
    'class-10': 'ssc-2027',
    'ssc-28': 'ssc-2028',
    ssc28: 'ssc-2028',
    'ssc-2028': 'ssc-2028',
    ssc2028: 'ssc-2028',
    class9: 'ssc-2028',
    'class-9': 'ssc-2028',
    class5: 'class-5',
    'class-5': 'class-5',
    class6: 'class-6',
    'class-6': 'class-6',
    class7: 'class-7',
    'class-7': 'class-7',
    class8: 'class-8',
    'class-8': 'class-8',
  };

  if (aliasMap[trimmed]) {
    return aliasMap[trimmed];
  }

  const matched = extractMatchedBatchKeywords(trimmed);
  return matched.length === 1 ? matched[0].id : null;
}

export function extractExplicitTargetGroupsFromText(input: string): CourseGroupKey[] {
  const normalized = normalizeValidationText(input).toLowerCase();
  if (!normalized) return [];

  if (
    normalized.includes('সকল বিভাগ') ||
    normalized.includes('all department') ||
    normalized.includes('all group')
  ) {
    return ['science', 'business', 'humanities'];
  }

  const groups: CourseGroupKey[] = [];
  if (
    normalized.includes('বিজ্ঞান') ||
    normalized.includes('সায়েন্স') ||
    /\bscience\b/i.test(normalized)
  ) {
    groups.push('science');
  }
  if (
    normalized.includes('ব্যবসায়') ||
    normalized.includes('ব্যবসা') ||
    normalized.includes('ব্যাবসা') ||
    normalized.includes('বাণিজ্য') ||
    normalized.includes('কমার্স') ||
    normalized.includes('কমার্শ') ||
    /\b(?:business|commerce)\b/i.test(normalized)
  ) {
    groups.push('business');
  }
  if (
    normalized.includes('মানবিক') ||
    normalized.includes('আর্টস') ||
    /\b(?:humanities|arts)\b/i.test(normalized)
  ) {
    groups.push('humanities');
  }

  return groups;
}

export function normalizeTargetGroups(raw: unknown): CourseGroupKey[] {
  if (!raw) return [];
  const validSet = new Set<CourseGroupKey>(['science', 'business', 'humanities']);
  const out = new Set<CourseGroupKey>();

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const str = typeof item === 'string' ? normalizeValidationText(item).toLowerCase() : '';
      if (!str) continue;
      if (validSet.has(str as CourseGroupKey)) {
        out.add(str as CourseGroupKey);
      } else {
        for (const g of extractExplicitTargetGroupsFromText(str)) {
          out.add(g);
        }
      }
    }
  } else if (typeof raw === 'string') {
    for (const g of extractExplicitTargetGroupsFromText(raw)) {
      out.add(g);
    }
  }

  return CANONICAL_GROUP_OPTIONS.map((o) => o.key).filter((k) => out.has(k));
}

function dedupeTargetTokens(tokens: string[]): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tokens) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalizeValidationText(trimmed).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result.join(', ');
}

export function syncTargetStudentsMetadata(input: {
  targetStudents?: unknown;
  targetBatch?: unknown;
  targetGroups?: unknown;
}): {
  valid: boolean;
  targetStudents: string;
  targetBatch: string | null;
  targetGroups: CourseGroupKey[];
  error?: string;
} {
  const rawStudents = typeof input.targetStudents === 'string' ? input.targetStudents.trim() : '';

  const textBatchCheck = validateSingleBatchKeyword(rawStudents);
  if (!textBatchCheck.valid) {
    return {
      valid: false,
      targetStudents: rawStudents,
      targetBatch: null,
      targetGroups: [],
      error: textBatchCheck.error,
    };
  }

  let resolvedBatch: string | null = null;
  if (input.targetBatch !== undefined) {
    if (input.targetBatch !== null && String(input.targetBatch).trim() !== '') {
      const normalized = normalizeTargetBatchId(String(input.targetBatch));
      if (!normalized) {
        return {
          valid: false,
          targetStudents: rawStudents,
          targetBatch: null,
          targetGroups: [],
          error: 'নির্বাচিত ব্যাচ কীওয়ার্ডটি বৈধ নয়।',
        };
      }
      if (
        textBatchCheck.matchedBatches.length === 1 &&
        textBatchCheck.matchedBatches[0].id !== normalized
      ) {
        return {
          valid: false,
          targetStudents: rawStudents,
          targetBatch: null,
          targetGroups: [],
          error: `একটি কোর্সে একাধিক ব্যাচ (${textBatchCheck.matchedBatches[0].label} ও ${normalized.toUpperCase()}) নির্বাচন করা যাবে না।`,
        };
      }
      resolvedBatch = normalized;
    } else {
      resolvedBatch = null;
    }
  } else {
    resolvedBatch = textBatchCheck.matchedBatches[0]?.id || null;
  }

  const textGroups = extractExplicitTargetGroupsFromText(rawStudents);
  const resolvedGroups =
    input.targetGroups !== undefined
      ? normalizeTargetGroups(input.targetGroups)
      : textGroups;

  const rawTokens = rawStudents
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const extraNonBatchNonGroupTokens = rawTokens.filter(
    (tok) =>
      extractMatchedBatchKeywords(tok).length === 0 &&
      extractExplicitTargetGroupsFromText(tok).length === 0
  );

  const batchOption = resolvedBatch
    ? BATCH_KEYWORD_OPTIONS.find((b) => b.id === resolvedBatch)
    : undefined;
  const groupLabels = resolvedGroups
    .map((g) => CANONICAL_GROUP_OPTIONS.find((o) => o.key === g)?.label)
    .filter((l): l is string => Boolean(l));

  const syncedTokens: string[] = [
    ...(batchOption ? [batchOption.label] : []),
    ...groupLabels,
    ...extraNonBatchNonGroupTokens,
  ];

  const finalTargetStudents = dedupeTargetTokens(syncedTokens).slice(0, 200);

  return {
    valid: true,
    targetStudents: finalTargetStudents,
    targetBatch: resolvedBatch,
    targetGroups: resolvedGroups,
  };
}

export function validateSingleBatchKeyword(targetStudents: unknown): {
  valid: boolean;
  matchedBatches: BatchKeywordOption[];
  error?: string;
} {
  const text = typeof targetStudents === 'string' ? targetStudents.trim() : '';
  if (!text) {
    return { valid: true, matchedBatches: [] };
  }

  const matchedBatches = extractMatchedBatchKeywords(text);
  if (matchedBatches.length > 1) {
    const names = matchedBatches.map((b) => b.label).join(', ');
    return {
      valid: false,
      matchedBatches,
      error: `একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে (পাওয়া গেছে: ${names})। অনুগ্রহ করে একটিমাত্র ব্যাচ রাখুন।`,
    };
  }

  return { valid: true, matchedBatches };
}

export function computeDiscountPercent(originalPrice: number, discountPrice: number): number {
  if (
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(discountPrice) ||
    originalPrice <= 0 ||
    discountPrice < 0 ||
    discountPrice >= originalPrice
  ) {
    return 0;
  }
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

export function validateCoursePricing(
  originalPrice: number,
  discountPrice: number
): { valid: boolean; discountPercent: number; error?: string } {
  if (
    !Number.isFinite(originalPrice) ||
    originalPrice < 0 ||
    !Number.isFinite(discountPrice) ||
    discountPrice < 0
  ) {
    return {
      valid: false,
      discountPercent: 0,
      error: 'কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।',
    };
  }

  if (originalPrice > 0 && discountPrice > originalPrice) {
    return {
      valid: false,
      discountPercent: 0,
      error: 'ডিসকাউন্টেড অফার মূল্য (Discount Price) পূর্বের মূল মূল্যের (Original Price) চেয়ে বেশি হতে পারবে না।',
    };
  }

  return {
    valid: true,
    discountPercent: computeDiscountPercent(originalPrice, discountPrice),
  };
}

const BENGALI_TO_ASCII_DIGIT_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

const ASCII_TO_BENGALI_DIGIT_LIST = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toAsciiDigits(input: string): string {
  return String(input || '').replace(/[০-৯]/g, (d) => BENGALI_TO_ASCII_DIGIT_MAP[d] ?? d);
}

function toBengaliDigitsDirect(input: string): string {
  return String(input || '').replace(/\d/g, (d) => ASCII_TO_BENGALI_DIGIT_LIST[Number(d)] ?? d);
}

export function validateCourseDuration(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  if (raw === null || raw === undefined) {
    return { valid: true, value: '' };
  }
  const cleaned = String(raw)
    .trim()
    .replace(/^(?:মেয়াদ|মেয়াদ)\s*[:ঃ-]\s*/i, '')
    .trim();

  if (!cleaned) {
    return { valid: true, value: '' };
  }

  if (cleaned.length > 60) {
    return {
      valid: false,
      value: cleaned.slice(0, 60),
      error: 'কোর্সের মেয়াদ সর্বোচ্চ ৬০ অক্ষরের মধ্যে হতে হবে।',
    };
  }

  return { valid: true, value: cleaned };
}

export function formatCourseDurationDisplay(raw: unknown): string {
  const check = validateCourseDuration(raw);
  return check.value;
}

export function extractStudentCountInputValue(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return '';
    return String(Math.round(raw));
  }

  const text = toAsciiDigits(String(raw)).trim();
  if (!text) return '';

  // Support legacy shorthand like "10k+ শিক্ষার্থী" or "12.5k"
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const num = Math.round(Number(kMatch[1]) * 1000);
    return Number.isFinite(num) && num > 0 ? String(num) : '';
  }

  // Extract formatted integer like "12,500+ শিক্ষার্থী" or "12500"
  const numMatch = text.match(/(\d[\d,]*)/);
  if (!numMatch) return '';

  const parsed = Number(numMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return String(Math.round(parsed));
}

export function validateCourseStudentCount(raw: unknown): {
  valid: boolean;
  numeric: number | null;
  storageValue: string;
  error?: string;
} {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { valid: true, numeric: null, storageValue: '' };
  }

  const ascii = toAsciiDigits(String(raw)).trim();

  // Reject negative numbers explicitly
  if (/^-\s*\d/.test(ascii)) {
    return {
      valid: false,
      numeric: null,
      storageValue: '',
      error: 'শিক্ষার্থীর সংখ্যা ঋণাত্মক হতে পারবে না। ১ বা তার বেশি পূর্ণসংখ্যা লিখুন।',
    };
  }

  // Check shorthand k notation (e.g. legacy "10k+ শিক্ষার্থী")
  const kMatch = ascii.match(/^(\d+(?:\.\d+)?)\s*k\+?(\s*শিক্ষার্থী)?$/i);
  if (kMatch) {
    const val = Math.round(Number(kMatch[1]) * 1000);
    if (!Number.isFinite(val) || val < 1 || val > 100_000_000) {
      return {
        valid: false,
        numeric: null,
        storageValue: '',
        error: 'শিক্ষার্থীর সংখ্যা অবশ্যই ১ থেকে ১০ কোটির মধ্যে বৈধ সংখ্যা হতে হবে।',
      };
    }
    return { valid: true, numeric: val, storageValue: String(val) };
  }

  // Strip optional commas, plus sign, and trailing "শিক্ষার্থী" label (for legacy compatibility)
  const stripped = ascii
    .replace(/\s*শিক্ষার্থী\s*$/i, '')
    .replace(/\+\s*$/, '')
    .replace(/,/g, '')
    .trim();

  if (!/^\d+$/.test(stripped)) {
    return {
      valid: false,
      numeric: null,
      storageValue: '',
      error: 'শিক্ষার্থীর সংখ্যা অবশ্যই বৈধ পূর্ণসংখ্যা হতে হবে (যেমন: 12500)।',
    };
  }

  const num = Number(stripped);
  if (!Number.isSafeInteger(num) || num < 1 || num > 100_000_000) {
    return {
      valid: false,
      numeric: null,
      storageValue: '',
      error: 'শিক্ষার্থীর সংখ্যা অবশ্যই ১ বা তার বেশি বৈধ পূর্ণসংখ্যা হতে হবে (অথবা খালি রাখুন)।',
    };
  }

  return {
    valid: true,
    numeric: num,
    storageValue: String(num),
  };
}

export function formatCourseStudentCountDisplay(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const extracted = extractStudentCountInputValue(trimmed);
  if (extracted) {
    const num = Number(extracted);
    if (Number.isFinite(num) && num > 0) {
      return `${toBengaliNumber(num)}+ শিক্ষার্থী`;
    }
  }

  return trimmed;
}

export function extractRatingInputValue(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0 || raw > 5) return '';
    return Number.isInteger(raw) ? raw.toFixed(1) : String(Number(raw.toFixed(2)));
  }

  const ascii = toAsciiDigits(String(raw))
    .replace(/\s*(?:রেটিং|rating)\s*$/i, '')
    .trim();
  if (!ascii) return '';

  const match = ascii.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return '';

  const num = Number(match[1]);
  if (!Number.isFinite(num) || num < 0 || num > 5) return '';
  return Number.isInteger(num) ? num.toFixed(1) : String(Number(num.toFixed(2)));
}

export function validateCourseRating(raw: unknown): {
  valid: boolean;
  numeric: number | null;
  storageValue: string;
  error?: string;
} {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { valid: true, numeric: null, storageValue: '' };
  }

  const ascii = toAsciiDigits(String(raw))
    .replace(/\s*(?:রেটিং|rating)\s*$/i, '')
    .trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(ascii)) {
    return {
      valid: false,
      numeric: null,
      storageValue: '',
      error: 'কোর্সের রেটিং অবশ্যই ০ থেকে ৫-এর মধ্যে বৈধ সংখ্যা হতে হবে (সর্বোচ্চ ২ দশমিক, যেমন: 4.9)।',
    };
  }

  const num = Number(ascii);
  if (!Number.isFinite(num) || num < 0 || num > 5) {
    return {
      valid: false,
      numeric: null,
      storageValue: '',
      error: 'কোর্সের রেটিং অবশ্যই ০ থেকে ৫-এর মধ্যে হতে হবে (যেমন: 4.9)।',
    };
  }

  const normalized = Number.isInteger(num)
    ? num.toFixed(1)
    : String(Number(num.toFixed(2)));

  return {
    valid: true,
    numeric: num,
    storageValue: normalized,
  };
}

export function formatCourseRatingDisplay(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const check = validateCourseRating(trimmed);
  if (check.valid && check.storageValue) {
    return toBengaliDigitsDirect(check.storageValue);
  }

  const extracted = extractRatingInputValue(trimmed);
  if (extracted) {
    return toBengaliDigitsDirect(extracted);
  }

  return '';
}

