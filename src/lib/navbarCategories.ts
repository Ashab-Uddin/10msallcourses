import type { Category, CategoryNavAssignment, NavbarGroupKey } from '../types.ts';
import { normalizeCategoryMatchText } from './categoryMatching.ts';

export type { CategoryNavAssignment, NavbarGroupKey };

export const NAVBAR_GROUP_KEYS: readonly NavbarGroupKey[] = [
  'school',
  'hsc27',
  'hsc28',
  'admission',
  'skills',
] as const;

export const NAVBAR_GROUP_LABELS: Record<NavbarGroupKey, string> = {
  school: 'ক্লাস 6-12',
  hsc27: 'HSC 27',
  hsc28: 'HSC 28',
  admission: 'ভর্তি পরীক্ষা',
  skills: 'স্কিলস',
};

export const NAVBAR_GROUP_PATHS: Record<NavbarGroupKey, string> = {
  school: '/programs/class-6-12',
  hsc27: '/programs/hsc-27',
  hsc28: '/programs/hsc-28',
  admission: '/programs/admission',
  skills: '/programs/skills',
};

export interface NavbarGroupPageMeta {
  key: NavbarGroupKey;
  breadcrumbLabel: string;
  badge: string;
  titleLead: string;
  titleAccent: string;
  defaultSubtitle: string;
  emptyCoursesMessage: string;
  seoTitle: string;
  seoDescription: string;
}

export const NAVBAR_GROUP_PAGE_META: Record<NavbarGroupKey, NavbarGroupPageMeta> = {
  school: {
    key: 'school',
    breadcrumbLabel: 'ক্লাস ৬–১২',
    badge: 'ক্লাস ৫–১০ · স্কুল ও এসএসসি একাডেমিক প্রোগ্রাম',
    titleLead: 'ক্লাস ৬–১২',
    titleAccent: 'অনলাইন ব্যাচ',
    defaultSubtitle: 'পঞ্চম থেকে দশম শ্রেণি ও এসএসসি পরীক্ষার্থীদের সকল বিষয়ভিত্তিক অনলাইন ব্যাচ ও ক্যাটাগরি',
    emptyCoursesMessage: 'ক্লাস ৬–১২ ক্যাটাগরিতে বর্তমানে কোনো সক্রিয় কোর্স নেই।',
    seoTitle: 'ক্লাস ৬–১২ সকল ক্যাটাগরি ও অনলাইন ব্যাচ — ১০ মিনিট স্কুল',
    seoDescription:
      '১০ম শ্রেণি (SSC 27), ৯ম শ্রেণি (SSC 28), ৮ম, ৭ম, ৬ষ্ঠ ও ৫ম শ্রেণির সকল একাডেমিক অনলাইন ব্যাচ ও লাইভ ক্লাস।',
  },
  hsc27: {
    key: 'hsc27',
    breadcrumbLabel: 'HSC 27',
    badge: 'HSC ২০২৭ একাডেমিক ও রিভিশন প্রোগ্রাম',
    titleLead: 'HSC 27',
    titleAccent: 'অনলাইন ব্যাচ',
    defaultSubtitle: 'HSC ২০২৭ ব্যাচের বিজ্ঞান, মানবিক, ব্যবসায় শিক্ষা, BEI ও শেষ মুহূর্তের প্রস্তুতি কোর্সসমূহ',
    emptyCoursesMessage: 'HSC 27 ক্যাটাগরিতে বর্তমানে কোনো সক্রিয় কোর্স নেই।',
    seoTitle: 'HSC 27 সকল ক্যাটাগরি ও অনলাইন ব্যাচ — ১০ মিনিট স্কুল',
    seoDescription:
      'HSC ২০২৭ ব্যাচের বিজ্ঞান, মানবিক, ব্যবসায় শিক্ষা, BEI ও শেষ মুহূর্তের প্রস্তুতি অনলাইন ব্যাচসমূহ।',
  },
  hsc28: {
    key: 'hsc28',
    breadcrumbLabel: 'HSC 28',
    badge: 'HSC ২০২৮ ১ম বর্ষ একাডেমিক প্রোগ্রাম',
    titleLead: 'HSC 28',
    titleAccent: 'অনলাইন ব্যাচ',
    defaultSubtitle: 'HSC ২০২৮ ব্যাচের বিজ্ঞান, মানবিক, ব্যবসায় শিক্ষা ও BEI বিভাগের পূর্ণাঙ্গ অনলাইন ব্যাচসমূহ',
    emptyCoursesMessage: 'HSC 28 ক্যাটাগরিতে বর্তমানে কোনো সক্রিয় কোর্স নেই।',
    seoTitle: 'HSC 28 সকল ক্যাটাগরি ও অনলাইন ব্যাচ — ১০ মিনিট স্কুল',
    seoDescription:
      'HSC ২০২৮ ব্যাচের বিজ্ঞান, মানবিক, ব্যবসায় শিক্ষা ও BEI বিভাগের সকল অনলাইন কোর্স ও লাইভ ব্যাচ।',
  },
  admission: {
    key: 'admission',
    breadcrumbLabel: 'ভর্তি পরীক্ষা',
    badge: 'বিশ্ববিদ্যালয়, মেডিকেল ও ইঞ্জিনিয়ারিং ভর্তি প্রস্তুতি',
    titleLead: 'ভর্তি পরীক্ষা',
    titleAccent: 'প্রস্তুতি ব্যাচ',
    defaultSubtitle: 'মেডিকেল, বিশ্ববিদ্যালয় ও ইঞ্জিনিয়ারিং ভর্তি পরীক্ষার সকল বিভাগভিত্তিক অনলাইন কোর্স',
    emptyCoursesMessage: 'ভর্তি পরীক্ষা ক্যাটাগরিতে বর্তমানে কোনো সক্রিয় কোর্স নেই।',
    seoTitle: 'ভর্তি পরীক্ষা (মেডিকেল, ভার্সিটি, ইঞ্জিনিয়ারিং) — ১০ মিনিট স্কুল',
    seoDescription:
      'মেডিকেল, ঢাকা বিশ্ববিদ্যালয়, গুচ্ছ ও বুয়েট-ইঞ্জিনিয়ারিং ভর্তি পরীক্ষার পূর্ণাঙ্গ অনলাইন প্রস্তুতি।',
  },
  skills: {
    key: 'skills',
    breadcrumbLabel: 'স্কিলস',
    badge: 'স্কিলস, ভাষা শিক্ষা, ফ্রিল্যান্সিং ও ক্যারিয়ার',
    titleLead: 'স্কিলস ও আইটি',
    titleAccent: 'ক্যারিয়ার কোর্স',
    defaultSubtitle: 'ভাষা শিক্ষা, ফ্রিল্যান্সিং, ডিজাইন ও প্রফেশনাল আইটি দক্ষতা উন্নয়নের সকল কোর্সসমূহ',
    emptyCoursesMessage: 'স্কিলস ক্যাটাগরিতে বর্তমানে কোনো সক্রিয় কোর্স নেই।',
    seoTitle: 'স্কিলস ও আইটি, ভাষা শিক্ষা, ফ্রিল্যান্সিং ও ডিজাইন কোর্স — ১০ মিনিট স্কুল',
    seoDescription:
      'স্পোকেন ইংলিশ, IELTS, ফ্রিল্যান্সিং, ডিজাইন এন্ড ক্রিয়েটিভ এবং ক্যারিয়ার ও আইটি স্কিল কোর্সসমূহ।',
  },
};

