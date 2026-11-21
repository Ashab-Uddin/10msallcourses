'use client';

import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Code2,
  Globe,
  Languages,
  LayoutGrid,
  Megaphone,
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

type SkillsTrackId =
  | 'all'
  | 'english-ielts'
  | 'freelancing-marketing'
  | 'tech-programming'
  | 'career-office';

type SkillsPriceId = 'all' | 'free' | 'under2500' | 'above2500';

interface SkillsCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

const SKILLS_TRACK_META: ReadonlyArray<{
  id: SkillsTrackId;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব স্কিলস', Icon: LayoutGrid, alwaysVisible: true },
  { id: 'english-ielts', label: 'ইংরেজি ও IELTS', Icon: Languages },
  { id: 'freelancing-marketing', label: 'ফ্রিল্যান্সিং ও মার্কেটিং', Icon: Megaphone },
  { id: 'tech-programming', label: 'টেক ও প্রোগ্রামিং', Icon: Code2 },
  { id: 'career-office', label: 'ক্যারিয়ার ও অফিস', Icon: Briefcase },
];

const SKILLS_PRICE_META: ReadonlyArray<{
  id: SkillsPriceId;
  label: string;
  alwaysVisible?: boolean;
}> = [
  { id: 'all', label: 'সব মূল্য', alwaysVisible: true },
  { id: 'free', label: 'ফ্রি' },
  { id: 'under2500', label: '৳২,৫০০ এর মধ্যে' },
  { id: 'above2500', label: '৳২,৫০০+' },
];

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(normalizeCategoryMatchText(kw)));
}

function matchesSkillsTrack(course: Course, trackId: SkillsTrackId): boolean {
  if (trackId === 'all') return true;
  const text = normalizeCategoryMatchText(
    `${course.title || ''} ${course.slug || ''} ${course.shortBadge || ''} ${course.headerSubtitle || ''} ${course.description || ''}`
  );
  switch (trackId) {
    case 'english-ielts':
      return includesAny(text, ['english', 'spoken', 'ielts', 'স্পোকেন', 'ইংরেজি', 'grammar', 'মুনজেরিন']);
    case 'freelancing-marketing':
      return includesAny(text, ['freelancing', 'ফ্রিল্যান্সিং', 'marketing', 'মার্কেটিং', 'graphic', 'গ্রাফিক', 'video', 'seo', 'meta']);
    case 'tech-programming':
      return includesAny(text, ['programming', 'প্রোগ্রামিং', 'python', 'web', 'coding', 'কোডিং', 'ai', 'data', 'excel']);
    case 'career-office':
      return includesAny(text, ['career', 'ক্যারিয়ার', 'office', 'অফিস', 'ms word', 'powerpoint', 'cv', 'interview', 'communication', 'কমিউনিকেশন']);
    default:
      return true;
  }
}

function matchesSkillsPrice(course: Course, priceId: SkillsPriceId): boolean {
  if (priceId === 'all') return true;
  if (priceId === 'free') return course.discountPrice === 0;
  if (priceId === 'under2500') return course.discountPrice > 0 && course.discountPrice <= 2500;
  if (priceId === 'above2500') return course.discountPrice > 2500;
  return true;
}

