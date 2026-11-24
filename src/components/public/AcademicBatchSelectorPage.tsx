'use client';

import React, { useMemo } from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';
import type { Category, Course } from '../../types.ts';
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
import { getOrderedSelectorIcons } from './selectorIconDefinitions.ts';
import { ScienceBackdropAccent } from './ScienceBackdropAccent.tsx';
import { useCategoryScrollIntoView } from '../../lib/useCategoryScrollIntoView.ts';

interface AcademicBatchSelectorPageProps {
  categories: Category[];
  courses: Course[];
  selectorIconLabels?: Partial<Record<SelectorIconId, Partial<SelectorIconText>>>;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

const ACADEMIC_BATCH_ICON_IDS: readonly SelectorIconId[] = [
  'hsc-27',
  'hsc-28',
  'ssc-27',
  'ssc-28',
] as const;

export const AcademicBatchSelectorPage: React.FC<AcademicBatchSelectorPageProps> = ({
  categories,
  courses,
  selectorIconLabels,
  onBack,
  onNavigate,
}) => {
  const heroSectionRef = useCategoryScrollIntoView<HTMLElement>('academic-overview');

  const batchCards = useMemo(() => {
    const allIcons = getOrderedSelectorIcons(
      undefined,
      selectorIconLabels,
      categories
    );
    const byId = new Map(allIcons.map((item) => [item.id, item]));

    return ACADEMIC_BATCH_ICON_IDS.map((id) => {
      const icon = byId.get(id);
      if (!icon) return null;

      let courseCount = 0;
      if (id === 'hsc-27' || id === 'hsc-28') {
        const groupKey = id === 'hsc-27' ? 'hsc27' : 'hsc28';
        const groupCats = categories.filter(
          (c) =>
            (c.status || 'active') === 'active' &&
            resolveCategoryNavGroup(c) === groupKey
        );
        courseCount = courses.filter(
          (c) =>
            (c.status || 'active') === 'active' &&
            (groupCats.some((g) => courseMatchesCategorySlug(c, g.slug)) ||
              courseMatchesAcademicBatch(c, id))
        ).length;
      } else if (icon.categorySlug) {
        const fallbackBatch = id === 'ssc-27' ? 'ssc-2028' : 'ssc-2029';
        courseCount = courses.filter(
          (c) =>
            (c.status || 'active') === 'active' &&
            (courseMatchesCategorySlug(c, icon.categorySlug!) ||
              courseMatchesAcademicBatch(c, fallbackBatch))
        ).length;
      }

      return {
        ...icon,
        courseCount,
      };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [categories, courses, selectorIconLabels]);

  const totalAcademicCourses = useMemo(
    () => batchCards.reduce((sum, item) => sum + item.courseCount, 0),
    [batchCards]
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
          className="hover:text-[#E22B2B] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/50 rounded"
        >
          হোম
        </button>
        <span className="text-rose-300" aria-hidden="true">
          /
        </span>
        <span className="text-[#B91C1C] font-bold">একাডেমিক অনলাইন ব্যাচ</span>
      </nav>

      {/* Warm Frosted Hero Banner */}
      <section
        ref={heroSectionRef}
        id="academic-batch-selector-section"
        className="scroll-mt-24 sm:scroll-mt-28 glass-surface rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden"
      >
        <div className="relative py-1 flex flex-col items-center justify-center text-center">
          <ScienceBackdropAccent variant="science" layout="symmetrical" />

          <div className="relative z-10 min-w-0 max-w-3xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B91C1C] mb-2">
              <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>এসএসসি ও এইচএসসি একাডেমিক প্রোগ্রাম</span>
            </div>

            <h1
              className="text-2xl sm:text-4xl md:text-[42px] font-black text-[#2A0F12] tracking-tight leading-tight text-center mb-2.5"
              style={{ textWrap: 'balance' }}
            >
              একাডেমিক{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] via-rose-600 to-[#B91C1C]">
                অনলাইন ব্যাচ
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-[#6B4C4F] font-normal leading-relaxed max-w-2xl mx-auto text-center">
              আপনার শ্রেণি বা ব্যাচ নির্বাচন করে সরাসরি নির্ধারিত একাডেমিক ক্যাটাগরি ও লাইভ কোর্সসমূহে যান।
            </p>

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs text-[#5A3E41] font-semibold tabular-nums bn-digits-fix">
              <span>{toBengaliNumber(batchCards.length)}টি একাডেমিক ব্যাচ</span>
              <span aria-hidden="true" className="text-rose-300">
                ·
              </span>
              <span>HSC 27 / HSC 28 / SSC 28 / SSC 29</span>
              {totalAcademicCourses > 0 && (
                <>
                  <span aria-hidden="true" className="text-rose-300">
                    ·
                  </span>
                  <span>{toBengaliNumber(totalAcademicCourses)}টি সক্রিয় কোর্স</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Academic Batch Icon Cards Grid (HSC 27, HSC 28, SSC 28, SSC 29) */}
      <section aria-label="একাডেমিক ব্যাচ সমূহ" className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
          <h2 className="text-sm sm:text-base font-extrabold text-[#2A0F12]">
            ব্যাচ নির্বাচন করুন ({toBengaliNumber(batchCards.length)}টি)
          </h2>
          <span className="text-[11px] sm:text-xs text-[#6B4C4F]">
            যেকোনো আইকন কার্ডে ক্লিক করে সরাসরি সেই ব্যাচের পেজে যান
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 p-3 sm:p-6 rounded-2xl sm:rounded-3xl glass-surface items-stretch">
          {batchCards.map((item) => {
            const IconComponent = item.Icon;
            return (
              <a
                key={`academic-batch-card-${item.id}`}
                href={item.path}
                data-batch-id={item.id}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                    return;
                  }
                  e.preventDefault();
                  onNavigate(item.path);
                }}
                className="group min-w-0 w-full h-full flex flex-col items-center justify-between cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/60 rounded-[20px] touch-manipulation"
              >
                <div
                  className={`relative w-full flex-1 rounded-[18px] sm:rounded-[22px] overflow-hidden border bg-white/85 backdrop-blur-xl transition-all duration-200 flex flex-col justify-between border-white/95 shadow-[0_10px_28px_-10px_rgba(185,28,28,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ${item.hoverShadow} group-hover:-translate-y-1.5 group-active:scale-[0.98]`}
                >
                  {/* Top Rich 3D Color Stage */}
                  <div
                    className={`relative w-full h-[100px] min-[390px]:h-[108px] sm:h-[132px] shrink-0 ${item.topGradient} flex flex-col items-center justify-center px-2 pt-3.5 pb-4 sm:px-3 sm:pb-5 sm:pt-4 overflow-hidden`}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none opacity-45"
                      style={{
                        background:
                          'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 55%)',
                      }}
                    />

                    <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 text-[8.5px] sm:text-[10px] font-black tracking-wider text-white/95 bg-black/20 backdrop-blur-md border border-white/25 px-2 py-0.5 rounded-full max-w-[calc(100%-16px)] truncate">
                      {item.tag}
                    </span>

                    <div
                      className={`relative z-10 mt-2 w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${item.iconGlow} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200`}
                    >
                      <IconComponent className="w-5 h-5 sm:w-7 sm:h-7 stroke-[2.2] drop-shadow-sm" />
                    </div>

                    <svg
                      viewBox="0 0 240 42"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 w-full h-[16px] sm:h-[26px] pointer-events-none block"
                    >
                      <path
                        d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                        fill="rgba(255, 255, 255, 0.92)"
                      />
                    </svg>
                  </div>

                  {/* Bottom Frosted Zone */}
                  <div className="relative flex-1 bg-white/92 backdrop-blur-md px-2.5 pt-1 pb-3 sm:px-3 sm:pt-1 sm:pb-3.5 flex flex-col items-center justify-center gap-1.5 shadow-[inset_0_-6px_12px_rgba(185,28,28,0.05)]">
                    <div
                      className={`w-full rounded-xl sm:rounded-full border-[1.5px] ${item.pillBorder} ${item.pillBg} px-2.5 py-1.5 min-h-[40px] flex items-center justify-center gap-1.5 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),0_2px_6px_-2px_rgba(0,0,0,0.06)] group-hover:scale-[1.02] transition-transform duration-200`}
                    >
                      <span
                        className={`font-black text-xs sm:text-[13.5px] tracking-tight leading-snug whitespace-nowrap truncate ${item.pillText}`}
                      >
                        {item.title}
                      </span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${item.pillText}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                {/* Clean Batch Caption below card */}
                <span
                  className={`mt-2 shrink-0 text-[10.5px] sm:text-xs font-bold text-center leading-tight whitespace-nowrap max-w-full truncate ${item.statusColor} opacity-90 group-hover:opacity-100 transition-opacity`}
                >
                  {item.subLabel}
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
};
