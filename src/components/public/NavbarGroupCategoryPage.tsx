'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { Category, Course } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { useHistoryViewState } from '../../lib/navigationHistory.ts';
import {
  courseMatchesCategorySlug,
  normalizeCategoryMatchText,
} from '../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../lib/courseSorting.ts';
import {
  NAVBAR_GROUP_PAGE_META,
  resolveCategoryNavGroup,
  type NavbarGroupKey,
} from '../../lib/navbarCategories.ts';
import {
  resolveCategoryCardBatchTitle,
  resolveCategoryCardTheme,
} from '../../lib/categoryIcons.ts';
import type {
  SelectorIconId,
  SelectorIconText,
} from '../../lib/selectorIconOrder.ts';
import { getCategoryLucideIcon } from '../../lib/categoryIconComponents.ts';
import { useCategoryScrollIntoView } from '../../lib/useCategoryScrollIntoView.ts';
import { CourseCard } from './CourseCard.tsx';
import { CategoryCourseCarousel } from './CategoryCourseCarousel.tsx';
import { ScienceBackdropAccent } from './ScienceBackdropAccent.tsx';

interface NavbarGroupCategoryPageProps {
  groupKey: NavbarGroupKey;
  categories: Category[];
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  selectorIconLabels?: Partial<Record<SelectorIconId, Partial<SelectorIconText>>>;
  onBack: () => void;
  onOpenStandaloneCategory: (categorySlug: string) => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

export const NavbarGroupCategoryPage: React.FC<NavbarGroupCategoryPageProps> = ({
  groupKey,
  categories,
  courses,
  categoryCourseOrders,
  selectorIconLabels,
  onBack,
  onOpenStandaloneCategory,
  onEnrollClick,
}) => {
  const meta = NAVBAR_GROUP_PAGE_META[groupKey];
  const heroSectionRef = useCategoryScrollIntoView<HTMLElement>(
    `navgroup-${groupKey}`
  );
  const [searchQuery, setSearchQuery] = useHistoryViewState(
    'categorySearchQuery',
    '',
    `navgroup-${groupKey}`
  );

  // Active categories belonging to this Navbar button sorted strictly in ascending displayOrder
  const groupCategories = useMemo(
    () =>
      [...categories]
        .filter(
          (cat) =>
            (cat.status || 'active') === 'active' &&
            resolveCategoryNavGroup(cat) === groupKey
        )
        .sort(
          (a, b) =>
            (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) ||
            (Number(a.id) || 0) - (Number(b.id) || 0)
        ),
    [categories, groupKey]
  );

  // Courses mapped per category (existing DB courses only)
  const categorySections = useMemo(
    () =>
      groupCategories.map((cat) => {
        const catCourses = sortCoursesForCategory(
          courses.filter((c) => courseMatchesCategorySlug(c, cat.slug)),
          cat.slug,
          categoryCourseOrders
        );
        return {
          category: cat,
          courses: catCourses,
        };
      }),
    [groupCategories, courses, categoryCourseOrders]
  );

  // Deduplicated courses across all categories in this Navbar group
  const allGroupCourses = useMemo(() => {
    const seen = new Set<number>();
    const combined: Course[] = [];
    for (const sec of categorySections) {
      for (const course of sec.courses) {
        if (!seen.has(course.id)) {
          seen.add(course.id);
          combined.push(course);
        }
      }
    }
    return combined;
  }, [categorySections]);

  const normalizedQuery = normalizeCategoryMatchText(searchQuery.trim());
  const isSearchActive = normalizedQuery.length > 0;

  const filteredSingleViewCourses = useMemo(() => {
    if (!normalizedQuery) return allGroupCourses;
    return allGroupCourses.filter((c) => {
      const haystack = normalizeCategoryMatchText(
        [
          c.title,
          c.description,
          c.fullDescription || '',
          c.headerTitle,
          c.headerSubtitle,
          c.targetStudents || '',
          c.shortBadge || '',
        ].join(' ')
      );
      return haystack.includes(normalizedQuery);
    });
  }, [allGroupCourses, normalizedQuery]);

  const showGroupedSections = !isSearchActive;

  const dynamicSubtitle =
    groupCategories.length > 0
      ? `${groupCategories.map((c) => c.name).join(' • ')}`
      : meta.defaultSubtitle;

  const handleCardClick = (catSlug: string) => {
    onOpenStandaloneCategory(catSlug);
  };

  const resetSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="max-w-[1260px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Clean Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-4 sm:mb-5 flex-wrap"
      >
        <button
          type="button"
          onClick={onBack}
          className="hover:text-[#E22B2B] transition-colors cursor-pointer"
        >
          হোম
        </button>
        <span className="text-rose-300" aria-hidden="true">
          /
        </span>
        <span className="text-[#B91C1C] font-bold">{meta.breadcrumbLabel}</span>
      </nav>

      {/* Warm Frosted Hero Banner */}
      <section
        ref={heroSectionRef}
        id="navbar-group-category-section"
        className="scroll-mt-24 sm:scroll-mt-28 glass-surface rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 lg:p-7 mb-4 sm:mb-6 relative overflow-hidden"
      >
        <div className="relative py-1 flex flex-col items-center justify-center text-center">
          <ScienceBackdropAccent variant="science" layout="symmetrical" />

          <div className="relative z-10 min-w-0 max-w-3xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-inset text-[#B91C1C] text-[11px] sm:text-xs font-bold mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E22B2B] shrink-0" aria-hidden="true" />
              <span>{meta.badge}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-[42px] font-black text-[#2A0F12] tracking-tight leading-tight text-center mb-2">
              {meta.titleLead}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] via-rose-600 to-[#B91C1C]">
                {meta.titleAccent}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#6B4C4F] font-normal leading-relaxed max-w-2xl mx-auto text-center">
              {dynamicSubtitle}
            </p>

            {/* Count Badges & Search Bar */}
            <div className="mt-4 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix shadow-xs">
                  {toBengaliNumber(groupCategories.length)}টি ক্যাটাগরি
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-bold glass-inset text-[#2A0F12] tabular-nums bn-digits-fix">
                  {toBengaliNumber(allGroupCourses.length)}টি সক্রিয় কোর্স
                </span>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#7A5A5D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="এই বিভাগে কোর্স খুঁজুন..."
                  className="w-full pl-10 pr-9 py-2 rounded-full border border-rose-200/90 bg-white/95 text-xs sm:text-sm text-[#2A0F12] placeholder-[#7A5A5D] focus:bg-white focus:border-[#E22B2B] outline-none transition shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="সার্চ মুছুন"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#7A5A5D] hover:text-[#E22B2B] hover:bg-rose-50 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* DYNAMIC CATEGORY ICON CARDS GRID (Reference Style)        */}
      {/* ========================================================= */}
      <section aria-label={`${meta.breadcrumbLabel} ক্যাটাগরি সমূহ`} className="mb-5 sm:mb-9">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 sm:mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E22B2B] animate-ping shrink-0" />
            <h2 className="text-xs sm:text-sm font-extrabold text-[#B91C1C]">
              ক্যাটাগরি নির্বাচন করুন ({toBengaliNumber(groupCategories.length)}টি)
            </h2>
          </div>

          <span className="text-[11px] text-[#6B4C4F] hidden sm:inline-block">
            যেকোনো ক্যাটাগরি কার্ডে ক্লিক করে সেই ক্যাটাগরির ডেডিকেটেড পেজে যান
          </span>
        </div>

        {groupCategories.length === 0 ? (
          <div className="glass-surface rounded-3xl p-8 text-center text-xs sm:text-sm text-[#6B4C4F]">
            এই বিভাগে এখনো কোনো ক্যাটাগরি যুক্ত করা হয়নি।
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4 p-2 sm:p-5 rounded-2xl sm:rounded-3xl glass-surface items-stretch">
            {categorySections.map(({ category: cat }, idx) => {
              const IconComponent = getCategoryLucideIcon(cat);
              const theme = resolveCategoryCardTheme(cat, idx);
              const cardBatchTitle = resolveCategoryCardBatchTitle(cat, selectorIconLabels);

              return (
                <button
                  key={`group-cat-card-${cat.id}-${cat.slug}`}
                  type="button"
                  data-category-id={cat.id}
                  data-category-slug={cat.slug}
                  onClick={() => handleCardClick(cat.slug)}
                  className="group min-w-0 w-full max-w-[106px] sm:max-w-none mx-auto h-full flex flex-col items-center justify-between cursor-pointer text-center focus:outline-none touch-manipulation"
                >
                  {/* Split S-Wave 3D Glass Card matching ClassSelectorStrip & Reference Screenshot */}
                  <div
                    className={`relative w-full flex-1 rounded-[12px] sm:rounded-[22px] overflow-hidden border bg-white/85 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between border-white/95 shadow-[0_10px_28px_-10px_rgba(185,28,28,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ${theme.hoverShadow} group-hover:-translate-y-1.5 group-active:scale-[0.98]`}
                  >
                    {/* TOP RICH 3D RADIAL COLOR STAGE */}
                    <div
                      className={`relative w-full h-[60px] min-[390px]:h-[66px] sm:h-[118px] shrink-0 ${theme.topGradient} flex flex-col items-center justify-center px-1 pt-2.5 pb-1.5 sm:px-3 sm:pb-5 sm:pt-4 overflow-hidden`}
                    >
                      {/* Specular top-left glass sheen */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-45"
                        style={{
                          background:
                            'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 55%)',
                        }}
                      />

                      {/* Compact Tag Badge at top-left */}
                      <span className="absolute top-1 left-1 sm:top-2.5 sm:left-2.5 text-[6px] min-[390px]:text-[6.5px] sm:text-[9.5px] font-black tracking-wider text-white/95 bg-black/20 backdrop-blur-md border border-white/25 px-1 sm:px-2 py-[0.5px] sm:py-0.5 rounded-full max-w-[calc(100%-8px)] sm:max-w-[calc(100%-12px)] truncate">
                        {theme.tag}
                      </span>

                      {/* Centered 3D Frosted Icon Medallion */}
                      <div
                        className={`relative z-10 mt-1.5 sm:mt-2 w-6 h-6 min-[390px]:w-7 min-[390px]:h-7 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${theme.iconGlow} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}
                      >
                        <IconComponent className="w-3.5 h-3.5 min-[390px]:w-4 min-[390px]:h-4 sm:w-7 sm:h-7 stroke-[2.2] drop-shadow-sm" />
                      </div>

                      {/* Rising Frosted S-Curve Wave Divider */}
                      <svg
                        viewBox="0 0 240 42"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 w-full h-[8px] sm:h-[26px] pointer-events-none block"
                      >
                        <path
                          d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                          fill="rgba(255, 255, 255, 0.92)"
                        />
                      </svg>
                    </div>

                    {/* BOTTOM FROSTED ZONE WITH OUTLINED PILL TITLE */}
                    <div className="relative flex-1 bg-white/92 backdrop-blur-md px-1 pt-0.5 pb-1 sm:px-2.5 sm:pt-0.5 sm:pb-3 flex flex-col items-center justify-center shadow-[inset_0_-6px_12px_rgba(185,28,28,0.05)]">
                      <div
                        className={`w-full rounded-lg sm:rounded-full border sm:border-[1.5px] ${theme.pillBorder} ${theme.pillBg} px-1 py-0.5 sm:px-2 sm:py-1 min-h-[28px] sm:min-h-[40px] flex items-center justify-center text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),0_2px_6px_-2px_rgba(0,0,0,0.06)] group-hover:scale-[1.03] transition-transform duration-200`}
                      >
                        <span
                          className={`block w-full font-black text-[8.5px] min-[390px]:text-[9px] sm:text-[12px] tracking-tight leading-[1.15] sm:leading-snug text-center break-words ${theme.pillText}`}
                        >
                          {cat.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Live Batch Title Caption below card matching Home Page style */}
                  <span
                    className={`mt-1.5 sm:mt-2 shrink-0 text-[9px] min-[390px]:text-[9.5px] sm:text-[11px] font-bold text-center leading-tight sm:whitespace-nowrap max-w-full truncate ${theme.statusColor} opacity-90 group-hover:opacity-100 transition-opacity`}
                  >
                    {cardBatchTitle}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* CATEGORY-WISE RELATED COURSES SECTION                     */}
      {/* ========================================================= */}
      <div id="group-courses-section">
        {showGroupedSections ? (
          <div className="space-y-9">
            {categorySections.map(({ category: subCat, courses: subCourses }, idx) => {
              const SectionIcon = getCategoryLucideIcon(subCat);
              const theme = resolveCategoryCardTheme(subCat, idx);
              return (
                <section
                  key={`group-section-${subCat.id}-${subCat.slug}`}
                  aria-label={subCat.name}
                  className="space-y-4"
                >
                  <div className="glass-surface rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${theme.topGradient} text-white flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        <SectionIcon className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-xl font-black text-[#2A0F12] tracking-tight">
                            {subCat.name}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix">
                            {toBengaliNumber(subCourses.length)}টি কোর্স
                          </span>
                        </div>
                        {subCat.subtitle && (
                          <p className="text-xs text-[#6B4C4F] mt-0.5 line-clamp-2">
                            {subCat.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenStandaloneCategory(subCat.slug)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 border border-rose-200 text-[#2A0F12] text-xs font-bold hover:border-[#E22B2B] hover:text-[#B91C1C] transition cursor-pointer"
                      >
                        <span>ক্যাটাগরি পেজ</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {subCourses.length === 0 ? (
                    <div className="glass-surface rounded-2xl p-6 text-center text-xs text-[#6B4C4F]">
                      এই ক্যাটাগরিতে বর্তমানে কোনো সক্রিয় কোর্স নেই।
                    </div>
                  ) : (
                    <CategoryCourseCarousel
                      categorySlug={subCat.slug}
                      categoryName={subCat.name}
                      courses={subCourses}
                      onEnrollClick={onEnrollClick}
                      headingLevel="h3"
                    />
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <section aria-label={meta.breadcrumbLabel}>
            {filteredSingleViewCourses.length === 0 ? (
              <div className="glass-surface rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-2xl glass-inset text-[#E22B2B] flex items-center justify-center mx-auto">
                  <BookOpen className="w-8 h-8" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-[#2A0F12]">
                    কোনো কোর্স পাওয়া যায়নি
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B4C4F]">
                    আপনার সার্চ অনুযায়ী কোনো কোর্স মেলেনি। সার্চ পরিবর্তন করে আবার চেষ্টা করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetSearch}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 hover:opacity-95 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>সব ক্যাটাগরি দেখুন</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                {filteredSingleViewCourses.map((course) => (
                  <motion.div
                    key={`group-filtered-${course.id}-${course.slug}`}
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
        )}
      </div>
    </div>
  );
};
