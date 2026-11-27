'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  AdminOverviewData,
  BookStoreAdminPayload,
  Category,
  CategoryNavAssignment,
  ClassGuidesMap,
  ClickRecord,
  Course,
  OfferTimer,
  OnlineBatchAdminPayload,
  SiteSettings,
} from '../../types.ts';
import {
  NAVBAR_GROUP_OPTIONS,
  getNavbarGroupDisplayLabel,
  normalizeCategoryNavGroup,
} from '../../lib/navbarCategories.ts';
import {
  CATEGORY_CARD_TITLE_MAX_LENGTH,
  CATEGORY_ICON_OPTIONS,
  normalizeCategoryIconKey,
  resolveCategoryCardBatchTitle,
  resolveCategoryCardTheme,
  type CategoryIconKey,
} from '../../lib/categoryIcons.ts';
import {
  getCategoryLucideIcon,
  getLucideIconByKey,
} from '../../lib/categoryIconComponents.ts';
import { computeOfferTimerStatus } from '../../lib/offerTimerUtils.ts';
import {
  DEFAULT_SELECTOR_ICON_IDS,
  cloneDefaultSelectorIconLabels,
  normalizeSelectorIconLabels,
  normalizeSelectorIconOrder,
  type SelectorIconId,
  type SelectorIconLabelsMap,
} from '../../lib/selectorIconOrder.ts';
import {
  normalizeCategoryCourseOrders,
  type CategoryCourseOrdersMap,
} from '../../lib/courseSorting.ts';
import {
  courseMatchesCategorySlug,
  getCourseCategorySlugs,
} from '../../lib/categoryMatching.ts';
import {
  buildReadableCategoryPath,
  buildReadableCategoryUrl,
  buildReadableCourseShareUrl,
  generateUnicodeCourseSlug,
  isReservedCategorySlug,
  sanitizeEditableUnicodeSlug,
  stripCategorySlugPrefix,
} from '../../lib/courseSlug.ts';
import {
  navigateHistory,
  useHistoryViewState,
} from '../../lib/navigationHistory.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { GlassAmbientBackdrop } from '../public/GlassAmbientBackdrop.tsx';
import { AdminNavbar } from './AdminNavbar.tsx';
import { AdminFooter } from './AdminFooter.tsx';
import { AdminMobileBottomNav } from './AdminMobileBottomNav.tsx';
import { AdminDashboardSkeleton } from './AdminSkeletons.tsx';
import { AdminModalPortal } from './AdminModalPortal.tsx';

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

const BookStoreAdminManager = dynamic(
  () => import('./BookStoreAdminManager.tsx').then((m) => m.BookStoreAdminManager),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm font-bold text-[#6B4C4F]">
        বুক স্টোর ম্যানেজার লোড হচ্ছে...
      </div>
    ),
  }
);

const IconSortManager = dynamic(
  () => import('./IconSortManager.tsx').then((m) => m.IconSortManager),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm font-bold text-[#6B4C4F]">
        আইকন সর্ট ম্যানেজার লোড হচ্ছে...
      </div>
    ),
  }
);

const CourseSortManager = dynamic(
  () => import('./CourseSortManager.tsx').then((m) => m.CourseSortManager),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm font-bold text-[#6B4C4F]">
        কোর্স পজিশন ম্যানেজার লোড হচ্ছে...
      </div>
    ),
  }
);

const OnlineBatchAdminManager = dynamic(
  () => import('./OnlineBatchAdminManager.tsx').then((m) => m.OnlineBatchAdminManager),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm font-bold text-[#6B4C4F]">
        অনলাইন ব্যাচ ম্যানেজার লোড হচ্ছে...
      </div>
    ),
  }
);

