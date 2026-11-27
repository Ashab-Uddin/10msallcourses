'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import type {
  Category,
  Course,
  OnlineBatchPageConfig,
  OnlineBatchPageIconItem,
  OnlineBatchSection,
} from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
} from '../../lib/categoryMatching.ts';
import { resolveCategoryNavGroup } from '../../lib/navbarCategories.ts';
import type {
  SelectorIconId,
  SelectorIconText,
} from '../../lib/selectorIconOrder.ts';
import {
  normalizeOnlineBatchPageConfig,
  ONLINE_BATCH_ICON_IDS,
} from '../../lib/onlineBatchPageConfig.ts';
import { getLucideIconByKey } from '../../lib/categoryIconComponents.ts';
import { type CategoryIconKey } from '../../lib/categoryIcons.ts';
import { buildReadableCategoryPath } from '../../lib/courseSlug.ts';
import { getOrderedSelectorIcons } from './selectorIconDefinitions.ts';
import { ScienceBackdropAccent } from './ScienceBackdropAccent.tsx';
import { CourseCard } from './CourseCard.tsx';
import { AutoScrollFilterTrack } from './AutoScrollFilterTrack.tsx';
import { useCategoryScrollIntoView } from '../../lib/useCategoryScrollIntoView.ts';

interface AcademicBatchSelectorPageProps {
  categories?: Category[];
  courses?: Course[];
  selectorIconLabels?: Partial<Record<SelectorIconId, Partial<SelectorIconText>>>;
  sections?: OnlineBatchSection[];
  pageConfig?: OnlineBatchPageConfig | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onBack: () => void;
  onNavigate?: (path: string) => void;
  onEnrollClick?: (course: Course, referrer?: string) => void;
}

function splitHighlightedTitle(title: string): { lead: string; accent: string } {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return { lead: '', accent: title.trim() };
  }
  const lastWord = words[words.length - 1];
  // When ending with a year (e.g. "একাডেমিক অনলাইন ব্যাচ 2027"), highlight the trailing phrase nicely
  if (words.length >= 3 && /^(?:20\d{2}|২০[২৩]\d)$/.test(lastWord)) {
    return {
      lead: words.slice(0, -2).join(' '),
      accent: words.slice(-2).join(' '),
    };
  }
  return {
    lead: words.slice(0, -1).join(' '),
    accent: lastWord,
  };
}

function resolveBatchClassRoute(categorySlug?: string | null): string {
  const clean = String(categorySlug || '').trim();
  if (!clean) return '/online-batch';
  if (clean === 'ssc-28' || clean === 'ssc-27') {
    return `/ssc/${clean}`;
  }
  return buildReadableCategoryPath(clean);
}

