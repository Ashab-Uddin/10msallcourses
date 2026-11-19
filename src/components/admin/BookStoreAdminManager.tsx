'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Book, BookCategory, BookShelfTheme, BookStoreAdminPayload } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { BookStoreListSkeleton } from './AdminSkeletons.tsx';
import {
  BookOpen,
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  Link2,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const BOOKS_PER_PAGE = 12;

const BookEditorPage = dynamic(
  () => import('./BookEditorPage.tsx').then((m) => m.BookEditorPage),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-8 space-y-4 animate-pulse">
        <div className="h-5 w-48 rounded-lg bg-rose-200/75" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-10 rounded-xl bg-rose-100/80" />
          <div className="h-10 rounded-xl bg-rose-100/80" />
        </div>
        <div className="h-28 rounded-2xl bg-rose-100/70" />
      </div>
    ),
  }
);

const BookCard = dynamic(
  () => import('../public/BookCard.tsx').then((m) => m.BookCard),
  { ssr: false }
);

export type BookAdminSubView = 'add' | 'list' | 'categories';

interface BookStoreAdminManagerProps {
  initialView?: BookAdminSubView;
  cachedData?: BookStoreAdminPayload | null;
  onCacheUpdated?: (payload: BookStoreAdminPayload) => void;
  onUnauthorized: () => void;
  onDataMutated: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onStatsChange?: (stats: { totalBooks: number; activeBooks: number }) => void;
  onOpenPublicBookStore?: () => void;
}

const SHELF_THEME_OPTIONS: Array<{ value: BookShelfTheme; label: string; dotClass: string }> = [
  { value: 'blue', label: 'আকাশী নীল (Blue)', dotClass: 'bg-blue-400' },
  { value: 'rose', label: 'গোলাপি (Rose)', dotClass: 'bg-rose-400' },
  { value: 'amber', label: 'সোনালী (Amber)', dotClass: 'bg-amber-400' },
  { value: 'emerald', label: 'সবুজ (Emerald)', dotClass: 'bg-emerald-400' },
  { value: 'slate', label: 'নিরপেক্ষ (Slate)', dotClass: 'bg-slate-400' },
];

