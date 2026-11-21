import type { Course } from '../types.ts';
import {
  courseHasAssignedCategorySlug,
  normalizeCategoryMatchText,
} from './categoryMatching.ts';

export type JuniorClassFilterId =
  | 'all'
  | 'full-year'
  | 'half-yearly'
  | 'annual-exam'
  | 'pre-book'
  | 'monthly'
  | 'masterbook'
  | 'specific'
  | 'free';

export interface JuniorClassFilterDefinition {
  id: JuniorClassFilterId;
  label: string;
  shortHint: string;
}

export type JuniorClassNumber5To8 = 5 | 6 | 7 | 8;

export interface JuniorClassPageMeta {
  classNum: JuniorClassNumber5To8;
  slug: string;
  path: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const JUNIOR_CLASS_PAGE_META: Record<JuniorClassNumber5To8, JuniorClassPageMeta> = {
  5: {
    classNum: 5,
    slug: 'class-5',
    path: '/class-5',
    label: '৫ম শ্রেণি',
    shortLabel: 'Class 5',
    description:
      '৫ম শ্রেণি অনলাইন ব্যাচ ২০২৭-এ সর্বোচ্চ ডিসকাউন্ট পেতে ‘কোর্সটিতে ভর্তি হোন’ বাটনে ক্লিক করুন। বোর্ড ও বৃত্তি প্রস্তুতির সেরা যাত্রা—এখনই শুরু করুন!',
  },
  6: {
    classNum: 6,
    slug: 'class-6',
    path: '/class-6',
    label: '৬ষ্ঠ শ্রেণি',
    shortLabel: 'Class 6',
    description:
      '৬ষ্ঠ শ্রেণি অনলাইন ব্যাচ ২০২৭-এ সর্বোচ্চ ডিসকাউন্ট পেতে ‘কোর্সটিতে ভর্তি হোন’ বাটনে ক্লিক করুন। বোর্ড ও বৃত্তি প্রস্তুতির সেরা যাত্রা—এখনই শুরু করুন!',
  },
  7: {
    classNum: 7,
    slug: 'class-7',
    path: '/class-7',
    label: '৭ম শ্রেণি',
    shortLabel: 'Class 7',
    description:
      '৭ম শ্রেণি অনলাইন ব্যাচ ২০২৭-এ সর্বোচ্চ ডিসকাউন্ট পেতে ‘কোর্সটিতে ভর্তি হোন’ বাটনে ক্লিক করুন। বোর্ড ও বৃত্তি প্রস্তুতির সেরা যাত্রা—এখনই শুরু করুন!',
  },
  8: {
    classNum: 8,
    slug: 'class-8',
    path: '/class-8',
    label: '৮ম শ্রেণি',
    shortLabel: 'Class 8',
    description:
      '৮ম শ্রেণি অনলাইন ব্যাচ ২০২৭-এ সর্বোচ্চ ডিসকাউন্ট পেতে ‘কোর্সটিতে ভর্তি হোন’ বাটনে ক্লিক করুন। বোর্ড ও বৃত্তি প্রস্তুতির সেরা যাত্রা—এখনই শুরু করুন!',
  },
};

export const JUNIOR_CLASS_FILTERS: ReadonlyArray<JuniorClassFilterDefinition> = [
  { id: 'all', label: 'সব কোর্স', shortHint: 'সকল উপলব্ধ কোর্স ও ব্যাচ' },
  { id: 'full-year', label: 'সম্পূর্ণ বছর', shortHint: 'সারা বছরের পূর্ণাঙ্গ অনলাইন ব্যাচ' },
  { id: 'half-yearly', label: 'অর্ধ বার্ষিক', shortHint: 'অর্ধ-বার্ষিক মূল্যায়ন প্রস্তুতি' },
  { id: 'annual-exam', label: 'বার্ষিক পরীক্ষা', shortHint: 'বার্ষিক ও বৃত্তি পরীক্ষা প্রস্তুতি' },
  { id: 'pre-book', label: 'প্রি-বুক', shortHint: 'আগাম বুকিং ও বিশেষ অফার' },
  { id: 'monthly', label: 'এক মাসের ফি', shortHint: 'মাসিক ফি ভিত্তিক সাবস্ক্রিপশন' },
  { id: 'masterbook', label: 'মাস্টারবুক বান্ডেল', shortHint: 'প্রিন্টেড বই ও লেকচার গাইডসহ' },
  { id: 'specific', label: 'নির্দিষ্ট', shortHint: 'বিষয়ভিত্তিক স্পেশাল কোর্স' },
  { id: 'free', label: 'ফ্রি কোর্স', shortHint: 'বিনামূল্যে শেখার কোর্স ও ক্লাস' },
];

const PRE_BOOK_KEYWORDS = [
  'প্রি-বুক',
  'প্রি বুক',
  'প্রি-বুকিং',
  'প্রিবুক',
  'pre-book',
  'prebook',
  'pre book',
  'আগাম বুকিং',
];

const ANNUAL_EXAM_KEYWORDS = [
  'বার্ষিক পরীক্ষা',
  'বার্ষিক ও বৃত্তি',
  'বৃত্তি পরীক্ষা',
  'বার্ষিক প্রস্তুতি',
  'annual exam',
  'final exam',
  'ফাইনাল পরীক্ষা',
  'শেষ মুহূর্ত',
];

const HALF_YEARLY_KEYWORDS = [
  'অর্ধ বার্ষিক',
  'অর্ধ-বার্ষিক',
  'অর্ধবার্ষিক',
  'half yearly',
  'half-yearly',
  'ষান্মাসিক',
  'mid term',
  'mid-term',
];

const MONTHLY_KEYWORDS = [
  'এক মাস',
  '১ মাস',
  'এক মাসের',
  '১ মাসের',
  'মাসিক',
  'monthly',
  'per month',
  '1 month',
];

const MASTERBOOK_KEYWORDS = [
  'মাস্টারবুক বান্ডেল',
  'বই বান্ডেল',
  'masterbook bundle',
  'book bundle',
  'মাস্টারবুক ও',
  'প্রিন্টেড বই',
  'মাস্টারবুক',
  'masterbook',
];

const SPECIFIC_SUBJECT_KEYWORDS = [
  'নির্দিষ্ট',
  'বিষয়ভিত্তিক',
  'বিষয়ভিত্তিক',
  'একক বিষয়',
  'একক বিষয়',
  'subject-wise',
  'single subject',
  'গণিত',
  'ইংরেজি',
  'বিজ্ঞান',
  'বাংলা',
  'আইসিটি',
  'math',
  'english',
  'science',
  'bangla',
  'ict',
];

const FULL_YEAR_KEYWORDS = [
  'সম্পূর্ণ বছর',
  'সম্পূর্ন বছর',
  'full year',
  'full-year',
  'সারাবছর',
  'সারা বছর',
  'ফুল ইয়ার',
  'ফুল ইয়ার',
  'বার্ষিক অনলাইন ব্যাচ',
];

const FREE_KEYWORDS = [
  'ফ্রি কোর্স',
  'বিনামূল্যে',
  'বিনামুল্যে',
  'free course',
  'free class',
];

function includesNormalizedKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

function getPrimaryCourseMeta(course: Course): string {
  return normalizeCategoryMatchText(
    `${course.title || ''} ${course.slug || ''} ${course.shortBadge || ''} ${course.headerTitle || ''} ${course.headerSubtitle || ''} ${course.targetStudents || ''}`
  );
}

function getExtendedCourseMeta(course: Course): string {
  return normalizeCategoryMatchText(
    `${getPrimaryCourseMeta(course)} ${course.duration || ''}`
  );
}

export function courseMatchesJuniorClassFilter(
  course: Course,
  filterId: JuniorClassFilterId
): boolean {
  if (filterId === 'all') return true;

  const primary = getPrimaryCourseMeta(course);
  const extended = getExtendedCourseMeta(course);

  if (filterId === 'free') {
    return (
      course.discountPrice === 0 ||
      courseHasAssignedCategorySlug(course, 'free-course') ||
      includesNormalizedKeyword(primary, FREE_KEYWORDS)
    );
  }

  if (filterId === 'pre-book') {
    return includesNormalizedKeyword(primary, PRE_BOOK_KEYWORDS);
  }

  if (filterId === 'annual-exam') {
    return includesNormalizedKeyword(primary, ANNUAL_EXAM_KEYWORDS);
  }

  if (filterId === 'half-yearly') {
    return includesNormalizedKeyword(extended, HALF_YEARLY_KEYWORDS);
  }

  if (filterId === 'monthly') {
    return includesNormalizedKeyword(extended, MONTHLY_KEYWORDS);
  }

  if (filterId === 'masterbook') {
    return includesNormalizedKeyword(primary, MASTERBOOK_KEYWORDS);
  }

  if (filterId === 'specific') {
    return includesNormalizedKeyword(primary, SPECIFIC_SUBJECT_KEYWORDS);
  }

  if (filterId === 'full-year') {
    if (includesNormalizedKeyword(primary, FULL_YEAR_KEYWORDS)) {
      return true;
    }
    const isOtherSpecializedBatch =
      course.discountPrice === 0 ||
      includesNormalizedKeyword(primary, PRE_BOOK_KEYWORDS) ||
      includesNormalizedKeyword(primary, ANNUAL_EXAM_KEYWORDS) ||
      includesNormalizedKeyword(extended, HALF_YEARLY_KEYWORDS) ||
      includesNormalizedKeyword(extended, MONTHLY_KEYWORDS) ||
      includesNormalizedKeyword(primary, SPECIFIC_SUBJECT_KEYWORDS);
    return !isOtherSpecializedBatch && primary.includes(normalizeCategoryMatchText('অনলাইন ব্যাচ'));
  }

  return true;
}

export function getJuniorClassFilterCounts(
  courses: Course[]
): Record<JuniorClassFilterId, number> {
  const counts: Record<JuniorClassFilterId, number> = {
    all: courses.length,
    'full-year': 0,
    'half-yearly': 0,
    'annual-exam': 0,
    'pre-book': 0,
    monthly: 0,
    masterbook: 0,
    specific: 0,
    free: 0,
  };

  for (const filter of JUNIOR_CLASS_FILTERS) {
    if (filter.id === 'all') continue;
    counts[filter.id] = courses.filter((c) =>
      courseMatchesJuniorClassFilter(c, filter.id)
    ).length;
  }

  return counts;
}

export function filterJuniorClassCourses(
  courses: Course[],
  filterId: JuniorClassFilterId
): Course[] {
  return courses.filter((course) => courseMatchesJuniorClassFilter(course, filterId));
}
