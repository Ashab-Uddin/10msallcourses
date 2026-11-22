'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

export interface NavigationViewState {
  // Home discovery & filters
  homeSelectedCategory?: string;
  homeSearchQuery?: string;
  homePriceFilter?: string;
  homeOnlyPopular?: boolean;
  // Generic CategoryPage
  categorySearchQuery?: string;
  categoryPriceFilter?: string;
  categoryBatchFilter?: string;
  categoryGroupFilter?: 'all' | 'science' | 'business' | 'humanities';
  // Category sub-filters (HSC28 specialized pages & Junior classes)
  subFilter?: string;
  // AcademicPage (SSC stream tab & search)
  academicDept?: 'all' | 'science' | 'business' | 'humanities';
  academicSearchQuery?: string;
  // BookStorePage
  bookSearchQuery?: string;
  // AdminDashboard & BookStoreAdminManager
  adminSearchQuery?: string;
  adminFilterCat?: string;
  adminFilterStatus?: string;
  adminCurrentPage?: number;
  bookAdminSearchQuery?: string;
  bookAdminFilterCat?: string;
  bookAdminFilterStatus?: 'all' | 'active' | 'inactive';
  bookAdminCurrentPage?: number;
}

export interface NavigationSnapshot {
  entryId: string;
  url: string;
  scrollY: number;
  viewState: NavigationViewState;
  updatedAt: number;
}

export interface NavigationLocationSnapshot {
  entryId: string;
  pathname: string;
  search: string;
  hash: string;
  navSeq: number;
  isPop: boolean;
}

export interface NavigateOptions {
  noScroll?: boolean;
  replace?: boolean;
  forcePush?: boolean;
  scrollTop?: number;
  scrollToId?: string;
  initialViewState?: NavigationViewState;
}

interface NavStackItem {
  entryId: string;
  url: string;
}

interface NavStackState {
  items: NavStackItem[];
  index: number;
}

interface CrossRouterBridge {
  targetUrl: string;
  prevEntryId: string;
  prevUrl: string;
  createdAt: number;
}

interface ActiveOverlayEntry {
  overlayId: string;
  key: string;
  parentEntryId: string;
  onClose: () => void;
}

const STORAGE_KEY = '10ms_nav_snapshots_v1';
const STACK_STORAGE_KEY = '10ms_nav_stack_v1';
const BRIDGE_STORAGE_KEY = '10ms_nav_cross_bridge_v1';
const MAX_STORED_SNAPSHOTS = 60;
const MAX_STACK_ITEMS = 80;
const SCROLL_RESTORE_DELAYS_MS = [0, 16, 40, 85, 150, 250, 400, 620, 900];
const RESTORE_LOCK_MAX_MS = 1200;

let initialized = false;
let entryCounter = 0;
let overlayCounter = 0;
let navSeq = 0;
let isLastNavPop = false;
let currentEntryId = '__ssr__';
let currentHistoryOverlayId: string | null = null;
let activeRestoreToken = 0;
let scrollRestoreLockActive = false;
let scrollRestoreLockTargetY = 0;
let scrollRestoreStartedAt = 0;
let scrollRestoreAttempted = false;
let pendingScrollTimer: number | null = null;
let scrollLockReleaseTimer: number | null = null;
let scrollResizeObserver: ResizeObserver | null = null;
let scrollThrottleTimer: number | null = null;
let storageHydrated = false;
let stackHydrated = false;
let lastPopSignature = '';
let lastPopTimestamp = 0;

const snapshotsMap = new Map<string, NavigationSnapshot>();
const activeOverlays: ActiveOverlayEntry[] = [];
const subscribers = new Set<() => void>();
let navStack: NavStackState = { items: [], index: -1 };
let cachedClientSnapshot: NavigationLocationSnapshot | null = null;
const serverSnapshotCache = new Map<string, NavigationLocationSnapshot>();

// Ensure manual scroll restoration immediately at client module load
if (typeof window !== 'undefined') {
  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  } catch {
    // Ignore read-only scrollRestoration
  }
}

