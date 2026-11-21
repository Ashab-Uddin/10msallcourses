import type { Course } from '../types.ts';
import { normalizeCategoryMatchText } from './categoryMatching.ts';

export type Hsc28HumanitiesFilterId =
  | 'bundle'
  | 'specific'
  | 'geography'
  | 'economics'
  | 'civics'
  | 'bei'
  | 'bangla'
  | 'english'
  | 'ict';

export type Hsc28HumanitiesFilterGroup = 'type' | 'subject';

export interface Hsc28HumanitiesFilterOption {
  id: Hsc28HumanitiesFilterId;
  label: string;
  group: Hsc28HumanitiesFilterGroup;
  shortHint: string;
}

export const HSC28_HUMANITIES_TYPE_FILTERS: ReadonlyArray<Hsc28HumanitiesFilterOption> = [
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

export const HSC28_HUMANITIES_SUBJECT_FILTERS: ReadonlyArray<Hsc28HumanitiesFilterOption> = [
  {
    id: 'geography',
    label: 'জিওগ্রাফি',
    group: 'subject',
    shortHint: 'ভূগোল ১ম ও ২য় পত্র',
  },
  {
    id: 'economics',
    label: 'ইকোনমিক্স',
    group: 'subject',
    shortHint: 'অর্থনীতি ১ম ও ২য় পত্র',
  },
  {
    id: 'civics',
    label: 'পৌরনীতি',
    group: 'subject',
    shortHint: 'পৌরনীতি ও সুশাসন ১ম ও ২য় পত্র',
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

export const HSC28_HUMANITIES_ALL_FILTERS: ReadonlyArray<Hsc28HumanitiesFilterOption> = [
  ...HSC28_HUMANITIES_TYPE_FILTERS,
  ...HSC28_HUMANITIES_SUBJECT_FILTERS,
];

/**
 * Primary metadata string built strictly from authoritative identity fields
 * (excludes marketing description & feature bullets to prevent cross-subject leaks).
 */
function getHsc28HumanitiesMetaText(course: Course): string {
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

function hasGeography(text: string): boolean {
  return (
    includesNormalizedAny(text, ['জিওগ্রাফি', 'ভূগোল']) ||
    /\bgeography\b/i.test(text)
  );
}

function hasEconomics(text: string): boolean {
  return (
    includesNormalizedAny(text, ['ইকোনমিক্স', 'অর্থনীতি']) ||
    /\beconomics\b/i.test(text)
  );
}

function hasCivics(text: string): boolean {
  return (
    includesNormalizedAny(text, ['পৌরনীতি', 'সিভিক্স', 'সুশাসন']) ||
    /\bcivics\b/i.test(text)
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
    hasGeography(text),
    hasEconomics(text),
    hasCivics(text),
    hasBangla(text),
    hasEnglish(text),
    hasIct(text),
  ].filter(Boolean).length;

  return coveredSubjectsCount >= 2;
}

export function courseMatchesHsc28HumanitiesFilter(
  course: Course,
  filterId: Hsc28HumanitiesFilterId
): boolean {
  const text = getHsc28HumanitiesMetaText(course);

  switch (filterId) {
    case 'bundle':
      return isBundleCourse(text);
    case 'specific':
      return !isBundleCourse(text);
    case 'geography':
      return hasGeography(text);
    case 'economics':
      return hasEconomics(text);
    case 'civics':
      return hasCivics(text);
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

export function toggleHsc28HumanitiesFilter(
  currentFilter: Hsc28HumanitiesFilterId | 'all',
  clickedId: Hsc28HumanitiesFilterId | 'all'
): Hsc28HumanitiesFilterId | 'all' {
  if (clickedId === 'all' || currentFilter === clickedId) {
    return 'all';
  }
  return clickedId;
}

/**
 * Single-filter matching logic:
 * - 'all' shows every HSC 28 Humanities course.
 * - Any selected filter ID shows courses matching that specific type or subject.
 */
export function filterHsc28HumanitiesCourses(
  courses: Course[],
  selectedFilter: Hsc28HumanitiesFilterId | 'all'
): Course[] {
  if (selectedFilter === 'all') {
    return courses;
  }
  return courses.filter((course) =>
    courseMatchesHsc28HumanitiesFilter(course, selectedFilter)
  );
}

export function getHsc28HumanitiesFilterCounts(
  courses: Course[]
): Record<Hsc28HumanitiesFilterId | 'all', number> {
  const counts: Record<Hsc28HumanitiesFilterId | 'all', number> = {
    all: courses.length,
    bundle: 0,
    specific: 0,
    geography: 0,
    economics: 0,
    civics: 0,
    bei: 0,
    bangla: 0,
    english: 0,
    ict: 0,
  };

  for (const option of HSC28_HUMANITIES_ALL_FILTERS) {
    counts[option.id] = courses.filter((course) =>
      courseMatchesHsc28HumanitiesFilter(course, option.id)
    ).length;
  }

  return counts;
}
