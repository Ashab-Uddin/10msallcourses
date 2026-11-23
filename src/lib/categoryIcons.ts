import type { Category } from '../types.ts';
import { normalizeCategoryMatchText } from './categoryMatching.ts';
import { resolveCategoryNavGroup, type NavbarGroupKey } from './navbarCategories.ts';

export const RESOLVED_CATEGORY_ICON_KEYS = [
  'atom',
  'microscope',
  'flask',
  'briefcase',
  'trending-up',
  'book-open',
  'globe',
  'languages',
  'laptop',
  'graduation-cap',
  'target',
  'trophy',
  'award',
  'sparkles',
  'school',
  'backpack',
  'book-marked',
  'notebook-pen',
  'lightbulb',
  'library',
  'calculator',
  'compass',
  'gift',
  'layers',
  'palette',
  'landmark',
  'cpu',
  'stethoscope',
  'zap',
] as const;

export type ResolvedCategoryIconKey = (typeof RESOLVED_CATEGORY_ICON_KEYS)[number];
export type CategoryIconKey = 'auto' | ResolvedCategoryIconKey;

export interface CategoryIconOption {
  value: CategoryIconKey;
  label: string;
}

export const CATEGORY_ICON_OPTIONS: ReadonlyArray<CategoryIconOption> = [
  { value: 'auto', label: 'স্বয়ংক্রিয়' },
  { value: 'atom', label: 'বিজ্ঞান (Atom)' },
  { value: 'microscope', label: 'বায়োলজি / ল্যাব' },
  { value: 'flask', label: 'রসায়ন (Flask)' },
  { value: 'briefcase', label: 'ব্যবসায় শিক্ষা' },
  { value: 'trending-up', label: 'ফিন্যান্স / গ্রোথ' },
  { value: 'book-open', label: 'মানবিক / একাডেমিক' },
  { value: 'globe', label: 'ভূগোল / বিশ্ব' },
  { value: 'languages', label: 'BEI / ভাষা' },
  { value: 'laptop', label: 'ICT / স্কিলস' },
  { value: 'palette', label: 'ডিজাইন / ক্রিয়েটিভ' },
  { value: 'landmark', label: 'বিশ্ববিদ্যালয় / ভার্সিটি' },
  { value: 'cpu', label: 'ইঞ্জিনিয়ারিং / টেক' },
  { value: 'stethoscope', label: 'মেডিকেল এডমিশন' },
  { value: 'zap', label: 'শেষ মুহূর্তের প্রস্তুতি' },
  { value: 'graduation-cap', label: 'HSC / কলেজ' },
  { value: 'target', label: 'লক্ষ্য / রিভিশন' },
  { value: 'trophy', label: 'ভর্তি / ট্রফি' },
  { value: 'award', label: 'অ্যাওয়ার্ড' },
  { value: 'sparkles', label: 'স্পেশাল ব্যাচ' },
  { value: 'school', label: 'স্কুল (৫ম–১০ম)' },
  { value: 'backpack', label: 'ব্যাগ / ৮ম শ্রেণি' },
  { value: 'book-marked', label: 'বুকমার্ক / ৭ম শ্রেণি' },
  { value: 'notebook-pen', label: 'নোট / ৬ষ্ঠ শ্রেণি' },
  { value: 'lightbulb', label: 'আইডিয়া / ৯ম শ্রেণি' },
  { value: 'library', label: 'লাইব্রেরি / বই' },
  { value: 'calculator', label: 'গণিত / হিসাব' },
  { value: 'compass', label: 'দিকনির্দেশনা' },
  { value: 'gift', label: 'ফ্রি কোর্স' },
  { value: 'layers', label: 'কম্পোজিট প্যাকেজ' },
];

const RESOLVED_ICON_SET = new Set<string>(RESOLVED_CATEGORY_ICON_KEYS);

export function normalizeCategoryIconKey(raw: unknown): CategoryIconKey {
  const val = String(raw || '')
    .trim()
    .toLowerCase();
  if (!val || val === 'auto') return 'auto';
  if (RESOLVED_ICON_SET.has(val)) {
    return val as ResolvedCategoryIconKey;
  }
  return 'auto';
}

