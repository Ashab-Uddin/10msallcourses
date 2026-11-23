'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Course } from '../../types.ts';
import { CourseCard } from './CourseCard.tsx';

interface CategoryCourseCarouselProps {
  categorySlug: string;
  categoryName: string;
  courses: Course[];
  onEnrollClick: (course: Course, referrer: string) => void;
  headingLevel?: 'h3' | 'h4';
}

export const CategoryCourseCarousel: React.FC<CategoryCourseCarouselProps> = ({
  categorySlug,
  categoryName,
  courses,
  onEnrollClick,
  headingLevel = 'h4',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(courses.length > 2);
  const courseIdsKey = courses.map((c) => c.id).join(',');

  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (el) {
      el.scrollTo({ left: 0, behavior: 'auto' });
    }
    updateScrollBounds();
  }, [categorySlug, courseIdsKey, updateScrollBounds]);

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
    const firstCard = el.firstElementChild as HTMLElement | null;
    const computedGap = parseFloat(window.getComputedStyle(el).columnGap || '0') || 0;
    const cardStride = firstCard
      ? firstCard.getBoundingClientRect().width + computedGap
      : (el.clientWidth + computedGap) / 2;
    const cardsPerView =
      cardStride > 0
        ? Math.max(1, Math.round((el.clientWidth + computedGap) / cardStride))
        : 2;
    const cardsPerStep = cardsPerView >= 4 ? 2 : 1;

    el.scrollBy({
      left: direction * cardStride * cardsPerStep,
      behavior: 'smooth',
    });
  };

  // Mobile 2×1 (arrows if > 2) | Tablet 2×1 (arrows if > 2) | Laptop 4×1 (arrows if > 4)
  const showArrows = courses.length > 2;
  const arrowResponsiveVisibility = courses.length <= 4 ? 'lg:hidden' : '';

  return (
    <div className="relative">
      {/* Left Navigation Arrow */}
      {showArrows && (
        <button
          type="button"
          onClick={() => handleSlide(-1)}
          disabled={!canScrollLeft}
          aria-label={`${categoryName} আগের কোর্স`}
          className={`absolute -left-2 sm:-left-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/95 backdrop-blur-md border border-rose-200/90 text-[#B91C1C] shadow-[0_6px_18px_rgba(185,28,28,0.22)] flex items-center justify-center transition-all duration-200 ${arrowResponsiveVisibility} ${
            canScrollLeft
              ? 'opacity-100 hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24] active:scale-90 cursor-pointer'
              : 'opacity-40 cursor-default'
          }`}
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      )}

      {/* Horizontal Carousel Track: Mobile 2×1 | Tablet 2×1 | Laptop 4×1 */}
      <div
        ref={trackRef}
        onScroll={updateScrollBounds}
        className="flex gap-2.5 sm:gap-5 py-2 -my-2 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar items-stretch"
      >
        {courses.map((course) => (
          <div
            key={`cat-carousel-${categorySlug}-course-${course.id}-${course.slug}`}
            className="w-[calc((100%-10px)/2)] sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-60px)/4)] shrink-0 snap-start flex flex-col min-w-0"
          >
            <CourseCard
              course={course}
              onEnrollClick={onEnrollClick}
              headingLevel={headingLevel}
              compactMobile
            />
          </div>
        ))}
      </div>

      {/* Right Navigation Arrow */}
      {showArrows && (
        <button
          type="button"
          onClick={() => handleSlide(1)}
          disabled={!canScrollRight}
          aria-label={`${categoryName} পরবর্তী কোর্স`}
          className={`absolute -right-2 sm:-right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/95 backdrop-blur-md border border-rose-200/90 text-[#B91C1C] shadow-[0_6px_18px_rgba(185,28,28,0.22)] flex items-center justify-center transition-all duration-200 ${arrowResponsiveVisibility} ${
            canScrollRight
              ? 'opacity-100 hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24] active:scale-90 cursor-pointer'
              : 'opacity-40 cursor-default'
          }`}
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
