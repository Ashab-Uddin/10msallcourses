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
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
