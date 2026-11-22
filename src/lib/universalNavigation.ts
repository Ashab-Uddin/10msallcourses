'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { decodeCourseSlug } from './courseSlug.ts';

export interface BrowserLocationState {
  pathname: string;
  search: string;
  hash: string;
  href: string;
  popEpoch: number;
}

export interface NavigationOptions {
  replace?: boolean;
  noScroll?: boolean;
  stateData?: Record<string, unknown>;
}

interface ScrollSnapshot {
  x: number;
  y: number;
  ts: number;
}

const NAV_EVENT = 'app:navstate';
const SNAPSHOT_STORAGE_KEY = '10ms_nav_snapshots_v1';
const MAX_SNAPSHOTS = 60;

type NavKind = 'initial' | 'push' | 'replace' | 'popstate';

let lastNavKind: NavKind = 'initial';
let inAppNavigationDepth = 0;
let navSeq = 0;
let popEpochCounter = 0;
let suppressScrollSnapshotUntilTs = 0;
let activeScrollTimer: number | null = null;
let lastObservedHref = '';
let lastObservedNavId: string | null = null;
let lastObservedModalKey: string | null = null;
let lastPopWasModalDismissal = false;
const dismissedModalNavIds = new Set<string>();
const memorySnapshots = new Map<string, ScrollSnapshot>();

const SERVER_SNAPSHOT: BrowserLocationState = {
  pathname: '/',
  search: '',
  hash: '',
  href: '/',
  popEpoch: 0,
};

let cachedClientKey = '';
let cachedClientSnapshot: BrowserLocationState = SERVER_SNAPSHOT;

function readCurrentLocationSnapshot(): BrowserLocationState {
  if (typeof window === 'undefined') {
    return SERVER_SNAPSHOT;
  }
  const pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const href = `${pathname}${search}${hash}`;
  const cacheKey = `${popEpochCounter}|${href}`;
  if (cacheKey === cachedClientKey) {
    return cachedClientSnapshot;
  }
  cachedClientKey = cacheKey;
  cachedClientSnapshot = { pathname, search, hash, href, popEpoch: popEpochCounter };
  return cachedClientSnapshot;
}

function getServerSnapshot(): BrowserLocationState {
  return SERVER_SNAPSHOT;
}

