import React from 'react';
import {
  Trophy,
  Target,
  Compass,
  BookOpen,
  Lightbulb,
  Backpack,
  BookMarked,
  NotebookPen,
  School,
  Library,
  Laptop,
  Gift,
} from 'lucide-react';
import type { Category } from '../../types.ts';
import { getNavbarGroupLucideIcon } from '../../lib/categoryIconComponents.ts';
import {
  categorySlugsMatch,
  normalizeCategoryMatchText,
} from '../../lib/categoryMatching.ts';
import { resolveCategoryNavGroup } from '../../lib/navbarCategories.ts';
import {
  normalizeSelectorIconLabels,
  normalizeSelectorIconOrder,
  type SelectorIconId,
  type SelectorIconText,
} from '../../lib/selectorIconOrder.ts';

export interface SelectorIconDefinition {
  id: SelectorIconId;
  categoryId?: number;
  categorySlug?: string;
  tag: string;
  title: string;
  subLabel: string;
  path: string;
  topGradient: string;
  iconGlow: string;
  pillBorder: string;
  pillText: string;
  pillBg: string;
  hoverShadow: string;
  statusColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export const SELECTOR_ICON_DEFINITIONS: SelectorIconDefinition[] = [
  {
    id: 'hsc-26',
    categorySlug: 'hsc',
    tag: 'HSC 26',
    title: 'HSC ২৬',
    subLabel: 'এডমিশন ভর্তি চলছে',
    path: '/hsc/hsc-26/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#ff5c5c_0%,#dc2626_52%,#7f1d1d_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(127,29,29,0.65)]',
    pillBorder: 'border-[#dc2626]/75',
    pillText: 'text-[#b91c1c]',
    pillBg: 'bg-rose-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(220,38,38,0.45)]',
    statusColor: 'text-[#B91C1C]',
    Icon: Trophy,
  },
  {
    id: 'hsc-27',
    categorySlug: 'hsc',
    tag: 'HSC 27',
    title: 'HSC ২৭',
    subLabel: 'অনলাইন ব্যাচ চলছে',
    path: '/hsc/hsc-27/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#3b82f6_0%,#1d4ed8_52%,#1e1b4b_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(30,27,75,0.65)]',
    pillBorder: 'border-[#2563eb]/75',
    pillText: 'text-[#1d4ed8]',
    pillBg: 'bg-blue-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(37,99,235,0.42)]',
    statusColor: 'text-[#1d4ed8]',
    Icon: Target,
  },
  {
    id: 'hsc-28',
    categorySlug: 'hsc',
    tag: 'HSC 28',
    title: 'HSC ২৮',
    subLabel: 'অনলাইন ব্যাচ চলছে',
    path: '/hsc/hsc-28/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#22d3ee_0%,#0284c7_52%,#0c4a6e_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(12,74,110,0.65)]',
    pillBorder: 'border-[#0284c7]/75',
    pillText: 'text-[#0369a1]',
    pillBg: 'bg-sky-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(2,132,199,0.42)]',
    statusColor: 'text-[#0369a1]',
    Icon: Compass,
  },
  {
    id: 'ssc-27',
    categorySlug: 'school',
    tag: 'SSC 27',
    title: 'দশম শ্রেণি',
    subLabel: 'SSC ২০২৭ ব্যাচ',
    path: '/ssc/ssc-27/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#ea580c_0%,#c2410c_52%,#7c2d12_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(124,45,18,0.65)]',
    pillBorder: 'border-[#ea580c]/75',
    pillText: 'text-[#c2410c]',
    pillBg: 'bg-orange-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(234,88,12,0.42)]',
    statusColor: 'text-[#c2410c]',
    Icon: BookOpen,
  },
  {
    id: 'ssc-28',
    categorySlug: 'school',
    tag: 'CLASS 9',
    title: '৯ম শ্রেণি',
    subLabel: 'SSC ২০২৮ ব্যাচ',
    path: '/ssc/ssc-28/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#a855f7_0%,#7e22ce_52%,#3b0764_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(59,7,100,0.65)]',
    pillBorder: 'border-[#7e22ce]/75',
    pillText: 'text-[#6b21a8]',
    pillBg: 'bg-purple-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(126,34,206,0.42)]',
    statusColor: 'text-[#6b21a8]',
    Icon: Lightbulb,
  },
  {
    id: 'class-8',
    categorySlug: 'class-8',
    tag: 'CLASS 8',
    title: '৮ম শ্রেণি',
    subLabel: 'বার্ষিক অনলাইন ব্যাচ',
    path: '/class-8/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#2dd4bf_0%,#0d9488_52%,#134e4a_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(19,78,74,0.65)]',
    pillBorder: 'border-[#0d9488]/75',
    pillText: 'text-[#0f766e]',
    pillBg: 'bg-teal-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(13,148,136,0.42)]',
    statusColor: 'text-[#0f766e]',
    Icon: Backpack,
  },
  {
    id: 'class-7',
    categorySlug: 'class-7',
    tag: 'CLASS 7',
    title: '৭ম শ্রেণি',
    subLabel: 'বার্ষিক অনলাইন ব্যাচ',
    path: '/class-7/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#34d399_0%,#059669_52%,#064e3b_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(6,78,59,0.65)]',
    pillBorder: 'border-[#059669]/75',
    pillText: 'text-[#047857]',
    pillBg: 'bg-emerald-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(5,150,105,0.42)]',
    statusColor: 'text-[#047857]',
    Icon: BookMarked,
  },
  {
    id: 'class-6',
    categorySlug: 'class-6',
    tag: 'CLASS 6',
    title: '৬ষ্ঠ শ্রেণি',
    subLabel: 'বার্ষিক অনলাইন ব্যাচ',
    path: '/class-6/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#818cf8_0%,#4f46e5_52%,#312e81_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(49,46,129,0.65)]',
    pillBorder: 'border-[#4f46e5]/75',
    pillText: 'text-[#4338ca]',
    pillBg: 'bg-indigo-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(79,70,229,0.42)]',
    statusColor: 'text-[#4338ca]',
    Icon: NotebookPen,
  },
  {
    id: 'class-5',
    categorySlug: 'class-5',
    tag: 'CLASS 5',
    title: '৫ম শ্রেণি',
    subLabel: 'প্রাথমিক অনলাইন ব্যাচ',
    path: '/class-5/',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#f59e0b_0%,#d97706_52%,#78350f_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(120,53,15,0.65)]',
    pillBorder: 'border-[#d97706]/75',
    pillText: 'text-[#b45309]',
    pillBg: 'bg-amber-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(217,119,6,0.42)]',
    statusColor: 'text-[#b45309]',
    Icon: School,
  },
  {
    id: 'book-store',
    categorySlug: 'books',
    tag: 'BOOK STORE',
    title: 'বুক স্টোর',
    subLabel: 'প্রিন্টেড মাস্টারবুক',
    path: '/books',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#fb7185_0%,#e11d48_52%,#881337_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(136,19,55,0.65)]',
    pillBorder: 'border-[#e11d48]/75',
    pillText: 'text-[#be123c]',
    pillBg: 'bg-rose-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(225,29,72,0.42)]',
    statusColor: 'text-[#be123c]',
    Icon: Library,
  },
  {
    id: 'skills',
    categorySlug: 'skills',
    tag: 'SKILLS',
    title: 'স্কিলস',
    subLabel: 'ক্যারিয়ার ও আইটি কোর্স',
    path: '/skills',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#60a5fa_0%,#2563eb_52%,#1e3a8a_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(30,58,138,0.65)]',
    pillBorder: 'border-[#2563eb]/75',
    pillText: 'text-[#1d4ed8]',
    pillBg: 'bg-blue-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(37,99,235,0.42)]',
    statusColor: 'text-[#1d4ed8]',
    Icon: Laptop,
  },
  {
    id: 'free-course',
    categorySlug: 'free-course',
    tag: 'FREE COURSE',
    title: 'ফ্রি কোর্স',
    subLabel: 'বিনামূল্যে শিখুন',
    path: '/free-course',
    topGradient:
      'bg-[radial-gradient(circle_at_25%_20%,#4ade80_0%,#16a34a_52%,#14532d_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(20,83,45,0.65)]',
    pillBorder: 'border-[#16a34a]/75',
    pillText: 'text-[#15803d]',
    pillBg: 'bg-green-50/85',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(22,163,74,0.42)]',
    statusColor: 'text-[#15803d]',
    Icon: Gift,
  },
];