function safeDecodeSegment(raw: string): string {
  if (!raw) return '';
  let decoded = raw;
  for (let i = 0; i < 2; i += 1) {
    if (!decoded.includes('%')) break;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded.normalize('NFC');
}

export function normalizeUrlParts(rawUrl: string): {
  pathname: string;
  search: string;
  hash: string;
  decodedPathname: string;
  decodedKey: string;
  rawFullUrl: string;
} {
  const input = (rawUrl || '/').trim() || '/';
  let pathname = '/';
  let search = '';
  let hash = '';

  try {
    const baseOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
    const parsed = new URL(input, baseOrigin);
    pathname = parsed.pathname || '/';
    search = parsed.search || '';
    hash = parsed.hash || '';
  } catch {
    const [withoutHash, hashPart] = input.split('#');
    const [pathPart, searchPart] = (withoutHash || '/').split('?');
    pathname = pathPart ? (pathPart.startsWith('/') ? pathPart : `/${pathPart}`) : '/';
    search = searchPart ? `?${searchPart}` : '';
    hash = hashPart ? `#${hashPart}` : '';
  }

  const trimmedPath = pathname.replace(/\/+$/, '') || '/';
  const decodedPathname =
    trimmedPath
      .split('/')
      .map((seg) => safeDecodeSegment(seg))
      .join('/')
      .replace(/\/+$/, '') || '/';

  const decodedHash = hash ? `#${safeDecodeSegment(hash.slice(1))}` : '';
  const decodedKey = `${decodedPathname}${search}${decodedHash}`;
  const rawFullUrl = `${trimmedPath}${search}${hash}`;

  return {
    pathname: trimmedPath,
    search,
    hash,
    decodedPathname,
    decodedKey,
    rawFullUrl,
  };
}

function hydrateSnapshotsFromStorage(): void {
  if (storageHydrated || typeof window === 'undefined') return;
  storageHydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (item && typeof item.entryId === 'string' && item.entryId) {
        snapshotsMap.set(item.entryId, {
          entryId: item.entryId,
          url: typeof item.url === 'string' ? item.url : '/',
          scrollY:
            typeof item.scrollY === 'number' && Number.isFinite(item.scrollY)
              ? Math.max(0, item.scrollY)
              : 0,
          viewState:
            item.viewState && typeof item.viewState === 'object'
              ? { ...(item.viewState as NavigationViewState) }
              : {},
          updatedAt:
            typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)
              ? item.updatedAt
              : Date.now(),
        });
      }
    }
  } catch {
    // Ignore storage read errors in restricted contexts
  }
}

function persistSnapshotsToStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    if (snapshotsMap.size > MAX_STORED_SNAPSHOTS) {
      const sorted = Array.from(snapshotsMap.values()).sort((a, b) => a.updatedAt - b.updatedAt);
      const overflow = sorted.length - MAX_STORED_SNAPSHOTS;
      for (let i = 0; i < overflow; i += 1) {
        snapshotsMap.delete(sorted[i].entryId);
      }
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(snapshotsMap.values())));
  } catch {
    // Ignore quota / privacy mode errors
  }
}

function hydrateStackFromStorage(): void {
  if (stackHydrated || typeof window === 'undefined') return;
  stackHydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STACK_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<NavStackState> | null;
    if (!parsed || !Array.isArray(parsed.items)) return;
    const validItems = parsed.items.filter(
      (item): item is NavStackItem =>
        Boolean(item && typeof item.entryId === 'string' && typeof item.url === 'string')
    );
    const idx =
      typeof parsed.index === 'number' && Number.isFinite(parsed.index)
        ? Math.min(Math.max(-1, parsed.index), validItems.length - 1)
        : validItems.length - 1;
    navStack = { items: validItems, index: idx };
  } catch {
    // Ignore storage read errors
  }
}

function persistStackToStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    if (navStack.items.length > MAX_STACK_ITEMS) {
      const trimCount = navStack.items.length - MAX_STACK_ITEMS;
      navStack.items = navStack.items.slice(trimCount);
      navStack.index = Math.max(-1, navStack.index - trimCount);
    }
    window.sessionStorage.setItem(STACK_STORAGE_KEY, JSON.stringify(navStack));
  } catch {
    // Ignore storage write errors
  }
}

function pushStackEntry(entryId: string, url: string, replace = false): void {
  hydrateStackFromStorage();
  const normalizedUrl = normalizeUrlParts(url).rawFullUrl;

  if (navStack.items.length === 0 || navStack.index < 0) {
    navStack = { items: [{ entryId, url: normalizedUrl }], index: 0 };
    persistStackToStorage();
    return;
  }

  if (replace) {
    const nextItems = navStack.items.slice(0, navStack.index + 1);
    nextItems[navStack.index] = { entryId, url: normalizedUrl };
    navStack = { items: nextItems, index: navStack.index };
    persistStackToStorage();
    return;
  }

  const head = navStack.items.slice(0, navStack.index + 1);
  head.push({ entryId, url: normalizedUrl });
  navStack = { items: head, index: head.length - 1 };
  persistStackToStorage();
}

function syncStackIndexByEntryId(entryId: string, url?: string): number {
  hydrateStackFromStorage();
  const foundIdx = navStack.items.findIndex((item) => item.entryId === entryId);
  if (foundIdx !== -1) {
    navStack.index = foundIdx;
    if (url) {
      navStack.items[foundIdx].url = normalizeUrlParts(url).rawFullUrl;
    }
    persistStackToStorage();
    return foundIdx;
  }
  return -1;
}

function recoverMissingEntryIdFromStack(rawUrl: string): string | null {
  hydrateStackFromStorage();
  if (navStack.items.length === 0) return null;
  const targetKey = normalizeUrlParts(rawUrl).decodedKey;

  // Prefer scanning backwards from current index (typical Back navigation)
  const start = Math.min(navStack.index - 1, navStack.items.length - 1);
  for (let i = start; i >= 0; i -= 1) {
    if (normalizeUrlParts(navStack.items[i].url).decodedKey === targetKey) {
      navStack.index = i;
      persistStackToStorage();
      return navStack.items[i].entryId;
    }
  }

  // Fallback: check current or forward entries (e.g. Forward button or Next router.push state)
  for (let i = Math.max(0, navStack.index); i < navStack.items.length; i += 1) {
    if (normalizeUrlParts(navStack.items[i].url).decodedKey === targetKey) {
      navStack.index = i;
      persistStackToStorage();
      return navStack.items[i].entryId;
    }
  }

  return null;
}

