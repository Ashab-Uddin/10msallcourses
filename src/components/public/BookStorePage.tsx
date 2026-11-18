'use client';

import React, { useMemo, useState } from 'react';
import { Book, BookCategory, BookShelfTheme, SiteSettings } from '../../types.ts';
import { BookCard } from './BookCard.tsx';
import { parseFeatures, toBengaliNumber } from '../../utils/format.ts';
import { buildAffiliateRedirectUrl, validateExternalHttpUrl } from '../../lib/affiliateUrl.ts';
import {
  BookOpen,
  BookMarked,
  BookText,
  Library,
  ChevronRight,
  Search,
  X,
  ExternalLink,
  CheckCircle2,
  User,
  Building2,
  FileText,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Layers,
} from 'lucide-react';

interface BookStorePageProps {
  bookCategories: BookCategory[];
  books: Book[];
  initialCategorySlug?: string;
  settings?: SiteSettings | null;
  onBack?: () => void;
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

  return (
    <section className="space-y-4">
      {/* Section Header Row */}
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight truncate">
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
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full glass-inset hover:bg-white/90 text-xs sm:text-[13px] font-bold text-[#2A0F12] hover:text-[#E22B2B] transition-all shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
        >
          <span>সব দেখুন</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Frosted Glassmorphism Book Grid Matching CourseCard 1-2-4 Columns */}
      <div className="relative rounded-[28px] glass-surface p-4 sm:p-5 overflow-hidden">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getShelfGlowClass(
            category.shelfTheme,
            index
          )}`}
        />

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
          {books.map((book) => (
            <div key={book.id} className="h-full flex flex-col">
              <BookCard
                book={book}
                categoryName={category.name}
                defaultAffiliateRef={defaultAffiliateRef}
                onSelect={onSelectBook}
                onBuyClick={onBuyClick}
                headingLevel="h3"
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
  initialCategorySlug = 'all',
  settings,
  onBack,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategorySlug || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loadingBookDetails, setLoadingBookDetails] = useState(false);

  const normalizedInitialCategory = initialCategorySlug || 'all';
  const [prevInitialCategory, setPrevInitialCategory] = useState(normalizedInitialCategory);
  if (normalizedInitialCategory !== prevInitialCategory) {
    setPrevInitialCategory(normalizedInitialCategory);
    setSelectedCategory(normalizedInitialCategory);
  }

  const activeCategoryMap = useMemo(() => {
    const map = new Map<string, BookCategory>();
    for (const cat of bookCategories) {
      map.set(cat.slug, cat);
    }
    return map;
  }, [bookCategories]);

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
    return books.filter((b) => {
      if (selectedCategory !== 'all' && b.categorySlug !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.bookType.toLowerCase().includes(q) ||
        (activeCategoryMap.get(b.categorySlug)?.name || '').toLowerCase().includes(q)
      );
    });
  }, [books, selectedCategory, searchQuery, activeCategoryMap]);

  // Group books per category when viewing "সব" without active search query
  const groupedShelves = useMemo(() => {
    return bookCategories
      .map((cat) => ({
        category: cat,
        items: books.filter((b) => b.categorySlug === cat.slug),
      }))
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

  const selectedCategoryObj =
    selectedCategory !== 'all' ? activeCategoryMap.get(selectedCategory) : null;

  const isGroupedShelfView = selectedCategory === 'all' && searchQuery.trim() === '';

  const modalAffiliateHref = useMemo(() => {
    if (!selectedBook?.affiliateUrl?.trim()) return null;
    const check = validateExternalHttpUrl(selectedBook.affiliateUrl);
    if (!check.valid || !check.normalized) return null;
    return buildAffiliateRedirectUrl(check.normalized, settings?.defaultAffiliateRef);
  }, [selectedBook, settings?.defaultAffiliateRef]);

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
            onClick={() => setSelectedCategory('all')}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_8px_18px_-6px_rgba(226,43,43,0.48)]'
                : 'bg-white/90 text-[#2A0F12] border border-rose-200/70 hover:border-[#eb1c24]/50 hover:text-[#eb1c24]'
            }`}
          >
            সব
          </button>

          {bookCategories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
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
        {isGroupedShelfView ? (
          groupedShelves.length > 0 ? (
            groupedShelves.map((group, idx) => (
              <CategoryBookSection
                key={group.category.id}
                category={group.category}
                books={group.items}
                index={idx}
                defaultAffiliateRef={settings?.defaultAffiliateRef}
                onViewAll={(slug) => {
                  setSelectedCategory(slug);
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 320, behavior: 'smooth' });
                  }
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
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
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
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
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
      {selectedBook && (
        <div
          className="fixed inset-0 z-[65] bg-rose-950/35 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="glass-strong rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedBook(null)}
              aria-label="বন্ধ করুন"
              className="absolute top-4 right-4 z-10 p-2 rounded-full glass-inset hover:bg-white text-[#6B4C4F] hover:text-[#E22B2B] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-7">
              {/* Cover Column */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full aspect-[4/4.3] rounded-2xl glass-inset bg-gradient-to-br from-white/85 via-white/55 to-rose-50/45 p-6 flex items-center justify-center relative overflow-hidden">
                  {selectedBook.discountPercent > 0 &&
                    selectedBook.originalPrice > selectedBook.price && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white text-xs font-black shadow-sm border border-orange-300/40 tabular-nums">
                        {toBengaliNumber(selectedBook.discountPercent)}% ছাড়
                      </span>
                    )}
                  {selectedBook.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedBook.coverImageUrl}
                      alt={selectedBook.title}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-[85%] object-contain rounded-md drop-shadow-[0_14px_24px_rgba(42,15,18,0.22)]"
                    />
                  ) : (
                    <div className="w-36 h-48 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#7f1d1d] flex flex-col items-center justify-center p-4 text-center text-white shadow-lg">
                      <BookOpen className="w-10 h-10 mb-2 opacity-90" />
                      <span className="text-xs font-bold leading-snug">{selectedBook.title}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Column */}
              <div className="md:col-span-7 flex flex-col space-y-4 pr-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    {activeCategoryMap.get(selectedBook.categorySlug) && (
                      <span className="text-[#B91C1C]">
                        {activeCategoryMap.get(selectedBook.categorySlug)?.name}
                      </span>
                    )}
                    {activeCategoryMap.get(selectedBook.categorySlug) && selectedBook.bookType && (
                      <span className="text-rose-300" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <span className="text-[#6B4C4F] font-semibold">
                      {selectedBook.bookType || 'প্রিন্টেড বুক'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-[#2A0F12] leading-snug">
                    {selectedBook.title}
                  </h2>

                  {/* Price Row */}
                  <div className="flex flex-wrap items-baseline gap-2.5 pt-1 tabular-nums">
                    <span className="text-2xl font-black text-[#007a3d]">
                      ৳{toBengaliNumber(selectedBook.price)}
                    </span>
                    {selectedBook.originalPrice > selectedBook.price && (
                      <>
                        <span className="text-sm font-medium text-[#7A5A5D] line-through">
                          ৳{toBengaliNumber(selectedBook.originalPrice)}
                        </span>
                        <span className="text-xs font-bold text-[#007a3d] bg-emerald-50/90 border border-emerald-500/70 px-2.5 py-0.5 rounded-full">
                          ৳{toBengaliNumber(selectedBook.originalPrice - selectedBook.price)} ছাড়
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs glass-inset rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 text-[#2A0F12]">
                    <User className="w-3.5 h-3.5 text-[#E22B2B] shrink-0" />
                    <span className="truncate">
                      <strong>লেখক:</strong> {selectedBook.author || '১০ মিনিট স্কুল'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#2A0F12]">
                    <Building2 className="w-3.5 h-3.5 text-[#E22B2B] shrink-0" />
                    <span className="truncate">
                      <strong>প্রকাশনী:</strong> {selectedBook.publisher || '১০ মিনিট স্কুল'}
                    </span>
                  </div>
                  {selectedBook.edition && (
                    <div className="flex items-center gap-2 text-[#2A0F12]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        <strong>সংস্করণ:</strong> {selectedBook.edition}
                      </span>
                    </div>
                  )}
                  {selectedBook.pages && (
                    <div className="flex items-center gap-2 text-[#2A0F12]">
                      <FileText className="w-3.5 h-3.5 text-[#1E63D6] shrink-0" />
                      <span className="truncate">
                        <strong>পৃষ্ঠা:</strong> {selectedBook.pages}
                      </span>
                    </div>
                  )}
                </div>

                {loadingBookDetails && (
                  <p className="text-[11px] text-[#6B4C4F]/75">বিস্তারিত তথ্য আপডেট হচ্ছে...</p>
                )}

                {/* Feature Highlights */}
                {parseFeatures(selectedBook.features).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-extrabold text-[#2A0F12]">বইটির মূল বৈশিষ্ট্য:</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {parseFeatures(selectedBook.features).map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-xs text-[#2A0F12]/85 font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#007a3d] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons: বইটি কিনুন (Affiliate Link) + Safe Fallback */}
                <div className="pt-3 mt-auto flex flex-wrap items-center gap-2.5 border-t border-white/75">
                  {modalAffiliateHref ? (
                    <a
                      href={modalAffiliateHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleRecordBookClick(selectedBook)}
                      className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#ff5252] via-[#e22b2b] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs sm:text-sm font-extrabold shadow-[0_10px_24px_-6px_rgba(226,43,43,0.45)] transition whitespace-nowrap"
                    >
                      <span>বইটি কিনুন</span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ) : (
                    <div className="flex-1 min-w-[180px] px-4 py-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 text-[#6B4C4F] text-xs font-semibold">
                      এই বইটির অনলাইন অর্ডার লিংক এখনো সংযুক্ত করা হয়নি।
                    </div>
                  )}

                  {settings?.whatsappLink && (
                    <a
                      href={`${settings.whatsappLink}${
                        settings.whatsappLink.includes('?') ? '&' : '?'
                      }text=${encodeURIComponent(
                        `আসসালামু আলাইকুম, আমি "${selectedBook.title}" বইটি সম্পর্কে জানতে চাই।`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold transition whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>WhatsApp-এ জানুন</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