export function buildNavbarGroupPath(
  groupKey: NavbarGroupKey,
  categorySlug?: string | null
): string {
  const basePath = NAVBAR_GROUP_PATHS[groupKey];
  const cleanCat = (categorySlug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!cleanCat) return basePath;
  return `${basePath}/${cleanCat}`;
}

export function parseNavbarGroupFromPath(
  pathname: string
): { groupKey: NavbarGroupKey; categorySlug?: string } | null {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  if (clean === '/school' || clean === '/category/school' || clean === '/categories/school') {
    return { groupKey: 'school' };
  }

  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const prefix = parts[0].toLowerCase();
  if (prefix !== 'programs') return null;
  if (parts.length < 2) return null;

  const groupSeg = parts[1].toLowerCase();
  let groupKey: NavbarGroupKey | null = null;
  if (groupSeg === 'class-6-12' || groupSeg === 'school') groupKey = 'school';
  else if (groupSeg === 'hsc-27' || groupSeg === 'hsc27') groupKey = 'hsc27';
  else if (groupSeg === 'hsc-28' || groupSeg === 'hsc28') groupKey = 'hsc28';
  else if (groupSeg === 'admission') groupKey = 'admission';
  else if (groupSeg === 'skills') groupKey = 'skills';

  if (!groupKey) return null;

  if (parts.length >= 3 && parts[2]) {
    let decodedCat = parts.slice(2).join('/');
    try {
      decodedCat = decodeURIComponent(decodedCat);
    } catch {
      // Keep raw segment if invalid percent encoding
    }
    return { groupKey, categorySlug: decodedCat.normalize('NFC') };
  }

  return { groupKey };
}

export const NAVBAR_GROUP_OPTIONS: ReadonlyArray<{
  value: CategoryNavAssignment;
  label: string;
}> = [
  { value: 'auto', label: 'স্বয়ংক্রিয় (নাম/স্লাগ অনুযায়ী)' },
  { value: 'school', label: 'ক্লাস 6-12 ড্রপডাউন' },
  { value: 'hsc27', label: 'HSC 27 ড্রপডাউন' },
  { value: 'hsc28', label: 'HSC 28 ড্রপডাউন' },
  { value: 'admission', label: 'ভর্তি পরীক্ষা ড্রপডাউন' },
  { value: 'skills', label: 'স্কিলস ড্রপডাউন' },
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
    val === 'skills' ||
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
      'বিশ্ববিদ্যালয়',
      'বিশ্ববিদ্যালয়',
      'university',
      'বুয়েট',
      'buet',
      'ইঞ্জিনিয়ারিং',
      'ইঞ্জিনিয়ারিং',
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

  if (
    includesAny(nameAndSlug, [
      'skill',
      'স্কিল',
      'language-learning',
      'language',
      'ল্যাঙ্গুয়েজ',
      'ভাষা',
      'spoken',
      'স্পোকেন',
      'ielts',
      'freelancing',
      'ফ্রিল্যান্সিং',
      'design',
      'creative',
      'ডিজাইন',
      'ক্রিয়েটিভ',
      'ক্রিয়েটিভ',
      'career',
      'ক্যারিয়ার',
      'আইটি',
    ])
  ) {
    return 'skills';
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
    skills: [],
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
