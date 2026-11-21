'use client';

import React, { useMemo, useState } from 'react';
import {
  Atom,
  BookOpen,
  Layers,
  LayoutGrid,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { Category, Course } from '../../../types.ts';
import { CourseCard } from '../CourseCard.tsx';
import { toBengaliNumber } from '../../../utils/format.ts';
import {
  courseMatchesCategorySlug,
  normalizeCategoryMatchText,
} from '../../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../../lib/courseSorting.ts';

type Hsc28ScienceFilterId = 'all' | 'pcmb' | 'bei' | 'full-bundle';

interface Hsc28ScienceCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

const HSC28_SCIENCE_FILTERS: ReadonlyArray<{
  id: Hsc28ScienceFilterId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব HSC 28 বিজ্ঞান কোর্স', Icon: LayoutGrid, alwaysVisible: true },
  { id: 'pcmb', label: 'PCMB (বিজ্ঞান বিষয়)', Icon: Atom },
  { id: 'bei', label: 'BEI (বাংলা, ইংরেজি ও ICT)', Icon: BookOpen },
  { id: 'full-bundle', label: 'পূর্ণাঙ্গ ফুল কোর্স', Icon: Layers },
];

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

function matchesHsc28ScienceFilter(course: Course, filterId: Hsc28ScienceFilterId): boolean {
  if (filterId === 'all') return true;
  const text = normalizeCategoryMatchText(
    `${course.title || ''} ${course.slug || ''} ${course.shortBadge || ''} ${course.headerSubtitle || ''} ${course.targetStudents || ''}`
  );
  switch (filterId) {
    case 'pcmb':
      return includesAny(text, ['pcmb', 'physics', 'chemistry', 'math', 'biology', 'পদার্থ', 'রসায়ন', 'গণিত', 'জীববিজ্ঞান', 'বিজ্ঞান']);
    case 'bei':
      return includesAny(text, ['bei', 'ইংরেজি', 'english', 'বাংলা', 'bangla', 'ict', 'আইসিটি']);
    case 'full-bundle':
      return includesAny(text, ['ফুল কোর্স', 'full course', 'cycle 1-4', 'কম্প্যাক্ট', 'পূর্ণাঙ্গ']);
    default:
      return true;
  }
}

export const Hsc28ScienceCategoryPage: React.FC<Hsc28ScienceCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const [activeFilter, setActiveFilter] = useState<Hsc28ScienceFilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const targetSlug = category?.slug || 'hsc-28-বিজ্ঞান-কোর্স';

  const hsc28Courses = useMemo(
    () =>
      sortCoursesForCategory(
        courses.filter((c) => courseMatchesCategorySlug(c, targetSlug)),
        targetSlug,
        categoryCourseOrders
      ),
    [courses, targetSlug, categoryCourseOrders]
  );

  const visibleFilters = useMemo(
    () =>
      HSC28_SCIENCE_FILTERS.map((f) => ({
        ...f,
        count:
          f.id === 'all'
            ? hsc28Courses.length
            : hsc28Courses.filter((c) => matchesHsc28ScienceFilter(c, f.id)).length,
      })).filter((f) => f.alwaysVisible || f.count > 0),
    [hsc28Courses]
  );

  const filteredCourses = useMemo(() => {
    const q = normalizeCategoryMatchText(searchQuery.trim());
    return hsc28Courses.filter((c) => {
      if (!matchesHsc28ScienceFilter(c, activeFilter)) return false;
      if (!q) return true;
      return normalizeCategoryMatchText(
        `${c.title} ${c.slug} ${c.shortBadge || ''} ${c.description || ''} ${c.targetStudents || ''}`
      ).includes(q);
    });
  }, [hsc28Courses, activeFilter, searchQuery]);

  const isFiltered = activeFilter !== 'all' || searchQuery.trim().length > 0;

  const resetAll = () => {
    setActiveFilter('all');
    setSearchQuery('');
  };

  const pageTitle = category?.name || 'HSC 28 বিজ্ঞান কোর্স';
  const pageSubtitle =
    category?.subtitle ||
    'HSC ২০২৮ বিজ্ঞান বিভাগের পদার্থবিজ্ঞান, রসায়ন, গণিত, জীববিজ্ঞান এবং বাংলা-ইংরেজি-ICT পূর্ণাঙ্গ প্রস্তুতি';

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

      {/* Unified Header & HSC 28 Science Filter Card */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-inset text-[#B91C1C] text-[11px] font-bold">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>HSC 28 বিজ্ঞান স্পেশাল</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-2xs">
                {isFiltered
                  ? `${toBengaliNumber(filteredCourses.length)} / ${toBengaliNumber(hsc28Courses.length)}টি কোর্স`
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
                placeholder="PCMB বা বিষয় খুঁজুন..."
                aria-label="HSC 28 বিজ্ঞান কোর্স অনুসন্ধান"
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

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label="HSC 28 বিজ্ঞান ফিল্টার">
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
        </div>
      </div>

      <section aria-label={pageTitle}>
        <h2 className="sr-only">{pageTitle} — কোর্স তালিকা</h2>
        {filteredCourses.length === 0 ? (
          <div className="glass-surface rounded-3xl p-10 text-center space-y-3 max-w-xl mx-auto">
            <h3 className="text-base font-bold text-[#2A0F12]">HSC 28 বিজ্ঞান ক্যাটাগরিতে এই ফিল্টারে কোনো কোর্স পাওয়া যায়নি</h3>
            <p className="text-xs text-[#6B4C4F]">সার্চ বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।</p>
            <button
              type="button"
              onClick={resetAll}
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>সব কোর্স দেখুন</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {filteredCourses.map((course) => (
              <div key={`cat-hsc28sci-${course.id}-${course.slug}`} className="h-full flex flex-col">
                <CourseCard course={course} onEnrollClick={onEnrollClick} headingLevel="h3" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
