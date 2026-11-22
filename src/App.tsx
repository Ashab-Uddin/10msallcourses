'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ensureCurrentHistoryEntry,
  getEntrySavedScrollY,
  navigateBack,
  navigateHistory,
  normalizeUrlParts,
  replaceCurrentUrlPreserveEntry,
  useHistoryViewState,
  useNavigationLocation,
  type NavigateOptions,
} from './lib/navigationHistory.ts';
import { AdminOverviewData, Book, BookCategory, Category, Course, OfferTimer, SiteSettings } from './types.ts';
import { buildAffiliateRedirectUrl } from './lib/affiliateUrl.ts';
import { CourseCard } from './components/public/CourseCard.tsx';
import { MobileCategoryCarousel } from './components/public/MobileCategoryCarousel.tsx';
import { PathwaysSection } from './components/public/PathwaysSection.tsx';
import { HeroOfferCountdown } from './components/public/HeroOfferCountdown.tsx';
import { MobileBottomNav, MobileTab } from './components/public/MobileBottomNav.tsx';
import { HeaderNav } from './components/public/HeaderNav.tsx';
import { AcademicPage, type AcademicLevel } from './components/public/AcademicPage.tsx';
import { CategoryPage } from './components/public/CategoryPage.tsx';
import { CourseSharePage } from './components/public/CourseSharePage.tsx';
import { BookStorePage } from './components/public/BookStorePage.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminSessionVerifyingSkeleton } from './components/admin/AdminSkeletons.tsx';
import { ClassSelectorStrip } from './components/public/ClassSelectorStrip.tsx';
import { GlassAmbientBackdrop } from './components/public/GlassAmbientBackdrop.tsx';
import { FloatingContactWidget } from './components/public/FloatingContactWidget.tsx';
import { SiteFooter } from './components/public/SiteFooter.tsx';
import { SiteContactProvider } from './components/public/SiteContactContext.tsx';
import { toBengaliNumber } from './utils/format.ts';
import {
  normalizeSelectorIconLabels,
  normalizeSelectorIconOrder,
  type SelectorIconId,
  type SelectorIconLabelsMap,
  type SelectorIconText,
} from './lib/selectorIconOrder.ts';
import {
  CLASS_BENGALI_ORDINALS,
  categorySlugsMatch,
  courseMatchesCategorySlug,
  getCourseCategorySlugs,
} from './lib/categoryMatching.ts';
import {
  normalizeCategoryCourseOrders,
  sortCoursesForCategory,
  type CategoryCourseOrdersMap,
} from './lib/courseSorting.ts';
import {
  buildReadableCategoryPath,
  buildReadableCoursePath,
  decodeCourseSlug,
  generateUnicodeCourseSlug,
  isReservedCategorySlug,
} from './lib/courseSlug.ts';
import {
  inferCategoryNavGroup,
  resolveCategoryNavGroup,
} from './lib/navbarCategories.ts';
import {
  AlertCircle,
  ChevronRight,
  GraduationCap,
  RefreshCw,
  SearchX,
  Headphones,
  Phone,
  X,
} from 'lucide-react';

const AdminDashboard = dynamic(
  () => import('./components/admin/AdminDashboard.tsx').then((m) => m.AdminDashboard),
  {
    ssr: false,
    loading: () => <AdminSessionVerifyingSkeleton />,
  }
);

export interface AppProps {
  initialCategories?: Category[];
  initialCourses?: Course[];
  initialSettings?: SiteSettings | null;
  initialOfferTimers?: OfferTimer[];
  initialHasOfferTimers?: boolean;
  initialSelectorIconOrder?: SelectorIconId[];
  initialSelectorIconLabels?: Partial<Record<SelectorIconId, SelectorIconText>>;
  initialCategoryCourseOrders?: CategoryCourseOrdersMap;
  initialServerNow?: string;
  initialBookCategories?: BookCategory[];
  initialBooks?: Book[];
}

type RouteState =
  | { view: 'home' }
  | { view: 'course'; slug: string }
  | { view: 'bookstore'; categorySlug?: string }
  | { view: 'category'; slug: string; subFilter?: string }
  | { view: 'academic'; level: AcademicLevel; batchOrClass: string; sectionHash?: string }
  | { view: 'admin_login' }
  | { view: 'admin_dashboard' };

const VIRTUAL_ROOT_CATEGORY_SLUGS = new Set([
  'language-learning',
  'skills',
  'admission',
  'free-course',
  'free',
  'free-courses',
  'hsc-28',
  'hsc-27',
  'school',
]);

function parseCurrentRoute(
  pathname: string,
  hash?: string,
  categories: Category[] = []
): RouteState {
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login' || pathname === '/admin/login/') {
      return { view: 'admin_login' };
    }
    return { view: 'admin_dashboard' };
  }

  // Normalize path without trailing slashes
  const clean = pathname.replace(/\/+$/, '') || '/';
  const cleanHash = (hash || '').replace('#', '');

  // 1. Language Learning: /language-learning (plus legacy /categories/language-learning or /category/language-learning)
  if (
    clean === '/language-learning' ||
    clean === '/categories/language-learning' ||
    clean === '/category/language-learning'
  ) {
    return { view: 'category', slug: 'language-learning' };
  }

  // 2. Skills: /skills/ or /category/skills/ or /categories/skills/
  if (clean === '/skills' || clean === '/category/skills' || clean === '/categories/skills') {
    return { view: 'category', slug: 'skills' };
  }

  // 3. Admission: /admission/ or /category/admission/
  if (clean === '/admission' || clean === '/category/admission' || clean === '/categories/admission') {
    return { view: 'category', slug: 'admission' };
  }

  // 3b. Free Course: /free-course, /free, /free-courses, /category/free-course
  if (
    clean === '/free-course' ||
    clean === '/free' ||
    clean === '/free-courses' ||
    clean === '/category/free-course' ||
    clean === '/categories/free-course'
  ) {
    return { view: 'category', slug: 'free-course' };
  }

  // 4. Book Store: /books, /book-store, /books/:categorySlug, /category/books
  if (
    clean === '/books' ||
    clean === '/book-store' ||
    clean === '/category/books' ||
    clean === '/categories/books'
  ) {
    return { view: 'bookstore' };
  }
  if (clean.startsWith('/books/')) {
    const rawBookCatSlug = clean.slice('/books/'.length).split('/')[0] || '';
    const bookCatSlug = decodeCourseSlug(rawBookCatSlug).normalize('NFC');
    return { view: 'bookstore', categorySlug: bookCatSlug || undefined };
  }

  // 5. HSC Dedicated Routes: /hsc/hsc-26/, /hsc/hsc-27/, /hsc/hsc-28/ (plus legacy support)
  if (clean === '/hsc/hsc-26' || clean === '/academic/hsc/hsc-26') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-26', sectionHash: cleanHash };
  }
  if (clean === '/hsc/hsc-27' || clean === '/academic/hsc/hsc-27') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-27', sectionHash: cleanHash };
  }
  if (clean === '/hsc/hsc-28' || clean === '/academic/hsc/hsc-28') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-28', sectionHash: cleanHash };
  }
  if (clean === '/hsc' || clean === '/academic/hsc') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-28', sectionHash: cleanHash };
  }

  // 6. SSC Routes: /ssc/ssc-27/ (দশম শ্রেণি), /ssc/ssc-28/ (নবম শ্রেণি)
  if (
    clean === '/ssc/ssc-27' ||
    clean === '/academic/ssc/ssc-27' ||
    clean === '/class-10' ||
    clean === '/academic/class-10'
  ) {
    return { view: 'academic', level: 'ssc', batchOrClass: 'ssc-27', sectionHash: cleanHash };
  }
  if (
    clean === '/ssc/ssc-28' ||
    clean === '/academic/ssc/ssc-28' ||
    clean === '/class-9' ||
    clean === '/academic/class-9'
  ) {
    return { view: 'academic', level: 'ssc', batchOrClass: 'ssc-28', sectionHash: cleanHash };
  }
  if (clean === '/ssc' || clean === '/academic/ssc') {
    return { view: 'academic', level: 'ssc', batchOrClass: 'ssc-27', sectionHash: cleanHash };
  }

  // 7. Junior School Classes: /class-5/, /class-6/, /class-7/, /class-8/
  const classMatch = clean.match(/^\/(?:academic\/)?class-?([5-8])$/);
  if (classMatch) {
    return { view: 'academic', level: 'class', batchOrClass: `class${classMatch[1]}`, sectionHash: cleanHash };
  }

  // Generic category path: /category/:slug
  if (clean.startsWith('/category/') || clean.startsWith('/categories/')) {
    const parts = clean.split('/').filter(Boolean);
    const slug = decodeCourseSlug(parts[1] || '').normalize('NFC');
    if (slug) {
      return { view: 'category', slug };
    }
  }

  // Dedicated shared course landing page: /courses/:slug
  if (clean.startsWith('/courses/')) {
    const rawSlug = clean.slice('/courses/'.length).split('/')[0] || '';
    const cleanCourseSlug = decodeCourseSlug(rawSlug);
    if (cleanCourseSlug) {
      return { view: 'course', slug: cleanCourseSlug };
    }
    return { view: 'home' };
  }

  if (clean === '/academic') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-28' };
  }

  // Root-level dynamic category route: /:slug (e.g. /hsc-28-science)
  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 1) {
    const rawSlug = segments[0] || '';
    const decodedSlug = decodeCourseSlug(rawSlug).normalize('NFC');
    if (
      decodedSlug &&
      !isReservedCategorySlug(decodedSlug) &&
      !/\.[a-z0-9]{1,8}$/i.test(decodedSlug)
    ) {
      const matchedCat = categories.find((c) => categorySlugsMatch(c.slug, decodedSlug));
      if (matchedCat) {
        return { view: 'category', slug: matchedCat.slug };
      }
      if (
        VIRTUAL_ROOT_CATEGORY_SLUGS.has(decodedSlug.toLowerCase()) ||
        categories.length === 0
      ) {
        return { view: 'category', slug: decodedSlug };
      }
    }
  }

  return { view: 'home' };
}