function subscribeLocation(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onChange = () => callback();
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

function isNextPatchedHistory(): boolean {
  if (typeof window === 'undefined' || typeof History === 'undefined') return false;
  return (
    window.history.pushState !== History.prototype.pushState &&
    window.history.replaceState !== History.prototype.replaceState
  );
}

function getCurrentNavId(): string | null {
  if (typeof window === 'undefined') return null;
  const st = window.history.state as { __navId?: unknown } | null;
  return typeof st?.__navId === 'string' && st.__navId ? st.__navId : null;
}

function getCurrentNavIdx(): number | null {
  if (typeof window === 'undefined') return null;
  const st = window.history.state as { __navIdx?: unknown } | null;
  return typeof st?.__navIdx === 'number' && Number.isFinite(st.__navIdx) ? st.__navIdx : null;
}

function getCurrentModalKey(): string | null {
  if (typeof window === 'undefined') return null;
  const st = window.history.state as { __modalKey?: unknown } | null;
  return typeof st?.__modalKey === 'string' && st.__modalKey ? st.__modalKey : null;
}

function createNextNavId(): string {
  navSeq += 1;
  return `n_${Date.now().toString(36)}_${navSeq}`;
}

function getComparableHref(): string {
  if (typeof window === 'undefined') return '/';
  return `${normalizeComparablePath(window.location.pathname)}${window.location.search || ''}${window.location.hash || ''}`;
}

function cancelPendingScrollRecord(): void {
  if (typeof window === 'undefined') return;
  if (activeScrollTimer !== null) {
    window.clearTimeout(activeScrollTimer);
    activeScrollTimer = null;
  }
}

export function scheduleScrollSnapshotRecord(delayMs = 100): void {
  if (typeof window === 'undefined') return;
  if (Date.now() < suppressScrollSnapshotUntilTs) return;
  cancelPendingScrollRecord();
  activeScrollTimer = window.setTimeout(() => {
    activeScrollTimer = null;
    if (Date.now() < suppressScrollSnapshotUntilTs) return;
    recordCurrentScrollSnapshot();
  }, delayMs);
}

/**
 * Stamps the initial history entry (`entry #0`) with a unique `__navId` and `__navIdx`
 * without altering the URL or triggering Next.js `ACTION_RESTORE`, and keeps Next.js
 * `__NA` / `_N` / `__PRIVATE_NEXTJS_INTERNALS_TREE` intact.
 */
function ensureCurrentEntryStamped(): string | null {
  if (typeof window === 'undefined') return null;
  const existingNavId = getCurrentNavId();
  if (existingNavId) return existingNavId;

  const newId = createNextNavId();
  const existingState =
    window.history.state && typeof window.history.state === 'object'
      ? { ...(window.history.state as Record<string, unknown>) }
      : {};

  const stampedState = {
    ...existingState,
    __navId: newId,
    __navIdx: typeof existingState.__navIdx === 'number' ? existingState.__navIdx : 0,
  };

  try {
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState(stampedState, '', currentHref);
  } catch {
    // Ignore history API restrictions in sandboxed environments
  }

  lastObservedNavId = newId;
  lastObservedHref = getComparableHref();
  lastObservedModalKey = getCurrentModalKey();
  return newId;
}

export function instantScrollTo(x: number, y: number): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const docEl = document.documentElement;
  const prevBehavior = docEl.style.scrollBehavior;
  docEl.style.scrollBehavior = 'auto';
  try {
    window.scrollTo({
      left: x,
      top: y,
      behavior: 'instant' as ScrollBehavior,
    });
  } catch {
    window.scrollTo(x, y);
  } finally {
    docEl.style.scrollBehavior = prevBehavior;
  }
}

let globalListenersInitialized = false;

function ensureGlobalHistoryTracking(): void {
  if (typeof window === 'undefined' || globalListenersInitialized) return;
  globalListenersInitialized = true;

  lastObservedHref = getComparableHref();
  lastObservedNavId = getCurrentNavId();
  lastObservedModalKey = getCurrentModalKey();

  // Detect back/forward navigation on initial document load (Safari BFCache / hard traverse)
  try {
    const entries = performance.getEntriesByType?.('navigation') as
      | PerformanceNavigationTiming[]
      | undefined;
    if (entries && entries[0]?.type === 'back_forward') {
      lastNavKind = 'popstate';
      popEpochCounter += 1;
    }
  } catch {
    // Ignore unsupported performance API
  }

  window.addEventListener(
    'popstate',
    () => {
      cancelPendingScrollRecord();
      suppressScrollSnapshotUntilTs = Date.now() + 250;

      const poppedFromModalKey = lastObservedModalKey;
      const newNavId = getCurrentNavId();
      const newHref = getComparableHref();
      const newModalKey = getCurrentModalKey();
      const navIdx = getCurrentNavIdx();

      lastPopWasModalDismissal = Boolean(
        poppedFromModalKey && !newModalKey && newHref === lastObservedHref
      );

      if (navIdx !== null) {
        inAppNavigationDepth = Math.max(0, navIdx);
      }

      lastObservedHref = newHref;
      lastObservedNavId = newNavId;
      lastObservedModalKey = newModalKey;

      lastNavKind = 'popstate';
      popEpochCounter += 1;
      resetStuckScrollLocks();
    },
    { capture: true }
  );

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      cancelPendingScrollRecord();
      lastNavKind = 'popstate';
      popEpochCounter += 1;
      lastObservedHref = getComparableHref();
      lastObservedNavId = getCurrentNavId();
      lastObservedModalKey = getCurrentModalKey();
      resetStuckScrollLocks();
      window.dispatchEvent(new Event(NAV_EVENT));
    }
  });

  const persistCurrentBeforeLeave = () => {
    cancelPendingScrollRecord();
    recordCurrentScrollSnapshot();
  };
  window.addEventListener('pagehide', persistCurrentBeforeLeave);
  window.addEventListener('beforeunload', persistCurrentBeforeLeave);
}

