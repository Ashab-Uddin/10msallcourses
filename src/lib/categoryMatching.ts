import { Course, CourseGroupKey } from '../types.ts';
import {
  extractExplicitTargetGroupsFromText,
  extractMatchedBatchKeywords,
  normalizeTargetBatchId,
  normalizeTargetGroups,
} from './courseValidation.ts';

export type JuniorClassNumber = 5 | 6 | 7 | 8;

const CLASS_KEYWORDS: Record<JuniorClassNumber, string[]> = {
  5: ['৫ম', 'পঞ্চম', 'class 5', 'class-5', 'class5'],
  6: ['৬ষ্ঠ', 'ষষ্ঠ', 'class 6', 'class-6', 'class6'],
  7: ['৭ম', 'সপ্তম', 'class 7', 'class-7', 'class7'],
  8: ['৮ম', 'অষ্টম', 'class 8', 'class-8', 'class8'],
};

export const CLASS_BENGALI_ORDINALS: Record<number, string> = {
  5: '৫ম',
  6: '৬ষ্ঠ',
  7: '৭ম',
  8: '৮ম',
  9: '৯ম',
  10: '১০ম',
};

export function normalizeCategoryMatchText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/য\u09BC/g, 'য়')
    .replace(/ড\u09BC/g, 'ড়')
    .replace(/ঢ\u09BC/g, 'ঢ়')
    .toLowerCase();
}

function matchesAnyNormalizedKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

export function getCourseSearchHaystack(course: Course): string {
  return normalizeCategoryMatchText(
    `${course.title} ${course.slug} ${course.headerTitle} ${course.headerSubtitle} ${course.targetStudents || ''} ${course.description}`
  );
}

/**
 * Authoritative Target Batch resolver.
 * Priority:
 *  1) Structured `course.targetBatch`
 *  2) Explicit batch keyword inside `course.targetStudents`
 *  3) Legacy fallback on `course.title` and `course.slug` ONLY (NEVER `course.description`)
 */
export function resolveCourseTargetBatch(course: Course): string | null {
  const fromField = normalizeTargetBatchId(course.targetBatch);
  if (fromField) return fromField;

  const fromTargetStudents = extractMatchedBatchKeywords(course.targetStudents || '');
  if (fromTargetStudents.length > 0) {
    return fromTargetStudents[0].id;
  }

  const fromTitleOrSlug = extractMatchedBatchKeywords(
    `${course.title || ''} ${course.slug || ''}`
  );
  if (fromTitleOrSlug.length > 0) {
    return fromTitleOrSlug[0].id;
  }

  return null;
}

/**
 * Authoritative Target Group / Department resolver.
 * Priority:
 *  1) Structured `course.targetGroups`
 *  2) Explicit group keywords in `course.targetStudents` (stops immediately; never leaks to other groups)
 *  3) Legacy fallback on `course.title`, `course.slug`, `course.headerSubtitle` (NEVER `course.description`)
 */
export function resolveCourseDepartments(course: Course): CourseGroupKey[] {
  const fromField = normalizeTargetGroups(course.targetGroups);
  if (fromField.length > 0) {
    return fromField;
  }

  const fromTargetStudents = extractExplicitTargetGroupsFromText(course.targetStudents || '');
  if (fromTargetStudents.length > 0) {
    return fromTargetStudents;
  }

  // Legacy untagged courses only: infer strictly from title/slug/headerSubtitle (never marketing description)
  const text = normalizeCategoryMatchText(
    `${course.title} ${course.slug} ${course.headerSubtitle || ''}`
  );

  if (matchesAnyNormalizedKeyword(text, ['সকল বিভাগ', 'all department', 'all group'])) {
    return ['science', 'business', 'humanities'];
  }

  const isBusiness = matchesAnyNormalizedKeyword(text, [
    'ব্যবসায়',
    'ব্যবসা',
    'ব্যাবসা',
    'বাণিজ্য',
    'কমার্শ',
    'কমার্স',
    'commerce',
    'business',
    'হিসাববিজ্ঞান',
    'একাউন্টিং',
    'অ্যাকাউন্টিং',
    'accounting',
    'ফিন্যান্স',
    'ফাইন্যান্স',
    'finance',
    'ব্যবস্থাপনা',
    'ম্যানেজমেন্ট',
    'management',
    'মার্কেটিং',
    'marketing',
    'c-unit',
    'c unit',
    'গ’ ইউনিট',
    'গ ইউনিট',
    'iba',
  ]);

  const isHumanities = matchesAnyNormalizedKeyword(text, [
    'মানবিক',
    'আর্টস',
    'humanities',
    'arts',
    'ইতিহাস',
    'history',
    'পৌরনীতি',
    'সিভিক্স',
    'civics',
    'ভূগোল',
    'জিওগ্রাফি',
    'geography',
    'অর্থনীতি',
    'ইকোনমিক্স',
    'economics',
    'সমাজবিজ্ঞান',
    'sociology',
    'যুক্তিবিদ্যা',
    'logic',
    'b-unit',
    'b unit',
    'খ’ ইউনিট',
    'খ ইউনিট',
    'd-unit',
    'd unit',
    'ঘ’ ইউনিট',
    'ঘ ইউনিট',
  ]);

  const isScience = matchesAnyNormalizedKeyword(text, [
    'বিজ্ঞান',
    'সায়েন্স',
    'science',
    'pcmb',
    'physics',
    'ফিজিক্স',
    'chem',
    'chemistry',
    'কেমিস্ট্রি',
    'biology',
    'বায়োলজি',
    'math',
    'ম্যাথ',
    'mathematics',
    'পদার্থ',
    'রসায়ন',
    'জীববিজ্ঞান',
    'গণিত',
    'উচ্চতর গণিত',
    'a-unit',
    'a unit',
    'ক’ ইউনিট',
    'ক ইউনিট',
    'ইঞ্জিনিয়ারিং',
    'engineering',
    'বুয়েট',
    'buet',
    'মেডিকেল',
    'medical',
    'ভার্সিটি ‘ক’',
  ]);

  const depts: CourseGroupKey[] = [];
  if (isScience) depts.push('science');
  if (isBusiness) depts.push('business');
  if (isHumanities) depts.push('humanities');

  if (depts.length > 0) {
    return depts;
  }

  return ['science', 'business', 'humanities'];
}