export const AcademicBatchSelectorPage: React.FC<AcademicBatchSelectorPageProps> = ({
  categories = [],
  courses = [],
  selectorIconLabels,
  sections: onlineBatchSections = [],
  pageConfig,
  loading = false,
  error = null,
  onRetry,
  onBack,
  onNavigate,
  onEnrollClick,
}) => {
  const heroSectionRef = useCategoryScrollIntoView<HTMLElement>('online-batch-overview');
  const [manualBatchClassId, setManualBatchClassId] = useState<number | 'all' | null>(null);
  const queryClassParam = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('class') || '').trim().toLowerCase()
        : '',
    () => ''
  );

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.assign(path);
    }
  };

  const handleEnroll = (course: Course, referrer = 'online_batch_page') => {
    if (onEnrollClick) {
      onEnrollClick(course, referrer);
    } else if (typeof window !== 'undefined') {
      window.open(course.affiliateUrl || `/go/${course.slug}`, '_blank', 'noopener,noreferrer');
    }
  };

  const resolvedConfig = useMemo(
    () => normalizeOnlineBatchPageConfig(pageConfig),
    [pageConfig]
  );

  const orderedSections = useMemo(
    () =>
      [...resolvedConfig.sections]
        .sort((a, b) => a.position - b.position)
        .filter((section) => section.isVisible),
    [resolvedConfig.sections]
  );

  const { batchCards, totalAcademicCourses } = useMemo(() => {
    const allIcons = getOrderedSelectorIcons(
      ONLINE_BATCH_ICON_IDS,
      selectorIconLabels,
      categories
    );
    const byId = new Map<string, (typeof allIcons)[number]>(
      allIcons.map((item) => [item.id, item])
    );
    const activeCourses = courses.filter((c) => (c.status || 'active') === 'active');
    const uniqueMatchedCourseIds = new Set<number>();

    const sortedConfigIcons: OnlineBatchPageIconItem[] = [...resolvedConfig.classIcons]
      .sort((a, b) => a.position - b.position)
      .filter((item) => item.isVisible);

    const cards = sortedConfigIcons
      .map((cfgItem) => {
        const base = byId.get(cfgItem.id);
        if (!base) return null;

        let matchedCourses: Course[] = [];
        if (cfgItem.id === 'hsc-27' || cfgItem.id === 'hsc-28') {
          const groupKey = cfgItem.id === 'hsc-27' ? 'hsc27' : 'hsc28';
          const groupCats = categories.filter(
            (c) =>
              (c.status || 'active') === 'active' &&
              resolveCategoryNavGroup(c) === groupKey
          );
          matchedCourses = activeCourses.filter(
            (c) =>
              groupCats.some((g) => courseMatchesCategorySlug(c, g.slug)) ||
              courseMatchesAcademicBatch(c, cfgItem.id)
          );
        } else if (
          cfgItem.id === 'class-6' ||
          cfgItem.id === 'class-7' ||
          cfgItem.id === 'class-8'
        ) {
          matchedCourses = activeCourses.filter(
            (c) =>
              courseMatchesCategorySlug(c, base.categorySlug || cfgItem.id) ||
              courseMatchesAcademicBatch(c, cfgItem.id)
          );
        } else if (base.categorySlug) {
          const fallbackBatch = cfgItem.id === 'ssc-27' ? 'ssc-2028' : 'ssc-2029';
          matchedCourses = activeCourses.filter(
            (c) =>
              courseMatchesCategorySlug(c, base.categorySlug!) ||
              courseMatchesAcademicBatch(c, fallbackBatch)
          );
        }

        for (const course of matchedCourses) {
          uniqueMatchedCourseIds.add(course.id);
        }

        const IconComponent =
          cfgItem.iconKey && cfgItem.iconKey !== 'auto'
            ? getLucideIconByKey(cfgItem.iconKey as CategoryIconKey)
            : base.Icon;

        return {
          ...base,
          Icon: IconComponent || base.Icon,
          tag: cfgItem.tag || base.tag,
          title: cfgItem.title || base.title,
          subLabel: cfgItem.subLabel || base.subLabel,
          position: cfgItem.position,
          courseCount: matchedCourses.length,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return {
      batchCards: cards,
      totalAcademicCourses: uniqueMatchedCourseIds.size,
    };
  }, [categories, courses, selectorIconLabels, resolvedConfig.classIcons]);

  const activeBatchSections = useMemo(
    () =>
      onlineBatchSections.filter(
        (sec) => sec.batchClass.status === 'active' && sec.courses.length > 0
      ),
    [onlineBatchSections]
  );

  const selectedBatchClassId: number | 'all' = useMemo(() => {
    if (manualBatchClassId !== null) return manualBatchClassId;
    if (queryClassParam && activeBatchSections.length > 0) {
      const matched = activeBatchSections.find(
        (sec) =>
          sec.batchClass.classKey.trim().toLowerCase() === queryClassParam ||
          (sec.batchClass.categorySlug || '').trim().toLowerCase() === queryClassParam ||
          String(sec.batchClass.id) === queryClassParam
      );
      if (matched) return matched.batchClass.id;
    }
    return 'all';
  }, [manualBatchClassId, queryClassParam, activeBatchSections]);

  const totalOnlineBatchCoursesCount = useMemo(
    () =>
      activeBatchSections.reduce((sum, sec) => sum + sec.courses.length, 0),
    [activeBatchSections]
  );

  const visibleBatchSections = useMemo(() => {
    if (selectedBatchClassId === 'all') return activeBatchSections;
    const filtered = activeBatchSections.filter(
      (sec) => sec.batchClass.id === selectedBatchClassId
    );
    return filtered.length > 0 ? filtered : activeBatchSections;
  }, [activeBatchSections, selectedBatchClassId]);

  const { lead: titleLead, accent: titleAccent } = useMemo(
    () => splitHighlightedTitle(resolvedConfig.header.title),
    [resolvedConfig.header.title]
  );

  return (
    <div className="max-w-[1260px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-4 sm:mb-5 flex-wrap"
      >
        <button
          type="button"
          onClick={onBack}
          className="hover:text-[#E22B2B] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/50 rounded py-1"
        >
          হোম
        </button>
        <span className="text-rose-300" aria-hidden="true">
          /
        </span>
        <span className="text-[#B91C1C] font-bold">Online Batch</span>
      </nav>

      {/* Hero Page Header (Admin-Editable) */}
      <section
        ref={heroSectionRef}
        id="online-batch-page-header"
        className="scroll-mt-24 sm:scroll-mt-28 glass-surface rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden"
      >
        <div className="relative py-1 flex flex-col items-center justify-center text-center">
          <ScienceBackdropAccent variant="science" layout="symmetrical" />

          <div className="relative z-10 min-w-0 max-w-3xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#B91C1C] mb-2">
              <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{resolvedConfig.header.subtitle}</span>
            </div>

            <h1
              className="text-2xl sm:text-4xl md:text-[42px] font-black text-[#2A0F12] tracking-tight leading-tight text-center mb-2.5"
              style={{ textWrap: 'balance' }}
            >
              {titleLead ? `${titleLead} ` : ''}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] via-rose-600 to-[#B91C1C]">
                {titleAccent}
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-[#6B4C4F] font-normal leading-relaxed max-w-2xl mx-auto text-center">
              {resolvedConfig.header.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-[#5A3E41] font-semibold tabular-nums bn-digits-fix">
              <span>{toBengaliNumber(batchCards.length)}টি একাডেমিক ব্যাচ ও শ্রেণি</span>
              <span aria-hidden="true" className="text-rose-300">
                ·
              </span>
              <span>HSC 27 / HSC 28 / ক্লাস ৬ষ্ঠ–১০ম</span>
              {(totalAcademicCourses > 0 || totalOnlineBatchCoursesCount > 0) && (
                <>
                  <span aria-hidden="true" className="text-rose-300">
                    ·
                  </span>
                  <span>
                    {toBengaliNumber(
                      Math.max(totalAcademicCourses, totalOnlineBatchCoursesCount)
                    )}
                    টি সক্রিয় কোর্স
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Ordered Page Sections (Admin-Controlled Position & Content) */}
      <div className="space-y-8 sm:space-y-10">
        {orderedSections.map((section) => {
          if (section.id === 'academic_program') {
            if (batchCards.length === 0) return null;
            return (
              <section
                key="section-academic-program"
                id="academic-program-section"
                aria-label={section.title}
                className="scroll-mt-24"
              >
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3.5 px-1">
                  <div className="space-y-0.5 min-w-0">
                    <h2 className="text-base sm:text-xl font-black text-[#2A0F12] tracking-tight">
                      {section.title}
                    </h2>
                    {section.description && (
                      <p className="text-xs sm:text-sm text-[#6B4C4F] leading-relaxed">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#B91C1C] tabular-nums shrink-0">
                    {toBengaliNumber(batchCards.length)}টি ব্যাচ ও শ্রেণি
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-5 p-2.5 sm:p-6 rounded-2xl sm:rounded-3xl glass-surface items-stretch">
                  {batchCards.map((item) => {
                    const IconComponent = item.Icon;
                    return (
                      <a
                        key={`academic-batch-card-${item.id}`}
                        href={item.path}
                        data-batch-id={item.id}
                        data-position={item.position}
                        onClick={(e) => {
                          if (
                            e.metaKey ||
                            e.ctrlKey ||
                            e.shiftKey ||
                            e.altKey ||
                            e.button !== 0
                          ) {
                            return;
                          }
                          e.preventDefault();
                          navigateTo(item.path);
                        }}
                        className="group min-w-0 w-full h-full flex flex-col items-center justify-between cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/60 rounded-[18px] sm:rounded-[22px] touch-manipulation"
                      >
                        <div
                          className={`relative w-full aspect-square sm:aspect-auto sm:flex-1 rounded-[16px] sm:rounded-[22px] overflow-hidden border bg-white/85 backdrop-blur-xl transition-all duration-200 flex flex-col justify-between border-white/95 shadow-[0_10px_28px_-10px_rgba(185,28,28,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ${item.hoverShadow} group-hover:-translate-y-1.5 group-active:scale-[0.98]`}
                        >
                          {/* Top Rich 3D Color Stage */}
                          <div
                            className={`relative w-full flex-1 min-h-0 sm:flex-none sm:h-[132px] shrink-0 ${item.topGradient} flex flex-col items-center justify-center px-1.5 pt-4 pb-2.5 sm:px-3 sm:pb-5 sm:pt-4 overflow-hidden`}
                          >
                            <div
                              className="absolute inset-0 pointer-events-none opacity-45"
                              style={{
                                background:
                                  'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 55%)',
                              }}
                            />

                            <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 text-[7px] min-[390px]:text-[8px] sm:text-[10px] font-black tracking-wider text-white/95 bg-black/20 backdrop-blur-md border border-white/25 px-1.5 sm:px-2 py-[1px] sm:py-0.5 rounded-full max-w-[calc(100%-12px)] sm:max-w-[calc(100%-16px)] truncate">
                              {item.tag}
                            </span>

                            <div
                              className={`relative z-10 mt-2 w-8 h-8 min-[390px]:w-9 min-[390px]:h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${item.iconGlow} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200`}
                            >
                              <IconComponent className="w-4 h-4 min-[390px]:w-[18px] min-[390px]:h-[18px] sm:w-7 sm:h-7 stroke-[2.2] drop-shadow-sm" />
                            </div>

                            <svg
                              viewBox="0 0 240 42"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                              className="absolute bottom-0 left-0 w-full h-[12px] sm:h-[26px] pointer-events-none block"
                            >
                              <path
                                d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                                fill="rgba(255, 255, 255, 0.92)"
                              />
                            </svg>
                          </div>

                          {/* Bottom Frosted Zone */}
                          <div className="relative shrink-0 sm:flex-1 bg-white/92 backdrop-blur-md px-1.5 pt-0.5 pb-1.5 sm:px-3 sm:pt-1 sm:pb-3.5 flex flex-col items-center justify-center gap-1 sm:gap-1.5 shadow-[inset_0_-6px_12px_rgba(185,28,28,0.05)]">
                            <div
                              className={`w-full rounded-full border-[1.5px] ${item.pillBorder} ${item.pillBg} px-1.5 py-[3px] min-h-[28px] sm:min-h-[44px] sm:px-2.5 sm:py-1.5 flex items-center justify-center gap-0.5 sm:gap-1.5 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),0_2px_6px_-2px_rgba(0,0,0,0.06)] group-hover:scale-[1.02] transition-transform duration-200`}
                            >
                              <span
                                className={`font-black text-[9.5px] min-[390px]:text-[10.5px] sm:text-[13.5px] tracking-tight leading-tight whitespace-nowrap truncate ${item.pillText}`}
                              >
                                {item.title}
                              </span>
                              <ArrowRight
                                className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${item.pillText}`}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Clean Batch Caption below card */}
                        <span
                          className={`mt-1.5 sm:mt-2 shrink-0 text-[9px] min-[390px]:text-[9.5px] sm:text-xs font-bold text-center leading-tight sm:whitespace-nowrap max-w-full ${item.statusColor} opacity-90 group-hover:opacity-100 transition-opacity`}
                        >
                          {item.subLabel}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          }

          // Section 2: Academic Online Batch (Live Courses Organized by Class)
          return (
            <section
              key="section-online-batch"
              id="academic-online-batch-section"
              aria-label={section.title}
              className="scroll-mt-24 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
                <div className="space-y-0.5 min-w-0">
                  <h2 className="text-base sm:text-xl font-black text-[#2A0F12] tracking-tight">
                    {section.title}
                  </h2>
                  {section.description && (
                    <p className="text-xs sm:text-sm text-[#6B4C4F] leading-relaxed">
                      {section.description}
                    </p>
                  )}
                </div>
                {activeBatchSections.length > 0 && (
                  <span className="text-xs font-bold text-[#B91C1C] tabular-nums shrink-0">
                    {toBengaliNumber(totalOnlineBatchCoursesCount)}টি লাইভ কোর্স
                  </span>
                )}
              </div>

              {loading && onlineBatchSections.length === 0 ? (
                <div className="glass-surface rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 animate-pulse">
                  <div className="h-6 w-52 rounded-lg bg-rose-200/70" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-64 rounded-2xl bg-rose-100/70" />
                    ))}
                  </div>
                </div>
              ) : error && onlineBatchSections.length === 0 ? (
                <div className="glass-surface rounded-2xl sm:rounded-3xl p-8 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-[#E22B2B] mx-auto" />
                  <p className="text-sm font-bold text-[#2A0F12]">{error}</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>পুনরায় চেষ্টা করুন</span>
                    </button>
                  )}
                </div>
              ) : activeBatchSections.length === 0 ? (
                <div className="glass-surface rounded-2xl sm:rounded-3xl p-8 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-rose-300 mx-auto" />
                  <p className="text-sm font-bold text-[#2A0F12]">
                    বর্তমানে কোনো অনলাইন ব্যাচ কোর্স যুক্ত নেই
                  </p>
                  <p className="text-xs text-[#6B4C4F]">
                    উপরের একাডেমিক প্রোগ্রাম কার্ড থেকে আপনার শ্রেণি নির্বাচন করুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Interactive Class Filter Controls */}
                  {activeBatchSections.length > 1 && (
                    <AutoScrollFilterTrack
                      className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-1"
                      role="tablist"
                      ariaLabel="শ্রেণি অনুযায়ী ফিল্টার"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedBatchClassId === 'all'}
                        onClick={() => setManualBatchClassId('all')}
                        className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition cursor-pointer ${
                          selectedBatchClassId === 'all'
                            ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                            : 'bg-white/90 text-[#2A0F12] border-rose-200/80 hover:border-rose-300 hover:bg-rose-50/70'
                        }`}
                      >
                        সকল শ্রেণি ({toBengaliNumber(totalOnlineBatchCoursesCount)})
                      </button>

                      {activeBatchSections.map((sec) => {
                        const isSelected = selectedBatchClassId === sec.batchClass.id;
                        return (
                          <button
                            key={sec.batchClass.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setManualBatchClassId(sec.batchClass.id)}
                            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition cursor-pointer tabular-nums ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                                : 'bg-white/90 text-[#2A0F12] border-rose-200/80 hover:border-rose-300 hover:bg-rose-50/70'
                            }`}
                          >
                            {sec.batchClass.name} ({toBengaliNumber(sec.courses.length)})
                          </button>
                        );
                      })}
                    </AutoScrollFilterTrack>
                  )}

                  {/* Per-Class Course Blocks */}
                  <div className="space-y-6">
                    {visibleBatchSections.map((sec) => {
                      const targetRoute = resolveBatchClassRoute(sec.batchClass.categorySlug);
                      return (
                        <div
                          key={sec.batchClass.id}
                          className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/50 pb-3.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {sec.batchClass.badgeText && (
                                  <span className="text-[11px] font-black tracking-wide text-[#B91C1C]">
                                    {sec.batchClass.badgeText}
                                  </span>
                                )}
                                <h3 className="text-base sm:text-lg font-black text-[#2A0F12] truncate">
                                  {sec.batchClass.sectionTitle || sec.batchClass.name}
                                </h3>
                              </div>
                              {sec.batchClass.subtitle && (
                                <p className="text-xs text-[#6B4C4F] leading-relaxed">
                                  {sec.batchClass.subtitle}
                                </p>
                              )}
                            </div>

                            {sec.batchClass.categorySlug && (
                              <a
                                href={targetRoute}
                                onClick={(e) => {
                                  if (
                                    e.metaKey ||
                                    e.ctrlKey ||
                                    e.shiftKey ||
                                    e.altKey ||
                                    e.button !== 0
                                  ) {
                                    return;
                                  }
                                  e.preventDefault();
                                  navigateTo(targetRoute);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-rose-200 bg-white/90 hover:bg-rose-50 text-[#B91C1C] text-xs font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer"
                              >
                                <span>{sec.batchClass.name} পেজ দেখুন</span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            {sec.courses.map((courseItem) => (
                              <CourseCard
                                key={`${sec.batchClass.id}-${courseItem.id}`}
                                course={courseItem}
                                onEnrollClick={(course, ref) =>
                                  handleEnroll(course, ref || 'online_batch_page')
                                }
                                headingLevel="h3"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