/**
 * Subscribe to the true browser URL (`pathname`, `search`, `hash`, `popEpoch`)
 * across Next.js router updates, shallow history updates, `popstate`, and `hashchange`.
 */
export function useBrowserLocation(fallbackPathname = '/'): BrowserLocationState {
  ensureGlobalHistoryTracking();
  const snap = useSyncExternalStore(
    subscribeLocation,
    readCurrentLocationSnapshot,
    getServerSnapshot
  );
  if (typeof window === 'undefined') {
    return {
      pathname: fallbackPathname,
      search: '',
      hash: '',
      href: fallbackPathname,
      popEpoch: 0,
    };
  }
  return snap;
}

export function isAdminRoutePath(pathname: string): boolean {
  const clean = normalizeComparablePath(pathname);
  return clean === '/admin' || clean.startsWith('/admin/');
}

/**
 * Decodes percent-encoded UTF-8 segments, normalizes NFC, and strips trailing
 * slashes so Bengali Unicode URLs compare identically to `window.location.pathname`.
 */
export function normalizeComparablePath(rawPath: string): string {
  const withoutOrigin = (rawPath || '/').replace(/^https?:\/\/[^/]+/i, '');
  const pathOnly = withoutOrigin.split('#')[0].split('?')[0] || '/';
  const decoded = decodeCourseSlug(pathOnly).normalize('NFC');
  const trimmed = decoded.replace(/\/+$/, '');
  return trimmed ? (trimmed.startsWith('/') ? trimmed : `/${trimmed}`) : '/';
}

export function splitUrlParts(fullUrl: string): {
  pathname: string;
  search: string;
  hash: string;
  normalizedPathname: string;
  routeKey: string;
  hrefKey: string;
} {
  const raw = fullUrl || '/';
  const hashIdx = raw.indexOf('#');
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : '';
  const beforeHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const searchIdx = beforeHash.indexOf('?');
  const search = searchIdx >= 0 ? beforeHash.slice(searchIdx) : '';
  const pathnameRaw = searchIdx >= 0 ? beforeHash.slice(0, searchIdx) : beforeHash;
  const pathname = pathnameRaw || '/';
  const normalizedPathname = normalizeComparablePath(pathname);
  const routeKey = `${normalizedPathname}${search}`;
  const hrefKey = `${normalizedPathname}${search}${hash}`;
  return { pathname, search, hash, normalizedPathname, routeKey, hrefKey };
}

function loadSessionSnapshots(): Record<string, ScrollSnapshot> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionSnapshot(key: string, snap: ScrollSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const store = loadSessionSnapshots();
    store[key] = snap;
    const keys = Object.keys(store);
    if (keys.length > MAX_SNAPSHOTS) {
      keys
        .sort((a, b) => (store[a]?.ts || 0) - (store[b]?.ts || 0))
        .slice(0, keys.length - MAX_SNAPSHOTS)
        .forEach((oldKey) => {
          delete store[oldKey];
        });
    }
    window.sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors (e.g., private browsing modes)
  }
}

function readSnapshotForKey(key: string): ScrollSnapshot | null {
  const mem = memorySnapshots.get(key);
  if (mem) return mem;
  const store = loadSessionSnapshots();
  const stored = store[key];
  if (stored && typeof stored.y === 'number') {
    memorySnapshots.set(key, stored);
    return stored;
  }
  return null;
}

export function getCurrentUrlKey(): string {
  if (typeof window === 'undefined') return '/';
  const normPath = normalizeComparablePath(window.location.pathname);
  return `${normPath}${window.location.search || ''}${window.location.hash || ''}`;
}

