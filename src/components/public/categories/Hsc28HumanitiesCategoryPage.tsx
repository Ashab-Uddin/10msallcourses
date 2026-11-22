'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { BookOpen, RotateCcw, Sparkles } from 'lucide-react';
import type { Category, Course } from '../../../types.ts';
import { CourseCard } from '../CourseCard.tsx';
import { courseMatchesCategorySlug } from '../../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../../lib/courseSorting.ts';
import {
  HSC28_HUMANITIES_ALL_FILTERS,
  filterHsc28HumanitiesCourses,
  toggleHsc28HumanitiesFilter,
  type Hsc28HumanitiesFilterId,
} from '../../../lib/hsc28HumanitiesFilters.ts';
import {
  updateCurrentSearchParams,
  useBrowserLocation,
} from '../../../lib/universalNavigation.ts';
import { Hsc28HumanitiesFilterBar } from './Hsc28HumanitiesFilterBar.tsx';
import { ScienceBackdropAccent } from '../ScienceBackdropAccent.tsx';

interface Hsc28HumanitiesCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

export const Hsc28HumanitiesCategoryPage: React.FC<Hsc28HumanitiesCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const browserLoc = useBrowserLocation();
  const selectedFilter: Hsc28HumanitiesFilterId | 'all' = useMemo(() => {
    const raw = new URLSearchParams(browserLoc.search || '').get('filter');
    if (raw && HSC28_HUMANITIES_ALL_FILTERS.some((opt) => opt.id === raw)) {
      return raw as Hsc28HumanitiesFilterId;
    }
    return 'all';
  }, [browserLoc.search]);

  const targetSlug = (category?.slug || 'hsc-28-মানবিক-কোর্স').normalize('NFC');

  const hsc28Courses = useMemo(
    () =>
      sortCoursesForCategory(
        courses.filter((c) => courseMatchesCategorySlug(c, targetSlug)),
        targetSlug,
        categoryCourseOrders
      ),
    [courses, targetSlug, categoryCourseOrders]
  );

  const filteredCourses = useMemo(
    () => filterHsc28HumanitiesCourses(hsc28Courses, selectedFilter),
    [hsc28Courses, selectedFilter]
  );

  const activeFilterLabel = useMemo(
    () =>
      selectedFilter === 'all'
        ? null
        : HSC28_HUMANITIES_ALL_FILTERS.find((opt) => opt.id === selectedFilter)?.label || null,
    [selectedFilter]
  );

  const handleSelectFilter = (filterId: Hsc28HumanitiesFilterId | 'all') => {
    const nextFilter = toggleHsc28HumanitiesFilter(selectedFilter, filterId);
    if (nextFilter === selectedFilter) return;
    updateCurrentSearchParams(
      { filter: nextFilter === 'all' ? null : nextFilter },
      { push: true, noScroll: true }
    );
  };

  const resetAll = () => {
    if (selectedFilter === 'all') return;
    updateCurrentSearchParams({ filter: null }, { push: true, noScroll: true });
  };

  const pageBadge = 'HSC 28 একাডেমিক অনলাইন প্রোগ্রাম';
  const pageTitle = category?.name || 'HSC 28 মানবিক কোর্স';
  const pageSubtitle =
    'HSC ২০২৮ ব্যাচ (মানবিক বিভাগ) এর সম্পূর্ণ সাইকেল কভারেজ ও ফুল ইয়ার লাইভ ক্লাস।';
  const titleWords = pageTitle.trim().split(/\s+/);
  const titleLead = titleWords[0] || pageTitle;
  const titleRest = titleWords.slice(1).join(' ');

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-5 flex-wrap"
      >
        <button
          type="button"
          onClick={onBack}
          className="hover:text-[#E22B2B] transition-colors cursor-pointer"
        >
          হোম
        </button>
        <span className="text-rose-300" aria-hidden="true">/</span>
        <span>কোর্স ক্যাটালগ</span>
        <span className="text-rose-300" aria-hidden="true">/</span>
        <span className="text-[#B91C1C] font-bold">{pageTitle}</span>
      </nav>

      {/* Unified Warm Frosted Category Header & 2-Row Equal Filter Card */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7 relative overflow-hidden">
        <div className="relative py-1 sm:py-2 flex flex-col items-center justify-center text-center">
          <ScienceBackdropAccent variant="humanities" layout="symmetrical" />

          <div className="relative z-10 min-w-0 max-w-3xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-inset text-[#B91C1C] text-[11px] sm:text-xs font-bold mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E22B2B] shrink-0" aria-hidden="true" />
              <span>{pageBadge}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-[42px] font-black text-[#2A0F12] tracking-tight leading-tight text-center mb-2">
              {titleLead}
              {titleRest ? (
                <>
                  {' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] via-rose-600 to-[#B91C1C]">
                    {titleRest}
                  </span>
                </>
              ) : null}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-[#6B4C4F] font-normal leading-relaxed max-w-2xl mx-auto text-center">
              {pageSubtitle}
            </p>
          </div>
        </div>

        <div className="relative z-10 border-t border-rose-100/85 my-4" />

        {/* Dedicated HSC 28 Humanities 2-Line Equal, Single-Select Filter Bar */}
        <div className="relative z-10">
          <Hsc28HumanitiesFilterBar
            courses={hsc28Courses}
            selectedFilter={selectedFilter}
            onSelectFilter={handleSelectFilter}
            onResetAll={resetAll}
          />
        </div>
      </div>

      {/* Course Grid / Empty State */}
      <section aria-label={pageTitle}>
        <h2 className="sr-only">{pageTitle} — কোর্স তালিকা</h2>

        {filteredCourses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-surface rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl glass-inset text-[#E22B2B] flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-[#2A0F12]">
                এই ফিল্টারে কোনো কোর্স পাওয়া যায়নি
              </h3>
              <p className="text-xs sm:text-sm text-[#6B4C4F] leading-relaxed">
                {activeFilterLabel
                  ? `নির্বাচিত ফিল্টার (${activeFilterLabel})-এ এই মুহূর্তে কোনো কোর্স মেলেনি।`
                  : 'অনুগ্রহ করে অন্য একটি ফিল্টার নির্বাচন করে চেষ্টা করুন।'}
              </p>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 hover:opacity-95 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>সব কোর্স দেখুন</span>
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {filteredCourses.map((course) => (
              <motion.div
                key={`cat-hsc28hum-${course.id}-${course.slug}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="h-full flex flex-col"
              >
                <CourseCard
                  course={course}
                  onEnrollClick={onEnrollClick}
                  headingLevel="h3"
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
