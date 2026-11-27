'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight, Landmark, Terminal } from 'lucide-react';
import { NAVBAR_GROUP_PATHS } from '../../lib/navbarCategories.ts';

interface PathwaysSectionProps {
  onNavigate: (path: string) => void;
}

export const PathwaysSection: React.FC<PathwaysSectionProps> = ({ onNavigate }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (maxScroll <= 2) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setActiveSlide(0);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
    setActiveSlide(el.scrollLeft > maxScroll * 0.45 ? 1 : 0);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      updateScrollState();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollState]);

  const handleSlide = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({
      left: direction > 0 ? maxScroll : 0,
      behavior: 'smooth',
    });
  };

  const handleJumpSlide = (index: 0 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({
      left: index === 0 ? 0 : maxScroll,
      behavior: 'smooth',
    });
  };

  const handleCardNavigation = (path: string) => {
    if (typeof window !== 'undefined' && window.getSelection()?.toString()) {
      return;
    }
    onNavigate(path);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <section className="py-6 md:py-10" id="pathways" aria-label="প্রধান লার্নিং পাথওয়ে">
      <h2 className="sr-only">একাডেমিক, স্কিলস ও এডমিশন প্রোগ্রাম</h2>
      <div className="wrap">
        <div className="relative">
          {/* Mobile Left Navigation Arrow */}
          <button
            type="button"
            onClick={() => handleSlide(-1)}
            disabled={!canScrollLeft}
            aria-label="আগের ক্যাটাগরি দেখুন"
            className={`md:hidden absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 backdrop-blur-md border border-rose-200/90 text-[#B91C1C] shadow-[0_4px_14px_rgba(185,28,28,0.22)] flex items-center justify-center transition-all duration-200 ${
              canScrollLeft
                ? 'opacity-100 hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24] active:scale-90 cursor-pointer'
                : 'opacity-40 cursor-default'
            }`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Side-by-side 2-up swipeable rail on mobile, 3-column grid on desktop */}
          <div
            ref={trackRef}
            onScroll={updateScrollState}
            className="flex gap-2.5 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar items-stretch pb-1 md:pb-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible"
          >
            {/* Academic Pathway */}
            <div
              role="link"
              tabIndex={0}
              aria-label="একাডেমিক পূর্ণাঙ্গ প্রস্তুতি — অনলাইন ব্যাচ সমূহ দেখুন"
              onClick={() => handleCardNavigation('/online-batch')}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onNavigate('/online-batch');
                }
              }}
              className="w-[calc((100%-10px)/2)] sm:w-[calc((100%-16px)/2)] shrink-0 snap-start md:w-auto md:shrink glass-card rounded-[18px] sm:rounded-[22px] md:rounded-[24px] overflow-hidden flex flex-col min-w-0 cursor-pointer group select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/60"
            >
              <div className="min-h-[76px] sm:min-h-[96px] md:h-28 bg-gradient-to-br from-[#ff5252]/95 via-[#e22b2b]/95 to-[#991b1b]/95 p-3 sm:p-4 md:p-5 flex items-start md:items-center justify-between gap-1.5 sm:gap-2.5 text-white">
                <div className="min-w-0">
                  <span className="text-[9.5px] min-[390px]:text-[10px] sm:text-[11px] font-bold tracking-wide md:tracking-wider text-rose-100 block leading-tight truncate">
                    স্কুল ও কলেজ
                  </span>
                  <h3 className="text-[13px] min-[390px]:text-[13.5px] sm:text-base md:text-lg font-extrabold text-white mt-0.5 leading-[1.24] md:leading-snug">
                    একাডেমিক পূর্ণাঙ্গ প্রস্তুতি
                  </h3>
                </div>
                <BookOpen
                  className="w-5 h-5 min-[390px]:w-6 min-[390px]:h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white/85 shrink-0 mt-0.5 md:mt-0 transition-transform duration-200 group-hover:scale-105"
                  aria-hidden="true"
                />
              </div>
              <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between gap-2.5 md:gap-0">
                <div>
                  <p className="text-[10.5px] min-[390px]:text-[11px] sm:text-xs text-[#6B4C4F] leading-[1.45] md:leading-relaxed mb-2 sm:mb-3 md:mb-4 line-clamp-3 md:line-clamp-none">
                    এক্সপার্ট টিচারদের রেগুলার লাইভ ক্লাস, মাস্টারবুক, মডেল টেস্ট ও ডেইলি ডাউট সলভিং নিয়ে সারা বছর A+ অর্জনের পারফেক্ট প্ল্যান।
                  </p>
                  <div className="text-[9.5px] min-[390px]:text-[10.5px] sm:text-xs text-[#5A3E41] font-semibold leading-[1.35] md:leading-normal mb-0.5 md:mb-4 line-clamp-2 md:line-clamp-none">
                    HSC ২০২৮ · HSC ২০২৭ · ১০ম শ্রেণি · ৬ষ্ঠ–৯ম শ্রেণি
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('/online-batch');
                  }}
                  className="w-full text-center py-2 sm:py-2.5 px-1.5 min-[380px]:px-2.5 md:px-4 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white text-[9.5px] min-[380px]:text-[10.5px] sm:text-xs md:text-sm font-bold whitespace-nowrap truncate shadow-[0_8px_20px_-8px_rgba(226,43,43,0.65)] transition cursor-pointer"
                >
                  অনলাইন ব্যাচ সমূহ দেখুন →
                </button>
              </div>
            </div>

            {/* Skills Pathway */}
            <div
              role="link"
              tabIndex={0}
              aria-label="দেশসেরা স্কিল প্ল্যাটফর্ম — সকল স্কিলস কোর্স দেখুন"
              onClick={() => handleCardNavigation('/skills')}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onNavigate('/skills');
                }
              }}
              className="w-[calc((100%-10px)/2)] sm:w-[calc((100%-16px)/2)] shrink-0 snap-start md:w-auto md:shrink glass-card rounded-[18px] sm:rounded-[22px] md:rounded-[24px] overflow-hidden flex flex-col min-w-0 cursor-pointer group select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/60"
            >
              <div className="min-h-[76px] sm:min-h-[96px] md:h-28 bg-gradient-to-br from-rose-600/95 via-[#b91c1c]/95 to-[#4c0519]/95 p-3 sm:p-4 md:p-5 flex items-start md:items-center justify-between gap-1.5 sm:gap-2.5 text-white">
                <div className="min-w-0">
                  <span className="text-[9.5px] min-[390px]:text-[10px] sm:text-[11px] font-bold tracking-wide md:tracking-wider text-rose-100 block leading-tight truncate">
                    ক্যারিয়ার ও ফ্রিল্যান্সিং
                  </span>
                  <h3 className="text-[13px] min-[390px]:text-[13.5px] sm:text-base md:text-lg font-extrabold text-white mt-0.5 leading-[1.24] md:leading-snug">
                    দেশসেরা স্কিল প্ল্যাটফর্ম
                  </h3>
                </div>
                <Terminal
                  className="w-5 h-5 min-[390px]:w-6 min-[390px]:h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white/85 shrink-0 mt-0.5 md:mt-0 transition-transform duration-200 group-hover:scale-105"
                  aria-hidden="true"
                />
              </div>
              <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between gap-2.5 md:gap-0">
                <div>
                  <p className="text-[10.5px] min-[390px]:text-[11px] sm:text-xs text-[#6B4C4F] leading-[1.45] md:leading-relaxed mb-2 sm:mb-3 md:mb-4 line-clamp-3 md:line-clamp-none">
                    দেশসেরা শিক্ষক, ৫ লাখ+ শিক্ষার্থী ও ৭০+ প্রফেশনাল অনলাইন কোর্স! স্পোকেন ইংলিশ, ফ্রিল্যান্সিং ও টেক স্কিলের পূর্ণাঙ্গ ভাণ্ডার।
                  </p>
                  <div className="text-[9.5px] min-[390px]:text-[10.5px] sm:text-xs text-[#5A3E41] font-semibold leading-[1.35] md:leading-normal mb-0.5 md:mb-4 line-clamp-2 md:line-clamp-none">
                    Spoken English · IELTS Complete · Web Dev · মার্কেটিং
                  </div>
                </div>
                <Link
                  className="w-full text-center py-2 sm:py-2.5 px-1.5 min-[380px]:px-2.5 md:px-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-[9.5px] min-[380px]:text-[10.5px] sm:text-xs md:text-sm font-bold whitespace-nowrap truncate shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55)] transition block"
                  href="/skills"
                  onClick={(e) => handleLinkClick(e, '/skills')}
                >
                  সকল স্কিলস কোর্স দেখুন →
                </Link>
              </div>
            </div>

            {/* Admission Pathway */}
            <div
              role="link"
              tabIndex={0}
              aria-label="ভার্সিটি + গুচ্ছ এডমিশন — এডমিশন কোর্সসমূহ দেখুন"
              onClick={() => handleCardNavigation(NAVBAR_GROUP_PATHS.admission)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onNavigate(NAVBAR_GROUP_PATHS.admission);
                }
              }}
              className="w-[calc((100%-10px)/2)] sm:w-[calc((100%-16px)/2)] shrink-0 snap-start md:w-auto md:shrink glass-card rounded-[18px] sm:rounded-[22px] md:rounded-[24px] overflow-hidden flex flex-col min-w-0 cursor-pointer group select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/60"
            >
              <div className="min-h-[76px] sm:min-h-[96px] md:h-28 bg-gradient-to-br from-[#be123c]/95 via-[#9f1239]/95 to-[#7f1d1d]/95 p-3 sm:p-4 md:p-5 flex items-start md:items-center justify-between gap-1.5 sm:gap-2.5 text-white">
                <div className="min-w-0">
                  <span className="text-[9.5px] min-[390px]:text-[10px] sm:text-[11px] font-bold tracking-wide md:tracking-wider text-rose-200 block leading-tight truncate">
                    স্বপ্নের বিশ্ববিদ্যালয়
                  </span>
                  <h3 className="text-[13px] min-[390px]:text-[13.5px] sm:text-base md:text-lg font-extrabold text-white mt-0.5 leading-[1.24] md:leading-snug">
                    ভার্সিটি + গুচ্ছ এডমিশন
                  </h3>
                </div>
                <Landmark
                  className="w-5 h-5 min-[390px]:w-6 min-[390px]:h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white/85 shrink-0 mt-0.5 md:mt-0 transition-transform duration-200 group-hover:scale-105"
                  aria-hidden="true"
                />
              </div>
              <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between gap-2.5 md:gap-0">
                <div>
                  <p className="text-[10.5px] min-[390px]:text-[11px] sm:text-xs text-[#6B4C4F] leading-[1.45] md:leading-relaxed mb-2 sm:mb-3 md:mb-4 line-clamp-3 md:line-clamp-none">
                    বুয়েট, মেডিকেল, ঢাবি ‘ক’, ‘খ’, ‘গ’ ইউনিট এবং গুচ্ছ ভর্তি পরীক্ষার সম্পূর্ণ প্রশ্নব্যাংক সমাধান ও দেশসেরা মক টেস্ট সিরিজ।
                  </p>
                  <div className="text-[9.5px] min-[390px]:text-[10.5px] sm:text-xs text-[#5A3E41] font-semibold leading-[1.35] md:leading-normal mb-0.5 md:mb-4 line-clamp-2 md:line-clamp-none">
                    Unit A (Science) · Unit B (Arts) · Unit C (Commerce)
                  </div>
                </div>
                <Link
                  className="w-full text-center py-2 sm:py-2.5 px-1.5 min-[380px]:px-2.5 md:px-4 rounded-full bg-gradient-to-r from-[#be123c] to-[#881337] hover:from-[#e11d48] hover:to-[#9f1239] text-white text-[9.5px] min-[380px]:text-[10.5px] sm:text-xs md:text-sm font-bold whitespace-nowrap truncate shadow-[0_8px_20px_-8px_rgba(190,18,60,0.6)] transition block"
                  href={NAVBAR_GROUP_PATHS.admission}
                  onClick={(e) => handleLinkClick(e, NAVBAR_GROUP_PATHS.admission)}
                >
                  এডমিশন কোর্সসমূহ দেখুন →
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Right Navigation Arrow */}
          <button
            type="button"
            onClick={() => handleSlide(1)}
            disabled={!canScrollRight}
            aria-label="পরবর্তী ক্যাটাগরি দেখুন"
            className={`md:hidden absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 backdrop-blur-md border border-rose-200/90 text-[#B91C1C] shadow-[0_4px_14px_rgba(185,28,28,0.22)] flex items-center justify-center transition-all duration-200 ${
              canScrollRight
                ? 'opacity-100 hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24] active:scale-90 cursor-pointer'
                : 'opacity-40 cursor-default'
            }`}
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Subtle Mobile Slide Indicator */}
        <div
          className="md:hidden flex items-center justify-center gap-1 mt-2"
          role="tablist"
          aria-label="ক্যাটাগরি স্লাইড নেভিগেশন"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSlide === 0}
            aria-label="একাডেমিক ও স্কিলস ক্যাটাগরি"
            onClick={() => handleJumpSlide(0)}
            className="py-1.5 px-1 cursor-pointer focus:outline-none"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                activeSlide === 0 ? 'w-6 bg-[#E22B2B]' : 'w-2 bg-[#E22B2B]/25'
              }`}
            />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSlide === 1}
            aria-label="স্কিলস ও এডমিশন ক্যাটাগরি"
            onClick={() => handleJumpSlide(1)}
            className="py-1.5 px-1 cursor-pointer focus:outline-none"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                activeSlide === 1 ? 'w-6 bg-[#E22B2B]' : 'w-2 bg-[#E22B2B]/25'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
};