export function recordCurrentScrollSnapshot(): void {
  if (typeof window === 'undefined') return;
  const snap: ScrollSnapshot = {
    x: window.scrollX || 0,
    y: window.scrollY || 0,
    ts: Date.now(),
  };
  const navId = ensureCurrentEntryStamped();
  const urlKey = getCurrentUrlKey();
  if (navId) {
    memorySnapshots.set(`id:${navId}`, snap);
    writeSessionSnapshot(`id:${navId}`, snap);
  }
  memorySnapshots.set(`url:${urlKey}`, snap);
  writeSessionSnapshot(`url:${urlKey}`, snap);
}

export function getSavedScrollForCurrentEntry(): ScrollSnapshot | null {
  if (typeof window === 'undefined') return null;
  const navId = getCurrentNavId();
  if (navId) {
    const byId = readSnapshotForKey(`id:${navId}`);
    if (byId) return byId;
  }
  const urlKey = getCurrentUrlKey();
  return readSnapshotForKey(`url:${urlKey}`);
}

export function markPushNavigation(): void {
  lastNavKind = 'push';
  inAppNavigationDepth += 1;
}

export function markReplaceNavigation(): void {
  lastNavKind = 'replace';
}

export function getLastNavigationKind(): NavKind {
  return lastNavKind;
}

export function wasLastPopModalDismissal(): boolean {
  return lastPopWasModalDismissal;
}

export function canNavigateBackInApp(): boolean {
  if (typeof window === 'undefined') return false;
  const navIdx = getCurrentNavIdx();
  if (navIdx !== null && navIdx > 0) return true;
  if (inAppNavigationDepth > 0) return true;
  try {
    if (document.referrer) {
      const refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin && window.history.length > 1) {
        return true;
      }
    }
  } catch {
    // Ignore malformed referrer
  }
  return false;
}

export function navigateBackSafely(
  fallbackUrl: string,
  navigateFn: (url: string, options?: NavigationOptions) => void
): void {
  if (typeof window !== 'undefined' && canNavigateBackInApp()) {
    inAppNavigationDepth = Math.max(0, inAppNavigationDepth - 1);
    window.history.back();
    return;
  }
  navigateFn(fallbackUrl, { replace: true });
}

export function resetStuckScrollLocks(): void {
  if (typeof document === 'undefined') return;
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = '';
  }
}

function buildNextCompatibleState(
  extraFields: Record<string, unknown>,
  keepExistingNextInternalsWhenUnpatched = true
): Record<string, unknown> {
  const existingState =
    window.history.state && typeof window.history.state === 'object'
      ? { ...(window.history.state as Record<string, unknown>) }
      : {};

  // Strip __NA/_N only when Next.js's patched pushState/replaceState is active so Next.js
  // executes copyNextJsInternalHistoryState & applyUrlFromHistoryPushReplace cleanly.
  if (isNextPatchedHistory() || !keepExistingNextInternalsWhenUnpatched) {
    delete existingState.__NA;
    delete existingState._N;
    delete existingState.__PRIVATE_NEXTJS_INTERNALS_TREE;
  }

  return {
    ...existingState,
    ...extraFields,
  };
}

/**
 * Pushes a reversible history entry when opening an overlay modal (course details,
 * book details, footer policy dialog) so pressing Android/iOS/Desktop Back closes the
 * modal cleanly on the exact same route & scroll position instead of jumping back to `/`.
 */
export function pushModalHistoryState(modalKey: string): void {
  if (typeof window === 'undefined' || !modalKey) return;
  ensureGlobalHistoryTracking();

  // Avoid pushing duplicate modal entries if the same modal is already at top
  if (getCurrentModalKey() === modalKey) return;

  ensureCurrentEntryStamped();
  cancelPendingScrollRecord();
  recordCurrentScrollSnapshot();

  const currentIdx = getCurrentNavIdx() ?? inAppNavigationDepth;
  const nextIdx = currentIdx + 1;
  const navId = createNextNavId();
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const nextState = buildNextCompatibleState({
    __navId: navId,
    __navIdx: nextIdx,
    __modalKey: modalKey,
  });

  lastNavKind = 'push';
  inAppNavigationDepth = nextIdx;
  suppressScrollSnapshotUntilTs = Date.now() + 180;

  window.history.pushState(nextState, '', currentHref);

  // Record parent scroll under modal entry too so scroll stays put if Forward/Back happens
  memorySnapshots.set(`id:${navId}`, {
    x: window.scrollX || 0,
    y: window.scrollY || 0,
    ts: Date.now(),
  });

  lastObservedHref = getComparableHref();
  lastObservedNavId = navId;
  lastObservedModalKey = modalKey;
  lastPopWasModalDismissal = false;
  window.dispatchEvent(new Event(NAV_EVENT));
}

