'use client';

import { useEffect, useRef } from 'react';
import { useNavigationLocation } from './navigationHistory.ts';

/**
 * Automatically scrolls the selected Category section smoothly into the viewport
 * on forward navigation while leaving a safe offset below the sticky top navbar
 * so the category title is never obscured on mobile or desktop.
 * Skips Browser Back/Forward (`isPop === true`) to preserve saved scroll restoration.
 */
export function useCategoryScrollIntoView<T extends HTMLElement = HTMLDivElement>(
  routeKey: string
) {
  const sectionRef = useRef<T | null>(null);
  const navLoc = useNavigationLocation();
  const lastScrolledKeyRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (navLoc.isPop) return;

    const currentKey = `${routeKey}|${navLoc.entryId}|${navLoc.navSeq}`;
    if (lastScrolledKeyRef.current === currentKey) return;
    lastScrolledKeyRef.current = currentKey;

    let rafId = 0;
    const timer = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;

        const headerEl = document.querySelector('header');
        const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 84;
        const safeOffsetPx = Math.max(88, Math.ceil(headerBottom + 14));
        el.style.scrollMarginTop = `${safeOffsetPx}px`;

        const rect = el.getBoundingClientRect();
        const isOutOfComfortZone =
          navLoc.navSeq > 0 ||
          rect.top < safeOffsetPx - 4 ||
          rect.top > window.innerHeight * 0.65;

        if (isOutOfComfortZone) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }, 60);

    return () => {
      window.clearTimeout(timer);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [routeKey, navLoc.entryId, navLoc.navSeq, navLoc.isPop]);

  return sectionRef;
}
