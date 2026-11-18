'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Book, BookCategory, Category, Course, OfferTimer, SiteSettings } from './types.ts';
import { buildAffiliateRedirectUrl } from './lib/affiliateUrl.ts';
import { CourseCard } from './components/public/CourseCard.tsx';
import { HeroOfferCountdown } from './components/public/HeroOfferCountdown.tsx';
import { MobileBottomNav, MobileTab } from './components/public/MobileBottomNav.tsx';
import { HeaderNav } from './components/public/HeaderNav.tsx';
import { AcademicPage, type AcademicLevel } from './components/public/AcademicPage.tsx';
import { CategoryPage } from './components/public/CategoryPage.tsx';
import { BookStorePage } from './components/public/BookStorePage.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { ClassSelectorStrip } from './components/public/ClassSelectorStrip.tsx';
import { GlassAmbientBackdrop } from './components/public/GlassAmbientBackdrop.tsx';
import { FloatingContactWidget } from './components/public/FloatingContactWidget.tsx';
import { SiteFooter } from './components/public/SiteFooter.tsx';
import { toBengaliNumber } from './utils/format.ts';
import {
  CLASS_BENGALI_ORDINALS,
  courseMatchesCategorySlug,
} from './lib/categoryMatching.ts';
import {
  AlertCircle,
  ChevronRight,
  BookOpen,
  Terminal,
  Landmark,
  BadgeCheck,
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
    loading: () => (
      <div className="min-h-screen flex items-center justify-center text-sm font-bold text-[#6B4C4F]">
        অ্যাডমিন ড্যাশবোর্ড লোড হচ্ছে...
      </div>
    ),
  }
);

export interface AppProps {
  initialCategories?: Category[];
  initialCourses?: Course[];
  initialSettings?: SiteSettings | null;
  initialOfferTimers?: OfferTimer[];
  initialHasOfferTimers?: boolean;
  initialServerNow?: string;
  initialBookCategories?: BookCategory[];
  initialBooks?: Book[];
}

function subscribeHashChange(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
}

type RouteState =
  | { view: 'home' }
  | { view: 'bookstore'; categorySlug?: string }
  | { view: 'category'; slug: string; subFilter?: string }
  | { view: 'academic'; level: AcademicLevel; batchOrClass: string; sectionHash?: string }
  | { view: 'admin_login' }
  | { view: 'admin_dashboard' };

function parseCurrentRoute(pathname: string, hash?: string): RouteState {
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login' || pathname === '/admin/login/') {
      return { view: 'admin_login' };
    }
    return { view: 'admin_dashboard' };
  }

  // Normalize path without trailing slashes
  const clean = pathname.replace(/\/+$/, '') || '/';
  const cleanHash = (hash || '').replace('#', '');

  // 1. Language Learning: /categories/language-learning/ or /category/language-learning/
  if (clean === '/categories/language-learning' || clean === '/category/language-learning') {
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
    const bookCatSlug = clean.slice('/books/'.length).split('/')[0];
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
    const slug = parts[1];
    if (slug) {
      return { view: 'category', slug };
    }
  }

  // Direct redirect for course link
  if (clean.startsWith('/courses/')) {
    return { view: 'home' };
  }

  if (clean === '/academic') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-28' };
  }

  return { view: 'home' };
}

if (typeof document !== 'undefined') {
  try {
    document
      .querySelectorAll('[fdprocessedid]')
      .forEach((el) => el.removeAttribute('fdprocessedid'));
  } catch {
    // Ignore DOM cleanup errors
  }
}

