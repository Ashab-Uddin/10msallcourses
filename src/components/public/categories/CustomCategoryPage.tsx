'use client';

import React, { useMemo, useState } from 'react';
import {
  Flame,
  LayoutGrid,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import type { Category, Course } from '../../../types.ts';
import { CourseCard } from '../CourseCard.tsx';
import { AutoScrollFilterTrack } from '../AutoScrollFilterTrack.tsx';
import { toBengaliNumber } from '../../../utils/format.ts';
import {
  courseMatchesCategorySlug,
  normalizeCategoryMatchText,
} from '../../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../../lib/courseSorting.ts';

type CustomFilterId = 'all' | 'popular' | 'under2500' | '2500to5000' | 'above5000';

interface CustomCategoryPageProps {
  categorySlug: string;
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

const CUSTOM_FILTERS: ReadonlyArray<{
  id: CustomFilterId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব কোর্স', Icon: LayoutGrid, alwaysVisible: true },
  { id: 'popular', label: 'জনপ্রিয় কোর্স', Icon: Flame },
  { id: 'under2500', label: '৳২,৫০০ এর মধ্যে', Icon: Tag },
  { id: '2500to5000', label: '৳২,৫০০ – ৳৫,০০০', Icon: Tag },
  { id: 'above5000', label: '৳৫,০০০+', Icon: Tag },
];

function matchesCustomFilter(course: Course, filterId: CustomFilterId): boolean {
  switch (filterId) {
    case 'all':
      return true;
    case 'popular':
      return Boolean(course.isPopular);
    case 'under2500':
      return course.discountPrice <= 2500;
    case '2500to5000':
      return course.discountPrice > 2500 && course.discountPrice <= 5000;
    case 'above5000':
      return course.discountPrice > 5000;
    default:
      return true;
  }
}

export const CustomCategoryPage: React.FC<CustomCategoryPageProps> = ({
  categorySlug,
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const [activeFilter, setActiveFilter] = useState<CustomFilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const scopedCourses = useMemo(
    () =>
      sortCoursesForCategory(
        courses.filter((c) => courseMatchesCategorySlug(c, categorySlug)),
        categorySlug,
        categoryCourseOrders
      ),
    [courses, categorySlug, categoryCourseOrders]
  );

  const visibleFilters = useMemo(
    () =>
      CUSTOM_FILTERS.map((f) => ({
        ...f,
        count:
          f.id === 'all'
            ? scopedCourses.length
            : scopedCourses.filter((c) => matchesCustomFilter(c, f.id)).length,
      })).filter((f) => f.alwaysVisible || f.count > 0),
    [scopedCourses]
  );

  const filteredCourses = useMemo(() => {
    const q = normalizeCategoryMatchText(searchQuery.trim());
    return scopedCourses.filter((c) => {
      if (!matchesCustomFilter(c, activeFilter)) return false;
      if (!q) return true;
      return normalizeCategoryMatchText(
        `${c.title} ${c.slug} ${c.shortBadge || ''} ${c.description || ''} ${c.targetStudents || ''}`
      ).includes(q);
    });
  }, [scopedCourses, activeFilter, searchQuery]);

  const isFiltered = activeFilter !== 'all' || searchQuery.trim().length > 0;

  const resetAll = () => {
    setActiveFilter('all');
    setSearchQuery('');
  };

  const pageTitle = category?.name || categorySlug;
  const pageSubtitle =
    category?.subtitle || 'এই ক্যাটাগরির সকল অনলাইন কোর্স ও লাইভ ব্যাচসমূহ';

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-5">
        <button type="button" onClick={onBack} className="hover:text-[#E22B2B] transition-colors cursor-pointer">
          হোম
        </button>
        <span className="text-rose-300" aria-hidden="true">/</span>
        <span>কোর্স ক্যাটালগ</span>
        <span className="text-rose-300" aria-hidden="true">/</span>
        <span className="text-[#B91C1C] font-bold">{pageTitle}</span>
      </nav>

      {/* Unified Header & Category Filter Card */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-inset text-[#B91C1C] text-[11px] font-bold">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>ক্যাটাগরি পেজ</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-2xs">
                {isFiltered
                  ? `${toBengaliNumber(filteredCourses.length)} / ${toBengaliNumber(scopedCourses.length)}টি কোর্স`
                  : `${toBengaliNumber(filteredCourses.length)}টি কোর্স`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black text-[#2A0F12] tracking-tight leading-snug">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B4C4F] font-normal leading-relaxed mt-1 max-w-2xl">
              {pageSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-72">
              <Search className="w-3.5 h-3.5 text-[#E11D48] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="এই ক্যাটাগরির কোর্স খুঁজুন..."
                aria-label={`${pageTitle} কোর্স অনুসন্ধান`}
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/95 border border-rose-200/85 text-xs text-[#2A0F12] placeholder-[#7A5A5D] focus:bg-white focus:border-[#eb1c24] outline-none transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="সার্চ মুছুন"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A5A5D] hover:text-[#B91C1C] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[#B91C1C] text-xs font-bold transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-rose-100/85 my-3.5 sm:my-4" />

        <AutoScrollFilterTrack
          className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-visible no-scrollbar py-0.5 lg:py-0"
          role="group"
          ariaLabel={`${pageTitle} ফিল্টারসমূহ`}
        >
          {visibleFilters.map(({ id, label, Icon, count }) => {
            const active = activeFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveFilter(id)}
                aria-pressed={active}
                className={`min-h-[36px] sm:min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border active:scale-[0.97] ${
                  active
                    ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_6px_14px_-4px_rgba(185,28,28,0.4)]'
                    : 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/70 hover:text-[#B91C1C] shadow-2xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-[#E22B2B]'}`} />
                <span>{label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold tabular-nums bn-digits-fix ${
                    active ? 'bg-black/20 text-white' : 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
                  }`}
                >
                  {toBengaliNumber(count)}
                </span>
              </button>
            );
          })}
        </AutoScrollFilterTrack>
      </div>

      <section aria-label={pageTitle}>
        <h2 className="sr-only">{pageTitle} — কোর্স তালিকা</h2>
        {filteredCourses.length === 0 ? (
          <div className="glass-surface rounded-3xl p-10 text-center space-y-3 max-w-xl mx-auto">
            <h3 className="text-base font-bold text-[#2A0F12]">এই ক্যাটাগরিতে কোনো কোর্স পাওয়া যায়নি</h3>
            <p className="text-xs text-[#6B4C4F]">সার্চ বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।</p>
            {isFiltered && (
              <button
                type="button"
                onClick={resetAll}
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>সব কোর্স দেখুন</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {filteredCourses.map((course) => (
              <div key={`cat-custom-${categorySlug}-${course.id}-${course.slug}`} className="h-full flex flex-col">
                <CourseCard course={course} onEnrollClick={onEnrollClick} headingLevel="h3" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
