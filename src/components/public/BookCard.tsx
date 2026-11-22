'use client';

import React, { useState } from 'react';
import { Book } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { computeDiscountPercent } from '../../lib/courseValidation.ts';
import { buildAffiliateRedirectUrl, validateExternalHttpUrl } from '../../lib/affiliateUrl.ts';
import { ArrowRight, BookOpen, Info, X } from 'lucide-react';

export interface BookCardProps {
  book: Book;
  categoryName?: string;
  defaultAffiliateRef?: string;
  onSelect?: (book: Book) => void;
  onBuyClick?: (book: Book) => void;
  showAdminStatusBadge?: boolean;
  headingLevel?: 'h3' | 'h4';
  compactMobile?: boolean;
  className?: string;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  categoryName,
  defaultAffiliateRef,
  onSelect,
  onBuyClick,
  showAdminStatusBadge = false,
  headingLevel = 'h3',
  compactMobile = false,
  className = '',
}) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const displayImageUrl = book.coverImageUrl ? book.coverImageUrl.trim() : null;
  const imageError = Boolean(displayImageUrl && failedImageUrl === displayImageUrl);
  const hasValidImage = Boolean(displayImageUrl && !imageError && displayImageUrl.length > 0);

  const savingsAmount =
    book.originalPrice > 0 && book.originalPrice > book.price
      ? Math.max(0, book.originalPrice - book.price)
      : 0;
  const computedDiscountPercent = computeDiscountPercent(book.originalPrice, book.price);
  const isInactive = book.status === 'inactive';

  // Validate book-specific Affiliate URL strictly (zero hardcoded/demo link fallback)
  const rawAffiliateUrl = (book.affiliateUrl || '').trim();
  const affiliateCheck = rawAffiliateUrl ? validateExternalHttpUrl(rawAffiliateUrl) : { valid: false };
  const resolvedAffiliateHref =
    affiliateCheck.valid && affiliateCheck.normalized
      ? buildAffiliateRedirectUrl(affiliateCheck.normalized, defaultAffiliateRef)
      : null;

  const resolvedCategoryLabel = (categoryName || book.categorySlug || '').trim();
  const resolvedAuthor = (book.author || '').trim();

  const handleOpenDetails = () => {
    if (onSelect) {
      onSelect(book);
    }
  };

  return (
    <article
      className={`glass-card flex flex-col h-full w-full mx-auto group overflow-hidden ${
        compactMobile
          ? 'rounded-2xl sm:rounded-[22px] max-w-none sm:max-w-[252px]'
          : 'rounded-[22px] max-w-[252px]'
      } ${className}`}
    >
      {/* TOP VISUAL AREA (Portrait 3:4 aspect ratio for large, clear uncropped book covers) */}
      <div
        onClick={onSelect ? handleOpenDetails : undefined}
        className={`relative w-full aspect-[3/4] overflow-hidden flex-shrink-0 flex items-center justify-center select-none bg-gradient-to-br from-white via-rose-50/45 to-white/95 ${
          onSelect ? 'cursor-pointer' : 'cursor-default'
        }`}
        title={onSelect ? `${book.title} — বিস্তারিত দেখুন` : book.title}
      >
        {hasValidImage ? (
          <div
            className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden ${
              compactMobile ? 'p-2 sm:p-3' : 'p-3'
            }`}
          >
            {/* Subtle Ambient Blurred Cover Echo for Studio Depth */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl!}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-15 scale-110 pointer-events-none select-none"
            />
            {/* Crisp Uncropped, Undistorted Book Cover */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl!}
              alt={`${book.title} — বুক কভার`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailedImageUrl(displayImageUrl)}
              className="relative z-10 max-h-[92%] max-w-[88%] w-auto h-auto object-contain object-center rounded-[6px] drop-shadow-[0_10px_20px_rgba(42,15,18,0.22)] group-hover:scale-[1.04] transition-transform duration-300 block"
            />
          </div>
        ) : (
          <div
            className={`relative z-10 rounded-[8px] bg-gradient-to-br from-[#dc2626] via-[#b91c1c] to-[#7f1d1d] shadow-[0_10px_22px_-6px_rgba(185,28,28,0.45)] flex flex-col items-center justify-center p-2.5 text-center text-white border border-white/30 ${
              compactMobile
                ? 'w-[92px] h-[124px] sm:w-[132px] sm:h-[176px]'
                : 'w-[132px] h-[176px]'
            }`}
          >
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 opacity-90 mb-1.5 shrink-0" />
            <span className="text-[9.5px] sm:text-[10px] font-extrabold leading-tight line-clamp-3">
              {book.title}
            </span>
          </div>
        )}

        {/* Top-Left Dynamic Discount Percentage Badge (Exact CourseCard style) */}
        {computedDiscountPercent > 0 && (
          <div
            className={`absolute z-20 pointer-events-none ${
              compactMobile ? 'top-1.5 left-1.5 sm:top-2.5 sm:left-2.5' : 'top-2.5 left-2.5'
            }`}
          >
            <span
              className={`inline-flex items-center rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white font-black tracking-tight shadow-[0_4px_12px_-2px_rgba(249,115,22,0.55)] border border-orange-300/40 tabular-nums ${
                compactMobile
                  ? 'px-2 sm:px-2.5 py-0.5 text-[9.5px] sm:text-[11px]'
                  : 'px-2.5 py-0.5 text-[10px] sm:text-[11px]'
              }`}
            >
              {toBengaliNumber(computedDiscountPercent)}% ছাড়
            </span>
          </div>
        )}

        {/* Top-Right Status Badge (Admin Preview) or Subtle Quick-Details Button */}
        <div
          className={`absolute z-20 ${
            compactMobile ? 'top-1.5 right-1.5 sm:top-2.5 sm:right-2.5' : 'top-2.5 right-2.5'
          }`}
        >
          {showAdminStatusBadge && isInactive ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#2A0F12]/85 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-black tracking-tight shadow-md border border-white/20">
              Inactive
            </span>
          ) : onSelect ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(book);
              }}
              aria-label={`${book.title} বিস্তারিত দেখুন`}
              title="বইয়ের বিস্তারিত দেখুন"
              className={`rounded-full bg-white/85 hover:bg-white border border-rose-200/80 text-[#6B4C4F] hover:text-[#E22B2B] flex items-center justify-center shadow-xs backdrop-blur-sm transition-colors cursor-pointer ${
                compactMobile ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-7 h-7'
              }`}
            >
              <Info className={compactMobile ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5'} />
            </button>
          ) : null}
        </div>
      </div>

      {/* CARD BODY CONTENT */}
      <div
        className={`flex-1 flex flex-col justify-between ${
          compactMobile ? 'p-2.5 sm:p-4 gap-2 sm:gap-2.5' : 'p-4 gap-2.5'
        }`}
      >
        <div className="min-w-0">
          {/* Clean Unboxed Book Category & Format Metadata */}
          {(resolvedCategoryLabel || book.bookType) && (
            <div
              className={`flex items-center gap-1 sm:gap-1.5 leading-tight truncate ${
                compactMobile
                  ? 'text-[10px] sm:text-[11.5px] mb-0.5 sm:mb-1'
                  : 'text-[11.5px] mb-1'
              }`}
            >
              {resolvedCategoryLabel && (
                <span className="font-bold text-[#B91C1C] truncate">{resolvedCategoryLabel}</span>
              )}
              {resolvedCategoryLabel && book.bookType && (
                <span className="text-rose-300 shrink-0" aria-hidden="true">
                  ·
                </span>
              )}
              {book.bookType && (
                <span className="font-medium text-[#6B4C4F] truncate">{book.bookType}</span>
              )}
            </div>
          )}

          {/* Book Title (2-line clamped) */}
          {headingLevel === 'h4' ? (
            <h4
              onClick={onSelect ? handleOpenDetails : undefined}
              className={`font-bold text-[#2A0F12] leading-snug line-clamp-2 hover:text-[#E22B2B] transition-colors ${
                compactMobile ? 'text-[12.5px] sm:text-[15px]' : 'text-sm sm:text-[15px]'
              } ${onSelect ? 'cursor-pointer' : ''}`}
              title={book.title}
            >
              {book.title}
            </h4>
          ) : (
            <h3
              onClick={onSelect ? handleOpenDetails : undefined}
              className={`font-bold text-[#2A0F12] leading-snug line-clamp-2 hover:text-[#E22B2B] transition-colors ${
                compactMobile ? 'text-[12.5px] sm:text-[15px]' : 'text-sm sm:text-[15px]'
              } ${onSelect ? 'cursor-pointer' : ''}`}
              title={book.title}
            >
              {book.title}
            </h3>
          )}

          {/* Author Name directly below Book Title (Dynamic from Admin, never dummy) */}
          {resolvedAuthor ? (
            <p
              className={`font-medium text-[#6B4C4F] truncate ${
                compactMobile ? 'text-[10.5px] sm:text-xs mt-0.5' : 'text-xs mt-1'
              }`}
              title={resolvedAuthor}
            >
              {resolvedAuthor}
            </p>
          ) : null}
        </div>

        <div>
          {/* Price Row (Exact CourseCard divider, green price, strikethrough & savings badge) */}
          <div
            className={`flex items-center justify-between border-t border-white/75 tabular-nums ${
              compactMobile
                ? 'flex-wrap gap-x-1.5 gap-y-1 pt-2 sm:pt-2.5 pb-2 sm:pb-3'
                : 'pt-2.5 pb-3'
            }`}
          >
            <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0">
              <span
                className={`font-black text-[#007a3d] tracking-tight ${
                  compactMobile ? 'text-base sm:text-2xl' : 'text-xl sm:text-2xl'
                }`}
              >
                ৳{toBengaliNumber(book.price)}
              </span>
              {book.originalPrice > book.price && (
                <span
                  className={`text-[#7A5A5D] line-through font-normal ${
                    compactMobile ? 'text-[10px] sm:text-xs' : 'text-xs'
                  }`}
                >
                  ৳{toBengaliNumber(book.originalPrice)}
                </span>
              )}
            </div>

            {savingsAmount > 0 && (
              <span
                className={`border border-emerald-500/80 text-[#007a3d] bg-emerald-50/90 font-bold rounded-full whitespace-nowrap shadow-2xs shrink-0 ${
                  compactMobile
                    ? 'text-[9.5px] sm:text-xs px-1.5 sm:px-2.5 py-0.5'
                    : 'text-[11px] sm:text-xs px-2.5 py-0.5'
                }`}
              >
                ৳{toBengaliNumber(savingsAmount)} ছাড়
              </span>
            )}
          </div>

          {/* Full-Width Primary CTA Button: বইটি কিনুন (with safe Affiliate URL fallback) */}
          {isInactive ? (
            <button
              type="button"
              disabled
              className={`w-full bg-slate-100 text-slate-500 border border-slate-200/90 font-bold flex items-center justify-center gap-1.5 cursor-not-allowed select-none shadow-2xs whitespace-nowrap ${
                compactMobile
                  ? 'text-[11px] sm:text-sm py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg sm:rounded-xl'
                  : 'text-xs sm:text-sm py-2.5 px-4 rounded-xl'
              }`}
            >
              <span>বর্তমানে অনুপলব্ধ</span>
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
            </button>
          ) : resolvedAffiliateHref ? (
            <a
              href={resolvedAffiliateHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                onBuyClick?.(book);
              }}
              className={`group/btn relative overflow-hidden w-full bg-gradient-to-r from-[#ff5252] via-[#e22b2b] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-[0_8px_20px_-8px_rgba(226,43,43,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_12px_24px_-8px_rgba(185,28,28,0.75)] active:scale-[0.98] transition-all duration-300 cursor-pointer whitespace-nowrap ${
                compactMobile
                  ? 'text-[11px] sm:text-sm py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg sm:rounded-xl'
                  : 'text-xs sm:text-sm py-2.5 px-4 rounded-xl'
              }`}
            >
              <span className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-[-25deg] -translate-x-full group-hover/btn:translate-x-[350%] transition-transform duration-700 ease-out pointer-events-none" />
              <span className="relative z-10 font-bold tracking-tight">বইটি কিনুন</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover/btn:translate-x-1 relative z-10 shrink-0" />
            </a>
          ) : onSelect ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(book);
              }}
              className={`group/btn w-full bg-white/90 hover:bg-rose-50/90 text-[#B91C1C] border border-rose-200/90 hover:border-[#E22B2B]/55 font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer shadow-2xs whitespace-nowrap ${
                compactMobile
                  ? 'text-[11px] sm:text-sm py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg sm:rounded-xl'
                  : 'text-xs sm:text-sm py-2.5 px-4 rounded-xl'
              }`}
            >
              <span>বিস্তারিত দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className={`w-full bg-slate-100 text-slate-500 border border-slate-200/90 font-bold flex items-center justify-center gap-1.5 cursor-not-allowed select-none shadow-2xs whitespace-nowrap ${
                compactMobile
                  ? 'text-[11px] sm:text-sm py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg sm:rounded-xl'
                  : 'text-xs sm:text-sm py-2.5 px-4 rounded-xl'
              }`}
            >
              <span>বইটি কিনুন (লিংক যুক্ত করুন)</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