export function getCourseCategorySlugs(
  course: Pick<Course, 'categorySlug' | 'categorySlugs'>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const pushSlug = (raw: unknown) => {
    const norm = String(raw || '').trim().toLowerCase();
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    result.push(norm);
  };

  pushSlug(course.categorySlug);
  if (Array.isArray(course.categorySlugs)) {
    for (const s of course.categorySlugs) {
      pushSlug(s);
    }
  }
  return result;
}

export function courseHasAssignedCategorySlug(
  course: Pick<Course, 'categorySlug' | 'categorySlugs'>,
  targetSlug: string
): boolean {
  const cleanTarget = String(targetSlug || '').trim().toLowerCase();
  if (!cleanTarget) return false;
  const assigned = getCourseCategorySlugs(course);
  if (assigned.includes(cleanTarget)) return true;
  if (cleanTarget === 'free-course' || cleanTarget === 'free') {
    return assigned.includes('free-course') || assigned.includes('free');
  }
  return false;
}

/**
 * Matches courses assigned directly to `class-5`..`class-8` categories
 * OR legacy `school` category courses whose target batch/title explicitly targets that class.
 */
export function courseMatchesClass(course: Course, classNum: JuniorClassNumber): boolean {
  const dedicatedSlug = `class-${classNum}`;
  const resolvedBatch = resolveCourseTargetBatch(course);

  if (courseHasAssignedCategorySlug(course, dedicatedSlug)) {
    return resolvedBatch === null || resolvedBatch === dedicatedSlug;
  }
  if (courseHasAssignedCategorySlug(course, 'free-course') && resolvedBatch === dedicatedSlug) {
    return true;
  }
  if (!courseHasAssignedCategorySlug(course, 'school')) {
    return false;
  }
  if (resolvedBatch !== null) {
    return resolvedBatch === dedicatedSlug;
  }

  const titleAndTarget = normalizeCategoryMatchText(
    `${course.title} ${course.slug} ${course.targetStudents || ''}`
  );
  return CLASS_KEYWORDS[classNum].some((kw) =>
    titleAndTarget.includes(normalizeCategoryMatchText(kw))
  );
}

/**
 * Exact Academic Batch / Class matcher used across AcademicPage, CategoryPage,
 * REST APIs, and SEO structured data. Prevents cross-batch leakage.
 */
