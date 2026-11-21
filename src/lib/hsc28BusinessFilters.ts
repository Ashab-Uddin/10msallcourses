import type { Course } from '../types.ts';
import { normalizeCategoryMatchText } from './categoryMatching.ts';

export type Hsc28BusinessFilterId =
  | 'bundle'
  | 'specific'
  | 'finance'
  | 'accounting'
  | 'management'
  | 'marketing'
  | 'bei'
  | 'bangla'
  | 'english'
  | 'ict';

export type Hsc28BusinessFilterGroup = 'type' | 'subject';

export interface Hsc28BusinessFilterOption {
  id: Hsc28BusinessFilterId;
  label: string;
  group: Hsc28BusinessFilterGroup;
  shortHint: string;
}

export const HSC28_BUSINESS_TYPE_FILTERS: ReadonlyArray<Hsc28BusinessFilterOption> = [
  {
    id: 'bundle',
    label: 'বান্ডেল',
    group: 'type',
    shortHint: 'একাধিক বিষয়ের কম্বাইন ও ফুল কোর্স প্যাকেজ',
  },
  {
    id: 'specific',
    label: 'নির্দিষ্ট',
    group: 'type',
    shortHint: 'একক বিষয় বা নির্দিষ্ট অধ্যায়ভিত্তিক কোর্স',
  },
];

export const HSC28_BUSINESS_SUBJECT_FILTERS: ReadonlyArray<Hsc28BusinessFilterOption> = [
  {
    id: 'finance',
    label: 'ফাইন্যান্স',
    group: 'subject',
    shortHint: 'ফিন্যান্স, ব্যাংকিং ও বীমা ১ম ও ২য় পত্র',
  },
  {
    id: 'accounting',
    label: 'একাউন্টিং',
    group: 'subject',
    shortHint: 'হিসাববিজ্ঞান ১ম ও ২য় পত্র',
  },
  {
    id: 'management',
    label: 'ম্যানেজমেন্ট',
    group: 'subject',
    shortHint: 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা ১ম ও ২য় পত্র',
  },
  {
    id: 'marketing',
    label: 'মার্কেটিং',
    group: 'subject',
    shortHint: 'উৎপাদন ব্যবস্থাপনা ও বিপণন ১ম ও ২য় পত্র',
  },
  {
    id: 'bei',
    label: 'BEI',
    group: 'subject',
    shortHint: 'বাংলা, ইংরেজি ও ICT কম্বাইন প্যাকেজ',
  },
  {
    id: 'bangla',
    label: 'বাংলা',
    group: 'subject',
    shortHint: 'বাংলা ১ম ও ২য় পত্র',
  },
  {
    id: 'english',
    label: 'ইংরেজি',
    group: 'subject',
    shortHint: 'ইংরেজি ১ম ও ২য় পত্র',
  },
  {
    id: 'ict',
    label: 'ICT',
    group: 'subject',
    shortHint: 'তথ্য ও যোগাযোগ প্রযুক্তি',
  },
];

export const HSC28_BUSINESS_ALL_FILTERS: ReadonlyArray<Hsc28BusinessFilterOption> = [
  ...HSC28_BUSINESS_TYPE_FILTERS,
  ...HSC28_BUSINESS_SUBJECT_FILTERS,
];

/**
 * Primary metadata string built strictly from authoritative identity fields
 * (excludes marketing description & feature bullets to prevent cross-subject leaks).
 */
function getHsc28BusinessMetaText(course: Course): string {
  return normalizeCategoryMatchText(
    [
      course.title || '',
      course.slug || '',
      course.shortBadge || '',
      course.headerTitle || '',
      course.headerSubtitle || '',
    ].join(' ')
  );
}

function includesNormalizedAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

function hasExplicitBei(text: string): boolean {
  return /\bbei\b/i.test(text);
}

function hasFinance(text: string): boolean {
  return (
    includesNormalizedAny(text, ['ফাইন্যান্স', 'ফিন্যান্স', 'ব্যাংকিং']) ||
    /\bfinance\b/i.test(text)
  );
}

function hasAccounting(text: string): boolean {
  return (
    includesNormalizedAny(text, ['একাউন্টিং', 'অ্যাকাউন্টিং', 'হিসাববিজ্ঞান']) ||
    /\baccounting\b/i.test(text)
  );
}