export const SELECTOR_ICON_MAP = new Map<SelectorIconId, SelectorIconDefinition>(
  SELECTOR_ICON_DEFINITIONS.map((item) => [item.id, item])
);

function categoryMatchesAnyToken(
  cat: Pick<Category, 'name' | 'slug'>,
  tokens: readonly string[],
  excludeTokens: readonly string[] = []
): boolean {
  const text = normalizeCategoryMatchText(`${cat.name || ''} ${cat.slug || ''}`);
  if (excludeTokens.some((tok) => text.includes(normalizeCategoryMatchText(tok)))) {
    return false;
  }
  return tokens.some((tok) => text.includes(normalizeCategoryMatchText(tok)));
}

function resolveSelectorIconTarget(
  def: SelectorIconDefinition,
  effectiveTitle: string,
  effectiveSubLabel: string,
  activeCategories: ReadonlyArray<Category>
): Pick<SelectorIconDefinition, 'categoryId' | 'categorySlug' | 'path'> {
  if (activeCategories.length === 0) {
    return {
      categoryId: def.categoryId,
      categorySlug: def.categorySlug,
      path: def.path,
    };
  }

  // Keep already-working icons' navigation paths untouched; only attach matching DB categoryId if present.
  if (
    def.id === 'class-5' ||
    def.id === 'class-6' ||
    def.id === 'class-7' ||
    def.id === 'class-8' ||
    def.id === 'book-store' ||
    def.id === 'skills' ||
    def.id === 'free-course'
  ) {
    const matched = def.categorySlug
      ? activeCategories.find((c) => categorySlugsMatch(c.slug, def.categorySlug))
      : undefined;
    return {
      categoryId: matched?.id,
      categorySlug: def.categorySlug,
      path: def.path,
    };
  }

  // 1. ৯ম শ্রেণি (CLASS 9 / SSC 28)
  if (def.id === 'ssc-28') {
    const matched =
      activeCategories.find(
        (c) => categorySlugsMatch(c.slug, 'ssc-28') || categorySlugsMatch(c.slug, 'class-9')
      ) ||
      activeCategories.find((c) =>
        categoryMatchesAnyToken(
          c,
          [
            'ssc-28',
            'ssc 28',
            'ssc28',
            'ssc-2028',
            'ssc 2028',
            'ssc2028',
            'ssc ২৮',
            'ssc ২০২৮',
            'এসএসসি ২৮',
            '৯ম',
            'নবম',
            'class-9',
            'class 9',
            'class9',
          ],
          ['hsc', 'এইচএসসি']
        )
      );
    if (matched) {
      return {
        categoryId: matched.id,
        categorySlug: matched.slug,
        path: `/category/${matched.slug}`,
      };
    }
  }

  // 2. দশম শ্রেণি (SSC 27)
  if (def.id === 'ssc-27') {
    const matched =
      activeCategories.find(
        (c) => categorySlugsMatch(c.slug, 'ssc-27') || categorySlugsMatch(c.slug, 'class-10')
      ) ||
      activeCategories.find((c) =>
        categoryMatchesAnyToken(
          c,
          [
            'ssc-27',
            'ssc 27',
            'ssc27',
            'ssc-2027',
            'ssc 2027',
            'ssc2027',
            'ssc ২৭',
            'ssc ২০২৭',
            'এসএসসি ২৭',
            '১০ম',
            'দশম',
            'class-10',
            'class 10',
            'class10',
          ],
          ['hsc', 'এইচএসসি']
        )
      );
    if (matched) {
      return {
        categoryId: matched.id,
        categorySlug: matched.slug,
        path: `/category/${matched.slug}`,
      };
    }
  }

  // 3. HSC 27
  if (def.id === 'hsc-27') {
    const hsc27Cats = activeCategories.filter(
      (c) =>
        resolveCategoryNavGroup(c) === 'hsc27' ||
        categoryMatchesAnyToken(c, [
          'hsc-27',
          'hsc 27',
          'hsc27',
          'hsc-2027',
          'hsc 2027',
          'hsc ২৭',
          'hsc ২০২৭',
          'এইচএসসি ২৭',
        ])
    );
    const exact = hsc27Cats.find((c) => categorySlugsMatch(c.slug, 'hsc-27'));
    if (exact) {
      return {
        categoryId: exact.id,
        categorySlug: exact.slug,
        path: `/category/${exact.slug}`,
      };
    }
    if (hsc27Cats.length === 1) {
      return {
        categoryId: hsc27Cats[0].id,
        categorySlug: hsc27Cats[0].slug,
        path: `/category/${hsc27Cats[0].slug}`,
      };
    }
    if (hsc27Cats.length > 1) {
      return {
        categoryId: hsc27Cats[0].id,
        categorySlug: 'hsc-27',
        path: '/category/hsc-27',
      };
    }
  }

  // 4. HSC 28
  if (def.id === 'hsc-28') {
    const hsc28Cats = activeCategories.filter(
      (c) =>
        resolveCategoryNavGroup(c) === 'hsc28' ||
        categoryMatchesAnyToken(c, [
          'hsc-28',
          'hsc 28',
          'hsc28',
          'hsc-2028',
          'hsc 2028',
          'hsc ২৮',
          'hsc ২০২৮',
          'এইচএসসি ২৮',
        ])
    );
    const exact = hsc28Cats.find((c) => categorySlugsMatch(c.slug, 'hsc-28'));
    if (exact) {
      return {
        categoryId: exact.id,
        categorySlug: exact.slug,
        path: `/category/${exact.slug}`,
      };
    }
    if (hsc28Cats.length === 1) {
      return {
        categoryId: hsc28Cats[0].id,
        categorySlug: hsc28Cats[0].slug,
        path: `/category/${hsc28Cats[0].slug}`,
      };
    }
    if (hsc28Cats.length > 1) {
      return {
        categoryId: hsc28Cats[0].id,
        categorySlug: 'hsc-28',
        path: '/category/hsc-28',
      };
    }
  }

  // 5. এডমিশন (Admission / HSC 26 slot)
  if (def.id === 'hsc-26') {
    const iconLabelText = normalizeCategoryMatchText(`${effectiveTitle} ${effectiveSubLabel}`);
    const labeledAsAdmission =
      iconLabelText.includes('admission') ||
      iconLabelText.includes('এডমিশন') ||
      iconLabelText.includes('ভর্তি');
    const explicitHsc26Cat = activeCategories.find(
      (c) =>
        categorySlugsMatch(c.slug, 'hsc-26') ||
        categoryMatchesAnyToken(c, ['hsc-26', 'hsc 26', 'hsc26', 'hsc ২৬', 'এইচএসসি ২৬'])
    );
    const admissionCat =
      activeCategories.find((c) => categorySlugsMatch(c.slug, 'admission')) ||
      activeCategories.find(
        (c) =>
          resolveCategoryNavGroup(c) === 'admission' ||
          categoryMatchesAnyToken(c, ['admission', 'এডমিশন'])
      );

    if ((labeledAsAdmission || !explicitHsc26Cat) && admissionCat) {
      return {
        categoryId: admissionCat.id,
        categorySlug: admissionCat.slug,
        path: `/category/${admissionCat.slug}`,
      };
    }
    if (explicitHsc26Cat) {
      return {
        categoryId: explicitHsc26Cat.id,
        categorySlug: explicitHsc26Cat.slug,
        path: `/category/${explicitHsc26Cat.slug}`,
      };
    }
  }

  return {
    categoryId: def.categoryId,
    categorySlug: def.categorySlug,
    path: def.path,
  };
}