function includesAny(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

export function inferCategoryIconKey(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle' | 'navGroup'>
): ResolvedCategoryIconKey {
  const nameAndSlug = normalizeCategoryMatchText(`${cat.name || ''} ${cat.slug || ''}`);
  const full = normalizeCategoryMatchText(
    `${cat.name || ''} ${cat.slug || ''} ${cat.subtitle || ''}`
  );

  if (includesAny(nameAndSlug, ['বিজ্ঞান', 'science', 'pcmb', 'physics', 'biology'])) {
    return 'atom';
  }
  if (includesAny(nameAndSlug, ['রসায়ন', 'chemistry'])) {
    return 'flask';
  }
  if (includesAny(nameAndSlug, ['মানবিক', 'humanities', 'arts', 'সমাজ', 'ইতিহাস', 'পৌরনীতি'])) {
    return 'book-open';
  }
  if (includesAny(nameAndSlug, ['ব্যবসায়', 'ব্যবসা', 'ব্যাবসা', 'business', 'commerce', 'হিসাব', 'ফিন্যান্স'])) {
    return 'briefcase';
  }
  if (includesAny(nameAndSlug, ['bei', 'বাংলা ইংরেজি', 'বাংলা-ইংরেজি', 'ict', 'english', 'bangla', 'ভাষা', 'language'])) {
    return 'languages';
  }
  if (includesAny(nameAndSlug, ['মেডিকেল', 'medical', 'ডেন্টাল'])) {
    return 'stethoscope';
  }
  if (includesAny(nameAndSlug, ['ইঞ্জিনিয়ারিং', 'ইঞ্জিনিয়ারিং', 'engineering', 'বুয়েট', 'buet', 'cuet', 'kuet', 'ruet'])) {
    return 'cpu';
  }
  if (includesAny(nameAndSlug, ['বিশ্ববিদ্যালয়', 'বিশ্ববিদ্যালয়', 'university', 'ভার্সিটি', 'varsity', 'গুচ্ছ', 'gst'])) {
    return 'landmark';
  }
  if (includesAny(nameAndSlug, ['এডমিশন', 'admission', 'ভর্তি'])) {
    return 'trophy';
  }
  if (includesAny(nameAndSlug, ['ডিজাইন', 'ক্রিয়েটিভ', 'ক্রিয়েটিভ', 'design', 'creative', 'graphic', 'ইলাস্ট্রেশন'])) {
    return 'palette';
  }
  if (includesAny(nameAndSlug, ['ফ্রিল্যান্সিং', 'freelancing', 'মার্কেটিং', 'marketing'])) {
    return 'trending-up';
  }
  if (includesAny(nameAndSlug, ['স্কিল', 'skill', 'আইটি', 'career'])) {
    return 'laptop';
  }
  if (includesAny(nameAndSlug, ['ফ্রি', 'free'])) {
    return 'gift';
  }
  if (includesAny(nameAndSlug, ['বই', 'বুক', 'book'])) {
    return 'library';
  }
  if (includesAny(nameAndSlug, ['class 5', 'class-5', '৫ম', 'পঞ্চম'])) {
    return 'school';
  }
  if (includesAny(nameAndSlug, ['class 6', 'class-6', '৬ষ্ঠ', 'ষষ্ঠ'])) {
    return 'notebook-pen';
  }
  if (includesAny(nameAndSlug, ['class 7', 'class-7', '৭ম', 'সপ্তম'])) {
    return 'book-marked';
  }
  if (includesAny(nameAndSlug, ['class 8', 'class-8', '৮ম', 'অষ্টম'])) {
    return 'backpack';
  }
  if (includesAny(nameAndSlug, ['class 9', 'class-9', '৯ম', 'নবম', 'ssc 28', 'ssc-28'])) {
    return 'lightbulb';
  }
  if (includesAny(nameAndSlug, ['শেষ মুহূর্ত', 'smp', 'চূড়ান্ত'])) {
    return 'zap';
  }
  if (includesAny(nameAndSlug, ['school', 'ssc', 'এসএসসি', 'দশম', '১০ম'])) {
    return 'book-open';
  }

  const navGroup = resolveCategoryNavGroup(cat);
  if (navGroup === 'hsc27') return 'target';
  if (navGroup === 'hsc28') return 'compass';
  if (navGroup === 'admission') return 'trophy';
  if (navGroup === 'school') return 'school';
  if (navGroup === 'skills') return 'briefcase';

  if (includesAny(full, ['গণিত', 'math'])) return 'calculator';
  return 'sparkles';
}

export function resolveCategoryIconKey(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle' | 'navGroup' | 'iconKey'>
): ResolvedCategoryIconKey {
  const assigned = normalizeCategoryIconKey(cat.iconKey);
  if (assigned !== 'auto') {
    return assigned;
  }
  return inferCategoryIconKey(cat);
}

const DEFAULT_NAVBAR_GROUP_ICONS: Record<NavbarGroupKey, ResolvedCategoryIconKey> = {
  school: 'graduation-cap',
  hsc27: 'target',
  hsc28: 'compass',
  admission: 'award',
  skills: 'briefcase',
};

export function resolveNavbarGroupIconKey(
  group: NavbarGroupKey,
  categories: ReadonlyArray<Category> = []
): ResolvedCategoryIconKey {
  if (group !== 'hsc27' && group !== 'hsc28') {
    return DEFAULT_NAVBAR_GROUP_ICONS[group];
  }

  const groupCategories = categories.filter(
    (cat) => (cat.status || 'active') === 'active' && resolveCategoryNavGroup(cat) === group
  );

  if (groupCategories.length > 0) {
    const batchSlug = group === 'hsc27' ? 'hsc-27' : 'hsc-28';
    const dedicated = groupCategories.find((cat) => {
      const normalizedSlug = String(cat.slug || '').trim().toLowerCase();
      return (
        (normalizedSlug === batchSlug || normalizedSlug === group) &&
        normalizeCategoryIconKey(cat.iconKey) !== 'auto'
      );
    });
    if (dedicated) {
      return normalizeCategoryIconKey(dedicated.iconKey) as ResolvedCategoryIconKey;
    }

    if (groupCategories.length === 1) {
      const assigned = normalizeCategoryIconKey(groupCategories[0].iconKey);
      if (assigned !== 'auto') {
        return assigned;
      }
    } else {
      const firstAssigned = normalizeCategoryIconKey(groupCategories[0].iconKey);
      if (
        firstAssigned !== 'auto' &&
        groupCategories.every((cat) => normalizeCategoryIconKey(cat.iconKey) === firstAssigned)
      ) {
        return firstAssigned;
      }
    }
  }

  return DEFAULT_NAVBAR_GROUP_ICONS[group];
}

export type CategoryCardThemeKey =
  | 'sky'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'blue'
  | 'rose'
  | 'amber'
  | 'emerald'
  | 'indigo'
  | 'red';

export interface CategoryCardTheme {
  key: CategoryCardThemeKey;
  tag: string;
  topGradient: string;
  iconGlow: string;
  pillBorder: string;
  pillText: string;
  pillBg: string;
  hoverShadow: string;
  statusColor: string;
}

const CARD_THEME_PALETTES: Record<CategoryCardThemeKey, Omit<CategoryCardTheme, 'key' | 'tag'>> = {
  sky: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#22d3ee_0%,#0284c7_52%,#0c4a6e_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(12,74,110,0.65)]',
    pillBorder: 'border-[#0284c7]/75',
    pillText: 'text-[#0369a1]',
    pillBg: 'bg-sky-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(2,132,199,0.42)]',
    statusColor: 'text-[#0369a1]',
  },
  purple: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#a855f7_0%,#7e22ce_52%,#3b0764_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(59,7,100,0.65)]',
    pillBorder: 'border-[#7e22ce]/75',
    pillText: 'text-[#6b21a8]',
    pillBg: 'bg-purple-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(126,34,206,0.42)]',
    statusColor: 'text-[#6b21a8]',
  },
  orange: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#ea580c_0%,#c2410c_52%,#7c2d12_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(124,45,18,0.65)]',
    pillBorder: 'border-[#ea580c]/75',
    pillText: 'text-[#c2410c]',
    pillBg: 'bg-orange-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(234,88,12,0.42)]',
    statusColor: 'text-[#c2410c]',
  },
  teal: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#2dd4bf_0%,#0d9488_52%,#134e4a_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(19,78,74,0.65)]',
    pillBorder: 'border-[#0d9488]/75',
    pillText: 'text-[#0f766e]',
    pillBg: 'bg-teal-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(13,148,136,0.42)]',
    statusColor: 'text-[#0f766e]',
  },
  blue: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#3b82f6_0%,#1d4ed8_52%,#1e1b4b_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(30,27,75,0.65)]',
    pillBorder: 'border-[#2563eb]/75',
    pillText: 'text-[#1d4ed8]',
    pillBg: 'bg-blue-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(37,99,235,0.42)]',
    statusColor: 'text-[#1d4ed8]',
  },
  rose: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#fb7185_0%,#e11d48_52%,#881337_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(136,19,55,0.65)]',
    pillBorder: 'border-[#e11d48]/75',
    pillText: 'text-[#be123c]',
    pillBg: 'bg-rose-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(225,29,72,0.42)]',
    statusColor: 'text-[#be123c]',
  },
  red: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#ff5c5c_0%,#dc2626_52%,#7f1d1d_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(127,29,29,0.65)]',
    pillBorder: 'border-[#dc2626]/75',
    pillText: 'text-[#b91c1c]',
    pillBg: 'bg-rose-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(220,38,38,0.45)]',
    statusColor: 'text-[#b91c1c]',
  },
  amber: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#f59e0b_0%,#d97706_52%,#78350f_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(120,53,15,0.65)]',
    pillBorder: 'border-[#d97706]/75',
    pillText: 'text-[#b45309]',
    pillBg: 'bg-amber-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(217,119,6,0.42)]',
    statusColor: 'text-[#b45309]',
  },
  emerald: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#34d399_0%,#059669_52%,#064e3b_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(6,78,59,0.65)]',
    pillBorder: 'border-[#059669]/75',
    pillText: 'text-[#047857]',
    pillBg: 'bg-emerald-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(5,150,105,0.42)]',
    statusColor: 'text-[#047857]',
  },
  indigo: {
    topGradient: 'bg-[radial-gradient(circle_at_25%_20%,#818cf8_0%,#4f46e5_52%,#312e81_100%)]',
    iconGlow: 'shadow-[0_12px_24px_-6px_rgba(49,46,129,0.65)]',
    pillBorder: 'border-[#4f46e5]/75',
    pillText: 'text-[#4338ca]',
    pillBg: 'bg-indigo-50/90',
    hoverShadow: 'hover:shadow-[0_18px_36px_-12px_rgba(79,70,229,0.42)]',
    statusColor: 'text-[#4338ca]',
  },
};

