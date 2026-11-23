'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { Category, Course } from '../../../types.ts';
import { CourseCard } from '../CourseCard.tsx';
import { MobileCategoryCarousel } from '../MobileCategoryCarousel.tsx';
import { toBengaliNumber } from '../../../utils/format.ts';
import { courseMatchesCategorySlug } from '../../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../../lib/courseSorting.ts';
import {
  HSC28_ALL_FILTERS,
  filterHsc28ScienceCourses,
  type Hsc28ScienceFilterId,
} from '../../../lib/hsc28ScienceFilters.ts';
import { Hsc28ScienceFilterBar } from './Hsc28ScienceFilterBar.tsx';
import { useCategoryScrollIntoView } from '../../../lib/useCategoryScrollIntoView.ts';

interface Hsc28ScienceCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

export const Hsc28ScienceCategoryPage: React.FC<Hsc28ScienceCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<Hsc28ScienceFilterId | 'all'>('all');

  const targetSlug = (category?.slug || 'hsc-28-বিজ্ঞান-কোর্স').normalize('NFC');
  const categorySectionRef = useCategoryScrollIntoView<HTMLDivElement>(
    `hsc28-science-${targetSlug}`
  );

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
    () => filterHsc28ScienceCourses(hsc28Courses, selectedFilter),
    [hsc28Courses, selectedFilter]
  );

  const isFiltered = selectedFilter !== 'all';

  const activeFilterLabel = useMemo(() => {
    if (selectedFilter === 'all') return null;
    return HSC28_ALL_FILTERS.find((opt) => opt.id === selectedFilter)?.label || null;
  }, [selectedFilter]);

  const resetFilter = () => {
    setSelectedFilter('all');
  };

  const pageTitle = category?.name || 'HSC 28 বিজ্ঞান কোর্স';
  const pageSubtitle =
    category?.subtitle ||
    'কলেজ একাডেমিক প্রোগ্রাম — HSC 28 Science কোর্সে সর্বোচ্চ ডিসকাউন্টে ভর্তি হয়ে সম্পূর্ণ ও অধ্যায়ভিত্তিক প্রস্তুতি নিশ্চিত করুন।';

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

      {/* Unified Warm Frosted Category Header & Single-Line Filter Card */}
      <div
        ref={categorySectionRef}
        id="category-page-section"
        className="scroll-mt-24 sm:scroll-mt-28 glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7"
      >
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="min-w-0 max-w-3xl mx-auto flex flex-col items-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-inset text-[#B91C1C] text-[11px] sm:text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>ক্যাটাগরি পেজ</span>
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-2xs">
                {isFiltered
                  ? `${toBengaliNumber(filteredCourses.length)} / ${toBengaliNumber(hsc28Courses.length)}টি কোর্স পাওয়া গেছে`
                  : `${toBengaliNumber(filteredCourses.length)}টি কোর্স পাওয়া গেছে`}
              </span>
              {activeFilterLabel && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#B91C1C] border border-rose-200/90">
                  {activeFilterLabel}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#2A0F12] tracking-tight leading-snug text-center">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B4C4F] font-normal leading-relaxed mt-1 max-w-2xl mx-auto text-center">
              {pageSubtitle}
            </p>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={resetFilter}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-rose-200 bg-rose-50/90 hover:bg-rose-100 text-[#B91C1C] text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.97]"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>সব কোর্স দেখুন</span>
            </button>
          )}
        </div>

        <div className="border-t border-rose-100/85 my-3.5 sm:my-4" />

        {/* Single-Line, Single-Select Filter Bar */}
        <Hsc28ScienceFilterBar
          courses={hsc28Courses}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />
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
                {activeFilterLabel
                  ? `“${activeFilterLabel}” ফিল্টারে কোনো কোর্স পাওয়া যায়নি`
                  : 'এই ফিল্টারে কোনো কোর্স পাওয়া যায়নি'}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B4C4F] leading-relaxed">
                অন্য ফিল্টার নির্বাচন করুন অথবা সব কোর্স একসাথে দেখতে রিসেট করুন।
              </p>
            </div>
            <button
              type="button"
              onClick={resetFilter}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 hover:opacity-95 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>সব কোর্স দেখুন</span>
            </button>
          </motion.div>
        ) : (
          <>
            <MobileCategoryCarousel
              categorySlug={targetSlug}
              categoryName={pageTitle}
              courses={filteredCourses}
              onEnrollClick={onEnrollClick}
              headingLevel="h3"
            />
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-5 items-stretch">
              {filteredCourses.map((course) => (
                <motion.div
                  key={`cat-hsc28sci-${course.id}-${course.slug}`}
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
          </>
        )}
      </section>
    </div>
  );
};
