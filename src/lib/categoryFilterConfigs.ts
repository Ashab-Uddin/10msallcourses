import type { Course } from '../types.ts';
import {
  categorySlugsMatch,
  normalizeCategoryMatchText,
  normalizeCategorySlugKey,
  resolveCourseDepartments,
} from './categoryMatching.ts';
import {
  HSC28_ALL_FILTERS,
  courseMatchesHsc28ScienceFilter,
  type Hsc28ScienceFilterId,
} from './hsc28ScienceFilters.ts';
import {
  HSC28_HUMANITIES_ALL_FILTERS,
  courseMatchesHsc28HumanitiesFilter,
  type Hsc28HumanitiesFilterId,
} from './hsc28HumanitiesFilters.ts';
import {
  HSC28_BUSINESS_ALL_FILTERS,
  courseMatchesHsc28BusinessFilter,
  type Hsc28BusinessFilterId,
} from './hsc28BusinessFilters.ts';

export type FilteredCategoryKey =
  | 'hsc-28-humanities'
  | 'hsc-28-business'
  | 'hsc-28-bei'
  | 'hsc-27-science'
  | 'hsc-27-humanities'
  | 'hsc-27-business'
  | 'hsc-27-bei'
  | 'hsc-27-smp'
  | 'ssc-27'
  | 'ssc-28'
  | 'ssc-29';

export type CategoryFilterIconKey =
  | 'bundle'
  | 'specific'
  | 'pcmb'
  | 'biology'
  | 'physics'
  | 'chemistry'
  | 'math'
  | 'geography'
  | 'economics'
  | 'civics'
  | 'finance'
  | 'accounting'
  | 'management'
  | 'marketing'
  | 'bei'
  | 'bangla'
  | 'english'
  | 'ict'
  | 'science'
  | 'humanities'
  | 'business'
  | 'full-year'
  | 'board-exam'
  | 'smp'
  | 'annual-exam'
  | 'recorded';

export type CategoryFilterGroup = 'primary' | 'secondary';

export interface CategoryFilterOption {
  id: string;
  label: string;
  group: CategoryFilterGroup;
  iconKey: CategoryFilterIconKey;
  shortHint: string;
}

export interface CategoryFilterConfig {
  key: FilteredCategoryKey;
  defaultSlug: string;
  defaultTitle: string;
  defaultSubtitle: string;
  ariaLabel: string;
  groupAriaLabel: string;
  options: ReadonlyArray<CategoryFilterOption>;
  matchesFilter: (course: Course, filterId: string) => boolean;
}

function getCoursePrimaryMetaText(course: Course): string {
  return normalizeCategoryMatchText(
    [
      course.title || '',
      course.slug || '',
      course.shortBadge || '',
      course.headerTitle || '',
      course.headerSubtitle || '',
      course.targetStudents || '',
    ].join(' ')
  );
}