const CYCLE_PALETTE_KEYS: ReadonlyArray<CategoryCardThemeKey> = [
  'sky',
  'purple',
  'orange',
  'teal',
  'blue',
  'rose',
  'emerald',
  'amber',
];

function resolveCategoryTag(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle' | 'navGroup'>
): string {
  const nameAndSlug = normalizeCategoryMatchText(`${cat.name || ''} ${cat.slug || ''}`);
  const navGroup = resolveCategoryNavGroup(cat);

  if (navGroup === 'hsc28') {
    if (includesAny(nameAndSlug, ['বিজ্ঞান', 'science'])) return 'HSC 28 · SCI';
    if (includesAny(nameAndSlug, ['মানবিক', 'humanities', 'arts'])) return 'HSC 28 · ARTS';
    if (includesAny(nameAndSlug, ['ব্যবসায়', 'ব্যবসা', 'ব্যাবসা', 'business'])) return 'HSC 28 · BUS';
    if (includesAny(nameAndSlug, ['bei'])) return 'HSC 28 · BEI';
    return 'HSC 28';
  }
  if (navGroup === 'hsc27') {
    if (includesAny(nameAndSlug, ['বিজ্ঞান', 'science'])) return 'HSC 27 · SCI';
    if (includesAny(nameAndSlug, ['মানবিক', 'humanities', 'arts'])) return 'HSC 27 · ARTS';
    if (includesAny(nameAndSlug, ['ব্যবসায়', 'ব্যবসা', 'ব্যাবসা', 'business'])) return 'HSC 27 · BUS';
    if (includesAny(nameAndSlug, ['bei'])) return 'HSC 27 · BEI';
    if (includesAny(nameAndSlug, ['শেষ মুহূর্ত', 'smp'])) return 'HSC 27 · SMP';
    return 'HSC 27';
  }
  if (navGroup === 'admission') {
    if (includesAny(nameAndSlug, ['মেডিকেল', 'medical'])) return 'MEDICAL';
    if (includesAny(nameAndSlug, ['ইঞ্জিনিয়ারিং', 'ইঞ্জিনিয়ারিং', 'engineering', 'বুয়েট', 'buet'])) {
      return 'ENGINEERING';
    }
    if (includesAny(nameAndSlug, ['বিশ্ববিদ্যালয়', 'বিশ্ববিদ্যালয়', 'university', 'ভার্সিটি', 'varsity'])) {
      return 'VARSITY';
    }
    return 'ADMISSION';
  }
  if (navGroup === 'school') {
    if (includesAny(nameAndSlug, ['class 5', 'class-5', '৫ম'])) return 'CLASS 5';
    if (includesAny(nameAndSlug, ['class 6', 'class-6', '৬ষ্ঠ'])) return 'CLASS 6';
    if (includesAny(nameAndSlug, ['class 7', 'class-7', '৭ম'])) return 'CLASS 7';
    if (includesAny(nameAndSlug, ['class 8', 'class-8', '৮ম'])) return 'CLASS 8';
    if (includesAny(nameAndSlug, ['class 9', 'class-9', '৯ম', 'ssc 28', 'ssc-28'])) return 'CLASS 9';
    if (includesAny(nameAndSlug, ['শেষ মুহূর্ত', 'smp'])) return 'SSC · SMP';
    if (includesAny(nameAndSlug, ['ssc 27', 'ssc-27', 'দশম', '১০ম'])) return 'SSC 27';
    return 'SSC · 6–10';
  }
  if (navGroup === 'skills' || includesAny(nameAndSlug, ['skill', 'স্কিল'])) {
    if (includesAny(nameAndSlug, ['ভাষা', 'language', 'spoken', 'english'])) return 'LANGUAGE';
    if (includesAny(nameAndSlug, ['ফ্রিল্যান্সিং', 'freelancing'])) return 'FREELANCING';
    if (includesAny(nameAndSlug, ['ডিজাইন', 'ক্রিয়েটিভ', 'ক্রিয়েটিভ', 'design', 'creative'])) {
      return 'DESIGN';
    }
    return 'SKILLS';
  }
  if (includesAny(nameAndSlug, ['free', 'ফ্রি'])) return 'FREE';
  return 'CATEGORY';
}

