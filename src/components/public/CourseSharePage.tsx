'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Copy,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import type { Category, Course, SiteSettings } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { buildAffiliateRedirectUrl } from '../../lib/affiliateUrl.ts';
import {
  computeDiscountPercent,
  formatCourseDurationDisplay,
  formatCourseRatingDisplay,
  formatCourseStudentCountDisplay,
} from '../../lib/courseValidation.ts';
import {
  buildWhatsAppCourseInquiryUrl,
  getCourseFeatureItems,
} from '../../lib/courseFeatures.ts';
import { CourseFeatureIcon } from './CourseFeatureIcon.tsx';
import { CourseCard } from './CourseCard.tsx';
import { useSiteContact } from './SiteContactContext.tsx';

interface CourseSharePageProps {
  slug: string;
  course?: Course | null;
  categories: Category[];
  allCourses: Course[];
  settings?: SiteSettings | null;
  isLoading?: boolean;
  onNavigate: (path: string) => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  onRecordOutboundClick: (course: Pick<Course, 'id' | 'slug'>, referrer?: string) => void;
}

function getBannerStyle(theme: string) {
  switch (theme) {
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
}

async function copyShareUrlToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for iframe / restricted browsers
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const CourseSharePage: React.FC<CourseSharePageProps> = ({
  slug,
  course,
  categories,
  allCourses,
  settings,
  isLoading = false,
  onNavigate,
  onEnrollClick,
  onRecordOutboundClick,
}) => {
  const siteContact = useSiteContact();
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  if (isLoading && !course) {
    return (
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="h-5 w-48 rounded-full glass-surface animate-pulse" />
        <div className="glass-strong rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 aspect-video rounded-2xl bg-rose-100/70 animate-pulse" />
          <div className="lg:col-span-7 space-y-4">
            <div className="h-6 w-32 rounded-full bg-rose-100/70 animate-pulse" />
            <div className="h-9 w-3/4 rounded-xl bg-rose-100/70 animate-pulse" />
            <div className="h-24 w-full rounded-2xl bg-rose-100/60 animate-pulse" />
            <div className="h-12 w-56 rounded-xl bg-rose-200/70 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-[780px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="glass-strong rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-[#b91c1c] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12]">
            কোর্সটি খুঁজে পাওয়া যায়নি
          </h1>
          <p className="text-xs sm:text-sm text-[#6B4C4F] max-w-md mx-auto leading-relaxed">
            আপনার শেয়ার করা কোর্স লিংকটি (<span className="font-mono text-[#b91c1c] break-all">{slug}</span>) বর্তমানে পাওয়া যাচ্ছে না অথবা কোর্সটি সাময়িকভাবে বন্ধ রয়েছে।
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>সকল কোর্স দেখুন</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const matchedCategory = categories.find((c) => c.slug === course.categorySlug);
  const categoryLabel = matchedCategory?.name || course.categorySlug;

  const displayImageUrl = course.imageUrl
    ? course.imageUrl.replace(/\?(w=\d+.*)/i, '').trim()
    : null;
  const hasValidImage = Boolean(
    displayImageUrl && failedImageUrl !== displayImageUrl && displayImageUrl.length > 0
  );
  const isSquareHint =
    course.imageFit === 'square' ||
    Boolean(displayImageUrl && /[-_]sqr(?:[-_.?]|$)/i.test(displayImageUrl));
  const isNonWidescreen =
    imageRatio !== null ? Math.abs(imageRatio - 16 / 9) > 0.14 : isSquareHint;

  const banner = getBannerStyle(course.gradientTheme);
  const savingsAmount = Math.max(0, course.originalPrice - course.discountPrice);
  const computedDiscountPercent = computeDiscountPercent(
    course.originalPrice,
    course.discountPrice
  );
  const isClosed = course.status !== 'active';

  const activeFeatures = getCourseFeatureItems(course, { includeInactive: false });
  const overviewText =
    (course.fullDescription && course.fullDescription.trim()) ||
    (course.description && course.description.trim()) ||
    '';

  const formattedDuration = formatCourseDurationDisplay(course.duration);
  const formattedStudentCount = formatCourseStudentCountDisplay(course.studentCount);
  const formattedRating = formatCourseRatingDisplay(course.rating);
  const hasAnyCourseMeta = Boolean(
    formattedDuration || formattedStudentCount || formattedRating
  );

  const checkoutUrl = course.affiliateUrl
    ? buildAffiliateRedirectUrl(course.affiliateUrl, settings?.defaultAffiliateRef)
    : `/go/${encodeURIComponent(course.slug)}`;

  const whatsappHref = buildWhatsAppCourseInquiryUrl(
    siteContact.whatsappLink,
    siteContact.whatsappNumber,
    course.title
  );

  const relatedCourses = allCourses
    .filter(
      (c) =>
        c.id !== course.id &&
        c.categorySlug === course.categorySlug &&
        c.status === 'active'
    )
    .slice(0, 4);

  const handleCopyCurrentLink = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/courses/${encodeURIComponent(course.slug)}`;
    const ok = await copyShareUrlToClipboard(shareUrl);
    if (ok) {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#6B4C4F] font-medium"
      >
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#E22B2B] transition-colors cursor-pointer"
        >
          হোম
        </button>
        <span className="text-rose-300" aria-hidden="true">/</span>
        {matchedCategory ? (
          <>
            <button
              type="button"
              onClick={() => onNavigate(`/category/${matchedCategory.slug}`)}
              className="hover:text-[#E22B2B] transition-colors cursor-pointer"
            >
              {matchedCategory.name}
            </button>
            <span className="text-rose-300" aria-hidden="true">/</span>
          </>
        ) : null}
        <span className="text-[#B91C1C] font-bold line-clamp-1">{course.title}</span>
      </nav>

      {/* Main Course Hero Card */}
      <section className="glass-strong rounded-3xl p-4 sm:p-7 lg:p-8 shadow-[0_20px_50px_-16px_rgba(42,15,18,0.16)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Course Thumbnail / Visual Banner */}
          <div className="lg:col-span-5 space-y-3">
            <div
              className={`relative w-full aspect-video rounded-2xl overflow-hidden border border-rose-100 shadow-sm ${
                hasValidImage ? 'bg-white' : `${banner.bg} p-4 flex flex-col justify-center`
              }`}
            >
              {hasValidImage ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white">
                  {isNonWidescreen && (
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
                    referrerPolicy="no-referrer"
                    onLoad={(e) => {
                      const { naturalWidth, naturalHeight } = e.currentTarget;
                      if (naturalWidth > 0 && naturalHeight > 0) {
                        setImageRatio(naturalWidth / naturalHeight);
                      }
                    }}
                    onError={() => setFailedImageUrl(displayImageUrl)}
                    className="relative z-10 w-full h-full object-contain object-center block"
                  />
                </div>
              ) : (
                <div className="relative z-10 text-center space-y-2 px-3">
                  <span className="inline-block bg-black/90 border border-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    {course.headerTitle || '10MS'}
                  </span>
                  <div
                    className={`inline-block bg-white ${banner.textColor} font-black text-xs sm:text-sm px-3.5 py-1 rounded-md shadow-sm`}
                  >
                    {course.shortBadge || course.headerSubtitle || 'অনলাইন কোর্স'}
                  </div>
                </div>
              )}

              {computedDiscountPercent > 0 && (
                <div className="absolute top-2.5 left-2.5 z-20">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white text-[11px] font-black shadow-md tabular-nums">
                    {toBengaliNumber(computedDiscountPercent)}% ছাড়
                  </span>
                </div>
              )}

              {isClosed && (
                <div className="absolute top-2.5 right-2.5 z-20">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-600/95 text-white text-[11px] font-black shadow-md">
                    ভর্তি বন্ধ
                  </span>
                </div>
              )}
            </div>

            {/* Trust note under banner */}
            <div className="hidden lg:flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white/80 border border-rose-100 text-[11px] font-semibold text-[#6B4C4F]">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>অফিশিয়াল ডিসকাউন্টেড এনরোলমেন্ট</span>
              </span>
              <span className="tabular-nums">১০০% নিরাপদ</span>
            </div>
          </div>

          {/* Course Title, Pricing & Buy CTA */}
          <div className="lg:col-span-7 space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigate(`/category/${course.categorySlug}`)}
                className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[#b91c1c] hover:bg-rose-100 text-[11px] font-bold transition cursor-pointer"
              >
                {categoryLabel}
              </button>
              {course.shortBadge && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2A0F12] text-white text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{course.shortBadge}</span>
                </span>
              )}
              {course.isPopular && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold">
                  ★ জনপ্রিয় কোর্স
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#2A0F12] leading-snug tracking-tight">
              {course.title}
            </h1>

            {course.description && (
              <p className="text-xs sm:text-sm text-[#4A2C2F] leading-relaxed">
                {course.description}
              </p>
            )}

            {/* Dynamic Meta Chips */}
            {hasAnyCourseMeta && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#4A2C2F] tabular-nums">
                {formattedDuration && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-rose-200/70 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" />
                    <span>মেয়াদ: {formattedDuration}</span>
                  </span>
                )}
                {formattedStudentCount && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-rose-200/70 shadow-2xs">
                    <Users className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" />
                    <span>{formattedStudentCount}</span>
                  </span>
                )}
                {formattedRating && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/95 border border-amber-200/80 text-amber-900 shadow-2xs">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                    <span>{formattedRating} রেটিং</span>
                  </span>
                )}
              </div>
            )}

            {/* Pricing Highlight Box */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50/95 via-white to-rose-50/70 border border-emerald-200/80 p-4 flex flex-wrap items-center justify-between gap-3 tabular-nums shadow-2xs">
              <div>
                <div className="text-[11px] font-bold text-[#6B4C4F]">
                  কোর্স ফি (ডিসকাউন্টেড অফার মূল্য)
                </div>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-[#007a3d]">
                    {course.discountPrice === 0
                      ? 'সম্পূর্ণ ফ্রি'
                      : `৳${toBengaliNumber(course.discountPrice)}`}
                  </span>
                  {course.originalPrice > course.discountPrice && (
                    <span className="text-sm text-[#7A5A5D] line-through font-medium">
                      ৳{toBengaliNumber(course.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              {savingsAmount > 0 && (
                <span className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-xs">
                  ৳{toBengaliNumber(savingsAmount)} সাশ্রয়
                </span>
              )}
            </div>

            {/* Primary Action Row: "কোর্সটি কিনুন" + Utility Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              {isClosed ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-slate-100 text-slate-500 border border-slate-200 text-sm sm:text-base font-bold cursor-not-allowed"
                >
                  <span>ভর্তি বন্ধ রয়েছে</span>
                  <X className="w-4 h-4 text-rose-500" />
                </button>
              ) : (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onRecordOutboundClick(course, 'course_share_page')}
                  className="group/buy relative overflow-hidden inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#ff5252] via-[#e22b2b] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white text-sm sm:text-base font-extrabold shadow-[0_12px_26px_-8px_rgba(226,43,43,0.65)] hover:shadow-[0_16px_30px_-8px_rgba(185,28,28,0.75)] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-[-25deg] -translate-x-full group-hover/buy:translate-x-[350%] transition-transform duration-700 ease-out pointer-events-none" />
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 shrink-0" />
                  <span className="relative z-10">কোর্সটি কিনুন</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 shrink-0 transition-transform group-hover/buy:translate-x-1" />
                </a>
              )}

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white text-xs sm:text-sm font-extrabold shadow-md transition whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp সহায়তা</span>
              </a>

              <button
                type="button"
                onClick={() => void handleCopyCurrentLink()}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl border text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                  linkCopied
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-white/95 text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#b91c1c]'
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>লিংক কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span>লিংক কপি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Course Features List */}
      {activeFeatures.length > 0 && (
        <section className="glass-surface rounded-3xl p-5 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center rounded-full bg-gradient-to-r from-[#e22b2b] to-[#b91c1c] text-white text-xs sm:text-sm font-bold px-3.5 py-1.5 shadow-sm">
              এই কোর্সে যা যা থাকছে
            </h2>
            <span className="text-xs font-bold text-[#6B4C4F] tabular-nums">
              মোট {toBengaliNumber(activeFeatures.length)}টি সুবিধা
            </span>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeFeatures.map((feat, idx) => (
              <li
                key={`${feat.id}-${idx}`}
                className="flex items-start gap-2.5 rounded-2xl bg-white/90 border border-rose-100/90 px-3.5 py-2.5 text-xs sm:text-[13px] text-[#2A0F12] font-medium leading-snug shadow-2xs"
              >
                <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-50 border border-rose-200/80 text-[#d92d2d] flex items-center justify-center shrink-0">
                  <CourseFeatureIcon icon={feat.icon} className="w-3 h-3" />
                </span>
                <span className="bn-digits-fix break-words">{feat.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Detailed Course Description */}
      {overviewText && (
        <section className="glass-surface rounded-3xl p-5 sm:p-7 space-y-2.5">
          <h2 className="text-base sm:text-lg font-black text-[#2A0F12]">
            কোর্স সম্পর্কে বিস্তারিত
          </h2>
          <p className="text-xs sm:text-sm text-[#3E2225] leading-relaxed whitespace-pre-line">
            {overviewText}
          </p>
        </section>
      )}

      {/* Related Courses in Same Category */}
      {relatedCourses.length > 0 && (
        <section className="glass-surface rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#2A0F12]">
                এই ক্যাটাগরির আরও কোর্স
              </h2>
              <p className="text-xs text-[#6B4C4F] mt-0.5">
                {categoryLabel} ক্যাটাগরির অন্যান্য জনপ্রিয় কোর্সসমূহ
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(`/category/${course.categorySlug}`)}
              className="px-3.5 py-1.5 rounded-full glass-inset text-xs font-bold text-[#B91C1C] hover:bg-[#E22B2B] hover:text-white transition cursor-pointer shrink-0"
            >
              সব দেখুন
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {relatedCourses.map((relCourse) => (
              <div key={relCourse.id} className="h-full flex flex-col">
                <CourseCard course={relCourse} onEnrollClick={onEnrollClick} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
