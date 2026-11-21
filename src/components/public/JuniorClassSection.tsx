'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, RotateCcw } from 'lucide-react';
import type { Course } from '../../types.ts';
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
  onEnrollClick: (course: Course, referrer: string) => void;
}

export const JuniorClassSection: React.FC<JuniorClassSectionProps> = ({
  classNum,
  courses,
  breadcrumbParentLabel,
  onNavigateHome,
  onEnrollClick,
}) => {
  const meta = JUNIOR_CLASS_PAGE_META[classNum];
  const classKey = meta.slug;

  const [filterOverride, setFilterOverride] = useState<{
    key: string;
    filter: JuniorClassFilterId;
  } | null>(null);

  const selectedFilter: JuniorClassFilterId =
    filterOverride?.key === classKey ? filterOverride.filter : 'all';

  const setSelectedFilter = (filter: JuniorClassFilterId) => {
    setFilterOverride({ key: classKey, filter });
  };

  const handleResetFilters = () => {
    setFilterOverride({ key: classKey, filter: 'all' });
  };

  const filteredCourses = useMemo(
    () => filterJuniorClassCourses(courses, selectedFilter),
    [courses, selectedFilter]
  );

  const activeFilterDef = useMemo(
    () => JUNIOR_CLASS_FILTERS.find((f) => f.id === selectedFilter),
    [selectedFilter]
  );

  const isFilterActive = selectedFilter !== 'all';

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

          {/* FILTER CARD (Single-Line Strip) */}
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