/**
 * Pops the active modal history entry when dismissed via UI close button / Escape / backdrop,
 * keeping browser history clean with zero orphan modal steps.
 */
export function dismissModalHistoryState(modalKey: string): void {
  if (typeof window === 'undefined' || !modalKey) return;
  const currentModalKey = getCurrentModalKey();
  const currentNavId = getCurrentNavId();
  if (currentModalKey !== modalKey) return;
  if (currentNavId && dismissedModalNavIds.has(currentNavId)) return;
  if (currentNavId) {
    dismissedModalNavIds.add(currentNavId);
    if (dismissedModalNavIds.size > 50) {
      const oldest = dismissedModalNavIds.values().next().value;
      if (oldest) dismissedModalNavIds.delete(oldest);
    }
  }
  window.history.back();
}

/**
 * Performs Next.js App Router-compatible shallow navigation (`history.pushState` /
 * `history.replaceState`) while maintaining unique per-entry scroll snapshots and full
 * step-by-step history tracking across routes, sub-categories, queries, and hashes.
 */
export function performShallowNavigation(
  targetUrl: string,
  options?: NavigationOptions
): void {
  if (typeof window === 'undefined') return;
  ensureGlobalHistoryTracking();

  const currentParts = splitUrlParts(
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
  const targetParts = splitUrlParts(targetUrl);

  const isExactSameRouteAndQuery = currentParts.routeKey === targetParts.routeKey;
  const isExactSameHref = currentParts.hrefKey === targetParts.hrefKey;

  // Never stack duplicate history entries if already on the exact target
  if (isExactSameHref && !options?.stateData) {
    if (!options?.noScroll && window.scrollY > 20 && !targetParts.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  ensureCurrentEntryStamped();
  cancelPendingScrollRecord();
  recordCurrentScrollSnapshot();

  const shouldReplace = Boolean(options?.replace) || (isExactSameHref && !options?.stateData);
  const prevIdx = getCurrentNavIdx() ?? inAppNavigationDepth;
  const nextIdx = shouldReplace ? prevIdx : prevIdx + 1;

  const navId = shouldReplace
    ? getCurrentNavId() || createNextNavId()
    : createNextNavId();

  const nextState = buildNextCompatibleState({
    ...(options?.stateData || {}),
    __navId: navId,
    __navIdx: nextIdx,
    __modalKey: null,
  });

  const finalUrl = `${targetParts.pathname}${targetParts.search}${targetParts.hash}`;

  suppressScrollSnapshotUntilTs = Date.now() + 200;
  lastPopWasModalDismissal = false;

  if (shouldReplace) {
    lastNavKind = 'replace';
    window.history.replaceState(nextState, '', finalUrl);
  } else {
    lastNavKind = 'push';
    inAppNavigationDepth = nextIdx;
    window.history.pushState(nextState, '', finalUrl);
  }

  lastObservedHref = getComparableHref();
  lastObservedNavId = navId;
  lastObservedModalKey = null;

  resetStuckScrollLocks();
  window.dispatchEvent(new Event(NAV_EVENT));

  if (options?.noScroll || (isExactSameRouteAndQuery && !targetParts.hash)) {
    return;
  }

  if (targetParts.hash) {
    const id = targetParts.hash.slice(1);
    if (options?.noScroll) return;
    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
    return;
  }

  // Instant scroll to top overrides global `html { scroll-behavior: smooth }`
  // so scroll position reaches 0 immediately on forward navigation.
  instantScrollTo(0, 0);
}

/**
 * Updates URL search parameters on the current route cleanly so active filters,
 * tabs, search queries, and pagination survive Back/Forward & Refresh.
 */
export function updateCurrentSearchParams(
  updates: Record<string, string | null | undefined>,
  options?: { push?: boolean; noScroll?: boolean }
): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search || '');
  let changed = false;

  for (const [key, rawValue] of Object.entries(updates)) {
    const nextVal = rawValue == null ? '' : String(rawValue);
    const prevVal = params.get(key) ?? '';
    if (!nextVal) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    } else if (prevVal !== nextVal) {
      params.set(key, nextVal);
      changed = true;
    }
  }

  if (!changed) return;

  const qs = params.toString();
  const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
  performShallowNavigation(nextUrl, {
    replace: !options?.push,
    noScroll: options?.noScroll ?? true,
  });
}

