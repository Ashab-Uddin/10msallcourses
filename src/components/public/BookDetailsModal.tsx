'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronUp,
  FileText,
  MessageCircle,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import type { Book, SiteSettings } from '../../types.ts';
import { parseFeatures, toBengaliNumber } from '../../utils/format.ts';
import { computeDiscountPercent } from '../../lib/courseValidation.ts';
import { buildWhatsAppBookPurchaseUrl } from '../../lib/courseFeatures.ts';
import { useSiteContact } from './SiteContactContext.tsx';

interface BookDetailsModalProps {
  book: Book | null;
  categoryName?: string;
  settings?: SiteSettings | null;
  loadingDetails?: boolean;
  onClose: () => void;
  onBuyClick?: (book: Book) => void;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  book,
  categoryName,
  settings,
  loadingDetails = false,
  onClose,
  onBuyClick,
}) => {
  const siteContact = useSiteContact();
  const effectiveWhatsappNumber = settings?.whatsappNumber || siteContact.whatsappNumber;
  const effectiveWhatsappLink = settings?.whatsappLink || siteContact.whatsappLink;

  useEffect(() => {
    if (!book) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [book, onClose]);

  if (!book || typeof document === 'undefined') {
    return null;
  }

  const resolvedCategoryName = (categoryName || '').trim();
  const resolvedBookType = (book.bookType || 'প্রিন্টেড বুক').trim();
  const resolvedAuthor = (book.author || '').trim();
  const resolvedPublisher = (book.publisher || '১০ মিনিট স্কুল').trim();
  const features = parseFeatures(book.features);
  const savingsAmount =
    book.originalPrice > 0 && book.originalPrice > book.price
      ? Math.max(0, book.originalPrice - book.price)
      : 0;
  const discountPercent = computeDiscountPercent(book.originalPrice, book.price);

  const whatsappPurchaseHref = buildWhatsAppBookPurchaseUrl(
    effectiveWhatsappLink,
    effectiveWhatsappNumber,
    book.title
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1c090b]/65 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`book-modal-title-${book.id}`}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_24px_64px_-12px_rgba(42,15,18,0.45)] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-7 py-3 sm:py-3.5 border-b border-rose-100 bg-gradient-to-r from-rose-50/85 via-white to-rose-50/60 shrink-0">
          <div className="min-w-0 flex items-center gap-1.5 text-xs sm:text-[13px] font-bold truncate">
            {resolvedCategoryName && (
              <span className="text-[#B91C1C] truncate">{resolvedCategoryName}</span>
            )}
            {resolvedCategoryName && resolvedBookType && (
              <span className="text-rose-300 shrink-0" aria-hidden="true">
                ·
              </span>
            )}
            {resolvedBookType && (
              <span className="text-[#6B4C4F] font-semibold truncate">{resolvedBookType}</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="w-10 h-10 rounded-full bg-white border border-rose-200/80 text-[#6B4C4F] hover:text-[#b91c1c] hover:bg-rose-50 flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Book Details Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-7 py-4 sm:py-6 space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Cover Column */}
            <div className="md:col-span-5 min-w-0 flex flex-col items-center">
              <div className="w-full aspect-[16/10] sm:aspect-[4/4.1] md:aspect-[4/4.3] rounded-2xl glass-inset bg-gradient-to-br from-white/90 via-white/60 to-rose-50/45 p-3.5 sm:p-6 flex items-center justify-center relative overflow-hidden">
                {discountPercent > 0 && book.originalPrice > book.price && (
                  <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white text-[11px] sm:text-xs font-black shadow-sm border border-orange-300/40 tabular-nums">
                    {toBengaliNumber(discountPercent)}% ছাড়
                  </span>
                )}
                {book.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[165px] sm:max-h-[250px] md:max-h-full max-w-[85%] w-auto h-auto object-contain rounded-md drop-shadow-[0_14px_24px_rgba(42,15,18,0.22)]"
                  />
                ) : (
                  <div className="w-28 h-36 sm:w-36 sm:h-48 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#7f1d1d] flex flex-col items-center justify-center p-3 sm:p-4 text-center text-white shadow-lg">
                    <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 mb-1.5 opacity-90" />
                    <span className="text-[11px] sm:text-xs font-bold leading-snug line-clamp-3">
                      {book.title}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Book Information Column */}
            <div className="md:col-span-7 min-w-0 flex flex-col space-y-3.5 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2 min-w-0">
                <h2
                  id={`book-modal-title-${book.id}`}
                  className="text-lg sm:text-2xl font-black text-[#2A0F12] leading-snug break-words"
                >
                  {book.title}
                </h2>

                {/* Price Row */}
                <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5 tabular-nums">
                  <span className="text-2xl sm:text-[26px] font-black text-[#007a3d]">
                    ৳{toBengaliNumber(book.price)}
                  </span>
                  {book.originalPrice > book.price && (
                    <>
                      <span className="text-sm font-medium text-[#7A5A5D] line-through">
                        ৳{toBengaliNumber(book.originalPrice)}
                      </span>
                      <span className="text-xs font-bold text-[#007a3d] bg-emerald-50/90 border border-emerald-500/70 px-2.5 py-0.5 rounded-full">
                        ৳{toBengaliNumber(savingsAmount)} ছাড়
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Book Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs sm:text-[13px] glass-inset rounded-2xl p-3.5 sm:p-4">
                {resolvedAuthor ? (
                  <div className="flex items-start gap-2 text-[#2A0F12] min-w-0">
                    <User className="w-3.5 h-3.5 text-[#E22B2B] shrink-0 mt-0.5" />
                    <span className="break-words leading-snug">
                      <strong>লেখক:</strong> {resolvedAuthor}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-start gap-2 text-[#2A0F12] min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-[#E22B2B] shrink-0 mt-0.5" />
                  <span className="break-words leading-snug">
                    <strong>প্রকাশনী:</strong> {resolvedPublisher}
                  </span>
                </div>
                {book.edition && (
                  <div className="flex items-start gap-2 text-[#2A0F12] min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span className="break-words leading-snug">
                      <strong>সংস্করণ:</strong> {book.edition}
                    </span>
                  </div>
                )}
                {book.pages && (
                  <div className="flex items-start gap-2 text-[#2A0F12] min-w-0">
                    <FileText className="w-3.5 h-3.5 text-[#1E63D6] shrink-0 mt-0.5" />
                    <span className="break-words leading-snug">
                      <strong>পৃষ্ঠা:</strong> {book.pages}
                    </span>
                  </div>
                )}
              </div>

              {loadingDetails && (
                <p className="text-[11px] text-[#6B4C4F]/75">বিস্তারিত তথ্য আপডেট হচ্ছে...</p>
              )}

              {/* Feature Highlights */}
              {features.length > 0 && (
                <div className="space-y-2 pt-0.5">
                  <div className="text-xs sm:text-[13px] font-extrabold text-[#2A0F12]">
                    বইটির মূল বৈশিষ্ট্য:
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {features.map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-[#2A0F12]/90 font-medium min-w-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#007a3d] shrink-0 mt-0.5" />
                        <span className="break-words leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 1. WhatsApp Direct Order / Message Box (Above বইটি কিনুন & See Less, matching CourseDetailsModal) */}
          <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/75 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-sm font-black text-[#065f46] flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#16a34a] shrink-0" />
                <span>WhatsApp-এ অর্ডার করুন</span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#3E2225]">
                বইটি অর্ডার করতে বা ডেলিভারি সংক্রান্ত যেকোনো তথ্যের জন্য সরাসরি WhatsApp-এ মেসেজ করুন।
              </p>
            </div>

            <a
              href={whatsappPurchaseHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onBuyClick?.(book)}
              className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white text-sm font-extrabold shadow-md hover:shadow-lg transition shrink-0 whitespace-nowrap"
            >
              <svg
                className="w-4 h-4 fill-white shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.78 14.15c-.24.67-1.39 1.28-1.92 1.36-.5.08-1.14.12-3.66-.92-3.22-1.33-5.3-4.57-5.46-4.78-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.11-2.66.29-.32.64-.4.85-.4.21 0 .43.002.61.01.2.008.47-.076.73.55.27.64.91 2.22.99 2.38.08.16.13.35.03.56-.1.21-.16.34-.31.52-.16.18-.33.4-.47.54-.16.15-.32.32-.14.63.19.31.83 1.37 1.78 2.22 1.22 1.09 2.25 1.42 2.57 1.58.32.16.51.13.7-.08.19-.21.82-.95 1.04-1.28.22-.32.43-.27.73-.16.29.11 1.87.88 2.19 1.04.32.16.53.24.61.37.08.14.08.79-.16 1.46z" />
              </svg>
              <span>WhatsApp-এ মেসেজ করুন</span>
            </a>
          </div>
        </div>

        {/* 2. বইটি কিনুন বাটন + 3. See Less · সংক্ষিপ্ত করুন বাটন (Sticky Bottom Footer matching CourseDetailsModal) */}
        <div className="px-4 sm:px-7 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-rose-100 bg-white/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-[#4A2C2F] text-xs sm:text-[13px] font-bold transition cursor-pointer"
          >
            <ChevronUp className="w-4 h-4 shrink-0" />
            <span>See Less · সংক্ষিপ্ত করুন</span>
          </button>

          <a
            href={whatsappPurchaseHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onBuyClick?.(book)}
            className="flex-1 sm:flex-initial min-h-[50px] sm:min-h-[52px] inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#ff5252] via-[#e22b2b] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white text-base sm:text-[17px] font-extrabold shadow-[0_10px_24px_-6px_rgba(226,43,43,0.6)] hover:shadow-[0_14px_28px_-6px_rgba(185,28,28,0.7)] active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
          >
            <span>বইটি কিনুন</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};
