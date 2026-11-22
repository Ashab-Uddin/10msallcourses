'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Book, BookCategory, BookShelfTheme, SiteSettings } from '../../types.ts';
import { BookCard } from './BookCard.tsx';
import { BookDetailsModal } from './BookDetailsModal.tsx';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  getPreviousHistoryUrl,
  navigateBack,
  normalizeUrlParts,
  useHistoryOverlay,
  useHistoryViewState,
  type NavigateOptions,
} from '../../lib/navigationHistory.ts';
import {
  BookOpen,
  BookMarked,
  BookText,
  Library,
  ChevronRight,
  Search,
  X,
  Sparkles,
  ArrowLeft,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { decodeCourseSlug } from '../../lib/courseSlug.ts';

interface BookStorePageProps {
  bookCategories: BookCategory[];
  books: Book[];
  booksLoading?: boolean;
  booksError?: string | null;
  initialCategorySlug?: string;
  settings?: SiteSettings | null;
  onBack?: () => void;
  onNavigate?: (path: string, options?: NavigateOptions) => void;
  onRefreshBooks?: () => Promise<void>;
}

const SHELF_GLOW_CLASSES: Record<BookShelfTheme, string> = {
  blue: 'from-sky-400/14 via-indigo-200/10 to-rose-200/10',
  rose: 'from-[#ff5252]/14 via-rose-300/12 to-amber-200/10',
  amber: 'from-amber-400/14 via-orange-200/10 to-rose-200/10',
  emerald: 'from-emerald-400/14 via-teal-200/10 to-rose-100/10',
  slate: 'from-rose-300/12 via-white/15 to-rose-200/10',
};

const FALLBACK_THEME_ORDER: BookShelfTheme[] = ['rose', 'blue', 'amber', 'emerald', 'slate'];

function getShelfGlowClass(theme: BookShelfTheme | undefined, index: number): string {
  if (theme && SHELF_GLOW_CLASSES[theme]) {
    return SHELF_GLOW_CLASSES[theme];
  }
  return SHELF_GLOW_CLASSES[FALLBACK_THEME_ORDER[index % FALLBACK_THEME_ORDER.length]];
}

interface CategoryBookSectionProps {
  category: BookCategory;
  books: Book[];
  index: number;
  defaultAffiliateRef?: string;
  onViewAll: (slug: string) => void;
  onSelectBook: (book: Book) => void;
  onBuyClick: (book: Book) => void;
}

const CategoryBookSection: React.FC<CategoryBookSectionProps> = ({
  category,
  books,
  index,
  defaultAffiliateRef,
  onViewAll,
  onSelectBook,
  onBuyClick,
}) => {
  const sectionHeading = category.sectionTitle?.trim() || `${category.name}-এর সকল বই`;
  const headingIncludesCategoryName = sectionHeading
    .toLowerCase()
    .includes(category.name.trim().toLowerCase());

  return (
    <section className="space-y-4">
      {/* Section Header Row */}
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          {!headingIncludesCategoryName && (
            <span className="block text-[11px] font-extrabold text-[#B91C1C] tracking-wide mb-0.5">
              {category.name}
            </span>
          )}
          <h2 className="text-lg sm:text-2xl font-black text-[#2A0F12] tracking-tight truncate">
            {sectionHeading}
          </h2>
          {category.subtitle && (
            <p className="text-xs sm:text-[13px] text-[#6B4C4F] mt-0.5 line-clamp-1">
              {category.subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onViewAll(category.slug)}
          title={`${category.name}-এর সব বই দেখুন`}
          className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-full glass-inset hover:bg-white/90 text-xs sm:text-[13px] font-bold text-[#2A0F12] hover:text-[#E22B2B] transition-all shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Frosted Glassmorphism Book Grid: Mobile 2 columns, Tablet 2 columns, Desktop 4 columns */}
      <div className="relative rounded-2xl sm:rounded-[28px] glass-surface p-2.5 sm:p-5 overflow-hidden">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getShelfGlowClass(
            category.shelfTheme,
            index
          )}`}
        />

        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 items-stretch">
          {books.map((book) => (
            <div key={book.id} className="h-full flex flex-col min-w-0">
              <BookCard
                book={book}
                categoryName={category.name}
                defaultAffiliateRef={defaultAffiliateRef}
                onSelect={onSelectBook}
                onBuyClick={onBuyClick}
                headingLevel="h3"
                compactMobile
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const BookStorePage: React.FC<BookStorePageProps> = ({
  bookCategories,
  books,
  booksLoading = false,
  booksError = null,
  initialCategorySlug = 'all',
  settings,
  onBack,
  onNavigate,
  onRefreshBooks,
}) => {
  const normalizedInitialCategory = useMemo(() => {
    if (!initialCategorySlug || initialCategorySlug === 'all') return 'all';
    return (decodeCourseSlug(initialCategorySlug) || initialCategorySlug).normalize('NFC');
  }, [initialCategorySlug]);
  const [localSelectedCategory, setLocalSelectedCategory] = useState<string>(
    normalizedInitialCategory
  );
  const selectedCategory = onNavigate
    ? normalizedInitialCategory
    : localSelectedCategory;
  const [searchQuery, setSearchQuery] = useHistoryViewState(
    'bookSearchQuery',
    '',
    normalizedInitialCategory
  );
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loadingBookDetails, setLoadingBookDetails] = useState(false);

  const closeBookModal = useCallback(() => {
    setSelectedBook(null);
  }, []);

  useHistoryOverlay('book-details-modal', Boolean(selectedBook), closeBookModal);

  const navigateToBookCategory = (slug: string, scrollTop?: number) => {
    if (onNavigate) {
      const targetUrl = slug === 'all' ? '/books' : `/books/${slug}`;
      onNavigate(targetUrl, typeof scrollTop === 'number' ? { scrollTop } : { noScroll: true });
    } else {
      setLocalSelectedCategory(slug);
      if (typeof window !== 'undefined' && typeof scrollTop === 'number') {
        window.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
    }
  };

  const handleBackToAllBooks = () => {
    setSearchQuery('');
    const prevUrl = getPreviousHistoryUrl();
    if (
      onNavigate &&
      selectedCategory !== 'all' &&
      prevUrl &&
      normalizeUrlParts(prevUrl).decodedPathname === '/books'
    ) {
      navigateBack('/books');
      return;
    }
    navigateToBookCategory('all');
  };

  const activeCategoryMap = useMemo(() => {
    const map = new Map<string, BookCategory>();
    for (const cat of bookCategories) {
      const normalized = cat.slug.normalize('NFC');
      map.set(normalized, cat);
      map.set(normalized.toLowerCase(), cat);
    }
    return map;
  }, [bookCategories]);

  const selectedCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    const normalized = selectedCategory.normalize('NFC');
    return activeCategoryMap.get(normalized) || activeCategoryMap.get(normalized.toLowerCase()) || null;
  }, [selectedCategory, activeCategoryMap]);

  // Record book affiliate clicks asynchronously without delaying redirect
  const handleRecordBookClick = (book: Book) => {
    if (!book.slug) return;
    fetch(`/api/public/books/click/${encodeURIComponent(book.slug)}`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {});
  };

  // Filtered books by search & selected category
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetSlugLower = selectedCategory.normalize('NFC').toLowerCase();
    return books.filter((b) => {
      if (selectedCategory !== 'all') {
        const matchesSlug = b.categorySlug.normalize('NFC').toLowerCase() === targetSlugLower;
        const matchesId = selectedCategoryObj ? b.categoryId === selectedCategoryObj.id : false;
        if (!matchesSlug && !matchesId) {
          return false;
        }
      }
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.bookType.toLowerCase().includes(q) ||
        (activeCategoryMap.get(b.categorySlug.normalize('NFC').toLowerCase())?.name || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [books, selectedCategory, selectedCategoryObj, searchQuery, activeCategoryMap]);

  // Group books per category when viewing "সব" without active search query
  const groupedShelves = useMemo(() => {
    return bookCategories
      .map((cat) => {
        const catSlugLower = cat.slug.normalize('NFC').toLowerCase();
        return {
          category: cat,
          items: books.filter(
            (b) =>
              b.categorySlug.normalize('NFC').toLowerCase() === catSlugLower ||
              b.categoryId === cat.id
          ),
        };
      })
      .filter((group) => group.items.length > 0);
  }, [bookCategories, books]);

  const handleOpenBookDetails = async (book: Book) => {
    setSelectedBook(book);
    setLoadingBookDetails(true);
    try {
      const res = await fetch(`/api/public/books/${book.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.book) {
          setSelectedBook(data.book);
        }
      }
    } catch {
      // Fall back to already loaded book payload cleanly
    } finally {
      setLoadingBookDetails(false);
    }
  };

  const isGroupedShelfView = selectedCategory === 'all' && searchQuery.trim() === '';

  return (
    <div className="pb-14">
      {/* ========================================================= */}
      {/* 1. WARM FROSTED GLASS HERO BANNER (Consistent Site Theme) */}
      {/* ========================================================= */}
      <section className="max-w-[1260px] mx-auto px-4 sm:px-6 pt-3 sm:pt-4">
        {/* Clean Breadcrumb matching CategoryPage & AcademicPage */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-[#6B4C4F] font-medium mb-4"
        >
          <button
            type="button"
            onClick={() => onBack?.()}
            className="hover:text-[#E22B2B] transition-colors cursor-pointer"
          >
            হোম
          </button>
          <span className="text-rose-300" aria-hidden="true">
            /
          </span>
          <span className="text-[#B91C1C] font-bold">বুক স্টোর</span>
          {selectedCategoryObj && (
            <>
              <span className="text-rose-300" aria-hidden="true">
                /
              </span>
              <span className="text-[#2A0F12] font-bold">{selectedCategoryObj.name}</span>
            </>
          )}
        </nav>

        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] glass-strong border border-white/95 px-6 sm:px-10 lg:px-12 py-8 sm:py-10 shadow-[0_18px_48px_-18px_rgba(185,28,28,0.16),0_6px_20px_-8px_rgba(42,15,18,0.08)]">
          {/* Decorative Warm Brand Waves echoing HeaderNav */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl bg-gradient-to-br from-[#ff5252]/40 via-rose-300/30 to-amber-200/30" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full opacity-25 blur-3xl bg-gradient-to-tr from-rose-300/40 via-[#eb1c24]/20 to-transparent" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-3 text-left">
              <div className="inline-flex items-center gap-2 text-[#B91C1C] text-xs sm:text-[13px] font-extrabold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#E22B2B]" />
                <span>10MS স্টোর · প্রিন্টেড বুক কালেকশন</span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#2A0F12] leading-[1.18] tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                সেরা শিক্ষার্থীদের{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B91C1C] via-[#E22B2B] to-rose-500">
                  প্রয়োজনীয় উপকরণ
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-[#6B4C4F] max-w-xl leading-relaxed pt-0.5 font-normal">
                এইচএসসি, এসএসসি ও শ্রেণিভিত্তিক সকল প্রিন্টেড মাস্টারবুক, লেকচার গাইড এবং একাডেমিক বই এক জায়গায়।
              </p>

              {/* Inline Book Search Bar matching Site HeaderNav pill */}
              <div className="pt-2.5 max-w-md">
                <div className="relative flex items-center bg-white/95 hover:bg-white focus-within:bg-white border border-rose-200/90 focus-within:border-[#eb1c24] rounded-full pl-4 pr-1.5 py-1.5 shadow-[0_6px_18px_-8px_rgba(226,43,43,0.18)] transition">
                  <Search className="w-4 h-4 text-[#991b1b]/65 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="বইয়ের নাম বা শ্রেণি দিয়ে খুঁজুন..."
                    className="w-full bg-transparent text-xs sm:text-sm text-[#2A0F12] placeholder-[#6B4C4F]/65 outline-none font-medium"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="সার্চ মুছুন"
                      className="p-1.5 rounded-full text-[#6B4C4F] hover:text-[#eb1c24] hover:bg-rose-50 transition cursor-pointer mr-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Right Decorative Book Background Icons (Consistent Frosted Glass Motif) */}
            <div
              aria-hidden="true"
              className="hidden sm:flex lg:col-span-5 relative items-center justify-center h-[190px] sm:h-[220px] select-none pointer-events-none"
            >
              <div className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-[#ff5252]/18 via-rose-300/20 to-amber-200/18 blur-2xl" />
              <div className="absolute w-52 h-52 rounded-full border border-dashed border-[#E22B2B]/18" />
              <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#B91C1C]/14" />

              <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-[30px] bg-white/75 backdrop-blur-md border border-white shadow-[0_20px_44px_-14px_rgba(185,28,28,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center -rotate-6">
                <BookOpen className="w-14 h-14 sm:w-16 sm:h-16 text-[#E22B2B]/80 stroke-[1.5]" />
              </div>

              <div className="absolute top-3 right-10 sm:right-16 rotate-12 w-12 h-12 rounded-2xl bg-white/65 border border-white/90 shadow-[0_10px_24px_-10px_rgba(185,28,28,0.18)] flex items-center justify-center text-[#B91C1C]/45">
                <BookMarked className="w-6 h-6 stroke-[1.6]" />
              </div>

              <div className="absolute bottom-4 left-10 sm:left-16 -rotate-12 w-12 h-12 rounded-2xl bg-white/60 border border-white/85 shadow-[0_10px_24px_-10px_rgba(185,28,28,0.16)] flex items-center justify-center text-[#B91C1C]/40">
                <Library className="w-6 h-6 stroke-[1.6]" />
              </div>

              <div className="absolute bottom-7 right-14 sm:right-20 rotate-6 w-10 h-10 rounded-xl bg-white/55 border border-rose-200/70 flex items-center justify-center text-[#E22B2B]/35">
                <BookText className="w-5 h-5 stroke-[1.6]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. CATEGORY FILTER BAR (Interactive Segmented Controls)   */}
      {/* ========================================================= */}
      <section className="max-w-[1260px] mx-auto px-4 sm:px-6 pt-6 sm:pt-7">
        <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-2 glass-strong border border-white/95 rounded-2xl p-2 max-w-full overflow-x-auto shadow-sm">
          <button
            type="button"
            onClick={() => navigateToBookCategory('all')}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_8px_18px_-6px_rgba(226,43,43,0.48)]'
                : 'bg-white/90 text-[#2A0F12] border border-rose-200/70 hover:border-[#eb1c24]/50 hover:text-[#eb1c24]'
            }`}
          >
            সব
          </button>

          {bookCategories.map((cat) => {
            const isSelected =
              selectedCategory.normalize('NFC').toLowerCase() ===
              cat.slug.normalize('NFC').toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigateToBookCategory(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_8px_18px_-6px_rgba(226,43,43,0.48)]'
                    : 'bg-white/90 text-[#2A0F12] border border-rose-200/70 hover:border-[#eb1c24]/50 hover:text-[#eb1c24]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CATEGORY BOOK SECTIONS OR FILTERED BOOK GRID           */}
      {/* ========================================================= */}
      <section className="max-w-[1260px] mx-auto px-4 sm:px-6 pt-7 sm:pt-9 space-y-10">
        {booksLoading && books.length === 0 ? (
          <div className="space-y-4">
            <div className="h-7 w-48 rounded-xl bg-rose-100/80 animate-pulse" />
            <div className="glass-surface rounded-2xl sm:rounded-[28px] p-3 sm:p-5">
              <div
                className={`grid gap-2.5 sm:gap-5 ${
                  isGroupedShelfView
                    ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="h-72 sm:h-88 rounded-2xl bg-white/75 border border-rose-100/80 animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : booksError && books.length === 0 ? (
          <div className="glass-strong rounded-3xl p-10 sm:p-14 text-center space-y-3 border border-rose-200/80">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 mx-auto flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-[#eb1c24]" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#2A0F12]">{booksError}</h2>
            <p className="text-xs sm:text-sm text-[#6B4C4F] max-w-md mx-auto leading-relaxed">
              সার্ভার থেকে বইয়ের তথ্য লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।
            </p>
            {onRefreshBooks && (
              <button
                type="button"
                onClick={() => void onRefreshBooks()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>আবার চেষ্টা করুন</span>
              </button>
            )}
          </div>
        ) : isGroupedShelfView ? (
          groupedShelves.length > 0 ? (
            groupedShelves.map((group, idx) => (
              <CategoryBookSection
                key={group.category.id}
                category={group.category}
                books={group.items}
                index={idx}
                defaultAffiliateRef={settings?.defaultAffiliateRef}
                onViewAll={(slug) => {
                  navigateToBookCategory(slug, 320);
                }}
                onSelectBook={handleOpenBookDetails}
                onBuyClick={handleRecordBookClick}
              />
            ))
          ) : (
            <div className="glass-strong rounded-3xl p-10 sm:p-14 text-center space-y-3 border border-rose-100/80">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 mx-auto flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-[#eb1c24]" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#2A0F12]">
                বুক স্টোরে এখনো কোনো বই যুক্ত করা হয়নি
              </h2>
              <p className="text-xs sm:text-sm text-[#6B4C4F] max-w-md mx-auto leading-relaxed">
                অ্যাডমিন প্যানেলের <strong>Book Add</strong> পেজ থেকে নতুন বই যুক্ত ও Active করলে তা স্বয়ংক্রিয়ভাবে এখানে ক্যাটাগরি অনুযায়ী প্রদর্শিত হবে।
              </p>
            </div>
          )
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToAllBooks}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-inset hover:bg-white/90 text-xs font-bold text-[#2A0F12] hover:text-[#E22B2B] transition cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>সব বই</span>
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#2A0F12]">
                    {selectedCategoryObj
                      ? selectedCategoryObj.sectionTitle || `${selectedCategoryObj.name}-এর সকল বই`
                      : `“${searchQuery}” সার্চ ফলাফল`}
                  </h2>
                  <p className="text-xs text-[#6B4C4F] tabular-nums">
                    মোট {toBengaliNumber(filteredBooks.length)}টি বই পাওয়া গেছে
                  </p>
                </div>
              </div>
            </div>

            {filteredBooks.length > 0 ? (
              <div className="relative rounded-[28px] glass-surface p-4 sm:p-5 overflow-hidden">
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getShelfGlowClass(
                    selectedCategoryObj?.shelfTheme,
                    0
                  )}`}
                />
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                  {filteredBooks.map((book) => (
                    <div key={book.id} className="h-full flex flex-col">
                      <BookCard
                        book={book}
                        categoryName={
                          activeCategoryMap.get(book.categorySlug)?.name || book.categorySlug
                        }
                        defaultAffiliateRef={settings?.defaultAffiliateRef}
                        onSelect={handleOpenBookDetails}
                        onBuyClick={handleRecordBookClick}
                        headingLevel="h3"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-strong rounded-3xl p-10 text-center space-y-3 border border-rose-100/80">
                <Layers className="w-10 h-10 text-rose-300 mx-auto" />
                <h3 className="text-base sm:text-lg font-black text-[#2A0F12]">
                  এই ক্যাটাগরিতে কোনো বই পাওয়া যায়নি
                </h3>
                <p className="text-xs text-[#6B4C4F] max-w-md mx-auto">
                  অন্য ক্যাটাগরি নির্বাচন করুন অথবা সার্চ ফিল্টার পরিবর্তন করে চেষ্টা করুন।
                </p>
                <button
                  type="button"
                  onClick={handleBackToAllBooks}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  সব ক্যাটাগরি দেখুন
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 4. BOOK DETAILS MODAL                                     */}
      {/* ========================================================= */}
      <BookDetailsModal
        book={selectedBook}
        categoryName={
          selectedBook
            ? activeCategoryMap.get(selectedBook.categorySlug.normalize('NFC').toLowerCase())
                ?.name ||
              activeCategoryMap.get(selectedBook.categorySlug)?.name ||
              selectedBook.categorySlug
            : undefined
        }
        settings={settings}
        loadingDetails={loadingBookDetails}
        onClose={closeBookModal}
        onBuyClick={handleRecordBookClick}
      />
    </div>
  );
};
