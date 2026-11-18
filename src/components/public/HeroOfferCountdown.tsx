'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, ArrowRight, Sparkles } from 'lucide-react';
import type { Course, OfferTimer, SiteSettings } from '../../types.ts';
import { computeOfferTimerStatus, getCountdownParts } from '../../lib/offerTimerUtils.ts';
import { buildAffiliateRedirectUrl } from '../../lib/affiliateUrl.ts';
import { toBengaliNumber } from '../../utils/format.ts';

interface HeroOfferCountdownProps {
  settings: SiteSettings | null;
  offerTimers: OfferTimer[];
  hasOfferTimers: boolean;
  initialServerNow?: string;
  courses: Course[];
  coursesById: Map<number, Course>;
  onRecordOutboundClick: (course: Pick<Course, 'id' | 'slug'>, referrer: string) => void;
  onLegacyEnrollClick: (course: Course, referrer: string) => void;
}

export const HeroOfferCountdown: React.FC<HeroOfferCountdownProps> = ({
  settings,
  offerTimers,
  hasOfferTimers,
  initialServerNow,
  courses,
  coursesById,
  onRecordOutboundClick,
  onLegacyEnrollClick,
}) => {
  const shouldUseOfferTimers = hasOfferTimers || offerTimers.length > 0;

  const [nowMs, setNowMs] = useState<number>(() => {
    if (initialServerNow) {
      const parsed = new Date(initialServerNow).getTime();
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  });
  const serverOffsetRef = useRef<number>(0);

  const [countdown, setCountdown] = useState({ d: '02', h: '08', m: '26', s: '55' });

  useEffect(() => {
    if (settings?.showCountdownTimer === false || !shouldUseOfferTimers) {
      return;
    }
    if (initialServerNow) {
      const parsed = new Date(initialServerNow).getTime();
      if (Number.isFinite(parsed)) {
        serverOffsetRef.current = parsed - Date.now();
      }
    }
    const tick = () => {
      setNowMs(Date.now() + serverOffsetRef.current);
    };
    const initTimer = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [initialServerNow, settings?.showCountdownTimer, shouldUseOfferTimers]);

  useEffect(() => {
    if (settings?.showCountdownTimer === false || shouldUseOfferTimers) {
      return;
    }

    let targetTime: number;
    if (settings?.countdownTargetDate) {
      const parsed = new Date(settings.countdownTargetDate).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) {
        targetTime = parsed;
      } else {
        const target = new Date();
        target.setHours(target.getHours() + 56, target.getMinutes() + 42, target.getSeconds() + 15, 0);
        targetTime = target.getTime();
      }
    } else {
      const target = new Date();
      target.setHours(target.getHours() + 56, target.getMinutes() + 42, target.getSeconds() + 15, 0);
      targetTime = target.getTime();
    }

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({
        d: String(d).padStart(2, '0'),
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [settings?.countdownTargetDate, settings?.showCountdownTimer, shouldUseOfferTimers]);

  const activeOfferTimers = useMemo(() => {
    if (!nowMs || offerTimers.length === 0) return [];
    return offerTimers.filter(
      (timer) => computeOfferTimerStatus(timer, nowMs) === 'active'
    );
  }, [offerTimers, nowMs]);

  if (settings?.showCountdownTimer === false) {
    return null;
  }

  if (shouldUseOfferTimers) {
    if (activeOfferTimers.length === 0) {
      return null;
    }

    return (
      <div
        className={`mb-4 sm:mb-6 mx-auto ${
          activeOfferTimers.length === 1
            ? 'max-w-4xl'
            : 'grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl'
        }`}
      >
        {activeOfferTimers.map((timer) => {
          const linkedCourse = coursesById.get(timer.courseId);
          const rawAffiliate =
            linkedCourse?.affiliateUrl || timer.affiliateUrl;
          const targetAffiliateUrl = rawAffiliate
            ? buildAffiliateRedirectUrl(
                rawAffiliate,
                settings?.defaultAffiliateRef
              )
            : `/go/${timer.courseSlug}`;
          const parts = getCountdownParts(timer.endAt, nowMs);
          const courseTitle =
            linkedCourse?.title || timer.courseTitle;
          const courseImage =
            linkedCourse?.imageUrl || timer.courseImageUrl;
          const discountBadge = linkedCourse?.discountBadgeText;
          const discountPrice = linkedCourse?.discountPrice;

          const defaultAutoLabel = `${courseTitle} — স্পেশাল অফার`;
          const displayOfferLabel =
            timer.offerLabel &&
            timer.offerLabel.trim() !== defaultAutoLabel
              ? timer.offerLabel.trim()
              : 'সীমিত সময়ের স্পেশাল অফার!';

          return (
            <a
              key={timer.id}
              href={targetAffiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                onRecordOutboundClick(
                  {
                    id: timer.courseId,
                    slug: linkedCourse?.slug || timer.courseSlug,
                  },
                  'offer_countdown_timer'
                )
              }
              aria-label={`${courseTitle} অফারে ভর্তি হতে ক্লিক করুন`}
              className="group glass-surface hover:bg-white/85 border border-rose-200/80 hover:border-[#eb1c24]/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 w-full max-w-full overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 sm:gap-4 text-left shadow-[0_12px_32px_-10px_rgba(226,43,43,0.18)] hover:shadow-[0_18px_40px_-10px_rgba(226,43,43,0.3)] transition-all duration-200 cursor-pointer tabular-nums"
            >
              {/* Left: Course Image + Course Name & Offer Info */}
              <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0 w-full flex-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#ff5252] to-[#991b1b] shrink-0 overflow-hidden border border-white/90 shadow-md flex items-center justify-center">
                  {courseImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={courseImage}
                      alt={courseTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <AlarmClock className="w-7 h-7 text-white animate-pulse" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start gap-1.5 w-full min-w-0 text-[11px] font-extrabold text-[#B91C1C]">
                    <AlarmClock
                      className="w-3.5 h-3.5 text-[#E22B2B] animate-pulse shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 break-words line-clamp-2 leading-snug">
                      {displayOfferLabel}
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-black text-[#2A0F12] group-hover:text-[#b91c1c] transition-colors break-words line-clamp-2 leading-snug">
                    {courseTitle}
                  </div>

                  {(typeof discountPrice === 'number' ||
                    discountBadge) && (
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] font-bold pt-0.5">
                      {typeof discountPrice === 'number' &&
                        discountPrice > 0 && (
                          <span className="text-emerald-700 font-mono">
                            অফার মূল্য: ৳
                            {toBengaliNumber(discountPrice)}
                          </span>
                        )}
                      {discountBadge && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100/90 text-[#b91c1c] border border-rose-200 text-[10px] max-w-full">
                          <Sparkles className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{discountBadge}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Real-time Countdown + Clickable CTA */}
              <div className="flex flex-col sm:items-end gap-2.5 shrink-0 w-full sm:w-auto items-center">
                <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto max-w-full">
                  <div className="glass-inset rounded-xl px-2 sm:px-2.5 py-1 text-center min-w-[44px] sm:min-w-[50px]">
                    <b className="text-sm sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
                      {parts.d}
                    </b>
                    <span className="text-[10px] text-[#6B4C4F]">
                      দিন
                    </span>
                  </div>
                  <span className="text-[#E22B2B] font-bold">:</span>
                  <div className="glass-inset rounded-xl px-2 sm:px-2.5 py-1 text-center min-w-[44px] sm:min-w-[50px]">
                    <b className="text-sm sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
                      {parts.h}
                    </b>
                    <span className="text-[10px] text-[#6B4C4F]">
                      ঘণ্টা
                    </span>
                  </div>
                  <span className="text-[#E22B2B] font-bold">:</span>
                  <div className="glass-inset rounded-xl px-2 sm:px-2.5 py-1 text-center min-w-[44px] sm:min-w-[50px]">
                    <b className="text-sm sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
                      {parts.m}
                    </b>
                    <span className="text-[10px] text-[#6B4C4F]">
                      মিনিট
                    </span>
                  </div>
                  <span className="text-[#E22B2B] font-bold">:</span>
                  <div className="glass-inset rounded-xl px-2 sm:px-2.5 py-1 text-center min-w-[44px] sm:min-w-[50px]">
                    <b className="text-sm sm:text-lg text-[#E22B2B] block leading-none font-bold font-mono">
                      {parts.s}
                    </b>
                    <span className="text-[10px] text-[#6B4C4F]">
                      সেকেন্ড
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] group-hover:from-[#eb1c24] group-hover:to-[#991b1b] text-white text-xs font-extrabold shadow-[0_6px_16px_-4px_rgba(226,43,43,0.45)] transition-all">
                  <span>অফারটি নিন ও ভর্তি হোন</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (
          settings?.countdownTargetCourse &&
          settings.countdownTargetCourse !== 'all'
        ) {
          const match = courses.find(
            (c) => c.slug === settings.countdownTargetCourse
          );
          if (match) {
            onLegacyEnrollClick(match, 'legacy_offer_countdown');
          }
        }
      }}
      className={`inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 glass-surface px-5 py-3 rounded-2xl mb-2 sm:mb-4 tabular-nums ${
        settings?.countdownTargetCourse &&
        settings.countdownTargetCourse !== 'all'
          ? 'cursor-pointer hover:bg-white/80 transition-colors'
          : ''
      }`}
      title={
        settings?.countdownTargetCourse &&
        settings.countdownTargetCourse !== 'all'
          ? 'এই কোর্সের অফারে যেতে ক্লিক করুন'
          : undefined
      }
    >
      <div className="flex items-center gap-2 text-[#B91C1C] text-xs sm:text-sm font-bold">
        <AlarmClock
          className="w-5 h-5 text-[#E22B2B] animate-pulse shrink-0"
          aria-hidden="true"
        />
        <span>
          {settings?.countdownLabel ||
            'HSC ২৮ আর্লি বার্ড স্পেশাল উপহার সহ ছাড়ে বাকি:'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
          <b className="text-base sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
            {countdown.d}
          </b>
          <span className="text-[10px] text-[#6B4C4F]">দিন</span>
        </div>
        <span className="text-[#E22B2B] font-bold">:</span>
        <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
          <b className="text-base sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
            {countdown.h}
          </b>
          <span className="text-[10px] text-[#6B4C4F]">ঘণ্টা</span>
        </div>
        <span className="text-[#E22B2B] font-bold">:</span>
        <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
          <b className="text-base sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
            {countdown.m}
          </b>
          <span className="text-[10px] text-[#6B4C4F]">মিনিট</span>
        </div>
        <span className="text-[#E22B2B] font-bold">:</span>
        <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
          <b className="text-base sm:text-lg text-[#E22B2B] block leading-none font-bold font-mono">
            {countdown.s}
          </b>
          <span className="text-[10px] text-[#6B4C4F]">সেকেন্ড</span>
        </div>
      </div>
    </div>
  );
};
