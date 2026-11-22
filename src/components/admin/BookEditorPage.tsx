'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Book, BookCategory } from '../../types.ts';
import { parseFeatures, toBengaliNumber } from '../../utils/format.ts';
import { validateCoursePricing } from '../../lib/courseValidation.ts';
import { validateExternalHttpUrl } from '../../lib/affiliateUrl.ts';
import { BookCard } from '../public/BookCard.tsx';
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  DollarSign,
  Tag,
  BookOpen,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  User,
} from 'lucide-react';

interface BookEditorPageProps {
  book: Book | null; // null means creating a new book
  bookCategories: BookCategory[];
  onBackToList: () => void;
  onSave: (bookData: Record<string, unknown>, id?: number) => Promise<void>;
  onOpenCategories?: () => void;
}

const BOOK_TYPE_PRESETS = [
  'প্রিন্টেড বুক',
  'মাস্টারবুক বান্ডেল',
  'ই-বুক',
  'নোট ও গাইড',
] as const;

function sanitizePriceInput(raw: string): string {
  const asciiDigits = raw.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  const digitsOnly = asciiDigits.replace(/[^\d]/g, '');
  if (digitsOnly === '') return '';
  return digitsOnly.replace(/^0+(?=\d)/, '').replace(/^0+$/, '0');
}

function normalizeInitialPrice(val: unknown, fallback: number): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || num < 0) return String(fallback);
  return String(Math.round(num));
}

