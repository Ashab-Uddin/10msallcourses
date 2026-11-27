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
  headingLevel?: 'h3' | 'h4';
}

const AUTO_SCROLL_SPEED_PX_PER_SEC = 34;
const EDGE_PAUSE_MS = 900;
const INTERACTION_COOLDOWN_MS = 4500;

export const MobileCategoryCarousel: React.FC<MobileCategoryCarouselProps> = ({
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

  const scrollCursorRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1);
  const pauseUntilRef = useRef<number>(0);
  const isTouchingRef = useRef<boolean>(false);
  const isFocusedRef = useRef<boolean>(false);
  const lastWrittenAtRef = useRef<number>(0);
  const lastWrittenPosRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  const restoreNativeSnap = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    if (el.style.scrollSnapType) {
      el.style.scrollSnapType = '';
    }
    if (el.style.scrollBehavior) {
      el.style.scrollBehavior = '';
    }
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (el) {
      restoreNativeSnap(el);
      el.scrollTo({ left: 0, behavior: 'auto' });
    }
    scrollCursorRef.current = 0;
    lastWrittenPosRef.current = 0;
    directionRef.current = 1;
    pauseUntilRef.current = typeof performance !== 'undefined' ? performance.now() + 450 : 0;
    updateScrollBounds();
  }, [categorySlug, courseIdsKey, restoreNativeSnap, updateScrollBounds]);

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

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof window === 'undefined') return;

    let rafId: number | null = null;
    let watchdogId: number | null = null;
    let isDisposed = false;

    pauseUntilRef.current = performance.now() + 450;
    scrollCursorRef.current = el.scrollLeft;
    lastWrittenPosRef.current = el.scrollLeft;

    const canAutoScroll = () => {
      if (isDisposed || !el.isConnected) return false;
      if (courses.length <= 2) return false;
      if (document.visibilityState === 'hidden') return false;
      if (el.clientWidth <= 0) return false;
      return el.scrollWidth - el.clientWidth > 4;
    };

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastFrameTimeRef.current = null;
      restoreNativeSnap(el);
    };

    const tick = (now: number) => {
      if (isDisposed) return;

      if (!canAutoScroll()) {
        stopLoop();
        return;
      }

      const rect = el.getBoundingClientRect();
      const isVisibleInViewport =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 40 &&
        rect.top < window.innerHeight - 40;

      if (
        !isVisibleInViewport ||
        isTouchingRef.current ||
        isFocusedRef.current ||
        now < pauseUntilRef.current
      ) {
        scrollCursorRef.current = el.scrollLeft;
        lastFrameTimeRef.current = now;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const prevTime = lastFrameTimeRef.current ?? now;
      const deltaSec = Math.min(0.064, Math.max(0.001, (now - prevTime) / 1000));
      lastFrameTimeRef.current = now;

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll <= 4) {
        stopLoop();
        return;
      }

      if (Math.abs(el.scrollLeft - scrollCursorRef.current) > 12) {
        scrollCursorRef.current = el.scrollLeft;
      }

      let nextPos =
        scrollCursorRef.current + directionRef.current * AUTO_SCROLL_SPEED_PX_PER_SEC * deltaSec;

      if (nextPos >= maxScroll) {
        nextPos = maxScroll;
        directionRef.current = -1;
        pauseUntilRef.current = now + EDGE_PAUSE_MS;
      } else if (nextPos <= 0) {
        nextPos = 0;
        directionRef.current = 1;
        pauseUntilRef.current = now + EDGE_PAUSE_MS;
      }

      if (el.style.scrollSnapType !== 'none') {
        el.style.scrollSnapType = 'none';
      }
      if (el.style.scrollBehavior !== 'auto') {
        el.style.scrollBehavior = 'auto';
      }

      scrollCursorRef.current = nextPos;
      lastWrittenPosRef.current = nextPos;
      lastWrittenAtRef.current = now;
      el.scrollLeft = nextPos;

      rafId = window.requestAnimationFrame(tick);
    };

    const ensureLoopState = () => {
      if (canAutoScroll()) {
        if (rafId === null) {
          scrollCursorRef.current = el.scrollLeft;
          lastWrittenPosRef.current = el.scrollLeft;
          lastFrameTimeRef.current = null;
          rafId = window.requestAnimationFrame(tick);
        }
      } else {
        stopLoop();
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            ensureLoopState();
          })
        : null;
    resizeObserver?.observe(el);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isTouchingRef.current = false;
        pauseUntilRef.current = performance.now() + 400;
      }
      ensureLoopState();
    };

    const handleWindowResize = () => {
      ensureLoopState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleWindowResize, { passive: true });
    window.addEventListener('orientationchange', handleWindowResize, { passive: true });

    watchdogId = window.setInterval(() => {
      if (!isDisposed && rafId === null) {
        ensureLoopState();
      }
    }, 400);

    ensureLoopState();

    return () => {
      isDisposed = true;
      stopLoop();
      if (watchdogId !== null) {
        window.clearInterval(watchdogId);
      }
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [categorySlug, courseIdsKey, courses.length, restoreNativeSnap]);

  const handleTrackScroll = () => {
    updateScrollBounds();
    const el = trackRef.current;
    if (!el) return;

    const now = performance.now();
    const isRecentOwnWrite =
      !isTouchingRef.current &&
      now - lastWrittenAtRef.current < 160 &&
      Math.abs(el.scrollLeft - lastWrittenPosRef.current) <= 10;

    if (isRecentOwnWrite) return;

    scrollCursorRef.current = el.scrollLeft;
    lastWrittenPosRef.current = el.scrollLeft;
    pauseUntilRef.current = now + INTERACTION_COOLDOWN_MS;
  };

  const pauseForInteraction = () => {
    pauseUntilRef.current = performance.now() + INTERACTION_COOLDOWN_MS;
    restoreNativeSnap(trackRef.current);
  };

  const handleSlide = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;

    pauseForInteraction();
    // Slide smoothly by exactly 1 card width + gap (10px gap between 2 visible cards)
    const gapPx = 10;
    const step = (el.clientWidth + gapPx) / 2;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const targetLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + direction * step));

    directionRef.current = direction;
    scrollCursorRef.current = targetLeft;
    lastWrittenPosRef.current = targetLeft;
    lastWrittenAtRef.current = performance.now();

    el.scrollTo({
      left: targetLeft,
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
        onScroll={handleTrackScroll}
        onTouchStart={() => {
          isTouchingRef.current = true;
          pauseForInteraction();
        }}
        onTouchEnd={() => {
          isTouchingRef.current = false;
          pauseForInteraction();
        }}
        onTouchCancel={() => {
          isTouchingRef.current = false;
        }}
        onPointerDown={() => {
          isTouchingRef.current = true;
          pauseForInteraction();
        }}
        onPointerUp={() => {
          isTouchingRef.current = false;
          pauseForInteraction();
        }}
        onPointerCancel={() => {
          isTouchingRef.current = false;
        }}
        onWheel={() => {
          pauseForInteraction();
        }}
        onClickCapture={() => {
          pauseForInteraction();
        }}
        onFocusCapture={() => {
          isFocusedRef.current = true;
          restoreNativeSnap(trackRef.current);
        }}
        onBlurCapture={() => {
          isFocusedRef.current = false;
          pauseUntilRef.current = performance.now() + 1400;
        }}
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
              headingLevel={headingLevel}
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