function getCourseIdentityText(course: Course): string {
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

function isBeiBundleCourse(text: string): boolean {
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

  const coveredCount = [hasBangla(text), hasEnglish(text), hasIct(text)].filter(Boolean).length;
  return coveredCount >= 2;
}

function isSmpCourseText(text: string): boolean {
  return (
    includesNormalizedAny(text, [
      'শেষ মুহূর্ত',
      'শেষ মুহুর্ত',
      'ফাইনাল রিভিশন',
      'ক্র্যাশ কোর্স',
    ]) || /\b(?:smp|last moment|final revision|crash course)\b/i.test(text)
  );
}

function isBoardExamCourseText(text: string): boolean {
  return (
    includesNormalizedAny(text, [
      'বোর্ড পরীক্ষা',
      'বোর্ড প্রস্তুতি',
      'বোর্ড প্রিপারেশন',
      'বোর্ড প্রশ্ন',
      'টেস্ট পরীক্ষা',
      'টেস্ট পেপার',
      'মডেল টেস্ট',
    ]) || /\b(?:board exam|board prep|test paper|model test)\b/i.test(text)
  );
}

function isAnnualExamCourseText(text: string): boolean {
  return (
    includesNormalizedAny(text, [
      'বার্ষিক পরীক্ষা',
      'বার্ষিক ও বৃত্তি',
      'বার্ষিক প্রস্তুতি',
      'ফাইনাল পরীক্ষা',
    ]) || /\b(?:annual exam|final exam)\b/i.test(text)
  );
}

function isRecordedCourseText(text: string): boolean {
  return (
    includesNormalizedAny(text, ['রেকর্ডেড', 'রেকর্ড', 'আর্কাইভ']) ||
    /\b(?:recorded|pre-recorded|archive)\b/i.test(text)
  );
}

function isFullYearSscCourseText(text: string): boolean {
  if (
    includesNormalizedAny(text, [
      'সম্পূর্ণ বছর',
      'সম্পূর্ন বছর',
      'পূর্ণ বছর',
      'ফুল ইয়ার',
      'ফুল ইয়ার',
      'সারা বছর',
      'সারাবছর',
      '১১টি বিষয়ের',
      '১১টি বিষয়ের',
      'সব বিষয়',
      'সকল বিষয়',
      'সম্পূর্ণ সিলেবাস',
    ]) ||
    /\b(?:full year|full-year|full syllabus)\b/i.test(text)
  ) {
    return true;
  }

  const hasOnlineBatch = includesNormalizedAny(text, ['অনলাইন ব্যাচ']) || /\bonline batch\b/i.test(text);
  return (
    hasOnlineBatch &&
    !isSmpCourseText(text) &&
    !isBoardExamCourseText(text) &&
    !isAnnualExamCourseText(text) &&
    !isRecordedCourseText(text)
  );
}

function isSpecificSscCourseText(text: string): boolean {
  if (
    includesNormalizedAny(text, [
      'নির্দিষ্ট',
      'বিষয়ভিত্তিক',
      'বিষয়ভিত্তিক',
      'একক বিষয়',
      'একক বিষয়',
      'অধ্যায়ভিত্তিক',
      'অধ্যায়ভিত্তিক',
    ]) ||
    /\b(?:subject-wise|single subject|specific|chapter)\b/i.test(text)
  ) {
    return true;
  }

  if (isFullYearSscCourseText(text) || includesNormalizedAny(text, ['বান্ডেল', '১১টি বিষয়']) || /\bbundle\b/i.test(text)) {
    return false;
  }

  return (
    includesNormalizedAny(text, [
      'গণিত',
      'ম্যাথ',
      'উচ্চতর গণিত',
      'পদার্থ',
      'ফিজিক্স',
      'রসায়ন',
      'কেমিস্ট্রি',
      'জীববিজ্ঞান',
      'বায়োলজি',
      'বিজ্ঞান',
      'ইংরেজি',
      'আইসিটি',
    ]) ||
    hasBangla(text) ||
    /\b(?:math|physics|chemistry|biology|english|ict|bangla)\b/i.test(text)
  );
}

export const CATEGORY_FILTER_CONFIGS: Record<FilteredCategoryKey, CategoryFilterConfig> = {
  'hsc-28-humanities': {
    key: 'hsc-28-humanities',
    defaultSlug: 'hsc-28-huma',
    defaultTitle: 'HSC 28 মানবিক কোর্স',
    defaultSubtitle: 'কলেজ একাডেমিক প্রোগ্রাম',
    ariaLabel: 'HSC 28 মানবিক কোর্স ফিল্টার',
    groupAriaLabel: 'HSC 28 মানবিক কোর্সের ধরন ও বিষয় ফিল্টার',
    options: HSC28_HUMANITIES_ALL_FILTERS.map((opt) => ({
      id: opt.id,
      label: opt.label,
      group: opt.group === 'type' ? 'primary' : 'secondary',
      iconKey: opt.id as CategoryFilterIconKey,
      shortHint: opt.shortHint,
    })),
    matchesFilter: (course, filterId) =>
      courseMatchesHsc28HumanitiesFilter(course, filterId as Hsc28HumanitiesFilterId),
  },

  'hsc-28-business': {
    key: 'hsc-28-business',
    defaultSlug: 'hsc-28-buss',
    defaultTitle: 'HSC 28 ব্যবসায় শিক্ষা',
    defaultSubtitle: 'কলেজ একাডেমিক প্রোগ্রাম',
    ariaLabel: 'HSC 28 ব্যবসায় শিক্ষা কোর্স ফিল্টার',
    groupAriaLabel: 'HSC 28 ব্যবসায় শিক্ষা কোর্সের ধরন ও বিষয় ফিল্টার',
    options: HSC28_BUSINESS_ALL_FILTERS.map((opt) => ({
      id: opt.id,
      label: opt.label,
      group: opt.group === 'type' ? 'primary' : 'secondary',
      iconKey: opt.id as CategoryFilterIconKey,
      shortHint: opt.shortHint,
    })),
    matchesFilter: (course, filterId) =>
      courseMatchesHsc28BusinessFilter(course, filterId as Hsc28BusinessFilterId),
  },

  'hsc-28-bei': {
    key: 'hsc-28-bei',
    defaultSlug: 'hsc-28-bei',
    defaultTitle: 'HSC 28 BEI কোর্স',
    defaultSubtitle: 'বাংলা, ইংরেজি ও ICT কম্বাইন ও একক বিষয় প্রোগ্রাম',
    ariaLabel: 'HSC 28 BEI কোর্স ফিল্টার',
    groupAriaLabel: 'HSC 28 BEI কোর্সের ধরন ও বিষয় ফিল্টার',
    options: [
      {
        id: 'bundle',
        label: 'বান্ডেল',
        group: 'primary',
        iconKey: 'bundle',
        shortHint: 'বাংলা, ইংরেজি ও ICT কম্বাইন প্যাকেজ',
      },
      {
        id: 'specific',
        label: 'নির্দিষ্ট',
        group: 'primary',
        iconKey: 'specific',
        shortHint: 'একক বিষয় বা নির্দিষ্ট অধ্যায়ভিত্তিক কোর্স',
      },
      {
        id: 'bangla',
        label: 'বাংলা',
        group: 'secondary',
        iconKey: 'bangla',
        shortHint: 'বাংলা ১ম ও ২য় পত্র',
      },
      {
        id: 'english',
        label: 'ইংরেজি',
        group: 'secondary',
        iconKey: 'english',
        shortHint: 'ইংরেজি ১ম ও ২য় পত্র',
      },
      {
        id: 'ict',
        label: 'ICT',
        group: 'secondary',
        iconKey: 'ict',
        shortHint: 'তথ্য ও যোগাযোগ প্রযুক্তি',
      },
    ],
    matchesFilter: (course, filterId) => {
      const text = getCourseIdentityText(course);
      switch (filterId) {
        case 'bundle':
          return isBeiBundleCourse(text);
        case 'specific':
          return !isBeiBundleCourse(text);
        case 'bangla':
          return hasBangla(text);
        case 'english':
          return hasEnglish(text);
        case 'ict':
          return hasIct(text);
        default:
          return true;
      }
    },
  },

  'ssc-27': {
    key: 'ssc-27',
    defaultSlug: 'ssc-27',
    defaultTitle: '১০ম শ্রেণি (SSC 27)',
    defaultSubtitle: 'SSC ২০২৭ প্রস্তুতি ও বোর্ড পরীক্ষার পূর্ণাঙ্গ রিভিশন প্রোগ্রাম',
    ariaLabel: '১০ম শ্রেণি (SSC 27) কোর্স ফিল্টার',
    groupAriaLabel: '১০ম শ্রেণি (SSC 27) বিভাগ ও প্রস্তুতি ফিল্টার',
    options: [
      {
        id: 'science',
        label: 'বিজ্ঞান বিভাগ',
        group: 'primary',
        iconKey: 'science',
        shortHint: 'SSC বিজ্ঞান বিভাগের কোর্সসমূহ',
      },
      {
        id: 'humanities',
        label: 'মানবিক বিভাগ',
        group: 'primary',
        iconKey: 'humanities',
        shortHint: 'SSC মানবিক বিভাগের কোর্সসমূহ',
      },
      {
        id: 'business',
        label: 'ব্যবসায় শিক্ষা',
        group: 'primary',
        iconKey: 'business',
        shortHint: 'SSC ব্যবসায় শিক্ষা বিভাগের কোর্সসমূহ',
      },
      {
        id: 'bei',
        label: 'BEI',
        group: 'primary',
        iconKey: 'bei',
        shortHint: 'বাংলা, ইংরেজি ও ICT কোর্সসমূহ',
      },
      {
        id: 'full-year',
        label: 'সম্পূর্ণ বছর',
        group: 'secondary',
        iconKey: 'full-year',
        shortHint: 'সারা বছরের পূর্ণাঙ্গ অনলাইন ব্যাচ',
      },
      {
        id: 'board-exam',
        label: 'বোর্ড পরীক্ষা প্রস্তুতি',
        group: 'secondary',
        iconKey: 'board-exam',
        shortHint: 'বোর্ড পরীক্ষা ও টেস্ট পেপার প্রস্তুতি',
      },
      {
        id: 'smp',
        label: 'SMP',
        group: 'secondary',
        iconKey: 'smp',
        shortHint: 'শেষ মুহূর্তের প্রস্তুতি কোর্স (SMP)',
      },
    ],
    matchesFilter: (course, filterId) => {
      const meta = getCoursePrimaryMetaText(course);
      switch (filterId) {
        case 'science':
          return resolveCourseDepartments(course).includes('science');
        case 'humanities':
          return resolveCourseDepartments(course).includes('humanities');
        case 'business':
          return resolveCourseDepartments(course).includes('business');
        case 'bei':
          return hasBeiCombo(meta);
        case 'full-year':
          return isFullYearSscCourseText(meta);
        case 'board-exam':
          return isBoardExamCourseText(meta);
        case 'smp':
          return isSmpCourseText(meta);
        default:
          return true;
      }
    },
  },

  'ssc-29': {
    key: 'ssc-29',
    defaultSlug: 'class-9',
    defaultTitle: '৯ম শ্রেণি ( SSC 29 )',
    defaultSubtitle: 'SSC ২০২৯ প্রস্তুতি ও বোর্ড পরীক্ষার ১০০% রিভিশন প্রোগ্রাম',
    ariaLabel: '৯ম শ্রেণি (SSC 29) কোর্স ফিল্টার',
    groupAriaLabel: '৯ম শ্রেণি (SSC 29) বিভাগ ও প্রস্তুতি ফিল্টার',
    options: [
      {
        id: 'science',
        label: 'বিজ্ঞান বিভাগ',
        group: 'primary',
        iconKey: 'science',
        shortHint: 'SSC বিজ্ঞান বিভাগের কোর্সসমূহ',
      },
      {
        id: 'humanities',
        label: 'মানবিক বিভাগ',
        group: 'primary',
        iconKey: 'humanities',
        shortHint: 'SSC মানবিক বিভাগের কোর্সসমূহ',
      },
      {
        id: 'business',
        label: 'ব্যবসায় শিক্ষা',
        group: 'primary',
        iconKey: 'business',
        shortHint: 'SSC ব্যবসায় শিক্ষা বিভাগের কোর্সসমূহ',
      },
      {
        id: 'bei',
        label: 'BEI',
        group: 'primary',
        iconKey: 'bei',
        shortHint: 'বাংলা, ইংরেজি ও ICT কোর্সসমূহ',
      },
      {
        id: 'full-year',
        label: 'সম্পূর্ণ বছর',
        group: 'secondary',
        iconKey: 'full-year',
        shortHint: 'সারা বছরের পূর্ণাঙ্গ অনলাইন ব্যাচ',
      },
      {
        id: 'board-exam',
        label: 'বোর্ড পরীক্ষা প্রস্তুতি',
        group: 'secondary',
        iconKey: 'board-exam',
        shortHint: 'বোর্ড পরীক্ষা ও টেস্ট পেপার প্রস্তুতি',
      },
      {
        id: 'smp',
        label: 'SMP',
        group: 'secondary',
        iconKey: 'smp',
        shortHint: 'শেষ মুহূর্তের প্রস্তুতি কোর্স (SMP)',
      },
    ],
    matchesFilter: (course, filterId) => {
      const meta = getCoursePrimaryMetaText(course);
      switch (filterId) {
        case 'science':
          return resolveCourseDepartments(course).includes('science');
        case 'humanities':
          return resolveCourseDepartments(course).includes('humanities');
        case 'business':
          return resolveCourseDepartments(course).includes('business');
        case 'bei':
          return hasBeiCombo(meta);
        case 'full-year':
          return isFullYearSscCourseText(meta);
        case 'board-exam':
          return isBoardExamCourseText(meta);
        case 'smp':
          return isSmpCourseText(meta);
        default:
          return true;
      }
    },
  },

  'ssc-28': {
    key: 'ssc-28',
    defaultSlug: 'ssc-28',
    defaultTitle: '৯ম শ্রেণি (SSC 28)',
    defaultSubtitle: '৯ম শ্রেণি ও SSC ২০২৮ ফাউন্ডেশন ও একাডেমিক অনলাইন প্রোগ্রাম',
    ariaLabel: '৯ম শ্রেণি (SSC 28) কোর্স ফিল্টার',
    groupAriaLabel: '৯ম শ্রেণি (SSC 28) বিভাগ ও কোর্সের ধরন ফিল্টার',
    options: [
      {
        id: 'science',
        label: 'বিজ্ঞান বিভাগ',
        group: 'primary',
        iconKey: 'science',
        shortHint: 'বিজ্ঞান বিভাগের কোর্সসমূহ',
      },
      {
        id: 'humanities',
        label: 'মানবিক বিভাগ',
        group: 'primary',
        iconKey: 'humanities',
        shortHint: 'মানবিক বিভাগের কোর্সসমূহ',
      },
      {
        id: 'business',
        label: 'ব্যবসায় শিক্ষা',
        group: 'primary',
        iconKey: 'business',
        shortHint: 'ব্যবসায় শিক্ষা বিভাগের কোর্সসমূহ',
      },
      {
        id: 'bei',
        label: 'BEI',
        group: 'primary',
        iconKey: 'bei',
        shortHint: 'বাংলা, ইংরেজি ও ICT কোর্সসমূহ',
      },
      {
        id: 'specific',
        label: 'নির্দিষ্ট',
        group: 'secondary',
        iconKey: 'specific',
        shortHint: 'একক বিষয় বা নির্দিষ্ট কোর্সসমূহ',
      },
      {
        id: 'full-year',
        label: 'সম্পূর্ণ বছর',
        group: 'secondary',
        iconKey: 'full-year',
        shortHint: 'সারা বছরের পূর্ণাঙ্গ অনলাইন ব্যাচ',
      },
      {
        id: 'annual-exam',
        label: 'বার্ষিক পরীক্ষা',
        group: 'secondary',
        iconKey: 'annual-exam',
        shortHint: 'বার্ষিক পরীক্ষা প্রস্তুতি কোর্স',
      },
      {
        id: 'recorded',
        label: 'রেকর্ডেড কোর্স',
        group: 'secondary',
        iconKey: 'recorded',
        shortHint: 'রেকর্ডেড ক্লাস ও আর্কাইভ কোর্স',
      },
    ],
    matchesFilter: (course, filterId) => {
      const meta = getCoursePrimaryMetaText(course);
      switch (filterId) {
        case 'science':
          return resolveCourseDepartments(course).includes('science');
        case 'humanities':
          return resolveCourseDepartments(course).includes('humanities');
        case 'business':
          return resolveCourseDepartments(course).includes('business');
        case 'bei':
          return hasBeiCombo(meta);
        case 'specific':
          return isSpecificSscCourseText(meta);
        case 'full-year':
          return isFullYearSscCourseText(meta);
        case 'annual-exam':
          return isAnnualExamCourseText(meta);
        case 'recorded':
          return isRecordedCourseText(meta);
        default:
          return true;
      }
    },
  },

  'hsc-27-science': {
    key: 'hsc-27-science',
    defaultSlug: 'hsc-27-science',
    defaultTitle: 'HSC 27 বিজ্ঞান কোর্স',
    defaultSubtitle:
      'কলেজ একাডেমিক প্রোগ্রাম — HSC 27 বিজ্ঞান বিভাগের পূর্ণাঙ্গ ও অধ্যায়ভিত্তিক অনলাইন প্রস্তুতি',
    ariaLabel: 'HSC 27 বিজ্ঞান কোর্স ফিল্টার',
    groupAriaLabel: 'HSC 27 বিজ্ঞান কোর্সের ধরন ও বিষয় ফিল্টার',
    options: HSC28_ALL_FILTERS.map((opt) => ({
      id: opt.id,
      label: opt.label,
      group: opt.group === 'type' ? 'primary' : 'secondary',
      iconKey: opt.id as CategoryFilterIconKey,
      shortHint: opt.shortHint,
    })),
    matchesFilter: (course, filterId) =>
      courseMatchesHsc28ScienceFilter(course, filterId as Hsc28ScienceFilterId),
  },

  'hsc-27-humanities': {
    key: 'hsc-27-humanities',
    defaultSlug: 'hsc-27-hum',
    defaultTitle: 'HSC 27 মানবিক কোর্স',
    defaultSubtitle:
      'কলেজ একাডেমিক প্রোগ্রাম — HSC 27 মানবিক বিভাগের সম্পূর্ণ ও বিষয়ভিত্তিক অনলাইন কোর্স',
    ariaLabel: 'HSC 27 মানবিক কোর্স ফিল্টার',
    groupAriaLabel: 'HSC 27 মানবিক কোর্সের ধরন ও বিষয় ফিল্টার',
    options: HSC28_HUMANITIES_ALL_FILTERS.map((opt) => ({
      id: opt.id,
      label: opt.label,
      group: opt.group === 'type' ? 'primary' : 'secondary',
      iconKey: opt.id as CategoryFilterIconKey,
      shortHint: opt.shortHint,
    })),
    matchesFilter: (course, filterId) =>
      courseMatchesHsc28HumanitiesFilter(course, filterId as Hsc28HumanitiesFilterId),
  },

  'hsc-27-business': {
    key: 'hsc-27-business',
    defaultSlug: 'hsc-27-buss',
    defaultTitle: 'HSC 27 ব্যবসায় শিক্ষা',
    defaultSubtitle:
      'কলেজ একাডেমিক প্রোগ্রাম — HSC 27 ব্যবসায় শিক্ষা বিভাগের সম্পূর্ণ ও বিষয়ভিত্তিক অনলাইন কোর্স',
    ariaLabel: 'HSC 27 ব্যবসায় শিক্ষা কোর্স ফিল্টার',
    groupAriaLabel: 'HSC 27 ব্যবসায় শিক্ষা কোর্সের ধরন ও বিষয় ফিল্টার',
    options: HSC28_BUSINESS_ALL_FILTERS.map((opt) => ({
      id: opt.id,
      label: opt.label,
      group: opt.group === 'type' ? 'primary' : 'secondary',
      iconKey: opt.id as CategoryFilterIconKey,
      shortHint: opt.shortHint,
    })),
    matchesFilter: (course, filterId) =>
      courseMatchesHsc28BusinessFilter(course, filterId as Hsc28BusinessFilterId),
  },

  'hsc-27-bei': {
    key: 'hsc-27-bei',
    defaultSlug: 'hsc-27-bei',
    defaultTitle: 'HSC 27 BEI কোর্স',
    defaultSubtitle: 'বাংলা, ইংরেজি ও ICT কম্বাইন ও একক বিষয় প্রোগ্রাম (HSC 27)',
    ariaLabel: 'HSC 27 BEI কোর্স ফিল্টার',
    groupAriaLabel: 'HSC 27 BEI কোর্সের ধরন ও বিষয় ফিল্টার',
    options: [
      {
        id: 'bundle',
        label: 'বান্ডেল',
        group: 'primary',
        iconKey: 'bundle',
        shortHint: 'বাংলা, ইংরেজি ও ICT কম্বাইন প্যাকেজ',
      },
      {
        id: 'specific',
        label: 'নির্দিষ্ট',
        group: 'primary',
        iconKey: 'specific',
        shortHint: 'একক বিষয় বা নির্দিষ্ট অধ্যায়ভিত্তিক কোর্স',
      },
      {
        id: 'bangla',
        label: 'বাংলা',
        group: 'secondary',
        iconKey: 'bangla',
        shortHint: 'বাংলা ১ম ও ২য় পত্র',
      },
      {
        id: 'english',
        label: 'ইংরেজি',
        group: 'secondary',
        iconKey: 'english',
        shortHint: 'ইংরেজি ১ম ও ২য় পত্র',
      },
      {
        id: 'ict',
        label: 'ICT',
        group: 'secondary',
        iconKey: 'ict',
        shortHint: 'তথ্য ও যোগাযোগ প্রযুক্তি',
      },
    ],
    matchesFilter: (course, filterId) => {
      const text = getCourseIdentityText(course);
      switch (filterId) {
        case 'bundle':
          return isBeiBundleCourse(text);
        case 'specific':
          return !isBeiBundleCourse(text);
        case 'bangla':
          return hasBangla(text);
        case 'english':
          return hasEnglish(text);
        case 'ict':
          return hasIct(text);
        default:
          return true;
      }
    },
  },

  'hsc-27-smp': {
    key: 'hsc-27-smp',
    defaultSlug: 'hsc-27',
    defaultTitle: 'HSC 27 শেষ মুহূর্তের প্রস্তুতি',
    defaultSubtitle:
      'HSC ২০২৭ বোর্ড পরীক্ষার শেষ মুহূর্তের পূর্ণাঙ্গ রিভিশন, মডেল টেস্ট ও বান্ডেল প্রোগ্রাম',
    ariaLabel: 'HSC 27 শেষ মুহূর্তের প্রস্তুতি ফিল্টার',
    groupAriaLabel: 'HSC 27 শেষ মুহূর্তের প্রস্তুতি বিভাগ ও বিষয় ফিল্টার',
    options: [
      {
        id: 'science',
        label: 'বিজ্ঞান বিভাগ',
        group: 'primary',
        iconKey: 'science',
        shortHint: 'বিজ্ঞান বিভাগের শেষ মুহূর্তের প্রস্তুতি',
      },
      {
        id: 'humanities',
        label: 'মানবিক বিভাগ',
        group: 'primary',
        iconKey: 'humanities',
        shortHint: 'মানবিক বিভাগের শেষ মুহূর্তের প্রস্তুতি',
      },
      {
        id: 'business',
        label: 'ব্যবসায় শিক্ষা',
        group: 'primary',
        iconKey: 'business',
        shortHint: 'ব্যবসায় শিক্ষা বিভাগের শেষ মুহূর্তের প্রস্তুতি',
      },
      {
        id: 'bei',
        label: 'BEI',
        group: 'primary',
        iconKey: 'bei',
        shortHint: 'বাংলা, ইংরেজি ও ICT কম্বাইন প্রস্তুতি',
      },
      {
        id: 'bundle',
        label: 'বান্ডেল',
        group: 'secondary',
        iconKey: 'bundle',
        shortHint: 'বিভাগভিত্তিক ও একাধিক বিষয়ের ফুল বান্ডেল',
      },
      {
        id: 'specific',
        label: 'নির্দিষ্ট',
        group: 'secondary',
        iconKey: 'specific',
        shortHint: 'একক বিষয় বা নির্দিষ্ট প্রস্তুতি কোর্স',
      },
      {
        id: 'bangla',
        label: 'বাংলা',
        group: 'secondary',
        iconKey: 'bangla',
        shortHint: 'বাংলা ১ম ও ২য় পত্র প্রস্তুতি',
      },
      {
        id: 'english',
        label: 'ইংরেজি',
        group: 'secondary',
        iconKey: 'english',
        shortHint: 'ইংরেজি ১ম ও ২য় পত্র প্রস্তুতি',
      },
      {
        id: 'ict',
        label: 'ICT',
        group: 'secondary',
        iconKey: 'ict',
        shortHint: 'তথ্য ও যোগাযোগ প্রযুক্তি প্রস্তুতি',
      },
    ],
    matchesFilter: (course, filterId) => {
      const identityText = getCourseIdentityText(course);
      const isBundle =
        includesNormalizedAny(identityText, [
          'বান্ডেল',
          'কমপ্লিট প্যাকেজ',
          'ফুল কোর্স',
          'কম্বো',
        ]) ||
        /\b(?:bundle|combo|full course|bei)\b/i.test(identityText) ||
        [
          hasBangla(identityText),
          hasEnglish(identityText),
          hasIct(identityText),
        ].filter(Boolean).length >= 2;

      switch (filterId) {
        case 'science':
          return resolveCourseDepartments(course).includes('science');
        case 'humanities':
          return resolveCourseDepartments(course).includes('humanities');
        case 'business':
          return resolveCourseDepartments(course).includes('business');
        case 'bei':
          return hasBeiCombo(identityText);
        case 'bundle':
          return isBundle;
        case 'specific':
          return !isBundle;
        case 'bangla':
          return hasBangla(identityText);
        case 'english':
          return hasEnglish(identityText);
        case 'ict':
          return hasIct(identityText);
        default:
          return true;
      }
    },
  },
};

export function getCategoryFilterCounts(
  config: CategoryFilterConfig,
  courses: Course[]
): Record<string, number> {
  const counts: Record<string, number> = {
    all: courses.length,
  };
  for (const option of config.options) {
    counts[option.id] = courses.filter((course) =>
      config.matchesFilter(course, option.id)
    ).length;
  }
  return counts;
}

export function filterCoursesByConfig(
  config: CategoryFilterConfig,
  courses: Course[],
  selectedFilter: string
): Course[] {
  if (!selectedFilter || selectedFilter === 'all') {
    return courses;
  }
  return courses.filter((course) => config.matchesFilter(course, selectedFilter));
}

export function resolveFilteredCategoryKey(
  categorySlug: string,
  categoryName?: string
): FilteredCategoryKey | null {
  const slugVariants: ReadonlyArray<{ key: FilteredCategoryKey; slugs: string[] }> = [
    {
      key: 'hsc-28-humanities',
      slugs: [
        'hsc-28-huma',
        'hsc-28-মানবিক-কোর্স',
        'hsc-28-মানবিক',
        'hsc-28-humanities',
        'hsc-28-arts',
      ],
    },
    {
      key: 'hsc-28-business',
      slugs: [
        'hsc-28-buss',
        'hsc-28-ব্যবসায়-শিক্ষা',
        'hsc-28-ব্যবসায়-শিক্ষা',
        'hsc-28-business',
        'hsc-28-commerce',
      ],
    },
    {
      key: 'hsc-28-bei',
      slugs: [
        'hsc-28-bei',
        'hsc-28-bei-কোর্স',
        'hsc-28-bei-course',
      ],
    },
    {
      key: 'hsc-27-science',
      slugs: [
        'hsc-27-science',
        'hsc-27-science-course',
        'hsc-27-বিজ্ঞান-কোর্স',
        'hsc-27-বিজ্ঞান',
      ],
    },
    {
      key: 'hsc-27-humanities',
      slugs: [
        'hsc-27-hum',
        'hsc-27-huma',
        'hsc-27-humanities',
        'hsc-27-arts',
        'hsc-27-মানবিক-কোর্স',
        'hsc-27-মানবিক',
      ],
    },
    {
      key: 'hsc-27-business',
      slugs: [
        'hsc-27-buss',
        'hsc-27-business',
        'hsc-27-commerce',
        'hsc-27-ব্যবসায়-শিক্ষা',
        'hsc-27-ব্যবসায়-শিক্ষা',
      ],
    },
    {
      key: 'hsc-27-bei',
      slugs: [
        'hsc-27-bei',
        'hsc-27-bei-কোর্স',
        'hsc-27-bei-course',
      ],
    },
    {
      key: 'hsc-27-smp',
      slugs: [
        'hsc-27',
        'hsc-27-smp',
        'hsc-27-শেষ-মুহূর্তের-প্রস্তুতি',
      ],
    },
    {
      key: 'ssc-27',
      slugs: [
        'ssc-27',
        'ssc-2027',
        'class-10',
        '১০ম-শ্রেণি',
        '১০ম-শ্রেণি-ssc-27',
        '১০ম-শ্রেণি-ssc27',
        '১০ম-শ্রেণি-ssc-28',
        '১০ম-শ্রেণি-ssc28',
        'class-10-ssc-27',
      ],
    },
    {
      key: 'ssc-29',
      slugs: [
        'ssc-29',
        'ssc-2029',
        'class-9',
        '৯ম-শ্রেণি',
        '৯ম-শ্রেণি-ssc-29',
        '৯ম-শ্রেণি-ssc29',
        'class-9-ssc-29',
        '৯ম-শ্রেণি-ssc-28',
        '৯ম-শ্রেণি-ssc28',
        'class-9-ssc-28',
      ],
    },
    {
      key: 'ssc-28',
      slugs: [
        'ssc-28',
        'ssc-2028',
      ],
    },
  ];

  for (const entry of slugVariants) {
    if (entry.slugs.some((s) => categorySlugsMatch(categorySlug, s))) {
      return entry.key;
    }
  }

  // Fallback for admin-customized slugs preserving category title identity
  const normalizedSlug = normalizeCategorySlugKey(categorySlug);
  const normalizedName = normalizeCategoryMatchText(categoryName || '');
  const combined = `${normalizedSlug} ${normalizedName}`;

  if (
    (normalizedSlug.includes('hsc-28') || normalizedName.includes('hsc 28')) &&
    includesNormalizedAny(combined, ['মানবিক', 'humanities', 'huma'])
  ) {
    return 'hsc-28-humanities';
  }
  if (
    (normalizedSlug.includes('hsc-28') || normalizedName.includes('hsc 28')) &&
    includesNormalizedAny(combined, ['ব্যবসায়', 'ব্যবসায়', 'business', 'commerce', 'buss'])
  ) {
    return 'hsc-28-business';
  }
  if (
    (normalizedSlug.includes('hsc-28') || normalizedName.includes('hsc 28')) &&
    /\bbei\b/i.test(combined)
  ) {
    return 'hsc-28-bei';
  }
  if (
    (normalizedSlug.includes('hsc-27') || normalizedName.includes('hsc 27')) &&
    includesNormalizedAny(combined, ['বিজ্ঞান', 'science'])
  ) {
    return 'hsc-27-science';
  }
  if (
    (normalizedSlug.includes('hsc-27') || normalizedName.includes('hsc 27')) &&
    includesNormalizedAny(combined, ['মানবিক', 'humanities', 'hum'])
  ) {
    return 'hsc-27-humanities';
  }
  if (
    (normalizedSlug.includes('hsc-27') || normalizedName.includes('hsc 27')) &&
    includesNormalizedAny(combined, ['ব্যবসায়', 'ব্যবসায়', 'business', 'commerce', 'buss'])
  ) {
    return 'hsc-27-business';
  }
  if (
    (normalizedSlug.includes('hsc-27') || normalizedName.includes('hsc 27')) &&
    /\bbei\b/i.test(combined)
  ) {
    return 'hsc-27-bei';
  }
  if (
    (normalizedSlug.includes('hsc-27') || normalizedName.includes('hsc 27')) &&
    (includesNormalizedAny(combined, ['শেষ মুহূর্ত', 'শেষ মুহুর্ত', 'last moment']) ||
      /\bsmp\b/i.test(combined))
  ) {
    return 'hsc-27-smp';
  }
  if (
    !combined.includes('hsc') &&
    includesNormalizedAny(combined, ['ssc 27', 'ssc-27', 'ssc 2027', '১০ম শ্রেণি', 'দশম শ্রেণি'])
  ) {
    return 'ssc-27';
  }
  if (
    !combined.includes('hsc') &&
    includesNormalizedAny(combined, [
      'ssc 29',
      'ssc-29',
      'ssc 2029',
      'ssc ২৯',
      'ssc ২০২৯',
      '৯ম শ্রেণি',
      'নবম শ্রেণি',
      'class 9',
      'class-9',
    ])
  ) {
    return 'ssc-29';
  }
  if (
    !combined.includes('hsc') &&
    includesNormalizedAny(combined, ['ssc 28', 'ssc-28', 'ssc 2028'])
  ) {
    return 'ssc-28';
  }

  return null;
}
