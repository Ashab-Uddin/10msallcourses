'use client';

import React, { useMemo, useState } from 'react';
import {
  Atom,
  BookOpen,
  Briefcase,
  Flame,
  GraduationCap,
  Layers,
  LayoutGrid,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { Category, Course, CourseGroupKey } from '../../../types.ts';
import { CourseCard } from '../CourseCard.tsx';
import { AutoScrollFilterTrack } from '../AutoScrollFilterTrack.tsx';
import { toBengaliNumber } from '../../../utils/format.ts';
import {
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
  normalizeCategoryMatchText,
  resolveCourseDepartments,
} from '../../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../../lib/courseSorting.ts';

type HscBatchId = 'all' | 'hsc-28' | 'hsc-27' | 'hsc-26';
type HscDeptId = 'all' | CourseGroupKey;
type HscTypeId = 'all' | 'cycle-full' | 'last-moment' | 'admission-prep';

interface HscCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

const HSC_BATCHES: ReadonlyArray<{
  id: HscBatchId;
  label: string;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব ব্যাচ', alwaysVisible: true },
  { id: 'hsc-28', label: 'HSC 28 (১ম বর্ষ)' },
  { id: 'hsc-27', label: 'HSC 27 (২য় বর্ষ)' },
  { id: 'hsc-26', label: 'HSC 26 (পরীক্ষার্থী)' },
];

const HSC_DEPARTMENTS: ReadonlyArray<{
  id: HscDeptId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সকল বিভাগ', Icon: LayoutGrid, alwaysVisible: true },
  { id: 'science', label: 'বিজ্ঞান (Science)', Icon: Atom },
  { id: 'business', label: 'ব্যবসায় শিক্ষা', Icon: Briefcase },
  { id: 'humanities', label: 'মানবিক (Humanities)', Icon: BookOpen },
];

const HSC_TYPES: ReadonlyArray<{
  id: HscTypeId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব ধরন', Icon: LayoutGrid, alwaysVisible: true },
  { id: 'cycle-full', label: 'সাইকেল ও ফুল কোর্স', Icon: Layers },
  { id: 'last-moment', label: 'শেষ মুহূর্তের প্রস্তুতি', Icon: Flame },
  { id: 'admission-prep', label: 'এডমিশন ও মডেল টেস্ট', Icon: GraduationCap },
];

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

function matchesHscType(course: Course, typeId: HscTypeId): boolean {
  if (typeId === 'all') return true;
  const text = normalizeCategoryMatchText(
    `${course.title || ''} ${course.slug || ''} ${course.shortBadge || ''} ${course.headerSubtitle || ''} ${course.targetStudents || ''}`
  );
  switch (typeId) {
    case 'cycle-full':
      return includesAny(text, ['সাইকেল', 'cycle', 'ফুল কোর্স', 'full course', 'সম্পূর্ণ সিলেবাস', 'পূর্ণাঙ্গ']);
    case 'last-moment':
      return includesAny(text, ['শেষ মুহূর্ত', 'ফাইনাল রিভিশন', 'ওয়ান শট', 'one shot', 'টেস্ট পেপার', 'test paper', 'সাজেশন']);
    case 'admission-prep':
      return includesAny(text, ['এডমিশন', 'admission', 'ভার্সিটি', 'varsity', 'মেডিকেল', 'বুয়েট', 'মডেল টেস্ট']);
    default:
      return true;
  }
}

export const HscCategoryPage: React.FC<HscCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const [batchFilter, setBatchFilter] = useState<HscBatchId>('all');
  const [deptFilter, setDeptFilter] = useState<HscDeptId>('all');
  const [typeFilter, setTypeFilter] = useState<HscTypeId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const hscCourses = useMemo(
    () =>
      sortCoursesForCategory(
        courses.filter((c) => courseMatchesCategorySlug(c, 'hsc')),
        'hsc',
        categoryCourseOrders
      ),
    [courses, categoryCourseOrders]
  );

  const visibleBatches = useMemo(
    () =>
      HSC_BATCHES.map((b) => ({
        ...b,
        count:
          b.id === 'all'
            ? hscCourses.length
            : hscCourses.filter((c) => courseMatchesAcademicBatch(c, b.id)).length,
      })).filter((b) => b.alwaysVisible || b.count > 0),
    [hscCourses]
  );

  const visibleDepartments = useMemo(() => {
    const batchScoped =
      batchFilter === 'all'
        ? hscCourses
        : hscCourses.filter((c) => courseMatchesAcademicBatch(c, batchFilter));
    return HSC_DEPARTMENTS.map((d) => ({
      ...d,
      count:
        d.id === 'all'
          ? batchScoped.length
          : batchScoped.filter((c) => resolveCourseDepartments(c).includes(d.id as CourseGroupKey))
              .length,
    })).filter((d) => d.alwaysVisible || d.count > 0);
  }, [hscCourses, batchFilter]);

  const visibleTypes = useMemo(() => {
    const scoped = hscCourses.filter((c) => {
      if (batchFilter !== 'all' && !courseMatchesAcademicBatch(c, batchFilter)) return false;
      if (deptFilter !== 'all' && !resolveCourseDepartments(c).includes(deptFilter)) return false;
      return true;
    });
    return HSC_TYPES.map((t) => ({
      ...t,
      count:
        t.id === 'all'
          ? scoped.length
          : scoped.filter((c) => matchesHscType(c, t.id)).length,
    })).filter((t) => t.alwaysVisible || t.count > 0);
  }, [hscCourses, batchFilter, deptFilter]);

  const filteredCourses = useMemo(() => {
    const q = normalizeCategoryMatchText(searchQuery.trim());
    return hscCourses.filter((c) => {
      if (batchFilter !== 'all' && !courseMatchesAcademicBatch(c, batchFilter)) return false;
      if (deptFilter !== 'all' && !resolveCourseDepartments(c).includes(deptFilter)) return false;
      if (!matchesHscType(c, typeFilter)) return false;
      if (!q) return true;
      return normalizeCategoryMatchText(
        `${c.title} ${c.slug} ${c.shortBadge || ''} ${c.description || ''} ${c.targetStudents || ''}`
      ).includes(q);
    });
  }, [hscCourses, batchFilter, deptFilter, typeFilter, searchQuery]);

  const isFiltered =
    batchFilter !== 'all' ||
    deptFilter !== 'all' ||
    typeFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const resetAll = () => {
    setBatchFilter('all');
    setDeptFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
  };

  const pageTitle = category?.name || 'HSC অনলাইন ব্যাচ';
  const pageSubtitle =
    category?.subtitle ||
    'HSC ২৬, ২৭ ও ২৮ ব্যাচের বিজ্ঞান, ব্যবসায় শিক্ষা ও মানবিক বিভাগের পূর্ণাঙ্গ সাইকেল ও লাইভ ক্লাস';

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

      {/* Unified Header & HSC Filter Card */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-inset text-[#B91C1C] text-[11px] font-bold">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>এইচএসসি (HSC) স্পেশাল</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-2xs">
                {isFiltered
                  ? `${toBengaliNumber(filteredCourses.length)} / ${toBengaliNumber(hscCourses.length)}টি কোর্স`
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
                placeholder="HSC বিষয় বা ব্যাচ খুঁজুন..."
                aria-label="HSC কোর্স অনুসন্ধান"
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

        <div className="space-y-3">
          {/* Batch Row */}
          {visibleBatches.length > 1 && (
            <AutoScrollFilterTrack
              className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-visible no-scrollbar py-0.5 lg:py-0"
              role="group"
              ariaLabel="HSC ব্যাচ ফিল্টার"
            >
              <span className="text-[11px] font-bold text-[#6B4C4F] mr-1 shrink-0 whitespace-nowrap">ব্যাচ:</span>
              {visibleBatches.map(({ id, label, count }) => {
                const active = batchFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBatchFilter(id)}
                    aria-pressed={active}
                    className={`min-h-[34px] px-3 py-1.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border active:scale-[0.97] ${
                      active
                        ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_6px_14px_-4px_rgba(185,28,28,0.4)]'
                        : 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/70 hover:text-[#B91C1C] shadow-2xs'
                    }`}
                  >
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
          )}

          {/* Department Row */}
          {visibleDepartments.length > 1 && (
            <AutoScrollFilterTrack
              className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-visible no-scrollbar py-0.5 lg:py-0"
              role="group"
              ariaLabel="HSC বিভাগ ফিল্টার"
            >
              <span className="text-[11px] font-bold text-[#6B4C4F] mr-1 shrink-0 whitespace-nowrap">বিভাগ:</span>
              {visibleDepartments.map(({ id, label, Icon, count }) => {
                const active = deptFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDeptFilter(id)}
                    aria-pressed={active}
                    className={`min-h-[34px] px-3 py-1.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border active:scale-[0.97] ${
                      active
                        ? 'border-[#2A0F12] bg-[#2A0F12] text-white shadow-sm'
                        : 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/70 hover:text-[#B91C1C] shadow-2xs'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-[#E22B2B]'}`} />
                    <span>{label}</span>
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold tabular-nums bn-digits-fix ${
                        active ? 'bg-white/20 text-white' : 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
                      }`}
                    >
                      {toBengaliNumber(count)}
                    </span>
                  </button>
                );
              })}
            </AutoScrollFilterTrack>
          )}

          {/* Course Type Row (only when distinct HSC types exist) */}
          {visibleTypes.length > 2 && (
            <AutoScrollFilterTrack
              className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-visible no-scrollbar py-0.5 lg:py-0"
              role="group"
              ariaLabel="HSC কোর্সের ধরন ফিল্টার"
            >
              <span className="text-[11px] font-bold text-[#6B4C4F] mr-1 shrink-0 whitespace-nowrap">ধরন:</span>
              {visibleTypes.map(({ id, label, Icon, count }) => {
                const active = typeFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTypeFilter(id)}
                    aria-pressed={active}
                    className={`min-h-[34px] px-3 py-1.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border active:scale-[0.97] ${
                      active
                        ? 'border-[#b91c1c] bg-rose-100 text-[#B91C1C] shadow-xs'
                        : 'border-rose-200/80 bg-white/90 text-[#4A2528] hover:border-[#E22B2B]/65 hover:bg-rose-50/70 shadow-2xs'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-[#E22B2B]" />
                    <span>{label}</span>
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold tabular-nums bn-digits-fix bg-rose-50 text-[#B91C1C] border border-rose-200/75">
                      {toBengaliNumber(count)}
                    </span>
                  </button>
                );
              })}
            </AutoScrollFilterTrack>
          )}
        </div>
      </div>

      <section aria-label={pageTitle}>
        <h2 className="sr-only">{pageTitle} — কোর্স তালিকা</h2>
        {filteredCourses.length === 0 ? (
          <div className="glass-surface rounded-3xl p-10 text-center space-y-3 max-w-xl mx-auto">
            <h3 className="text-base font-bold text-[#2A0F12]">HSC ক্যাটাগরিতে এই ফিল্টারে কোনো কোর্স পাওয়া যায়নি</h3>
            <p className="text-xs text-[#6B4C4F]">ব্যাচ, বিভাগ বা সার্চ পরিবর্তন করে পুনরায় চেষ্টা করুন।</p>
            <button
              type="button"
              onClick={resetAll}
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>সব HSC কোর্স দেখুন</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {filteredCourses.map((course) => (
              <div key={`cat-hsc-${course.id}-${course.slug}`} className="h-full flex flex-col">
                <CourseCard course={course} onEnrollClick={onEnrollClick} headingLevel="h3" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