/**
 * Reliably tracks scroll position and restores it on Browser Back/Forward (`popstate`)
 * across async React commits, `content-visibility: auto`, dynamic imports, and lazy media,
 * ignoring `html { scroll-behavior: smooth }`.
 */
export function useUniversalScrollRestoration(
  routeKey: string,
  isReady = true
): void {
  const loc = useBrowserLocation();
  const restoreScope = `${routeKey}|${loc.popEpoch}`;
  const isActivelyRestoringRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    ensureGlobalHistoryTracking();
    ensureCurrentEntryStamped();

    const prevRestoration = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = 'manual';
    } catch {
      // Ignore read-only scrollRestoration environments
    }

    const onScroll = () => {
      if (isActivelyRestoringRef.current) return;
      scheduleScrollSnapshotRecord(100);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelPendingScrollRecord();
      try {
        window.history.scrollRestoration = prevRestoration || 'auto';
      } catch {
        // Ignore
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isReady) return;
    if (getLastNavigationKind() !== 'popstate') return;

    const saved = getSavedScrollForCurrentEntry();

    // If dismissing a modal on the exact same route and scroll hasn't moved far, leave or snap cleanly
    if (lastPopWasModalDismissal && !saved) {
      lastPopWasModalDismissal = false;
      return;
    }
    lastPopWasModalDismissal = false;

    const targetX = saved?.x ?? 0;
    const targetY = saved?.y ?? 0;

    // Popped onto an entry without an explicit scroll snapshot and at top:
    if (!saved && window.location.hash) {
      return;
    }

    if (targetY <= 0) {
      isActivelyRestoringRef.current = true;
      suppressScrollSnapshotUntilTs = Date.now() + 180;
      instantScrollTo(targetX, 0);
      const timer = window.setTimeout(() => {
        isActivelyRestoringRef.current = false;
      }, 150);
      return () => {
        window.clearTimeout(timer);
        isActivelyRestoringRef.current = false;
      };
    }

    let aborted = false;
    isActivelyRestoringRef.current = true;
    suppressScrollSnapshotUntilTs = Date.now() + 1400;

    const abortRestore = () => {
      aborted = true;
      isActivelyRestoringRef.current = false;
      suppressScrollSnapshotUntilTs = 0;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'PageDown' ||
        e.key === 'PageUp' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        e.key === ' '
      ) {
        abortRestore();
      }
    };

    window.addEventListener('wheel', abortRestore, { passive: true, once: true });
    window.addEventListener('touchstart', abortRestore, { passive: true, once: true });
    window.addEventListener('pointerdown', abortRestore, { passive: true, once: true });
    window.addEventListener('keydown', onKeyDown, { passive: true, once: true });

    let rafId = 0;
    let attempts = 0;
    const startedAt = Date.now();
    const MAX_MS = 1200;
    const MAX_ATTEMPTS = 72;

    const applyTarget = (): boolean => {
      if (aborted) return true;
      const maxReachable = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const goalY = Math.min(targetY, maxReachable);
      if (Math.abs(window.scrollY - goalY) > 2 || Math.abs(window.scrollX - targetX) > 2) {
        instantScrollTo(targetX, goalY);
      }
      return maxReachable >= targetY - 4 && Math.abs(window.scrollY - targetY) <= 4;
    };

    const finishRestore = () => {
      isActivelyRestoringRef.current = false;
      suppressScrollSnapshotUntilTs = 0;
    };

    const tick = () => {
      if (aborted) return;
      const done = applyTarget();
      const elapsed = Date.now() - startedAt;
      attempts += 1;

      if (!done && elapsed < MAX_MS && attempts < MAX_ATTEMPTS) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        finishRestore();
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      resizeObserver = new ResizeObserver(() => {
        if (aborted) return;
        if (Date.now() - startedAt > MAX_MS) {
          resizeObserver?.disconnect();
          finishRestore();
          return;
        }
        if (applyTarget()) {
          resizeObserver?.disconnect();
          finishRestore();
        }
      });
      resizeObserver.observe(document.body);
    }

    rafId = window.requestAnimationFrame(tick);

    return () => {
      aborted = true;
      isActivelyRestoringRef.current = false;
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('wheel', abortRestore);
      window.removeEventListener('touchstart', abortRestore);
      window.removeEventListener('pointerdown', abortRestore);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [restoreScope, isReady]);
}

