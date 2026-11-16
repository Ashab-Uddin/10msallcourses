import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Category, ClickRecord, Course, OfferTimer, SiteSettings } from '../../types.ts';
import { computeOfferTimerStatus } from '../../lib/offerTimerUtils.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { GlassAmbientBackdrop } from '../public/GlassAmbientBackdrop.tsx';
import { AdminNavbar } from './AdminNavbar.tsx';
import { AdminFooter } from './AdminFooter.tsx';

const CourseEditorPage = dynamic(
  () => import('./CourseEditorPage.tsx').then((m) => m.CourseEditorPage),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm font-bold text-[#6B4C4F]">
        কোর্স এডিটর লোড হচ্ছে...
      </div>
    ),
  }
);

const OfferTimerManager = dynamic(
  () => import('./OfferTimerManager.tsx').then((m) => m.OfferTimerManager),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm font-bold text-[#6B4C4F]">
        অফার টাইমার ম্যানেজার লোড হচ্ছে...
      </div>
    ),
  }
);

const CourseCard = dynamic(
  () => import('../public/CourseCard.tsx').then((m) => m.CourseCard),
  { ssr: false }
);
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Layers,
  Settings,
  LogOut,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  Sparkles,
  Clock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  SlidersHorizontal,
  AlarmClock,
} from 'lucide-react';

interface AdminDashboardProps {
  authToken: string;
  adminEmail: string;
  adminName: string;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onLogout: () => void;
  onDataMutated: () => void;
  onDownloadZip?: () => void;
}

