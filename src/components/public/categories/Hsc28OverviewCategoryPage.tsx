'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, RotateCcw, Search, Sparkles } from 'lucide-react';
import type { Category, Course } from '../../../types.ts';
import { toBengaliNumber } from '../../../utils/format.ts';
import { useHistoryViewState } from '../../../lib/navigationHistory.ts';
import {
  categorySlugsMatch,
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
} from '../../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../../lib/courseSorting.ts';
import { resolveCategoryNavGroup } from '../../../lib/navbarCategories.ts';
import { CourseCard } from '../CourseCard.tsx';
import { CategoryCourseCarousel } from '../CategoryCourseCarousel.tsx';
import { ScienceBackdropAccent } from '../ScienceBackdropAccent.tsx';
import { useCategoryScrollIntoView } from '../../../lib/useCategoryScrollIntoView.ts';

interface Hsc28OverviewCategoryPageProps {
  groupKey: 'hsc28' | 'hsc27';
  categories: Category[];
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  onSelectCategory: (slug: string) => void;
}

export const Hsc28OverviewCategoryPage: React.FC<Hsc28OverviewCategoryPageProps> = ({
  groupKey,
  categories,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
  onSelectCategory,
}) => {
  const storageSlug = groupKey === 'hsc28' ? 'hsc-28' : 'hsc-27';
  const categorySectionRef = useCategoryScrollIntoView<HTMLDivElement>(
    `hsc-overview-${storageSlug}`
  );
  const [selectedSubSlug, setSelectedSubSlug] = useHistoryViewState(
    'subFilter',
    'all',
    storageSlug
  );
  const [searchQuery, setSearchQuery] = useHistoryViewState(
    'categorySearchQuery',
    '',
    storageSlug
  );

  const subCategories = useMemo(
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

  const subCategorySections = useMemo(
    () =>
      subCategories.map((subCat) => {
        const subCourses = sortCoursesForCategory(
          courses.filter((c) => courseMatchesCategorySlug(c, subCat.slug)),
          subCat.slug,
          categoryCourseOrders
        );
        return {
          category: subCat,
          courses: subCourses,
        };
      }),
    [subCategories, courses, categoryCourseOrders]
  );

  const allGroupCourses = useMemo(() => {
    const seen = new Set<number>();
    const combined: Course[] = [];
    for (const section of subCategorySections) {
      for (const c of section.courses) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          combined.push(c);
        }
      }
    }
    const batchKey = groupKey === 'hsc28' ? 'hsc-28' : 'hsc-27';
    for (const c of courses) {
      if (!seen.has(c.id) && courseMatchesAcademicBatch(c, batchKey)) {
        seen.add(c.id);
        combined.push(c);
      }
    }
    return combined;
  }, [subCategorySections, courses, groupKey]);

  const activeSubSection = useMemo(
    () =>
      selectedSubSlug === 'all'
        ? null
        : subCategorySections.find((sec) =>
            categorySlugsMatch(sec.category.slug, selectedSubSlug)
          ) || null,
    [subCategorySections, selectedSubSlug]
  );

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const baseCoursesForSingleView = activeSubSection
    ? activeSubSection.courses
    : allGroupCourses;

  const filteredSingleViewCourses = useMemo(() => {
    if (!normalizedQuery) return baseCoursesForSingleView;
    return baseCoursesForSingleView.filter(
      (c) =>
        c.title.toLowerCase().includes(normalizedQuery) ||
        c.description.toLowerCase().includes(normalizedQuery) ||
        c.headerTitle.toLowerCase().includes(normalizedQuery) ||
        c.headerSubtitle.toLowerCase().includes(normalizedQuery) ||
        (c.targetStudents || '').toLowerCase().includes(normalizedQuery)
    );
  }, [baseCoursesForSingleView, normalizedQuery]);

  const showGroupedSections = !activeSubSection && !normalizedQuery;
  const pageTitle = groupKey === 'hsc28' ? 'HSC 28 অনলাইন ব্যাচ' : 'HSC 27 অনলাইন ব্যাচ';
  const pageBadge =
    groupKey === 'hsc28'
      ? 'HSC 28 একাডেমিক অনলাইন প্রোগ্রাম'
      : 'HSC 27 একাডেমিক অনলাইন প্রোগ্রাম';
  const pageSubtitle =
    subCategories.length > 0
      ? `${subCategories.map((c) => c.name).join(' • ')} — সকল বিভাগের কোর্সসমূহ`
      : 'এইচএসসি ব্যাচের সকল বিভাগভিত্তিক অনলাইন কোর্স ও লাইভ ব্যাচসমূহ';

  const resetFilters = () => {
    setSelectedSubSlug('all');
    setSearchQuery('');
  };

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

      {/* Warm Frosted Category Header Card */}
      <div
        ref={categorySectionRef}
        id="category-page-section"
        className="scroll-mt-24 sm:scroll-mt-28 glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-7 relative overflow-hidden"
      >
        <div className="relative py-1 sm:py-2 flex flex-col items-center justify-center text-center">
          <ScienceBackdropAccent variant="science" layout="symmetrical" />

          <div className="relative z-10 min-w-0 max-w-3xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-inset text-[#B91C1C] text-[11px] sm:text-xs font-bold mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E22B2B] shrink-0" aria-hidden="true" />
              <span>{pageBadge}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-[42px] font-black text-[#2A0F12] tracking-tight leading-tight text-center mb-2">
              {groupKey === 'hsc28' ? 'HSC 28' : 'HSC 27'}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] via-rose-600 to-[#B91C1C]">
                অনলাইন ব্যাচ
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-[#6B4C4F] font-normal leading-relaxed max-w-2xl mx-auto text-center">
              {pageSubtitle}
            </p>
          </div>
        </div>

        <div className="relative z-10 border-t border-rose-100/85 my-4" />

        {/* Subcategory Pills & Search */}
        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubSlug('all')}
              aria-pressed={!activeSubSection}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition cursor-pointer ${
                !activeSubSection
                  ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-xs'
                  : 'bg-white/90 text-[#2A0F12] border-rose-200/90 hover:border-[#E22B2B] hover:text-[#B91C1C]'
              }`}
            >
              সব বিভাগ ({toBengaliNumber(allGroupCourses.length)})
            </button>

            {subCategorySections.map(({ category: subCat, courses: subCourses }) => {
              const isSelected = Boolean(
                activeSubSection &&
                  categorySlugsMatch(activeSubSection.category.slug, subCat.slug)
              );
              return (
                <button
                  key={`subcat-pill-${subCat.id}-${subCat.slug}`}
                  type="button"
                  onClick={() => onSelectCategory(subCat.slug)}
                  aria-pressed={isSelected}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold border transition cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-xs'
                      : 'bg-white/90 text-[#2A0F12] border-rose-200/90 hover:border-[#E22B2B] hover:text-[#B91C1C]'
                  }`}
                >
                  {subCat.name} ({toBengaliNumber(subCourses.length)})
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-[#7A5A5D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কোর্স খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-rose-200/90 bg-white/90 text-xs sm:text-sm text-[#2A0F12] placeholder-[#7A5A5D] focus:bg-white focus:border-[#E22B2B] outline-none transition shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Grouped View: Each Active Subcategory + Its Courses */}
      {showGroupedSections ? (
        <div className="space-y-8">
          {subCategorySections.map(({ category: subCat, courses: subCourses }) => (
            <section
              key={`subcat-section-${subCat.id}-${subCat.slug}`}
              aria-label={subCat.name}
              className="space-y-4"
            >
              <div className="glass-surface rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
                      {subCat.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E22B2B] text-white tabular-nums bn-digits-fix">
                      {toBengaliNumber(subCourses.length)}টি কোর্স
                    </span>
                  </div>
                  {subCat.subtitle && (
                    <p className="text-xs text-[#6B4C4F] mt-1">{subCat.subtitle}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCategory(subCat.slug)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white/95 border border-rose-200 text-[#B91C1C] text-xs font-bold hover:border-[#E22B2B] hover:bg-rose-50 transition cursor-pointer shrink-0"
                >
                  <span>ক্যাটাগরি পেজ দেখুন</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </button>
              </div>

              {subCourses.length === 0 ? (
                <div className="glass-surface rounded-2xl p-6 text-center text-xs text-[#6B4C4F]">
                  এই বিভাগে বর্তমানে কোনো সক্রিয় কোর্স নেই।
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
          ))}
        </div>
      ) : (
        <section aria-label={activeSubSection ? activeSubSection.category.name : pageTitle}>
          {activeSubSection && (
            <div className="glass-surface rounded-2xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#2A0F12]">
                  {activeSubSection.category.name}
                </h2>
                {activeSubSection.category.subtitle && (
                  <p className="text-xs text-[#6B4C4F] mt-0.5">
                    {activeSubSection.category.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelectCategory(activeSubSection.category.slug)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white/95 border border-rose-200 text-[#B91C1C] text-xs font-bold hover:border-[#E22B2B] hover:bg-rose-50 transition cursor-pointer shrink-0"
              >
                <span>{activeSubSection.category.name} পেজ দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>
            </div>
          )}

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
                  আপনার ফিল্টার বা সার্চ টার্ম পরিবর্তন করে পুনরায় চেষ্টা করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 hover:opacity-95 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>সব বিভাগ দেখুন</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
              {filteredSingleViewCourses.map((course) => (
                <motion.div
                  key={`hsc-filtered-${course.id}-${course.slug}`}
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
  );
};