function hasManagement(text: string): boolean {
  return (
    includesNormalizedAny(text, ['ম্যানেজমেন্ট', 'ব্যবস্থাপনা']) ||
    /\bmanagement\b/i.test(text)
  );
}

function hasMarketing(text: string): boolean {
  return (
    includesNormalizedAny(text, ['মার্কেটিং', 'বিপণন']) ||
    /\bmarketing\b/i.test(text)
  );
}

function hasBangla(text: string): boolean {
  if (hasExplicitBei(text)) return true;
  // Match standalone "বাংলা" token (avoid matching "বাংলাদেশ" / "বাংলাদেশের")
  const normalizedBanglaBoundary =
    /(?:^|[\s,()|–—\-/:])বাংলা(?=$|[\s,()|–—\-/:১-৯0-9]|র|য়|তে|কে|ও)/;
  return normalizedBanglaBoundary.test(text) || /\bbangla\b/i.test(text);
}

function hasEnglish(text: string): boolean {
  return (
    hasExplicitBei(text) ||
    includesNormalizedAny(text, ['ইংরেজি']) ||
    /\benglish\b/i.test(text)
  );
}

function hasIct(text: string): boolean {
  return (
    hasExplicitBei(text) ||
    includesNormalizedAny(text, ['আইসিটি', 'তথ্য ও যোগাযোগ']) ||
    /\bict\b/i.test(text)
  );
}

function hasBeiCombo(text: string): boolean {
  if (hasExplicitBei(text)) return true;
  return hasBangla(text) && hasEnglish(text) && hasIct(text);
}

function isBundleCourse(text: string): boolean {
  if (
    includesNormalizedAny(text, [
      'বান্ডেল',
      'কমপ্লিট প্যাকেজ',
      'ফুল কোর্স',
      'কম্বো',
    ]) ||
    /\b(?:bundle|combo|full course|bei)\b/i.test(text)
  ) {
    return true;
  }

  const coveredSubjectsCount = [
    hasFinance(text),
    hasAccounting(text),
    hasManagement(text),
    hasMarketing(text),
    hasBangla(text),
    hasEnglish(text),
    hasIct(text),
  ].filter(Boolean).length;

  return coveredSubjectsCount >= 2;
}

export function courseMatchesHsc28BusinessFilter(
  course: Course,
  filterId: Hsc28BusinessFilterId
): boolean {
  const text = getHsc28BusinessMetaText(course);

  switch (filterId) {
    case 'bundle':
      return isBundleCourse(text);
    case 'specific':
      return !isBundleCourse(text);
    case 'finance':
      return hasFinance(text);
    case 'accounting':
      return hasAccounting(text);
    case 'management':
      return hasManagement(text);
    case 'marketing':
      return hasMarketing(text);
    case 'bei':
      return hasBeiCombo(text);
    case 'bangla':
      return hasBangla(text);
    case 'english':
      return hasEnglish(text);
    case 'ict':
      return hasIct(text);
    default:
      return true;
  }
}

export function toggleHsc28BusinessFilter(
  currentFilter: Hsc28BusinessFilterId | 'all',
  clickedId: Hsc28BusinessFilterId | 'all'
): Hsc28BusinessFilterId | 'all' {
  if (clickedId === 'all' || currentFilter === clickedId) {
    return 'all';
  }
  return clickedId;
}

/**
 * Single-filter matching logic:
 * - 'all' shows every HSC 28 Business Studies course.
 * - Any selected filter ID shows courses matching that specific type or subject.
 */
export function filterHsc28BusinessCourses(
  courses: Course[],
  selectedFilter: Hsc28BusinessFilterId | 'all'
): Course[] {
  if (selectedFilter === 'all') {
    return courses;
  }
  return courses.filter((course) =>
    courseMatchesHsc28BusinessFilter(course, selectedFilter)
  );
}

export function getHsc28BusinessFilterCounts(
  courses: Course[]
): Record<Hsc28BusinessFilterId | 'all', number> {
  const counts: Record<Hsc28BusinessFilterId | 'all', number> = {
    all: courses.length,
    bundle: 0,
    specific: 0,
    finance: 0,
    accounting: 0,
    management: 0,
    marketing: 0,
    bei: 0,
    bangla: 0,
    english: 0,
    ict: 0,
  };

  for (const option of HSC28_BUSINESS_ALL_FILTERS) {
    counts[option.id] = courses.filter((course) =>
      courseMatchesHsc28BusinessFilter(course, option.id)
    ).length;
  }

  return counts;
}