const GuideManagementAdmin = dynamic(
  () => import('./GuideManagementAdmin.tsx').then((m) => m.GuideManagementAdmin),
  {
    ssr: false,
    loading: () => (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm font-bold text-[#6B4C4F]">
        Guide Management লোড হচ্ছে...
      </div>
    ),
  }
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  AlarmClock,
  ShoppingBag,
  ListOrdered,
  Copy,
  Check,
  GraduationCap,
  BookOpenCheck,
} from 'lucide-react';

const COURSES_PER_PAGE = 12;

const preloadedTabs = new Set<string>();
function preloadTabChunk(tab: AdminPageTab): void {
  if (typeof window === 'undefined' || preloadedTabs.has(tab)) return;
  preloadedTabs.add(tab);
  if (tab === 'add_course' || tab === 'course_editor') {
    void import('./CourseEditorPage.tsx').catch(() => preloadedTabs.delete(tab));
  } else if (tab === 'course_sort') {
    void import('./CourseSortManager.tsx').catch(() => preloadedTabs.delete(tab));
  } else if (tab === 'book_add' || tab === 'book_store' || tab === 'book_categories') {
    void import('./BookStoreAdminManager.tsx').catch(() => preloadedTabs.delete(tab));
  } else if (tab === 'offer_timers') {
    void import('./OfferTimerManager.tsx').catch(() => preloadedTabs.delete(tab));
  } else if (tab === 'icon_sort') {
    void import('./IconSortManager.tsx').catch(() => preloadedTabs.delete(tab));
  } else if (tab === 'online_batches') {
    void import('./OnlineBatchAdminManager.tsx').catch(() => preloadedTabs.delete(tab));
  } else if (tab === 'guides') {
    void import('./GuideManagementAdmin.tsx').catch(() => preloadedTabs.delete(tab));
  }
}

interface AdminDashboardProps {
  authToken?: string;
  adminEmail: string;
  adminName: string;
  currentPath?: string;
  initialData?: AdminOverviewData | null;
  onNavigate?: (path: string) => void;
  onLogout: () => void;
  onDataMutated: () => void;
  onAdminNameUpdated?: (nextName: string) => void;
}

export type AdminPageTab =
  | 'overview'
  | 'all_courses'
  | 'course_sort'
  | 'add_course'
  | 'active_courses'
  | 'inactive_courses'
  | 'categories'
  | 'book_add'
  | 'book_store'
  | 'book_categories'
  | 'offer_timers'
  | 'online_batches'
  | 'guides'
  | 'settings'
  | 'icon_sort'
  | 'course_editor';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminEmail,
  adminName,
  currentPath = '/admin/overview',
  initialData = null,
  onNavigate,
  onLogout,
  onDataMutated,
  onAdminNameUpdated,
}) => {
  // Determine initial tab from currentPath
  const getTabFromPath = (p: string): AdminPageTab => {
    if (p.includes('/admin/courses/sort')) return 'course_sort';
    if (p.includes('/admin/courses/new')) return 'add_course';
    if (p.includes('/admin/courses/active')) return 'active_courses';
    if (p.includes('/admin/courses/inactive')) return 'inactive_courses';
    if (p.includes('/admin/courses')) return 'all_courses';
    if (p.includes('/admin/books/new')) return 'book_add';
    if (p.includes('/admin/book-categories')) return 'book_categories';
    if (p.includes('/admin/books')) return 'book_store';
    if (p.includes('/admin/categories')) return 'categories';
    if (p.includes('/admin/online-batches')) return 'online_batches';
    if (p.includes('/admin/guides')) return 'guides';
    if (p.includes('/admin/offer-timers')) return 'offer_timers';
    if (p.includes('/admin/settings/icon-sort')) return 'icon_sort';
    if (p.includes('/admin/settings')) return 'settings';
    return 'overview';
  };

  const hydratedFromInitialRef = useRef<boolean>(Boolean(initialData));
  const [activeTab, setActiveTab] = useState<AdminPageTab>(() => getTabFromPath(currentPath));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(() => !initialData);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [cachedBookStoreData, setCachedBookStoreData] = useState<BookStoreAdminPayload | null>(null);
  const [cachedOnlineBatchData, setCachedOnlineBatchData] =
    useState<OnlineBatchAdminPayload | null>(null);
  const [cachedGuidesData, setCachedGuidesData] = useState<ClassGuidesMap | null>(null);

  // Core Data States (hydrated synchronously when SSR or login preload supplies initialData)
  const [stats, setStats] = useState(() => ({
    totalCourses: initialData?.stats?.totalCourses ?? 0,
    activeCourses: initialData?.stats?.activeCourses ?? 0,
    inactiveCourses: initialData?.stats?.inactiveCourses ?? 0,
    closedCourses: initialData?.stats?.closedCourses ?? 0,
    hiddenCourses: initialData?.stats?.hiddenCourses ?? 0,
    popularCourses: initialData?.stats?.popularCourses ?? 0,
    totalClicks: initialData?.stats?.totalClicks ?? 0,
  }));
  const [bookStats, setBookStats] = useState(() => ({
    totalBooks: initialData?.bookStats?.totalBooks ?? 0,
    activeBooks: initialData?.bookStats?.activeBooks ?? 0,
  }));

  const [courses, setCourses] = useState<Course[]>(() => initialData?.courses || []);
  const [categories, setCategories] = useState<Category[]>(() => initialData?.categories || []);
  const [recentClicks, setRecentClicks] = useState<ClickRecord[]>(
    () => initialData?.recentClicks || []
  );
  const [, setSettings] = useState<SiteSettings | null>(() => initialData?.settings ?? null);
  const [offerTimers, setOfferTimers] = useState<OfferTimer[]>(
    () => initialData?.offerTimers || []
  );
  const [selectorIconOrder, setSelectorIconOrder] = useState<SelectorIconId[]>(() =>
    Array.isArray(initialData?.selectorIconOrder)
      ? normalizeSelectorIconOrder(initialData.selectorIconOrder)
      : [...DEFAULT_SELECTOR_ICON_IDS]
  );
  const [selectorIconLabels, setSelectorIconLabels] = useState<SelectorIconLabelsMap>(() =>
    initialData?.selectorIconLabels && typeof initialData.selectorIconLabels === 'object'
      ? normalizeSelectorIconLabels(initialData.selectorIconLabels)
      : cloneDefaultSelectorIconLabels()
  );
  const [categoryCourseOrders, setCategoryCourseOrders] = useState<CategoryCourseOrdersMap>(() =>
    normalizeCategoryCourseOrders(initialData?.categoryCourseOrders)
  );
  const [storageInfo, setStorageInfo] = useState<{
    backend: string;
    persistentOnVercel: boolean;
    warning?: string;
  } | null>(() => initialData?.storageInfo || null);
  const [serverNow, setServerNow] = useState<string>(() => initialData?.serverNow || '');
  const [overviewNowMs, setOverviewNowMs] = useState<number>(() => {
    if (initialData?.serverNow) {
      const parsed = new Date(initialData.serverNow).getTime();
      if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
  });

  // Settings form local state
  const [siteTitle, setSiteTitle] = useState(() => initialData?.settings?.siteTitle || '');
  const [adminDisplayName, setAdminDisplayName] = useState(
    () => (adminName || 'Site Admin').replace(/\s*\(Admin\)\s*/gi, '').trim() || 'Site Admin'
  );
  const [savedAdminDisplayName, setSavedAdminDisplayName] = useState(
    () => (adminName || 'Site Admin').replace(/\s*\(Admin\)\s*/gi, '').trim() || 'Site Admin'
  );
  const [prevAdminNameProp, setPrevAdminNameProp] = useState(adminName);
  if (adminName !== prevAdminNameProp) {
    setPrevAdminNameProp(adminName);
    const cleaned = (adminName || 'Site Admin').replace(/\s*\(Admin\)\s*/gi, '').trim() || 'Site Admin';
    setAdminDisplayName(cleaned);
    setSavedAdminDisplayName(cleaned);
  }
  const [callNumber, setCallNumber] = useState(
    () => initialData?.settings?.callNumber || initialData?.settings?.whatsappNumber || ''
  );
  const [whatsappNumber, setWhatsappNumber] = useState(
    () => initialData?.settings?.whatsappNumber || ''
  );
  const [whatsappLink, setWhatsappLink] = useState(
    () => initialData?.settings?.whatsappLink || ''
  );
  const [messengerLink, setMessengerLink] = useState(
    () => initialData?.settings?.messengerLink || 'https://m.me/10minuteschool'
  );
  const [facebookLink, setFacebookLink] = useState(
    () => initialData?.settings?.facebookLink ?? 'https://www.facebook.com/10ms.official'
  );
  const [youtubeLink, setYoutubeLink] = useState(
    () => initialData?.settings?.youtubeLink ?? 'https://www.youtube.com/@10MinuteSchool'
  );
  const [instagramLink, setInstagramLink] = useState(
    () => initialData?.settings?.instagramLink ?? 'https://www.instagram.com/10ms_official'
  );
  const [heroBadge, setHeroBadge] = useState(() => initialData?.settings?.heroBadge || '');
  const [heroTitle, setHeroTitle] = useState(() => initialData?.settings?.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(
    () => initialData?.settings?.heroSubtitle || ''
  );
  const [showCountdownTimer, setShowCountdownTimer] = useState(
    () => initialData?.settings?.showCountdownTimer !== false
  );
  const [countdownLabel, setCountdownLabel] = useState(
    () => initialData?.settings?.countdownLabel || ''
  );
  const [countdownTargetCourse, setCountdownTargetCourse] = useState(
    () => initialData?.settings?.countdownTargetCourse || 'all'
  );
  const [countdownTargetDate, setCountdownTargetDate] = useState(
    () => initialData?.settings?.countdownTargetDate || ''
  );
  const [defaultAffiliateRef, setDefaultAffiliateRef] = useState(
    () => initialData?.settings?.defaultAffiliateRef || ''
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Course Management Filters & State
  const [searchQuery, setSearchQuery] = useHistoryViewState('adminSearchQuery', '', currentPath);
  const [filterCat, setFilterCat] = useHistoryViewState('adminFilterCat', 'all', currentPath);
  const [filterStatus, setFilterStatus] = useHistoryViewState('adminFilterStatus', 'all', currentPath);
  const [currentPage, setCurrentPage] = useHistoryViewState('adminCurrentPage', 1, currentPath);
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
  const [catCardTitle, setCatCardTitle] = useState('');
  const [catBadgeColor, setCatBadgeColor] = useState('red');
  const [catDisplayOrderInput, setCatDisplayOrderInput] = useState<string>('1');
  const [catNavGroup, setCatNavGroup] = useState<CategoryNavAssignment>('auto');
  const [catIconKey, setCatIconKey] = useState<CategoryIconKey>('auto');
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [swappingCatId, setSwappingCatId] = useState<number | null>(null);
  const [deleteModalCat, setDeleteModalCat] = useState<Category | null>(null);

  const [catSlugManuallyEdited, setCatSlugManuallyEdited] = useState(false);
  const [catOrderManuallyEdited, setCatOrderManuallyEdited] = useState(false);
  const catOrderManuallyEditedRef = useRef(false);
  const [loadingNextCategoryOrder, setLoadingNextCategoryOrder] = useState(false);
  const categoryModalRequestSeqRef = useRef(0);

  const [copiedCourseId, setCopiedCourseId] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedCategoryId, setCopiedCategoryId] = useState<number | null>(null);
  const copyCategoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (copyCategoryTimerRef.current) clearTimeout(copyCategoryTimerRef.current);
    };
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 3500);
    },
    []
  );

  const copyTextToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (typeof window === 'undefined' || !text) return false;
    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    return copied;
  }, []);

  const handleCopyCourseShareLink = useCallback(
    async (course: Course) => {
      if (typeof window === 'undefined') return;
      const shareUrl = buildReadableCourseShareUrl(window.location.origin, course.slug);
      const copied = await copyTextToClipboard(shareUrl);

      if (copied) {
        setCopiedCourseId(course.id);
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = setTimeout(() => {
          setCopiedCourseId((prev) => (prev === course.id ? null : prev));
        }, 2000);
        showToast(`কোর্স শেয়ার লিংক কপি হয়েছে: ${course.title}`, 'success');
      } else {
        showToast('লিংক কপি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
      }
    },
    [copyTextToClipboard, showToast]
  );

  const handleCopyCategoryLink = useCallback(
    async (category: Category) => {
      if (typeof window === 'undefined') return;
      const categoryUrl = buildReadableCategoryUrl(window.location.origin, category.slug);
      const copied = await copyTextToClipboard(categoryUrl);

      if (copied) {
        setCopiedCategoryId(category.id);
        if (copyCategoryTimerRef.current) {
          clearTimeout(copyCategoryTimerRef.current);
        }
        copyCategoryTimerRef.current = setTimeout(() => {
          setCopiedCategoryId((prev) => (prev === category.id ? null : prev));
        }, 2000);
        showToast('Link Copied Successfully!', 'success');
      } else {
        showToast('লিংক কপি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
      }
    },
    [copyTextToClipboard, showToast]
  );

  const handleUnauthorizedResponse = useCallback(
    (res: Response): boolean => {
      if (res.status === 401) {
        showToast('সেশনের মেয়াদ শেষ হয়েছে, অনুগ্রহ করে পুনরায় লগইন করুন।', 'error');
        onLogout();
        return true;
      }
      return false;
    },
    [onLogout, showToast]
  );

  const handleBookStoreUnauthorized = useCallback(() => {
    showToast('সেশনের মেয়াদ শেষ হয়েছে, অনুগ্রহ করে পুনরায় লগইন করুন।', 'error');
    onLogout();
  }, [onLogout, showToast]);

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

  // Tab switcher with URL pushState (memoized so AdminNavbar/Footer/MobileBottomNav stay stable)
  const handleTabSwitch = useCallback(
    (tab: AdminPageTab) => {
      setActiveTab(tab);
      setMobileSidebarOpen(false);
      if (tab === 'add_course') setEditingCourse(null);

      const pathMap: Record<string, string> = {
        overview: '/admin/overview',
        all_courses: '/admin/courses',
        course_sort: '/admin/courses/sort',
        add_course: '/admin/courses/new',
        active_courses: '/admin/courses/active',
        inactive_courses: '/admin/courses/inactive',
        categories: '/admin/categories',
        book_add: '/admin/books/new',
        book_store: '/admin/books',
        book_categories: '/admin/book-categories',
        online_batches: '/admin/online-batches',
        guides: '/admin/guides',
        offer_timers: '/admin/offer-timers',
        settings: '/admin/settings',
        icon_sort: '/admin/settings/icon-sort',
      };

      const targetPath = pathMap[tab] || '/admin/overview';
      if (onNavigate) {
        onNavigate(targetPath);
      } else {
        navigateHistory(targetPath);
      }
    },
    [onNavigate]
  );

  const applyOverviewData = useCallback((data: AdminOverviewData) => {
    setStats({
      totalCourses: data.stats?.totalCourses ?? 0,
      activeCourses: data.stats?.activeCourses ?? 0,
      inactiveCourses: data.stats?.inactiveCourses ?? 0,
      closedCourses: data.stats?.closedCourses ?? 0,
      hiddenCourses: data.stats?.hiddenCourses ?? 0,
      popularCourses: data.stats?.popularCourses ?? 0,
      totalClicks: data.stats?.totalClicks ?? 0,
    });
    if (data.bookStats) {
      setBookStats({
        totalBooks: data.bookStats.totalBooks ?? 0,
        activeBooks: data.bookStats.activeBooks ?? 0,
      });
    }
    setCourses(data.courses || []);
    setCategories(data.categories || []);
    setRecentClicks(data.recentClicks || []);
    setOfferTimers(data.offerTimers || []);
    if (Array.isArray(data.selectorIconOrder)) {
      setSelectorIconOrder(normalizeSelectorIconOrder(data.selectorIconOrder));
    }
    if (data.selectorIconLabels && typeof data.selectorIconLabels === 'object') {
      setSelectorIconLabels(normalizeSelectorIconLabels(data.selectorIconLabels));
    }
    if (data.categoryCourseOrders && typeof data.categoryCourseOrders === 'object') {
      setCategoryCourseOrders(normalizeCategoryCourseOrders(data.categoryCourseOrders));
    }
    setStorageInfo(data.storageInfo || null);
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
      setFacebookLink(data.settings.facebookLink ?? 'https://www.facebook.com/10ms.official');
      setYoutubeLink(data.settings.youtubeLink ?? 'https://www.youtube.com/@10MinuteSchool');
      setInstagramLink(data.settings.instagramLink ?? 'https://www.instagram.com/10ms_official');
      setHeroBadge(data.settings.heroBadge || '');
      setHeroTitle(data.settings.heroTitle || '');
      setHeroSubtitle(data.settings.heroSubtitle || '');
      setCountdownLabel(data.settings.countdownLabel || '');
      setShowCountdownTimer(data.settings.showCountdownTimer !== false);
      setCountdownTargetCourse(data.settings.countdownTargetCourse || 'all');
      setCountdownTargetDate(data.settings.countdownTargetDate || '');
      setDefaultAffiliateRef(data.settings.defaultAffiliateRef || '');
    }
  }, []);

  // Fetch Dashboard Overview & Core Data (includes bookStats in single request — zero waterfall)
  const fetchDashboardData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch('/api/admin/overview', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (handleUnauthorizedResponse(res)) return;
        if (!res.ok) throw new Error('এডমিন ডেটা লোড করতে ব্যর্থ হয়েছে।');

        const data = (await res.json()) as AdminOverviewData;
        applyOverviewData(data);
      } catch (err: any) {
        console.error('Failed to load admin data:', err);
        setError(err.message || 'ডেটা লোড করতে ব্যর্থ হয়েছে।');
      } finally {
        setLoading(false);
      }
    },
    [handleUnauthorizedResponse, applyOverviewData]
  );

  useEffect(() => {
    // Skip redundant initial fetch when SSR or login response already provided overview data
    if (hydratedFromInitialRef.current) {
      return;
    }
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
      map.set(cat.slug.toLowerCase(), cat.name);
    }
    return map;
  }, [categories]);

  const getCourseCategoryNames = useCallback(
    (course: Course): string[] =>
      getCourseCategorySlugs(course).map(
        (slug) => categoryNameBySlug.get(slug.toLowerCase()) || categoryNameBySlug.get(slug) || slug
      ),
    [categoryNameBySlug]
  );

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
      ),
    [categories]
  );

  const nextAvailableCategoryOrder = useMemo(() => {
    const maxOrder = categories.reduce(
      (max, cat) => Math.max(max, Number(cat.displayOrder) || 0),
      0
    );
    return maxOrder + 1;
  }, [categories]);

  const validateCategoryOrderInput = useCallback(
    (
      rawValue: string,
      currentCategoryId?: number | null
    ): { valid: true; value: number } | { valid: false; error: string } => {
      const trimmed = rawValue.trim();
      const ascii = trimmed.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
      if (!ascii || !/^\d+$/.test(ascii)) {
        return {
          valid: false,
          error: 'ক্রম নম্বর (Order Number) অবশ্যই ১ বা তার চেয়ে বড় একটি পূর্ণসংখ্যা হতে হবে।',
        };
      }
      const parsed = Number(ascii);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000000) {
        return {
          valid: false,
          error: 'ক্রম নম্বর (Order Number) অবশ্যই ১ থেকে ১০,০০,০০০ এর মধ্যে পূর্ণসংখ্যা হতে হবে।',
        };
      }
      const conflict = categories.find(
        (c) => c.id !== currentCategoryId && Number(c.displayOrder) === parsed
      );
      if (conflict) {
        return {
          valid: false,
          error: `এই ক্রম নম্বরটি (${toBengaliNumber(parsed)}) ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ("${conflict.name}") ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।`,
        };
      }
      return { valid: true, value: parsed };
    },
    [categories]
  );

  const liveOrderValidation = useMemo(
    () =>
      showCategoryModal
        ? validateCategoryOrderInput(catDisplayOrderInput, editingCategory?.id ?? null)
        : null,
    [showCategoryModal, validateCategoryOrderInput, catDisplayOrderInput, editingCategory]
  );

  // Synchronize browser URL on popstate
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin')) {
        setActiveTab(getTabFromPath(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Filtered Courses List
  const displayedCourses = useMemo(() => {
    return courses.filter((course) => {
      // 1. Status Filter by Tab or explicit 3-state selector
      if (activeTab === 'active_courses') {
        if (course.status !== 'active') return false;
      } else if (activeTab === 'inactive_courses') {
        if (course.status === 'active') return false;
      } else if (filterStatus !== 'all') {
        if (course.status !== filterStatus) {
          return false;
        }
      }

      // 2. Category Filter
      if (filterCat !== 'all' && !courseMatchesCategorySlug(course, filterCat)) {
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

  const totalPages = Math.max(1, Math.ceil(displayedCourses.length / COURSES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCourses = useMemo(() => {
    const start = (safeCurrentPage - 1) * COURSES_PER_PAGE;
    return displayedCourses.slice(start, start + COURSES_PER_PAGE);
  }, [displayedCourses, safeCurrentPage]);

  // Handle 3-State Course Status Change (active | closed | inactive)
  const handleChangeCourseStatus = async (
    course: Course,
    newStatus: 'active' | 'closed' | 'inactive'
  ) => {
    if (course.status === newStatus) return;
    setStatusTogglingId(course.id);

    try {
      const res = await fetch(`/api/admin/courses/${course.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'কোর্সের স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।');
      }

      setCourses((prev) => {
        const nextCourses = prev.map((c) =>
          c.id === course.id ? { ...c, status: newStatus } : c
        );
        const activeCount = nextCourses.filter((c) => c.status === 'active').length;
        const closedCount = nextCourses.filter((c) => c.status === 'closed').length;
        const hiddenCount = nextCourses.filter((c) => c.status === 'inactive').length;
        setStats((s) => ({
          ...s,
          activeCourses: activeCount,
          inactiveCourses: nextCourses.length - activeCount,
          closedCourses: closedCount,
          hiddenCourses: hiddenCount,
        }));
        return nextCourses;
      });

      onDataMutated();
      const statusToast =
        newStatus === 'active'
          ? `"${course.title}" কোর্সটি এখন চালু (Active) রয়েছে।`
          : newStatus === 'closed'
          ? `"${course.title}" কোর্সটিতে "ভর্তি বন্ধ" (Closed) স্ট্যাটাস সেট করা হয়েছে।`
          : `"${course.title}" কোর্সটি পাবলিক ওয়েবসাইট থেকে লুকানো (Inactive) হয়েছে।`;
      showToast(statusToast, 'success');
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'কোর্সটি সংরক্ষণ করা সম্ভব হয়নি।');
      }

      await fetchDashboardData({ silent: true });
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
        credentials: 'include',
      });

      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) throw new Error('কোর্সটি মুছে ফেলা সম্ভব হয়নি।');

      setCourses((prev) => {
        const nextCourses = prev.filter((c) => c.id !== deleteModalCourse.id);
        const activeCount = nextCourses.filter((c) => c.status === 'active').length;
        const closedCount = nextCourses.filter((c) => c.status === 'closed').length;
        const hiddenCount = nextCourses.filter((c) => c.status === 'inactive').length;
        setStats((s) => ({
          ...s,
          totalCourses: nextCourses.length,
          activeCourses: activeCount,
          inactiveCourses: nextCourses.length - activeCount,
          closedCourses: closedCount,
          hiddenCourses: hiddenCount,
        }));
        return nextCourses;
      });

      onDataMutated();
      showToast(`"${deleteModalCourse.title}" কোর্সটি মুছে ফেলা হয়েছে।`, 'info');
      setDeleteModalCourse(null);
    } catch (err: any) {
      showToast(err.message || 'ডিলিট করতে ব্যর্থ হয়েছে।', 'error');
    }
  };

  const openCreateCategoryModal = useCallback(async () => {
    const requestSeq = categoryModalRequestSeqRef.current + 1;
    categoryModalRequestSeqRef.current = requestSeq;

    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatSlugManuallyEdited(false);
    setCatOrderManuallyEdited(false);
    catOrderManuallyEditedRef.current = false;
    setCatSubtitle('');
    setCatCardTitle('');
    setCatBadgeColor('red');
    setCatDisplayOrderInput(String(nextAvailableCategoryOrder));
    setCatNavGroup('auto');
    setCatIconKey('auto');
    setCatFormError(null);
    setShowCategoryModal(true);

    setLoadingNextCategoryOrder(true);
    try {
      const res = await fetch('/api/admin/categories/next-order', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as { nextDisplayOrder?: number } | null;
      const nextOrder = Number(data?.nextDisplayOrder);
      if (
        categoryModalRequestSeqRef.current === requestSeq &&
        !catOrderManuallyEditedRef.current &&
        Number.isInteger(nextOrder) &&
        nextOrder >= 1
      ) {
        setCatDisplayOrderInput(String(nextOrder));
      }
    } catch {
      // Keep client-computed nextAvailableCategoryOrder fallback if offline
    } finally {
      if (categoryModalRequestSeqRef.current === requestSeq) {
        setLoadingNextCategoryOrder(false);
      }
    }
  }, [nextAvailableCategoryOrder, handleUnauthorizedResponse]);

  // Handle Save / Create Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError(null);

    if (!catName.trim() || !catSlug.trim()) {
      const msg = 'ক্যাটাগরির নাম ও স্লাগ দেওয়া আবশ্যক।';
      setCatFormError(msg);
      showToast(msg, 'error');
      return;
    }

    const useAutoOrder = !editingCategory && !catOrderManuallyEdited;
    let resolvedOrderValue: number | undefined;

    if (!useAutoOrder) {
      const orderCheck = validateCategoryOrderInput(
        catDisplayOrderInput,
        editingCategory?.id ?? null
      );
      if (!orderCheck.valid) {
        setCatFormError(orderCheck.error);
        showToast(orderCheck.error, 'error');
        return;
      }
      resolvedOrderValue = orderCheck.value;
    }

    const normalizedSlug =
      generateUnicodeCourseSlug(stripCategorySlugPrefix(catSlug)) ||
      stripCategorySlugPrefix(catSlug).trim().toLowerCase().replace(/\s+/g, '-');
    if (
      normalizedSlug &&
      normalizedSlug !== editingCategory?.slug &&
      isReservedCategorySlug(normalizedSlug)
    ) {
      const reservedMsg = `"${normalizedSlug}" স্লাগটি সিস্টেম রুটের জন্য সংরক্ষিত। অনুগ্রহ করে ভিন্ন একটি স্লাগ দিন।`;
      setCatFormError(reservedMsg);
      showToast(reservedMsg, 'error');
      return;
    }

    setSavingCat(true);
    try {
      const payload = {
        name: catName.trim(),
        slug: normalizedSlug,
        subtitle: catSubtitle.trim() || null,
        cardTitle: catCardTitle.trim() || null,
        badgeColor: catBadgeColor,
        ...(useAutoOrder
          ? { autoOrder: true }
          : { displayOrder: resolvedOrderValue }),
        navGroup: catNavGroup,
        iconKey: catIconKey,
        status: 'active',
      };

      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'ক্যাটাগরি সংরক্ষণ করা সম্ভব হয়নি।');
      }

      const savedCategory = (await res.json().catch(() => null)) as Category | null;
      if (savedCategory && typeof savedCategory.id === 'number') {
        setCategories((prev) => {
          const exists = prev.some((c) => c.id === savedCategory.id);
          const nextList = exists
            ? prev.map((c) => (c.id === savedCategory.id ? savedCategory : c))
            : [...prev, savedCategory];
          return [...nextList].sort(
            (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
          );
        });
      }

      await fetchDashboardData({ silent: true });
      onDataMutated();
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCatFormError(null);
      setCatName('');
      setCatSlug('');
      setCatSlugManuallyEdited(false);
      setCatOrderManuallyEdited(false);
      catOrderManuallyEditedRef.current = false;
      setCatSubtitle('');
      setCatCardTitle('');
      setCatDisplayOrderInput('1');
      setCatNavGroup('auto');
      setCatIconKey('auto');
      showToast(editingCategory ? 'ক্যাটাগরি আপডেট হয়েছে।' : 'নতুন ক্যাটাগরি তৈরি হয়েছে।', 'success');
    } catch (err: any) {
      const errMsg = err.message || 'ত্রুটি হয়েছে।';
      setCatFormError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSavingCat(false);
    }
  };

  // Handle Quick 1-Step Swap of Category Order
  const handleSwapCategoryOrder = async (cat: Category, direction: 'up' | 'down') => {
    const currentIndex = sortedCategories.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategories.length) return;
    const targetCat = sortedCategories[targetIndex];

    setSwappingCatId(cat.id);
    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstId: cat.id, secondId: targetCat.id }),
      });

      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'ক্যাটাগরির ক্রম পরিবর্তন করা সম্ভব হয়নি।');
      }

      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        await fetchDashboardData({ silent: true });
      }
      onDataMutated();
      showToast(`"${cat.name}" ক্যাটাগরির প্রদর্শন ক্রম আপডেট হয়েছে।`, 'success');
    } catch (err: any) {
      showToast(err.message || 'ক্রম পরিবর্তনে ত্রুটি হয়েছে।', 'error');
    } finally {
      setSwappingCatId(null);
    }
  };

  // Handle Delete Category
  const handleConfirmDeleteCategory = async () => {
    if (!deleteModalCat) return;

    try {
      const res = await fetch(`/api/admin/categories/${deleteModalCat.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (handleUnauthorizedResponse(res)) return;
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
    const cleanedAdminName = adminDisplayName.trim();
    if (!cleanedAdminName) {
      showToast('অ্যাডমিনের নাম খালি রাখা যাবে না।', 'error');
      return;
    }

    setSavingSettings(true);

    try {
      const payload = {
        siteTitle: siteTitle.trim(),
        adminName: cleanedAdminName,
        callNumber: callNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
        whatsappLink: whatsappLink.trim(),
        messengerLink: messengerLink.trim(),
        facebookLink: facebookLink.trim(),
        youtubeLink: youtubeLink.trim(),
        instagramLink: instagramLink.trim(),
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।');
      }

      const updated = await res.json();
      setSettings(updated);
      const nextAdminName =
        typeof updated?.adminName === 'string' && updated.adminName.trim()
          ? updated.adminName.trim()
          : cleanedAdminName;
      setAdminDisplayName(nextAdminName);
      setSavedAdminDisplayName(nextAdminName);
      onAdminNameUpdated?.(nextAdminName);
      onDataMutated();
      showToast('পোর্টাল সেটিংস সফলভাবে সংরক্ষিত হয়েছে।', 'success');
    } catch (err: any) {
      showToast(err.message || 'সেটিংস সংরক্ষণে ত্রুটি।', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Quick Countdown Toggle / Explicit Setter
  const setCountdownVisibility = async (updatedVal: boolean) => {
    const prevVal = showCountdownTimer;
    setShowCountdownTimer(updatedVal);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ showCountdownTimer: updatedVal }),
      });
      if (handleUnauthorizedResponse(res)) return;
      if (!res.ok) {
        setShowCountdownTimer(prevVal);
        showToast('টাইমার সেটিং আপডেট করা যায়নি।', 'error');
        return;
      }
      onDataMutated();
      showToast(
        updatedVal ? 'হোমপেজ কাউন্টডাউন টাইমার সক্রিয় করা হয়েছে।' : 'হোমপেজ কাউন্টডাউন টাইমার বন্ধ করা হয়েছে।',
        'info'
      );
    } catch {
      setShowCountdownTimer(prevVal);
    }
  };

  const handleQuickCountdownToggle = async () => {
    await setCountdownVisibility(!showCountdownTimer);
  };

  const handleNavigateHome = useCallback(() => {
    if (onNavigate) {
      onNavigate('/');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [onNavigate]);

  const handleRequestLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const handleOpenPublicBookStore = useCallback(() => {
    if (onNavigate) {
      onNavigate('/books');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/books';
    }
  }, [onNavigate]);

  const handleOpenPublicAcademicPage = useCallback(() => {
    if (onNavigate) {
      onNavigate('/online-batch');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/online-batch';
    }
  }, [onNavigate]);

  const navbarStats = useMemo(
    () => ({ ...stats, totalBooks: bookStats.totalBooks }),
    [stats, bookStats.totalBooks]
  );

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
      id: 'course_sort' as AdminPageTab,
      label: 'Course Sort',
      icon: <ArrowUpDown className="w-4 h-4 shrink-0" />,
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
      id: 'book_add' as AdminPageTab,
      label: 'Book Add',
      icon: <ShoppingBag className="w-4 h-4 shrink-0" />,
      badge: bookStats.totalBooks,
    },
    {
      id: 'online_batches' as AdminPageTab,
      label: 'Online Batch',
      icon: <GraduationCap className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'guides' as AdminPageTab,
      label: 'Guide Management',
      icon: <BookOpenCheck className="w-4 h-4 shrink-0" />,
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
        <div className="fixed top-20 right-4 sm:right-6 z-[110] animate-in fade-in slide-in-from-top-3 duration-200">
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
        onRequestLogout={handleRequestLogout}
        adminName={savedAdminDisplayName}
        adminEmail={adminEmail}
        stats={navbarStats}
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
                (activeTab === 'course_editor' && item.id === 'all_courses') ||
                ((activeTab === 'book_store' || activeTab === 'book_categories') &&
                  item.id === 'book_add') ||
                (activeTab === 'icon_sort' && item.id === 'settings');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSwitch(item.id)}
                  onMouseEnter={() => preloadTabChunk(item.id)}
                  onFocus={() => preloadTabChunk(item.id)}
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
      <div className="relative flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 flex flex-col lg:flex-row gap-6 items-start">
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
                  (activeTab === 'course_editor' && item.id === 'all_courses') ||
                  ((activeTab === 'book_store' || activeTab === 'book_categories') &&
                    item.id === 'book_add') ||
                  (activeTab === 'icon_sort' && item.id === 'settings');

                return (
                  <React.Fragment key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleTabSwitch(item.id)}
                      onMouseEnter={() => preloadTabChunk(item.id)}
                      onFocus={() => preloadTabChunk(item.id)}
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

                      {typeof item.badge === 'number' &&
                        (loading && courses.length === 0 ? (
                          <span
                            className={`h-4 w-6 rounded-full animate-pulse shrink-0 ${
                              isActive ? 'bg-white/25' : 'bg-rose-100/90'
                            }`}
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-rose-100/80 text-[#b91c1c]'
                            }`}
                          >
                            {toBengaliNumber(item.badge)}
                          </span>
                        ))}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Admin Profile inside Sidebar */}
            <div className="pt-4 border-t border-rose-200/50">
              <div className="glass-inset px-3.5 py-2.5 rounded-2xl text-[11px]">
                <div className="font-bold text-[#2A0F12] truncate">
                  {savedAdminDisplayName}
                </div>
                <div className="text-[#6B4C4F] truncate font-mono text-[10.5px]">
                  {adminEmail || 'admin@10ms.com'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 w-full">
          {activeTab === 'book_add' ||
          activeTab === 'book_store' ||
          activeTab === 'book_categories' ? (
            <BookStoreAdminManager
              initialView={
                activeTab === 'book_store'
                  ? 'list'
                  : activeTab === 'book_categories'
                  ? 'categories'
                  : 'add'
              }
              cachedData={cachedBookStoreData}
              onCacheUpdated={setCachedBookStoreData}
              onUnauthorized={handleBookStoreUnauthorized}
              onDataMutated={onDataMutated}
              onShowToast={showToast}
              onStatsChange={setBookStats}
              onOpenPublicBookStore={handleOpenPublicBookStore}
              onSelectSubView={(view) =>
                handleTabSwitch(
                  view === 'list'
                    ? 'book_store'
                    : view === 'categories'
                    ? 'book_categories'
                    : 'book_add'
                )
              }
            />
          ) : activeTab === 'online_batches' ? (
            <OnlineBatchAdminManager
              cachedData={cachedOnlineBatchData}
              onCacheUpdated={setCachedOnlineBatchData}
              onUnauthorized={handleBookStoreUnauthorized}
              onDataMutated={onDataMutated}
              onShowToast={showToast}
              onOpenPublicAcademicPage={handleOpenPublicAcademicPage}
            />
          ) : activeTab === 'guides' ? (
            <GuideManagementAdmin
              cachedData={cachedGuidesData}
              onCacheUpdated={setCachedGuidesData}
              onUnauthorized={handleBookStoreUnauthorized}
              onDataMutated={onDataMutated}
              onShowToast={showToast}
              onOpenPublicPath={(path) => {
                if (onNavigate) {
                  onNavigate(path);
                } else if (typeof window !== 'undefined') {
                  window.location.href = path;
                }
              }}
            />
          ) : error && courses.length === 0 ? (
            <div className="glass-strong rounded-3xl p-8 text-center space-y-3">
              <AlertCircle className="w-9 h-9 text-[#E22B2B] mx-auto" />
              <h2 className="text-base font-black text-[#2A0F12]">ডেটা লোড করতে সমস্যা হয়েছে</h2>
              <p className="text-xs text-[#6B4C4F] max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={() => void fetchDashboardData()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>পুনরায় চেষ্টা করুন</span>
              </button>
            </div>
          ) : loading && courses.length === 0 ? (
            <AdminDashboardSkeleton />
          ) : activeTab === 'course_editor' || activeTab === 'add_course' ? (
            /* ===================================================== */
            /* VIEW 1: DEDICATED ADD / EDIT COURSE PAGE              */
            /* ===================================================== */
            <CourseEditorPage
              course={editingCourse}
              categories={sortedCategories}
              existingCourses={courses}
              whatsappNumber={whatsappNumber}
              whatsappLink={whatsappLink}
              onUnauthorized={handleBookStoreUnauthorized}
              onShowToast={showToast}
              onBackToList={() => handleTabSwitch('all_courses')}
              onSave={handleSaveCourse}
            />
          ) : activeTab === 'course_sort' ? (
            /* ===================================================== */
            /* VIEW 1B: DYNAMIC DRAG & DROP COURSE POSITION MANAGER  */
            /* ===================================================== */
            <CourseSortManager
              categories={sortedCategories}
              courses={courses}
              initialCategoryCourseOrders={categoryCourseOrders}
              initialCategorySlug={filterCat !== 'all' ? filterCat : undefined}
              onOrderSaved={({ categoryCourseOrders: nextOrders, courses: nextCourses }) => {
                setCategoryCourseOrders(nextOrders);
                setCourses(nextCourses);
              }}
              onUnauthorized={handleBookStoreUnauthorized}
              onDataMutated={onDataMutated}
              onShowToast={showToast}
            />
          ) : activeTab === 'overview' ? (
            /* ===================================================== */
            /* VIEW 2: EXECUTIVE OVERVIEW DASHBOARD                  */
            /* ===================================================== */
            <div className="space-y-6">
              {storageInfo?.warning && (
                <div className="glass-surface rounded-2xl border border-amber-300/80 bg-amber-50/85 px-4 py-3 text-xs font-bold text-amber-900 flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{storageInfo.warning}</span>
                </div>
              )}
              {storageInfo?.backend === 'supabase-postgres' && !storageInfo?.warning && (
                <div className="glass-surface rounded-2xl border border-emerald-300/70 bg-emerald-50/75 px-4 py-2.5 text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Supabase PostgreSQL প্রোডাকশন ডাটাবেস সংযুক্ত রয়েছে (RLS ও সিকিউর অথেনটিকেশন সক্রিয়)।
                  </span>
                </div>
              )}

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

                <div className="w-full overflow-hidden">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead>
                      <tr className="border-b border-rose-200/50 text-[#6B4C4F] uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-2.5 sm:px-3">কোর্স</th>
                        <th className="w-[100px] sm:w-[130px] py-2.5 px-2 sm:px-3">ক্যাটাগরি</th>
                        <th className="w-[88px] sm:w-[105px] py-2.5 px-2 sm:px-3">মূল্য ও ছাড়</th>
                        <th className="w-[74px] sm:w-[88px] py-2.5 px-2 sm:px-3 text-center">স্ট্যাটাস</th>
                        <th className="w-[68px] sm:w-[76px] py-2.5 px-2 sm:px-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/70">
                      {courses.slice(0, 6).map((course) => (
                        <tr key={course.id} className="hover:bg-rose-50/45 transition">
                          <td className="py-3 px-2.5 sm:px-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {course.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
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
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-[#2A0F12] truncate">
                                  {course.title}
                                </div>
                                <div className="text-[10px] text-[#6B4C4F] font-mono truncate">
                                  /go/{course.slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 sm:px-3 font-semibold text-[#2A0F12]/80">
                            {(() => {
                              const catNames = getCourseCategoryNames(course);
                              if (catNames.length <= 1) {
                                return (
                                  <span className="line-clamp-2 leading-snug text-[11px]">
                                    {catNames[0] || course.categorySlug}
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {catNames.slice(0, 2).map((name) => (
                                    <span
                                      key={name}
                                      className="inline-block px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200/70 text-[10px] font-bold text-[#2A0F12] leading-tight truncate max-w-[115px]"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                  {catNames.length > 2 && (
                                    <span
                                      title={catNames.slice(2).join(', ')}
                                      className="inline-block px-1.5 py-0.5 rounded-md bg-rose-100 text-[10px] font-extrabold text-[#b91c1c] leading-tight tabular-nums"
                                    >
                                      +{toBengaliNumber(catNames.length - 2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-2 sm:px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-[#2A0F12] tabular-nums">
                              ৳{toBengaliNumber(course.discountPrice)}
                            </div>
                            {course.originalPrice > course.discountPrice && (
                              <div className="text-[10px] text-[#6B4C4F]/70 line-through font-mono tabular-nums">
                                ৳{toBengaliNumber(course.originalPrice)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                course.status === 'active'
                                  ? 'bg-emerald-100/90 text-emerald-800 border-emerald-200'
                                  : course.status === 'closed'
                                  ? 'bg-amber-100/90 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {course.status === 'active'
                                ? 'চালু'
                                : course.status === 'closed'
                                ? 'ভর্তি বন্ধ'
                                : 'লুকানো'}
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

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('course_sort')}
                    onMouseEnter={() => preloadTabChunk('course_sort')}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl border border-rose-200/90 bg-white hover:bg-rose-50 hover:border-[#eb1c24] text-[#b91c1c] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>কোর্স সাজান (Drag &amp; Drop)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabSwitch('add_course')}
                    className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-2 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>নতুন কোর্স যোগ করুন</span>
                  </button>
                </div>
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
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="কোর্সের নাম, ব্যাচ বা ট্যাগ দিয়ে খুঁজুন..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-white/90 text-xs text-[#2A0F12] bg-white/85 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
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
                    onChange={(e) => {
                      setFilterCat(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-white/90 text-xs font-bold text-[#2A0F12] bg-white/85 focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer"
                  >
                    <option value="all">সব ক্যাটাগরি ({toBengaliNumber(courses.length)})</option>
                    {sortedCategories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {activeTab === 'all_courses' && (
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-white/90 text-xs font-bold text-[#2A0F12] bg-white/85 focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="all">সব স্ট্যাটাস</option>
                      <option value="active">চালু (Active)</option>
                      <option value="closed">ভর্তি বন্ধ (Closed)</option>
                      <option value="inactive">লুকানো (Inactive)</option>
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
                        setCurrentPage(1);
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
                      {paginatedCourses.map((course) => {
                        const isToggling = statusTogglingId === course.id;
                        const categoryNames = getCourseCategoryNames(course);

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
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyCourseShareLink(course)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition cursor-pointer shrink-0 ${
                                        copiedCourseId === course.id
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                          : 'border-rose-200 bg-rose-50/90 text-[#b91c1c] hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24]'
                                      }`}
                                      title="শেয়ারযোগ্য কোর্স লিংক কপি করুন"
                                      aria-label={`${course.title} Copy link`}
                                    >
                                      {copiedCourseId === course.id ? (
                                        <>
                                          <Check className="w-2.5 h-2.5 shrink-0" />
                                          <span>Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-2.5 h-2.5 shrink-0" />
                                          <span>Copy link</span>
                                        </>
                                      )}
                                    </button>

                                    <span
                                      className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${
                                        course.status === 'active'
                                          ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                                          : course.status === 'closed'
                                          ? 'bg-amber-100/90 text-amber-800 border-amber-300'
                                          : 'bg-slate-100 text-slate-700 border-slate-300'
                                      }`}
                                    >
                                      {course.status === 'active'
                                        ? 'চালু (Active)'
                                        : course.status === 'closed'
                                        ? 'ভর্তি বন্ধ (Closed)'
                                        : 'লুকানো (Inactive)'}
                                    </span>
                                  </div>
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
                                {categoryNames.length <= 1 ? (
                                  <span className="font-semibold text-[#2A0F12] break-words">
                                    {categoryNames[0] || course.categorySlug}
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {categoryNames.map((name) => (
                                      <span
                                        key={name}
                                        className="inline-block px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200/70 text-[9.5px] font-bold text-[#2A0F12] leading-tight"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
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

                                <select
                                  value={
                                    course.status === 'active' ||
                                    course.status === 'closed' ||
                                    course.status === 'inactive'
                                      ? course.status
                                      : 'inactive'
                                  }
                                  onChange={(e) =>
                                    void handleChangeCourseStatus(
                                      course,
                                      e.target.value as 'active' | 'closed' | 'inactive'
                                    )
                                  }
                                  disabled={isToggling}
                                  aria-label="কোর্স স্ট্যাটাস পরিবর্তন"
                                  className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition cursor-pointer outline-none disabled:opacity-50 ${
                                    course.status === 'active'
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                      : course.status === 'closed'
                                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                                      : 'border-slate-300 bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <option value="active">চালু (Active)</option>
                                  <option value="closed">ভর্তি বন্ধ (Closed)</option>
                                  <option value="inactive">লুকানো (Inactive)</option>
                                </select>

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

                {/* Desktop & Tablet Table (Fits cleanly within viewport with zero horizontal scroll) */}
                <div className="hidden md:block w-full">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead>
                      <tr className="bg-rose-50/75 border-b border-rose-200/50 text-[#6B4C4F] font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-2.5 lg:px-3">কোর্স তথ্য</th>
                        <th className="w-[100px] lg:w-[116px] xl:w-[138px] py-3 px-2 lg:px-2.5">
                          ক্যাটাগরি
                        </th>
                        <th className="w-[90px] lg:w-[102px] xl:w-[116px] py-3 px-2 lg:px-2.5">
                          মূল্য ও ছাড়
                        </th>
                        <th className="w-[56px] lg:w-[64px] xl:w-[70px] py-3 px-1.5 lg:px-2 text-center">
                          ক্লিক
                        </th>
                        <th className="w-[104px] lg:w-[110px] xl:w-[116px] py-3 px-1.5 lg:px-2 text-center">
                          স্ট্যাটাস
                        </th>
                        <th className="w-[88px] lg:w-[94px] xl:w-[100px] py-3 px-2 lg:px-2.5 text-right">
                          অ্যাকশন
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/70">
                      {displayedCourses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#6B4C4F] font-bold">
                            কোনো কোর্স পাওয়া যায়নি। অনুসন্ধান শব্দ পরিবর্তন করুন।
                          </td>
                        </tr>
                      ) : (
                        paginatedCourses.map((course) => {
                          const isToggling = statusTogglingId === course.id;
                          return (
                            <tr key={course.id} className="hover:bg-rose-50/45 transition">
                              {/* Course Details */}
                              <td className="py-3 px-2.5 lg:px-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {course.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={course.imageUrl}
                                      alt={course.title}
                                      loading="lazy"
                                      decoding="async"
                                      width={44}
                                      height={30}
                                      className="w-10 h-7 xl:w-11 xl:h-8 object-cover rounded-lg border border-rose-100 shrink-0 bg-white"
                                    />
                                  ) : (
                                    <div className="w-10 h-7 xl:w-11 xl:h-8 rounded-lg bg-rose-100 flex items-center justify-center text-[#b91c1c] text-[9.5px] font-black shrink-0">
                                      10MS
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="font-bold text-[#2A0F12] truncate min-w-0">
                                        {course.title}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => void handleCopyCourseShareLink(course)}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold transition cursor-pointer shrink-0 ${
                                          copiedCourseId === course.id
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                            : 'border-rose-200 bg-rose-50/90 text-[#b91c1c] hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24]'
                                        }`}
                                        title="শেয়ারযোগ্য কোর্স লিংক কপি করুন"
                                        aria-label={`${course.title} Copy link`}
                                      >
                                        {copiedCourseId === course.id ? (
                                          <>
                                            <Check className="w-2.5 h-2.5 shrink-0" />
                                            <span>Copied!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-2.5 h-2.5 shrink-0" />
                                            <span>Copy link</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-[#6B4C4F] font-medium min-w-0">
                                      <span className="px-1.5 py-0.5 rounded bg-white/80 border border-rose-100 text-[#6B4C4F] font-mono text-[9.5px] truncate min-w-0 max-w-[165px] xl:max-w-[235px]">
                                        /go/{course.slug}
                                      </span>
                                      {course.shortBadge && (
                                        <span className="text-[#b91c1c] font-semibold truncate max-w-[90px] xl:max-w-[125px] hidden xl:inline">
                                          • {course.shortBadge}
                                        </span>
                                      )}
                                      {course.isPopular && (
                                        <span className="text-amber-600 font-bold shrink-0 whitespace-nowrap">
                                          ★ জনপ্রিয়
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-2 lg:px-2.5 font-semibold text-[#2A0F12]/80">
                                {(() => {
                                  const catNames = getCourseCategoryNames(course);
                                  if (catNames.length <= 1) {
                                    return (
                                      <span className="line-clamp-2 leading-snug text-[11px] xl:text-xs">
                                        {catNames[0] || course.categorySlug}
                                      </span>
                                    );
                                  }
                                  return (
                                    <div className="flex flex-wrap gap-1" title={catNames.join(', ')}>
                                      {catNames.slice(0, 2).map((name) => (
                                        <span
                                          key={name}
                                          className="inline-block px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200/70 text-[10px] font-bold text-[#2A0F12] leading-tight truncate max-w-[120px]"
                                        >
                                          {name}
                                        </span>
                                      ))}
                                      {catNames.length > 2 && (
                                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-rose-100 text-[10px] font-extrabold text-[#b91c1c] leading-tight tabular-nums">
                                          +{toBengaliNumber(catNames.length - 2)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* Pricing */}
                              <td className="py-3 px-2 lg:px-2.5 whitespace-nowrap">
                                <div className="font-mono font-bold text-emerald-700 text-xs xl:text-sm tabular-nums">
                                  ৳{toBengaliNumber(course.discountPrice)}
                                </div>
                                {course.originalPrice > course.discountPrice && (
                                  <div className="text-[9.5px] xl:text-[10px] text-[#6B4C4F]/75 line-through font-mono tabular-nums">
                                    ৳{toBengaliNumber(course.originalPrice)} (
                                    {toBengaliNumber(course.discountPercent)}% ছাড়)
                                  </div>
                                )}
                              </td>

                              {/* Click Count */}
                              <td className="py-3 px-1.5 lg:px-2 text-center whitespace-nowrap">
                                <span className="font-mono font-bold text-[#b91c1c] text-[11px] xl:text-xs tabular-nums">
                                  {toBengaliNumber(course.clickCount || 0)} ক্লিক
                                </span>
                              </td>

                              {/* 3-State Status Selector (Compact Size) */}
                              <td className="py-3 px-1.5 lg:px-2 text-center whitespace-nowrap">
                                <select
                                  value={
                                    course.status === 'active' ||
                                    course.status === 'closed' ||
                                    course.status === 'inactive'
                                      ? course.status
                                      : 'inactive'
                                  }
                                  onChange={(e) =>
                                    void handleChangeCourseStatus(
                                      course,
                                      e.target.value as 'active' | 'closed' | 'inactive'
                                    )
                                  }
                                  disabled={isToggling}
                                  aria-label={`${course.title} স্ট্যাটাস`}
                                  className={`w-full max-w-[104px] px-2 py-0.5 rounded-full text-[10.5px] font-bold transition cursor-pointer border outline-none disabled:opacity-50 truncate ${
                                    course.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                      : course.status === 'closed'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/80'
                                  }`}
                                >
                                  <option value="active">
                                    {isToggling && course.status === 'active'
                                      ? 'আপডেট হচ্ছে...'
                                      : 'চালু (Active)'}
                                  </option>
                                  <option value="closed">
                                    {isToggling && course.status === 'closed'
                                      ? 'আপডেট হচ্ছে...'
                                      : 'ভর্তি বন্ধ (Closed)'}
                                  </option>
                                  <option value="inactive">
                                    {isToggling && course.status === 'inactive'
                                      ? 'আপডেট হচ্ছে...'
                                      : 'লুকানো (Inactive)'}
                                  </option>
                                </select>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-2 lg:px-2.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewingCourse(course)}
                                    className="p-1.5 rounded-lg text-[#6B4C4F] hover:text-[#2A0F12] hover:bg-white/80 transition cursor-pointer"
                                    title="কার্ড প্রিভিউ দেখুন"
                                    aria-label="কার্ড প্রিভিউ দেখুন"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCourse(course);
                                      setActiveTab('course_editor');
                                    }}
                                    className="p-1.5 rounded-lg text-[#1E63D6] hover:bg-blue-50 transition cursor-pointer"
                                    title="এডিট করুন"
                                    aria-label="এডিট করুন"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteModalCourse(course)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                    title="মুছে ফেলুন"
                                    aria-label="মুছে ফেলুন"
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

                {/* Table Footer Count & Pagination */}
                <div className="bg-white/50 border-t border-rose-200/50 px-4 py-3 text-xs text-[#6B4C4F] font-semibold flex flex-wrap items-center justify-between gap-3 tabular-nums">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>মোট প্রদর্শিত: {toBengaliNumber(displayedCourses.length)}টি কোর্স</span>
                    <span>মোট ডাটাবেস কোর্স: {toBengaliNumber(courses.length)}টি</span>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage <= 1}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-[#2A0F12] font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                        aria-label="পূর্ববর্তী পৃষ্ঠা"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">পূর্ববর্তী</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[30px] h-8 px-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                            pageNum === safeCurrentPage
                              ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                              : 'border border-rose-200/80 bg-white/90 text-[#2A0F12] hover:bg-rose-50'
                          }`}
                        >
                          {toBengaliNumber(pageNum)}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage >= totalPages}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-[#2A0F12] font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                        aria-label="পরবর্তী পৃষ্ঠা"
                      >
                        <span className="hidden sm:inline">পরবর্তী</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
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
                  onClick={() => void openCreateCategoryModal()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs flex items-center gap-2 shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>নতুন ক্যাটাগরি যোগ করুন</span>
                </button>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedCategories.map((cat, idx) => {
                  const catCoursesCount = courses.filter((c) =>
                    courseMatchesCategorySlug(c, cat.slug)
                  ).length;
                  const isFirst = idx === 0;
                  const isLast = idx === sortedCategories.length - 1;
                  const hasDuplicateOrder =
                    sortedCategories.filter((c) => Number(c.displayOrder) === Number(cat.displayOrder))
                      .length > 1;
                  const navDisplay = getNavbarGroupDisplayLabel(cat);
                  const CatIconComp = getCategoryLucideIcon(cat);
                  const catTheme = resolveCategoryCardTheme(cat, idx);
                  return (
                    <div
                      key={cat.id}
                      className="glass-card rounded-3xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-2xl ${catTheme.topGradient} text-white flex items-center justify-center shrink-0 shadow-sm border border-white/60`}
                            title="ক্যাটাগরি আইকন"
                          >
                            <CatIconComp className="w-5 h-5 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black text-[#2A0F12]">{cat.name}</h3>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                                  hasDuplicateOrder
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-[#b91c1c]'
                                }`}
                              >
                                ক্রম: {toBengaliNumber(cat.displayOrder)}
                              </span>
                              <span
                                title={
                                  navDisplay.isAuto
                                    ? 'নাম/স্লাগ থেকে স্বয়ংক্রিয়ভাবে নির্ধারিত'
                                    : 'ম্যানুয়ালি নির্ধারিত Navbar ড্রপডাউন'
                                }
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  navDisplay.group === 'none'
                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                Navbar: {navDisplay.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-[#6B4C4F] font-mono break-all">
                                {buildReadableCategoryPath(cat.slug)}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleCopyCategoryLink(cat)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition cursor-pointer shrink-0 ${
                                  copiedCategoryId === cat.id
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-rose-200 bg-rose-50/90 text-[#b91c1c] hover:bg-[#eb1c24] hover:text-white hover:border-[#eb1c24]'
                                }`}
                                title="ক্যাটাগরি লিংক কপি করুন"
                                aria-label={`${cat.name} Copy Link`}
                              >
                                {copiedCategoryId === cat.id ? (
                                  <>
                                    <Check className="w-3 h-3 shrink-0" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 shrink-0" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                            </div>
                            {cat.subtitle && (
                              <p className="text-xs text-[#6B4C4F] mt-1 font-medium">{cat.subtitle}</p>
                            )}
                            <p className="text-[11px] text-[#b91c1c] mt-1 font-bold">
                              কার্ড ব্যাচ টাইটেল: {resolveCategoryCardBatchTitle(cat, selectorIconLabels)}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/80 border border-rose-100 text-[#2A0F12] whitespace-nowrap tabular-nums shrink-0">
                          {toBengaliNumber(catCoursesCount)}টি কোর্স
                        </span>
                      </div>

                      <div className="pt-3 border-t border-rose-200/50 flex items-center justify-between gap-2">
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

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isFirst || swappingCatId !== null}
                            onClick={() => void handleSwapCategoryOrder(cat, 'up')}
                            className="p-1.5 rounded-lg text-[#6B4C4F] hover:text-[#2A0F12] hover:bg-rose-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="এক ধাপ আগে নিন"
                            aria-label={`${cat.name} এক ধাপ আগে নিন`}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={isLast || swappingCatId !== null}
                            onClick={() => void handleSwapCategoryOrder(cat, 'down')}
                            className="p-1.5 rounded-lg text-[#6B4C4F] hover:text-[#2A0F12] hover:bg-rose-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="এক ধাপ পরে নিন"
                            aria-label={`${cat.name} এক ধাপ পরে নিন`}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatName(cat.name);
                              setCatSlug(cat.slug);
                              setCatSlugManuallyEdited(false);
                              setCatSubtitle(cat.subtitle || '');
                              setCatCardTitle(cat.cardTitle || '');
                              setCatBadgeColor(cat.badgeColor || 'red');
                              setCatDisplayOrderInput(String(cat.displayOrder || 1));
                              setCatOrderManuallyEdited(true);
                              catOrderManuallyEditedRef.current = true;
                              setCatNavGroup(normalizeCategoryNavGroup(cat.navGroup));
                              setCatIconKey(normalizeCategoryIconKey(cat.iconKey));
                              setCatFormError(null);
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
          ) : activeTab === 'settings' || activeTab === 'icon_sort' ? (
            /* ===================================================== */
            /* VIEW 5: PORTAL SETTINGS & ICON SORT SUB-SECTION       */
            /* ===================================================== */
            <div className="space-y-6">
              {/* Header + Settings Sub-Menu Switcher */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight">
                      {activeTab === 'icon_sort'
                        ? 'সেটিংস — Icon Sort (আইকন পজিশন ও নাম ম্যানেজার)'
                        : 'পোর্টাল সেটিংস ও যোগাযোগ (Settings & Direct Contact)'}
                    </h1>
                    <p className="text-xs text-[#6B4C4F] mt-1">
                      {activeTab === 'icon_sort'
                        ? 'মেইন ওয়েবসাইটের ক্লাস ও কোর্স সিলেক্টর আইকনগুলোর সিরিয়াল নম্বর, মূল নাম এবং সাব-নাম পরিবর্তন ও প্রিভিউ করুন।'
                        : 'সাইট টাইটেল, ডিরেক্ট কল নম্বর, অফিশিয়াল হোয়াটসঅ্যাপ নম্বর, মেসেঞ্জার লিংক, হোমপেজ টেক্সট এবং Icon Sort নিয়ন্ত্রণ।'}
                    </p>
                  </div>

                  {/* Settings Menu Tabs: General Settings | Icon Sort */}
                  <div className="inline-flex items-center p-1 rounded-2xl bg-rose-50/80 border border-rose-200/80 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('settings')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'settings'
                          ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                          : 'text-[#6B4C4F] hover:text-[#2A0F12]'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>General Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('icon_sort')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === 'icon_sort'
                          ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                          : 'text-[#6B4C4F] hover:text-[#2A0F12]'
                      }`}
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>Icon Sort</span>
                    </button>
                  </div>
                </div>
              </div>

              {activeTab === 'icon_sort' ? (
                <IconSortManager
                  initialOrderedIds={selectorIconOrder}
                  initialLabels={selectorIconLabels}
                  onConfigSaved={(nextOrder, nextLabels) => {
                    setSelectorIconOrder(nextOrder);
                    setSelectorIconLabels(nextLabels);
                  }}
                  onUnauthorized={handleBookStoreUnauthorized}
                  onDataMutated={onDataMutated}
                  onShowToast={showToast}
                />
              ) : (
                <>

              <form onSubmit={handleSaveSettings} className="glass-strong rounded-3xl p-6 sm:p-7 space-y-6">
                {/* 1. General Site Identity */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-[#2A0F12] border-b border-rose-200/50 pb-2">
                    ওয়েবসাইট শিরোনাম ও পরিচয় (Branding)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div>
                      <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                        অ্যাডমিনের নাম (Admin Name)
                      </label>
                      <input
                        type="text"
                        value={adminDisplayName}
                        onChange={(e) => setAdminDisplayName(e.target.value)}
                        placeholder="Site Admin"
                        maxLength={120}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
                      />
                      <p className="text-[11px] text-[#6B4C4F] mt-1">
                        অ্যাডমিন পোর্টালের সাইডবার, হেডার ও ফুটারে এই নামটি প্রদর্শিত হবে।
                      </p>
                    </div>
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

                  <div className="pt-2 border-t border-rose-200/40 space-y-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#2A0F12]">
                        ফুটার সোশ্যাল মিডিয়া লিংক (Social Media Links)
                      </h4>
                      <p className="text-[11px] text-[#6B4C4F] mt-0.5">
                        ওয়েবসাইটের ফুটারের সোশ্যাল মিডিয়া আইকনগুলোর লিংক এখান থেকে নিয়ন্ত্রণ করুন। ফুটারের WhatsApp আইকন উপরের{' '}
                        <span className="font-semibold text-[#2A0F12]">হোয়াটসঅ্যাপ ডিরেক্ট চ্যাট লিংক</span>{' '}
                        থেকে স্বয়ংক্রিয়ভাবে লিংক নেয়।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                          ফেসবুক পেজ লিংক (Facebook Link)
                        </label>
                        <input
                          type="text"
                          value={facebookLink}
                          onChange={(e) => setFacebookLink(e.target.value)}
                          placeholder="https://www.facebook.com/10ms.official"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                          ইউটিউব চ্যানেল লিংক (YouTube Link)
                        </label>
                        <input
                          type="text"
                          value={youtubeLink}
                          onChange={(e) => setYoutubeLink(e.target.value)}
                          placeholder="https://www.youtube.com/@10MinuteSchool"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                          ইনস্টাগ্রাম লিংক (Instagram Link)
                        </label>
                        <input
                          type="text"
                          value={instagramLink}
                          onChange={(e) => setInstagramLink(e.target.value)}
                          placeholder="https://www.instagram.com/10ms_official"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/90 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-mono"
                        />
                      </div>
                    </div>
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

              {/* Icon Sort Option Card inside Settings Menu */}
              <div className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/80 text-[#b91c1c] flex items-center justify-center shrink-0">
                    <ListOrdered className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-[#2A0F12]">
                        মেইন ওয়েবসাইট আইকন পজিশন ও নাম (Icon Sort)
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100/80 text-[#b91c1c] tabular-nums">
                        {toBengaliNumber(selectorIconOrder.length)}টি আইকন
                      </span>
                    </div>
                    <p className="text-xs text-[#6B4C4F] mt-0.5">
                      হোমপেজের ক্লাস ও কোর্স সিলেক্টর আইকনগুলোর সিরিয়াল পজিশন, মূল নাম ও সাব-নাম এখান থেকে নিয়ন্ত্রণ করুন।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('icon_sort')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/90 hover:bg-gradient-to-r hover:from-[#ff5252] hover:to-[#b91c1c] text-[#b91c1c] hover:text-white text-xs font-bold transition cursor-pointer shrink-0"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Icon Sort ওপেন করুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
                </>
              )}
            </div>
          ) : activeTab === 'offer_timers' ? (
            /* ===================================================== */
            /* VIEW 6: DEDICATED OFFER COUNTDOWN TIMER MANAGEMENT    */
            /* ===================================================== */
            <OfferTimerManager
              courses={courses}
              timers={offerTimers}
              serverNow={serverNow}
              showCountdownTimer={showCountdownTimer}
              onEnableCountdownTimer={() => setCountdownVisibility(true)}
              onUnauthorized={onLogout}
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
                if (nextTimers.some((t) => !t.isPaused)) {
                  setShowCountdownTimer(true);
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
        onRequestLogout={handleRequestLogout}
        adminName={savedAdminDisplayName}
        adminEmail={adminEmail}
        stats={navbarStats}
        categoriesCount={categories.length}
        activeOfferTimersCount={activeOfferTimersCount}
      />

      {/* Mobile Fixed Bottom Navigation Bar + More Menu */}
      <AdminMobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleTabSwitch}
        onNavigateHome={handleNavigateHome}
        onRequestLogout={handleRequestLogout}
        adminName={savedAdminDisplayName}
        adminEmail={adminEmail}
        stats={navbarStats}
        activeOfferTimersCount={activeOfferTimersCount}
      />

      {/* ========================================================= */}
      {/* 4. MODALS & CONFIRMATION DIALOGS                          */}
      {/* ========================================================= */}

      {/* CourseCard Live Preview Modal */}
      {previewingCourse && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 animate-in fade-in">
            <div className="min-h-full flex items-center justify-center">
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
                      whatsappNumber={whatsappNumber}
                      whatsappLink={whatsappLink}
                      onEnrollClick={() =>
                        window.open(previewingCourse.affiliateUrl, '_blank', 'noopener,noreferrer')
                      }
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
          </div>
        </AdminModalPortal>
      )}

      {/* Delete Course Confirmation Modal */}
      {deleteModalCourse && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
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
        </AdminModalPortal>
      )}

      {/* Category Modal (Create / Edit) */}
      {showCategoryModal && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 animate-in fade-in">
            <div className="min-h-full flex items-center justify-center">
              <form
                onSubmit={handleSaveCategory}
                className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4 border border-white/90 shadow-2xl relative"
              >
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="text-sm font-bold text-[#2A0F12] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#eb1c24]" />
                <span>{editingCategory ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCatFormError(null);
                  setShowCategoryModal(false);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-rose-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {catFormError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-bold text-red-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{catFormError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                ক্যাটাগরির নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setCatName(nextName);
                  if (catFormError) setCatFormError(null);
                  if (!catSlugManuallyEdited) {
                    setCatSlug(generateUnicodeCourseSlug(nextName));
                  }
                }}
                placeholder="যেমন: HSC অনলাইন ব্যাচ"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                স্লাগ (URL Slug) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={catSlug}
                onChange={(e) => {
                  const stripped = stripCategorySlugPrefix(e.target.value);
                  setCatSlug(sanitizeEditableUnicodeSlug(stripped));
                  setCatSlugManuallyEdited(true);
                  if (catFormError) setCatFormError(null);
                }}
                placeholder="hsc-28-science"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
              />
              <p className="mt-1 text-[11px] text-[#6B4C4F]">
                ক্যাটাগরির নাম পরিবর্তন করলে URL স্লাগ স্বয়ংক্রিয়ভাবে আপডেট হবে। পাবলিক লিংক:{' '}
                <span className="font-mono text-[#2A0F12] font-semibold">
                  /{catSlug || 'hsc-28-science'}
                </span>
              </p>
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

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-[#2A0F12]">
                  আইকন কার্ড ব্যাচ টাইটেল (Icon Card Title)
                </label>
                <span className="text-[10px] font-bold text-[#6B4C4F] tabular-nums">
                  {toBengaliNumber(Array.from(catCardTitle.trim()).length)} /{' '}
                  {toBengaliNumber(CATEGORY_CARD_TITLE_MAX_LENGTH)}
                </span>
              </div>
              <input
                type="text"
                maxLength={CATEGORY_CARD_TITLE_MAX_LENGTH}
                value={catCardTitle}
                onChange={(e) => setCatCardTitle(e.target.value)}
                placeholder={resolveCategoryCardBatchTitle(
                  {
                    name: catName || 'ক্যাটাগরি',
                    slug: catSlug || 'category',
                    subtitle: catSubtitle || null,
                    navGroup: catNavGroup,
                    cardTitle: null,
                  },
                  selectorIconLabels
                )}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-bold"
              />
              <p className="text-[10px] text-[#6B4C4F] mt-1 leading-relaxed">
                ক্লাস ৬–১২ ও বিভাগীয় পেজের আইকন কার্ডের নিচে এই টাইটেলটি প্রদর্শিত হবে (যেমন: বার্ষিক অনলাইন ব্যাচ, SSC ২০২৯ ব্যাচ)। খালি রাখলে হোম পেজ আইকনের সাব-নাম বা স্বয়ংক্রিয় ব্যাচ টাইটেল দেখাবে।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-bold text-[#2A0F12]">
                    প্রদর্শন ক্রম (Order) <span className="text-red-500">*</span>
                  </label>
                  {!editingCategory && !catOrderManuallyEdited && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                      {loadingNextCategoryOrder ? 'যাচাই হচ্ছে...' : 'স্বয়ংক্রিয়'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={catDisplayOrderInput}
                  onChange={(e) => {
                    setCatDisplayOrderInput(e.target.value);
                    setCatOrderManuallyEdited(true);
                    catOrderManuallyEditedRef.current = true;
                    if (catFormError) setCatFormError(null);
                  }}
                  placeholder={String(nextAvailableCategoryOrder)}
                  aria-invalid={liveOrderValidation ? !liveOrderValidation.valid : false}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none shadow-2xs font-mono font-bold transition ${
                    liveOrderValidation && !liveOrderValidation.valid
                      ? 'border-red-500 bg-red-50/40 text-red-700 focus:border-red-600'
                      : 'border-slate-200 text-[#2A0F12] bg-white focus:border-[#eb1c24]'
                  }`}
                />
                {liveOrderValidation && !liveOrderValidation.valid ? (
                  <p className="text-[10px] font-bold text-red-600 mt-1 leading-snug">
                    {liveOrderValidation.error}
                  </p>
                ) : !editingCategory && !catOrderManuallyEdited ? (
                  <p className="text-[10px] text-[#6B4C4F] mt-1">
                    সর্বশেষ ক্রমের পর স্বয়ংক্রিয়ভাবে নির্ধারিত: {toBengaliNumber(Number(catDisplayOrderInput) || nextAvailableCategoryOrder)}
                  </p>
                ) : (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-[10px] text-[#6B4C4F]">
                      পরবর্তী খালি ক্রম: {toBengaliNumber(nextAvailableCategoryOrder)}
                    </p>
                    {!editingCategory && (
                      <button
                        type="button"
                        onClick={() => void openCreateCategoryModal()}
                        className="text-[10px] font-bold text-[#b91c1c] hover:underline cursor-pointer"
                      >
                        স্বয়ংক্রিয় ক্রম দিন
                      </button>
                    )}
                  </div>
                )}
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
                  <option value="red">স্বয়ংক্রিয় / রেড (Default)</option>
                  <option value="sky">স্কাই / সায়ান (Sky)</option>
                  <option value="purple">পার্পল (Purple)</option>
                  <option value="orange">অরেঞ্জ (Orange)</option>
                  <option value="teal">টিল (Teal)</option>
                  <option value="blue">ব্লু (Blue)</option>
                  <option value="rose">রোজ (Rose)</option>
                  <option value="emerald">এমারেল্ড (Emerald)</option>
                  <option value="amber">অ্যাম্বার (Amber)</option>
                  <option value="indigo">ইন্ডিগো (Indigo)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                Navbar ড্রপডাউন মেনু
              </label>
              <select
                value={catNavGroup}
                onChange={(e) => setCatNavGroup(normalizeCategoryNavGroup(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs cursor-pointer font-bold"
              >
                {NAVBAR_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#6B4C4F] mt-1">
                নির্বাচিত Navbar বাটনের ড্রপডাউনে এই ক্যাটাগরিটি প্রদর্শিত হবে।
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#2A0F12]">
                  ক্যাটাগরি আইকন (Mobile & Navbar Icon)
                </label>
                <span className="text-[10px] font-bold text-[#6B4C4F]">
                  {CATEGORY_ICON_OPTIONS.find((o) => o.value === catIconKey)?.label || 'স্বয়ংক্রিয়'}
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 p-2 rounded-2xl bg-rose-50/50 border border-rose-100 max-h-40 overflow-y-auto">
                {CATEGORY_ICON_OPTIONS.map((opt) => {
                  const IconOptionComp = getLucideIconByKey(opt.value, {
                    name: catName || 'ক্যাটাগরি',
                    slug: catSlug || 'category',
                    subtitle: catSubtitle || null,
                    navGroup: catNavGroup,
                  });
                  const isSelected = catIconKey === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCatIconKey(opt.value)}
                      title={opt.label}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[9.5px] font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm scale-[1.03]'
                          : 'bg-white text-[#2A0F12] border-slate-200 hover:border-rose-300 hover:bg-rose-50/60'
                      }`}
                    >
                      <IconOptionComp className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-full leading-none">
                        {opt.value === 'auto' ? 'Auto' : opt.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#6B4C4F] mt-1">
                এখান থেকে আইকন পরিবর্তন করলে Mobile ও Desktop Navbar-এ স্বয়ংক্রিয়ভাবে আপডেট হবে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-100">
              <button
                type="button"
                onClick={() => {
                  setCatFormError(null);
                  setShowCategoryModal(false);
                }}
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
          </div>
        </AdminModalPortal>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteModalCat && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
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
        </AdminModalPortal>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
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
        </AdminModalPortal>
      )}
    </div>
  );
};
