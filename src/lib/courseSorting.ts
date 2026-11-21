import type { Course } from '../types.ts';
import {
  courseMatchesCategorySlug,
  normalizeCategorySlugKey,
} from './categoryMatching.ts';

/**
 * Per-category ordered course ID lists:
 * `{ [normalizedCategorySlug]: [firstCourseId, secondCourseId, ...] }`
 *
 * Every category maintains its own independent ordering so moving a course inside
 * Category A never alters the display order of Category B.
 */
export type CategoryCourseOrdersMap = Record<string, number[]>;

export function normalizeCategorySortSlug(slug: string | null | undefined): string {
  const clean = normalizeCategorySlugKey(slug);
  if (!clean) return '';
  if (clean === 'free' || clean === 'free-courses') return 'free-course';
  return clean;
}

export function normalizeOrderedCourseIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const result: number[] = [];
  for (const item of raw) {
    const id = Number(item);
    if (Number.isInteger(id) && id > 0 && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

export function normalizeCategoryCourseOrders(raw: unknown): CategoryCourseOrdersMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const normalized: CategoryCourseOrdersMap = {};
  for (const [rawSlug, rawIds] of Object.entries(raw as Record<string, unknown>)) {
    const slug = normalizeCategorySortSlug(rawSlug);
    if (!slug) continue;
    const ids = normalizeOrderedCourseIds(rawIds);
    if (ids.length > 0) {
      normalized[slug] = ids;
    }
  }
  return normalized;
}

function compareFallbackCourseOrder(a: Course, b: Course): number {
  const aOrder = Number(a.displayOrder);
  const bOrder = Number(b.displayOrder);
  const aHasOrder = Number.isFinite(aOrder) && aOrder >= 1;
  const bHasOrder = Number.isFinite(bOrder) && bOrder >= 1;

  if (aHasOrder && bHasOrder && aOrder !== bOrder) {
    return aOrder - bOrder;
  }
  if (aHasOrder !== bHasOrder) {
    return aHasOrder ? -1 : 1;
  }

  const aTime = new Date(a.createdAt || 0).getTime() || 0;
  const bTime = new Date(b.createdAt || 0).getTime() || 0;
  if (bTime !== aTime) return bTime - aTime;
  return b.id - a.id;
}

/**
 * Deterministically sorts a list of courses for a specific category using the saved
 * category-wise position order first, falling back smoothly to `displayOrder` / recency
 * for newly created courses not yet manually positioned in that category.
 */
export function sortCoursesForCategory(
  courses: ReadonlyArray<Course>,
  categorySlug: string,
  categoryCourseOrders?: CategoryCourseOrdersMap | null
): Course[] {
  if (courses.length <= 1) {
    return [...courses];
  }

  const slug = normalizeCategorySortSlug(categorySlug);
  const savedIds = slug && categoryCourseOrders ? categoryCourseOrders[slug] : undefined;

  if (!Array.isArray(savedIds) || savedIds.length === 0) {
    return [...courses].sort(compareFallbackCourseOrder);
  }

  const rankMap = new Map<number, number>();
  savedIds.forEach((id, idx) => {
    if (!rankMap.has(id)) {
      rankMap.set(id, idx);
    }
  });

  return [...courses].sort((a, b) => {
    const rankA = rankMap.get(a.id);
    const rankB = rankMap.get(b.id);
    const hasA = rankA !== undefined;
    const hasB = rankB !== undefined;

    if (hasA && hasB && rankA !== rankB) {
      return rankA - rankB;
    }
    if (hasA !== hasB) {
      return hasA ? -1 : 1;
    }
    return compareFallbackCourseOrder(a, b);
  });
}

/**
 * Filters all courses belonging to `categorySlug` (via shared `courseMatchesCategorySlug`)
 * and returns them sorted in the exact order displayed on the Main Website.
 */
export function getCategoryCoursesForSorting(
  courses: ReadonlyArray<Course>,
  categorySlug: string,
  categoryCourseOrders?: CategoryCourseOrdersMap | null,
  options?: { includeInactive?: boolean }
): Course[] {
  const includeInactive = options?.includeInactive ?? true;
  const matched = courses.filter((course) => {
    if (!includeInactive && course.status === 'inactive') {
      return false;
    }
    return courseMatchesCategorySlug(course, categorySlug);
  });

  return sortCoursesForCategory(matched, categorySlug, categoryCourseOrders);
}

/**
 * Rebalances the global `displayOrder` slots occupied by primary courses of `categorySlug`
 * strictly among themselves in `orderedCourseIds` order.
 *
 * Courses belonging to any other category keep their exact `displayOrder` slots untouched,
 * guaranteeing zero duplicate positions and zero cross-category side effects.
 */
export function rebalancePrimaryCategoryDisplaySlots(
  allCourses: ReadonlyArray<Course>,
  categorySlug: string,
  orderedCourseIds: ReadonlyArray<number>
): { updatedCourses: Course[]; changedCoursePairs: Array<{ id: number; displayOrder: number }> } {
  const slug = normalizeCategorySortSlug(categorySlug);
  const orderedIdSet = new Set(orderedCourseIds);

  // Primary courses of this category included in the reorder payload
  const primaryCourses = allCourses.filter(
    (c) => normalizeCategorySortSlug(c.categorySlug) === slug && orderedIdSet.has(c.id)
  );

  if (primaryCourses.length <= 1) {
    return {
      updatedCourses: allCourses.map((c) => ({ ...c })),
      changedCoursePairs: [],
    };
  }

  // Sort their existing global slot pool ascending (e.g. [2, 5, 7, 11])
  const slotPool = primaryCourses
    .map((c) => Number(c.displayOrder))
    .filter((n) => Number.isInteger(n) && n >= 1)
    .sort((a, b) => a - b);

  if (slotPool.length !== primaryCourses.length) {
    return {
      updatedCourses: allCourses.map((c) => ({ ...c })),
      changedCoursePairs: [],
    };
  }

  const primaryIdSet = new Set(primaryCourses.map((c) => c.id));
  const orderedPrimaryIds = orderedCourseIds.filter((id) => primaryIdSet.has(id));
  if (orderedPrimaryIds.length !== slotPool.length) {
    return {
      updatedCourses: allCourses.map((c) => ({ ...c })),
      changedCoursePairs: [],
    };
  }

  const nextSlotById = new Map<number, number>();
  orderedPrimaryIds.forEach((id, idx) => {
    nextSlotById.set(id, slotPool[idx]);
  });

  const changedCoursePairs: Array<{ id: number; displayOrder: number }> = [];
  const updatedCourses = allCourses.map((course) => {
    const nextSlot = nextSlotById.get(course.id);
    if (nextSlot === undefined) {
      return { ...course };
    }
    if (course.displayOrder !== nextSlot) {
      changedCoursePairs.push({ id: course.id, displayOrder: nextSlot });
    }
    return {
      ...course,
      displayOrder: nextSlot,
    };
  });

  updatedCourses.sort(compareFallbackCourseOrder);

  return { updatedCourses, changedCoursePairs };
}
