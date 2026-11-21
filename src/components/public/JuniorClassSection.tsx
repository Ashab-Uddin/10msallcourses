'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, RotateCcw, Search, X } from 'lucide-react';
import type { Course } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  JUNIOR_CLASS_FILTERS,
  JUNIOR_CLASS_PAGE_META,
  filterJuniorClassCourses,
  type JuniorClassFilterId,
  type JuniorClassNumber5To8,
} from '../../lib/juniorClassFilters.ts';
import { JuniorClassFilterBar } from './JuniorClassFilterBar.tsx';
import { CourseCard } from './CourseCard.tsx';

interface JuniorClassSectionProps {
  classNum: JuniorClassNumber5To8;
  courses: Course[];
  breadcrumbParentLabel: string;
  onNavigateHome: () => void;
  onSwitchClass: (targetClassNum: JuniorClassNumber5To8) => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

const CLASS_SWITCH_ORDER: ReadonlyArray<JuniorClassNumber5To8> = [5, 6, 7, 8];

export const JuniorClassSection: React.FC<JuniorClassSectionProps> = ({
  classNum,
  courses,
  breadcrumbParentLabel,
  onNavigateHome,
  onSwitchClass,
  onEnrollClick,
}) => {
  const meta = JUNIOR_CLASS_PAGE_META[classNum];
  const classKey = meta.slug;

  const [filterOverride, setFilterOverride] = useState<{
    key: string;
    filter: JuniorClassFilterId;
  } | null>(null);
  const [searchOverride, setSearchOverride] = useState<{
    key: string;
    query: string;
  } | null>(null);

  const selectedFilter: JuniorClassFilterId =
    filterOverride?.key === classKey ? filterOverride.filter : 'all';
  const searchQuery =
    searchOverride?.key === classKey ? searchOverride.query : '';

  const setSelectedFilter = (filter: JuniorClassFilterId) => {
    setFilterOverride({ key: classKey, filter });
  };

  const setSearchQuery = (query: string) => {
    setSearchOverride({ key: classKey, query });
  };

  const handleResetFilters = () => {
    setFilterOverride({ key: classKey, filter: 'all' });
    setSearchOverride({ key: classKey, query: '' });
  };

  const filteredCourses = useMemo(
    () => filterJuniorClassCourses(courses, selectedFilter, searchQuery),
    [courses, selectedFilter, searchQuery]
  );

  const activeFilterDef = useMemo(
    () => JUNIOR_CLASS_FILTERS.find((f) => f.id === selectedFilter),
    [selectedFilter]
  );

  const isFilterActive =
    selectedFilter !== 'all' || searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen pb-28 md:pb-16">
      {/* HEADER + CENTERED DESCRIPTION + CENTERED FILTER STRIP */}
      <section className="relative pt-6 sm:pt-8 pb-6 sm:pb-8 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-6 sm:mb-7 flex-wrap"
          >
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-[#E22B2B] transition-colors cursor-pointer"
            >
              হোম
            </button>
            <span className="text-rose-300" aria-hidden="true">/</span>
            <span className="text-[#6B4C4F]">{breadcrumbParentLabel}</span>
            <span className="text-rose-300" aria-hidden="true">/</span>
            <span className="text-[#B91C1C] font-bold">{meta.label}</span>
          </nav>

          {/* Centered Class Heading + Underline + Description */}
          <div className="text-center max-w-full mx-auto mb-5 sm:mb-7">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2A0F12] tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] via-rose-600 to-[#B91C1C]">
                {meta.label}
              </span>
            </h1>

            <div
              aria-hidden="true"
              className="w-24 sm:w-32 h-[3px] mx-auto rounded-full bg-gradient-to-r from-[#ff5252] via-[#E22B2B] to-[#b91c1c] mt-2.5 mb-3.5"
            />

            <p className="text-xs sm:text-[13px] xl:text-[14px] text-[#6B4C4F] font-normal leading-relaxed max-w-2xl lg:max-w-none lg:whitespace-nowrap mx-auto">
              {meta.description}
            </p>
          </div>

          {/* 1. COURSE LIST CARD (Top: Class 5–8 Quick Switcher, Active Count & Search) */}
          <div className="glass-surface rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 mb-3 sm:mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
            {/* Left: Count + Quick Class 5–8 Switcher */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[#2A0F12] tracking-tight">
                  {meta.label} কোর্স তালিকা
                </h2>
                {selectedFilter !== 'all' && activeFilterDef && (
                  <span className="text-[11px] font-bold text-[#B91C1C] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    {activeFilterDef.label}
                  </span>
                )}
                <span className="text-[11px] font-extrabold text-[#B91C1C] bg-white/90 border border-rose-200/80 px-2.5 py-0.5 rounded-full tabular-nums bn-digits-fix">
                  {toBengaliNumber(filteredCourses.length)}টি কোর্স
                </span>
              </div>

              <span
                aria-hidden="true"
                className="hidden sm:inline-block w-px h-4 bg-rose-200/80"
              />

              {/* Quick Class 5-8 Switcher */}
              <div
                className="flex items-center gap-1 flex-wrap"
                role="navigation"
                aria-label="অন্যান্য শ্রেণি নির্বাচন"
              >
                {CLASS_SWITCH_ORDER.map((cNum) => {
                  const cMeta = JUNIOR_CLASS_PAGE_META[cNum];
                  const isCurrent = cNum === classNum;
                  return (
                    <button
                      key={cMeta.slug}
                      type="button"
                      onClick={() => {
                        if (!isCurrent) onSwitchClass(cNum);
                      }}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                        isCurrent
                          ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-xs'
                          : 'border-rose-200/80 bg-white/85 text-[#4A2528] hover:border-[#E22B2B]/60 hover:text-[#B91C1C]'
                      }`}
                    >
                      {cMeta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Search & Reset */}
            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
              <div className="relative flex-1 lg:w-64">
                <Search
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-[#E11D48] sm:text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="কোর্সের নাম বা বিষয় খুঁজুন..."
                  aria-label={`${meta.label} কোর্স অনুসন্ধান`}
                  className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white/90 border border-rose-200/85 text-xs text-[#2A0F12] placeholder-[#7A5A5D] focus:bg-white focus:border-[#eb1c24] focus:ring-2 focus:ring-red-500/10 outline-none transition"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="সার্চ মুছুন"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A5A5D] hover:text-[#B91C1C] p-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/90 hover:bg-rose-100 text-[#B91C1C] text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>রিসেট</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. FILTER CARD (Below Course List Card, Single-Line Strip) */}
          <JuniorClassFilterBar
            classLabel={meta.label}
            courses={courses}
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
          />
        </div>
      </section>

      {/* COURSE GRID / EMPTY STATE */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-1 sm:pt-2">

        {/* Courses Grid / Empty State */}
        {filteredCourses.length === 0 ? (
          <div className="glass-surface rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl glass-inset text-[#E22B2B] flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#2A0F12]">
                {selectedFilter !== 'all' && activeFilterDef
                  ? `“${activeFilterDef.label}” ফিল্টারে ${meta.label}-এর কোনো কোর্স পাওয়া যায়নি`
                  : `${meta.label}-এ কোনো কোর্স পাওয়া যায়নি`}
              </h3>
              <p className="text-xs text-[#6B4C4F] leading-relaxed">
                অন্য ক্যাটাগরি ফিল্টার নির্বাচন করুন অথবা সব কোর্স একসাথে দেখতে ফিল্টার রিসেট করুন।
              </p>
            </div>
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-md shadow-red-500/20 hover:opacity-95 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>সব কোর্স দেখুন</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {filteredCourses.map((course) => (
              <div
                key={`junior-class-${classNum}-course-${course.id}-${course.slug}`}
                className="h-full flex flex-col"
              >
                <CourseCard
                  course={course}
                  onEnrollClick={onEnrollClick}
                  headingLevel="h3"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
