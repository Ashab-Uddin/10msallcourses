import React, { useState } from 'react';
import { Category, Course } from '../../types.ts';
import { CourseCard } from './CourseCard.tsx';
import { toBengaliNumber } from '../../utils/format.ts';
import { Search, Sparkles } from 'lucide-react';

interface CategoryPageProps {
  categorySlug: string;
  categories: Category[];
  courses: Course[];
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  onSelectCategory: (slug: string) => void;
  onNavigate?: (path: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({
  categorySlug,
  categories,
  courses,
  onBack,
  onEnrollClick,
  onSelectCategory,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');

  const isLanguageLearning = categorySlug === 'language-learning';
  const isSkills = categorySlug === 'skills';
  const isAdmission = categorySlug === 'admission';
  const isBooks = categorySlug === 'books';

  let currentCategory = categories.find((c) => c.slug === categorySlug);
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
  } else if (!currentCategory) {
    currentCategory = categories[0] || {
      id: 0,
      name: 'কোর্স ক্যাটালগ',
      slug: categorySlug,
      subtitle: 'সকল উপলব্ধ কোর্স ও অনলাইন ব্যাচ',
      badgeColor: '#E22B2B',
      displayOrder: 1,
      status: 'active',
    };
  }

  const categoryCourses = courses.filter((c) => {
    if (isLanguageLearning) {
      if (c.categorySlug === 'language-learning') return true;
      const text = `${c.title} ${c.slug} ${c.description}`.toLowerCase();
      return (
        text.includes('english') ||
        text.includes('spoken') ||
        text.includes('ielts') ||
        text.includes('মুনজেরিন') ||
        text.includes('ভাষা')
      );
    }
    if (isBooks) {
      if (c.categorySlug === 'books') return true;
      const text = `${c.title} ${c.slug} ${c.description}`.toLowerCase();
      return text.includes('বুক') || text.includes('বই') || text.includes('নোট');
    }
    return c.categorySlug === currentCategory.slug;
  });

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

    return matchesSearch && matchesPrice;
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

      {/* Search Bar Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
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
