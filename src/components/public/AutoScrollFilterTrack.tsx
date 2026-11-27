'use client';

import React, { useEffect, useRef } from 'react';

interface AutoScrollFilterTrackProps {
  children: React.ReactNode;
  className?: string;
  role?: React.AriaRole;
  ariaLabel?: string;
  speedPxPerSec?: number;
  pauseAtEdgesMs?: number;
  interactionCooldownMs?: number;
  maxAutoScrollWidth?: number;
}

/**
 * Horizontal filter strip wrapper that automatically glides back and forth
 * on Mobile & Tablet viewports (< 1024px) whenever filter items overflow horizontally.
 * Automatically pauses on touch, pointer hover, wheel, focus, or click, smoothly
 * centers clicked filter buttons, and stays static on Desktop (>= 1024px).
 */
export const AutoScrollFilterTrack: React.FC<AutoScrollFilterTrackProps> = ({
  children,
  className = '',
  role,
  ariaLabel,
  speedPxPerSec = 32,
  pauseAtEdgesMs = 1100,
  interactionCooldownMs = 3200,
  maxAutoScrollWidth = 1024,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollCursorRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1);
  const pauseUntilRef = useRef<number>(0);
  const isHoveredRef = useRef<boolean>(false);
  const isTouchingRef = useRef<boolean>(false);
  const isFocusedRef = useRef<boolean>(false);
  const isInViewRef = useRef<boolean>(true);
  const isProgrammaticWriteRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rafId: number | null = null;
    let isDisposed = false;

    pauseUntilRef.current = performance.now() + 900;
    scrollCursorRef.current = el.scrollLeft;

    const shouldAutoScroll = () => {
      if (isDisposed) return false;
      if (reducedMotionQuery.matches) return false;
      if (document.visibilityState === 'hidden') return false;
      if (!isInViewRef.current) return false;
      if (window.innerWidth >= maxAutoScrollWidth) return false;
      return el.scrollWidth - el.clientWidth > 3;
    };

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastFrameTimeRef.current = null;
    };

    const tick = (now: number) => {
      if (isDisposed) return;

      if (!shouldAutoScroll()) {
        stopLoop();
        return;
      }

      if (
        isHoveredRef.current ||
        isTouchingRef.current ||
        isFocusedRef.current ||
        now < pauseUntilRef.current
      ) {
        lastFrameTimeRef.current = now;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const prevTime = lastFrameTimeRef.current ?? now;
      const deltaSec = Math.min(0.064, Math.max(0, (now - prevTime) / 1000));
      lastFrameTimeRef.current = now;

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll <= 3) {
        stopLoop();
        return;
      }

      // Re-sync cursor if manual/smooth scroll moved it outside our frame
      if (Math.abs(el.scrollLeft - scrollCursorRef.current) > 3) {
        scrollCursorRef.current = el.scrollLeft;
      }

      let nextPos =
        scrollCursorRef.current + directionRef.current * speedPxPerSec * deltaSec;

      if (nextPos >= maxScroll) {
        nextPos = maxScroll;
        directionRef.current = -1;
        pauseUntilRef.current = now + pauseAtEdgesMs;
      } else if (nextPos <= 0) {
        nextPos = 0;
        directionRef.current = 1;
        pauseUntilRef.current = now + pauseAtEdgesMs;
      }

      scrollCursorRef.current = nextPos;
      isProgrammaticWriteRef.current = true;
      el.scrollLeft = nextPos;
      window.requestAnimationFrame(() => {
        isProgrammaticWriteRef.current = false;
      });

      rafId = window.requestAnimationFrame(tick);
    };

    const ensureLoopState = () => {
      if (shouldAutoScroll()) {
        if (rafId === null) {
          scrollCursorRef.current = el.scrollLeft;
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

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              isInViewRef.current = entry.isIntersecting;
              ensureLoopState();
            },
            { threshold: 0.05 }
          )
        : null;
    intersectionObserver?.observe(el);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pauseUntilRef.current = performance.now() + 600;
      }
      ensureLoopState();
    };

    const handleWindowResize = () => {
      ensureLoopState();
    };

    const handleMotionChange = () => {
      ensureLoopState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleWindowResize, { passive: true });
    reducedMotionQuery.addEventListener?.('change', handleMotionChange);

    ensureLoopState();

    return () => {
      isDisposed = true;
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleWindowResize);
      reducedMotionQuery.removeEventListener?.('change', handleMotionChange);
    };
  }, [maxAutoScrollWidth, pauseAtEdgesMs, speedPxPerSec]);

  const handleManualScroll = () => {
    const el = containerRef.current;
    if (!el || isProgrammaticWriteRef.current) return;
    const movedExternally =
      isTouchingRef.current || Math.abs(el.scrollLeft - scrollCursorRef.current) > 2.5;
    scrollCursorRef.current = el.scrollLeft;
    if (movedExternally) {
      pauseUntilRef.current = performance.now() + interactionCooldownMs;
    }
  };

  const handleInteractionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    pauseUntilRef.current = performance.now() + interactionCooldownMs;

    const target = (e.target as HTMLElement | null)?.closest(
      'button, a, [role="tab"], [role="radio"]'
    ) as HTMLElement | null;

    if (!target || !el.contains(target)) return;
    if (el.scrollWidth <= el.clientWidth + 2) return;

    const containerRect = el.getBoundingClientRect();
    const itemRect = target.getBoundingClientRect();
    const itemOffsetLeft = itemRect.left - containerRect.left + el.scrollLeft;
    const centeredLeft = Math.max(
      0,
      Math.min(
        el.scrollWidth - el.clientWidth,
        itemOffsetLeft - (el.clientWidth - itemRect.width) / 2
      )
    );

    scrollCursorRef.current = centeredLeft;
    el.scrollTo({ left: centeredLeft, behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      onScroll={handleManualScroll}
      onClick={handleInteractionClick}
      onTouchStart={() => {
        isTouchingRef.current = true;
        pauseUntilRef.current = performance.now() + interactionCooldownMs;
      }}
      onTouchEnd={() => {
        isTouchingRef.current = false;
        pauseUntilRef.current = performance.now() + interactionCooldownMs;
      }}
      onTouchCancel={() => {
        isTouchingRef.current = false;
        pauseUntilRef.current = performance.now() + interactionCooldownMs;
      }}
      onPointerDown={() => {
        isTouchingRef.current = true;
        pauseUntilRef.current = performance.now() + interactionCooldownMs;
      }}
      onPointerUp={() => {
        isTouchingRef.current = false;
        pauseUntilRef.current = performance.now() + interactionCooldownMs;
      }}
      onPointerCancel={() => {
        isTouchingRef.current = false;
      }}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
        pauseUntilRef.current = performance.now() + 900;
      }}
      onWheel={() => {
        pauseUntilRef.current = performance.now() + interactionCooldownMs;
      }}
      onFocusCapture={() => {
        isFocusedRef.current = true;
      }}
      onBlurCapture={() => {
        isFocusedRef.current = false;
        pauseUntilRef.current = performance.now() + 1400;
      }}
      className={className}
    >
      {children}
    </div>
  );
};
