import { Course } from '../types.ts';

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

export function getCourseSearchHaystack(course: Course): string {
  return normalizeCategoryMatchText(
    `${course.title} ${course.slug} ${course.headerTitle} ${course.headerSubtitle} ${course.targetStudents || ''} ${course.description}`
  );
}

/**
 * Matches courses assigned directly to `class-5`..`class-8` categories
 * OR legacy `school` category courses whose metadata targets that class.
 */
export function courseMatchesClass(course: Course, classNum: JuniorClassNumber): boolean {
  const dedicatedSlug = `class-${classNum}`;
  if (course.categorySlug === dedicatedSlug) {
    return true;
  }
  if (course.categorySlug !== 'school') {
    return false;
  }
  const haystack = getCourseSearchHaystack(course);
  return CLASS_KEYWORDS[classNum].some((kw) =>
    haystack.includes(normalizeCategoryMatchText(kw))
  );
}

/**
 * Unified dynamic category-to-course matcher used across public pages,
 * REST APIs, and SEO structured data.
 */
export function courseMatchesCategorySlug(course: Course, categorySlug: string): boolean {
  const slug = (categorySlug || '').trim().toLowerCase();
  if (!slug) return false;

  if (slug === 'class-5') return courseMatchesClass(course, 5);
  if (slug === 'class-6') return courseMatchesClass(course, 6);
  if (slug === 'class-7') return courseMatchesClass(course, 7);
  if (slug === 'class-8') return courseMatchesClass(course, 8);

  if (slug === 'free-course' || slug === 'free') {
    return course.categorySlug === 'free-course' || course.discountPrice === 0;
  }

  if (slug === 'language-learning') {
    if (course.categorySlug === 'language-learning') return true;
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
    if (course.categorySlug === 'books') return true;
    const text = normalizeCategoryMatchText(
      `${course.title} ${course.slug} ${course.description}`
    );
    return text.includes('বুক') || text.includes('বই') || text.includes('নোট');
  }

  return course.categorySlug === slug;
}
