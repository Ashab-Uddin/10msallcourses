import type { Category, CategoryNavAssignment, NavbarGroupKey } from '../types.ts';
import { normalizeCategoryMatchText } from './categoryMatching.ts';

export type { CategoryNavAssignment, NavbarGroupKey };

export const NAVBAR_GROUP_KEYS: readonly NavbarGroupKey[] = [
  'school',
  'hsc27',
  'hsc28',
  'admission',
] as const;

export const NAVBAR_GROUP_LABELS: Record<NavbarGroupKey, string> = {
  school: 'ক্লাস 6-12',
  hsc27: 'HSC 27',
  hsc28: 'HSC 28',
  admission: 'ভর্তি পরীক্ষা',
};

export const NAVBAR_GROUP_OPTIONS: ReadonlyArray<{
  value: CategoryNavAssignment;
  label: string;
}> = [
  { value: 'auto', label: 'স্বয়ংক্রিয় (নাম/স্লাগ অনুযায়ী)' },
  { value: 'school', label: 'ক্লাস 6-12 ড্রপডাউন' },
  { value: 'hsc27', label: 'HSC 27 ড্রপডাউন' },
  { value: 'hsc28', label: 'HSC 28 ড্রপডাউন' },
  { value: 'admission', label: 'ভর্তি পরীক্ষা ড্রপডাউন' },
  { value: 'none', label: 'Navbar ড্রপডাউনে দেখাবে না' },
];

export function normalizeCategoryNavGroup(raw: unknown): CategoryNavAssignment {
  const val = String(raw || '')
    .trim()
    .toLowerCase();
  if (
    val === 'school' ||
    val === 'hsc27' ||
    val === 'hsc28' ||
    val === 'admission' ||
    val === 'none' ||
    val === 'auto'
  ) {
    return val;
  }
  return 'auto';
}

function includesAny(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

export function inferCategoryNavGroup(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle'>
): NavbarGroupKey | 'none' {
  const nameAndSlug = normalizeCategoryMatchText(`${cat.name || ''} ${cat.slug || ''}`);
  const fullHaystack = normalizeCategoryMatchText(
    `${cat.name || ''} ${cat.slug || ''} ${cat.subtitle || ''}`
  );

  if (
    includesAny(fullHaystack, [
      'hsc 28',
      'hsc-28',
      'hsc28',
      'hsc 2028',
      'hsc-2028',
      'hsc ২৮',
      'hsc ২০২৮',
      'এইচএসসি ২৮',
      'এইচএসসি ২০২৮',
    ])
  ) {
    return 'hsc28';
  }

  if (
    includesAny(fullHaystack, [
      'hsc 27',
      'hsc-27',
      'hsc27',
      'hsc 2027',
      'hsc-2027',
      'hsc ২৭',
      'hsc ২০২৭',
      'এইচএসসি ২৭',
      'এইচএসসি ২০২৭',
    ])
  ) {
    return 'hsc27';
  }

  if (
    includesAny(nameAndSlug, [
      'admission',
      'এডমিশন',
      'ভর্তি',
      'মেডিকেল',
      'medical',
      'ভার্সিটি',
      'varsity',
      'বুয়েট',
      'buet',
      'ইঞ্জিনিয়ারিং',
      'engineering',
      'গুচ্ছ',
      'gst',
    ])
  ) {
    return 'admission';
  }

  const mentionsHsc = includesAny(nameAndSlug, ['hsc', 'এইচএসসি']);
  if (
    !mentionsHsc &&
    includesAny(nameAndSlug, [
      'school',
      'ssc',
      'এসএসসি',
      'শ্রেণি',
      'শ্রেণী',
      'নবম',
      'দশম',
      'অষ্টম',
      'সপ্তম',
      'ষষ্ঠ',
      'পঞ্চম',
      '৫ম',
      '৬ষ্ঠ',
      '৭ম',
      '৮ম',
      '৯ম',
      '১০ম',
      'class 5',
      'class-5',
      'class5',
      'class 6',
      'class-6',
      'class6',
      'class 7',
      'class-7',
      'class7',
      'class 8',
      'class-8',
      'class8',
      'class 9',
      'class-9',
      'class9',
      'class 10',
      'class-10',
      'class10',
      'ক্লাস ৫',
      'ক্লাস ৬',
      'ক্লাস ৭',
      'ক্লাস ৮',
      'ক্লাস ৯',
      'ক্লাস ১০',
      'ক্লাস 5',
      'ক্লাস 6',
      'ক্লাস 7',
      'ক্লাস 8',
      'ক্লাস 9',
      'ক্লাস 10',
    ])
  ) {
    return 'school';
  }

  return 'none';
}

export function resolveCategoryNavGroup(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle' | 'navGroup'>
): NavbarGroupKey | 'none' {
  const assigned = normalizeCategoryNavGroup(cat.navGroup);
  if (assigned !== 'auto') {
    return assigned;
  }
  return inferCategoryNavGroup(cat);
}

export function getNavbarCategoriesByGroup(
  categories: ReadonlyArray<Category>
): Record<NavbarGroupKey, Category[]> {
  const grouped: Record<NavbarGroupKey, Category[]> = {
    school: [],
    hsc27: [],
    hsc28: [],
    admission: [],
  };

  const activeSorted = [...categories]
    .filter((cat) => (cat.status || 'active') === 'active')
    .sort((a, b) => {
      const orderDiff = (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0);
      if (orderDiff !== 0) return orderDiff;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

  for (const cat of activeSorted) {
    const group = resolveCategoryNavGroup(cat);
    if (group !== 'none') {
      grouped[group].push(cat);
    }
  }

  return grouped;
}

export function getNavbarGroupDisplayLabel(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle' | 'navGroup'>
): {
  group: NavbarGroupKey | 'none';
  isAuto: boolean;
  label: string;
} {
  const assigned = normalizeCategoryNavGroup(cat.navGroup);
  const resolved = resolveCategoryNavGroup(cat);
  const baseLabel = resolved === 'none' ? 'Navbar-এ লুকানো' : NAVBAR_GROUP_LABELS[resolved];
  return {
    group: resolved,
    isAuto: assigned === 'auto',
    label: baseLabel,
  };
}