export function getOrderedSelectorIcons(
  orderedIds?: ReadonlyArray<string> | null,
  customLabels?: Partial<Record<string, Partial<SelectorIconText>>> | null,
  categories?: ReadonlyArray<Category> | null
): SelectorIconDefinition[] {
  const normalized = normalizeSelectorIconOrder(orderedIds);
  const normalizedLabels = normalizeSelectorIconLabels(customLabels);
  const activeCategories = Array.isArray(categories)
    ? [...categories]
        .filter((c) => (c.status || 'active') === 'active')
        .sort(
          (a, b) =>
            (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) ||
            (Number(a.id) || 0) - (Number(b.id) || 0)
        )
    : [];

  return normalized
    .map((id) => {
      const def = SELECTOR_ICON_MAP.get(id);
      if (!def) return null;
      const custom = normalizedLabels[id];
      const title = custom?.title || def.title;
      const subLabel = custom?.subLabel || def.subLabel;
      const resolvedTarget = resolveSelectorIconTarget(
        def,
        title,
        subLabel,
        activeCategories
      );
      const resolvedIcon =
        id === 'hsc-27'
          ? getNavbarGroupLucideIcon('hsc27', activeCategories)
          : id === 'hsc-28'
          ? getNavbarGroupLucideIcon('hsc28', activeCategories)
          : def.Icon;
      return {
        ...def,
        ...resolvedTarget,
        Icon: resolvedIcon,
        title,
        subLabel,
      };
    })
    .filter((item): item is SelectorIconDefinition => Boolean(item));
}