export const BookStoreAdminManager: React.FC<BookStoreAdminManagerProps> = ({
  initialView = 'add',
  cachedData = null,
  onCacheUpdated,
  onUnauthorized,
  onDataMutated,
  onShowToast,
  onStatsChange,
  onOpenPublicBookStore,
}) => {
  const hasInitialCacheRef = useRef<boolean>(Boolean(cachedData));
  const [subView, setSubView] = useState<BookAdminSubView>(initialView);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !cachedData);
  const [error, setError] = useState<string | null>(null);

  const [books, setBooks] = useState<Book[]>(() => cachedData?.books || []);
  const [bookCategories, setBookCategories] = useState<BookCategory[]>(
    () => cachedData?.bookCategories || []
  );
  const [stats, setStats] = useState(
    () =>
      cachedData?.stats || {
        totalBooks: 0,
        activeBooks: 0,
        inactiveBooks: 0,
        featuredBooks: 0,
        totalCategories: 0,
      }
  );

  // Directory filters & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [busyBookId, setBusyBookId] = useState<number | null>(null);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [deleteTargetBook, setDeleteTargetBook] = useState<Book | null>(null);

  // Book Category modal/form state
  const [editingCategory, setEditingCategory] = useState<BookCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catSectionTitle, setCatSectionTitle] = useState('');
  const [catSubtitle, setCatSubtitle] = useState('');
  const [catShelfTheme, setCatShelfTheme] = useState<BookShelfTheme>('blue');
  const [catDisplayOrder, setCatDisplayOrder] = useState<number>(1);
  const [catStatus, setCatStatus] = useState<'active' | 'inactive'>('active');
  const [savingCategory, setSavingCategory] = useState(false);

  const [prevInitialView, setPrevInitialView] = useState(initialView);
  if (initialView !== prevInitialView) {
    setPrevInitialView(initialView);
    setSubView(initialView);
    if (initialView === 'add') {
      setEditingBook(null);
    }
  }

  const fetchBookStoreAdminData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch('/api/admin/books', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'বুক স্টোর ডেটা লোড করতে সমস্যা হয়েছে।');
        }

        const nextBooks: Book[] = Array.isArray(data.books) ? data.books : [];
        const nextCats: BookCategory[] = Array.isArray(data.bookCategories)
          ? data.bookCategories
          : [];
        const nextStats = data.stats || {
          totalBooks: nextBooks.length,
          activeBooks: nextBooks.filter((b) => b.status === 'active').length,
          inactiveBooks: nextBooks.filter((b) => b.status === 'inactive').length,
          featuredBooks: nextBooks.filter((b) => b.isFeatured).length,
          totalCategories: nextCats.length,
        };

        setBooks(nextBooks);
        setBookCategories(nextCats);
        setStats(nextStats);
        onCacheUpdated?.({
          books: nextBooks,
          bookCategories: nextCats,
          stats: nextStats,
        });
        onStatsChange?.({
          totalBooks: nextStats.totalBooks,
          activeBooks: nextStats.activeBooks,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'বুক স্টোর ডেটা লোড করতে ব্যর্থ হয়েছে।');
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized, onStatsChange, onCacheUpdated]
  );

  useEffect(() => {
    if (hasInitialCacheRef.current) {
      return;
    }
    let cancelled = false;
    const init = async () => {
      await Promise.resolve();
      if (!cancelled) {
        await fetchBookStoreAdminData();
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [fetchBookStoreAdminData]);

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of bookCategories) {
      map.set(c.slug, c.name);
    }
    return map;
  }, [bookCategories]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter((book) => {
      if (filterStatus !== 'all' && book.status !== filterStatus) return false;
      if (filterCategory !== 'all' && book.categorySlug !== filterCategory) return false;
      if (!q) return true;
      return (
        book.title.toLowerCase().includes(q) ||
        book.slug.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.bookType.toLowerCase().includes(q)
      );
    });
  }, [books, filterStatus, filterCategory, searchQuery]);

  const totalBookPages = Math.max(1, Math.ceil(filteredBooks.length / BOOKS_PER_PAGE));
  const safeBookPage = Math.min(currentPage, totalBookPages);
  const paginatedBooks = useMemo(() => {
    const start = (safeBookPage - 1) * BOOKS_PER_PAGE;
    return filteredBooks.slice(start, start + BOOKS_PER_PAGE);
  }, [filteredBooks, safeBookPage]);

  // Save (Add / Edit) Book
  const handleSaveBook = async (payload: Record<string, unknown>, id?: number) => {
    const url = id ? `/api/admin/books/${id}` : '/api/admin/books';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      onUnauthorized();
      throw new Error('অ্যাডমিন সেশন শেষ হয়েছে।');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'বইটি সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    }

    await fetchBookStoreAdminData({ silent: true });
    onDataMutated();
    setEditingBook(null);
    setSubView('list');
    onShowToast(
      id ? 'বইয়ের তথ্য সফলভাবে আপডেট করা হয়েছে।' : 'নতুন বই সফলভাবে Book Store-এ যুক্ত হয়েছে!',
      'success'
    );
  };

  // Toggle Active / Inactive status inline
  const handleToggleBookStatus = async (book: Book) => {
    const nextStatus = book.status === 'active' ? 'inactive' : 'active';
    setBusyBookId(book.id);
    try {
      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'স্ট্যাটাস পরিবর্তন করা যায়নি।');
      }
      await fetchBookStoreAdminData({ silent: true });
      onDataMutated();
      onShowToast(
        nextStatus === 'active'
          ? `“${book.title}” এখন Active — পাবলিক Book Store-এ দৃশ্যমান।`
          : `“${book.title}” এখন Inactive — পাবলিক Book Store থেকে লুকানো।`,
        'success'
      );
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setBusyBookId(null);
    }
  };

  // Delete Book
  const handleConfirmDeleteBook = async () => {
    if (!deleteTargetBook) return;
    const target = deleteTargetBook;
    setBusyBookId(target.id);
    try {
      const res = await fetch(`/api/admin/books/${target.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'বইটি মুছে ফেলা যায়নি।');
      }
      setDeleteTargetBook(null);
      await fetchBookStoreAdminData({ silent: true });
      onDataMutated();
      onShowToast(`“${target.title}” সফলভাবে মুছে ফেলা হয়েছে।`, 'success');
    } catch (err: unknown) {
      onShowToast(err instanceof Error ? err.message : 'বইটি মুছতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setBusyBookId(null);
    }
  };

  // Book Category CRUD handlers
  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatSectionTitle('');
    setCatSubtitle('');
    setCatShelfTheme('blue');
    setCatDisplayOrder(bookCategories.length + 1);
    setCatStatus('active');
  };

  const handleEditCategory = (cat: BookCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatSectionTitle(cat.sectionTitle || '');
    setCatSubtitle(cat.subtitle || '');
    setCatShelfTheme(cat.shelfTheme || 'blue');
    setCatDisplayOrder(cat.displayOrder || 1);
    setCatStatus(cat.status);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      onShowToast('ক্যাটাগরির নাম পূরণ করুন।', 'error');
      return;
    }

    setSavingCategory(true);
    try {
      const url = editingCategory
        ? `/api/admin/book-categories/${editingCategory.id}`
        : '/api/admin/book-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          slug: catSlug.trim() || catName.trim(),
          sectionTitle: catSectionTitle.trim() || `${catName.trim()}-এর সকল বই`,
          subtitle: catSubtitle.trim() || null,
          shelfTheme: catShelfTheme,
          displayOrder: Number(catDisplayOrder) || 1,
          status: catStatus,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'বুক ক্যাটাগরি সংরক্ষণ ব্যর্থ হয়েছে।');
      }

      resetCategoryForm();
      await fetchBookStoreAdminData({ silent: true });
      onDataMutated();
      onShowToast(
        editingCategory
          ? 'বুক ক্যাটাগরি সফলভাবে আপডেট হয়েছে।'
          : 'নতুন বুক ক্যাটাগরি তৈরি হয়েছে।',
        'success'
      );
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'বুক ক্যাটাগরি সংরক্ষণ করতে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: BookCategory) => {
    try {
      const res = await fetch(`/api/admin/book-categories/${cat.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'বুক ক্যাটাগরি মুছে ফেলা যায়নি।');
      }
      if (editingCategory?.id === cat.id) {
        resetCategoryForm();
      }
      await fetchBookStoreAdminData({ silent: true });
      onDataMutated();
      onShowToast(`“${cat.name}” ক্যাটাগরি মুছে ফেলা হয়েছে।`, 'success');
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'ক্যাটাগরি মুছতে সমস্যা হয়েছে।',
        'error'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Book Store Admin Workspace Header & Sub-View Switcher */}
      <div className="glass-strong rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shadow-md shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight truncate">
              বুক স্টোর ম্যানেজমেন্ট (Book Add & Catalog)
            </h2>
            <p className="text-xs text-[#6B4C4F] truncate">
              মোট {toBengaliNumber(stats.totalBooks)}টি বই · চালু {toBengaliNumber(stats.activeBooks)}টি · ক্যাটাগরি {toBengaliNumber(stats.totalCategories)}টি
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingBook(null);
              setSubView('add');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subView === 'add'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                : 'bg-white border border-rose-200/80 text-[#2A0F12] hover:bg-rose-50'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{editingBook && subView === 'add' ? 'Edit Book' : 'Book Add'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingBook(null);
              setSubView('list');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subView === 'list'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                : 'bg-white border border-rose-200/80 text-[#2A0F12] hover:bg-rose-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>সব বই ({toBengaliNumber(stats.totalBooks)})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingBook(null);
              setSubView('categories');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subView === 'categories'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                : 'bg-white border border-rose-200/80 text-[#2A0F12] hover:bg-rose-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>বুক ক্যাটাগরি ({toBengaliNumber(stats.totalCategories)})</span>
          </button>

          {onOpenPublicBookStore && (
            <button
              type="button"
              onClick={onOpenPublicBookStore}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              title="পাবলিক বুক স্টোর দেখুন"
            >
              <span>লাইভ স্টোর</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => void fetchBookStoreAdminData()}
            className="px-3 py-1 rounded-lg bg-white border border-rose-200 text-[#b91c1c] hover:bg-rose-100 text-xs font-bold cursor-pointer"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      )}

      {/* SUB-VIEW 1: BOOK ADD / EDIT PAGE */}
      {subView === 'add' ? (
        <BookEditorPage
          key={editingBook ? `edit-${editingBook.id}` : 'new-book'}
          book={editingBook}
          bookCategories={bookCategories}
          onBackToList={() => {
            setEditingBook(null);
            setSubView('list');
          }}
          onSave={handleSaveBook}
          onOpenCategories={() => setSubView('categories')}
        />
      ) : subView === 'list' ? (
        /* SUB-VIEW 2: ALL BOOKS DIRECTORY (Manage, Filter, Toggle Status, Edit, Delete) */
        <div className="glass-strong rounded-3xl p-4 sm:p-6 space-y-5">
          {/* Search & Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="বইয়ের নাম, লেখক বা স্লাগ দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-[#eb1c24] outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-[#eb1c24] outline-none cursor-pointer font-medium"
              >
                <option value="all">সকল বুক ক্যাটাগরি</option>
                {bookCategories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as 'all' | 'active' | 'inactive');
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-[#eb1c24] outline-none cursor-pointer font-medium"
              >
                <option value="all">সকল স্ট্যাটাস</option>
                <option value="active">Active (চালু)</option>
                <option value="inactive">Inactive (বন্ধ)</option>
              </select>
              <button
                type="button"
                onClick={() => void fetchBookStoreAdminData()}
                title="রিফ্রেশ করুন"
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-[#eb1c24] transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading && books.length === 0 ? (
            <BookStoreListSkeleton />
          ) : filteredBooks.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-rose-300 mx-auto" />
              <div className="text-sm font-black text-[#2A0F12]">
                {books.length === 0
                  ? 'এখনো কোনো বই যুক্ত করা হয়নি'
                  : 'ফিল্টারের সাথে মিলে এমন কোনো বই পাওয়া যায়নি'}
              </div>
              <p className="text-xs text-[#6B4C4F] max-w-sm mx-auto">
                নতুন বই যুক্ত করলে তা স্বয়ংক্রিয়ভাবে মেইন ওয়েবসাইটের Book Store পেজে প্রদর্শিত হবে।
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingBook(null);
                  setSubView('add');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>নতুন বই যুক্ত করুন</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedBooks.map((book) => {
                const isBusy = busyBookId === book.id;
                return (
                  <div
                    key={book.id}
                    className="glass-card rounded-2xl p-3.5 sm:p-4 border border-rose-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Cover Thumbnail */}
                      <div className="w-14 h-18 rounded-xl bg-white/90 border border-rose-200/70 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {book.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.coverImageUrl}
                            alt={book.title}
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <BookOpen className="w-5 h-5 text-rose-300" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                          <span className="text-[#B91C1C]">
                            {categoryNameBySlug.get(book.categorySlug) || book.categorySlug}
                          </span>
                          <span className="text-rose-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[#6B4C4F] font-semibold">{book.bookType}</span>
                          {book.isFeatured && (
                            <>
                              <span className="text-rose-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-amber-700 font-bold">
                                <Sparkles className="w-3 h-3" />
                                Featured
                              </span>
                            </>
                          )}
                        </div>

                        <div className="text-sm font-black text-[#2A0F12] truncate">
                          {book.title}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                          <span className="font-extrabold text-[#007a3d]">
                            ৳{toBengaliNumber(book.price)}
                          </span>
                          {book.originalPrice > book.price && (
                            <span className="text-[#7A5A5D] line-through">
                              ৳{toBengaliNumber(book.originalPrice)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                            <Link2
                              className={`w-3 h-3 shrink-0 ${
                                book.affiliateUrl ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            />
                            {book.affiliateUrl ? (
                              <a
                                href={book.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:underline truncate max-w-[180px]"
                                title={book.affiliateUrl}
                              >
                                অ্যাফিলিয়েট লিংক যুক্ত
                              </a>
                            ) : (
                              <span className="text-amber-700">লিংক যুক্ত নেই</span>
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#6B4C4F] font-semibold">
                            <MousePointerClick className="w-3 h-3 text-[#B91C1C]" />
                            <span>{toBengaliNumber(book.clickCount || 0)} ক্লিক</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleToggleBookStatus(book)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                          book.status === 'active'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {book.status === 'active' ? 'Active' : 'Inactive'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewBook(book)}
                        title="কার্ড প্রিভিউ"
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-[#eb1c24] transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingBook(book);
                          setSubView('add');
                        }}
                        title="বই এডিট করুন"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>এডিট</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setDeleteTargetBook(book)}
                        title="বই মুছে ফেলুন"
                        className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-[#eb1c24] text-rose-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {totalBookPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-rose-100/80 text-xs">
                  <span className="font-semibold text-[#6B4C4F] tabular-nums">
                    পৃষ্ঠা {toBengaliNumber(safeBookPage)} / {toBengaliNumber(totalBookPages)} · মোট{' '}
                    {toBengaliNumber(filteredBooks.length)}টি বই
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeBookPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200/80 bg-white hover:bg-rose-50 text-[#2A0F12] font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>আগের</span>
                    </button>
                    <button
                      type="button"
                      disabled={safeBookPage >= totalBookPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalBookPages, p + 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200/80 bg-white hover:bg-rose-50 text-[#2A0F12] font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <span>পরবর্তী</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* SUB-VIEW 3: BOOK CATEGORIES MANAGER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add / Edit Book Category Form */}
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-5 glass-strong rounded-3xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
              <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#eb1c24]" />
                <span>
                  {editingCategory ? `ক্যাটাগরি এডিট: ${editingCategory.name}` : 'নতুন বুক ক্যাটাগরি যোগ করুন'}
                </span>
              </h3>
              {editingCategory && (
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="text-xs font-bold text-slate-500 hover:text-[#eb1c24] cursor-pointer"
                >
                  বাতিল
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ক্যাটাগরির নাম (Pill Label) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCatName(val);
                  if (!editingCategory) {
                    setCatSlug(
                      val
                        .toLowerCase()
                        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
                        .trim()
                        .replace(/\s+/g, '-')
                    );
                    setCatSectionTitle(val ? `${val}-এর সকল বই` : '');
                  }
                }}
                placeholder="যেমন: এইচএসসি / ভর্তি প্রস্তুতি"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:border-[#eb1c24] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                স্লাগ (Unique Slug) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="যেমন: hsc বা admission-books"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:border-[#eb1c24] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                সেকশন শিরোনাম (Shelf Section Heading)
              </label>
              <input
                type="text"
                value={catSectionTitle}
                onChange={(e) => setCatSectionTitle(e.target.value)}
                placeholder="যেমন: এইচএসসি'র সকল বই"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-[#eb1c24] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                সাবটাইটেল (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={catSubtitle}
                onChange={(e) => setCatSubtitle(e.target.value)}
                placeholder="সংক্ষিপ্ত বর্ণনা..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#eb1c24] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  শেলফ কালার থিম
                </label>
                <select
                  value={catShelfTheme}
                  onChange={(e) => setCatShelfTheme(e.target.value as BookShelfTheme)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#eb1c24] outline-none cursor-pointer"
                >
                  {SHELF_THEME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রদর্শন ক্রম (Order)
                </label>
                <input
                  type="number"
                  min={1}
                  value={catDisplayOrder}
                  onChange={(e) => setCatDisplayOrder(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:border-[#eb1c24] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">স্ট্যাটাস</label>
              <select
                value={catStatus}
                onChange={(e) => setCatStatus(e.target.value === 'inactive' ? 'inactive' : 'active')}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#eb1c24] outline-none cursor-pointer"
              >
                <option value="active">Active (চালু)</option>
                <option value="inactive">Inactive (লুকানো)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingCategory}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {savingCategory
                ? 'সংরক্ষণ হচ্ছে...'
                : editingCategory
                ? 'ক্যাটাগরি আপডেট করুন'
                : '+ নতুন ক্যাটাগরি তৈরি করুন'}
            </button>
          </form>

          {/* Existing Book Categories List */}
          <div className="lg:col-span-7 glass-strong rounded-3xl p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-black text-[#2A0F12] border-b border-rose-200/50 pb-3">
              বিদ্যমান বুক ক্যাটাগরিসমূহ ({toBengaliNumber(bookCategories.length)}টি)
            </h3>

            <div className="space-y-2.5">
              {bookCategories.map((cat) => {
                const count = books.filter((b) => b.categorySlug === cat.slug).length;
                const themeMeta = SHELF_THEME_OPTIONS.find((t) => t.value === cat.shelfTheme);
                return (
                  <div
                    key={cat.id}
                    className="glass-card rounded-2xl p-3.5 border border-rose-100/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            themeMeta?.dotClass || 'bg-blue-400'
                          }`}
                        />
                        <span className="text-sm font-black text-[#2A0F12]">{cat.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {cat.slug}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cat.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {cat.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-xs text-[#6B4C4F] truncate">
                        {cat.sectionTitle || `${cat.name}-এর সকল বই`} · ক্রম:{' '}
                        {toBengaliNumber(cat.displayOrder)} · বই: {toBengaliNumber(count)}টি
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditCategory(cat)}
                        className="p-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                        title="এডিট"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCategory(cat)}
                        className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-[#eb1c24] hover:text-white transition cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BookCard Quick Preview Modal (Glassmorphism matching CourseCard preview) */}
      {previewBook && (
        <div
          className="fixed inset-0 z-50 bg-rose-950/35 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewBook(null)}
        >
          <div
            className="glass-strong rounded-3xl max-w-md w-full p-5 space-y-4 border border-white/95 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
              <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#eb1c24]" />
                <span>পাবলিক বুক কার্ড প্রিভিউ</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewBook(null)}
                aria-label="বন্ধ করুন"
                className="p-1.5 rounded-full glass-inset text-[#6B4C4F] hover:text-[#eb1c24] hover:bg-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-1 flex justify-center">
              <div className="w-full max-w-[252px]">
                <BookCard
                  book={previewBook}
                  categoryName={
                    categoryNameBySlug.get(previewBook.categorySlug) || previewBook.categorySlug
                  }
                  showAdminStatusBadge
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6B4C4F] pt-1 border-t border-white/75">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>স্ট্যাটাস: {previewBook.status === 'active' ? 'Active' : 'Inactive'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const target = previewBook;
                  setPreviewBook(null);
                  setEditingBook(target);
                  setSubView('add');
                }}
                className="font-bold text-[#b91c1c] hover:underline cursor-pointer"
              >
                এডিট করুন →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Book Confirmation Modal */}
      {deleteTargetBook && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setDeleteTargetBook(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-[#2A0F12]">বইটি মুছে ফেলবেন?</h3>
                <p className="text-xs text-[#6B4C4F] leading-relaxed">
                  <strong>“{deleteTargetBook.title}”</strong> বইটি ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি আর ফিরিয়ে আনা যাবে না।
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetBook(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={busyBookId === deleteTargetBook.id}
                onClick={() => void handleConfirmDeleteBook()}
                className="px-4 py-2 rounded-xl bg-[#eb1c24] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
              >
                {busyBookId === deleteTargetBook.id ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
