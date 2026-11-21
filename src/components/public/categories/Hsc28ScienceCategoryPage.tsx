'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { Category, Course } from '../../../types.ts';
import { CourseCard } from '../CourseCard.tsx';
import { toBengaliNumber } from '../../../utils/format.ts';
import { courseMatchesCategorySlug } from '../../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../../lib/courseSorting.ts';
import {
  HSC28_ALL_FILTERS,
  filterHsc28ScienceCourses,
  toggleHsc28ScienceFilter,
  type Hsc28ScienceFilterId,
} from '../../../lib/hsc28ScienceFilters.ts';
import { Hsc28ScienceFilterBar } from './Hsc28ScienceFilterBar.tsx';

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
  const [selectedFilters, setSelectedFilters] = useState<Hsc28ScienceFilterId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const targetSlug = (category?.slug || 'hsc-28-বিজ্ঞান-কোর্স').normalize('NFC');

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
    () => filterHsc28ScienceCourses(hsc28Courses, selectedFilters, searchQuery),
    [hsc28Courses, selectedFilters, searchQuery]
  );

  const isFiltered = selectedFilters.length > 0 || searchQuery.trim().length > 0;

  const activeFilterLabels = useMemo(
    () =>
      selectedFilters
        .map((id) => HSC28_ALL_FILTERS.find((opt) => opt.id === id)?.label)
        .filter((label): label is string => Boolean(label)),
    [selectedFilters]
  );

  const handleToggleFilter = (filterId: Hsc28ScienceFilterId | 'all') => {
    setSelectedFilters((prev) => toggleHsc28ScienceFilter(prev, filterId));
  };

  const resetAll = () => {
    setSelectedFilters([]);
    setSearchQuery('');
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

      {/* Unified Warm Frosted Category Header & Multi-Filter Card */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 mb-6 sm:mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-inset text-[#B91C1C] text-[11px] sm:text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>ক্যাটাগরি পেজ</span>
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-2xs">
                {isFiltered
                  ? `${toBengaliNumber(filteredCourses.length)} / ${toBengaliNumber(hsc28Courses.length)}টি কোর্স পাওয়া গেছে`
                  : `${toBengaliNumber(filteredCourses.length)}টি কোর্স পাওয়া গেছে`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#2A0F12] tracking-tight leading-snug">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B4C4F] font-normal leading-relaxed mt-1 max-w-2xl">
              {pageSubtitle}
            </p>
          </div>

          {/* Search & Quick Reset */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-72">
              <Search
                className="w-4 h-4 text-[#E11D48] sm:text-[#7A5A5D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কোর্স খুঁজুন..."
                aria-label="HSC 28 বিজ্ঞান কোর্স অনুসন্ধান"
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/95 border border-rose-200/90 text-xs sm:text-sm text-[#2A0F12] placeholder-[#7A5A5D] focus:bg-white focus:border-[#E22B2B] outline-none transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="সার্চ মুছুন"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A5A5D] hover:text-[#B91C1C] p-0.5 rounded-md cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[#B91C1C] text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>রিসেট</span>
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-rose-100/85 my-4 sm:my-5" />

        {/* Dedicated HSC 28 Science Multi-Filter Bar */}
        <Hsc28ScienceFilterBar
          courses={hsc28Courses}
          selectedFilters={selectedFilters}
          onToggleFilter={handleToggleFilter}
          onResetAll={resetAll}
          hasSearchQuery={searchQuery.trim().length > 0}
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
                এই ফিল্টারে কোনো কোর্স পাওয়া যায়নি
              </h3>
              <p className="text-xs sm:text-sm text-[#6B4C4F] leading-relaxed">
                {activeFilterLabels.length > 0
                  ? `নির্বাচিত ফিল্টার (${activeFilterLabels.join(' + ')})${searchQuery.trim() ? ` ও "${searchQuery.trim()}" সার্চে` : ''} কোনো কোর্স মেলেনি।`
                  : 'আপনার সার্চ কীওয়ার্ড বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।'}
              </p>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 hover:opacity-95 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>সব ফিল্টার রিসেট করুন</span>
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
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
        )}
      </section>
    </div>
  );
};
