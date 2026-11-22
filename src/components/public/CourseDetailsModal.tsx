'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  ChevronUp,
  Clock,
  MessageCircle,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import type { Course, CourseFeatureItem } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  computeDiscountPercent,
  formatCourseDurationDisplay,
  formatCourseRatingDisplay,
  formatCourseStudentCountDisplay,
} from '../../lib/courseValidation.ts';
import { buildWhatsAppCourseInquiryUrl } from '../../lib/courseFeatures.ts';
import { CourseFeatureIcon } from './CourseFeatureIcon.tsx';
import { useSiteContact } from './SiteContactContext.tsx';

interface CourseDetailsModalProps {
  course: Course;
  features: CourseFeatureItem[];
  isOpen: boolean;
  onClose: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  whatsappNumber?: string;
  whatsappLink?: string;
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  course,
  features,
  isOpen,
  onClose,
  onEnrollClick,
  whatsappNumber: whatsappNumberProp,
  whatsappLink: whatsappLinkProp,
}) => {
  const siteContact = useSiteContact();
  const effectiveWhatsappNumber = whatsappNumberProp ?? siteContact.whatsappNumber;
  const effectiveWhatsappLink = whatsappLinkProp ?? siteContact.whatsappLink;

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const savingsAmount = Math.max(0, course.originalPrice - course.discountPrice);
  const computedDiscountPercent = computeDiscountPercent(
    course.originalPrice,
    course.discountPrice
  );
  const isClosed = course.status === 'closed' || course.status === 'inactive';

  const displayImageUrl = course.imageUrl
    ? course.imageUrl.replace(/\?(w=\d+.*)/i, '').trim()
    : null;

  const whatsappHref = buildWhatsAppCourseInquiryUrl(
    effectiveWhatsappLink,
    effectiveWhatsappNumber,
    course.title
  );

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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1c090b]/65 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`course-modal-title-${course.id}`}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_24px_64px_-12px_rgba(42,15,18,0.45)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Modal Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-50/85 via-white to-rose-50/60 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {course.shortBadge && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2A0F12] text-white text-[10px] font-bold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{course.shortBadge}</span>
                </span>
              )}
              {computedDiscountPercent > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#f97316] text-white text-[10px] font-extrabold tabular-nums">
                  {toBengaliNumber(computedDiscountPercent)}% ছাড়
                </span>
              )}
              {isClosed && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold">
                  ভর্তি বন্ধ রয়েছে
                </span>
              )}
            </div>

            <h3
              id={`course-modal-title-${course.id}`}
              className="text-base sm:text-xl font-black text-[#2A0F12] leading-snug"
            >
              {course.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="বিস্তারিত বন্ধ করুন"
            className="p-2 rounded-full bg-white border border-rose-200/80 text-[#6B4C4F] hover:text-[#b91c1c] hover:bg-rose-50 transition cursor-pointer shrink-0 shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 sm:py-4 space-y-3.5 sm:space-y-4">
          {/* Thumbnail & Quick Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            {displayImageUrl && (
              <div className="sm:col-span-5 rounded-2xl overflow-hidden border border-rose-100 bg-white aspect-video shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImageUrl}
                  alt={course.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain object-center"
                />
              </div>
            )}

            <div className={`${displayImageUrl ? 'sm:col-span-7' : 'sm:col-span-12'} space-y-2.5`}>
              {/* Pricing Summary Box */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50/90 via-white to-rose-50/60 border border-emerald-200/70 p-3 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                <div>
                  <div className="text-[11px] font-bold text-[#6B4C4F]">
                    কোর্স ফি (অফার মূল্য)
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-[#007a3d]">
                      {course.discountPrice === 0
                        ? 'সম্পূর্ণ ফ্রি'
                        : `৳${toBengaliNumber(course.discountPrice)}`}
                    </span>
                    {course.originalPrice > course.discountPrice && (
                      <span className="text-xs text-[#7A5A5D] line-through">
                        ৳{toBengaliNumber(course.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {savingsAmount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-2xs">
                    ৳{toBengaliNumber(savingsAmount)} সাশ্রয়
                  </span>
                )}
              </div>

              {/* Dynamic Meta Pills — Only render populated fields, zero fake placeholders */}
              {hasAnyCourseMeta && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#4A2C2F] tabular-nums">
                  {formattedDuration && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50/85 border border-rose-200/70">
                      <Clock className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" />
                      <span>মেয়াদ: {formattedDuration}</span>
                    </span>
                  )}
                  {formattedStudentCount && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50/85 border border-rose-200/70">
                      <Users className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" />
                      <span>{formattedStudentCount}</span>
                    </span>
                  )}
                  {formattedRating && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50/90 border border-amber-200/80 text-amber-900">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                      <span>{formattedRating} রেটিং</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Discount Message & WhatsApp Direct Support Box */}
          <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/75 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-sm font-black text-[#065f46] flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#16a34a] shrink-0" />
                <span>ডিসকাউন্ট পেতে মেসেজ করো</span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#3E2225]">
                কোর্স ফি বা স্পেশাল প্রোমো/ডিসকাউন্ট সংক্রান্ত যেকোনো তথ্যের জন্য সরাসরি WhatsApp-এ মেসেজ করুন।
              </p>
            </div>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition shrink-0 whitespace-nowrap"
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

          {/* Complete "এই কোর্সে যা যা থাকছে" Compact Feature List */}
          {features.length > 0 && (
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/35 p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="inline-flex items-center rounded-full bg-gradient-to-r from-[#e22b2b] to-[#b91c1c] text-white text-[11px] font-bold tracking-tight leading-[1.2] px-2.5 py-[3.5px] shadow-[0_2px_8px_-2px_rgba(185,28,28,0.45)]">
                  এই কোর্সে যা যা থাকছে
                </h4>
                <span className="text-[11px] font-bold text-[#6B4C4F] tabular-nums">
                  মোট {toBengaliNumber(features.length)}টি সুবিধা
                </span>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {features.map((feat, idx) => (
                  <li
                    key={`${feat.id}-${idx}`}
                    className="flex items-start gap-2 rounded-lg bg-white/90 border border-rose-100/80 px-2.5 py-1.5 text-[11.5px] sm:text-xs text-[#2A0F12] font-medium leading-[1.35] shadow-2xs"
                  >
                    <span className="mt-[1px] w-4 h-4 rounded-full bg-rose-50 border border-rose-200/70 text-[#d92d2d] flex items-center justify-center shrink-0">
                      <CourseFeatureIcon icon={feat.icon} className="w-2.5 h-2.5" />
                    </span>
                    <span className="bn-digits-fix break-words">{feat.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Course Overview / Details */}
          {overviewText && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 space-y-1">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#6B4C4F]">
                কোর্স সম্পর্কে বিস্তারিত
              </h4>
              <p className="text-xs sm:text-[13px] text-[#3E2225] leading-relaxed whitespace-pre-line">
                {overviewText}
              </p>
            </div>
          )}
        </div>

        {/* Sticky Bottom CTA Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-rose-100 bg-white/95 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-[#4A2C2F] text-xs font-bold transition cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
            <span>See Less · সংক্ষিপ্ত করুন</span>
          </button>

          {isClosed ? (
            <button
              type="button"
              disabled
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs sm:text-sm font-bold cursor-not-allowed"
            >
              <span>ভর্তি বন্ধ রয়েছে</span>
              <X className="w-4 h-4 text-rose-500" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onEnrollClick(course, 'details_modal_button')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] via-[#e22b2b] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white text-xs sm:text-sm font-extrabold shadow-[0_8px_20px_-6px_rgba(226,43,43,0.6)] transition cursor-pointer"
            >
              <span>কোর্সে ভর্তি হোন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