export const BookEditorPage: React.FC<BookEditorPageProps> = ({
  book,
  bookCategories,
  onBackToList,
  onSave,
  onOpenCategories,
}) => {
  const isEditing = Boolean(book);

  const [title, setTitle] = useState(book?.title || '');
  const [slug, setSlug] = useState(book?.slug || '');
  const [categorySlug, setCategorySlug] = useState(
    book?.categorySlug || (bookCategories[0]?.slug ?? 'hsc')
  );
  const [bookType, setBookType] = useState(book?.bookType || 'প্রিন্টেড বুক');
  const [author, setAuthor] = useState(book?.author || '');
  const [publisher, setPublisher] = useState(book?.publisher || '১০ মিনিট স্কুল পাবলিকেশন');
  const [edition, setEdition] = useState(book?.edition || '');
  const [pages, setPages] = useState(book?.pages || '');

  const [originalPriceInput, setOriginalPriceInput] = useState<string>(() =>
    book && book.originalPrice > 0 ? normalizeInitialPrice(book.originalPrice, 0) : ''
  );
  const [priceInput, setPriceInput] = useState<string>(() =>
    book ? normalizeInitialPrice(book.price, 0) : ''
  );
  const [affiliateUrl, setAffiliateUrl] = useState(book?.affiliateUrl || book?.orderUrl || '');

  const [coverImageUrl, setCoverImageUrl] = useState(book?.coverImageUrl || '');
  const [featuresList, setFeaturesList] = useState<string[]>(() =>
    parseFeatures(book?.features || '[]')
  );
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [isFeatured, setIsFeatured] = useState<boolean>(book?.isFeatured ?? false);
  const [status, setStatus] = useState<'active' | 'inactive'>(
    book?.status === 'inactive' ? 'inactive' : 'active'
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draftUpload, setDraftUpload] = useState<{ fileId: string | null; url: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasOriginalPrice = originalPriceInput.trim() !== '';
  const hasPrice = priceInput.trim() !== '';
  const originalPrice = hasOriginalPrice ? Number(originalPriceInput) : 0;
  const price = hasPrice ? Number(priceInput) : 0;

  const pricingValidation = useMemo(
    () => validateCoursePricing(originalPrice, price),
    [originalPrice, price]
  );
  const isPriceInvalid = hasOriginalPrice && hasPrice && !pricingValidation.valid;
  const computedFlatSavings =
    originalPrice > 0 && originalPrice > price ? Math.max(0, originalPrice - price) : 0;
  const computedDiscountPercent = pricingValidation.valid ? pricingValidation.discountPercent : 0;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!book) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(autoSlug);
    }
  };

  // Client-side image optimization preserving portrait book cover ratio (max 1000px)
  const optimizeCoverForUpload = async (file: File): Promise<File> => {
    if (file.size <= 350 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
      return file;
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 1000;
          let targetW = img.naturalWidth || 800;
          let targetH = img.naturalHeight || 1000;
          if (targetW > maxDim || targetH > maxDim) {
            const scale = Math.min(maxDim / targetW, maxDim / targetH);
            targetW = Math.max(1, Math.round(targetW * scale));
            targetH = Math.max(1, Math.round(targetH * scale));
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob && blob.size > 0 && blob.size < file.size) {
                const baseName = file.name.replace(/\.[^.]+$/, '') || 'book-cover';
                resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
              } else {
                resolve(file);
              }
            },
            'image/webp',
            0.86
          );
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  };

  const cleanupDraftUpload = (draft: { fileId: string | null; url: string } | null) => {
    if (!draft) return;
    fetch('/api/admin/books/upload', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: draft.fileId, url: draft.url }),
    }).catch(() => {});
  };

  const handleRemoveCover = () => {
    if (draftUpload) {
      cleanupDraftUpload(draftUpload);
      setDraftUpload(null);
    }
    setCoverImageUrl('');
  };

  const handleCancelAndBack = () => {
    if (draftUpload) {
      cleanupDraftUpload(draftUpload);
      setDraftUpload(null);
    }
    onBackToList();
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    if (!allowedTypes.has(file.type)) {
      setError('শুধুমাত্র JPG, PNG, WebP অথবা AVIF ফরম্যাটের কভার ছবি আপলোড করা যাবে।');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError('কভার ছবির আকার সর্বোচ্চ ৪ মেগাবাইট হতে পারবে।');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const prepared = await optimizeCoverForUpload(file);
      const formData = new FormData();
      formData.append('file', prepared);
      if (draftUpload?.fileId) {
        formData.append('previousFileId', draftUpload.fileId);
      }
      if (draftUpload?.url) {
        formData.append('previousUrl', draftUpload.url);
      }

      const res = await fetch('/api/admin/books/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'বইয়ের কভার ইমেজ আপলোড করতে সমস্যা হয়েছে।');
      }

      setCoverImageUrl(data.url);
      setDraftUpload({
        fileId: typeof data.fileId === 'string' && data.fileId ? data.fileId : null,
        url: data.url,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'কভার ইমেজ আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploadingImage(false);
    }
  };

  const matchedCategoryName = useMemo(() => {
    const matched = bookCategories.find((c) => c.slug === categorySlug);
    return matched ? matched.name : categorySlug || 'বুক স্টোর';
  }, [bookCategories, categorySlug]);

  // Real-time preview Book object
  const previewBook: Book = useMemo(() => {
    const matchedCat = bookCategories.find((c) => c.slug === categorySlug);
    return {
      id: book?.id || 99999,
      title: title.trim() || 'বইয়ের নাম এখানে প্রদর্শিত হবে',
      slug: slug.trim() || 'preview-book',
      categoryId: matchedCat ? matchedCat.id : null,
      categorySlug: categorySlug || 'hsc',
      bookType: bookType.trim() || 'প্রিন্টেড বুক',
      author: author.trim(),
      publisher: publisher.trim() || '১০ মিনিট স্কুল পাবলিকেশন',
      edition: edition.trim(),
      pages: pages.trim(),
      coverImageUrl: coverImageUrl.trim() || null,
      originalPrice: Number(originalPrice) || 0,
      price: Number(price) || 0,
      discountPercent: computedDiscountPercent,
      affiliateUrl: affiliateUrl.trim(),
      features: JSON.stringify(featuresList),
      isFeatured,
      clickCount: book?.clickCount || 0,
      status,
    };
  }, [
    affiliateUrl,
    author,
    book,
    bookCategories,
    bookType,
    categorySlug,
    computedDiscountPercent,
    coverImageUrl,
    edition,
    featuresList,
    isFeatured,
    originalPrice,
    pages,
    price,
    publisher,
    slug,
    status,
    title,
  ]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('বইয়ের নাম (Book Name) পূরণ করা আবশ্যক।');
      return;
    }
    if (!slug.trim()) {
      setError('বইয়ের ইউনিক স্লাগ (Slug) পূরণ করা আবশ্যক।');
      return;
    }
    if (!categorySlug.trim()) {
      setError('বইয়ের ক্যাটাগরি নির্বাচন করা আবশ্যক।');
      return;
    }
    if (priceInput.trim() === '') {
      setError('বইয়ের মূল্য (Price) পূরণ করা আবশ্যক।');
      return;
    }
    if (!pricingValidation.valid) {
      setError(pricingValidation.error || 'বিক্রয় মূল্য পূর্বের মূল মূল্যের চেয়ে বেশি হতে পারবে না।');
      return;
    }
    if (affiliateUrl.trim()) {
      const urlCheck = validateExternalHttpUrl(affiliateUrl);
      if (!urlCheck.valid) {
        setError(urlCheck.error || 'অবৈধ অ্যাফিলিয়েট লিংক (https://...) প্রদান করা হয়েছে।');
        return;
      }
    }

    setSaving(true);
    setError(null);

    const matchedCat = bookCategories.find((c) => c.slug === categorySlug);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      categoryId: matchedCat ? matchedCat.id : null,
      categorySlug,
      bookType: bookType.trim() || 'প্রিন্টেড বুক',
      author: author.trim(),
      publisher: publisher.trim() || '১০ মিনিট স্কুল পাবলিকেশন',
      edition: edition.trim(),
      pages: pages.trim(),
      coverImageUrl: coverImageUrl.trim() || null,
      originalPrice: Math.round(originalPrice),
      price: Math.round(price),
      affiliateUrl: affiliateUrl.trim(),
      features: featuresList,
      isFeatured,
      status,
    };

    try {
      await onSave(payload, book?.id);
      setDraftUpload(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'বইটি সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Matches CourseEditorPage 1:1) */}
      <div className="glass-strong rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleCancelAndBack}
            className="p-2.5 rounded-xl border border-white/90 bg-white/80 hover:bg-rose-50 text-[#2A0F12] hover:text-[#eb1c24] transition cursor-pointer shadow-2xs shrink-0"
            title="বইয়ের তালিকায় ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight truncate">
              {isEditing ? `বই এডিট: ${book?.title}` : 'নতুন বই যুক্ত করুন (Book Add)'}
            </h1>
          </div>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden lg:flex items-center gap-2.5 justify-end shrink-0">
          <button
            type="button"
            onClick={handleCancelAndBack}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white/90 hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 text-[#2A0F12] font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Book'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Layout: Form on Left, Sticky Real-Time BookCard Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Book Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Primary Information */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <BookOpen className="w-4 h-4 text-[#eb1c24]" />
              <span>বইয়ের প্রাথমিক তথ্য (Basic Book Info)</span>
            </h3>

            {/* Book Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বইয়ের নাম (Book Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="যেমন: HSC 28 PCMB: মাস্টারবুক বান্ডেল"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-900 bg-white focus:border-[#eb1c24] focus:ring-2 focus:ring-red-100 outline-none transition shadow-2xs font-medium"
              />
            </div>

            {/* Unique URL Slug */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ইউনিক স্লাগ (Book URL Slug) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-slate-100 border border-r-0 border-slate-200 text-slate-500 text-xs font-mono">
                  /books/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="hsc-28-pcmb-masterbook"
                  className="w-full px-3.5 py-2.5 rounded-r-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Book Category */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  বুক ক্যাটাগরি (Book Category) <span className="text-red-500">*</span>
                </label>
                {onOpenCategories && (
                  <button
                    type="button"
                    onClick={onOpenCategories}
                    className="text-[11px] font-bold text-[#eb1c24] hover:underline cursor-pointer"
                  >
                    + ক্যাটাগরি ম্যানেজ করুন
                  </button>
                )}
              </div>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer font-medium"
              >
                {bookCategories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                    {cat.status === 'inactive' ? ' (Inactive)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B4C4F] mt-1">
                নির্বাচিত ক্যাটাগরি অনুযায়ী বইটি মেইন ওয়েবসাইটের Book Store পেজে প্রদর্শিত হবে।
              </p>
            </div>

            {/* Book Type / Format Badge */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                বইয়ের ধরন / ব্যাজ (Book Type Badge)
              </label>
              <input
                type="text"
                value={bookType}
                onChange={(e) => setBookType(e.target.value)}
                placeholder="যেমন: প্রিন্টেড বুক"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
              />
              <div className="flex flex-wrap gap-1.5">
                {BOOK_TYPE_PRESETS.map((preset) => {
                  const active = bookType.trim() === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBookType(preset)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                          : 'bg-white text-[#2A0F12] border-rose-200/90 hover:border-[#eb1c24] hover:bg-rose-50/80 shadow-2xs'
                      }`}
                    >
                      {active && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Author, Publisher, Edition, Pages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  লেখক / টিম (Author)
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 rounded-l-xl bg-slate-100 border border-r-0 border-slate-200 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="যেমন: নাঈম দুর্জয় (ঐচ্ছিক)"
                    className="w-full px-3 py-2 rounded-r-xl border border-slate-200/90 text-xs text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রকাশনী (Publisher)
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="১০ মিনিট স্কুল পাবলিকেশন"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সংস্করণ (Edition — ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  placeholder="যেমন: ২০২৬ নতুন সংস্করণ"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পৃষ্ঠা সংখ্যা (Pages — ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="যেমন: ৪২০ পৃষ্ঠা"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pricing & Affiliate URL */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>মূল্য, ছাড় ও অ্যাফিলিয়েট লিংক (Pricing & Affiliate URL)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পূর্বের মূল মূল্য (Original Price - ৳)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={originalPriceInput}
                  onChange={(e) => setOriginalPriceInput(sanitizePriceInput(e.target.value))}
                  placeholder="যেমন: 950"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিক্রয় / অফার মূল্য (Price - ৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(sanitizePriceInput(e.target.value))}
                  placeholder="যেমন: 750"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm bg-white outline-none shadow-2xs font-mono font-bold ${
                    isPriceInvalid
                      ? 'border-rose-400 text-rose-700 focus:border-rose-500 ring-2 ring-rose-100'
                      : 'border-slate-200/90 text-emerald-600 focus:border-[#eb1c24]'
                  }`}
                />
              </div>
            </div>

            {isPriceInvalid && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{pricingValidation.error}</span>
              </div>
            )}

            {!isPriceInvalid && (
              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
                  computedDiscountPercent > 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50/90 border-slate-200 text-slate-700'
                }`}
              >
                {computedDiscountPercent > 0 ? (
                  <>
                    <span>
                      মোট ছাড়: ৳{toBengaliNumber(computedFlatSavings)} (
                      {toBengaliNumber(computedDiscountPercent)}%)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      বইয়ের কার্ডে “{toBengaliNumber(computedDiscountPercent)}% ছাড়” ব্যাজ প্রদর্শিত হবে
                    </span>
                  </>
                ) : (
                  <>
                    <span>নির্ধারিত মূল্য: ৳{toBengaliNumber(price)}</span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      কোনো ডিসকাউন্ট না থাকায় সরাসরি বিক্রয় মূল্য দেখাবে
                    </span>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                অ্যাফিলিয়েট লিংক (10 Minute School Product / Affiliate URL)
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-slate-100 border border-r-0 border-slate-200 text-slate-500">
                  <LinkIcon className="w-4 h-4" />
                </span>
                <input
                  type="url"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://10minuteschool.com/product/book-slug?aff=..."
                  className="w-full px-3.5 py-2.5 rounded-r-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-[#6B4C4F] mt-1">
                বইয়ের কার্ডে &lsquo;বইটি কিনুন&rsquo; বাটনে ক্লিক করলে ক্রেতা সরাসরি এই Affiliate লিংক ব্যবহার করে ১০ মিনিট স্কুলের প্রোডাক্ট পেজে চলে যাবেন। লিংক না দিলে নিরাপদ Fallback দেখানো হবে।
              </p>
            </div>
          </div>

          {/* Card 3: Book Cover Image Upload */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>বইয়ের কভার ইমেজ (Book Cover Upload)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    ১. কভার ইমেজ URL অথবা ২. ডিভাইস থেকে ছবি আপলোড করুন:
                  </label>
                  <span className="text-[11px] font-medium text-[#6B4C4F]">
                    Recommended: 600 × 800 px (Portrait Book Cover)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://ik.imagekit.io/... অথবা আপলোড বাটনে ক্লিক করুন"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs font-mono text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                    />
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCoverUpload}
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 shadow-2xs disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{uploadingImage ? 'আপলোড হচ্ছে...' : 'কভার আপলোড'}</span>
                  </button>
                </div>
              </div>

              {coverImageUrl ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImageUrl}
                      alt="Book Cover Preview"
                      referrerPolicy="no-referrer"
                      className="w-16 h-20 object-contain rounded-lg border border-slate-300 bg-white p-1 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>বুক কভার সংযুক্ত হয়েছে</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs sm:max-w-md">
                        {coverImageUrl}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer shrink-0"
                    title="কভার ছবি মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center text-xs text-slate-500">
                  কোনো বুক কভার নির্বাচন করা হয়নি। HTTPS ইমেজ URL দিন অথবা ডিভাইস থেকে কভার আপলোড করুন।
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Features & Book Status */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2 border-b border-rose-200/50 pb-3">
              <Tag className="w-4 h-4 text-rose-600" />
              <span>বৈশিষ্ট্য ও স্ট্যাটাস (Features & Status)</span>
            </h3>

            {/* Highlights / Features */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                বইয়ের মূল বৈশিষ্ট্যসমূহ (Key Highlights):
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = newFeatureInput.trim();
                      if (v && !featuresList.includes(v)) {
                        setFeaturesList([...featuresList, v]);
                        setNewFeatureInput('');
                      }
                    }
                  }}
                  placeholder="যেমন: বোর্ড পরীক্ষার ১০০% কমন সাজেশন (লিখে এন্টার চাপুন)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs text-slate-800 bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newFeatureInput.trim();
                    if (v && !featuresList.includes(v)) {
                      setFeaturesList([...featuresList, v]);
                      setNewFeatureInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  + যোগ করুন
                </button>
              </div>

              {featuresList.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {featuresList.map((feat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-rose-50/80 border border-rose-200 text-slate-800 text-xs px-3 py-1 rounded-lg font-bold shadow-2xs"
                    >
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 font-bold ml-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Book Status Selector (Active / Inactive) */}
            <div className="pt-3 border-t border-rose-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                বইয়ের স্ট্যাটাস (Book Status):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      value: 'active',
                      label: 'চালু (Active)',
                      hint: 'পাবলিক Book Store পেজে প্রদর্শিত হবে',
                      activeClass: 'bg-emerald-50 border-emerald-400 text-emerald-900',
                    },
                    {
                      value: 'inactive',
                      label: 'বন্ধ / লুকানো (Inactive)',
                      hint: 'পাবলিক Book Store থেকে অদৃশ্য থাকবে',
                      activeClass: 'bg-slate-100 border-slate-400 text-slate-900',
                    },
                  ] as const
                ).map((opt) => {
                  const selected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      aria-pressed={selected}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        selected
                          ? `${opt.activeClass} shadow-xs ring-1 ring-inset ring-current/15`
                          : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50/40'
                      }`}
                    >
                      <div className="text-xs font-black">{opt.label}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{opt.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Featured Toggle */}
            <div className="pt-2 border-t border-rose-100 flex items-center gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#eb1c24]"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Book Store হিরো ব্যানারে ফিচারড বই হিসেবে দেখান (Featured)</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Real-Time Public BookCard Live Preview */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="glass-strong rounded-3xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#eb1c24]" />
                <span className="text-xs sm:text-sm font-black text-[#2A0F12]">
                  লাইভ বুক কার্ড প্রিভিউ
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-[#b91c1c] text-[10px] font-bold">
                রিয়েল-টাইম
              </span>
            </div>
            <p className="text-[11px] text-[#6B4C4F]">
              মেইন ওয়েবসাইটের হুবহু অরিজিনাল সাইজ ও ডাইমেনশনে লাইভ প্রিভিউ:
            </p>

            {/* Live Rendered BookCard in exact portrait dimensions */}
            <div className="pt-2 flex justify-center">
              <div className="w-full max-w-[252px]">
                <BookCard
                  book={previewBook}
                  categoryName={matchedCategoryName}
                  showAdminStatusBadge
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="lg:hidden p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mobile & Tablet Action Bar */}
          <div className="lg:hidden glass-strong rounded-3xl p-4 sm:p-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCancelAndBack}
              disabled={saving}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-200 bg-white/90 hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 text-[#2A0F12] font-bold text-xs transition cursor-pointer shadow-2xs text-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Book'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
