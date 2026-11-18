'use client';

import React, { useMemo } from 'react';
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
import { Category } from '../../types.ts';

interface ClassSelectorStripProps {
  onNavigate: (path: string) => void;
  categories?: Category[];
}

interface BatchCardItem {
  id: string;
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

const BATCH_ITEMS: BatchCardItem[] = [
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

export const ClassSelectorStrip: React.FC<ClassSelectorStripProps> = ({
  onNavigate,
  categories = [],
}) => {
  const categoryBySlug = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of categories) {
      map.set(cat.slug, cat);
    }
    return map;
  }, [categories]);

  return (
    <div className="wrap relative z-20 mt-6">
      {/* Section Strip Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E22B2B] animate-ping" />
          <span className="text-xs font-extrabold text-[#B91C1C]">
            ইন্টারেক্টিভ ক্লাস সিলেক্টর ও লাইভ ব্যাচ
          </span>
        </div>
        <span className="text-[11px] text-[#6B4C4F] hidden sm:inline-block">
          সরাসরি কাঙ্ক্ষিত ব্যাচ নির্বাচনে ক্লিক করুন
        </span>
      </div>

      {/* Frosted Glass Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 p-3.5 sm:p-5 rounded-3xl glass-surface">
        {BATCH_ITEMS.map((item) => {
          const IconComponent = item.Icon;
          const linkedCategory = item.categorySlug
            ? categoryBySlug.get(item.categorySlug)
            : undefined;
          return (
            <button
              key={item.id}
              type="button"
              data-category-id={linkedCategory?.id ?? undefined}
              data-category-slug={item.categorySlug}
              onClick={() => onNavigate(item.path)}
              className="group flex flex-col items-center cursor-pointer text-left focus:outline-none"
            >
              {/* Split S-Wave Glass Card matching structural archetype */}
              <div
                className={`relative w-full rounded-[22px] overflow-hidden border border-white/90 bg-white/80 backdrop-blur-xl shadow-[0_10px_28px_-10px_rgba(185,28,28,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ${item.hoverShadow} group-hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 flex flex-col`}
              >
                {/* TOP RICH 3D COLOR STAGE */}
                <div
                  className={`relative w-full h-[112px] sm:h-[122px] ${item.topGradient} flex flex-col items-center justify-center px-3 pb-5 pt-3 overflow-hidden`}
                >
                  {/* Specular top-left glass sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-45"
                    style={{
                      background:
                        'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 55%)',
                    }}
                  />

                  {/* Compact Batch Code Tag at top-left */}
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-black tracking-wider text-white/95 bg-black/20 backdrop-blur-md border border-white/25 px-2 py-0.5 rounded-full">
                    {item.tag}
                  </span>

                  {/* Centered 3D Frosted Icon Medallion */}
                  <div
                    className={`relative z-10 mt-2 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${item.iconGlow} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}
                  >
                    <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] drop-shadow-sm" />
                  </div>

                  {/* Rising Frosted S-Curve Wave Divider */}
                  <svg
                    viewBox="0 0 240 42"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 w-full h-[30px] pointer-events-none block"
                  >
                    <path
                      d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                      fill="rgba(255, 255, 255, 0.90)"
                    />
                  </svg>
                </div>

                {/* BOTTOM FROSTED GLASS WAVE ZONE WITH OUTLINED PILL TITLE */}
                <div className="relative bg-white/90 backdrop-blur-md px-2.5 pt-1 pb-3.5 flex flex-col items-center justify-center shadow-[inset_0_-6px_12px_rgba(185,28,28,0.05)]">
                  <div
                    className={`w-full rounded-full border-[1.5px] ${item.pillBorder} ${item.pillBg} px-2.5 py-1.5 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),0_2px_6px_-2px_rgba(0,0,0,0.06)] group-hover:scale-[1.03] transition-transform duration-200`}
                  >
                    <span
                      className={`block font-black text-xs sm:text-[13.5px] tracking-tight leading-tight whitespace-nowrap ${item.pillText}`}
                    >
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clean Live Batch Caption below card */}
              <span
                className={`mt-2 text-[11px] font-bold whitespace-nowrap ${item.statusColor} opacity-90 group-hover:opacity-100 transition-opacity`}
              >
                {item.subLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
