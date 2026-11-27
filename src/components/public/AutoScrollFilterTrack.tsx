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
 * Horizontal filter strip wrapper that automatically scrolls smoothly left & right
 * exclusively on Mobile & Tablet viewports (< 1024px) whenever filter items overflow.
 * Pauses temporarily during touch, pointer drag, wheel, focus, or click interactions,
 * smoothly centers clicked filter pills, and remains static on Desktop (>= 1024px).
 */
export const AutoScrollFilterTrack: React.FC<AutoScrollFilterTrackProps> = ({
  children,
  className = '',
  role,
  ariaLabel,
  speedPxPerSec = 42,
  pauseAtEdgesMs = 700,
  interactionCooldownMs = 2400,
  maxAutoScrollWidth = 1024,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollCursorRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1);
  const pauseUntilRef = useRef<number>(0);
  const isTouchingRef = useRef<boolean>(false);
  const isFocusedRef = useRef<boolean>(false);
  const lastWrittenAtRef = useRef<number>(0);
  const lastWrittenPosRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    let rafId: number | null = null;
    let watchdogId: number | null = null;
    let isDisposed = false;

    pauseUntilRef.current = performance.now() + 250;
    scrollCursorRef.current = el.scrollLeft;
    lastWrittenPosRef.current = el.scrollLeft;

    const isMobileOrTabletViewport = () => window.innerWidth < maxAutoScrollWidth;

    const hasHorizontalOverflow = () => el.scrollWidth - el.clientWidth > 2;

    const shouldAutoScroll = () => {
      if (isDisposed || !el.isConnected) return false;
      if (document.visibilityState === 'hidden') return false;
      if (!isMobileOrTabletViewport()) return false;
      return hasHorizontalOverflow();
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
      if (maxScroll <= 2) {
        stopLoop();
        return;
      }

      // Only re-sync virtual cursor if an external scroll diverged significantly,
      // preventing fractional DPR / zoom rounding from resetting progress back to 0.
      if (Math.abs(el.scrollLeft - scrollCursorRef.current) > 12) {
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
      lastWrittenPosRef.current = nextPos;
      lastWrittenAtRef.current = now;

      if (el.style.scrollBehavior === 'smooth') {
        el.style.scrollBehavior = 'auto';
      }
      el.scrollLeft = nextPos;

      rafId = window.requestAnimationFrame(tick);
    };

    const ensureLoopState = () => {
      if (shouldAutoScroll()) {
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

    const observeElements = () => {
      if (!resizeObserver) return;
      resizeObserver.observe(el);
      for (let i = 0; i < el.children.length; i += 1) {
        const child = el.children[i];
        if (child instanceof Element) {
          resizeObserver.observe(child);
        }
      }
    };
    observeElements();

    const mutationObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            observeElements();
            window.requestAnimationFrame(() => {
              if (!isDisposed) ensureLoopState();
            });
          })
        : null;
    mutationObserver?.observe(el, { childList: true, subtree: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isTouchingRef.current = false;
        pauseUntilRef.current = performance.now() + 300;
      }
      ensureLoopState();
    };

    const handleWindowResize = () => {
      ensureLoopState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleWindowResize, { passive: true });
    window.addEventListener('orientationchange', handleWindowResize, { passive: true });

    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready
        ?.then(() => {
          if (!isDisposed) ensureLoopState();
        })
        .catch(() => undefined);
    }

    // Lightweight watchdog ensures async data loads, viewport toggles, or deferred paints
    // always activate the loop when overflowing on Mobile/Tablet (< 1024px).
    watchdogId = window.setInterval(() => {
      if (!isDisposed && rafId === null) {
        ensureLoopState();
      }
    }, 350);

    ensureLoopState();

    return () => {
      isDisposed = true;
      stopLoop();
      if (watchdogId !== null) {
        window.clearInterval(watchdogId);
      }
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [maxAutoScrollWidth, pauseAtEdgesMs, speedPxPerSec]);

  const handleManualScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const now = performance.now();
    const isRecentOwnWrite =
      !isTouchingRef.current &&
      now - lastWrittenAtRef.current < 160 &&
      Math.abs(el.scrollLeft - lastWrittenPosRef.current) <= 10;

    if (isRecentOwnWrite) return;

    scrollCursorRef.current = el.scrollLeft;
    lastWrittenPosRef.current = el.scrollLeft;
    pauseUntilRef.current = now + interactionCooldownMs;
  };

  const handleInteractionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    const now = performance.now();
    pauseUntilRef.current = now + interactionCooldownMs;

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
    lastWrittenPosRef.current = centeredLeft;
    lastWrittenAtRef.current = now;
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
      onWheel={() => {
        pauseUntilRef.current = performance.now() + interactionCooldownMs;
      }}
      onFocusCapture={() => {
        isFocusedRef.current = true;
      }}
      onBlurCapture={() => {
        isFocusedRef.current = false;
        pauseUntilRef.current = performance.now() + 1200;
      }}
      className={className}
    >
      {children}
    </div>
  );
};
