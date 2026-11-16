'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Category, Course, SiteSettings } from './types.ts';
import { CourseCard } from './components/public/CourseCard.tsx';
import { MobileBottomNav, MobileTab } from './components/public/MobileBottomNav.tsx';
import { CategoryPage } from './components/public/CategoryPage.tsx';
import { HeaderNav } from './components/public/HeaderNav.tsx';
import { AcademicPage, AcademicLevel } from './components/public/AcademicPage.tsx';
import { ClassSelectorStrip } from './components/public/ClassSelectorStrip.tsx';
import { GlassAmbientBackdrop } from './components/public/GlassAmbientBackdrop.tsx';
import { FloatingContactWidget } from './components/public/FloatingContactWidget.tsx';
import { SiteFooter } from './components/public/SiteFooter.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { toBengaliNumber } from './utils/format.ts';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { INITIAL_CATEGORIES, INITIAL_COURSES, INITIAL_SETTINGS } from './db/seedData.ts';
//testeste
type RouteState =
  | { view: 'home' }
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

  // 4. Books: /books/ or /category/books/
  if (clean === '/books' || clean === '/category/books' || clean === '/categories/books') {
    return { view: 'category', slug: 'books' };
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

  // 7. Junior School Classes: /class-6/, /class-7/, /class-8/
  const classMatch = clean.match(/^\/(?:academic\/)?class-?([6-8])$/);
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

export default function App() {
  const currentPathname = usePathname() || '/';
  const [currentPath, setCurrentPath] = useState<string>(currentPathname);
  const [currentHash, setCurrentHash] = useState<string>('');
  const [route, setRoute] = useState<RouteState>(() => parseCurrentRoute(currentPathname, ''));

  useEffect(() => {
    const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
    const safePath = typeof window !== 'undefined' ? window.location.pathname : currentPathname;
    setRoute(parseCurrentRoute(safePath, rawHash));
    setCurrentPath(safePath);
    setCurrentHash(rawHash);
  }, [currentPathname]);

  useEffect(() => {
    try {
      setAuthToken(sessionStorage.getItem('10ms_auth_token'));
      setAdminEmail(sessionStorage.getItem('10ms_admin_email') || '');
      setAdminName(sessionStorage.getItem('10ms_admin_name') || '');
    } catch {
      // sessionStorage may be unavailable during server rendering or restricted environments.
    }
  }, []);

  // Auth state initialized from sessionStorage so admin access persists across page refreshes.
  // We intentionally avoid reading sessionStorage during render to prevent hydration mismatches.
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('');

  const handleAdminLogin = (token: string, email: string, name: string) => {
    setAuthToken(token);
    setAdminEmail(email);
    setAdminName(name);
    try {
      sessionStorage.setItem('10ms_auth_token', token);
      sessionStorage.setItem('10ms_admin_email', email);
      sessionStorage.setItem('10ms_admin_name', name);
    } catch {}
    navigate('/admin/dashboard');
  };

  const handleAdminLogout = () => {
    setAuthToken(null);
    setAdminEmail('');
    setAdminName('');
    try {
      sessionStorage.removeItem('10ms_auth_token');
      sessionStorage.removeItem('10ms_admin_email');
      sessionStorage.removeItem('10ms_admin_name');
    } catch {}
    navigate('/');
  };

  // Public portal data initialized with instant seed data
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [settings, setSettings] = useState<SiteSettings | null>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState<boolean>(false);

  // Search & Discovery Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [onlyPopular, setOnlyPopular] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const res = await fetch('/api/download-project-zip');
      if (!res.ok) throw new Error('ZIP ফাইল তৈরি ব্যর্থ হয়েছে');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '10ms-affiliate-portal-full.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      alert('ডাউনলোড সমস্যা: ' + err.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Live Countdown State
  const [countdown, setCountdown] = useState({ d: '02', h: '08', m: '26', s: '55' });

  // Horizontal scroll refs by category slug
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Mobile Bottom Navigation & Category Expand States
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleExpandCategory = (slug: string) => {
    setExpandedCategories((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

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
    setCurrentPath(targetPath);
    setCurrentHash(targetHash);
    setRoute(parseCurrentRoute(targetPath, targetHash));

    if (options?.noScroll || isSamePath) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      const h = window.location.hash || '';
      setCurrentPath(p);
      setCurrentHash(h);
      setRoute(parseCurrentRoute(p, h));
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

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

  // Countdown timer effect matching user's original script or admin configured target date
  useEffect(() => {
    let targetTime: number;

    if (settings?.countdownTargetDate) {
      const parsed = new Date(settings.countdownTargetDate).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) {
        targetTime = parsed;
      } else {
        const target = new Date();
        target.setHours(target.getHours() + 56, target.getMinutes() + 42, target.getSeconds() + 15, 0);
        targetTime = target.getTime();
      }
    } else {
      const target = new Date();
      target.setHours(target.getHours() + 56, target.getMinutes() + 42, target.getSeconds() + 15, 0);
      targetTime = target.getTime();
    }

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({
        d: String(d).padStart(2, '0'),
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [settings?.countdownTargetDate]);

  const fetchPublicData = useCallback(async () => {
    try {
      const res = await fetch('/api/public/data');
      if (res.ok) {
        const data = await res.json();
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }
        if (data.courses && data.courses.length > 0) {
          setCourses(data.courses);
        }
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.siteTitle && typeof document !== 'undefined') {
            document.title = data.settings.siteTitle;
          }
        }
      }
    } catch (err) {
      console.warn('Backend data fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [setCategories, setCourses, setSettings]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await fetchPublicData();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchPublicData]);

  // Sync browser document.title for all dynamic academic routes and catalog views
  useEffect(() => {
    if (route.view === 'academic') {
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
        const cNum = route.batchOrClass.replace('class', '');
        document.title = `${toBengaliNumber(parseInt(cNum, 10) || 6)} শ্রেণি অনলাইন ব্যাচ — ১০ মিনিট স্কুল`;
      }
    } else if (route.view === 'category') {
      const cat = categories.find((c) => c.slug === route.slug);
      document.title = cat ? `${cat.name} — ১০ মিনিট স্কুল` : 'কোর্স ক্যাটালগ — ১০ মিনিট স্কুল';
    } else if (route.view === 'home') {
      document.title =
        settings?.siteTitle || '১০ মিনিট স্কুল কোর্স — ৩D ক্লাস সিলেক্টর ও মডার্ন কোর্স পোর্টাল';
    }
  }, [route, categories, settings?.siteTitle]);

  // Handle Instant Direct Affiliate Link & Outbound Tracking (No Details Page, No Confirmation Modal)
  const handleEnrollClick = (course: Course, referrer = 'course_card') => {
    const targetUrl = course.affiliateUrl || `/go/${course.slug}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    // Asynchronous click recording in background
    fetch(`/api/public/click/${course.slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer }),
    }).catch((err) => {
      console.error('Click tracking error:', err);
    });

    // Update local click count in memory
    setCourses((prev) =>
      prev.map((c) =>
        c.id === course.id ? { ...c, clickCount: (c.clickCount || 0) + 1 } : c
      )
    );
  };

  const handleDirectCourseLink = (slug: string, referrer = 'footer_link') => {
    const match = courses.find((c) => c.slug === slug);
    if (match) {
      handleEnrollClick(match, referrer);
    } else {
      window.open(`/go/${slug}`, '_blank', 'noopener,noreferrer');
    }
  };

  const scrollRow = (slug: string, dir: number) => {
    const el = rowRefs.current[slug];
    if (el) {
      el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  const handleQuickFilterSelect = (catSlug: string, queryText = '') => {
    if (route.view !== 'home') {
      window.history.pushState({}, '', '/');
      setRoute({ view: 'home' });
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

  const whatsappNumber = settings?.whatsappNumber || '01608-949565';
  const whatsappLink = settings?.whatsappLink || 'https://wa.me/8801814946474';

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
    if (!authToken) {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLogin}
          onBackToSite={() => navigate('/')}
        />
      );
    }

    return (
      <AdminDashboard
        authToken={authToken}
        adminEmail={adminEmail}
        adminName={adminName}
        currentPath={currentPath}
        onNavigate={navigate}
        onLogout={handleAdminLogout}
        onDataMutated={fetchPublicData}
        onDownloadZip={handleDownloadZip}
      />
    );
  }

  if (route.view === 'category') {
    return (
      <div className="relative min-h-screen pb-20 md:pb-0">
        <GlassAmbientBackdrop />

        <HeaderNav
          courses={courses}
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
          onDownloadZip={handleDownloadZip}
          isDownloadingZip={isDownloadingZip}
          authToken={authToken}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
        />

        <MobileBottomNav activeTab={getMobileActiveTab()} onTabChange={handleMobileNav} />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
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
            onNavigate={navigate}
            onEnrollClick={handleEnrollClick}
          />
        </main>

        {/* Modern Organic Wave Footer with Payment Bar and Full Links */}
        <SiteFooter
          onNavigate={navigate}
          onQuickFilter={handleQuickFilterSelect}
          onDirectCourseLink={handleDirectCourseLink}
          onDownloadZip={handleDownloadZip}
          isDownloadingZip={isDownloadingZip}
          authToken={authToken}
          whatsappNumber={whatsappNumber}
          whatsappLink={whatsappLink}
        />

        <MobileBottomNav activeTab={getMobileActiveTab()} onTabChange={handleMobileNav} />

        <FloatingContactWidget
          whatsappLink={whatsappLink}
          whatsappNumber={whatsappNumber}
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
      c.features.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategory === 'all' || c.categorySlug === selectedCategory;

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
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="wrap relative z-10 text-center"
            >
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

              {/* Urgent Countdown Timer (Frosted Glass Strip) */}
              {settings?.showCountdownTimer !== false && (
                <div
                  onClick={() => {
                    if (settings?.countdownTargetCourse && settings.countdownTargetCourse !== 'all') {
                      const match = courses.find((c) => c.slug === settings.countdownTargetCourse);
                      if (match) {
                        handleQuickFilterSelect(match.categorySlug, match.title.split('—')[0].trim());
                      }
                    }
                  }}
                  className={`inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 glass-surface px-5 py-3 rounded-2xl mb-2 sm:mb-4 tabular-nums ${
                    settings?.countdownTargetCourse && settings.countdownTargetCourse !== 'all'
                      ? 'cursor-pointer hover:bg-white/80 transition-colors'
                      : ''
                  }`}
                  title={settings?.countdownTargetCourse && settings.countdownTargetCourse !== 'all' ? 'এই কোর্সের অফারে যেতে ক্লিক করুন' : undefined}
                >
                  <div className="flex items-center gap-2 text-[#B91C1C] text-xs sm:text-sm font-bold">
                    <span className="material-symbols-outlined text-[20px] text-[#E22B2B] animate-pulse">
                      alarm
                    </span>
                    <span>
                      {settings?.countdownLabel ||
                        'HSC ২৮ আর্লি বার্ড স্পেশাল উপহার সহ ছাড়ে বাকি:'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
                      <b className="text-base sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
                        {countdown.d}
                      </b>
                      <span className="text-[10px] text-[#6B4C4F]">দিন</span>
                    </div>
                    <span className="text-[#E22B2B] font-bold">:</span>
                    <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
                      <b className="text-base sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
                        {countdown.h}
                      </b>
                      <span className="text-[10px] text-[#6B4C4F]">ঘণ্টা</span>
                    </div>
                    <span className="text-[#E22B2B] font-bold">:</span>
                    <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
                      <b className="text-base sm:text-lg text-[#2A0F12] block leading-none font-bold font-mono">
                        {countdown.m}
                      </b>
                      <span className="text-[10px] text-[#6B4C4F]">মিনিট</span>
                    </div>
                    <span className="text-[#E22B2B] font-bold">:</span>
                    <div className="glass-inset rounded-xl px-2.5 py-1 text-center min-w-[50px]">
                      <b className="text-base sm:text-lg text-[#E22B2B] block leading-none font-bold font-mono">
                        {countdown.s}
                      </b>
                      <span className="text-[10px] text-[#6B4C4F]">সেকেন্ড</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* 3D CATEGORY & CLASS SELECTOR STRIP (GLASS-SHADE S-WAVE STRUCTURE) */}
            <ClassSelectorStrip onNavigate={navigate} />
          </section>

          {/* 3 MAIN PATHWAYS (Academic, Skills, Admission) */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.5 }}
            className="py-10"
            id="pathways"
          >
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
                    <span className="material-symbols-outlined text-4xl text-white/85">
                      library_books
                    </span>
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
                <div className="glass-card rounded-[24px] overflow-hidden flex flex-col">
                  <div className="h-28 bg-gradient-to-br from-rose-600/95 via-[#b91c1c]/95 to-[#4c0519]/95 p-5 flex items-center justify-between text-white">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-rose-100">
                        ক্যারিয়ার ও ফ্রিল্যান্সিং
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        দেশসেরা স্কিল প্ল্যাটফর্ম
                      </h3>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-white/85">
                      terminal
                    </span>
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
                    <a
                      className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55)] transition"
                      href="#skills-section"
                    >
                      সকল স্কিলস কোর্স দেখুন →
                    </a>
                  </div>
                </div>

                {/* Admission Pathway */}
                <div className="glass-card rounded-[24px] overflow-hidden flex flex-col">
                  <div className="h-28 bg-gradient-to-br from-[#be123c]/95 via-[#9f1239]/95 to-[#7f1d1d]/95 p-5 flex items-center justify-between text-white">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-rose-200">
                        স্বপ্নের বিশ্ববিদ্যালয়
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        ভার্সিটি + গুচ্ছ এডমিশন
                      </h3>
                    </div>
                    <span className="material-symbols-outlined text-4xl text-white/85">
                      account_balance
                    </span>
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
                    <a
                      className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-[#be123c] to-[#881337] hover:from-[#e11d48] hover:to-[#9f1239] text-white text-xs sm:text-sm font-bold shadow-[0_8px_20px_-8px_rgba(190,18,60,0.6)] transition"
                      href="#admission-section"
                    >
                      এডমিশন কোর্সসমূহ দেখুন →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

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
                <span className="material-symbols-outlined text-5xl text-[#E22B2B] shrink-0">
                  verified
                </span>
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

              {/* Loading Skeleton */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-96 rounded-2xl glass-surface animate-pulse"
                    />
                  ))}
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
                      <span className="material-symbols-outlined text-4xl text-rose-400">
                        search_off
                      </span>
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
                      {filteredCourses.map((course, idx) => (
                        <motion.div
                          key={`filter-${course.id}-${course.slug}`}
                          initial={{ opacity: 0, y: 18 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.05 }}
                          transition={{ duration: 0.35, delay: idx * 0.04 }}
                          className="h-full flex flex-col"
                        >
                          <CourseCard
                            course={course}
                            onEnrollClick={handleEnrollClick}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* DEFAULT CATEGORY-WISE SECTIONS (Frosted Glass Container) */
                categories.map((cat) => {
                  const catCourses = courses.filter((c) => c.categorySlug === cat.slug);
                  if (catCourses.length === 0) return null;

                  const sectionId = `${cat.slug}-section`;

                  return (
                    <motion.div
                      key={`category-sec-${cat.id}-${cat.slug}`}
                      initial={{ opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.05 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="glass-surface rounded-3xl p-5 sm:p-7 mb-10 relative"
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
                        {catCourses.slice(0, 4).map((course, idx) => (
                          <motion.div
                            key={`cat-${cat.slug}-course-${course.id}-${course.slug}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.05 }}
                            transition={{ duration: 0.4, delay: idx * 0.08 }}
                            className="h-full flex flex-col"
                          >
                            <CourseCard
                              course={course}
                              onEnrollClick={handleEnrollClick}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </section>

          {/* STUDENT REVIEWS & EXPERIENCE SECTION (GLASS-SHADE) */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.5 }}
            className="py-10"
            id="reviews"
          >
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
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.05 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
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
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* DIRECT ADMISSION SUPPORT BAR */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.5 }}
            className="py-6"
          >
            <div className="wrap">
              <div className="glass-surface p-5 sm:p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                    <span className="material-symbols-outlined text-[28px]">
                      support_agent
                    </span>
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
                <a
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-full transition shrink-0 whitespace-nowrap shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  <span>{whatsappNumber} (WhatsApp)</span>
                </a>
              </div>
            </div>
          </motion.section>
        </main>

      {/* Modern Organic Wave Footer with Payment Bar and Full Links */}
      <SiteFooter
        onNavigate={navigate}
        onQuickFilter={handleQuickFilterSelect}
        onDirectCourseLink={handleDirectCourseLink}
        onDownloadZip={handleDownloadZip}
        isDownloadingZip={isDownloadingZip}
        authToken={authToken}
        whatsappNumber={whatsappNumber}
        whatsappLink={whatsappLink}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav activeTab={getMobileActiveTab()} onTabChange={handleMobileNav} />

      {/* Floating WhatsApp and Message Contact Stack */}
      <FloatingContactWidget
        whatsappLink={whatsappLink}
        whatsappNumber={whatsappNumber}
        messengerLink={settings?.messengerLink || 'https://m.me/10minuteschool'}
      />
    </div>
  );
}
