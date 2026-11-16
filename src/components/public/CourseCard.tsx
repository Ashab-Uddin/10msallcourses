'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Course } from '../../types.ts';
import { toBengaliNumber, parseFeatures } from '../../utils/format.ts';
import { computeDiscountPercent } from '../../lib/courseValidation.ts';
import { X, Check, Copy, Info, Star, Users, Zap, ExternalLink, ArrowRight } from 'lucide-react';

export interface CourseCardProps {
  course: Course;
  onSelectCourse?: (slug: string) => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  onOpenQuickView?: (course: Course) => void;
  headingLevel?: 'h3' | 'h4';
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onEnrollClick,
  onOpenQuickView,
  headingLevel = 'h4',
}) => {
  const [copied, setCopied] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  // Strip downscaling thumbnail query parameters from 10MS CDN to preserve full HD original quality
  const displayImageUrl = course.imageUrl
    ? course.imageUrl.replace(/\?(w=\d+.*)/i, '').trim()
    : null;

  const imageError = Boolean(displayImageUrl && failedImageUrl === displayImageUrl);
  const hasValidImage = Boolean(displayImageUrl && !imageError && displayImageUrl.length > 0);

  const savingsAmount = Math.max(0, course.originalPrice - course.discountPrice);
  const computedDiscountPercent = computeDiscountPercent(course.originalPrice, course.discountPrice);
  const isClosed = course.status === 'closed' || course.status === 'inactive' || course.slug.includes('beim');

  const getBannerStyle = () => {
    switch (course.gradientTheme) {
      case 'emerald':
      case 'green':
        return {
          bg: 'bg-gradient-to-br from-[#15803d] via-[#166534] to-[#0f391e]',
          textColor: 'text-[#15803d]',
        };
      case 'purple':
      case 'violet':
        return {
          bg: 'bg-gradient-to-br from-[#7e22ce] via-[#6b21a8] to-[#450a0a]',
          textColor: 'text-[#7e22ce]',
        };
      case 'crimson':
      case 'rose':
        return {
          bg: 'bg-gradient-to-br from-[#991b1b] via-[#881337] to-[#4c0519]',
          textColor: 'text-[#991b1b]',
        };
      case 'amber':
      case 'orange':
        return {
          bg: 'bg-gradient-to-br from-[#c2410c] via-[#9a3412] to-[#451a03]',
          textColor: 'text-[#c2410c]',
        };
      case 'slate':
      case 'navy':
        return {
          bg: 'bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]',
          textColor: 'text-[#dc2626]',
        };
      case 'blue':
        return {
          bg: 'bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#172554]',
          textColor: 'text-[#1d4ed8]',
        };
      case 'red':
      default:
        return {
          bg: 'bg-gradient-to-br from-[#dc2626] via-[#b91c1c] to-[#7f1d1d]',
          textColor: 'text-[#dc2626]',
        };
    }
  };

  const banner = getBannerStyle();

  const handleCardClick = (referrer: string) => {
    if (isClosed) return;
    onEnrollClick(course, referrer);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link =
      course.affiliateUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/go/${course.slug}`
        : `/go/${course.slug}`);

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(link)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        })
        .catch(() => {});
    }
  };

  const handleOpenInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenQuickView) {
      onOpenQuickView(course);
    } else {
      setShowLocalModal(true);
    }
  };

  const displayDescription =
    course.description ||
    (course.categorySlug === 'school'
      ? '২০২৭ সালে SSC 2027 বোর্ড পরীক্ষায় সেরা রেজাল্ট করার জন্য সঠিক গাইডলাইন ও ফুল রিভিশন প্রোগ্রাম...'
      : 'প্রথম থেকেই বিষয়ভিত্তিক পূর্ণাঙ্গ A+ প্রস্তুতির গোছানো একাডেমিক প্রোগ্রাম এবং লাইভ গাইডলাইন...');

  const parsedFeats = parseFeatures(course.features || '');

  // 1. Top small black badge (e.g. HSC 28, HSC 27, SSC 27, 10MS)
  const topBadge =
    course.headerTitle && course.headerTitle !== '10MS' && course.headerTitle !== 'লাইভ ব্যাচ চলমান'
      ? course.headerTitle
      : course.categorySlug === 'hsc'
      ? course.title.includes('28')
        ? 'HSC 28'
        : course.title.includes('27')
        ? 'HSC 27'
        : 'HSC 26'
      : course.categorySlug === 'school'
      ? course.title.includes('28')
        ? 'SSC 28'
        : 'SSC 27'
      : course.categorySlug === 'admission'
      ? 'এডমিশন'
      : '10MS';

  // 2. Middle white pill badge (e.g. "অনলাইন ব্যাচ ২০২৬", "শেষ মুহূর্তের প্রস্তুতি কোর্স", "ফুল ইয়ার বিজ্ঞান")
  const getMiddleBadge = () => {
    const t = course.title;
    if (t.includes('BEI') || t.includes('PCMB') || t.includes('অনলাইন ব্যাচ')) {
      return 'অনলাইন ব্যাচ ২০২৬';
    }
    if (t.includes('শেষ মুহূর্ত') || t.includes('SMP') || t.includes('বোর্ড') || t.includes('রিভিশন')) {
      return 'শেষ মুহূর্তের প্রস্তুতি কোর্স';
    }
    if (course.categorySlug === 'skills') {
      return 'প্রফেশনাল স্কিল কোর্স';
    }
    if (course.categorySlug === 'admission') {
      return 'বিশ্ববিদ্যালয় এডমিশন';
    }
    return liveBatchText || course.headerSubtitle || 'অনলাইন কোর্স';
  };
  const liveBatchText = (course.shortBadge || '').trim();
  const middleBadge = getMiddleBadge();

  // 3. Subtitle under white pill (e.g. "BEI সাইকেল ১", "ফুল ইয়ার বিজ্ঞান", "SMP ক্র্যাশ কোর্স", "[মানবিক ও ব্যবসায় শিক্ষা]")
  const getSubTitle = () => {
    if (course.headerSubtitle && course.headerSubtitle.trim() && !course.headerSubtitle.includes('অনলাইন')) {
      return course.headerSubtitle;
    }
    const t = course.title;
    if (t.includes('BEI')) return 'BEI সাইকেল ১';
    if (t.includes('PCMB')) return 'PCMB সাইকেল ১';
    if (t.includes('সায়েন্স বান্ডেল') || t.includes('বিজ্ঞান বান্ডেল')) return 'ফুল ইয়ার বিজ্ঞান';
    if (t.includes('SMP')) return 'SMP ক্র্যাশ কোর্স';
    if (t.includes('মানবিক') || t.includes('ব্যবসায়')) return '[মানবিক ও ব্যবসায় শিক্ষা]';
    if (t.includes('Spoken English')) return '[ঘরে বসে Spoken English]';
    if (t.includes('IELTS')) return '[IELTS Complete Preparation]';
    if (t.includes('Web Dev') || t.includes('ফুলস্ট্যাক')) return '[MERN ফুলস্ট্যাক ডেভেলপমেন্ট]';
    if (t.includes('Varsity') || t.includes('ভার্সিটি')) return '[ভার্সিটি A Unit + GST]';
    return course.headerSubtitle || '[১০ মিনিট স্কুল]';
  };
  const subTitle = getSubTitle();

  // 4. Bottom-left dynamic Live Batch badge from DB (empty when unset)
  const bottomLeftBadge = liveBatchText;

  // 5. Bottom-right green discount badge in banner (only shown when a valid discount exists)
  const getDiscountBadge = () => {
    if (savingsAmount <= 0 && computedDiscountPercent <= 0) {
      return '';
    }
    if (course.discountBadgeText && course.discountBadgeText.trim()) {
      return course.discountBadgeText;
    }
    if (savingsAmount > 0) {
      return `৳${toBengaliNumber(savingsAmount)} ছাড়`;
    }
    return `${toBengaliNumber(computedDiscountPercent)}% ছাড়`;
  };
  const discountBadge = getDiscountBadge();

  // Full Details Quick-View Modal
  const modalNode =
    showLocalModal && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-950/35 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowLocalModal(false)}
          >
            <div
              className="glass-strong rounded-3xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Banner Header */}
              <div className={`relative aspect-[16/9] w-full ${hasValidImage ? 'bg-white' : banner.bg} overflow-hidden flex flex-col justify-between p-5 text-white text-center`}>
                {hasValidImage && (
                  <div className="absolute inset-0 z-0 bg-white">
                    <img
                      src={displayImageUrl!}
                      alt={`${course.title} — ১০ মিনিট স্কুল কোর্স`}
                      loading="lazy"
                      decoding="async"
                      width={520}
                      height={293}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center brightness-100 contrast-100"
                    />
                  </div>
                )}
                {computedDiscountPercent > 0 && (
                  <div className="absolute top-3 left-3 z-30 pointer-events-none">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white text-xs font-black tracking-tight shadow-[0_4px_12px_-2px_rgba(249,115,22,0.55)] border border-orange-300/40 tabular-nums">
                      {toBengaliNumber(computedDiscountPercent)}% ছাড়
                    </span>
                  </div>
                )}

                <div className="absolute top-3 right-3 z-30">
                  <button
                    type="button"
                    onClick={() => setShowLocalModal(false)}
                    className="p-2 rounded-full bg-black/60 hover:bg-black text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {!hasValidImage && (
                  <div className="my-auto">
                    <span className="inline-block bg-black/90 text-white text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider mb-2">
                      {topBadge}
                    </span>
                    <div className={`bg-white ${banner.textColor} font-black text-base px-4 py-1 rounded-md shadow-sm max-w-[280px] mx-auto`}>
                      {middleBadge}
                    </div>
                    <div className="text-white font-bold text-sm mt-1.5 opacity-95">
                      {subTitle}
                    </div>
                  </div>
                )}

                {(bottomLeftBadge || discountBadge) && (
                  <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-white/20">
                    {bottomLeftBadge ? (
                      <span className="bg-black/60 px-2.5 py-1 rounded-full">⚡ {bottomLeftBadge}</span>
                    ) : (
                      <span />
                    )}
                    {discountBadge && (
                      <span className="bg-[#007a3d] px-3 py-1 rounded-full">{discountBadge}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Content */}
              <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto space-y-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#2A0F12]">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[#6B4C4F] mt-1.5 leading-relaxed">
                    {course.fullDescription || course.description || displayDescription}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 py-3 px-3 glass-inset rounded-2xl text-center text-xs">
                  <div>
                    <span className="text-[#6B4C4F] block text-[11px]">রেটিং</span>
                    <span className="font-bold text-[#2A0F12] flex items-center justify-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {course.rating || '৪.৯'}
                    </span>
                  </div>
                  <div className="border-x border-rose-200/60">
                    <span className="text-[#6B4C4F] block text-[11px]">শিক্ষার্থী</span>
                    <span className="font-bold text-[#2A0F12] mt-0.5 block">
                      {course.studentCount || '১২,৫০০+'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B4C4F] block text-[11px]">মেয়াদ / সময়</span>
                    <span className="font-bold text-[#2A0F12] mt-0.5 block">
                      {course.duration || 'পূর্ণাঙ্গ সেশন'}
                    </span>
                  </div>
                </div>

                {/* Course Features */}
                {parsedFeats.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-[#2A0F12] uppercase tracking-wider mb-2">
                      কোর্সে যা যা থাকছে
                    </h5>
                    <div className="space-y-2">
                      {parsedFeats.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-white/75 bg-white/55 backdrop-blur-md flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-[#6B4C4F] block">কোর্স ফি</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[#007a3d]">
                      ৳{toBengaliNumber(course.discountPrice)}
                    </span>
                    {course.originalPrice > course.discountPrice && (
                      <span className="text-xs text-[#6B4C4F] line-through">
                        ৳{toBengaliNumber(course.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2.5 rounded-xl glass-inset hover:bg-white text-[#2A0F12] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copied ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
                  </button>
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowLocalModal(false);
                        handleCardClick('modal_enroll');
                      }}
                      className="bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white font-bold text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/25 cursor-pointer transition"
                    >
                      <span>এখনই ভর্তি হোন</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="glass-card rounded-[22px] flex flex-col h-full group overflow-hidden">
        {/* TOP BANNER AREA (MATCHING UPLOADED STRUCTURE EXACTLY) */}
        <div
          onClick={() => handleCardClick('card_banner')}
          className={`relative w-full aspect-[4/3] overflow-hidden ${
            hasValidImage ? 'bg-white' : banner.bg
          } select-none cursor-pointer flex-shrink-0 flex flex-col justify-between ${
            hasValidImage ? 'p-2 sm:p-2.5' : 'p-3.5'
          }`}
          title="১০ মিনিট স্কুলে সরাসরি ভর্তি হতে ক্লিক করুন"
        >
          {hasValidImage ? (
            <div className="absolute inset-0 z-0 bg-white">
              <img
                src={displayImageUrl!}
                alt={`${course.title} — ১০ মিনিট স্কুল কোর্স`}
                loading="lazy"
                decoding="async"
                width={400}
                height={300}
                referrerPolicy="no-referrer"
                onError={() => setFailedImageUrl(displayImageUrl)}
                className={`w-full h-full ${
                  course.imageFit === 'contain'
                    ? 'object-contain object-center'
                    : 'object-cover object-center'
                } block brightness-100 contrast-100 transition-transform duration-500 group-hover:scale-[1.03]`}
              />
            </div>
          ) : (
            <>
              {/* Subtle Ambient Sheen */}
              <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage: `radial-gradient(circle at 10% 20%, rgba(255,255,255,0.3) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.18) 0%, transparent 45%)`,
                }}
              />

              {/* Center Vertical Badge Stack matching screenshot format */}
              <div className="relative z-10 text-center my-auto px-1 flex flex-col items-center pb-6">
                {/* 1. Small Black Capsule */}
                <span className="inline-block bg-black/90 border border-white/20 text-white text-[10px] sm:text-[10.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  {topBadge}
                </span>

                {/* 2. White Rounded Rectangle Pill with colored bold text */}
                <div
                  className={`inline-block bg-white ${banner.textColor} font-black text-xs sm:text-[13px] px-3.5 py-1 rounded-md mt-1.5 shadow-sm leading-tight line-clamp-1`}
                >
                  {middleBadge}
                </div>

                {/* 3. Subtitle in white */}
                <div className="text-white font-bold text-[11px] sm:text-xs mt-1 drop-shadow-xs truncate max-w-[240px] opacity-95">
                  {subTitle}
                </div>
              </div>
            </>
          )}

          {/* Top-Left Dynamic Discount Percentage Badge */}
          {computedDiscountPercent > 0 && (
            <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white text-[10px] sm:text-[11px] font-black tracking-tight shadow-[0_4px_12px_-2px_rgba(249,115,22,0.55)] border border-orange-300/40 tabular-nums">
                {toBengaliNumber(computedDiscountPercent)}% ছাড়
              </span>
            </div>
          )}

          {/* Top-Right Yellow Lightning Bolt ⚡ */}
          <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            <svg
              className="w-4 h-4 text-amber-400 drop-shadow-sm fill-amber-400"
              viewBox="0 0 24 24"
            >
              <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" />
            </svg>
          </div>

          {/* Bottom Row Inside Banner - Dynamic Live Batch & Discount Badges */}
          {(bottomLeftBadge || discountBadge) && (
            <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-20 flex items-center justify-between gap-1.5 pointer-events-none">
              {/* Left: Dynamic Live Batch pill with ⚡ icon (hidden if empty) */}
              {bottomLeftBadge ? (
                <div className="inline-flex items-center gap-1 bg-black/85 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow-sm max-w-[60%] truncate">
                  <span className="text-amber-400 text-xs shrink-0">⚡</span>
                  <span className="truncate">{bottomLeftBadge}</span>
                </div>
              ) : (
                <span />
              )}

              {/* Right: Solid Green Pill Badge with Discount (hidden if no discount) */}
              {discountBadge && (
                <div className="bg-[#008744] text-white text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm tracking-tight shrink-0 border border-emerald-400/30">
                  {discountBadge}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD BODY CONTENT: STRICTLY MATCHING UPLOADED FORMAT WITH SITE CONSISTENCY */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Course Title (2-line clamped) */}
            {headingLevel === 'h3' ? (
              <h3
                onClick={() => handleCardClick('card_title')}
                className="font-bold text-[#2A0F12] text-sm sm:text-[15px] leading-snug line-clamp-2 h-[2.6rem] hover:text-[#E22B2B] transition-colors cursor-pointer"
                title={course.title}
              >
                {course.title}
              </h3>
            ) : (
              <h4
                onClick={() => handleCardClick('card_title')}
                className="font-bold text-[#2A0F12] text-sm sm:text-[15px] leading-snug line-clamp-2 h-[2.6rem] hover:text-[#E22B2B] transition-colors cursor-pointer"
                title={course.title}
              >
                {course.title}
              </h4>
            )}

            {/* Course Description (2-line clamped) */}
            <p className="text-xs text-[#6B4C4F] leading-relaxed line-clamp-2 h-[2.1rem] mt-1.5 mb-3">
              {displayDescription}
            </p>
          </div>

          <div>
            {/* Price Row: Discounted Price + Strikethrough Original + Green Outlined Badge */}
            <div className="flex items-center justify-between pt-2.5 pb-3 border-t border-white/75 tabular-nums">
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#007a3d] tracking-tight">
                  ৳{toBengaliNumber(course.discountPrice)}
                </span>
                {course.originalPrice > course.discountPrice && (
                  <span className="text-xs text-[#7A5A5D] line-through font-normal">
                    ৳{toBengaliNumber(course.originalPrice)}
                  </span>
                )}
              </div>

              {savingsAmount > 0 && (
                <span className="border border-emerald-500/80 text-[#007a3d] bg-emerald-50/90 font-bold text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
                  ৳{toBengaliNumber(savingsAmount)} ছাড়
                </span>
              )}
            </div>

            {/* Full-Width Action Button matching format */}
            {isClosed ? (
              <button
                type="button"
                disabled
                className="w-full bg-slate-100 text-slate-500 border border-slate-200/90 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed select-none shadow-2xs"
              >
                <span>ভর্তি বন্ধ রয়েছে</span>
                <X className="w-4 h-4 text-rose-500" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleCardClick('card_button')}
                className="group/btn relative overflow-hidden w-full bg-gradient-to-r from-[#ff5252] via-[#e22b2b] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_8px_20px_-8px_rgba(226,43,43,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_12px_24px_-8px_rgba(185,28,28,0.75)] active:scale-[0.98] transition-all duration-300 cursor-pointer"
              >
                <span className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-[-25deg] -translate-x-full group-hover/btn:translate-x-[350%] transition-transform duration-700 ease-out pointer-events-none" />
                <span className="relative z-10 font-bold tracking-tight">
                  কোর্সটিতে ভর্তি হোন
                </span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1 relative z-10" />
              </button>
            )}
          </div>
        </div>
      </div>

      {modalNode}
    </>
  );
};
