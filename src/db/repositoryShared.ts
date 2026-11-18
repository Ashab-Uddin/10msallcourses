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
