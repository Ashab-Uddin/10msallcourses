import type { Course } from '../types.ts';
import { normalizeCategoryMatchText } from './categoryMatching.ts';

export type Hsc28ScienceFilterId =
  | 'bundle'
  | 'specific'
  | 'pcmb'
  | 'biology'
  | 'physics'
  | 'chemistry'
  | 'math'
  | 'bei'
  | 'bangla'
  | 'english'
  | 'ict';

export type Hsc28ScienceFilterGroup = 'type' | 'subject';

export interface Hsc28ScienceFilterOption {
  id: Hsc28ScienceFilterId;
  label: string;
  group: Hsc28ScienceFilterGroup;
  shortHint: string;
}

export const HSC28_TYPE_FILTERS: ReadonlyArray<Hsc28ScienceFilterOption> = [
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

export const HSC28_SUBJECT_FILTERS: ReadonlyArray<Hsc28ScienceFilterOption> = [
  { id: 'pcmb', label: 'PCMB', group: 'subject', shortHint: 'ফিজিক্স, কেমিস্ট্রি, ম্যাথ ও বায়োলজি' },
  { id: 'biology', label: 'বায়োলজি', group: 'subject', shortHint: 'জীববিজ্ঞান ১ম ও ২য় পত্র' },
  { id: 'physics', label: 'ফিজিক্স', group: 'subject', shortHint: 'পদার্থবিজ্ঞান ১ম ও ২য় পত্র' },
  { id: 'chemistry', label: 'কেমিস্ট্রি', group: 'subject', shortHint: 'রসায়ন ১ম ও ২য় পত্র' },
  { id: 'math', label: 'ম্যাথ', group: 'subject', shortHint: 'উচ্চতর গণিত ১ম ও ২য় পত্র' },
  { id: 'bei', label: 'BEI', group: 'subject', shortHint: 'বাংলা, ইংরেজি ও ICT কম্বাইন প্যাকেজ' },
  { id: 'bangla', label: 'বাংলা', group: 'subject', shortHint: 'বাংলা ১ম ও ২য় পত্র' },
  { id: 'english', label: 'ইংরেজি', group: 'subject', shortHint: 'ইংরেজি ১ম ও ২য় পত্র' },
  { id: 'ict', label: 'ICT', group: 'subject', shortHint: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
];

export const HSC28_ALL_FILTERS: ReadonlyArray<Hsc28ScienceFilterOption> = [
  ...HSC28_TYPE_FILTERS,
  ...HSC28_SUBJECT_FILTERS,
];

/**
 * Primary metadata string built strictly from authoritative identity fields
 * (excludes marketing description & feature bullets to prevent copy-paste leaks across subjects).
 */
function getHsc28CourseMetaText(course: Course): string {
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

function hasExplicitPcmb(text: string): boolean {
  return /\bpcmb\b/i.test(text);
}

function hasExplicitBei(text: string): boolean {
  return /\bbei\b/i.test(text);
}

function hasPhysics(text: string): boolean {
  return (
    hasExplicitPcmb(text) ||
    includesNormalizedAny(text, ['ফিজিক্স', 'পদার্থ']) ||
    /\bphysics\b/i.test(text)
  );
}

function hasChemistry(text: string): boolean {
  return (
    hasExplicitPcmb(text) ||
    includesNormalizedAny(text, ['কেমিস্ট্রি', 'রসায়ন']) ||
    /\bchemistry\b/i.test(text)
  );
}

function hasMath(text: string): boolean {
  return (
    hasExplicitPcmb(text) ||
    includesNormalizedAny(text, ['ম্যাথ', 'উচ্চতর গণিত', 'গণিত']) ||
    /\bmath(?:ematics)?\b/i.test(text)
  );
}

function hasBiology(text: string): boolean {
  return (
    hasExplicitPcmb(text) ||
    includesNormalizedAny(text, ['বায়োলজি', 'জীববিজ্ঞান']) ||
    /\bbiology\b/i.test(text)
  );
}

function hasBangla(text: string): boolean {
  if (hasExplicitBei(text)) return true;
  // Match standalone "বাংলা" token (avoid matching "বাংলাদেশ" / "বাংলাদেশের")
  const normalizedBanglaBoundary = /(?:^|[\s,()|–—\-/:])বাংলা(?=$|[\s,()|–—\-/:১-৯0-9]|র|য়|তে|কে|ও)/;
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

function hasPcmbCombo(text: string): boolean {
  if (hasExplicitPcmb(text)) return true;
  const scienceSubjectCount = [
    hasPhysics(text),
    hasChemistry(text),
    hasMath(text),
    hasBiology(text),
  ].filter(Boolean).length;
  return scienceSubjectCount >= 3;
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
    /\b(?:bundle|combo|full course|pcmb|bei)\b/i.test(text)
  ) {
    return true;
  }

  const coveredSubjectsCount = [
    hasPhysics(text),
    hasChemistry(text),
    hasMath(text),
    hasBiology(text),
    hasBangla(text),
    hasEnglish(text),
    hasIct(text),
  ].filter(Boolean).length;

  return coveredSubjectsCount >= 2;
}

export function courseMatchesHsc28ScienceFilter(
  course: Course,
  filterId: Hsc28ScienceFilterId
): boolean {
  const text = getHsc28CourseMetaText(course);

  switch (filterId) {
    case 'bundle':
      return isBundleCourse(text);
    case 'specific':
      return !isBundleCourse(text);
    case 'pcmb':
      return hasPcmbCombo(text);
    case 'biology':
      return hasBiology(text);
    case 'physics':
      return hasPhysics(text);
    case 'chemistry':
      return hasChemistry(text);
    case 'math':
      return hasMath(text);
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

export function toggleHsc28ScienceFilter(
  currentFilter: Hsc28ScienceFilterId | 'all',
  clickedId: Hsc28ScienceFilterId | 'all'
): Hsc28ScienceFilterId | 'all' {
  if (clickedId === 'all' || currentFilter === clickedId) {
    return 'all';
  }
  return clickedId;
}

/**
 * Single-filter matching logic:
 * - 'all' shows every HSC 28 Science course.
 * - Any selected filter ID shows courses matching that specific type or subject.
 */
export function filterHsc28ScienceCourses(
  courses: Course[],
  selectedFilter: Hsc28ScienceFilterId | 'all'
): Course[] {
  if (selectedFilter === 'all') {
    return courses;
  }
  return courses.filter((course) =>
    courseMatchesHsc28ScienceFilter(course, selectedFilter)
  );
}

export function getHsc28ScienceFilterCounts(
  courses: Course[]
): Record<Hsc28ScienceFilterId | 'all', number> {
  const counts: Record<Hsc28ScienceFilterId | 'all', number> = {
    all: courses.length,
    bundle: 0,
    specific: 0,
    pcmb: 0,
    biology: 0,
    physics: 0,
    chemistry: 0,
    math: 0,
    bei: 0,
    bangla: 0,
    english: 0,
    ict: 0,
  };

  for (const option of HSC28_ALL_FILTERS) {
    counts[option.id] = courses.filter((course) =>
      courseMatchesHsc28ScienceFilter(course, option.id)
    ).length;
  }

  return counts;
}