export default function App({
  initialCategories = [],
  initialCourses = [],
  initialSettings = null,
  initialOfferTimers = [],
  initialHasOfferTimers = false,
  initialServerNow,
  initialBookCategories = [],
  initialBooks = [],
}: AppProps) {
  useEffect(() => {
    const win = window as Window & { __stopFdAttrGuard?: () => void };
    win.__stopFdAttrGuard?.();
  }, []);

  const currentPathname = usePathname() || '/';
  const [navOverride, setNavOverride] = useState<{
    basePathname: string;
    path: string;
    hash: string;
  } | null>(null);

  const windowHash = useSyncExternalStore(
    subscribeHashChange,
    () => (typeof window !== 'undefined' ? window.location.hash || '' : ''),
    () => ''
  );

  const currentPath =
    navOverride?.basePathname === currentPathname ? navOverride.path : currentPathname;
  const currentHash =
    navOverride?.basePathname === currentPathname ? navOverride.hash : windowHash;

  const route = useMemo(
    () => parseCurrentRoute(currentPath, currentHash),
    [currentPath, currentHash]
  );

  // Server-verified HttpOnly cookie admin session (zero client-side secret token storage)
  const [adminSession, setAdminSession] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [adminSessionChecked, setAdminSessionChecked] = useState<boolean>(false);
  const [appToast, setAppToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);

  const showAppToast = useCallback((message: string, type: 'error' | 'info' = 'info') => {
    setAppToast({ message, type });
    setTimeout(() => {
      setAppToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Verify admin session against /api/admin/session via HttpOnly cookie
  useEffect(() => {
    if (route.view !== 'admin_dashboard') return;
    if (adminSession) return;

    let cancelled = false;
    const verifySession = async () => {
      try {
        const res = await fetch('/api/admin/session', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated) {
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

  const navigate = useCallback((fullUrl: string, options?: { noScroll?: boolean }) => {
    const [pathPart, hashPart] = fullUrl.split('#');
    const targetPath = pathPart || (typeof window !== 'undefined' ? window.location.pathname : '');
    const targetHash = hashPart ? `#${hashPart}` : '';

    const isSamePath = typeof window !== 'undefined' && (
      window.location.pathname.replace(/\/$/, '') === targetPath.replace(/\/$/, '')
    );

    if (typeof window !== 'undefined') {
      if (options?.noScroll || isSamePath) {
        window.history.replaceState({}, '', fullUrl);
      } else {
        window.history.pushState({}, '', fullUrl);
      }
    }
    setNavOverride({
      basePathname: currentPathname,
      path: targetPath,
      hash: targetHash,
    });

    if (options?.noScroll || isSamePath) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPathname]);

  const handleAdminLogin = useCallback(
    (email: string, name: string) => {
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
    setAdminSessionChecked(true);
    navigate('/');
  }, [navigate]);

  // Public portal data initialized from Server Component props (zero initial client waterfall)
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [bookCategories, setBookCategories] = useState<BookCategory[]>(initialBookCategories);
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [settings, setSettings] = useState<SiteSettings | null>(initialSettings);
  const [offerTimers, setOfferTimers] = useState<OfferTimer[]>(initialOfferTimers);
  const [hasOfferTimers, setHasOfferTimers] = useState<boolean>(
    initialHasOfferTimers || initialOfferTimers.length > 0
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
    () => !hasInitialPortalData && !currentPathname.startsWith('/admin')
  );
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Discovery Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [onlyPopular, setOnlyPopular] = useState<boolean>(false);
  const isDownloadingZipRef = useRef<boolean>(false);

  const handleDownloadZip = useCallback(async () => {
    if (isDownloadingZipRef.current) return;
    isDownloadingZipRef.current = true;
    try {
      const res = await fetch('/api/download-project-zip', {
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'ZIP ফাইল তৈরি ব্যর্থ হয়েছে');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '10ms-affiliate-portal-backup.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      showAppToast('ডাউনলোড সমস্যা: ' + (err?.message || 'ব্যর্থ হয়েছে'), 'error');
    } finally {
      isDownloadingZipRef.current = false;
    }
  }, [showAppToast]);

  // Mobile Bottom Navigation State
  const [, setMobileTab] = useState<MobileTab>('home');

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      const h = window.location.hash || '';
      setNavOverride({
        basePathname: currentPathname,
        path: p,
        hash: h,
      });
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [currentPathname]);

  // Initial scroll to hash if page loaded directly with non-department section (e.g. #courses, #reviews)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      if (['science', 'business-studies', 'humanities'].includes(targetId)) {
        return; // Department tabs are handled in-place by state without jumping
      }
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
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
    try {
      const res = await fetch('/api/public/books', { cache: 'no-store' });
      if (!res.ok) return;
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
    }
  }, []);

  const handleAdminDataMutated = useCallback(() => {
    void fetchPublicData();
    void fetchPublicBooks();
  }, [fetchPublicData, fetchPublicBooks]);

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

  // Sync browser document.title for all dynamic academic routes and catalog views
  useEffect(() => {
    if (route.view === 'bookstore') {
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
      const cat = categories.find((c) => c.slug === route.slug);
      document.title = cat
        ? `${cat.name} — ১০ মিনিট স্কুল`
        : route.slug === 'free-course'
          ? 'ফ্রি কোর্স — ১০ মিনিট স্কুল'
          : 'কোর্স ক্যাটালগ — ১০ মিনিট স্কুল';
    } else if (route.view === 'home') {
      document.title =
        settings?.siteTitle || '১০ মিনিট স্কুল কোর্স — ৩D ক্লাস সিলেক্টর ও মডার্ন কোর্স পোর্টাল';
    }
  }, [route, categories, bookCategories, settings?.siteTitle]);

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

  const handleQuickFilterSelect = (catSlug: string, queryText = '') => {
    if (route.view !== 'home') {
      window.history.pushState({}, '', '/');
      setNavOverride({
        basePathname: currentPathname,
        path: '/',
        hash: '',
      });
    }
    setSelectedCategory(catSlug);
    setSearchQuery(queryText);

    if (catSlug === 'school') setMobileTab('school');
    else if (catSlug === 'skills') setMobileTab('skills');
    else if (catSlug === 'admission') setMobileTab('admission');
    else if (catSlug === 'hsc' && queryText.includes('27')) setMobileTab('hsc27');
    else if (catSlug === 'hsc' && queryText.includes('28')) setMobileTab('hsc28');
    else if (catSlug === 'all') setMobileTab('home');

    setTimeout(() => {
      const coursesEl = document.getElementById('courses');
      if (coursesEl) {
        coursesEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  // Dynamic calculation of active bottom navigation tab based on URL path, category, and state
  const getMobileActiveTab = (): MobileTab => {
    const clean = currentPath.replace(/\/+$/, '') || '/';
    if (clean.includes('hsc-27') || clean.includes('/academic/hsc/hsc-27')) return 'hsc27';
    if (clean.includes('hsc-28') || clean.includes('/academic/hsc/hsc-28')) return 'hsc28';
    if (
      clean.includes('/class-') ||
      clean.includes('/ssc/') ||
      clean.includes('/academic/class') ||
      clean.includes('/academic/ssc') ||
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
      setSelectedCategory('all');
      setSearchQuery('');
      navigate('/');
    } else if (tab === 'hsc27') {
      navigate('/hsc/hsc-27');
    } else if (tab === 'hsc28') {
      navigate('/hsc/hsc-28');
    } else if (tab === 'school') {
      navigate('/class-7');
    } else if (tab === 'admission') {
      navigate('/category/admission');
    } else if (tab === 'skills') {
      navigate('/category/skills');
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
  const telHref = `tel:${callNumber.replace(/[^+\d]/g, '') || '01608949565'}`;

  // =========================================================
  // ADMIN ROUTES (/admin/login & /admin/dashboard)
  // =========================================================

  if (route.view === 'admin_login') {
    return (
      <AdminLogin
        onLoginSuccess={handleAdminLogin}
        onBackToSite={() => navigate('/')}
      />
    );
  }

  if (route.view === 'admin_dashboard') {
    const isVerified = Boolean(adminSession);
    if (!adminSessionChecked && !isVerified) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 text-center">
          <div className="glass-strong rounded-3xl px-8 py-6 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-[#eb1c24] animate-spin" />
            <p className="text-sm font-bold text-[#2A0F12]">অ্যাডমিন সেশন যাচাই করা হচ্ছে...</p>
          </div>
        </div>
      );
    }

    if (!adminSession) {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLogin}
          onBackToSite={() => navigate('/')}
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
          onNavigate={navigate}
          onLogout={handleAdminLogout}
          onDataMutated={handleAdminDataMutated}
          onDownloadZip={handleDownloadZip}
        />
      </>
    );
  }

  if (route.view === 'bookstore') {
    return (
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
          bookCategories={bookCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => {
            navigate('/');
            setTimeout(() => {
              document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }}
          onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
          onNavigateHome={() => navigate('/')}
          onEnrollClick={handleEnrollClick}
          onOpenCategoryPage={(slug) => navigate(`/category/${slug}`)}
          onNavigate={navigate}
          currentPath={currentPath}
          currentHash={currentHash}
        />

        <main className="relative z-10 pt-3">
          <BookStorePage
            bookCategories={bookCategories}
            books={books}
            initialCategorySlug={route.categorySlug}
            settings={settings}
            onBack={() => navigate('/')}
            onRefreshBooks={fetchPublicBooks}
          />
        </main>

        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          isAdminAuthenticated={Boolean(adminSession)}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
        />

        <MobileBottomNav activeTab={getMobileActiveTab()} onTabChange={handleMobileNav} />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
          callNumber={callNumber}
          messengerLink={messengerLink}
        />
      </div>
    );
  }

  if (route.view === 'category') {
    return (
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
          bookCategories={bookCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => {
            navigate('/');
            setTimeout(() => {
              document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }}
          onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
          onNavigateHome={() => navigate('/')}
          onEnrollClick={handleEnrollClick}
          onOpenCategoryPage={(slug) => navigate(`/category/${slug}`)}
          onNavigate={navigate}
          currentPath={currentPath}
          currentHash={currentHash}
        />

        <main className="relative z-10 pt-2">
          <CategoryPage
            categorySlug={route.slug}
            categories={categories}
            courses={courses}
            onBack={() => navigate('/')}
            onEnrollClick={handleEnrollClick}
            onSelectCategory={(slug) => navigate(`/category/${slug}`)}
            onNavigate={navigate}
          />
        </main>

        {/* Modern Organic Wave Footer with Payment Bar and Full Links */}
        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          isAdminAuthenticated={Boolean(adminSession)}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
        />

        <MobileBottomNav activeTab={getMobileActiveTab()} onTabChange={handleMobileNav} />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
          callNumber={callNumber}
          messengerLink={messengerLink}
        />
      </div>
    );
  }

  if (route.view === 'academic') {
    return (
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
          bookCategories={bookCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => {
            navigate('/');
            setTimeout(() => {
              document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }}
          onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
          onNavigateHome={() => navigate('/')}
          onEnrollClick={handleEnrollClick}
          onOpenCategoryPage={(slug) => navigate(`/category/${slug}`)}
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
            categories={categories}
            onNavigate={navigate}
            onEnrollClick={handleEnrollClick}
          />
        </main>

        {/* Modern Organic Wave Footer with Payment Bar and Full Links */}
        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          isAdminAuthenticated={Boolean(adminSession)}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
        />

        <MobileBottomNav activeTab={getMobileActiveTab()} onTabChange={handleMobileNav} />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
          callNumber={callNumber}
          messengerLink={messengerLink}
        />
      </div>
    );
  }

  // Filter logic for Search & Discovery
  const isFilteringActive =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    priceFilter !== 'all' ||
    onlyPopular;

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.headerTitle.toLowerCase().includes(q) ||
      c.headerSubtitle.toLowerCase().includes(q) ||
      c.categorySlug.toLowerCase().includes(q) ||
      (c.targetStudents || '').toLowerCase().includes(q) ||
      c.features.toLowerCase().includes(q);

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

  // =========================================================
  // PUBLIC HEADER & HOMEPAGE VIEW
  // =========================================================

  return (
    <div className="relative min-h-screen pb-20 md:pb-0">
      <GlassAmbientBackdrop />

      {/* FLOATING FROSTED GLASS HEADER */}
      <HeaderNav
        courses={courses}
        bookCategories={bookCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => {
          document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectCategory={(slug, q) => handleQuickFilterSelect(slug, q)}
        onNavigateHome={() => {
          setSelectedCategory('all');
          setSearchQuery('');
          navigate('/');
        }}
        onEnrollClick={handleEnrollClick}
        onOpenCategoryPage={(slug) => navigate(`/category/${slug}`)}
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
            <ClassSelectorStrip onNavigate={navigate} categories={categories} />
          </section>

          {/* 3 MAIN PATHWAYS (Academic, Skills, Admission) */}
          <section className="py-10" id="pathways" aria-label="প্রধান লার্নিং পাথওয়ে">
            <h2 className="sr-only">একাডেমিক, স্কিলস ও এডমিশন প্রোগ্রাম</h2>
            <div className="wrap">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Academic Pathway */}
                <div className="glass-card rounded-[24px] overflow-hidden flex flex-col">
                  <div className="h-28 bg-gradient-to-br from-[#ff5252]/95 via-[#e22b2b]/95 to-[#991b1b]/95 p-5 flex items-center justify-between text-white">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-rose-100">
                        স্কুল ও কলেজ
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        একাডেমিক পূর্ণাঙ্গ প্রস্তুতি
                      </h3>
                    </div>
                    <BookOpen className="w-9 h-9 text-white/85 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[#6B4C4F] leading-relaxed mb-4">
                        এক্সপার্ট টিচারদের রেগুলার লাইভ ক্লাস, মাস্টারবুক, মডেল টেস্ট ও ডেইলি ডাউট সলভিং নিয়ে সারা বছর A+ অর্জনের পারফেক্ট প্ল্যান।
                      </p>
                      <div className="text-xs text-[#5A3E41] font-semibold mb-4">
                        HSC ২০২৮ · HSC ২০২৭ · ১০ম শ্রেণি · ৬ষ্ঠ–৯ম শ্রেণি
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/academic/hsc/hsc-28/')}
                      className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb2026] hover:to-[#991b1b] text-white text-xs sm:text-sm font-bold shadow-[0_8px_20px_-8px_rgba(226,43,43,0.65)] transition cursor-pointer"
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
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.getSelection()?.toString()) {
                      return;
                    }
                    navigate('/skills');
                  }}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      navigate('/skills');
                    }
                  }}
                  className="glass-card rounded-[24px] overflow-hidden flex flex-col cursor-pointer group select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/60"
                >
                  <div className="h-28 bg-gradient-to-br from-rose-600/95 via-[#b91c1c]/95 to-[#4c0519]/95 p-5 flex items-center justify-between text-white">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-rose-100">
                        ক্যারিয়ার ও ফ্রিল্যান্সিং
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        দেশসেরা স্কিল প্ল্যাটফর্ম
                      </h3>
                    </div>
                    <Terminal
                      className="w-9 h-9 text-white/85 shrink-0 transition-transform duration-200 group-hover:scale-105"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[#6B4C4F] leading-relaxed mb-4">
                        দেশসেরা শিক্ষক, ৫ লাখ+ শিক্ষার্থী ও ৭০+ প্রফেশনাল অনলাইন কোর্স! স্পোকেন ইংলিশ, ফ্রিল্যান্সিং ও টেক স্কিলের পূর্ণাঙ্গ ভাণ্ডার।
                      </p>
                      <div className="text-xs text-[#5A3E41] font-semibold mb-4">
                        Spoken English · IELTS Complete · Web Dev · মার্কেটিং
                      </div>
                    </div>
                    <Link
                      className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55)] transition block"
                      href="/skills"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                          return;
                        }
                        e.preventDefault();
                        navigate('/skills');
                      }}
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
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.getSelection()?.toString()) {
                      return;
                    }
                    navigate('/admission');
                  }}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      navigate('/admission');
                    }
                  }}
                  className="glass-card rounded-[24px] overflow-hidden flex flex-col cursor-pointer group select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/60"
                >
                  <div className="h-28 bg-gradient-to-br from-[#be123c]/95 via-[#9f1239]/95 to-[#7f1d1d]/95 p-5 flex items-center justify-between text-white">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-rose-200">
                        স্বপ্নের বিশ্ববিদ্যালয়
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        ভার্সিটি + গুচ্ছ এডমিশন
                      </h3>
                    </div>
                    <Landmark
                      className="w-9 h-9 text-white/85 shrink-0 transition-transform duration-200 group-hover:scale-105"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-[#6B4C4F] leading-relaxed mb-4">
                        বুয়েট, মেডিকেল, ঢাবি ‘ক’, ‘খ’, ‘গ’ ইউনিট এবং গুচ্ছ ভর্তি পরীক্ষার সম্পূর্ণ প্রশ্নব্যাংক সমাধান ও দেশসেরা মক টেস্ট সিরিজ।
                      </p>
                      <div className="text-xs text-[#5A3E41] font-semibold mb-4">
                        Unit A (Science) · Unit B (Arts) · Unit C (Commerce)
                      </div>
                    </div>
                    <Link
                      className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-[#be123c] to-[#881337] hover:from-[#e11d48] hover:to-[#9f1239] text-white text-xs sm:text-sm font-bold shadow-[0_8px_20px_-8px_rgba(190,18,60,0.6)] transition block"
                      href="/admission"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                          return;
                        }
                        e.preventDefault();
                        navigate('/admission');
                      }}
                    >
                      এডমিশন কোর্সসমূহ দেখুন →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DYNAMIC COURSE SECTIONS & INTERACTIVE FILTER BAR */}
          <section className="py-8" id="courses">
            <div className="wrap">
              {/* Top Section Banner (Frosted Glass-Shade) */}
              <div className="glass-surface rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B91C1C] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#E22B2B] animate-pulse" />
                    সর্বোচ্চ রেটেড ও ট্রেন্ডিং
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F12]">
                    জনপ্রিয় লাইভ কোর্স ও অনলাইন ব্যাচ
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6B4C4F] max-w-xl">
                    টেন মিনিট স্কুলের শীর্ষ মেন্টরদের পরিচালিত কোর্সসমূহ এক নজরে দেখে সরাসরি ডিসকাউন্টেড মূল্যে নিশ্চিন্তে এনরোল করুন।
                  </p>
                </div>
                <BadgeCheck className="w-12 h-12 text-[#E22B2B] shrink-0" aria-hidden="true" />
              </div>

              {/* Interactive Discovery & Filter Controls (Frosted Glass Strip) */}
              <div className="glass-surface rounded-2xl p-4 mb-10 flex flex-wrap items-center justify-between gap-3">
                {/* Category Filter Tabs with Distinct Borders */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap border ${
                      selectedCategory === 'all'
                        ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-md shadow-red-500/25'
                        : 'border-rose-200/90 bg-white/90 text-[#2A0F12] hover:border-[#b91c1c] hover:bg-white hover:text-[#B91C1C] shadow-2xs'
                    }`}
                  >
                    সব ক্যাটাগরি ({toBengaliNumber(courses.length)})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap border ${
                        selectedCategory === cat.slug
                          ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-md shadow-red-500/25'
                          : 'border-rose-200/90 bg-white/90 text-[#2A0F12] hover:border-[#b91c1c] hover:bg-white hover:text-[#B91C1C] shadow-2xs'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Popular Toggle & Filter Reset (সকল মূল্য সীমা Dropdown Removed) */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOnlyPopular(!onlyPopular)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
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
                      className="text-xs font-bold text-[#B91C1C] hover:underline px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer whitespace-nowrap transition shadow-2xs"
                    >
                      ফিল্টার রিসেট ✕
                    </button>
                  )}
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
                categories.map((cat) => {
                  const catCourses = courses.filter((c) =>
                    courseMatchesCategorySlug(c, cat.slug)
                  );
                  if (catCourses.length === 0) return null;

                  const sectionId = `${cat.slug}-section`;

                  return (
                    <div
                      key={`category-sec-${cat.id}-${cat.slug}`}
                      className="glass-surface rounded-3xl p-5 sm:p-7 mb-10 relative cv-auto"
                      id={sectionId}
                    >
                      {/* Section Header with Title & "View All" Button */}
                      <div className="flex items-center justify-between mb-5 gap-3">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight">
                            {cat.name}
                          </h3>
                          {cat.subtitle && (
                            <span className="text-xs text-[#6B4C4F] font-medium block mt-0.5">
                              {cat.subtitle}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/category/${cat.slug}`)}
                            className="group/va glass-inset hover:bg-gradient-to-r hover:from-[#ff5252] hover:to-[#b91c1c] text-[#B91C1C] hover:text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-xs hover:shadow-md active:scale-95"
                            title={`${cat.name} এর সকল কোর্স দেখুন`}
                          >
                            <span>View All</span>
                            {catCourses.length > 4 && (
                              <span className="text-[11px] opacity-80 font-normal">
                                ({toBengaliNumber(catCourses.length)})
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 transition-transform group-hover/va:translate-x-0.5" />
                          </button>
                        </div>
                      </div>

                      {/* Exactly 4 cards of identical size in an equal 4-column responsive grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
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
        isAdminAuthenticated={Boolean(adminSession)}
        whatsappNumber={whatsappNumber}
        whatsappLink={whatsappLink}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav activeTab={getMobileActiveTab()} onTabChange={handleMobileNav} />

      {/* Floating Call, WhatsApp and Messenger Contact Stack */}
      <FloatingContactWidget
        whatsappLink={whatsappLink}
        whatsappNumber={whatsappNumber}
        callNumber={callNumber}
        messengerLink={messengerLink}
      />
    </div>
  );
}