function consumeCrossRouterBridge(rawUrl: string): CrossRouterBridge | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BRIDGE_STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(BRIDGE_STORAGE_KEY);
    const parsed = JSON.parse(raw) as CrossRouterBridge | null;
    if (!parsed || typeof parsed.targetUrl !== 'string') return null;
    if (Date.now() - (parsed.createdAt || 0) > 10000) return null;
    if (
      normalizeUrlParts(parsed.targetUrl).decodedKey !== normalizeUrlParts(rawUrl).decodedKey
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function recordCrossRouterBridge(targetUrl: string): void {
  if (typeof window === 'undefined') return;
  const prevId =
    currentEntryId && currentEntryId !== '__ssr__'
      ? currentEntryId
      : ensureCurrentHistoryEntry();
  const prevUrl = getCurrentBrowserRawUrl();
  try {
    const payload: CrossRouterBridge = {
      targetUrl: normalizeUrlParts(targetUrl).rawFullUrl,
      prevEntryId: prevId,
      prevUrl,
      createdAt: Date.now(),
    };
    window.sessionStorage.setItem(BRIDGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

function createNextEntryId(): string {
  entryCounter += 1;
  return `nav_${Date.now().toString(36)}_${entryCounter}`;
}

function createNextOverlayId(key: string): string {
  overlayCounter += 1;
  return `ovl_${key.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now().toString(36)}_${overlayCounter}`;
}

function getCurrentBrowserRawUrl(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname || '/'}${window.location.search || ''}${window.location.hash || ''}`;
}

function getOrCreateSnapshot(entryId: string, url?: string): NavigationSnapshot {
  hydrateSnapshotsFromStorage();
  const existing = snapshotsMap.get(entryId);
  if (existing) return existing;
  const created: NavigationSnapshot = {
    entryId,
    url: url || getCurrentBrowserRawUrl(),
    scrollY: 0,
    viewState: {},
    updatedAt: Date.now(),
  };
  snapshotsMap.set(entryId, created);
  return created;
}

function notifySubscribers(): void {
  for (const listener of subscribers) {
    try {
      listener();
    } catch {
      // Ignore individual subscriber errors
    }
  }
}

function clearPendingScrollThrottle(): void {
  if (scrollThrottleTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(scrollThrottleTimer);
    scrollThrottleTimer = null;
  }
}

function releaseScrollRestoreLock(): void {
  scrollRestoreLockActive = false;
  if (pendingScrollTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(pendingScrollTimer);
    pendingScrollTimer = null;
  }
  if (scrollLockReleaseTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(scrollLockReleaseTimer);
    scrollLockReleaseTimer = null;
  }
  if (scrollResizeObserver) {
    scrollResizeObserver.disconnect();
    scrollResizeObserver = null;
  }
}

function cancelScheduledScrollRestore(): void {
  activeRestoreToken += 1;
  releaseScrollRestoreLock();
}

function applyInstantScrollTop(targetY: number): number {
  if (typeof window === 'undefined') return 0;
  const htmlEl = document.documentElement;
  const docHeight = Math.max(htmlEl?.scrollHeight || 0, document.body?.scrollHeight || 0);
  const maxScrollable = Math.max(0, docHeight - window.innerHeight);
  const clampedTarget = Math.max(0, Math.round(targetY));
  const safeTarget = clampedTarget === 0 ? 0 : Math.min(clampedTarget, maxScrollable);

  // Override `html { scroll-behavior: smooth }` so programmatic restoration is instant & exact
  const prevInlineScrollBehavior = htmlEl ? htmlEl.style.scrollBehavior : '';
  if (htmlEl) {
    htmlEl.style.scrollBehavior = 'auto';
  }
  try {
    window.scrollTo({ top: safeTarget, left: window.scrollX || 0, behavior: 'auto' });
    if (htmlEl && Math.abs((window.scrollY || 0) - safeTarget) > 2) {
      htmlEl.scrollTop = safeTarget;
    }
  } finally {
    if (htmlEl) {
      htmlEl.style.scrollBehavior = prevInlineScrollBehavior;
    }
  }

  return maxScrollable;
}

function scheduleScrollRestore(targetY: number): void {
  if (typeof window === 'undefined') return;
  cancelScheduledScrollRestore();
  clearPendingScrollThrottle();

  const token = activeRestoreToken;
  const clampedTarget = Math.max(0, Math.round(targetY));

  scrollRestoreLockActive = true;
  scrollRestoreLockTargetY = clampedTarget;
  scrollRestoreStartedAt =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  scrollRestoreAttempted = false;

  const isScrollSettled = (maxScrollable: number): boolean => {
    const curY = window.scrollY || 0;
    if (clampedTarget === 0) {
      return curY <= 2;
    }
    return maxScrollable >= clampedTarget - 4 && Math.abs(curY - clampedTarget) <= 4;
  };

  const applyOnce = (): boolean => {
    if (token !== activeRestoreToken) return true;
    scrollRestoreAttempted = true;
    const maxScrollable = applyInstantScrollTop(clampedTarget);
    const settled = isScrollSettled(maxScrollable);
    const elapsed =
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
      scrollRestoreStartedAt;

    // Keep lock at least briefly (~260ms) so Next.js startTransition & FocusHandler cannot reset scroll to 0
    if (settled && elapsed >= 260) {
      releaseScrollRestoreLock();
      return true;
    }
    return false;
  };

  // Immediate microtask + rAF passes
  queueMicrotask(() => {
    if (token !== activeRestoreToken) return;
    applyOnce();
  });

  // Watch dynamic DOM height changes (Next startTransition commit, .cv-auto sections, lazy images)
  if (typeof ResizeObserver !== 'undefined' && document.body && clampedTarget > 0) {
    try {
      scrollResizeObserver = new ResizeObserver(() => {
        if (token !== activeRestoreToken) return;
        applyOnce();
      });
      scrollResizeObserver.observe(document.body);
      if (document.documentElement) {
        scrollResizeObserver.observe(document.documentElement);
      }
    } catch {
      // Ignore ResizeObserver errors
    }
  }

  const runAttempt = (attemptIdx: number) => {
    if (token !== activeRestoreToken) return;

    const execute = () => {
      if (token !== activeRestoreToken) return;
      const done = applyOnce();
      if (!done && attemptIdx + 1 < SCROLL_RESTORE_DELAYS_MS.length) {
        const nextDelay = SCROLL_RESTORE_DELAYS_MS[attemptIdx + 1];
        pendingScrollTimer = window.setTimeout(() => {
          runAttempt(attemptIdx + 1);
        }, nextDelay);
      }
    };

    if (attemptIdx === 0) {
      window.requestAnimationFrame(() => {
        if (token !== activeRestoreToken) return;
        applyOnce();
        window.requestAnimationFrame(execute);
      });
    } else {
      execute();
    }
  };

  runAttempt(0);

  // Guaranteed safety release of scroll lock after max restoration window
  scrollLockReleaseTimer = window.setTimeout(() => {
    if (token === activeRestoreToken) {
      applyOnce();
      releaseScrollRestoreLock();
    }
  }, RESTORE_LOCK_MAX_MS);
}

export function flushCurrentScrollPosition(options?: { force?: boolean }): void {
  if (typeof window === 'undefined') return;
  if (!options?.force && (scrollRestoreLockActive || activeOverlays.length > 0)) {
    return;
  }

  hydrateSnapshotsFromStorage();
  if (!currentEntryId || currentEntryId === '__ssr__') {
    const stateId =
      window.history.state && typeof window.history.state.__appNavEntryId === 'string'
        ? window.history.state.__appNavEntryId
        : null;
    if (stateId) {
      currentEntryId = stateId;
    } else {
      return;
    }
  }

  const snap = getOrCreateSnapshot(currentEntryId);
  const nextY = Math.max(0, window.scrollY || 0);
  // Extra guard: if target restore just ended with a transient 0 while document height collapsed, skip 0 overwrite
  if (!options?.force && scrollRestoreLockActive && nextY === 0 && scrollRestoreLockTargetY > 0) {
    return;
  }

  snap.scrollY = nextY;
  snap.url = getCurrentBrowserRawUrl();
  snap.updatedAt = Date.now();
  persistSnapshotsToStorage();
}

function attachEntryIdToHistoryState(entryId: string): void {
  if (typeof window === 'undefined') return;
  const existingState =
    window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
  if (existingState.__appNavEntryId === entryId) return;

  try {
    window.history.replaceState(
      {
        ...existingState,
        __appNavEntryId: entryId,
      },
      '',
      window.location.href
    );
  } catch {
    // Ignore history replace errors
  }
}

function closeOverlaysInMemoryOnly(onlyAboveOverlayId?: string | null): void {
  if (activeOverlays.length === 0) return;
  const toClose: ActiveOverlayEntry[] = [];
  if (onlyAboveOverlayId) {
    while (activeOverlays.length > 0) {
      const top = activeOverlays[activeOverlays.length - 1];
      if (top.overlayId === onlyAboveOverlayId) break;
      activeOverlays.pop();
      toClose.push(top);
    }
  } else {
    while (activeOverlays.length > 0) {
      const top = activeOverlays.pop();
      if (top) toClose.push(top);
    }
  }
  for (const ovl of toClose) {
    try {
      ovl.onClose();
    } catch {
      // Ignore overlay close callback error
    }
  }
}

export function ensureCurrentHistoryEntry(): string {
  if (typeof window === 'undefined') return '__ssr__';
  hydrateSnapshotsFromStorage();
  hydrateStackFromStorage();

  if (!initialized) {
    initialized = true;
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {
      // Ignore read-only scrollRestoration
    }

    const handleWheelCancel = () => {
      if (scrollRestoreLockActive) {
        cancelScheduledScrollRestore();
      }
    };
    const handleTouchMoveCancel = () => {
      if (!scrollRestoreLockActive) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      // Ignore trailing touchmove from mobile edge-swipe / hardware Back gestures during initial 200ms
      if (scrollRestoreAttempted && now - scrollRestoreStartedAt > 200) {
        cancelScheduledScrollRestore();
      }
    };
    const handleScrollUpdate = () => {
      if (scrollRestoreLockActive || activeOverlays.length > 0) return;
      if (scrollThrottleTimer !== null) return;
      scrollThrottleTimer = window.setTimeout(() => {
        scrollThrottleTimer = null;
        flushCurrentScrollPosition();
      }, 100);
    };
    const handleLifecycleFlush = () => {
      if (!scrollRestoreLockActive && activeOverlays.length === 0) {
        flushCurrentScrollPosition();
      }
    };
    const handlePopOrHash = (event?: Event) => {
      const rawUrl = getCurrentBrowserRawUrl();
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const stateObj =
        event && 'state' in event ? (event as PopStateEvent).state : window.history.state;
      const stateEntryId =
        stateObj && typeof stateObj.__appNavEntryId === 'string'
          ? stateObj.__appNavEntryId
          : null;
      const stateOverlayId =
        stateObj && typeof stateObj.__appOverlayId === 'string'
          ? stateObj.__appOverlayId
          : null;

      // Ignore duplicate hashchange immediately emitted by browsers right after popstate
      const sig = `${stateEntryId || ''}|${stateOverlayId || ''}|${rawUrl}`;
      if (event?.type === 'hashchange' && sig === lastPopSignature && now - lastPopTimestamp < 160) {
        return;
      }
      if (
        event?.type === 'hashchange' &&
        stateEntryId &&
        stateEntryId === currentEntryId &&
        isLastNavPop
      ) {
        return;
      }
      lastPopSignature = sig;
      lastPopTimestamp = now;

      // 1. Intercept synthetic overlay back navigation (Modal / Drawer / Mobile Sheet)
      const hadUiOverlayOpen = activeOverlays.some(
        (item) => item.overlayId === currentHistoryOverlayId
      );
      const hadActiveOverlay =
        currentHistoryOverlayId !== null || activeOverlays.length > 0;
      const isSameBaseEntry =
        !stateEntryId || stateEntryId === currentEntryId;
      if (
        hadActiveOverlay &&
        stateOverlayId !== currentHistoryOverlayId &&
        isSameBaseEntry
      ) {
        closeOverlaysInMemoryOnly(stateOverlayId);
        currentHistoryOverlayId = stateOverlayId;

        if (hadUiOverlayOpen) {
          const baseSnap = snapshotsMap.get(currentEntryId);
          const expectedScrollY = baseSnap?.scrollY ?? 0;
          if (expectedScrollY > 0 && Math.abs((window.scrollY || 0) - expectedScrollY) > 6) {
            scheduleScrollRestore(expectedScrollY);
          }
        }
        return;
      }

      // 2. Full route / hash pop navigation
      closeOverlaysInMemoryOnly(stateOverlayId);
      currentHistoryOverlayId = stateOverlayId;
      clearPendingScrollThrottle();

      let resolvedId = stateEntryId;
      if (!resolvedId) {
        resolvedId = recoverMissingEntryIdFromStack(rawUrl);
        if (!resolvedId) {
          resolvedId = createNextEntryId();
        }
        attachEntryIdToHistoryState(resolvedId);
      }

      if (syncStackIndexByEntryId(resolvedId, rawUrl) === -1) {
        pushStackEntry(resolvedId, rawUrl, false);
      }

      const snap = getOrCreateSnapshot(resolvedId, rawUrl);
      const targetScrollY = snap.scrollY || 0;

      // Engage scroll lock BEFORE updating currentEntryId & notifying React subscribers
      currentEntryId = resolvedId;
      isLastNavPop = true;
      navSeq += 1;

      scheduleScrollRestore(targetScrollY);
      notifySubscribers();
    };

    window.addEventListener('popstate', handlePopOrHash);
    window.addEventListener('hashchange', handlePopOrHash);
    window.addEventListener('scroll', handleScrollUpdate, { passive: true });
    window.addEventListener('pagehide', handleLifecycleFlush);
    window.addEventListener('beforeunload', handleLifecycleFlush);
    window.addEventListener('wheel', handleWheelCancel, { passive: true });
    window.addEventListener('touchmove', handleTouchMoveCancel, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (
        scrollRestoreLockActive &&
        (e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          e.key === 'PageDown' ||
          e.key === 'PageUp' ||
          e.key === ' ')
      ) {
        cancelScheduledScrollRestore();
      }
    });
  }

  const rawUrl = getCurrentBrowserRawUrl();
  const stateObj =
    window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : null;
  const stateId =
    stateObj && typeof stateObj.__appNavEntryId === 'string'
      ? stateObj.__appNavEntryId
      : null;
  const stateOverlayId =
    stateObj && typeof stateObj.__appOverlayId === 'string'
      ? stateObj.__appOverlayId
      : null;
  currentHistoryOverlayId = stateOverlayId;

  const bridge = consumeCrossRouterBridge(rawUrl);

  if (stateId) {
    const existingSnap = snapshotsMap.get(stateId);
    currentEntryId = stateId;
    if (syncStackIndexByEntryId(stateId, rawUrl) === -1) {
      pushStackEntry(stateId, rawUrl, false);
    }
    if (existingSnap) {
      if (existingSnap.scrollY > 0 && Math.abs((window.scrollY || 0) - existingSnap.scrollY) > 6) {
        scheduleScrollRestore(existingSnap.scrollY);
      }
    } else {
      getOrCreateSnapshot(stateId, rawUrl);
      persistSnapshotsToStorage();
    }
    return stateId;
  }

  // If Next.js router.push stripped __appNavEntryId during cross-segment transition (/admin <-> public)
  let resolvedInitialId: string | null = null;
  if (bridge && bridge.prevEntryId) {
    syncStackIndexByEntryId(bridge.prevEntryId, bridge.prevUrl);
    resolvedInitialId = createNextEntryId();
    pushStackEntry(resolvedInitialId, rawUrl, false);
  } else {
    resolvedInitialId = recoverMissingEntryIdFromStack(rawUrl);
  }

  if (!resolvedInitialId) {
    resolvedInitialId = createNextEntryId();
    pushStackEntry(resolvedInitialId, rawUrl, false);
  }

  currentEntryId = resolvedInitialId;
  attachEntryIdToHistoryState(resolvedInitialId);
  const snap = getOrCreateSnapshot(resolvedInitialId, rawUrl);
  persistSnapshotsToStorage();

  if (snap.scrollY > 0 && Math.abs((window.scrollY || 0) - snap.scrollY) > 6) {
    scheduleScrollRestore(snap.scrollY);
  }

  notifySubscribers();
  return resolvedInitialId;
}

export function replaceCurrentUrlPreserveEntry(fullUrl: string): void {
  if (typeof window === 'undefined') return;
  const entryId = ensureCurrentHistoryEntry();
  const targetParts = normalizeUrlParts(fullUrl);
  const existingState =
    window.history.state && typeof window.history.state === 'object' ? window.history.state : {};

  try {
    window.history.replaceState(
      {
        ...existingState,
        __appNavEntryId: entryId,
      },
      '',
      targetParts.rawFullUrl
    );
  } catch {
    // Ignore history replace errors
  }

  const snap = getOrCreateSnapshot(entryId, targetParts.rawFullUrl);
  snap.url = targetParts.rawFullUrl;
  snap.updatedAt = Date.now();
  persistSnapshotsToStorage();

  hydrateStackFromStorage();
  if (navStack.index >= 0 && navStack.items[navStack.index]?.entryId === entryId) {
    navStack.items[navStack.index].url = targetParts.rawFullUrl;
    persistStackToStorage();
  }
}

export function canGoBackInApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (activeOverlays.length > 0 || currentHistoryOverlayId !== null) return true;
  hydrateStackFromStorage();
  return navStack.index > 0;
}

export function getPreviousHistoryUrl(): string | null {
  if (typeof window === 'undefined') return null;
  hydrateStackFromStorage();
  if (navStack.index > 0) {
    return navStack.items[navStack.index - 1]?.url || null;
  }
  return null;
}

export function navigateBack(fallbackUrl = '/'): void {
  if (typeof window === 'undefined') return;
  if (canGoBackInApp()) {
    window.history.back();
    return;
  }
  navigateHistory(fallbackUrl);
}

export function navigateHistory(fullUrl: string, options?: NavigateOptions): string {
  if (typeof window === 'undefined') return '__ssr__';

  const prevId = ensureCurrentHistoryEntry();

  // Check if navigating directly from an active modal / drawer / mobile sheet overlay
  const hadActiveOverlay =
    activeOverlays.length > 0 ||
    Boolean(window.history.state && window.history.state.__appOverlayId);

  if (!hadActiveOverlay) {
    flushCurrentScrollPosition({ force: true });
  } else {
    closeOverlaysInMemoryOnly();
    currentHistoryOverlayId = null;
  }

  const currentParts = normalizeUrlParts(getCurrentBrowserRawUrl());
  const targetParts = normalizeUrlParts(fullUrl);
  const isSameTarget = currentParts.decodedKey === targetParts.decodedKey;

  cancelScheduledScrollRestore();
  clearPendingScrollThrottle();

  if (isSameTarget && !options?.forcePush) {
    if (options?.initialViewState) {
      const snap = getOrCreateSnapshot(prevId, targetParts.rawFullUrl);
      snap.viewState = { ...snap.viewState, ...options.initialViewState };
      snap.updatedAt = Date.now();
      persistSnapshotsToStorage();
      isLastNavPop = false;
      navSeq += 1;
      notifySubscribers();
    }

    // If an overlay entry was active on top of this same URL, pop the synthetic overlay entry cleanly
    if (hadActiveOverlay && window.history.state?.__appOverlayId) {
      window.history.back();
    }

    if (options?.scrollToId) {
      window.setTimeout(() => {
        const el = document.getElementById(options.scrollToId!);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 65);
    } else if (typeof options?.scrollTop === 'number') {
      window.scrollTo({ top: options.scrollTop, behavior: 'smooth' });
    } else if (!options?.noScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return prevId;
  }

  const shouldReplaceSyntheticOverlay =
    hadActiveOverlay && Boolean(window.history.state?.__appOverlayId);
  const nextId = options?.replace ? prevId : createNextEntryId();
  const initialScroll = options?.noScroll
    ? Math.max(0, window.scrollY || 0)
    : typeof options?.scrollTop === 'number'
      ? Math.max(0, options.scrollTop)
      : 0;

  snapshotsMap.set(nextId, {
    entryId: nextId,
    url: targetParts.rawFullUrl,
    scrollY: initialScroll,
    viewState: options?.initialViewState ? { ...options.initialViewState } : {},
    updatedAt: Date.now(),
  });
  persistSnapshotsToStorage();

  if (options?.replace) {
    pushStackEntry(nextId, targetParts.rawFullUrl, true);
  } else {
    // Keep parent entry intact in navStack even when replacing synthetic overlay entry in browser history
    pushStackEntry(nextId, targetParts.rawFullUrl, false);
  }

  currentEntryId = nextId;
  isLastNavPop = false;
  navSeq += 1;

  // Omit __NA so Next.js AppRouter's patched pushState/replaceState copies __NA & updates usePathname()
  const nextHistoryData = { __appNavEntryId: nextId };
  if (options?.replace || shouldReplaceSyntheticOverlay) {
    window.history.replaceState(nextHistoryData, '', targetParts.rawFullUrl);
  } else {
    window.history.pushState(nextHistoryData, '', targetParts.rawFullUrl);
  }

  notifySubscribers();

  if (options?.scrollToId) {
    const targetScrollId = options.scrollToId;
    window.setTimeout(() => {
      const el = document.getElementById(targetScrollId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 65);
  } else if (typeof options?.scrollTop === 'number') {
    window.scrollTo({ top: options.scrollTop, behavior: 'smooth' });
  } else if (!options?.noScroll) {
    applyInstantScrollTop(0);
  }

  return nextId;
}

function pushOverlayEntry(key: string, onClose: () => void): string {
  if (typeof window === 'undefined') return '';
  const parentId = ensureCurrentHistoryEntry();
  flushCurrentScrollPosition({ force: true });
  cancelScheduledScrollRestore();

  const overlayId = createNextOverlayId(key);
  activeOverlays.push({
    overlayId,
    key,
    parentEntryId: parentId,
    onClose,
  });
  currentHistoryOverlayId = overlayId;

  const sameRawUrl = getCurrentBrowserRawUrl();
  try {
    // Omit __NA so Next.js AppRouter's patched pushState copies __NA & tree cleanly
    window.history.pushState(
      {
        __appNavEntryId: parentId,
        __appOverlayId: overlayId,
        __appOverlayKey: key,
      },
      '',
      sameRawUrl
    );
  } catch {
    // Ignore history push errors
  }

  return overlayId;
}

function dismissOverlayEntry(overlayId: string): void {
  if (typeof window === 'undefined' || !overlayId) return;
  const idx = activeOverlays.findIndex((item) => item.overlayId === overlayId);
  if (idx === -1) {
    // Already dismissed via popstate or route navigation
    return;
  }

  activeOverlays.splice(idx, 1);

  const curStateOverlayId =
    window.history.state && typeof window.history.state.__appOverlayId === 'string'
      ? window.history.state.__appOverlayId
      : null;

  if (curStateOverlayId === overlayId) {
    window.history.back();
  } else if (currentHistoryOverlayId === overlayId) {
    currentHistoryOverlayId =
      activeOverlays.length > 0
        ? activeOverlays[activeOverlays.length - 1].overlayId
        : null;
  }
}

export function useHistoryOverlay(
  overlayKey: string,
  isOpen: boolean,
  onClose: () => void
): void {
  const overlayIdRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isOpen) {
      if (!overlayIdRef.current) {
        overlayIdRef.current = pushOverlayEntry(overlayKey, () => {
          onCloseRef.current();
        });
      }
      return;
    }

    if (overlayIdRef.current) {
      const id = overlayIdRef.current;
      overlayIdRef.current = null;
      dismissOverlayEntry(id);
    }
  }, [isOpen, overlayKey]);

  useEffect(() => {
    return () => {
      if (overlayIdRef.current) {
        const id = overlayIdRef.current;
        overlayIdRef.current = null;
        dismissOverlayEntry(id);
      }
    };
  }, []);
}

export function subscribeNavigation(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function getServerNavigationSnapshot(ssrPathname = '/'): NavigationLocationSnapshot {
  const norm = normalizeUrlParts(ssrPathname || '/');
  const key = norm.decodedPathname;
  let cached = serverSnapshotCache.get(key);
  if (!cached) {
    cached = {
      entryId: '__ssr__',
      pathname: norm.decodedPathname,
      search: '',
      hash: '',
      navSeq: 0,
      isPop: false,
    };
    serverSnapshotCache.set(key, cached);
  }
  return cached;
}

export function getClientNavigationSnapshot(fallbackPathname = '/'): NavigationLocationSnapshot {
  if (typeof window === 'undefined') {
    return getServerNavigationSnapshot(fallbackPathname);
  }

  hydrateSnapshotsFromStorage();

  const stateEntryId =
    window.history.state && typeof window.history.state.__appNavEntryId === 'string'
      ? window.history.state.__appNavEntryId
      : currentEntryId !== '__ssr__'
        ? currentEntryId
        : '__initial__';

  const parts = normalizeUrlParts(getCurrentBrowserRawUrl());
  const nextHash = parts.hash ? `#${safeDecodeSegment(parts.hash.slice(1))}` : '';

  if (
    cachedClientSnapshot &&
    cachedClientSnapshot.entryId === stateEntryId &&
    cachedClientSnapshot.pathname === parts.decodedPathname &&
    cachedClientSnapshot.search === parts.search &&
    cachedClientSnapshot.hash === nextHash &&
    cachedClientSnapshot.navSeq === navSeq &&
    cachedClientSnapshot.isPop === isLastNavPop
  ) {
    return cachedClientSnapshot;
  }

  cachedClientSnapshot = {
    entryId: stateEntryId,
    pathname: parts.decodedPathname,
    search: parts.search,
    hash: nextHash,
    navSeq,
    isPop: isLastNavPop,
  };
  return cachedClientSnapshot;
}

export function useNavigationLocation(ssrPathname = '/'): NavigationLocationSnapshot {
  const getClient = useCallback(
    () => getClientNavigationSnapshot(ssrPathname),
    [ssrPathname]
  );
  const getServer = useCallback(
    () => getServerNavigationSnapshot(ssrPathname),
    [ssrPathname]
  );
  return useSyncExternalStore(subscribeNavigation, getClient, getServer);
}

export function getEntrySavedScrollY(entryId: string): number {
  if (typeof window === 'undefined' || !entryId || entryId === '__ssr__' || entryId === '__initial__') {
    return 0;
  }
  hydrateSnapshotsFromStorage();
  return snapshotsMap.get(entryId)?.scrollY ?? 0;
}

export function getEntryViewStateValue<K extends keyof NavigationViewState>(
  entryId: string,
  key: K,
  fallback: NonNullable<NavigationViewState[K]>
): NonNullable<NavigationViewState[K]> {
  if (!entryId || entryId === '__ssr__' || entryId === '__initial__') return fallback;
  hydrateSnapshotsFromStorage();
  const snap = snapshotsMap.get(entryId);
  const val = snap?.viewState?.[key];
  return (val !== undefined ? val : fallback) as NonNullable<NavigationViewState[K]>;
}

export function updateEntryViewState(
  entryId: string,
  patch: Partial<NavigationViewState>,
  options?: { notify?: boolean }
): void {
  if (typeof window === 'undefined' || !entryId || entryId === '__ssr__') return;
  const resolvedId =
    entryId === '__initial__' ? ensureCurrentHistoryEntry() : entryId;
  const snap = getOrCreateSnapshot(resolvedId);
  snap.viewState = { ...snap.viewState, ...patch };
  snap.updatedAt = Date.now();
  persistSnapshotsToStorage();
  if (options?.notify) {
    navSeq += 1;
    notifySubscribers();
  }
}

export function useHistoryViewState<K extends keyof NavigationViewState>(
  key: K,
  fallback: NonNullable<NavigationViewState[K]>,
  scopeKey = ''
): [
  NonNullable<NavigationViewState[K]>,
  (
    next:
      | NonNullable<NavigationViewState[K]>
      | ((prev: NonNullable<NavigationViewState[K]>) => NonNullable<NavigationViewState[K]>)
  ) => void,
] {
  const navLoc = useNavigationLocation();
  const fullScope = `${navLoc.entryId}|${navLoc.navSeq}|${scopeKey}`;

  const [override, setOverride] = useState<{
    scope: string;
    value: NonNullable<NavigationViewState[K]>;
  } | null>(null);

  const restored = getEntryViewStateValue(navLoc.entryId, key, fallback);
  const effectiveValue =
    override && override.scope === fullScope ? override.value : restored;

  const setValue = useCallback(
    (
      next:
        | NonNullable<NavigationViewState[K]>
        | ((prev: NonNullable<NavigationViewState[K]>) => NonNullable<NavigationViewState[K]>)
    ) => {
      const activeId =
        navLoc.entryId === '__ssr__' || navLoc.entryId === '__initial__'
          ? ensureCurrentHistoryEntry()
          : navLoc.entryId;
      const baseVal =
        override && override.scope === fullScope
          ? override.value
          : getEntryViewStateValue(activeId, key, fallback);
      const resolved =
        typeof next === 'function'
          ? (
              next as (
                prev: NonNullable<NavigationViewState[K]>
              ) => NonNullable<NavigationViewState[K]>
            )(baseVal)
          : next;
      setOverride({ scope: fullScope, value: resolved });
      updateEntryViewState(activeId, { [key]: resolved } as Partial<NavigationViewState>);
    },
    [navLoc.entryId, fullScope, override, key, fallback]
  );

  return useMemo(() => [effectiveValue, setValue], [effectiveValue, setValue]);
}