export function resolveCategoryCardTheme(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle' | 'badgeColor' | 'navGroup'>,
  index = 0
): CategoryCardTheme {
  const rawBadge = String(cat.badgeColor || 'red')
    .trim()
    .toLowerCase();
  const nameAndSlug = normalizeCategoryMatchText(`${cat.name || ''} ${cat.slug || ''}`);

  let themeKey: CategoryCardThemeKey;

  // Preserve explicit non-default badge colors chosen in Admin, while giving default 'red'
  // stream/group categories distinct vibrant palettes matching the Reference Icon cards.
  if (
    rawBadge !== 'red' &&
    Object.prototype.hasOwnProperty.call(CARD_THEME_PALETTES, rawBadge)
  ) {
    themeKey = rawBadge as CategoryCardThemeKey;
  } else if (includesAny(nameAndSlug, ['বিজ্ঞান', 'science'])) {
    themeKey = 'sky';
  } else if (includesAny(nameAndSlug, ['মানবিক', 'humanities', 'arts'])) {
    themeKey = 'purple';
  } else if (includesAny(nameAndSlug, ['ব্যবসায়', 'ব্যবসা', 'ব্যাবসা', 'business', 'commerce'])) {
    themeKey = 'orange';
  } else if (includesAny(nameAndSlug, ['bei'])) {
    themeKey = 'teal';
  } else if (includesAny(nameAndSlug, ['hsc 27', 'hsc-27'])) {
    themeKey = 'blue';
  } else if (includesAny(nameAndSlug, ['class 9', 'class-9', '৯ম', 'ssc 28', 'ssc-28'])) {
    themeKey = 'purple';
  } else if (includesAny(nameAndSlug, ['শেষ মুহূর্ত', 'smp'])) {
    themeKey = 'indigo';
  } else if (includesAny(nameAndSlug, ['মেডিকেল', 'medical', 'admission', 'এডমিশন', 'ভর্তি'])) {
    themeKey = 'rose';
  } else if (includesAny(nameAndSlug, ['বিশ্ববিদ্যালয়', 'বিশ্ববিদ্যালয়', 'university', 'ভার্সিটি'])) {
    themeKey = 'indigo';
  } else if (includesAny(nameAndSlug, ['ইঞ্জিনিয়ারিং', 'ইঞ্জিনিয়ারিং', 'engineering'])) {
    themeKey = 'orange';
  } else if (includesAny(nameAndSlug, ['ভাষা', 'language'])) {
    themeKey = 'purple';
  } else if (includesAny(nameAndSlug, ['ফ্রিল্যান্সিং', 'freelancing'])) {
    themeKey = 'emerald';
  } else if (includesAny(nameAndSlug, ['ডিজাইন', 'ক্রিয়েটিভ', 'ক্রিয়েটিভ', 'design', 'creative'])) {
    themeKey = 'rose';
  } else {
    themeKey = CYCLE_PALETTE_KEYS[index % CYCLE_PALETTE_KEYS.length];
  }

  return {
    key: themeKey,
    tag: resolveCategoryTag(cat),
    ...CARD_THEME_PALETTES[themeKey],
  };
}
