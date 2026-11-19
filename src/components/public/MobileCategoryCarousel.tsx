'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Course } from '../../types.ts';
import { CourseCard } from './CourseCard.tsx';

interface MobileCategoryCarouselProps {
  categorySlug: string;
  categoryName: string;
  courses: Course[];
  onEnrollClick: (course: Course, referrer: string) => void;
}

export const MobileCategoryCarousel: React.FC<MobileCategoryCarouselProps> = ({
  categorySlug,
  categoryName,
  courses,
  onEnrollClick,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(courses.length > 2);

  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    updateScrollBounds();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      updateScrollBounds();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [courses.length, updateScrollBounds]);

  const handleSlide = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    // Slide smoothly by exactly 1 card width + gap (10px gap between 2 visible cards)
    const gapPx = 10;
    const step = (el.clientWidth + gapPx) / 2;
    el.scrollBy({
      left: direction * step,
      behavior: 'smooth',
    });
  };

  const hasMoreSlides = courses.length > 2;

  return (
    <div className="sm:hidden relative">
      {/* Left Navigation Arrow */}
      {hasMoreSlides && (
        <button
          type="button"
          onClick={() => handleSlide(-1)}
          disabled={!canScrollLeft}
          aria-label={`${categoryName} আগের কোর্স`}
          className={`absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 backdrop-blur-md border border-rose-200/90 text-[#B91C1C] shadow-[0_4px_14px_rgba(185,28,28,0.22)] flex items-center justify-center transition-all duration-200 ${
            canScrollLeft
              ? 'opacity-100 hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24] active:scale-90 cursor-pointer'
              : 'opacity-40 cursor-default'
          }`}
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      {/* Horizontal Swipeable Track showing strictly 2 cards side-by-side */}
      <div
        ref={trackRef}
        onScroll={updateScrollBounds}
        className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar items-stretch"
      >
        {courses.map((course) => (
          <div
            key={`mobile-cat-${categorySlug}-course-${course.id}-${course.slug}`}
            className="w-[calc((100%-10px)/2)] shrink-0 snap-start flex flex-col min-w-0"
          >
            <CourseCard
              course={course}
              onEnrollClick={onEnrollClick}
              compactMobile
            />
          </div>
        ))}
      </div>

      {/* Right Navigation Arrow */}
      {hasMoreSlides && (
        <button
          type="button"
          onClick={() => handleSlide(1)}
          disabled={!canScrollRight}
          aria-label={`${categoryName} পরবর্তী কোর্স`}
          className={`absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 backdrop-blur-md border border-rose-200/90 text-[#B91C1C] shadow-[0_4px_14px_rgba(185,28,28,0.22)] flex items-center justify-center transition-all duration-200 ${
            canScrollRight
              ? 'opacity-100 hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24] active:scale-90 cursor-pointer'
              : 'opacity-40 cursor-default'
          }`}
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
