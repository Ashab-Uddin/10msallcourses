import React from 'react';
import {
  Trophy,
  Target,
  GraduationCap,
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
import {
  normalizeSelectorIconLabels,
  normalizeSelectorIconOrder,
  type SelectorIconId,
  type SelectorIconText,
} from '../../lib/selectorIconOrder.ts';

export interface SelectorIconDefinition {
  id: SelectorIconId;
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
    Icon: GraduationCap,
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

export function getOrderedSelectorIcons(
  orderedIds?: ReadonlyArray<string> | null,
  customLabels?: Partial<Record<string, Partial<SelectorIconText>>> | null
): SelectorIconDefinition[] {
  const normalized = normalizeSelectorIconOrder(orderedIds);
  const normalizedLabels = normalizeSelectorIconLabels(customLabels);
  return normalized
    .map((id) => {
      const def = SELECTOR_ICON_MAP.get(id);
      if (!def) return null;
      const custom = normalizedLabels[id];
      return {
        ...def,
        title: custom?.title || def.title,
        subLabel: custom?.subLabel || def.subLabel,
      };
    })
    .filter((item): item is SelectorIconDefinition => Boolean(item));
}