function cleanFdProcessedAttrs() {
  if (typeof document === 'undefined') return;
  try {
    const win = window as Window & { __cleanFdAttrs?: () => void };
    if (typeof win.__cleanFdAttrs === 'function') {
      win.__cleanFdAttrs();
      return;
    }
    document
      .querySelectorAll('[fdprocessedid]')
      .forEach((el) => el.removeAttribute('fdprocessedid'));
  } catch {
    // Ignore DOM cleanup errors
  }
}

cleanFdProcessedAttrs();

export default function App({
  initialCategories = [],
  initialCourses = [],
  initialSettings = null,
  initialOfferTimers = [],
  initialHasOfferTimers = false,
  initialSelectorIconOrder,
  initialSelectorIconLabels,
  initialCategoryCourseOrders,
  initialServerNow,
  initialBookCategories = [],
  initialBooks = [],
}: AppProps) {
  useState(() => {
    cleanFdProcessedAttrs();
    return true;
  });

  useEffect(() => {
    const win = window as Window & { __stopFdAttrGuard?: () => void };
    const timer = window.setTimeout(() => {
      win.__stopFdAttrGuard?.();
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  const ssrPathname = usePathname() || '/';
  const navLocation = useNavigationLocation(ssrPathname);
  const currentPath = navLocation.pathname;
  const currentHash = navLocation.hash;

  // Public categories initialized up front so root-level /{slug} routing resolves immediately
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const route = useMemo(
    () => parseCurrentRoute(currentPath, currentHash, categories),
    [currentPath, currentHash, categories]
  );

  // Server-verified HttpOnly cookie admin session (zero client-side secret token storage)
  const [adminSession, setAdminSession] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [adminInitialOverview, setAdminInitialOverview] = useState<AdminOverviewData | null>(null);
  const [adminSessionChecked, setAdminSessionChecked] = useState<boolean>(false);
  const [appToast, setAppToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  const showAppToast = useCallback((message: string, type: 'error' | 'info' = 'info') => {
    setAppToast({ message, type });
    setTimeout(() => {
      setAppToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Verify admin session against /api/admin/session via HttpOnly cookie (+ overview in single round-trip)
  useEffect(() => {
    if (route.view !== 'admin_dashboard') return;
    if (adminSession) return;

    let cancelled = false;
    const verifySession = async () => {
      try {
        const res = await fetch('/api/admin/session?includeOverview=1', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated) {
            if (data.initialDashboardData) {
              setAdminInitialOverview(data.initialDashboardData as AdminOverviewData);
            }
            setAdminSession({
              email: data.email || '',
              name: data.name || 'Site Admin',
            });
            setAdminSessionChecked(true);
            return;
          }
        }

        setAdminSession(null);
      } catch {
        if (!cancelled) {
          setAdminSession(null);
        }
      } finally {
        if (!cancelled) {
          setAdminSessionChecked(true);
        }
      }
    };

    void verifySession();
    return () => {
      cancelled = true;
    };
  }, [route.view, adminSession]);

  const navigate = useCallback((fullUrl: string, options?: NavigateOptions) => {
    navigateHistory(fullUrl, options);
  }, []);

  const handleAdminLogin = useCallback(
    (email: string, name: string, preloadedOverview?: AdminOverviewData | null) => {
      if (preloadedOverview) {
        setAdminInitialOverview(preloadedOverview);
      }
      setAdminSession({ email, name });
      setAdminSessionChecked(true);
      if (!currentPath.startsWith('/admin/') || currentPath === '/admin/login') {
        navigate('/admin/dashboard');
      }
    },
    [currentPath, navigate]
  );

  const handleAdminLogout = useCallback(() => {
    fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});

    setAdminSession(null);
    setAdminInitialOverview(null);
    setAdminSessionChecked(true);
    navigate('/');
  }, [navigate]);

  // Public portal data initialized from Server Component props (zero initial client waterfall)
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [bookCategories, setBookCategories] = useState<BookCategory[]>(initialBookCategories);
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [settings, setSettings] = useState<SiteSettings | null>(initialSettings);
  const [offerTimers, setOfferTimers] = useState<OfferTimer[]>(initialOfferTimers);
  const [hasOfferTimers, setHasOfferTimers] = useState<boolean>(
    initialHasOfferTimers || initialOfferTimers.length > 0
  );
  const [selectorIconOrder, setSelectorIconOrder] = useState<SelectorIconId[]>(() =>
    normalizeSelectorIconOrder(initialSelectorIconOrder)
  );
  const [selectorIconLabels, setSelectorIconLabels] = useState<SelectorIconLabelsMap>(() =>
    normalizeSelectorIconLabels(initialSelectorIconLabels)
  );
  const [categoryCourseOrders, setCategoryCourseOrders] = useState<CategoryCourseOrdersMap>(() =>
    normalizeCategoryCourseOrders(initialCategoryCourseOrders)
  );
  const [serverNow, setServerNow] = useState<string | undefined>(initialServerNow);

  const hasServerPortalProps =
    typeof initialServerNow === 'string' && initialServerNow.length > 0;
  const hasInitialPortalData =
    hasServerPortalProps || initialCategories.length > 0 || initialSettings !== null;
  const hasInitialBookData =
    hasServerPortalProps || initialBookCategories.length > 0 || initialBooks.length > 0;
  const portalDataLoadedRef = useRef<boolean>(hasInitialPortalData);
  const bookDataLoadedRef = useRef<boolean>(hasInitialBookData);
  const isPublicRoute =
    route.view !== 'admin_login' && route.view !== 'admin_dashboard';

  const [loading, setLoading] = useState<boolean>(
    () => !hasInitialPortalData && !ssrPathname.startsWith('/admin')
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState<boolean>(
    () => !hasInitialBookData && !ssrPathname.startsWith('/admin')
  );
  const [booksError, setBooksError] = useState<string | null>(null);

  // Search & Discovery Filter States (persisted per navigation history entry)
  const [searchQuery, setSearchQuery] = useHistoryViewState('homeSearchQuery', '');
  const [selectedCategory, setSelectedCategory] = useHistoryViewState('homeSelectedCategory', 'all');
  const [priceFilter, setPriceFilter] = useHistoryViewState('homePriceFilter', 'all');
  const [onlyPopular, setOnlyPopular] = useHistoryViewState('homeOnlyPopular', false);

  // Mobile Bottom Navigation State
  const [, setMobileTab] = useState<MobileTab>('home');

  // Initialize history tracking, scroll restoration & optional initial non-department hash scroll
  useEffect(() => {
    const activeEntryId = ensureCurrentHistoryEntry();
    const savedScroll = getEntrySavedScrollY(activeEntryId);

    if (savedScroll === 0 && typeof window !== 'undefined' && window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      if (['science', 'business-studies', 'humanities'].includes(targetId)) {
        return; // Department tabs are handled in-place by state without jumping
      }
      const timer = window.setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const fetchPublicData = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await fetch('/api/public/data', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('সার্ভার থেকে কোর্স ডেটা লোড করা সম্ভব হয়নি।');
      }
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      if (Array.isArray(data.courses)) {
        setCourses(data.courses);
      }
      if (Array.isArray(data.offerTimers)) {
        setOfferTimers(data.offerTimers);
        setHasOfferTimers(
          typeof data.hasOfferTimers === 'boolean'
            ? data.hasOfferTimers
            : data.offerTimers.length > 0
        );
      }
      if (typeof data.serverNow === 'string' && data.serverNow) {
        setServerNow(data.serverNow);
      }
      if (Array.isArray(data.selectorIconOrder)) {
        setSelectorIconOrder(normalizeSelectorIconOrder(data.selectorIconOrder));
      }
      if (data.selectorIconLabels && typeof data.selectorIconLabels === 'object') {
        setSelectorIconLabels(normalizeSelectorIconLabels(data.selectorIconLabels));
      }
      if (data.categoryCourseOrders && typeof data.categoryCourseOrders === 'object') {
        setCategoryCourseOrders(normalizeCategoryCourseOrders(data.categoryCourseOrders));
      }
      if (data.settings) {
        setSettings(data.settings);
        if (data.settings.siteTitle && typeof document !== 'undefined') {
          document.title = data.settings.siteTitle;
        }
      }
      portalDataLoadedRef.current = true;
    } catch (err) {
      console.warn('Backend data fetch fallback:', err);
      setFetchError('কোর্সের তথ্য লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicBooks = useCallback(async () => {
    setBooksLoading(true);
    setBooksError(null);
    try {
      const res = await fetch('/api/public/books', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('বুক স্টোরের তথ্য লোড করা সম্ভব হয়নি।');
      }
      const data = await res.json();
      if (Array.isArray(data.bookCategories)) {
        setBookCategories(data.bookCategories);
      }
      if (Array.isArray(data.books)) {
        setBooks(data.books);
      }
      bookDataLoadedRef.current = true;
    } catch (err) {
      console.warn('Book store data fetch fallback:', err);
      setBooksError('বুক স্টোরের বই লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  const handleAdminDataMutated = useCallback(() => {
    // Mark cached public portal & book data stale so it auto-refreshes when returning to public routes
    portalDataLoadedRef.current = false;
    bookDataLoadedRef.current = false;
  }, []);

  useEffect(() => {
    // Skip redundant client API fetch if SSR already provided public data or on admin routes
    if (!isPublicRoute || portalDataLoadedRef.current) {
      return;
    }
    portalDataLoadedRef.current = true;
    let active = true;
    const run = async () => {
      if (active) {
        await fetchPublicData();
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [fetchPublicData, isPublicRoute]);

  useEffect(() => {
    if (!isPublicRoute || bookDataLoadedRef.current) {
      return;
    }
    bookDataLoadedRef.current = true;
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active) {
        await fetchPublicBooks();
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [fetchPublicBooks, isPublicRoute]);

  const [fallbackSharedCourses, setFallbackSharedCourses] = useState<
    Record<string, Course | null>
  >({});
  const fetchedCourseSlugsRef = useRef<Set<string>>(new Set());

  const activeCourseSlug = route.view === 'course' ? route.slug : null;
  const matchedSharedCourse = useMemo(() => {
    if (!activeCourseSlug) return undefined;
    const normalizedQuerySlug = generateUnicodeCourseSlug(activeCourseSlug);
    const exactOrCaseMatch =
      courses.find((c) => c.slug === activeCourseSlug) ||
      courses.find((c) => c.slug.toLowerCase() === activeCourseSlug.toLowerCase()) ||
      (normalizedQuerySlug
        ? courses.find((c) => generateUnicodeCourseSlug(c.slug) === normalizedQuerySlug)
        : undefined);
    if (exactOrCaseMatch) return exactOrCaseMatch;
    return fallbackSharedCourses[activeCourseSlug] ?? undefined;
  }, [activeCourseSlug, courses, fallbackSharedCourses]);

  useEffect(() => {
    if (!activeCourseSlug || matchedSharedCourse || loading) return;
    if (fetchedCourseSlugsRef.current.has(activeCourseSlug)) return;
    fetchedCourseSlugsRef.current.add(activeCourseSlug);

    let cancelled = false;
    fetch(`/api/public/course/${encodeURIComponent(activeCourseSlug)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Course | null) => {
        if (cancelled) return;
        setFallbackSharedCourses((prev) => ({ ...prev, [activeCourseSlug]: data || null }));
        if (data) {
          setCourses((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data]));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackSharedCourses((prev) => ({ ...prev, [activeCourseSlug]: null }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourseSlug, matchedSharedCourse, loading]);

  // Keep browser address bar showing clean readable Bengali Unicode URL
  useEffect(() => {
    if (typeof window === 'undefined' || route.view !== 'course' || !matchedSharedCourse) {
      return;
    }
    const readablePath = buildReadableCoursePath(matchedSharedCourse.slug);
    const currentDecodedPath = normalizeUrlParts(window.location.pathname).decodedPathname;
    if (currentDecodedPath !== readablePath.normalize('NFC')) {
      replaceCurrentUrlPreserveEntry(
        `${readablePath}${window.location.search || ''}${window.location.hash || ''}`
      );
    }
  }, [route.view, matchedSharedCourse]);

  // Sync browser document.title for all dynamic academic routes and catalog views
  useEffect(() => {
    if (route.view === 'course') {
      document.title = matchedSharedCourse
        ? `${matchedSharedCourse.title} — ১০ মিনিট স্কুল`
        : 'কোর্স বিস্তারিত — ১০ মিনিট স্কুল';
    } else if (route.view === 'bookstore') {
      const matchedBookCat = route.categorySlug
        ? bookCategories.find((cat) => cat.slug === route.categorySlug)
        : undefined;
      document.title = matchedBookCat
        ? `${matchedBookCat.sectionTitle || matchedBookCat.name} — 10MS বুক স্টোর`
        : '10MS স্টোর — বুক স্টোর ও প্রিন্টেড বই — 10msallcourse.com';
    } else if (route.view === 'academic') {
      if (route.level === 'ssc') {
        document.title =
          route.batchOrClass === 'ssc-27'
            ? 'SSC 27 অনলাইন ব্যাচ — ১০ মিনিট স্কুল'
            : 'SSC 28 অনলাইন ব্যাচ — ১০ মিনিট স্কুল';
      } else if (route.level === 'hsc') {
        if (route.batchOrClass === 'hsc-26') {
          document.title = 'HSC 26 অনলাইন ব্যাচ ও এডমিশন — ১০ মিনিট স্কুল';
        } else if (route.batchOrClass === 'hsc-27') {
          document.title = 'HSC 27 অনলাইন ব্যাচ — ১০ মিনিট স্কুল';
        } else {
          document.title = 'HSC 28 অনলাইন ব্যাচ — ১০ মিনিট স্কুল';
        }
      } else if (route.level === 'class') {
        const cNum = parseInt(route.batchOrClass.replace('class', ''), 10) || 6;
        const bnOrdinal = CLASS_BENGALI_ORDINALS[cNum] || `${toBengaliNumber(cNum)}ম`;
        document.title = `${bnOrdinal} শ্রেণি অনলাইন ব্যাচ — ১০ মিনিট স্কুল`;
      }
    } else if (route.view === 'category') {
      const cat = categories.find((c) => categorySlugsMatch(c.slug, route.slug));
      document.title = cat
        ? `${cat.name} — ১০ মিনিট স্কুল`
        : route.slug === 'free-course'
          ? 'ফ্রি কোর্স — ১০ মিনিট স্কুল'
          : route.slug === 'hsc-28'
            ? 'HSC 28 অনলাইন ব্যাচ ও বিভাগসমূহ — ১০ মিনিট স্কুল'
            : route.slug === 'hsc-27'
              ? 'HSC 27 অনলাইন ব্যাচ — ১০ মিনিট স্কুল'
              : 'কোর্স ক্যাটালগ — ১০ মিনিট স্কুল';
    } else if (route.view === 'home') {
      document.title =
        settings?.siteTitle || '১০ মিনিট স্কুল কোর্স — ৩D ক্লাস সিলেক্টর ও মডার্ন কোর্স পোর্টাল';
    }
  }, [route, matchedSharedCourse, categories, bookCategories, settings?.siteTitle]);

  // Record outbound click in background without blocking direct link navigation
  const recordCourseOutboundClick = (course: Pick<Course, 'id' | 'slug'>, referrer = 'course_card') => {
    fetch(`/api/public/click/${course.slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer }),
      keepalive: true,
    }).catch((err) => {
      console.error('Click tracking error:', err);
    });

    setCourses((prev) =>
      prev.map((c) =>
        c.id === course.id ? { ...c, clickCount: (c.clickCount || 0) + 1 } : c
      )
    );
  };

  // Handle Instant Direct Affiliate Link & Outbound Tracking (No Details Page, No Confirmation Modal)
  const handleEnrollClick = (course: Course, referrer = 'course_card') => {
    if (course.status !== 'active') {
      showAppToast('এই কোর্সে ভর্তি বর্তমানে বন্ধ রয়েছে।', 'info');
      return;
    }
    const targetUrl = course.affiliateUrl
      ? buildAffiliateRedirectUrl(course.affiliateUrl, settings?.defaultAffiliateRef)
      : `/go/${course.slug}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    recordCourseOutboundClick(course, referrer);
  };

  const handleDirectCourseLink = (slug: string, referrer = 'footer_link') => {
    const match = courses.find((c) => c.slug === slug);
    if (match) {
      handleEnrollClick(match, referrer);
    } else {
      window.open(`/go/${slug}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleNavigateHome = useCallback(() => {
    setMobileTab('home');
    if (route.view !== 'home') {
      navigate('/', {
        initialViewState: {
          homeSelectedCategory: 'all',
          homeSearchQuery: '',
          homePriceFilter: 'all',
          homeOnlyPopular: false,
        },
      });
    } else {
      setSelectedCategory('all');
      setSearchQuery('');
      setPriceFilter('all');
      setOnlyPopular(false);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [route.view, navigate, setSelectedCategory, setSearchQuery, setPriceFilter, setOnlyPopular]);

  const handleHeaderSearchSubmit = useCallback(() => {
    if (route.view !== 'home') {
      navigate('/', {
        scrollToId: 'courses',
        initialViewState: {
          homeSelectedCategory: 'all',
          homeSearchQuery: searchQuery,
          homePriceFilter: 'all',
          homeOnlyPopular: false,
        },
      });
      return;
    }
    document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
  }, [route.view, navigate, searchQuery]);

  const handleQuickFilterSelect = (catSlug: string, queryText = '') => {
    if (catSlug === 'school') setMobileTab('school');
    else if (catSlug === 'skills') setMobileTab('skills');
    else if (catSlug === 'admission') setMobileTab('admission');
    else if (catSlug === 'hsc' && queryText.includes('27')) setMobileTab('hsc27');
    else if (catSlug === 'hsc' && queryText.includes('28')) setMobileTab('hsc28');
    else if (catSlug === 'all') setMobileTab('home');

    if (route.view !== 'home') {
      navigate('/', {
        scrollToId: 'courses',
        initialViewState: {
          homeSelectedCategory: catSlug,
          homeSearchQuery: queryText,
          homePriceFilter: 'all',
          homeOnlyPopular: false,
        },
      });
      return;
    }

    setSelectedCategory(catSlug);
    setSearchQuery(queryText);
    setPriceFilter('all');
    setOnlyPopular(false);

    setTimeout(() => {
      const coursesEl = document.getElementById('courses');
      if (coursesEl) {
        coursesEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  const orderedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
      ),
    [categories]
  );

  // Dynamic calculation of active bottom navigation tab based on URL path, category, and state
  const getMobileActiveTab = (): MobileTab => {
    const clean = currentPath.replace(/\/+$/, '') || '/';
    if (
      clean === '/books' ||
      clean.startsWith('/books/') ||
      clean === '/book-store' ||
      clean === '/category/books' ||
      clean === '/categories/books'
    ) {
      return 'books';
    }
    const legacyCatMatch = clean.match(/^\/categor(?:y|ies)\/(.+)$/i);
    const singleSegMatch =
      !legacyCatMatch && clean !== '/' ? clean.match(/^\/([^/]+)$/) : null;
    const rawCatSeg = legacyCatMatch ? legacyCatMatch[1] : singleSegMatch ? singleSegMatch[1] : null;
    if (rawCatSeg) {
      const decodedSlug = decodeCourseSlug(rawCatSeg) || rawCatSeg;
      const matchedCat = orderedCategories.find((c) =>
        categorySlugsMatch(c.slug, decodedSlug)
      );
      if (matchedCat) {
        const group = resolveCategoryNavGroup(matchedCat);
        if (group !== 'none') return group;
      }
      const inferred = inferCategoryNavGroup({
        name: decodedSlug,
        slug: decodedSlug,
        subtitle: null,
      });
      if (inferred !== 'none') return inferred;
      if (decodedSlug.toLowerCase().includes('skill')) return 'skills';
    }

    if (clean.includes('hsc-27') || clean.includes('/academic/hsc/hsc-27')) return 'hsc27';
    if (clean.includes('hsc-28') || clean.includes('/academic/hsc/hsc-28')) return 'hsc28';
    if (
      clean.includes('/class-') ||
      clean.includes('/ssc/') ||
      clean.includes('/academic/class') ||
      clean.includes('/academic/ssc') ||
      clean === '/school' ||
      clean === '/category/school'
    ) {
      return 'school';
    }
    if (
      clean.includes('/admission') ||
      clean === '/category/admission' ||
      (clean === '/' && selectedCategory === 'admission')
    ) {
      return 'admission';
    }
    if (
      clean.includes('/skills') ||
      clean === '/category/skills' ||
      (clean === '/' && selectedCategory === 'skills')
    ) {
      return 'skills';
    }
    if (clean === '/' && selectedCategory === 'all' && !searchQuery.trim()) {
      return 'home';
    }
    return 'home';
  };

  const handleMobileNav = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'home') {
      handleNavigateHome();
    } else if (tab === 'hsc27') {
      navigate('/hsc/hsc-27');
    } else if (tab === 'hsc28') {
      navigate('/hsc/hsc-28');
    } else if (tab === 'school') {
      navigate('/ssc/ssc-27');
    } else if (tab === 'admission') {
      navigate('/admission');
    } else if (tab === 'books') {
      navigate('/books');
    } else if (tab === 'skills') {
      navigate('/skills');
    }
  };

  const coursesById = useMemo(() => {
    const map = new Map<number, Course>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  const whatsappNumber = settings?.whatsappNumber || '01608-949565';
  const whatsappLink = settings?.whatsappLink || 'https://wa.me/8801814946474';
  const callNumber = settings?.callNumber?.trim() || whatsappNumber;
  const messengerLink = settings?.messengerLink?.trim() || 'https://m.me/10minuteschool';
  const facebookLink = settings?.facebookLink?.trim() || 'https://www.facebook.com/10ms.official';
  const youtubeLink = settings?.youtubeLink?.trim() || 'https://www.youtube.com/@10MinuteSchool';
  const instagramLink = settings?.instagramLink?.trim() || 'https://www.instagram.com/10ms_official';
  const telHref = `tel:${callNumber.replace(/[^+\d]/g, '') || '01608949565'}`;

  // =========================================================
  // ADMIN ROUTES (/admin/login & /admin/dashboard)
  // =========================================================

  if (route.view === 'admin_login') {
    return (
      <AdminLogin
        onLoginSuccess={handleAdminLogin}
        onBackToSite={() => navigateBack('/')}
      />
    );
  }

  if (route.view === 'admin_dashboard') {
    const isVerified = Boolean(adminSession);
    if (!adminSessionChecked && !isVerified) {
      return <AdminSessionVerifyingSkeleton />;
    }

    if (!adminSession) {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLogin}
          onBackToSite={() => navigateBack('/')}
        />
      );
    }

    return (
      <>
        {appToast && (
          <div
            role="alert"
            className="fixed top-20 right-4 sm:right-6 z-[70] max-w-md px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 bg-rose-50/95 text-rose-900 border-rose-300"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{appToast.message}</span>
            <button
              type="button"
              onClick={() => setAppToast(null)}
              className="ml-auto text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <AdminDashboard
          adminEmail={adminSession.email}
          adminName={adminSession.name}
          currentPath={currentPath}
          initialData={adminInitialOverview}
          onNavigate={navigate}
          onLogout={handleAdminLogout}
          onDataMutated={handleAdminDataMutated}
          onAdminNameUpdated={(nextName) =>
            setAdminSession((prev) => (prev ? { ...prev, name: nextName } : prev))
          }
        />
      </>
    );
  }

  if (route.view === 'course') {
    const isCourseLookupPending =
      !matchedSharedCourse &&
      (loading || !Object.prototype.hasOwnProperty.call(fallbackSharedCourses, route.slug));

    return (
      <SiteContactProvider
        value={{ whatsappNumber, whatsappLink, callNumber, messengerLink }}
      >
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
          categories={orderedCategories}
          bookCategories={bookCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleHeaderSearchSubmit}
          onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
          onNavigateHome={handleNavigateHome}
          onEnrollClick={handleEnrollClick}
          onOpenCategoryPage={(slug) => navigate(buildReadableCategoryPath(slug))}
          onNavigate={navigate}
          currentPath={currentPath}
          currentHash={currentHash}
        />

        <main className="relative z-10 pt-2">
          <CourseSharePage
            slug={route.slug}
            course={matchedSharedCourse}
            categories={orderedCategories}
            allCourses={courses}
            settings={settings}
            isLoading={isCourseLookupPending}
            onNavigate={navigate}
            onEnrollClick={handleEnrollClick}
            onRecordOutboundClick={recordCourseOutboundClick}
          />
        </main>

        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          categories={orderedCategories}
          courses={courses}
          isAdminAuthenticated={Boolean(adminSession)}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
          facebookLink={facebookLink}
          youtubeLink={youtubeLink}
          instagramLink={instagramLink}
        />

        <MobileBottomNav
          activeTab={getMobileActiveTab()}
          onTabChange={handleMobileNav}
          categories={orderedCategories}
          courses={courses}
          currentPath={currentPath}
          onNavigate={navigate}
        />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
          callNumber={callNumber}
          messengerLink={messengerLink}
        />
      </div>
      </SiteContactProvider>
    );
  }

  if (route.view === 'bookstore') {
    return (
      <SiteContactProvider
        value={{ whatsappNumber, whatsappLink, callNumber, messengerLink }}
      >
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
          categories={orderedCategories}
          bookCategories={bookCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleHeaderSearchSubmit}
          onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
          onNavigateHome={handleNavigateHome}
          onEnrollClick={handleEnrollClick}
          onOpenCategoryPage={(slug) => navigate(buildReadableCategoryPath(slug))}
          onNavigate={navigate}
          currentPath={currentPath}
          currentHash={currentHash}
        />

        <main className="relative z-10 pt-3">
          <BookStorePage
            bookCategories={bookCategories}
            books={books}
            booksLoading={booksLoading}
            booksError={booksError}
            initialCategorySlug={route.categorySlug}
            settings={settings}
            onBack={() => navigate('/')}
            onNavigate={navigate}
            onRefreshBooks={fetchPublicBooks}
          />
        </main>

        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          categories={orderedCategories}
          courses={courses}
          isAdminAuthenticated={Boolean(adminSession)}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
          facebookLink={facebookLink}
          youtubeLink={youtubeLink}
          instagramLink={instagramLink}
        />

        <MobileBottomNav
          activeTab={getMobileActiveTab()}
          onTabChange={handleMobileNav}
          categories={orderedCategories}
          courses={courses}
          currentPath={currentPath}
          onNavigate={navigate}
        />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
          callNumber={callNumber}
          messengerLink={messengerLink}
        />
      </div>
      </SiteContactProvider>
    );
  }

  if (route.view === 'category') {
    return (
      <SiteContactProvider
        value={{ whatsappNumber, whatsappLink, callNumber, messengerLink }}
      >
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
          categories={orderedCategories}
          bookCategories={bookCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleHeaderSearchSubmit}
          onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
          onNavigateHome={handleNavigateHome}
          onEnrollClick={handleEnrollClick}
          onOpenCategoryPage={(slug) => navigate(buildReadableCategoryPath(slug))}
          onNavigate={navigate}
          currentPath={currentPath}
          currentHash={currentHash}
        />

        <main className="relative z-10 pt-2">
          <CategoryPage
            categorySlug={route.slug}
            categories={orderedCategories}
            courses={courses}
            categoryCourseOrders={categoryCourseOrders}
            onBack={() => navigate('/')}
            onEnrollClick={handleEnrollClick}
            onSelectCategory={(slug) => navigate(buildReadableCategoryPath(slug))}
            onNavigate={navigate}
          />
        </main>

        {/* Modern Organic Wave Footer with Payment Bar and Full Links */}
        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          categories={orderedCategories}
          courses={courses}
          isAdminAuthenticated={Boolean(adminSession)}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
          facebookLink={facebookLink}
          youtubeLink={youtubeLink}
          instagramLink={instagramLink}
        />

        <MobileBottomNav
          activeTab={getMobileActiveTab()}
          onTabChange={handleMobileNav}
          categories={orderedCategories}
          courses={courses}
          currentPath={currentPath}
          onNavigate={navigate}
        />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
          callNumber={callNumber}
          messengerLink={messengerLink}
        />
      </div>
      </SiteContactProvider>
    );
  }

  if (route.view === 'academic') {
    return (
      <SiteContactProvider
        value={{ whatsappNumber, whatsappLink, callNumber, messengerLink }}
      >
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
          categories={orderedCategories}
          bookCategories={bookCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleHeaderSearchSubmit}
          onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
          onNavigateHome={handleNavigateHome}
          onEnrollClick={handleEnrollClick}
          onOpenCategoryPage={(slug) => navigate(buildReadableCategoryPath(slug))}
          onNavigate={navigate}
          currentPath={currentPath}
          currentHash={currentHash}
        />

        <main className="relative z-10 pt-2">
          <AcademicPage
            level={route.level}
            batchOrClass={route.batchOrClass}
            sectionHash={route.sectionHash || currentHash}
            courses={courses}
            categories={orderedCategories}
            categoryCourseOrders={categoryCourseOrders}
            onNavigate={navigate}
            onEnrollClick={handleEnrollClick}
          />
        </main>

        {/* Modern Organic Wave Footer with Payment Bar and Full Links */}
        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          categories={orderedCategories}
          courses={courses}
          isAdminAuthenticated={Boolean(adminSession)}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
          facebookLink={facebookLink}
          youtubeLink={youtubeLink}
          instagramLink={instagramLink}
        />

        <MobileBottomNav
          activeTab={getMobileActiveTab()}
          onTabChange={handleMobileNav}
          categories={orderedCategories}
          courses={courses}
          currentPath={currentPath}
          onNavigate={navigate}
        />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
          callNumber={callNumber}
          messengerLink={messengerLink}
        />
      </div>
      </SiteContactProvider>
    );
  }

  // Filter logic for Search & Discovery
  const isFilteringActive =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    priceFilter !== 'all' ||
    onlyPopular;

  const rawFilteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const activeFeatureTitles = Array.isArray(c.courseFeatures)
      ? c.courseFeatures
          .filter((f) => f.isActive)
          .map((f) => f.title)
          .join(' ')
          .toLowerCase()
      : '';
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.fullDescription || '').toLowerCase().includes(q) ||
      c.headerTitle.toLowerCase().includes(q) ||
      c.headerSubtitle.toLowerCase().includes(q) ||
      c.categorySlug.toLowerCase().includes(q) ||
      getCourseCategorySlugs(c).some((s) => s.includes(q)) ||
      (c.targetStudents || '').toLowerCase().includes(q) ||
      c.features.toLowerCase().includes(q) ||
      activeFeatureTitles.includes(q);

    const matchesCategory =
      selectedCategory === 'all' || courseMatchesCategorySlug(c, selectedCategory);

    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'under3000' && c.discountPrice <= 3000) ||
      (priceFilter === '3000to5000' &&
        c.discountPrice > 3000 &&
        c.discountPrice <= 5000) ||
      (priceFilter === 'above5000' && c.discountPrice > 5000);

    const matchesPopular = !onlyPopular || c.isPopular;

    return matchesSearch && matchesCategory && matchesPrice && matchesPopular;
  });

  const filteredCourses =
    selectedCategory !== 'all'
      ? sortCoursesForCategory(rawFilteredCourses, selectedCategory, categoryCourseOrders)
      : rawFilteredCourses;

  // =========================================================
  // PUBLIC HEADER & HOMEPAGE VIEW
  // =========================================================

  return (
    <SiteContactProvider
      value={{ whatsappNumber, whatsappLink, callNumber, messengerLink }}
    >
    <div className="relative min-h-screen pb-20 md:pb-0">
      <GlassAmbientBackdrop />

      {/* FLOATING FROSTED GLASS HEADER */}
      <HeaderNav
        courses={courses}
        categories={orderedCategories}
        bookCategories={bookCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleHeaderSearchSubmit}
        onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
        onNavigateHome={handleNavigateHome}
        onEnrollClick={handleEnrollClick}
        onOpenCategoryPage={(slug) => navigate(buildReadableCategoryPath(slug))}
        onNavigate={navigate}
        currentPath={currentPath}
        currentHash={currentHash}
      />

      {/* ROUTE VIEW: PUBLIC HOMEPAGE */}
      <main className="relative z-10">
          {/* HERO SECTION WITH GLASS-SHADE SELECTOR */}
          <section className="relative pt-10 sm:pt-12 pb-14 overflow-hidden">
            <div className="wrap relative z-10 text-center">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#2A0F12] mb-3 max-w-3xl mx-auto"
                style={{ textWrap: 'balance' }}
              >
                টেন মিনিট স্কুল{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B91C1C] via-[#E22B2B] to-rose-500">
                  কোর্স
                </span>
              </h1>
              <p className="text-[#6B4C4F] text-sm sm:text-base max-w-2xl mx-auto mb-6 font-normal leading-relaxed">
                {settings?.heroSubtitle ||
                  'সরাসরি সর্বোচ্চ প্রাথমিক ছাড়ে যেকোনো একাডেমিক ও ক্যারিয়ার স্কিল প্রোগ্রামে ভর্তি হোন। কোনো প্রোমো কোডের ঝামেলা ছাড়াই ১০০% ডিসকাউন্টেড লাইভ এক্সেস।'}
              </p>

              {/* Urgent Course Offer Countdown Timers (Frosted Glass Strip / Grid) */}
              <HeroOfferCountdown
                settings={settings}
                offerTimers={offerTimers}
                hasOfferTimers={hasOfferTimers}
                initialServerNow={serverNow}
                courses={courses}
                coursesById={coursesById}
                onRecordOutboundClick={recordCourseOutboundClick}
                onLegacyEnrollClick={handleEnrollClick}
              />
            </div>

            {/* 3D CATEGORY & CLASS SELECTOR STRIP (GLASS-SHADE S-WAVE STRUCTURE) */}
            <ClassSelectorStrip
              onNavigate={navigate}
              categories={orderedCategories}
              selectorIconOrder={selectorIconOrder}
              selectorIconLabels={selectorIconLabels}
            />
          </section>

          {/* 3 MAIN PATHWAYS (Academic, Skills, Admission) */}
          <PathwaysSection onNavigate={navigate} />

          {/* DYNAMIC COURSE SECTIONS & INTERACTIVE FILTER BAR */}
          <section className="py-8" id="courses">
            <div className="wrap">
              {/* Top Section Banner (Frosted Glass-Shade) */}
              <div className="glass-surface rounded-3xl p-5 sm:p-8 flex flex-row items-center justify-between gap-4 sm:gap-6 mb-8">
                <div className="min-w-0 flex-1 space-y-1 text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B91C1C] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#E22B2B] animate-pulse" />
                    সর্বোচ্চ রেটেড ও ট্রেন্ডিং
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F12] leading-tight">
                    জনপ্রিয় লাইভ কোর্স ও অনলাইন ব্যাচ
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6B4C4F] max-w-xl leading-relaxed">
                    টেন মিনিট স্কুলের শীর্ষ মেন্টরদের পরিচালিত কোর্সসমূহ এক নজরে দেখে সরাসরি ডিসকাউন্টেড মূল্যে নিশ্চিন্তে এনরোল করুন।
                  </p>
                </div>
                <div
                  aria-hidden="true"
                  className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-red-100/80 border border-rose-200/80 shadow-[0_8px_20px_-8px_rgba(226,43,43,0.32),inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center"
                >
                  <GraduationCap className="w-8 h-8 text-[#E22B2B] stroke-[2]" />
                </div>
              </div>

              {/* Interactive Discovery & Filter Controls (Frosted Glass Strip) */}
              <div className="glass-surface rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 lg:p-4 mb-5 sm:mb-7 lg:mb-10">
                <div className="flex flex-nowrap lg:flex-wrap items-center lg:justify-between gap-1.5 sm:gap-2 lg:gap-3 overflow-x-auto lg:overflow-visible no-scrollbar py-0.5 lg:py-0">
                  {/* Category Filter Tabs with Distinct Borders */}
                  <div className="flex items-center gap-1.5 shrink-0 lg:shrink lg:overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`px-2.5 py-1 sm:px-3 sm:py-1.5 lg:px-3.5 lg:py-2 rounded-full text-[10.5px] sm:text-[11px] lg:text-xs leading-tight lg:leading-normal font-bold transition cursor-pointer whitespace-nowrap shrink-0 border ${
                        selectedCategory === 'all'
                          ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm lg:shadow-md shadow-red-500/25'
                          : 'border-rose-200/90 bg-white/90 text-[#2A0F12] hover:border-[#b91c1c] hover:bg-white hover:text-[#B91C1C] shadow-2xs'
                      }`}
                    >
                      সব ক্যাটাগরি ({toBengaliNumber(courses.length)})
                    </button>
                    {orderedCategories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => navigate(buildReadableCategoryPath(cat.slug))}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 lg:px-3.5 lg:py-2 rounded-full text-[10.5px] sm:text-[11px] lg:text-xs leading-tight lg:leading-normal font-bold transition cursor-pointer whitespace-nowrap shrink-0 border border-rose-200/90 bg-white/90 text-[#2A0F12] hover:border-[#b91c1c] hover:bg-white hover:text-[#B91C1C] shadow-2xs"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Subtle Mobile/Tablet Divider */}
                  <span
                    aria-hidden="true"
                    className="w-px h-4 bg-rose-200/80 shrink-0 lg:hidden"
                  />

                  {/* Popular Toggle & Filter Reset */}
                  <div className="flex items-center gap-1.5 shrink-0 lg:flex-wrap lg:gap-2.5">
                    <button
                      type="button"
                      onClick={() => setOnlyPopular(!onlyPopular)}
                      className={`px-2.5 py-1 sm:px-3 sm:py-1.5 lg:px-3.5 lg:py-2 rounded-full text-[10.5px] sm:text-[11px] lg:text-xs leading-tight lg:leading-normal font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                        onlyPopular
                          ? 'border-amber-400 bg-amber-100/90 text-amber-900 shadow-xs'
                          : 'border-slate-200/90 bg-white/90 text-[#2A0F12] hover:border-amber-400 hover:bg-white shadow-2xs'
                      }`}
                    >
                      ★ জনপ্রিয় কোর্স
                    </button>

                    {isFilteringActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setPriceFilter('all');
                          setOnlyPopular(false);
                        }}
                        className="text-[10.5px] sm:text-[11px] lg:text-xs leading-tight lg:leading-normal font-bold text-[#B91C1C] hover:underline px-2.5 py-1 sm:px-2.5 sm:py-1.5 lg:px-3 lg:py-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer whitespace-nowrap shrink-0 transition shadow-2xs"
                      >
                        ফিল্টার রিসেট ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading Skeleton / Error State */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-96 rounded-2xl glass-surface animate-pulse"
                    />
                  ))}
                </div>
              ) : fetchError && courses.length === 0 ? (
                <div className="glass-surface rounded-3xl p-10 text-center space-y-3 mb-12">
                  <AlertCircle className="w-10 h-10 text-[#E22B2B] mx-auto" aria-hidden="true" />
                  <div className="text-base font-bold text-[#2A0F12]">{fetchError}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      void fetchPublicData();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>পুনরায় চেষ্টা করুন</span>
                  </button>
                </div>
              ) : isFilteringActive ? (
                /* FILTERED / SEARCH RESULTS VIEW */
                <div className="space-y-5 mb-12">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[#2A0F12]">
                      অনুসন্ধান ফলাফল ({toBengaliNumber(filteredCourses.length)}টি কোর্স পাওয়া গেছে)
                    </h3>
                  </div>

                  {filteredCourses.length === 0 ? (
                    <div className="glass-surface rounded-3xl p-12 text-center space-y-3">
                      <SearchX className="w-10 h-10 text-rose-400 mx-auto" aria-hidden="true" />
                      <div className="text-base font-bold text-[#2A0F12]">
                        আপনার অনুসন্ধানের সাথে মিলে এমন কোনো কোর্স পাওয়া যায়নি
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setPriceFilter('all');
                          setOnlyPopular(false);
                        }}
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
                      >
                        সকল কোর্স দেখুন
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                      {filteredCourses.map((course) => (
                        <div
                          key={`filter-${course.id}-${course.slug}`}
                          className="h-full flex flex-col"
                        >
                          <CourseCard
                            course={course}
                            onEnrollClick={handleEnrollClick}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* DEFAULT CATEGORY-WISE SECTIONS (Frosted Glass Container) */
                orderedCategories.map((cat) => {
                  const catCourses = sortCoursesForCategory(
                    courses.filter((c) => courseMatchesCategorySlug(c, cat.slug)),
                    cat.slug,
                    categoryCourseOrders
                  );
                  if (catCourses.length === 0) return null;

                  const sectionId = `${cat.slug}-section`;

                  return (
                    <div
                      key={`category-sec-${cat.id}-${cat.slug}`}
                      className="glass-surface rounded-2xl sm:rounded-3xl p-3 sm:p-7 mb-6 sm:mb-10 relative cv-auto"
                      id={sectionId}
                    >
                      {/* Section Header with Title & "View All" Button */}
                      <div className="flex items-center justify-between mb-3.5 sm:mb-5 gap-2 sm:gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-2xl font-black text-[#2A0F12] tracking-tight truncate sm:whitespace-normal">
                            {cat.name}
                          </h3>
                          {cat.subtitle && (
                            <span className="text-[11px] sm:text-xs text-[#6B4C4F] font-medium block mt-0.5 line-clamp-1 sm:line-clamp-none">
                              {cat.subtitle}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => navigate(buildReadableCategoryPath(cat.slug))}
                            className="group/va glass-inset hover:bg-gradient-to-r hover:from-[#ff5252] hover:to-[#b91c1c] hover:border-[#dc2626] text-[#B91C1C] hover:text-white font-bold text-[11px] sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 shadow-xs hover:shadow-md active:scale-95"
                            title={`${cat.name} এর সকল কোর্স দেখুন`}
                          >
                            <span>View All</span>
                            <span className="text-[10px] sm:text-[11px] opacity-85 font-semibold">
                              ({toBengaliNumber(catCourses.length)})
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover/va:translate-x-0.5" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile View: Independent Horizontal 2-Card Carousel/Slider with Left & Right Arrows + Swipe */}
                      <MobileCategoryCarousel
                        categorySlug={cat.slug}
                        categoryName={cat.name}
                        courses={catCourses}
                        onEnrollClick={handleEnrollClick}
                      />

                      {/* Tablet & Desktop View: Equal 2/4-column responsive grid (unchanged) */}
                      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-5 items-stretch">
                        {catCourses.slice(0, 4).map((course) => (
                          <div
                            key={`cat-${cat.slug}-course-${course.id}-${course.slug}`}
                            className="h-full flex flex-col"
                          >
                            <CourseCard
                              course={course}
                              onEnrollClick={handleEnrollClick}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* STUDENT REVIEWS & EXPERIENCE SECTION (GLASS-SHADE) */}
          <section className="py-10 cv-auto" id="reviews">
            <div className="wrap space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-xs font-extrabold text-[#B91C1C]">
                  শিক্ষার্থীদের সাফল্য ও অভিজ্ঞতা
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#2A0F12]">
                  দেশজুড়ে লাখো শিক্ষার্থীর আস্থার প্ল্যাটফর্ম
                </h2>
                <p className="text-xs sm:text-sm text-[#6B4C4F]">
                  আমাদের অনুমোদিত ডিসকাউন্ট লিংকের মাধ্যমে ভর্তি হয়ে শিক্ষার্থীরা যেভাবে তাদের একাডেমিক ও স্কিল প্রস্তুতিতে এগিয়ে যাচ্ছে।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    quote:
                      'HSC 28 PCMB সাইকেল ১-এ ভর্তি হওয়ার পর ফিজিক্স ও ম্যাথের ভীতি পুরোপুরি কেটে গেছে। প্রিন্টেড মাস্টারবুক এবং লাইভ ডাউট সলভিং ক্লাসগুলো অসাধারণ।',
                    name: 'তানভীর আহমেদ',
                    role: 'HSC ২৮ ব্যাচ, নটর ডেম কলেজ, ঢাকা',
                    course: 'HSC 28 PCMB অনলাইন ব্যাচ',
                  },
                  {
                    quote:
                      'মুনজেরিন আপুর Spoken English ও IELTS কোর্স দুটি করে আমার স্পিকিং ফ্লুয়েন্সি অনেক বেড়েছে। অফিশিয়াল ডিসকাউন্টে সরাসরি ভর্তি হতে পেরেছি।',
                    name: 'সাদিয়া ইসলাম প্রমি',
                    role: 'শিক্ষার্থী, ঢাকা বিশ্ববিদ্যালয় (Overall Band 7.5)',
                    course: 'IELTS Complete Preparation',
                  },
                  {
                    quote:
                      'ভার্সিটি A Unit + GST কোর্সের প্রশ্নব্যাংক অ্যানালাইসিস ও সেন্ট্রাল মক টেস্টগুলো আমাকে ভর্তি পরীক্ষার প্রশ্নের ধরন বুঝতে সবচেয়ে বেশি সাহায্য করেছে।',
                    name: 'মাহমুদুল হাসান রাহাত',
                    role: 'ভর্তিচ্ছু শিক্ষার্থী, HSC ২৬ ব্যাচ, রাজশাহী কলেজ',
                    course: 'ভার্সিটি A Unit + GST এডমিশন',
                  },
                ].map((rev, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4"
                  >
                    <p className="text-xs sm:text-sm text-[#3E2225] leading-relaxed">
                      “{rev.quote}”
                    </p>
                    <div className="pt-3 border-t border-white/75">
                      <div className="font-bold text-sm text-[#2A0F12]">{rev.name}</div>
                      <div className="text-xs text-[#6B4C4F]">{rev.role}</div>
                      <div className="text-[11px] font-semibold text-[#B91C1C] mt-1">
                        কোর্স: {rev.course}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* DIRECT ADMISSION SUPPORT BAR */}
          <section className="py-6 cv-auto">
            <div className="wrap">
              <div className="glass-surface p-5 sm:p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                    <Headphones className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-extrabold text-[#2A0F12]">
                      সরাসরি কোর্স অ্যাডমিশন সহায়তা ও যেকোনো জিজ্ঞাসা
                    </div>
                    <div className="text-xs text-[#6B4C4F] mt-0.5">
                      আমাদের সার্বক্ষণিক সাপোর্ট টিম দ্রুততম সময়ে আপনাকে সঠিক কোর্স বেছে নিতে সহায়তা করবে।
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 sm:gap-3 shrink-0">
                  {/* Direct Phone Call */}
                  <a
                    href={telHref}
                    aria-label={`সরাসরি কল করুন ${callNumber}`}
                    title={`সরাসরি কল করুন (${callNumber})`}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#dc2626] to-[#eb1c24] hover:from-[#b91c1c] hover:to-[#dc2626] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-full transition shrink-0 whitespace-nowrap shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Phone className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" aria-hidden="true" />
                    <span>{callNumber}</span>
                  </a>

                  {/* Direct WhatsApp */}
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="হোয়াটসঅ্যাপে সরাসরি চ্যাট করুন"
                    title="হোয়াটসঅ্যাপে সরাসরি চ্যাট করুন"
                    className="flex items-center gap-2 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-full transition shrink-0 whitespace-nowrap shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px] fill-white shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.78 14.15c-.24.67-1.39 1.28-1.92 1.36-.5.08-1.14.12-3.66-.92-3.22-1.33-5.3-4.57-5.46-4.78-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.11-2.66.29-.32.64-.4.85-.4.21 0 .43.002.61.01.2.008.47-.076.73.55.27.64.91 2.22.99 2.38.08.16.13.35.03.56-.1.21-.16.34-.31.52-.16.18-.33.4-.47.54-.16.15-.32.32-.14.63.19.31.83 1.37 1.78 2.22 1.22 1.09 2.25 1.42 2.57 1.58.32.16.51.13.7-.08.19-.21.82-.95 1.04-1.28.22-.32.43-.27.73-.16.29.11 1.87.88 2.19 1.04.32.16.53.24.61.37.08.14.08.79-.16 1.46z" />
                    </svg>
                    <span>WhatsApp</span>
                  </a>

                  {/* Direct Facebook Messenger */}
                  <a
                    href={messengerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="মেসেঞ্জারে সরাসরি নক দিন"
                    title="মেসেঞ্জারে সরাসরি নক দিন"
                    className="flex items-center gap-2 bg-gradient-to-r from-[#0084FF] to-[#006AFF] hover:from-[#006AFF] hover:to-[#0052cc] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-full transition shrink-0 whitespace-nowrap shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px] fill-white shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.734 7.227V22l3.373-1.851c.917.254 1.888.39 2.893.39 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.443l-2.585-2.756-5.045 2.756 5.55-5.892 2.65 2.756 4.98-2.756-5.55 5.892z" />
                    </svg>
                    <span>Messenger</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

      {appToast && (
        <div
          role="alert"
          className="fixed top-20 right-4 sm:right-6 z-[70] max-w-md px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 bg-[#2A0F12]/95 text-white border-rose-900"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{appToast.message}</span>
          <button
            type="button"
            onClick={() => setAppToast(null)}
            className="ml-auto text-rose-200 hover:text-white cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern Organic Wave Footer with Payment Bar and Full Links */}
      <SiteFooter
        onNavigate={navigate}
        onQuickFilter={handleQuickFilterSelect}
        onDirectCourseLink={handleDirectCourseLink}
        categories={orderedCategories}
        courses={courses}
        isAdminAuthenticated={Boolean(adminSession)}
        whatsappNumber={whatsappNumber}
        whatsappLink={whatsappLink}
        facebookLink={facebookLink}
        youtubeLink={youtubeLink}
        instagramLink={instagramLink}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={getMobileActiveTab()}
        onTabChange={handleMobileNav}
        categories={orderedCategories}
        courses={courses}
        currentPath={currentPath}
        onNavigate={navigate}
      />

      {/* Floating Call, WhatsApp and Messenger Contact Stack */}
      <FloatingContactWidget
        whatsappLink={whatsappLink}
        whatsappNumber={whatsappNumber}
        callNumber={callNumber}
        messengerLink={messengerLink}
      />
    </div>
    </SiteContactProvider>
  );
}
