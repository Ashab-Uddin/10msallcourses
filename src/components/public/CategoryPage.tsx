import React, { useState } from 'react';
import { Category, Course, CourseGroupKey } from '../../types.ts';
import { CourseCard } from './CourseCard.tsx';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
  resolveCourseDepartments,
} from '../../lib/categoryMatching.ts';
import {
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from '../../lib/courseSorting.ts';
import { Search, Sparkles } from 'lucide-react';

interface CategoryPageProps {
  categorySlug: string;
  categories: Category[];
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  onSelectCategory: (slug: string) => void;
  onNavigate?: (path: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({
  categorySlug,
  categories,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | CourseGroupKey>('all');

  const normalizedSlug = categorySlug === 'free' ? 'free-course' : categorySlug;
  const isLanguageLearning = normalizedSlug === 'language-learning';
  const isSkills = normalizedSlug === 'skills';
  const isAdmission = normalizedSlug === 'admission';
  const isBooks = normalizedSlug === 'books';
  const isFreeCourse = normalizedSlug === 'free-course';

  let currentCategory = categories.find((c) => c.slug === normalizedSlug);
  if (isLanguageLearning) {
    currentCategory = {
      id: 999,
      name: 'স্পোকেন ইংলিশ ও ল্যাঙ্গুয়েজ লার্নিং',
      slug: 'language-learning',
      subtitle: 'ঘরে বসে ইংরেজি ভাষা শিক্ষা, স্পোকেন ইংলিশ ও আইইএলটিএস প্রস্তুতির সেরা অনলাইন কোর্সসমূহ',
      badgeColor: '#1E63D6',
      displayOrder: 9,
      status: 'active',
    };
  } else if (!currentCategory && isSkills) {
    currentCategory = {
      id: 3,
      name: 'স্কিলস ও আইটি',
      slug: 'skills',
      subtitle: 'ক্যারিয়ার গড়ার আধুনিক ও প্রফেশনাল অনলাইন কোর্সসমূহ',
      badgeColor: '#1E63D6',
      displayOrder: 3,
      status: 'active',
    };
  } else if (!currentCategory && isAdmission) {
    currentCategory = {
      id: 4,
      name: 'বিশ্ববিদ্যালয় ও মেডিকেল এডমিশন',
      slug: 'admission',
      subtitle: 'বুয়েট, মেডিকেল, ঢাকা বিশ্ববিদ্যালয় ও প্রযুক্তি গুচ্ছ এডমিশন প্রস্তুতি',
      badgeColor: '#E22B2B',
      displayOrder: 4,
      status: 'active',
    };
  } else if (!currentCategory && isBooks) {
    currentCategory = {
      id: 5,
      name: 'বুক স্টোর ও প্রিন্টেড নোটস',
      slug: 'books',
      subtitle: 'একাডেমিক ও এডমিশন প্রস্তুতির সেরা গাইড, লেকচার শিট ও বইসমূহ',
      badgeColor: '#E22B2B',
      displayOrder: 5,
      status: 'active',
    };
  } else if (!currentCategory && isFreeCourse) {
    currentCategory = {
      id: 9,
      name: 'ফ্রি কোর্স',
      slug: 'free-course',
      subtitle: 'সম্পূর্ণ বিনামূল্যের কোর্স, মাস্টারক্লাস ও লার্নিং কনটেন্ট',
      badgeColor: 'emerald',
      displayOrder: 9,
      status: 'active',
    };
  } else if (!currentCategory) {
    currentCategory = categories[0] || {
      id: 0,
      name: 'কোর্স ক্যাটালগ',
      slug: normalizedSlug,
      subtitle: 'সকল উপলব্ধ কোর্স ও অনলাইন ব্যাচ',
      badgeColor: '#E22B2B',
      displayOrder: 1,
      status: 'active',
    };
  }

  const showBatchAndGroupFilters =
    currentCategory.slug === 'hsc' || currentCategory.slug === 'school';
  const batchOptions =
    currentCategory.slug === 'hsc'
      ? [
          { id: 'all', label: 'সকল ব্যাচ' },
          { id: 'hsc-26', label: 'HSC 26' },
          { id: 'hsc-27', label: 'HSC 27' },
          { id: 'hsc-28', label: 'HSC 28' },
        ]
      : currentCategory.slug === 'school'
        ? [
            { id: 'all', label: 'সকল ব্যাচ' },
            { id: 'ssc-2027', label: 'SSC 2027' },
            { id: 'ssc-2028', label: 'SSC 2028' },
          ]
        : [];
  const groupOptions: ReadonlyArray<{ id: 'all' | CourseGroupKey; label: string }> = [
    { id: 'all', label: 'সকল বিভাগ' },
    { id: 'science', label: 'বিজ্ঞান বিভাগ' },
    { id: 'business', label: 'ব্যবসায় শিক্ষা' },
    { id: 'humanities', label: 'মানবিক বিভাগ' },
  ];

  const categoryCourses = sortCoursesForCategory(
    courses.filter((c) => courseMatchesCategorySlug(c, currentCategory.slug)),
    currentCategory.slug,
    categoryCourseOrders
  );

  const filteredCourses = categoryCourses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.headerTitle.toLowerCase().includes(q) ||
      c.headerSubtitle.toLowerCase().includes(q) ||
      (c.targetStudents || '').toLowerCase().includes(q);

    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'under3000' && c.discountPrice <= 3000) ||
      (priceFilter === '3000to5000' && c.discountPrice > 3000 && c.discountPrice <= 5000) ||
      (priceFilter === 'above5000' && c.discountPrice > 5000);

    const matchesBatch =
      !showBatchAndGroupFilters ||
      batchFilter === 'all' ||
      courseMatchesAcademicBatch(c, batchFilter);

    const matchesGroup =
      !showBatchAndGroupFilters ||
      groupFilter === 'all' ||
      resolveCourseDepartments(c).includes(groupFilter);

    return matchesSearch && matchesPrice && matchesBatch && matchesGroup;
  });

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Clean Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-5">
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
        <span className="text-[#B91C1C] font-bold">{currentCategory.name}</span>
      </nav>

      {/* Warm Frosted Category Header Card */}
      <div className="glass-surface rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-inset text-[#B91C1C] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ক্যাটাগরি পেজ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#2A0F12] mb-2 tracking-tight">
            {currentCategory.name}
          </h1>

          {currentCategory.subtitle && (
            <p className="text-xs sm:text-sm text-[#6B4C4F] font-normal leading-relaxed">
              {currentCategory.subtitle}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E22B2B] text-white">
              {toBengaliNumber(filteredCourses.length)}টি কোর্স পাওয়া গেছে
            </span>
          </div>
        </div>
      </div>

      {/* Search & Batch/Group Filter Controls */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#7A5A5D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কোর্স খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-rose-200/90 bg-white/90 text-xs sm:text-sm text-[#2A0F12] placeholder-[#7A5A5D] focus:bg-white focus:border-[#E22B2B] outline-none transition shadow-2xs"
            />
          </div>

          {showBatchAndGroupFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {batchOptions.map((opt) => {
                const active = batchFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBatchFilter(opt.id)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-xs'
                        : 'bg-white/90 text-[#2A0F12] border-rose-200/90 hover:border-[#E22B2B] hover:text-[#B91C1C]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showBatchAndGroupFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            {groupOptions.map((opt) => {
              const active = groupFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGroupFilter(opt.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                    active
                      ? 'bg-[#2A0F12] text-white border-[#2A0F12] shadow-xs'
                      : 'bg-white/85 text-[#4A2528] border-rose-200/80 hover:border-[#E22B2B] hover:text-[#B91C1C]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Courses Grid */}
      <section aria-label={currentCategory.name}>
        <h2 className="sr-only">{currentCategory.name} — কোর্স তালিকা</h2>
        {filteredCourses.length === 0 ? (
          <div className="glass-surface rounded-3xl p-12 text-center space-y-3">
            <h3 className="text-base font-bold text-[#2A0F12]">কোনো কোর্স পাওয়া যায়নি</h3>
            <p className="text-xs text-[#6B4C4F]">
              আপনার ফিল্টার বা সার্চ টার্ম পরিবর্তন করে পুনরায় চেষ্টা করুন।
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPriceFilter('all');
                setBatchFilter('all');
                setGroupFilter('all');
              }}
              className="mt-2 px-5 py-2 rounded-full bg-[#E22B2B] text-white text-xs font-bold hover:bg-[#B91C1C] transition cursor-pointer"
            >
              ফিল্টার রিসেট করুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredCourses.map((course) => (
              <div
                key={`category-course-${course.id}-${course.slug}`}
                className="h-full flex flex-col"
              >
                <CourseCard course={course} onEnrollClick={onEnrollClick} headingLevel="h3" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
