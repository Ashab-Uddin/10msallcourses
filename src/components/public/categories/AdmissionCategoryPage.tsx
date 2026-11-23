'use client';

import React, { useMemo, useState } from 'react';
import {
  Atom,
  BookOpen,
  Briefcase,
  Compass,
  GraduationCap,
  LayoutGrid,
  RotateCcw,
  Search,
  Sparkles,
  Stethoscope,
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

type AdmissionUnitFilterId =
  | 'all'
  | 'a-unit'
  | 'b-unit'
  | 'c-unit'
  | 'gst'
  | 'medical-engineering';

type AdmissionPriceId = 'all' | 'under3500' | 'above3500';

interface AdmissionCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

const ADMISSION_UNIT_META: ReadonlyArray<{
  id: AdmissionUnitFilterId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব এডমিশন', Icon: LayoutGrid, alwaysVisible: true },
  { id: 'a-unit', label: 'A Unit / বিজ্ঞান', Icon: Atom },
  { id: 'b-unit', label: 'B Unit / মানবিক', Icon: BookOpen },
  { id: 'c-unit', label: 'C Unit / ব্যবসায়', Icon: Briefcase },
  { id: 'gst', label: 'গুচ্ছ (GST)', Icon: Compass },
  { id: 'medical-engineering', label: 'মেডিকেল ও ইঞ্জিনিয়ারিং', Icon: Stethoscope },
];

const ADMISSION_PRICE_META: ReadonlyArray<{
  id: AdmissionPriceId;
  label: string;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব ফি', alwaysVisible: true },
  { id: 'under3500', label: '৳৩,৫০০ এর মধ্যে' },
  { id: 'above3500', label: '৳৩,৫০০+' },
];

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

function matchesAdmissionUnit(course: Course, filterId: AdmissionUnitFilterId): boolean {
  if (filterId === 'all') return true;
  const text = normalizeCategoryMatchText(
    `${course.title || ''} ${course.slug || ''} ${course.shortBadge || ''} ${course.headerSubtitle || ''} ${course.targetStudents || ''}`
  );

  switch (filterId) {
    case 'a-unit':
      return includesAny(text, ['a unit', 'a-unit', 'ক ইউনিট', 'ক’ ইউনিট', 'বিজ্ঞান', 'science', 'ভার্সিটি ক']);
    case 'b-unit':
      return includesAny(text, ['b unit', 'b-unit', 'খ ইউনিট', 'খ’ ইউনিট', 'মানবিক', 'humanities']);
    case 'c-unit':
      return includesAny(text, ['c unit', 'c-unit', 'গ ইউনিট', 'গ’ ইউনিট', 'ব্যবসায়', 'commerce', 'iba']);
    case 'gst':
      return includesAny(text, ['গুচ্ছ', 'gst', 'guccho', 'কৃষি গুচ্ছ']);
    case 'medical-engineering':
      return includesAny(text, ['মেডিকেল', 'medical', 'ডেন্টাল', 'বুয়েট', 'buet', 'ইঞ্জিনিয়ারিং', 'engineering']);
    default:
      return true;
  }
}

function matchesAdmissionPrice(course: Course, priceId: AdmissionPriceId): boolean {
  if (priceId === 'all') return true;
  if (priceId === 'under3500') return course.discountPrice <= 3500;
  if (priceId === 'above3500') return course.discountPrice > 3500;
  return true;
}

export const AdmissionCategoryPage: React.FC<AdmissionCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const [unitFilter, setUnitFilter] = useState<AdmissionUnitFilterId>('all');
  const [priceFilter, setPriceFilter] = useState<AdmissionPriceId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const admissionCourses = useMemo(
    () =>
      sortCoursesForCategory(
        courses.filter((c) => courseMatchesCategorySlug(c, 'admission')),
        'admission',
        categoryCourseOrders
      ),
    [courses, categoryCourseOrders]
  );

  const visibleUnits = useMemo(
    () =>
      ADMISSION_UNIT_META.map((u) => ({
        ...u,
        count:
          u.id === 'all'
            ? admissionCourses.length
            : admissionCourses.filter((c) => matchesAdmissionUnit(c, u.id)).length,
      })).filter((u) => u.alwaysVisible || u.count > 0),
    [admissionCourses]
  );

  const visiblePrices = useMemo(() => {
    const unitScoped = admissionCourses.filter((c) => matchesAdmissionUnit(c, unitFilter));
    return ADMISSION_PRICE_META.map((p) => ({
      ...p,
      count:
        p.id === 'all'
          ? unitScoped.length
          : unitScoped.filter((c) => matchesAdmissionPrice(c, p.id)).length,
    })).filter((p) => p.alwaysVisible || p.count > 0);
  }, [admissionCourses, unitFilter]);

  const filteredCourses = useMemo(() => {
    const q = normalizeCategoryMatchText(searchQuery.trim());
    return admissionCourses.filter((c) => {
      if (!matchesAdmissionUnit(c, unitFilter)) return false;
      if (!matchesAdmissionPrice(c, priceFilter)) return false;
      if (!q) return true;
      return normalizeCategoryMatchText(
        `${c.title} ${c.slug} ${c.shortBadge || ''} ${c.description || ''} ${c.targetStudents || ''}`
      ).includes(q);
    });
  }, [admissionCourses, unitFilter, priceFilter, searchQuery]);

  const isFiltered =
    unitFilter !== 'all' || priceFilter !== 'all' || searchQuery.trim().length > 0;

  const resetAll = () => {
    setUnitFilter('all');
    setPriceFilter('all');
    setSearchQuery('');
  };

  const pageTitle = category?.name || 'বিশ্ববিদ্যালয় ও মেডিকেল এডমিশন';
  const pageSubtitle =
    category?.subtitle ||
    'বুয়েট, মেডিকেল, ঢাকা বিশ্ববিদ্যালয় ও গুচ্ছ (GST) এডমিশন ভর্তি পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি';

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

      {/* Unified Header & Admission Filter Card */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-inset text-[#B91C1C] text-[11px] font-bold">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>এডমিশন স্পেশাল</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-2xs">
                {isFiltered
                  ? `${toBengaliNumber(filteredCourses.length)} / ${toBengaliNumber(admissionCourses.length)}টি কোর্স`
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
                placeholder="ভার্সিটি, গুচ্ছ বা মেডিকেল খুঁজুন..."
                aria-label="এডমিশন কোর্স অনুসন্ধান"
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
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label="এডমিশন ইউনিট ফিল্টার">
            {visibleUnits.map(({ id, label, Icon, count }) => {
              const active = unitFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUnitFilter(id)}
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

          {visiblePrices.length > 2 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label="এডমিশন কোর্স ফি ফিল্টার">
              <span className="text-[11px] font-bold text-[#6B4C4F] mr-1">কোর্স ফি:</span>
              {visiblePrices.map(({ id, label, count }) => {
                const active = priceFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPriceFilter(id)}
                    aria-pressed={active}
                    className={`min-h-[32px] px-3 py-1 rounded-xl sm:rounded-full text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                      active
                        ? 'border-[#2A0F12] bg-[#2A0F12] text-white shadow-xs'
                        : 'border-rose-200/80 bg-white/90 text-[#4A2528] hover:border-[#E22B2B]/65 hover:bg-rose-50/70'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] font-extrabold tabular-nums bn-digits-fix opacity-80">
                      ({toBengaliNumber(count)})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <section aria-label={pageTitle}>
        <h2 className="sr-only">{pageTitle} — কোর্স তালিকা</h2>
        {filteredCourses.length === 0 ? (
          <div className="glass-surface rounded-3xl p-10 text-center space-y-3 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl glass-inset text-[#E22B2B] flex items-center justify-center mx-auto">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#2A0F12]">এডমিশন ক্যাটাগরিতে এই ফিল্টারে কোনো কোর্স পাওয়া যায়নি</h3>
            <p className="text-xs text-[#6B4C4F]">ইউনিট বা সার্চ পরিবর্তন করে পুনরায় চেষ্টা করুন।</p>
            <button
              type="button"
              onClick={resetAll}
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>সব এডমিশন কোর্স দেখুন</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {filteredCourses.map((course) => (
              <div key={`cat-admission-${course.id}-${course.slug}`} className="h-full flex flex-col">
                <CourseCard course={course} onEnrollClick={onEnrollClick} headingLevel="h3" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
