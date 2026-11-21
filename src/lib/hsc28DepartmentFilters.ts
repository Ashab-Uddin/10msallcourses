import type { Course } from '../types.ts';
import { normalizeCategoryMatchText } from './categoryMatching.ts';

export type Hsc28DepartmentTrack = 'humanities' | 'business';

export type Hsc28HumanitiesFilterId =
  | 'bundle'
  | 'specific'
  | 'geography'
  | 'economics'
  | 'civics'
  | 'history'
  | 'logic'
  | 'bei'
  | 'bangla'
  | 'english'
  | 'ict';

export type Hsc28BusinessFilterId =
  | 'bundle'
  | 'specific'
  | 'commerce-combo'
  | 'accounting'
  | 'finance'
  | 'management'
  | 'marketing'
  | 'bei'
  | 'bangla'
  | 'english'
  | 'ict';

export type Hsc28DepartmentFilterId =
  | Hsc28HumanitiesFilterId
  | Hsc28BusinessFilterId;

export interface Hsc28DepartmentFilterOption {
  id: Hsc28DepartmentFilterId;
  label: string;
  shortHint: string;
}

export const HSC28_HUMANITIES_FILTERS: ReadonlyArray<Hsc28DepartmentFilterOption> = [
  {
    id: 'bundle',
    label: 'বান্ডেল',
    shortHint: 'একাধিক বিষয়ের কম্বাইন ও ফুল কোর্স প্যাকেজ',
  },
  {
    id: 'specific',
    label: 'নির্দিষ্ট',
    shortHint: 'একক বিষয় বা নির্দিষ্ট অধ্যায়ভিত্তিক কোর্স',
  },
  { id: 'geography', label: 'জিওগ্রাফি', shortHint: 'ভূগোল ১ম ও ২য় পত্র' },
  { id: 'economics', label: 'ইকোনমিক্স', shortHint: 'অর্থনীতি ১ম ও ২য় পত্র' },
  { id: 'civics', label: 'পৌরনীতি', shortHint: 'পৌরনীতি ও সুশাসন ১ম ও ২য় পত্র' },
  { id: 'history', label: 'ইতিহাস', shortHint: 'ইতিহাস ও ইসলামের ইতিহাস' },
  { id: 'logic', label: 'যুক্তিবিদ্যা', shortHint: 'যুক্তিবিদ্যা ১ম ও ২য় পত্র' },
  { id: 'bei', label: 'BEI', shortHint: 'বাংলা, ইংরেজি ও ICT কম্বাইন প্যাকেজ' },
  { id: 'bangla', label: 'বাংলা', shortHint: 'বাংলা ১ম ও ২য় পত্র' },
  { id: 'english', label: 'ইংরেজি', shortHint: 'ইংরেজি ১ম ও ২য় পত্র' },
  { id: 'ict', label: 'ICT', shortHint: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
];

export const HSC28_BUSINESS_FILTERS: ReadonlyArray<Hsc28DepartmentFilterOption> = [
  {
    id: 'bundle',
    label: 'বান্ডেল',
    shortHint: 'একাধিক বিষয়ের কম্বাইন ও ফুল কোর্স প্যাকেজ',
  },
  {
    id: 'specific',
    label: 'নির্দিষ্ট',
    shortHint: 'একক বিষয় বা নির্দিষ্ট অধ্যায়ভিত্তিক কোর্স',
  },
  {
    id: 'commerce-combo',
    label: '৪ বিষয় কম্বো',
    shortHint: 'ফাইন্যান্স, একাউন্টিং, ম্যানেজমেন্ট ও মার্কেটিং কম্বো',
  },
  { id: 'accounting', label: 'একাউন্টিং', shortHint: 'হিসাববিজ্ঞান ১ম ও ২য় পত্র' },
  { id: 'finance', label: 'ফাইন্যান্স', shortHint: 'ফিন্যান্স, ব্যাংকিং ও বিমা' },
  { id: 'management', label: 'ম্যানেজমেন্ট', shortHint: 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা' },
  { id: 'marketing', label: 'মার্কেটিং', shortHint: 'উৎপাদন ব্যবস্থাপনা ও বিপণন' },
  { id: 'bei', label: 'BEI', shortHint: 'বাংলা, ইংরেজি ও ICT কম্বাইন প্যাকেজ' },
  { id: 'bangla', label: 'বাংলা', shortHint: 'বাংলা ১ম ও ২য় পত্র' },
  { id: 'english', label: 'ইংরেজি', shortHint: 'ইংরেজি ১ম ও ২য় পত্র' },
  { id: 'ict', label: 'ICT', shortHint: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
];

export function getDepartmentFilterOptions(
  track: Hsc28DepartmentTrack
): ReadonlyArray<Hsc28DepartmentFilterOption> {
  return track === 'humanities'
    ? HSC28_HUMANITIES_FILTERS
    : HSC28_BUSINESS_FILTERS;
}

function getCourseMetaText(course: Course): string {
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

function hasBangla(text: string): boolean {
  if (hasExplicitBei(text)) return true;
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

// Humanities subjects
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
    includesNormalizedAny(text, ['পৌরনীতি', 'সুশাসন']) ||
    /\bcivics\b/i.test(text)
  );
}

function hasHistory(text: string): boolean {
  return (
    includesNormalizedAny(text, ['ইতিহাস']) || /\bhistory\b/i.test(text)
  );
}

function hasLogic(text: string): boolean {
  return (
    includesNormalizedAny(text, ['যুক্তিবিদ্যা']) || /\blogic\b/i.test(text)
  );
}

// Business subjects
function hasAccounting(text: string): boolean {
  return (
    includesNormalizedAny(text, ['একাউন্টিং', 'অ্যাকাউন্টিং', 'হিসাববিজ্ঞান']) ||
    /\baccounting\b/i.test(text)
  );
}

function hasFinance(text: string): boolean {
  return (
    includesNormalizedAny(text, ['ফাইন্যান্স', 'ফিন্যান্স', 'ব্যাংকিং']) ||
    /\bfinance\b/i.test(text)
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

function hasCommerceCombo(text: string): boolean {
  const commerceCount = [
    hasAccounting(text),
    hasFinance(text),
    hasManagement(text),
    hasMarketing(text),
  ].filter(Boolean).length;
  return commerceCount >= 3;
}

function isBundleCourse(text: string, track: Hsc28DepartmentTrack): boolean {
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

  const subjectFlags =
    track === 'humanities'
      ? [
          hasGeography(text),
          hasEconomics(text),
          hasCivics(text),
          hasHistory(text),
          hasLogic(text),
          hasBangla(text),
          hasEnglish(text),
          hasIct(text),
        ]
      : [
          hasAccounting(text),
          hasFinance(text),
          hasManagement(text),
          hasMarketing(text),
          hasBangla(text),
          hasEnglish(text),
          hasIct(text),
        ];

  return subjectFlags.filter(Boolean).length >= 2;
}

export function courseMatchesDepartmentFilter(
  course: Course,
  track: Hsc28DepartmentTrack,
  filterId: Hsc28DepartmentFilterId
): boolean {
  const text = getCourseMetaText(course);

  switch (filterId) {
    case 'bundle':
      return isBundleCourse(text, track);
    case 'specific':
      return !isBundleCourse(text, track);
    case 'geography':
      return hasGeography(text);
    case 'economics':
      return hasEconomics(text);
    case 'civics':
      return hasCivics(text);
    case 'history':
      return hasHistory(text);
    case 'logic':
      return hasLogic(text);
    case 'commerce-combo':
      return hasCommerceCombo(text);
    case 'accounting':
      return hasAccounting(text);
    case 'finance':
      return hasFinance(text);
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

export function toggleDepartmentFilter(
  currentFilter: Hsc28DepartmentFilterId | 'all',
  clickedId: Hsc28DepartmentFilterId | 'all'
): Hsc28DepartmentFilterId | 'all' {
  if (clickedId === 'all' || currentFilter === clickedId) {
    return 'all';
  }
  return clickedId;
}

export function filterDepartmentCourses(
  courses: Course[],
  track: Hsc28DepartmentTrack,
  selectedFilter: Hsc28DepartmentFilterId | 'all'
): Course[] {
  if (selectedFilter === 'all') {
    return courses;
  }
  return courses.filter((course) =>
    courseMatchesDepartmentFilter(course, track, selectedFilter)
  );
}

export function getDepartmentFilterCounts(
  courses: Course[],
  track: Hsc28DepartmentTrack
): Record<string, number> {
  const options = getDepartmentFilterOptions(track);
  const counts: Record<string, number> = {
    all: courses.length,
  };

  for (const opt of options) {
    counts[opt.id] = courses.filter((course) =>
      courseMatchesDepartmentFilter(course, track, opt.id)
    ).length;
  }

  return counts;
}