export type AdminPageTab =
  | 'overview'
  | 'all_courses'
  | 'add_course'
  | 'active_courses'
  | 'inactive_courses'
  | 'categories'
  | 'offer_timers'
  | 'settings'
  | 'course_editor';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  authToken,
  adminEmail,
  adminName,
  currentPath = '/admin/overview',
  onNavigate,
  onLogout,
  onDataMutated,
  onDownloadZip,
}) => {
  // Determine initial tab from currentPath
  const getTabFromPath = (p: string): AdminPageTab => {
    if (p.includes('/admin/courses/new')) return 'add_course';
    if (p.includes('/admin/courses/active')) return 'active_courses';
    if (p.includes('/admin/courses/inactive')) return 'inactive_courses';
    if (p.includes('/admin/courses')) return 'all_courses';
    if (p.includes('/admin/categories')) return 'categories';
    if (p.includes('/admin/offer-timers')) return 'offer_timers';
    if (p.includes('/admin/settings')) return 'settings';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<AdminPageTab>(() => getTabFromPath(currentPath));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Core Data States
  const [stats, setStats] = useState({
    totalCourses: 0,
    activeCourses: 0,
    inactiveCourses: 0,
    popularCourses: 0,
    totalClicks: 0,
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentClicks, setRecentClicks] = useState<ClickRecord[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [offerTimers, setOfferTimers] = useState<OfferTimer[]>([]);
  const [serverNow, setServerNow] = useState<string>('');
  const [overviewNowMs, setOverviewNowMs] = useState<number>(() => Date.now());

  // Settings form local state
  const [siteTitle, setSiteTitle] = useState('');
  const [callNumber, setCallNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [messengerLink, setMessengerLink] = useState('');
  const [heroBadge, setHeroBadge] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [showCountdownTimer, setShowCountdownTimer] = useState(true);
  const [countdownLabel, setCountdownLabel] = useState('');
  const [countdownTargetCourse, setCountdownTargetCourse] = useState('all');
  const [countdownTargetDate, setCountdownTargetDate] = useState('');
  const [defaultAffiliateRef, setDefaultAffiliateRef] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Course Management Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [statusTogglingId, setStatusTogglingId] = useState<number | null>(null);

  // Modals & Editor State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [previewingCourse, setPreviewingCourse] = useState<Course | null>(null);
  const [deleteModalCourse, setDeleteModalCourse] = useState<Course | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catSubtitle, setCatSubtitle] = useState('');
  const [catBadgeColor, setCatBadgeColor] = useState('red');
  const [catDisplayOrder, setCatDisplayOrder] = useState<number>(1);
  const [savingCat, setSavingCat] = useState(false);
  const [deleteModalCat, setDeleteModalCat] = useState<Category | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Sync tab with external route change without calling setState synchronously inside useEffect
  const [prevPath, setPrevPath] = useState(currentPath);
  if (currentPath !== prevPath) {
    setPrevPath(currentPath);
    if (currentPath) {
      const nextTab = getTabFromPath(currentPath);
      setActiveTab(nextTab);
      if (nextTab === 'add_course') {
        setEditingCourse(null);
      }
    }
  }

  // Tab switcher with URL pushState
  const handleTabSwitch = (tab: AdminPageTab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    if (tab === 'add_course') setEditingCourse(null);

    const pathMap: Record<string, string> = {
      overview: '/admin/overview',
      all_courses: '/admin/courses',
      add_course: '/admin/courses/new',
      active_courses: '/admin/courses/active',
      inactive_courses: '/admin/courses/inactive',
      categories: '/admin/categories',
      offer_timers: '/admin/offer-timers',
      settings: '/admin/settings',
    };

    const targetPath = pathMap[tab] || '/admin/overview';
    if (onNavigate) {
      onNavigate(targetPath);
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Fetch Dashboard Overview & Core Data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('এডমিন ডেটা লোড করতে ব্যর্থ হয়েছে।');

      const data = await res.json();
      setStats(data.stats || {});
      setCourses(data.courses || []);
      setCategories(data.categories || []);
      setRecentClicks(data.recentClicks || []);
      setOfferTimers(data.offerTimers || []);
      if (data.serverNow) {
        setServerNow(data.serverNow);
        const parsedNow = new Date(data.serverNow).getTime();
        if (Number.isFinite(parsedNow)) {
          setOverviewNowMs(parsedNow);
        }
      } else {
        setOverviewNowMs(Date.now());
      }

      if (data.settings) {
        setSettings(data.settings);
        setSiteTitle(data.settings.siteTitle || '');
        setCallNumber(data.settings.callNumber || data.settings.whatsappNumber || '');
        setWhatsappNumber(data.settings.whatsappNumber || '');
        setWhatsappLink(data.settings.whatsappLink || '');
        setMessengerLink(data.settings.messengerLink || 'https://m.me/10minuteschool');
        setHeroBadge(data.settings.heroBadge || '');
        setHeroTitle(data.settings.heroTitle || '');
        setHeroSubtitle(data.settings.heroSubtitle || '');
        setCountdownLabel(data.settings.countdownLabel || '');
        setShowCountdownTimer(data.settings.showCountdownTimer !== false);
        setCountdownTargetCourse(data.settings.countdownTargetCourse || 'all');
        setCountdownTargetDate(data.settings.countdownTargetDate || '');
        setDefaultAffiliateRef(data.settings.defaultAffiliateRef || '');
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setError(err.message || 'ডেটা লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await Promise.resolve();
      if (!cancelled) {
        await fetchDashboardData();
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData]);

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.slug, cat.name);
    }
    return map;
  }, [categories]);

  // Synchronize browser URL on popstate
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Filtered Courses List
  const displayedCourses = useMemo(() => {
    return courses.filter((course) => {
      // 1. Status Filter by Tab or explicit selector
      if (activeTab === 'active_courses') {
        if (course.status !== 'active') return false;
      } else if (activeTab === 'inactive_courses') {
        if (course.status !== 'inactive') return false;
      } else if (filterStatus !== 'all') {
        if (course.status !== filterStatus) return false;
      }

      // 2. Category Filter
      if (filterCat !== 'all' && course.categorySlug !== filterCat) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = course.title.toLowerCase().includes(q);
        const matchesSlug = course.slug.toLowerCase().includes(q);
        const matchesTarget = (course.targetStudents || '').toLowerCase().includes(q);
        const matchesBadge = (course.shortBadge || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSlug && !matchesTarget && !matchesBadge) {
          return false;
        }
      }

      return true;
    });
  }, [courses, activeTab, filterStatus, filterCat, searchQuery]);

  // Handle Course Active/Inactive Quick Toggle
  const handleToggleStatus = async (course: Course) => {
    const newStatus = course.status === 'active' ? 'inactive' : 'active';
    setStatusTogglingId(course.id);

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('কোর্সের স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।');

      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c))
      );

      setStats((prev) => ({
        ...prev,
        activeCourses: newStatus === 'active' ? prev.activeCourses + 1 : prev.activeCourses - 1,
        inactiveCourses: newStatus === 'inactive' ? prev.inactiveCourses + 1 : prev.inactiveCourses - 1,
      }));

      onDataMutated();
      showToast(
        newStatus === 'active'
          ? `"${course.title}" কোর্সটি এখন ওয়েবসাইটে চালু (Active) রয়েছে।`
          : `"${course.title}" কোর্সটি বন্ধ (Inactive / ভর্তি বন্ধ) করা হয়েছে।`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'স্ট্যাটাস পরিবর্তনে ত্রুটি হয়েছে।', 'error');
    } finally {
      setStatusTogglingId(null);
    }
  };

  // Handle Course Save / Create
  const handleSaveCourse = async (courseData: any, id?: number) => {
    try {
      const url = id ? `/api/admin/courses/${id}` : '/api/admin/courses';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(courseData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'কোর্সটি সংরক্ষণ করা সম্ভব হয়নি।');
      }

      await fetchDashboardData();
      onDataMutated();
      setEditingCourse(null);
      handleTabSwitch('all_courses');
      showToast(id ? 'কোর্স সফলভাবে আপডেট করা হয়েছে।' : 'নতুন কোর্স সফলভাবে তৈরি হয়েছে।', 'success');
    } catch (err: any) {
      throw err;
    }
  };

  // Handle Delete Course
  const handleConfirmDeleteCourse = async () => {
    if (!deleteModalCourse) return;

    try {
      const res = await fetch(`/api/admin/courses/${deleteModalCourse.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) throw new Error('কোর্সটি মুছে ফেলা সম্ভব হয়নি।');

      setCourses((prev) => prev.filter((c) => c.id !== deleteModalCourse.id));
      setStats((prev) => ({
        ...prev,
        totalCourses: prev.totalCourses - 1,
        activeCourses:
          deleteModalCourse.status === 'active' ? prev.activeCourses - 1 : prev.activeCourses,
        inactiveCourses:
          deleteModalCourse.status === 'inactive' ? prev.inactiveCourses - 1 : prev.inactiveCourses,
      }));

      onDataMutated();
      showToast(`"${deleteModalCourse.title}" কোর্সটি মুছে ফেলা হয়েছে।`, 'info');
      setDeleteModalCourse(null);
    } catch (err: any) {
      showToast(err.message || 'ডিলিট করতে ব্যর্থ হয়েছে।', 'error');
    }
  };

  // Handle Save / Create Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSlug.trim()) {
      showToast('ক্যাটাগরির নাম ও স্লাগ দেওয়া আবশ্যক।', 'error');
      return;
    }

    setSavingCat(true);
    try {
      const payload = {
        name: catName.trim(),
        slug: catSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        subtitle: catSubtitle.trim() || null,
        badgeColor: catBadgeColor,
        displayOrder: Number(catDisplayOrder) || 1,
        status: 'active',
      };

      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('ক্যাটাগরি সংরক্ষণ করা সম্ভব হয়নি।');

      await fetchDashboardData();
      onDataMutated();
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCatName('');
      setCatSlug('');
      setCatSubtitle('');
      showToast(editingCategory ? 'ক্যাটাগরি আপডেট হয়েছে।' : 'নতুন ক্যাটাগরি তৈরি হয়েছে।', 'success');
    } catch (err: any) {
      showToast(err.message || 'ত্রুটি হয়েছে।', 'error');
    } finally {
      setSavingCat(false);
    }
  };

  // Handle Delete Category
  const handleConfirmDeleteCategory = async () => {
    if (!deleteModalCat) return;

    try {
      const res = await fetch(`/api/admin/categories/${deleteModalCat.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'ক্যাটাগরিটি মুছে ফেলা সম্ভব হয়নি।');
      }

      setCategories((prev) => prev.filter((c) => c.id !== deleteModalCat.id));
      onDataMutated();
      showToast(`"${deleteModalCat.name}" ক্যাটাগরি মুছে ফেলা হয়েছে।`, 'info');
      setDeleteModalCat(null);
    } catch (err: any) {
      showToast(err.message || 'ক্যাটাগরি ডিলিট ব্যর্থ হয়েছে।', 'error');
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const payload = {
        siteTitle: siteTitle.trim(),
        callNumber: callNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
        whatsappLink: whatsappLink.trim(),
        messengerLink: messengerLink.trim(),
        heroBadge: heroBadge.trim(),
        heroTitle: heroTitle.trim(),
        heroSubtitle: heroSubtitle.trim(),
        showCountdownTimer,
        countdownLabel: countdownLabel.trim(),
        countdownTargetCourse,
        countdownTargetDate,
        defaultAffiliateRef: defaultAffiliateRef.trim(),
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।');

      const updated = await res.json();
      setSettings(updated);
      onDataMutated();
      showToast('পোর্টাল সেটিংস সফলভাবে সংরক্ষিত হয়েছে।', 'success');
    } catch (err: any) {
      showToast(err.message || 'সেটিংস সংরক্ষণে ত্রুটি।', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Quick Countdown Toggle from Overview
  const handleQuickCountdownToggle = async () => {
    const updatedVal = !showCountdownTimer;
    setShowCountdownTimer(updatedVal);

    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ showCountdownTimer: updatedVal }),
      });
      onDataMutated();
      showToast(
        updatedVal ? 'হোমপেজ কাউন্টডাউন টাইমার সক্রিয় করা হয়েছে।' : 'হোমপেজ কাউন্টডাউন টাইমার বন্ধ করা হয়েছে।',
        'info'
      );
    } catch {
      setShowCountdownTimer(!updatedVal);
    }
  };

  const handleNavigateHome = () => {
    if (onNavigate) {
      onNavigate('/');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const activeOfferTimersCount = useMemo(
    () =>
      offerTimers.filter(
        (t) => computeOfferTimerStatus(t, overviewNowMs) === 'active'
      ).length,
    [offerTimers, overviewNowMs]
  );

  // Keep admin destinations in one place with consistent icons and counters
  const sidebarNavItems = [
    {
      id: 'overview' as AdminPageTab,
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'all_courses' as AdminPageTab,
      label: 'All Courses',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      badge: stats.totalCourses,
    },
    {
      id: 'add_course' as AdminPageTab,
      label: 'Add New Course',
      icon: <PlusCircle className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'active_courses' as AdminPageTab,
      label: 'Active Courses',
      icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
      badge: stats.activeCourses,
    },
    {
      id: 'inactive_courses' as AdminPageTab,
      label: 'Inactive Courses',
      icon: <XCircle className="w-4 h-4 shrink-0" />,
      badge: stats.inactiveCourses,
    },
    {
      id: 'categories' as AdminPageTab,
      label: 'Course Categories',
      icon: <Layers className="w-4 h-4 shrink-0" />,
      badge: categories.length,
    },
    {
      id: 'offer_timers' as AdminPageTab,
      label: 'Offer Timer',
      icon: <AlarmClock className="w-4 h-4 shrink-0" />,
      badge: activeOfferTimersCount,
    },
    {
      id: 'settings' as AdminPageTab,
      label: 'Settings',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  // Keep recentClicks referenced cleanly for overview analytics summary if available
  const totalRecentClicks = recentClicks.length;

  return (
    <div className="relative min-h-screen text-[#2A0F12] flex flex-col">
      {/* Main Website Ambient Frosted Glass Backdrop */}
      <GlassAmbientBackdrop />

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-6 z-[60] animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 max-w-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 text-emerald-900 border-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-50/95 text-rose-900 border-rose-300'
                : 'bg-[#2A0F12]/95 text-white border-rose-900'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. DEDICATED ADMIN FLOATING NAVBAR (Main Website Theme, Admin Content) */}
      <AdminNavbar
        activeTab={activeTab}
        onSelectTab={handleTabSwitch}
        onNavigateHome={handleNavigateHome}
        onRequestLogout={() => setShowLogoutConfirm(true)}
        adminName={adminName}
        adminEmail={adminEmail}
        stats={stats}
        categoriesCount={categories.length}
        activeOfferTimersCount={activeOfferTimersCount}
      />

      {/* Quick Section Strip (Hidden on Mobile, visible on Tablet up to lg) */}
      <div className="relative z-20 hidden md:block lg:hidden max-w-[1440px] w-full mx-auto px-3 sm:px-6 pt-4">
        <div className="glass-surface rounded-2xl p-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-expanded={mobileSidebarOpen}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>মেনু</span>
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {sidebarNavItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (activeTab === 'course_editor' && item.id === 'all_courses');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSwitch(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    isActive
                      ? 'bg-rose-50 text-[#eb1c24] border border-rose-200/80 shadow-2xs'
                      : 'text-[#6B4C4F] hover:text-[#2A0F12] hover:bg-white/70'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. MIDDLE WORKSPACE: GLASS SIDEBAR + MAIN CONTENT */}
      <div className="relative z-10 flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT SIDEBAR (7 Admin Views) */}
        <aside
          className={`w-full lg:w-72 shrink-0 lg:sticky lg:top-24 space-y-4 ${
            mobileSidebarOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="glass-strong rounded-3xl p-4 sm:p-5 space-y-4">
            {/* Sidebar Identity Header */}
            <div className="flex items-center justify-between gap-3 px-2 border-b border-rose-200/50 pb-4">
              <div className="min-w-0">
                <div className="text-sm font-black text-[#2A0F12] tracking-tight flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#E22B2B] shrink-0" />
                  <span className="truncate">Admin Portal</span>
                </div>
                <div className="text-[11px] font-medium text-[#6B4C4F] truncate mt-0.5">
                  কোর্স ম্যানেজমেন্ট ড্যাশবোর্ড
                </div>
              </div>
              <span className="bg-rose-100/90 text-[#b91c1c] border border-rose-200/70 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                v2.5
              </span>
            </div>

            {/* Navigation Menu List */}
            <nav className="space-y-1.5 select-none" aria-label="Admin Navigation">
              {sidebarNavItems.map((item) => {
                const isActive =
                  activeTab === item.id ||
                  (activeTab === 'course_editor' && item.id === 'all_courses');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabSwitch(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_8px_22px_-6px_rgba(226,43,43,0.45)]'
                        : 'text-[#2A0F12] hover:bg-rose-50/90 hover:text-[#b91c1c] bg-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? 'text-white' : 'text-[#6B4C4F]'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>

                    {typeof item.badge === 'number' && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-rose-100/80 text-[#b91c1c]'
                        }`}
                      >
                        {toBengaliNumber(item.badge)}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Admin Profile & Quick Website Link inside Sidebar */}
            <div className="pt-4 border-t border-rose-200/50 space-y-2.5">
              <div className="glass-inset px-3.5 py-2.5 rounded-2xl text-[11px]">
                <div className="font-bold text-[#2A0F12] truncate">
                  {(adminName || 'Admin Manager').replace(/\s*\(Admin\)\s*/gi, '').trim() || 'Admin Manager'}
                </div>
                <div className="text-[#6B4C4F] truncate font-mono text-[10.5px]">
                  {adminEmail || 'admin@10ms.com'}
                </div>
              </div>

              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigateHome();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-rose-200/70 bg-white/60 hover:bg-rose-50 text-xs font-bold text-[#991b1b] transition"
              >
                <span>পাবলিক ওয়েবসাইট দেখুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 w-full">
          {error && courses.length === 0 ? (
            <div className="glass-strong rounded-3xl p-8 text-center space-y-3">
              <AlertCircle className="w-9 h-9 text-[#E22B2B] mx-auto" />
              <h2 className="text-base font-black text-[#2A0F12]">ডেটা লোড করতে সমস্যা হয়েছে</h2>
              <p className="text-xs text-[#6B4C4F] max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>পুনরায় চেষ্টা করুন</span>
              </button>
            </div>
          ) : loading && courses.length === 0 ? (
            <div className="py-24 text-center space-y-3 glass-strong rounded-3xl p-8">
              <RefreshCw className="w-8 h-8 text-[#eb1c24] animate-spin mx-auto" />
              <p className="text-sm font-bold text-[#6B4C4F]">অ্যাডমিন ড্যাশবোর্ড লোড হচ্ছে...</p>
            </div>
          ) : activeTab === 'course_editor' || activeTab === 'add_course' ? (
            /* ===================================================== */
            /* VIEW 1: DEDICATED ADD / EDIT COURSE PAGE              */
            /* ===================================================== */
            <CourseEditorPage
              course={editingCourse}
              categories={categories}
              onBackToList={() => handleTabSwitch('all_courses')}
              onSave={handleSaveCourse}
            />
          ) : activeTab === 'overview' ? (
            /* ===================================================== */
            /* VIEW 2: EXECUTIVE OVERVIEW DASHBOARD                  */
            /* ===================================================== */
            <div className="space-y-6">
              {/* Offer Countdown Banner Quick Controller */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center font-bold shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-[#2A0F12]">
                        হোমপেজ অফার কাউন্টডাউন টাইমার
                      </h3>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          showCountdownTimer
                            ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {showCountdownTimer ? 'চালু আছে (ON)' : 'বন্ধ রয়েছে (OFF)'}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B4C4F] mt-0.5">
                      {activeOfferTimersCount > 0
                        ? `বর্তমানে ${toBengaliNumber(activeOfferTimersCount)}টি কোর্স-ভিত্তিক অফার টাইমার হোমপেজে চলছে।`
                        : countdownLabel || 'HSC ২৮ আর্লি বার্ড স্পেশাল উপহার সহ ছাড়ে বাকি:'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
                  <button
                    type="button"
                    onClick={handleQuickCountdownToggle}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      showCountdownTimer
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {showCountdownTimer ? 'টাইমার বন্ধ করুন' : 'টাইমার চালু করুন'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSwitch('offer_timers')}
                    className="px-3.5 py-2 rounded-xl border border-white/90 bg-white/80 hover:bg-white text-[#2A0F12] text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    Offer Timer ম্যানেজ
                  </button>
                </div>
              </div>

              {/* Core Dynamic KPI Statistics Grid */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
                  <h3 className="text-sm font-black text-[#2A0F12] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#eb1c24]" />
                    <span>কোর্স ও ক্যাটাগরি মেট্রিক্স (Live Analytics)</span>
                  </h3>
                  <span className="text-[11px] text-[#6B4C4F] font-semibold tabular-nums">
                    মোট ক্লিক: {toBengaliNumber(stats.totalClicks || totalRecentClicks)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Total Courses */}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('all_courses')}
                    className="glass-card rounded-2xl p-4 text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#6B4C4F] text-xs font-bold mb-2">
                      <span>মোট কোর্স (Total Courses)</span>
                      <BookOpen className="w-4 h-4 text-[#eb1c24] group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-[#2A0F12] tabular-nums">
                      {toBengaliNumber(stats.totalCourses)}
                    </div>
                    <div className="text-[11px] text-[#6B4C4F] mt-1 font-semibold flex items-center gap-1">
                      <span>{toBengaliNumber(categories.length)}টি ক্যাটাগরিতে বিভক্ত</span>
                      <ArrowRight className="w-3 h-3 text-[#eb1c24]" />
                    </div>
                  </button>

                  {/* 2. Active Courses */}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('active_courses')}
                    className="glass-card rounded-2xl p-4 text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#6B4C4F] text-xs font-bold mb-2">
                      <span>চালু কোর্স (Active Courses)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-emerald-700 tabular-nums">
                      {toBengaliNumber(stats.activeCourses)}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                      <span>পাবলিক ওয়েবসাইটে দৃশ্যমান</span>
                      <ArrowRight className="w-3 h-3 text-emerald-600" />
                    </div>
                  </button>

                  {/* 3. Inactive Courses */}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('inactive_courses')}
                    className="glass-card rounded-2xl p-4 text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#6B4C4F] text-xs font-bold mb-2">
                      <span>বন্ধ কোর্স (Inactive Courses)</span>
                      <XCircle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-amber-700 tabular-nums">
                      {toBengaliNumber(stats.inactiveCourses)}
                    </div>
                    <div className="text-[11px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                      <span>ভর্তি বন্ধ ব্যাজ প্রদর্শিত</span>
                      <ArrowRight className="w-3 h-3 text-amber-600" />
                    </div>
                  </button>

                  {/* 4. Total Categories */}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('categories')}
                    className="glass-card rounded-2xl p-4 text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#6B4C4F] text-xs font-bold mb-2">
                      <span>মোট ক্যাটাগরি</span>
                      <Layers className="w-4 h-4 text-[#1E63D6] group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-[#1E63D6] tabular-nums">
                      {toBengaliNumber(categories.length)}
                    </div>
                    <div className="text-[11px] text-[#1E63D6] mt-1 font-semibold flex items-center gap-1">
                      <span>ক্যাটাগরি ম্যানেজ করুন</span>
                      <ArrowRight className="w-3 h-3 text-[#1E63D6]" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Quick Actions Strip */}
              <div className="glass-surface rounded-3xl p-5 sm:p-6 space-y-3">
                <h3 className="text-sm font-black text-[#2A0F12]">দ্রুত অ্যাকশন (Quick Actions)</h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('add_course')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-2 shadow-[0_6px_18px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>নতুন কোর্স যোগ করুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSwitch('all_courses')}
                    className="px-4 py-2 rounded-xl border border-white/90 bg-white/80 hover:bg-white text-[#2A0F12] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-4 h-4 text-[#eb1c24]" />
                    <span>সকল কোর্স দেখুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSwitch('categories')}
                    className="px-4 py-2 rounded-xl border border-white/90 bg-white/80 hover:bg-white text-[#2A0F12] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Layers className="w-4 h-4 text-[#1E63D6]" />
                    <span>ক্যাটাগরি সাজান</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSwitch('offer_timers')}
                    className="px-4 py-2 rounded-xl border border-white/90 bg-white/80 hover:bg-white text-[#2A0F12] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <AlarmClock className="w-4 h-4 text-[#eb1c24]" />
                    <span>Offer Timer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSwitch('settings')}
                    className="px-4 py-2 rounded-xl border border-white/90 bg-white/80 hover:bg-white text-[#2A0F12] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Settings className="w-4 h-4 text-[#6B4C4F]" />
                    <span>পোর্টাল সেটিংস</span>
                  </button>
                </div>
              </div>

              {/* Recently Added Courses Table */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#2A0F12]">
                      সাম্প্রতিক কোর্সসমূহ (Recent Courses)
                    </h3>
                    <p className="text-xs text-[#6B4C4F] mt-0.5">
                      ডাটাবেস থেকে সর্বশেষ যুক্ত বা আপডেট হওয়া কোর্সের তালিকা।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('all_courses')}
                    className="text-xs font-bold text-[#b91c1c] hover:underline flex items-center gap-1 cursor-pointer tabular-nums shrink-0"
                  >
                    <span>সব দেখুন ({toBengaliNumber(courses.length)})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-rose-200/50 text-[#6B4C4F] uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">কোর্স</th>
                        <th className="py-2.5 px-3">ক্যাটাগরি</th>
                        <th className="py-2.5 px-3">মূল্য ও ছাড়</th>
                        <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                        <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/70">
                      {courses.slice(0, 6).map((course) => (
                        <tr key={course.id} className="hover:bg-rose-50/45 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              {course.imageUrl ? (
                                <img
                                  src={course.imageUrl}
                                  alt={course.title}
                                  loading="lazy"
                                  decoding="async"
                                  width={40}
                                  height={28}
                                  className="w-10 h-7 object-cover rounded-md border border-rose-100 shrink-0 bg-white"
                                />
                              ) : (
                                <div className="w-10 h-7 rounded-md bg-rose-100 flex items-center justify-center text-[#b91c1c] text-[10px] font-bold shrink-0">
                                  10MS
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-[#2A0F12] truncate max-w-xs sm:max-w-md">
                                  {course.title}
                                </div>
                                <div className="text-[10px] text-[#6B4C4F] font-mono truncate max-w-xs">
                                  /go/{course.slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#2A0F12]/80 whitespace-nowrap">
                            {categoryNameBySlug.get(course.categorySlug) || course.categorySlug}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-[#2A0F12] tabular-nums">
                              ৳{toBengaliNumber(course.discountPrice)}
                            </div>
                            {course.originalPrice > course.discountPrice && (
                              <div className="text-[10px] text-[#6B4C4F]/70 line-through font-mono tabular-nums">
                                ৳{toBengaliNumber(course.originalPrice)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                course.status === 'active'
                                  ? 'bg-emerald-100/90 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-100/90 text-amber-800 border-amber-200'
                              }`}
                            >
                              {course.status === 'active' ? 'চালু' : 'ভর্তি বন্ধ'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewingCourse(course)}
                                className="p-1.5 rounded-lg text-[#6B4C4F] hover:text-[#2A0F12] hover:bg-white/80 transition cursor-pointer"
                                title="প্রিভিউ দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCourse(course);
                                  setActiveTab('course_editor');
                                }}
                                className="p-1.5 rounded-lg text-[#1E63D6] hover:bg-blue-50 transition cursor-pointer"
                                title="এডিট করুন"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'all_courses' ||
            activeTab === 'active_courses' ||
            activeTab === 'inactive_courses' ? (
            /* ===================================================== */
            /* VIEW 3: COURSES DIRECTORY & MANAGEMENT TABLE          */
            /* ===================================================== */
            <div className="space-y-4 sm:space-y-6">
              {/* Header Banner */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-black text-[#2A0F12] tracking-tight leading-snug">
                    {activeTab === 'active_courses'
                      ? 'চালু কোর্সসমূহ (Active Courses)'
                      : activeTab === 'inactive_courses'
                      ? 'বন্ধ কোর্সসমূহ (Inactive Courses)'
                      : 'সকল কোর্স তালিকা (All Courses Directory)'}
                  </h1>
                  <p className="text-xs text-[#6B4C4F] mt-1 leading-relaxed">
                    {activeTab === 'active_courses'
                      ? 'এই কোর্সগুলো পাবলিক ওয়েবসাইটে শিক্ষার্থীদের জন্য ভর্তি উন্মুক্ত রয়েছে।'
                      : activeTab === 'inactive_courses'
                      ? 'এই কোর্সগুলোতে পাবলিক ওয়েবসাইটে "ভর্তি বন্ধ রয়েছে" ব্যাজ প্রদর্শিত হয়।'
                      : 'ডাটাবেসের সকল কোর্সের রিয়েল-টাইম তালিকা, মূল্য পরিবর্তন, চালু/বন্ধ ও এডিট নিয়ন্ত্রণ।'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('add_course')}
                  className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-2 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>নতুন কোর্স যোগ করুন</span>
                </button>
              </div>

              {/* Inactive notice if in inactive tab */}
              {activeTab === 'inactive_courses' && (
                <div className="glass-surface p-4 rounded-2xl border border-amber-300/70 bg-amber-50/75 text-amber-900 text-xs font-bold flex items-start sm:items-center gap-2.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    বন্ধ কোর্সগুলো পাবলিক ওয়েবসাইটে প্রদর্শিত হবে তবে &ldquo;ভর্তি বন্ধ রয়েছে&rdquo; দেখাবে এবং এনরোল বাটন ডিজেবল থাকবে। যেকোনো সময় &ldquo;চালু&rdquo; বাটনে ক্লিক করে আবার লাইভ করতে পারেন।
                  </span>
                </div>
              )}

              {/* Filter Controls Strip */}
              <div className="glass-surface rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6B4C4F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কোর্সের নাম, ব্যাচ বা ট্যাগ দিয়ে খুঁজুন..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-white/90 text-xs text-[#2A0F12] bg-white/85 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B4C4F] hover:text-[#2A0F12] font-bold cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-wrap">
                  <select
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-white/90 text-xs font-bold text-[#2A0F12] bg-white/85 focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="all">সব ক্যাটাগরি ({toBengaliNumber(courses.length)})</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {activeTab === 'all_courses' && (
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-white/90 text-xs font-bold text-[#2A0F12] bg-white/85 focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="all">সব স্ট্যাটাস</option>
                      <option value="active">চালু (Active)</option>
                      <option value="inactive">ভর্তি বন্ধ (Inactive)</option>
                    </select>
                  )}

                  {(searchQuery ||
                    filterCat !== 'all' ||
                    (activeTab === 'all_courses' && filterStatus !== 'all')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCat('all');
                        setFilterStatus('all');
                      }}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[#b91c1c] text-xs font-bold transition cursor-pointer text-center"
                    >
                      রিসেট
                    </button>
                  )}
                </div>
              </div>

              {/* Main Courses Container: Mobile Cards (< md) + Desktop/Tablet Table (>= md) */}
              <div className="glass-strong rounded-3xl overflow-hidden">
                {/* Mobile Card List (Mirrors OfferTimerManager Responsive Card Design) */}
                <div className="md:hidden p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-200/50 pb-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-[#2A0F12] truncate">
                        {activeTab === 'active_courses'
                          ? 'চালু কোর্স তালিকা'
                          : activeTab === 'inactive_courses'
                          ? 'বন্ধ কোর্স তালিকা'
                          : 'সকল কোর্স তালিকা'}
                      </h2>
                      <p className="text-[11px] text-[#6B4C4F] mt-0.5">
                        কোর্স প্রিভিউ, এডিট ও স্ট্যাটাস নিয়ন্ত্রণ করুন।
                      </p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[#b91c1c] text-[11px] font-extrabold tabular-nums">
                      {toBengaliNumber(displayedCourses.length)}টি
                    </span>
                  </div>

                  {displayedCourses.length === 0 ? (
                    <div className="py-10 text-center space-y-2 text-[#6B4C4F]">
                      <BookOpen className="w-9 h-9 text-rose-300 mx-auto" />
                      <p className="text-sm font-bold text-[#2A0F12]">
                        কোনো কোর্স পাওয়া যায়নি
                      </p>
                      <p className="text-xs">
                        অনুসন্ধান শব্দ অথবা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedCourses.map((course) => {
                        const isToggling = statusTogglingId === course.id;
                        const categoryLabel =
                          categoryNameBySlug.get(course.categorySlug) || course.categorySlug;

                        return (
                          <div
                            key={course.id}
                            className="glass-card rounded-2xl p-4 space-y-3 border border-rose-200/60 overflow-hidden"
                          >
                            {/* Top Row: Thumbnail + Title + Status Badge + Slug/Badges */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] shrink-0 overflow-hidden border border-rose-200 flex items-center justify-center">
                                {course.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={course.imageUrl}
                                    alt={course.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[9px] font-black text-white">
                                    10MS
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-start justify-between gap-1.5 min-w-0">
                                  <h3 className="text-xs font-black text-[#2A0F12] leading-snug break-words min-w-0 flex-1">
                                    {course.title}
                                  </h3>
                                  <span
                                    className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${
                                      course.status === 'active'
                                        ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                                        : 'bg-amber-100/90 text-amber-800 border-amber-300'
                                    }`}
                                  >
                                    {course.status === 'active'
                                      ? 'চালু (Active)'
                                      : 'ভর্তি বন্ধ (Inactive)'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6B4C4F]">
                                  <span className="font-mono text-[10px] break-all">
                                    /go/{course.slug}
                                  </span>
                                  {course.shortBadge && (
                                    <span className="text-[#b91c1c] font-semibold">
                                      • {course.shortBadge}
                                    </span>
                                  )}
                                  {course.isPopular && (
                                    <span className="text-amber-600 font-bold">
                                      ★ জনপ্রিয়
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Inset Info Box (Matches Timer Card Metadata Box) */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/80 rounded-xl p-2.5 border border-rose-100">
                              <div className="min-w-0">
                                <span className="text-[10px] text-[#6B4C4F] block">
                                  ক্যাটাগরি:
                                </span>
                                <span className="font-semibold text-[#2A0F12] break-words">
                                  {categoryLabel}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <span className="text-[10px] text-[#6B4C4F] block">
                                  মূল্য ও ছাড়:
                                </span>
                                <div className="flex flex-wrap items-baseline gap-x-1.5">
                                  <span className="font-mono font-bold text-emerald-700 tabular-nums">
                                    ৳{toBengaliNumber(course.discountPrice)}
                                  </span>
                                  {course.originalPrice > course.discountPrice && (
                                    <span className="text-[10px] text-[#6B4C4F]/75 line-through font-mono tabular-nums">
                                      ৳{toBengaliNumber(course.originalPrice)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="col-span-2 pt-1.5 border-t border-rose-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-[#6B4C4F]">
                                  ছাড় ও ক্লিক:
                                </span>
                                <span className="font-mono font-bold text-[#b91c1c] tabular-nums">
                                  {course.originalPrice > course.discountPrice
                                    ? `${toBengaliNumber(course.discountPercent)}% ছাড় • `
                                    : ''}
                                  {toBengaliNumber(course.clickCount || 0)} ক্লিক
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setPreviewingCourse(course)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#6B4C4F] hover:border-[#eb1c24] hover:text-[#eb1c24] transition cursor-pointer shrink-0"
                                title="কার্ড প্রিভিউ দেখুন"
                                aria-label="কার্ড প্রিভিউ দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden min-[420px]:inline">Preview</span>
                              </button>

                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCourse(course);
                                    setActiveTab('course_editor');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] transition cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(course)}
                                  disabled={isToggling}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                                    course.status === 'active'
                                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  }`}
                                  title="স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন"
                                >
                                  {course.status === 'active' ? (
                                    <>
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>{isToggling ? 'আপডেট...' : 'বন্ধ করুন'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{isToggling ? 'আপডেট...' : 'চালু করুন'}</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteModalCourse(course)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-[#b91c1c] hover:bg-[#eb1c24] hover:text-white transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Desktop & Tablet Table (Unchanged) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-rose-50/75 border-b border-rose-200/50 text-[#6B4C4F] font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-4">কোর্স তথ্য</th>
                        <th className="py-3.5 px-4">ক্যাটাগরি</th>
                        <th className="py-3.5 px-4">মূল্য ও ছাড়</th>
                        <th className="py-3.5 px-4 text-center">স্ট্যাটাস</th>
                        <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/70">
                      {displayedCourses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#6B4C4F] font-bold">
                            কোনো কোর্স পাওয়া যায়নি। অনুসন্ধান শব্দ পরিবর্তন করুন।
                          </td>
                        </tr>
                      ) : (
                        displayedCourses.map((course) => {
                          const isToggling = statusTogglingId === course.id;
                          return (
                            <tr key={course.id} className="hover:bg-rose-50/45 transition">
                              {/* Course Details */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  {course.imageUrl ? (
                                    <img
                                      src={course.imageUrl}
                                      alt={course.title}
                                      loading="lazy"
                                      decoding="async"
                                      width={48}
                                      height={32}
                                      className="w-12 h-8 object-cover rounded-lg border border-rose-100 shrink-0 bg-white"
                                    />
                                  ) : (
                                    <div className="w-12 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-[#b91c1c] text-[10px] font-black shrink-0">
                                      10MS
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-bold text-[#2A0F12] truncate max-w-xs sm:max-w-md">
                                      {course.title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6B4C4F] font-medium">
                                      <span className="px-1.5 py-0.5 rounded bg-white/80 border border-rose-100 text-[#6B4C4F] font-mono text-[10px]">
                                        /go/{course.slug}
                                      </span>
                                      {course.shortBadge && (
                                        <span className="text-[#b91c1c] font-semibold">
                                          • {course.shortBadge}
                                        </span>
                                      )}
                                      {course.isPopular && (
                                        <span className="text-amber-600 font-bold">★ জনপ্রিয়</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3.5 px-4 font-semibold text-[#2A0F12]/80 whitespace-nowrap">
                                {categoryNameBySlug.get(course.categorySlug) || course.categorySlug}
                              </td>

                              {/* Pricing */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-mono font-bold text-emerald-700 text-sm tabular-nums">
                                  ৳{toBengaliNumber(course.discountPrice)}
                                </div>
                                {course.originalPrice > course.discountPrice && (
                                  <div className="text-[10px] text-[#6B4C4F]/75 line-through font-mono tabular-nums">
                                    ৳{toBengaliNumber(course.originalPrice)} (
                                    {toBengaliNumber(course.discountPercent)}% ছাড়)
                                  </div>
                                )}
                              </td>

                              {/* Status Toggle Switch */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(course)}
                                  disabled={isToggling}
                                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer border inline-flex items-center gap-1.5 mx-auto ${
                                    course.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                  }`}
                                  title="স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন"
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      course.status === 'active'
                                        ? 'bg-emerald-500'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                  <span>
                                    {isToggling
                                      ? 'আপডেট হচ্ছে...'
                                      : course.status === 'active'
                                      ? 'চালু (Active)'
                                      : 'ভর্তি বন্ধ (Inactive)'}
                                  </span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewingCourse(course)}
                                    className="p-2 rounded-xl text-[#6B4C4F] hover:text-[#2A0F12] hover:bg-white/80 transition cursor-pointer"
                                    title="কার্ড প্রিভিউ দেখুন"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCourse(course);
                                      setActiveTab('course_editor');
                                    }}
                                    className="p-2 rounded-xl text-[#1E63D6] hover:bg-blue-50 transition cursor-pointer"
                                    title="এডিট করুন"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteModalCourse(course)}
                                    className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                    title="মুছে ফেলুন"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Count */}
                <div className="bg-white/50 border-t border-rose-200/50 px-4 py-3 text-xs text-[#6B4C4F] font-semibold flex flex-wrap items-center justify-between gap-2 tabular-nums">
                  <span>মোট প্রদর্শিত: {toBengaliNumber(displayedCourses.length)}টি কোর্স</span>
                  <span>মোট ডাটাবেস কোর্স: {toBengaliNumber(courses.length)}টি</span>
                </div>
              </div>
            </div>
          ) : activeTab === 'categories' ? (
            /* ===================================================== */
            /* VIEW 4: CATEGORY MANAGEMENT                           */
            /* ===================================================== */
            <div className="space-y-6">
              {/* Header */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight">
                    কোর্স ক্যাটাগরি ম্যানেজমেন্ট (Course Categories)
                  </h1>
                  <p className="text-xs text-[#6B4C4F] mt-1">
                    ক্যাটাগরি তৈরি, টাইটেল পরিবর্তন, সাবটাইটেল এবং প্রদর্শন ক্রম সাজান।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCatName('');
                    setCatSlug('');
                    setCatSubtitle('');
                    setCatBadgeColor('red');
                    setCatDisplayOrder(categories.length + 1);
                    setShowCategoryModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-2 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>নতুন ক্যাটাগরি যোগ করুন</span>
                </button>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const catCoursesCount = courses.filter((c) => c.categorySlug === cat.slug).length;
                  return (
                    <div
                      key={cat.id}
                      className="glass-card rounded-3xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-[#2A0F12]">{cat.name}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-[#b91c1c] tabular-nums">
                              ক্রম: {toBengaliNumber(cat.displayOrder)}
                            </span>
                          </div>
                          <div className="text-xs text-[#6B4C4F] font-mono mt-0.5">
                            /category/{cat.slug}
                          </div>
                          {cat.subtitle && (
                            <p className="text-xs text-[#6B4C4F] mt-1 font-medium">{cat.subtitle}</p>
                          )}
                        </div>

                        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/80 border border-rose-100 text-[#2A0F12] whitespace-nowrap tabular-nums shrink-0">
                          {toBengaliNumber(catCoursesCount)}টি কোর্স
                        </span>
                      </div>

                      <div className="pt-3 border-t border-rose-200/50 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterCat(cat.slug);
                            handleTabSwitch('all_courses');
                          }}
                          className="text-xs font-bold text-[#b91c1c] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>এই ক্যাটাগরির কোর্সসমূহ দেখুন</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatName(cat.name);
                              setCatSlug(cat.slug);
                              setCatSubtitle(cat.subtitle || '');
                              setCatBadgeColor(cat.badgeColor || 'red');
                              setCatDisplayOrder(cat.displayOrder || 1);
                              setShowCategoryModal(true);
                            }}
                            className="p-1.5 rounded-lg text-[#1E63D6] hover:bg-blue-50 transition cursor-pointer"
                            title="এডিট করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteModalCat(cat)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            /* ===================================================== */
            /* VIEW 5: PORTAL SETTINGS                               */
            /* ===================================================== */
            <div className="space-y-6">
              {/* Header */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6">
                <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight">
                  পোর্টাল সেটিংস ও যোগাযোগ (Settings & Direct Contact)
                </h1>
                <p className="text-xs text-[#6B4C4F] mt-1">
                  সাইট টাইটেল, ডিরেক্ট কল নম্বর, অফিশিয়াল হোয়াটসঅ্যাপ নম্বর, মেসেঞ্জার লিংক এবং হোমপেজ টেক্সট নিয়ন্ত্রণ।
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="glass-strong rounded-3xl p-6 sm:p-7 space-y-6">
                {/* 1. General Site Identity */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-[#2A0F12] border-b border-rose-200/50 pb-2">
                    ওয়েবসাইট শিরোনাম ও পরিচয় (Branding)
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      সাইট টাইটেল (Site Title)
                    </label>
                    <input
                      type="text"
                      value={siteTitle}
                      onChange={(e) => setSiteTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
                    />
                  </div>
                </div>

                {/* 2. Direct Contact Channels */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-[#2A0F12] border-b border-rose-200/50 pb-2">
                    সরাসরি যোগাযোগ চ্যানেল (Call, WhatsApp & Facebook Messenger)
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      ডিরেক্ট কল হেল্পলাইন নম্বর (Direct Call Number)
                    </label>
                    <input
                      type="tel"
                      value={callNumber}
                      onChange={(e) => setCallNumber(e.target.value)}
                      placeholder="+880 1625171822"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                    />
                    <p className="text-[11px] text-[#6B4C4F] mt-1">
                      সাপোর্ট বার এবং ফ্লোটিং কল আইকনে ক্লিক করলে শিক্ষার্থী সরাসরি এই নম্বরে কল করতে পারবে।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                        হোয়াটসঅ্যাপ হেল্পলাইন নম্বর
                      </label>
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="01608-949565"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                        হোয়াটসঅ্যাপ ডিরেক্ট চ্যাট লিংক
                      </label>
                      <input
                        type="text"
                        value={whatsappLink}
                        onChange={(e) => setWhatsappLink(e.target.value)}
                        placeholder="https://wa.me/8801814946474"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      ফেসবুক মেসেঞ্জার ডিরেক্ট ইনবক্স লিংক (Facebook Messenger Link)
                    </label>
                    <input
                      type="text"
                      value={messengerLink}
                      onChange={(e) => setMessengerLink(e.target.value)}
                      placeholder="https://m.me/10minuteschool"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                    />
                    <p className="text-[11px] text-[#6B4C4F] mt-1">
                      ফ্লোটিং মেসেঞ্জার ও সাপোর্ট বারের মেসেঞ্জার আইকনে ক্লিক করলে শিক্ষার্থী সরাসরি আপনার ফেসবুক পেজের ইনবক্সে চলে যাবে।
                    </p>
                  </div>
                </div>

                {/* 3. Countdown Timer Config */}
                <div className="glass-inset p-4 rounded-2xl border border-rose-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-[#2A0F12] block">
                        হোমপেজ অফার কাউন্টডাউন টাইমার
                      </span>
                      <span className="text-[11px] text-[#6B4C4F]">
                        টাইমার সক্রিয় রাখলে হোমপেজের শীর্ষে লাল ব্যানারে টাইমার দেখাবে।
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={showCountdownTimer}
                        onChange={(e) => setShowCountdownTimer(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#eb1c24]" />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                      কাউন্টডাউন টেক্সট লেবেল
                    </label>
                    <input
                      type="text"
                      value={countdownLabel}
                      onChange={(e) => setCountdownLabel(e.target.value)}
                      placeholder="HSC ২৮ আর্লি বার্ড স্পেশাল উপহার সহ ছাড়ে বাকি:"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
                    />
                  </div>
                </div>

                {/* 4. Affiliate Tracking Tag */}
                <div>
                  <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                    ডিফল্ট এফিলিয়েট রেফারেল ট্যাগ
                  </label>
                  <input
                    type="text"
                    value={defaultAffiliateRef}
                    onChange={(e) => setDefaultAffiliateRef(e.target.value)}
                    placeholder="10ms_affiliate"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] hover:from-[#eb1c24] hover:to-[#991b1b] transition cursor-pointer disabled:opacity-60"
                  >
                    {savingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'offer_timers' ? (
            /* ===================================================== */
            /* VIEW 6: DEDICATED OFFER COUNTDOWN TIMER MANAGEMENT    */
            /* ===================================================== */
            <OfferTimerManager
              authToken={authToken}
              courses={courses}
              timers={offerTimers}
              serverNow={serverNow}
              onTimersUpdated={(nextTimers, nextServerNow) => {
                setOfferTimers(nextTimers);
                if (nextServerNow) {
                  setServerNow(nextServerNow);
                  const parsedNow = new Date(nextServerNow).getTime();
                  if (Number.isFinite(parsedNow)) {
                    setOverviewNowMs(parsedNow);
                  }
                } else {
                  setOverviewNowMs(Date.now());
                }
                onDataMutated();
              }}
              onShowToast={showToast}
            />
          ) : null}
        </main>
      </div>

      {/* 3. DEDICATED ADMIN FOOTER (Main Website Layered Wave + Burgundy Theme, Admin Content) */}
      <AdminFooter
        onSelectTab={handleTabSwitch}
        onNavigateHome={handleNavigateHome}
        onRequestLogout={() => setShowLogoutConfirm(true)}
        onDownloadZip={onDownloadZip}
        adminName={adminName}
        adminEmail={adminEmail}
        stats={stats}
        categoriesCount={categories.length}
        activeOfferTimersCount={activeOfferTimersCount}
      />

      {/* ========================================================= */}
      {/* 4. MODALS & CONFIRMATION DIALOGS                          */}
      {/* ========================================================= */}

      {/* CourseCard Live Preview Modal */}
      {previewingCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 space-y-4 border border-white/90 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-sm font-bold text-[#2A0F12] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#eb1c24]" />
                <span>পাবলিক কোর্স কার্ড প্রিভিউ</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewingCourse(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-rose-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <div className="w-full max-w-[340px]">
                <CourseCard
                  course={previewingCourse}
                  onEnrollClick={() => window.open(previewingCourse.affiliateUrl, '_blank')}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewingCourse(null)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Confirmation Modal */}
      {deleteModalCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-6 space-y-4 border border-white/90 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-[#2A0F12]">কোর্সটি মুছে ফেলতে চান?</h3>
              <p className="text-xs text-[#6B4C4F]">
                <strong>&ldquo;{deleteModalCourse.title}&rdquo;</strong> কোর্সটি ডাটাবেস এবং ওয়েবসাইট থেকে মুছে ফেলা হবে।
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalCourse(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 transition cursor-pointer"
              >
                না, বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-md cursor-pointer"
              >
                হ্যাঁ, নিশ্চিত ডিলিট
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal (Create / Edit) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveCategory}
            className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 space-y-4 border border-white/90 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-sm font-bold text-[#2A0F12] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#eb1c24]" />
                <span>{editingCategory ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-rose-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                ক্যাটাগরির নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  if (!editingCategory) {
                    setCatSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
                        .trim()
                        .replace(/\s+/g, '-')
                    );
                  }
                }}
                placeholder="যেমন: HSC 28 ও HSC 27 অনলাইন ব্যাচ"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                স্লাগ (URL Slug) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-2.5 py-2 rounded-l-xl bg-rose-50/70 border border-r-0 border-slate-200 text-[#6B4C4F] text-xs font-mono">
                  /category/
                </span>
                <input
                  type="text"
                  required
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="hsc"
                  className="w-full px-3 py-2 rounded-r-xl border border-slate-200 text-xs font-mono text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                সাবটাইটেল (Subtitle)
              </label>
              <input
                type="text"
                value={catSubtitle}
                onChange={(e) => setCatSubtitle(e.target.value)}
                placeholder="যেমন: কলেজ একাডেমিক প্রোগ্রাম"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  প্রদর্শন ক্রম (Order)
                </label>
                <input
                  type="number"
                  min="1"
                  value={catDisplayOrder}
                  onChange={(e) => setCatDisplayOrder(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  ব্যাজ কালার
                </label>
                <select
                  value={catBadgeColor}
                  onChange={(e) => setCatBadgeColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer font-bold"
                >
                  <option value="red">রেড (Red)</option>
                  <option value="amber">অ্যাম্বার (Amber)</option>
                  <option value="blue">ব্লু (Blue)</option>
                  <option value="rose">রোজ (Rose)</option>
                  <option value="emerald">এমারেল্ড (Emerald)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-100">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={savingCat}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
              >
                {savingCat ? 'সংরক্ষণ হচ্ছে...' : editingCategory ? 'আপডেট করুন' : 'যোগ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteModalCat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-6 space-y-4 border border-white/90 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-[#2A0F12]">ক্যাটাগরি মুছে ফেলতে চান?</h3>
              <p className="text-xs text-[#6B4C4F]">
                <strong>&ldquo;{deleteModalCat.name}&rdquo;</strong> ক্যাটাগরি মুছে ফেলা হবে।
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalCat(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-md cursor-pointer"
              >
                ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-xs w-full p-6 space-y-4 border border-white/90 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#b91c1c] mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-black text-[#2A0F12]">অ্যাডমিন লগআউট</h3>
              <p className="text-xs text-[#6B4C4F] mt-1">
                আপনি কি নিশ্চিতভাবে অ্যাডমিন প্যানেল থেকে বের হতে চান?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 transition cursor-pointer"
              >
                না
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] hover:shadow-[0_6px_16px_-4px_rgba(226,43,43,0.45)] text-white text-xs font-bold transition cursor-pointer"
              >
                লগআউট
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