export function courseMatchesAcademicBatch(course: Course, targetBatchOrClass: string): boolean {
  const normalizedTarget =
    normalizeTargetBatchId(targetBatchOrClass) || targetBatchOrClass.trim().toLowerCase();
  const resolvedBatch = resolveCourseTargetBatch(course);
  const assignedSlugs = getCourseCategorySlugs(course);
  const metaHaystack = normalizeCategoryMatchText(
    `${course.title} ${course.slug} ${course.headerTitle} ${course.headerSubtitle} ${course.targetStudents || ''}`
  );

  if (normalizedTarget === 'hsc-26') {
    const inHscOrAdmission =
      assignedSlugs.includes('hsc') ||
      assignedSlugs.includes('admission') ||
      assignedSlugs.some((s) => s === 'hsc-26' || s.startsWith('hsc-26-'));
    if (!inHscOrAdmission) {
      return false;
    }
    // If a course belongs to a specific other batch (e.g. HSC 27 or HSC 28), strictly exclude it!
    if (resolvedBatch !== null) {
      return resolvedBatch === 'hsc-26';
    }
    if (assignedSlugs.includes('admission')) {
      return true;
    }
    return matchesAnyNormalizedKeyword(metaHaystack, [
      'hsc 26',
      'hsc26',
      'hsc-26',
      'hsc 2026',
      'hsc-2026',
      'hsc ২৬',
      'hsc ২০২৬',
      'এইচএসসি ২৬',
      'এইচএসসি ২০২৬',
      'varsity',
      'ভার্সিটি',
      'গুচ্ছ',
      'gst',
      'admission',
      'এডমিশন',
      'ভর্তি',
      'মেডিকেল',
      'medical',
      'বুয়েট',
      'buet',
      'ইঞ্জিনিয়ারিং',
      'engineering',
    ]);
  }

  if (normalizedTarget === 'hsc-27') {
    const inHsc27Scope =
      assignedSlugs.includes('hsc') ||
      assignedSlugs.some((s) => s === 'hsc-27' || s.startsWith('hsc-27-'));
    if (!inHsc27Scope) return false;
    if (resolvedBatch !== null) {
      return resolvedBatch === 'hsc-27';
    }
    return matchesAnyNormalizedKeyword(metaHaystack, [
      '২য় বর্ষ',
      'দ্বিতীয় বর্ষ',
      '2nd year',
    ]);
  }

  if (normalizedTarget === 'hsc-28') {
    const inHsc28Scope =
      assignedSlugs.includes('hsc') ||
      assignedSlugs.some((s) => s === 'hsc-28' || s.startsWith('hsc-28-'));
    if (!inHsc28Scope) return false;
    if (resolvedBatch !== null) {
      return resolvedBatch === 'hsc-28';
    }
    return matchesAnyNormalizedKeyword(metaHaystack, [
      '১ম বর্ষ',
      'প্রথম বর্ষ',
      '1st year',
    ]);
  }

  if (normalizedTarget === 'ssc-2027') {
    if (!assignedSlugs.includes('school')) return false;
    if (resolvedBatch !== null) {
      return resolvedBatch === 'ssc-2027';
    }
    return matchesAnyNormalizedKeyword(metaHaystack, [
      'ssc 27',
      'ssc27',
      'ssc-27',
      'ssc 2027',
      'ssc-2027',
      'ssc ২৭',
      'ssc ২০২৭',
      'এসএসসি ২৭',
      'এসএসসি ২০২৭',
      '১০ম',
      'দশম',
      'class 10',
      'class-10',
    ]);
  }

  if (normalizedTarget === 'ssc-2028') {
    if (!assignedSlugs.includes('school')) return false;
    if (resolvedBatch !== null) {
      return resolvedBatch === 'ssc-2028';
    }
    return matchesAnyNormalizedKeyword(metaHaystack, [
      'ssc 28',
      'ssc28',
      'ssc-28',
      'ssc 2028',
      'ssc-2028',
      'ssc ২৮',
      'ssc ২০২৮',
      'এসএসসি ২৮',
      'এসএসসি ২০২৮',
      '৯ম',
      'নবম',
      'class 9',
      'class-9',
    ]);
  }

  if (normalizedTarget === 'class-5') return courseMatchesClass(course, 5);
  if (normalizedTarget === 'class-6') return courseMatchesClass(course, 6);
  if (normalizedTarget === 'class-7') return courseMatchesClass(course, 7);
  if (normalizedTarget === 'class-8') return courseMatchesClass(course, 8);

  return false;
}

/**
 * Unified dynamic category-to-course matcher used across public pages,
 * REST APIs, and SEO structured data.
 */
export function courseMatchesCategorySlug(course: Course, categorySlug: string): boolean {
  const slug = (categorySlug || '').trim().toLowerCase();
  if (!slug) return false;
  const assignedSlugs = getCourseCategorySlugs(course);

  if (slug === 'class-5') return courseMatchesClass(course, 5);
  if (slug === 'class-6') return courseMatchesClass(course, 6);
  if (slug === 'class-7') return courseMatchesClass(course, 7);
  if (slug === 'class-8') return courseMatchesClass(course, 8);

  if (slug === 'free-course' || slug === 'free') {
    return (
      assignedSlugs.includes('free-course') ||
      assignedSlugs.includes('free') ||
      course.discountPrice === 0
    );
  }

  if (slug === 'language-learning') {
    if (assignedSlugs.includes('language-learning')) return true;
    if (!assignedSlugs.includes('skills')) return false;
    const text = normalizeCategoryMatchText(
      `${course.title} ${course.slug} ${course.description}`
    );
    return (
      text.includes('english') ||
      text.includes('spoken') ||
      text.includes('ielts') ||
      text.includes('মুনজেরিন') ||
      text.includes('ভাষা')
    );
  }

  if (slug === 'books' || slug === 'book-store') {
    return assignedSlugs.includes('books');
  }

  return assignedSlugs.includes(slug);
}