export const SkillsCategoryPage: React.FC<SkillsCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const [trackFilter, setTrackFilter] = useState<SkillsTrackId>('all');
  const [priceFilter, setPriceFilter] = useState<SkillsPriceId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const skillsCourses = useMemo(
    () =>
      sortCoursesForCategory(
        courses.filter((c) => courseMatchesCategorySlug(c, 'skills')),
        'skills',
        categoryCourseOrders
      ),
    [courses, categoryCourseOrders]
  );

  const visibleTracks = useMemo(
    () =>
      SKILLS_TRACK_META.map((t) => ({
        ...t,
        count:
          t.id === 'all'
            ? skillsCourses.length
            : skillsCourses.filter((c) => matchesSkillsTrack(c, t.id)).length,
      })).filter((t) => t.alwaysVisible || t.count > 0),
    [skillsCourses]
  );

  const visiblePrices = useMemo(() => {
    const trackScoped = skillsCourses.filter((c) => matchesSkillsTrack(c, trackFilter));
    return SKILLS_PRICE_META.map((p) => ({
      ...p,
      count:
        p.id === 'all'
          ? trackScoped.length
          : trackScoped.filter((c) => matchesSkillsPrice(c, p.id)).length,
    })).filter((p) => p.alwaysVisible || p.count > 0);
  }, [skillsCourses, trackFilter]);

  const filteredCourses = useMemo(() => {
    const q = normalizeCategoryMatchText(searchQuery.trim());
    return skillsCourses.filter((c) => {
      if (!matchesSkillsTrack(c, trackFilter)) return false;
      if (!matchesSkillsPrice(c, priceFilter)) return false;
      if (!q) return true;
      return normalizeCategoryMatchText(
        `${c.title} ${c.slug} ${c.shortBadge || ''} ${c.description || ''} ${c.targetStudents || ''}`
      ).includes(q);
    });
  }, [skillsCourses, trackFilter, priceFilter, searchQuery]);

  const isFiltered =
    trackFilter !== 'all' || priceFilter !== 'all' || searchQuery.trim().length > 0;

  const resetAll = () => {
    setTrackFilter('all');
    setPriceFilter('all');
    setSearchQuery('');
  };

  const pageTitle = category?.name || 'স্কিলস ও আইটি';
  const pageSubtitle =
    category?.subtitle || 'ক্যারিয়ার গড়ার আধুনিক, প্রফেশনাল ও দক্ষতা উন্নয়নমূলক অনলাইন কোর্সসমূহ';

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

      {/* Unified Header & Skills Filter Card */}
      <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass-inset text-[#B91C1C] text-[11px] font-bold">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>স্কিল ডেভেলপমেন্ট</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-2xs">
                {isFiltered
                  ? `${toBengaliNumber(filteredCourses.length)} / ${toBengaliNumber(skillsCourses.length)}টি কোর্স`
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
                placeholder="স্কিলস বা আইটি কোর্স খুঁজুন..."
                aria-label="স্কিলস কোর্স অনুসন্ধান"
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

        {(visibleTracks.length > 1 || visiblePrices.length > 2) && (
          <>
            <div className="border-t border-rose-100/85 my-3.5 sm:my-4" />
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label="স্কিলস ট্র্যাক ফিল্টার">
                {visibleTracks.map(({ id, label, Icon, count }) => {
                  const active = trackFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTrackFilter(id)}
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
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label="স্কিলস কোর্স মূল্য ফিল্টার">
                  <span className="text-[11px] font-bold text-[#6B4C4F] mr-1">মূল্য:</span>
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
          </>
        )}
      </div>

      <section aria-label={pageTitle}>
        <h2 className="sr-only">{pageTitle} — কোর্স তালিকা</h2>
        {filteredCourses.length === 0 ? (
          <div className="glass-surface rounded-3xl p-10 text-center space-y-3 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl glass-inset text-[#E22B2B] flex items-center justify-center mx-auto">
              <Globe className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#2A0F12]">স্কিলস ও আইটি ক্যাটাগরিতে এই মুহূর্তে কোনো কোর্স পাওয়া যায়নি</h3>
            <p className="text-xs text-[#6B4C4F]">সার্চ বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।</p>
            {isFiltered && (
              <button
                type="button"
                onClick={resetAll}
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>সব স্কিলস কোর্স দেখুন</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {filteredCourses.map((course) => (
              <div key={`cat-skills-${course.id}-${course.slug}`} className="h-full flex flex-col">
                <CourseCard course={course} onEnrollClick={onEnrollClick} headingLevel="h3" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
