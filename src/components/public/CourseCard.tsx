'use client';

import React, { useState } from 'react';
import { Course } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { computeDiscountPercent } from '../../lib/courseValidation.ts';
import { resolveCourseTargetBatch } from '../../lib/categoryMatching.ts';
import {
  CARD_VISIBLE_COURSE_FEATURES,
  getCourseFeatureItems,
} from '../../lib/courseFeatures.ts';
import { CourseFeatureIcon } from './CourseFeatureIcon.tsx';
import { CourseDetailsModal } from './CourseDetailsModal.tsx';
import { X, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

export interface CourseCardProps {
  course: Course;
  onSelectCourse?: (slug: string) => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  headingLevel?: 'h3' | 'h4';
  compactMobile?: boolean;
  whatsappNumber?: string;
  whatsappLink?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onEnrollClick,
  headingLevel = 'h4',
  compactMobile = false,
  whatsappNumber,
  whatsappLink,
}) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [imageRatioMap, setImageRatioMap] = useState<Record<string, number>>({});
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Strip downscaling thumbnail query parameters from 10MS CDN to preserve full HD original quality
  const displayImageUrl = course.imageUrl
    ? course.imageUrl.replace(/\?(w=\d+.*)/i, '').trim()
    : null;

  const imageError = Boolean(displayImageUrl && failedImageUrl === displayImageUrl);
  const hasValidImage = Boolean(displayImageUrl && !imageError && displayImageUrl.length > 0);

  const loadedRatio = displayImageUrl ? imageRatioMap[displayImageUrl] : undefined;
  const isSquareHint =
    course.imageFit === 'square' ||
    Boolean(displayImageUrl && /[-_]sqr(?:[-_.?]|$)/i.test(displayImageUrl));
  const isNonWidescreenImage =
    loadedRatio !== undefined ? Math.abs(loadedRatio - 16 / 9) > 0.14 : isSquareHint;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!displayImageUrl) return;
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      const ratio = naturalWidth / naturalHeight;
      setImageRatioMap((prev) =>
        prev[displayImageUrl] === ratio ? prev : { ...prev, [displayImageUrl]: ratio }
      );
    }
  };

  const savingsAmount = Math.max(0, course.originalPrice - course.discountPrice);
  const computedDiscountPercent = computeDiscountPercent(course.originalPrice, course.discountPrice);
  const isClosed = course.status === 'closed' || course.status === 'inactive';

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

  const activeFeatures = getCourseFeatureItems(course, {
    includeInactive: false,
  });
  const visibleFeatures = activeFeatures.slice(0, CARD_VISIBLE_COURSE_FEATURES);

  const resolvedBatch = resolveCourseTargetBatch(course);

  // 1. Top small black badge (e.g. HSC 28, HSC 27, SSC 27, 10MS)
  const topBadge =
    course.headerTitle && course.headerTitle !== '10MS' && course.headerTitle !== 'লাইভ ব্যাচ চলমান'
      ? course.headerTitle
      : resolvedBatch === 'hsc-28'
      ? 'HSC 28'
      : resolvedBatch === 'hsc-27'
      ? 'HSC 27'
      : resolvedBatch === 'hsc-26'
      ? 'HSC 26'
      : resolvedBatch === 'ssc-2028'
      ? 'SSC 28'
      : resolvedBatch === 'ssc-2027'
      ? 'SSC 27'
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
      : course.categorySlug === 'class-8'
      ? 'CLASS 8'
      : course.categorySlug === 'class-7'
      ? 'CLASS 7'
      : course.categorySlug === 'class-6'
      ? 'CLASS 6'
      : course.categorySlug === 'class-5'
      ? 'CLASS 5'
      : course.categorySlug === 'free-course'
      ? 'FREE COURSE'
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
    if (course.categorySlug === 'free-course') {
      return 'বিনামূল্যে ফ্রি কোর্স';
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

  return (
    <div
      className={`glass-card ${
        compactMobile ? 'rounded-2xl sm:rounded-[22px] min-w-0' : 'rounded-[22px]'
      } flex flex-col h-full group overflow-hidden`}
    >
        {/* TOP BANNER AREA (MATCHING UPLOADED STRUCTURE EXACTLY) */}
        <div
          onClick={() => handleCardClick('card_banner')}
          className={`relative w-full aspect-video overflow-hidden ${
            hasValidImage
              ? 'bg-white'
              : `${banner.bg} ${compactMobile ? 'p-2 sm:p-3.5' : 'p-3.5'}`
          } select-none ${isClosed ? 'cursor-default' : 'cursor-pointer'} flex-shrink-0 flex flex-col justify-between`}
          title={
            isClosed
              ? 'এই কোর্সটিতে বর্তমানে ভর্তি বন্ধ রয়েছে'
              : '১০ মিনিট স্কুলে সরাসরি ভর্তি হতে ক্লিক করুন'
          }
        >
          {hasValidImage ? (
            <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-white">
              {isNonWidescreenImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={displayImageUrl!}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-fill blur-2xl scale-105 pointer-events-none select-none"
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImageUrl!}
                alt={`${course.title} — ১০ মিনিট স্কুল কোর্স`}
                loading="lazy"
                decoding="async"
                width={1200}
                height={675}
                referrerPolicy="no-referrer"
                onLoad={handleImageLoad}
                onError={() => setFailedImageUrl(displayImageUrl)}
                className="relative z-10 w-full h-full object-contain object-center block"
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
              <div
                className={`relative z-10 text-center my-auto px-1 flex flex-col items-center ${
                  compactMobile ? 'pb-3 sm:pb-6' : 'pb-6'
                }`}
              >
                {/* 1. Small Black Capsule */}
                <span
                  className={`inline-block bg-black/90 border border-white/20 text-white font-black rounded-full uppercase tracking-wider shadow-sm ${
                    compactMobile
                      ? 'text-[8px] sm:text-[10.5px] px-1.5 sm:px-2.5 py-[1px] sm:py-0.5'
                      : 'text-[10px] sm:text-[10.5px] px-2.5 py-0.5'
                  }`}
                >
                  {topBadge}
                </span>

                {/* 2. White Rounded Rectangle Pill with colored bold text */}
                <div
                  className={`inline-block bg-white ${banner.textColor} font-black rounded-md shadow-sm leading-tight line-clamp-1 ${
                    compactMobile
                      ? 'text-[9.5px] sm:text-[13px] px-2 sm:px-3.5 py-0.5 sm:py-1 mt-1 sm:mt-1.5'
                      : 'text-xs sm:text-[13px] px-3.5 py-1 mt-1.5'
                  }`}
                >
                  {middleBadge}
                </div>

                {/* 3. Subtitle in white */}
                <div
                  className={`text-white font-bold drop-shadow-xs truncate opacity-95 ${
                    compactMobile
                      ? 'text-[8.5px] sm:text-xs mt-0.5 sm:mt-1 max-w-[130px] sm:max-w-[240px]'
                      : 'text-[11px] sm:text-xs mt-1 max-w-[240px]'
                  }`}
                >
                  {subTitle}
                </div>
              </div>
            </>
          )}

          {/* Top-Left Dynamic Discount Percentage Badge */}
          {computedDiscountPercent > 0 && (
            <div
              className={`absolute z-20 pointer-events-none ${
                compactMobile ? 'top-1.5 left-1.5 sm:top-2.5 sm:left-2.5' : 'top-2.5 left-2.5'
              }`}
            >
              <span
                className={`inline-flex items-center rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white font-black tracking-tight shadow-[0_4px_12px_-2px_rgba(249,115,22,0.55)] border border-orange-300/40 tabular-nums ${
                  compactMobile
                    ? 'px-1.5 sm:px-2.5 py-[1px] sm:py-0.5 text-[8px] sm:text-[11px]'
                    : 'px-2.5 py-0.5 text-[10px] sm:text-[11px]'
                }`}
              >
                {toBengaliNumber(computedDiscountPercent)}% ছাড়
              </span>
            </div>
          )}

          {/* Top-Right Status Badge (Closed) or Yellow Lightning Bolt ⚡ */}
          <div
            className={`absolute z-20 pointer-events-none ${
              compactMobile ? 'top-1.5 right-1.5 sm:top-2.5 sm:right-2.5' : 'top-2.5 right-2.5'
            }`}
          >
            {isClosed ? (
              <span
                className={`inline-flex items-center rounded-full bg-amber-600/95 text-white font-black tracking-tight shadow-md border border-amber-300/60 ${
                  compactMobile
                    ? 'px-1.5 sm:px-2.5 py-[1px] sm:py-0.5 text-[8px] sm:text-[11px]'
                    : 'px-2.5 py-0.5 text-[10px] sm:text-[11px]'
                }`}
              >
                ভর্তি বন্ধ
              </span>
            ) : (
              <svg
                className={`${
                  compactMobile ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'
                } text-amber-400 drop-shadow-sm fill-amber-400`}
                viewBox="0 0 24 24"
              >
                <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" />
              </svg>
            )}
          </div>

          {/* Bottom Row Inside Banner - Dynamic Live Batch & Discount Badges */}
          {(bottomLeftBadge || discountBadge) && (
            <div
              className={`absolute z-20 flex items-center justify-between pointer-events-none ${
                compactMobile
                  ? 'bottom-1.5 sm:bottom-3 left-1.5 sm:left-3 right-1.5 sm:right-3 gap-1 sm:gap-1.5'
                  : 'bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 gap-1.5'
              }`}
            >
              {/* Left: Dynamic Live Batch pill with ⚡ icon (hidden if empty) */}
              {bottomLeftBadge ? (
                <div
                  className={`inline-flex items-center bg-black/85 backdrop-blur-md text-white font-bold rounded-full border border-white/20 shadow-sm truncate ${
                    compactMobile
                      ? 'gap-0.5 sm:gap-1 text-[8px] sm:text-[11px] px-1.5 sm:px-2.5 py-[1px] sm:py-0.5 max-w-[56%] sm:max-w-[60%]'
                      : 'gap-1 text-[10px] sm:text-[11px] px-2.5 py-0.5 max-w-[60%]'
                  }`}
                >
                  <span className={`text-amber-400 shrink-0 ${compactMobile ? 'text-[9px] sm:text-xs' : 'text-xs'}`}>
                    ⚡
                  </span>
                  <span className="truncate">{bottomLeftBadge}</span>
                </div>
              ) : (
                <span />
              )}

              {/* Right: Solid Green Pill Badge with Discount (hidden if no discount) */}
              {discountBadge && (
                <div
                  className={`bg-[#008744] text-white font-black rounded-full shadow-sm tracking-tight shrink-0 border border-emerald-400/30 ${
                    compactMobile
                      ? 'text-[8px] sm:text-[11px] px-1.5 sm:px-2.5 py-[1px] sm:py-0.5'
                      : 'text-[10px] sm:text-[11px] px-2.5 py-0.5'
                  }`}
                >
                  {discountBadge}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD BODY CONTENT: STRICTLY MATCHING UPLOADED FORMAT WITH SITE CONSISTENCY */}
        <div
          className={`${
            compactMobile
              ? 'px-2.5 pt-2 pb-2.5 sm:px-3.5 sm:pt-3 sm:pb-3.5 min-w-0'
              : 'px-3.5 pt-3 pb-3.5'
          } flex-1 flex flex-col`}
        >
          <div>
            {/* Course Title (2-line clamped) */}
            {headingLevel === 'h3' ? (
              <h3
                onClick={() => handleCardClick('card_title')}
                className={`font-bold text-[#2A0F12] line-clamp-2 hover:text-[#E22B2B] transition-colors cursor-pointer ${
                  compactMobile
                    ? 'text-[11.5px] sm:text-[15px] leading-[1.35] sm:leading-snug min-h-[2rem] sm:min-h-[2.45rem]'
                    : 'text-sm sm:text-[15px] leading-snug min-h-[2.45rem]'
                }`}
                title={course.title}
              >
                {course.title}
              </h3>
            ) : (
              <h4
                onClick={() => handleCardClick('card_title')}
                className={`font-bold text-[#2A0F12] line-clamp-2 hover:text-[#E22B2B] transition-colors cursor-pointer ${
                  compactMobile
                    ? 'text-[11.5px] sm:text-[15px] leading-[1.35] sm:leading-snug min-h-[2rem] sm:min-h-[2.45rem]'
                    : 'text-sm sm:text-[15px] leading-snug min-h-[2.45rem]'
                }`}
                title={course.title}
              >
                {course.title}
              </h4>
            )}

            {/* Structured "এই কোর্সে যা যা থাকছে" Feature List (Only shown when features exist) */}
            {(visibleFeatures.length > 0 || Boolean(course.fullDescription?.trim())) && (
              <div className={compactMobile ? 'mt-1.5 sm:mt-2' : 'mt-2'}>
                {visibleFeatures.length > 0 && (
                  <>
                    <div className={compactMobile ? 'mb-1 sm:mb-1.5' : 'mb-1.5'}>
                      <span
                        className={`inline-flex items-center rounded-full bg-gradient-to-r from-[#e22b2b] to-[#b91c1c] text-white font-bold tracking-tight leading-[1.2] shadow-[0_2px_8px_-2px_rgba(185,28,28,0.45)] max-w-full truncate ${
                          compactMobile
                            ? 'text-[9px] sm:text-[11px] px-2 sm:px-2.5 py-[2.5px] sm:py-[3.5px]'
                            : 'text-[10.5px] sm:text-[11px] px-2.5 py-[3.5px]'
                        }`}
                      >
                        এই কোর্সে যা যা থাকছে
                      </span>
                    </div>

                    <div className="relative">
                      <ul
                        className={
                          compactMobile
                            ? 'space-y-0.5 sm:space-y-1'
                            : 'space-y-1'
                        }
                      >
                        {visibleFeatures.map((feat, idx) => {
                          const isLastFaded =
                            visibleFeatures.length >= 2 && idx === visibleFeatures.length - 1;
                          return (
                            <li
                              key={`${feat.id}-${idx}`}
                              title={feat.title}
                              className={`flex items-start text-[#4A2C2F] ${
                                compactMobile ? 'gap-1.5 sm:gap-2' : 'gap-2'
                              } ${isLastFaded ? 'feature-last-fade select-none' : ''}`}
                            >
                              <span className="text-[#6B4C4F] shrink-0 mt-0.5">
                                <CourseFeatureIcon
                                  icon={feat.icon}
                                  className={
                                    compactMobile ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5'
                                  }
                                />
                              </span>
                              <span
                                className={`bn-digits-fix font-medium line-clamp-1 ${
                                  compactMobile
                                    ? 'text-[10px] sm:text-[11.5px] leading-snug'
                                    : 'text-[11.5px] leading-snug'
                                }`}
                              >
                                {feat.title}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                )}

                {/* Compact Borderless See More / See Less Toggle blended with smooth feathered white mist */}
                <div
                  className={`relative z-10 flex items-center justify-center ${
                    visibleFeatures.length > 0 ? '-mt-0.5' : 'mt-1'
                  }`}
                >
                  {visibleFeatures.length >= 2 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-x-2 -top-4 -bottom-1.5 see-more-soft-glow"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen((prev) => !prev)}
                    aria-expanded={isDetailsOpen}
                    className={`relative z-10 group/see inline-flex items-center justify-center gap-1 rounded-full bg-transparent hover:bg-white/60 font-bold text-[#b91c1c] hover:text-[#eb1c24] transition-all duration-200 cursor-pointer whitespace-nowrap leading-none ${
                      compactMobile
                        ? 'text-[10px] sm:text-xs py-0.5 px-2'
                        : 'text-xs py-0.5 px-2.5'
                    }`}
                  >
                    <span>{isDetailsOpen ? 'See Less' : 'See More'}</span>
                    {isDetailsOpen ? (
                      <ChevronUp
                        className={
                          compactMobile ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0' : 'w-3.5 h-3.5 shrink-0'
                        }
                      />
                    ) : (
                      <ChevronDown
                        className={`${
                          compactMobile ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5'
                        } shrink-0 transition-transform duration-200 group-hover/see:translate-y-0.5`}
                      />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto">

            {/* Price Row: Discounted Price + Strikethrough Original + Green Outlined Badge */}
            <div
              className={`flex items-center justify-between flex-nowrap border-t border-white/75 tabular-nums ${
                compactMobile
                  ? 'gap-1 sm:gap-2 mt-1 pt-1.5 pb-1.5 sm:pt-1.5 sm:pb-2'
                  : 'gap-2 mt-1 pt-1.5 pb-2'
              }`}
            >
              <div
                className={`flex items-baseline min-w-0 ${
                  compactMobile ? 'gap-0.5 min-[390px]:gap-1 sm:gap-2' : 'gap-2'
                }`}
              >
                <span
                  className={`font-black text-[#007a3d] whitespace-nowrap leading-none sm:leading-normal shrink-0 ${
                    compactMobile
                      ? 'text-[11.5px] min-[390px]:text-[12.5px] sm:text-2xl tracking-tighter sm:tracking-tight'
                      : 'text-xl sm:text-2xl tracking-tight'
                  }`}
                >
                  {course.discountPrice === 0 ? 'ফ্রি' : `৳${toBengaliNumber(course.discountPrice)}`}
                </span>
                {course.originalPrice > course.discountPrice && (
                  <span
                    className={`text-[#7A5A5D] line-through font-normal whitespace-nowrap leading-none sm:leading-normal ${
                      compactMobile
                        ? 'text-[8.5px] min-[390px]:text-[9px] sm:text-xs tracking-tighter sm:tracking-normal'
                        : 'text-xs'
                    }`}
                  >
                    ৳{toBengaliNumber(course.originalPrice)}
                  </span>
                )}
              </div>

              {savingsAmount > 0 && (
                <span
                  className={`ml-auto shrink-0 border border-emerald-500/80 text-[#007a3d] bg-emerald-50/90 font-bold rounded-full whitespace-nowrap shadow-2xs ${
                    compactMobile
                      ? 'text-[7.5px] min-[390px]:text-[8px] sm:text-xs leading-tight sm:leading-normal px-1 min-[390px]:px-1.5 sm:px-2.5 py-[1px] sm:py-0.5'
                      : 'text-[11px] sm:text-xs px-2.5 py-0.5'
                  }`}
                >
                  ৳{toBengaliNumber(savingsAmount)} ছাড়
                </span>
              )}
            </div>

            {/* Full-Width Action Button matching format */}
            {isClosed ? (
              <button
                type="button"
                disabled
                className={`w-full bg-slate-100 text-slate-500 border border-slate-200/90 font-bold flex items-center justify-center cursor-not-allowed select-none shadow-2xs ${
                  compactMobile
                    ? 'text-[10.5px] sm:text-sm py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 whitespace-nowrap'
                    : 'text-xs sm:text-sm py-2.5 px-4 rounded-xl gap-1.5'
                }`}
              >
                <span>ভর্তি বন্ধ রয়েছে</span>
                <X className={`${compactMobile ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'} text-rose-500 shrink-0`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleCardClick('card_button')}
                className={`group/btn relative overflow-hidden w-full bg-gradient-to-r from-[#ff5252] via-[#e22b2b] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white font-bold flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(226,43,43,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_12px_24px_-8px_rgba(185,28,28,0.75)] active:scale-[0.98] transition-all duration-300 cursor-pointer ${
                  compactMobile
                    ? 'text-[10.5px] sm:text-sm py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-lg sm:rounded-xl gap-1 sm:gap-2 whitespace-nowrap'
                    : 'text-xs sm:text-sm py-2.5 px-4 rounded-xl gap-2'
                }`}
              >
                <span className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-[-25deg] -translate-x-full group-hover/btn:translate-x-[350%] transition-transform duration-700 ease-out pointer-events-none" />
                <span className="relative z-10 font-bold tracking-tight">
                  কোর্সটিতে ভর্তি হোন
                </span>
                <ArrowRight
                  className={`${
                    compactMobile ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'
                  } transition-transform duration-300 group-hover/btn:translate-x-1 relative z-10 shrink-0`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Portaled Full Course Details & Discount WhatsApp Modal */}
        <CourseDetailsModal
          course={course}
          features={activeFeatures}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onEnrollClick={onEnrollClick}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
        />
      </div>
  );
};