/**
 * Syncs a search input with URL query parameters (`?q=...` by default) cleanly.
 * - Uses keyed draft state so typing is lag-free and never calls setState inside useEffect.
 * - Reverts immediately on Browser Back/Forward (`popEpoch` / `pathname` change).
 * - Exposes `clearSearchDraft()` so multi-param filter resets can push history cleanly
 *   without executing an intermediate `replaceState`.
 */
export function useRouteSearchQuery(
  paramName = 'q',
  debounceMs = 180,
  enabled = true
): readonly [string, (nextValue: string, immediate?: boolean) => void, () => void, () => void] {
  const loc = useBrowserLocation();
  const normalizedPath = normalizeComparablePath(loc.pathname);
  const scope = `${normalizedPath}|${loc.popEpoch}`;

  const urlValue = useMemo(() => {
    if (!enabled) return '';
    return new URLSearchParams(loc.search || '').get(paramName) ?? '';
  }, [enabled, loc.search, paramName]);

  const [draft, setDraft] = useState<{ scope: string; baseSearch: string; value: string } | null>(
    null
  );
  const timerRef = useRef<number | null>(null);
  const latestPendingRef = useRef<{ value: string; enabled: boolean }>({
    value: urlValue,
    enabled,
  });

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const currentValue =
    enabled && draft?.scope === scope && draft.baseSearch === (loc.search || '')
      ? draft.value
      : urlValue;

  const commitToUrl = useCallback(
    (nextValue: string) => {
      if (!enabled) return;
      updateCurrentSearchParams(
        { [paramName]: nextValue.trim() ? nextValue : null },
        { push: false, noScroll: true }
      );
    },
    [enabled, paramName]
  );

  const setSearchValue = useCallback(
    (nextValue: string, immediate = false) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!enabled) {
        setDraft(null);
        return;
      }

      latestPendingRef.current = { value: nextValue, enabled };

      if (immediate) {
        setDraft(null);
        commitToUrl(nextValue);
        return;
      }

      setDraft({ scope, baseSearch: loc.search || '', value: nextValue });

      if (debounceMs <= 0) {
        setDraft(null);
        commitToUrl(nextValue);
        return;
      }

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setDraft(null);
        commitToUrl(nextValue);
      }, debounceMs);
    },
    [commitToUrl, debounceMs, enabled, loc.search, scope]
  );

  const flushSearchValue = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      setDraft(null);
      if (latestPendingRef.current.enabled) {
        commitToUrl(latestPendingRef.current.value);
      }
    }
  }, [commitToUrl]);

  const clearSearchDraft = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    latestPendingRef.current = { value: '', enabled };
    setDraft(null);
  }, [enabled]);

  return [currentValue, setSearchValue, flushSearchValue, clearSearchDraft] as const;
}
