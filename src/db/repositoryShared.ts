import { generateUnicodeCourseSlug } from '../lib/courseSlug.ts';

export class RepositoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RepositoryError';
    this.status = status;
  }
}

export interface StorageInfo {
  backend: 'supabase-postgres' | 'local-json';
  persistentOnVercel: boolean;
  warning?: string;
}

export function normalizeSlug(raw: string): string {
  return generateUnicodeCourseSlug(raw);
}

export function parseSafePrice(value: unknown): { valid: boolean; value: number } {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return { valid: false, value: 0 };
    return { valid: true, value: Math.round(value) };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { valid: false, value: 0 };
    const ascii = trimmed.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    if (!/^\d+$/.test(ascii)) return { valid: false, value: 0 };
    const normalized = ascii.replace(/^0+(?=\d)/, '').replace(/^0+$/, '0');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return { valid: false, value: 0 };
    return { valid: true, value: Math.round(parsed) };
  }
  return { valid: false, value: 0 };
}

export function normalizeCourseStatus(
  status: unknown,
  fallback: 'active' | 'inactive' | 'closed' = 'active'
): 'active' | 'inactive' | 'closed' {
  if (status === 'active' || status === 'inactive' || status === 'closed') {
    return status;
  }
  return fallback;
}

export function parseCategoryDisplayOrder(
  value: unknown
): { valid: true; value: number } | { valid: false; error: string } {
  const invalidMsg = 'ক্রম নম্বর (Order Number) অবশ্যই ১ বা তার চেয়ে বড় একটি পূর্ণসংখ্যা হতে হবে।';

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1 || value > 1000000) {
      return { valid: false, error: invalidMsg };
    }
    return { valid: true, value };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: invalidMsg };
    }
    const ascii = trimmed.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    if (!/^\d+$/.test(ascii)) {
      return { valid: false, error: invalidMsg };
    }
    const num = Number(ascii);
    if (!Number.isInteger(num) || num < 1 || num > 1000000) {
      return { valid: false, error: invalidMsg };
    }
    return { valid: true, value: num };
  }

  return { valid: false, error: invalidMsg };
}

export function sortCategoriesByOrder<T extends { displayOrder: number; id: number }>(
  categories: T[]
): T[] {
  return [...categories].sort(
    (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
  );
}

export function parseCourseDisplayOrder(
  value: unknown
): { valid: true; value: number } | { valid: false; error: string } {
  const invalidMsg =
    'কোর্সের সিরিয়াল নম্বর (Position Number) অবশ্যই ১ বা তার চেয়ে বড় একটি পূর্ণসংখ্যা হতে হবে।';

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1 || value > 1000000) {
      return { valid: false, error: invalidMsg };
    }
    return { valid: true, value };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: invalidMsg };
    }
    const ascii = trimmed.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    if (!/^\d+$/.test(ascii)) {
      return { valid: false, error: invalidMsg };
    }
    const num = Number(ascii);
    if (!Number.isInteger(num) || num < 1 || num > 1000000) {
      return { valid: false, error: invalidMsg };
    }
    return { valid: true, value: num };
  }

  return { valid: false, error: invalidMsg };
}

function getCourseSortTimestamp(createdAt?: string | null): number {
  if (!createdAt) return 0;
  const ts = Date.parse(createdAt);
  return Number.isFinite(ts) ? ts : 0;
}

export function sortCoursesByOrder<
  T extends { displayOrder?: number | null; createdAt?: string | null; id: number }
>(courses: T[]): T[] {
  return [...courses].sort((a, b) => {
    const orderA =
      typeof a.displayOrder === 'number' && Number.isFinite(a.displayOrder) && a.displayOrder > 0
        ? a.displayOrder
        : Number.MAX_SAFE_INTEGER;
    const orderB =
      typeof b.displayOrder === 'number' && Number.isFinite(b.displayOrder) && b.displayOrder > 0
        ? b.displayOrder
        : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;

    const timeDiff = getCourseSortTimestamp(b.createdAt) - getCourseSortTimestamp(a.createdAt);
    if (timeDiff !== 0) return timeDiff;

    return Number(b.id) - Number(a.id);
  });
}

export function normalizeContiguousCourseOrder<
  T extends { displayOrder?: number | null; createdAt?: string | null; id: number }
>(courses: T[]): Array<T & { displayOrder: number }> {
  return sortCoursesByOrder(courses).map((course, idx) => ({
    ...course,
    displayOrder: idx + 1,
  }));
}

export function moveCourseToPosition<
  T extends { displayOrder?: number | null; createdAt?: string | null; id: number }
>(
  courses: T[],
  targetCourseId: number,
  targetPosition: number
): Array<T & { displayOrder: number }> {
  const ordered = normalizeContiguousCourseOrder(courses);
  if (ordered.length === 0) return [];

  const currentIdx = ordered.findIndex((c) => Number(c.id) === Number(targetCourseId));
  if (currentIdx === -1) return ordered;

  const clampedPos = Math.min(Math.max(1, Math.round(targetPosition)), ordered.length);
  const targetIdx = clampedPos - 1;

  if (currentIdx === targetIdx) {
    return ordered;
  }

  const reordered = [...ordered];
  const [moved] = reordered.splice(currentIdx, 1);
  reordered.splice(targetIdx, 0, moved);

  return reordered.map((course, idx) => ({
    ...course,
    displayOrder: idx + 1,
  }));
}

