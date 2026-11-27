'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Edit,
  ExternalLink,
  FileEdit,
  GraduationCap,
  Layers,
  LayoutGrid,
  Link2,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Course,
  OnlineBatchAdminPayload,
  OnlineBatchClass,
  OnlineBatchClassTheme,
  OnlineBatchCourseEntry,
  OnlineBatchPageConfig,
} from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  buildReadableCourseShareUrl,
  generateUnicodeCourseSlug,
} from '../../lib/courseSlug.ts';
import { getCourseFeatureItems } from '../../lib/courseFeatures.ts';
import {
  cloneDefaultOnlineBatchPageConfig,
  normalizeOnlineBatchPageConfig,
} from '../../lib/onlineBatchPageConfig.ts';
import { OnlineBatchPageConfigEditor } from './OnlineBatchPageConfigEditor.tsx';
import { AdminModalPortal } from './AdminModalPortal.tsx';

function formatBDT(value: number): string {
  return `৳${toBengaliNumber(Math.max(0, Math.round(Number(value) || 0)))}`;
}

interface OnlineBatchAdminManagerProps {
  cachedData?: OnlineBatchAdminPayload | null;
  onCacheUpdated?: (payload: OnlineBatchAdminPayload) => void;
  onUnauthorized: () => void;
  onDataMutated: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenPublicAcademicPage?: () => void;
}

const CLASS_THEME_OPTIONS: Array<{
  value: OnlineBatchClassTheme;
  label: string;
  pillClass: string;
}> = [
  { value: 'blue', label: 'নীল (Blue)', pillClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'teal', label: 'টিল (Teal)', pillClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'emerald', label: 'সবুজ (Emerald)', pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'purple', label: 'বেগুনি (Purple)', pillClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'orange', label: 'কমলা (Orange)', pillClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'indigo', label: 'ইন্ডিগো (Indigo)', pillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'rose', label: 'রোজ (Rose)', pillClass: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const OnlineBatchAdminManager: React.FC<OnlineBatchAdminManagerProps> = ({
  cachedData = null,
  onCacheUpdated,
  onUnauthorized,
  onDataMutated,
  onShowToast,
  onOpenPublicAcademicPage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'courses' | 'page_content' | 'class_icons'>(
    'courses'
  );
  const hasInitialCacheRef = useRef<boolean>(Boolean(cachedData));
  const [loading, setLoading] = useState<boolean>(() => !cachedData);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<OnlineBatchClass[]>(() => cachedData?.classes || []);
  const [entries, setEntries] = useState<OnlineBatchCourseEntry[]>(
    () => cachedData?.entries || []
  );
  const [availableCourses, setAvailableCourses] = useState<Course[]>(
    () => cachedData?.availableCourses || []
  );
  const [pageConfig, setPageConfig] = useState<OnlineBatchPageConfig>(() =>
    cachedData?.pageConfig
      ? normalizeOnlineBatchPageConfig(cachedData.pageConfig)
      : cloneDefaultOnlineBatchPageConfig()
  );

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reorderingClassId, setReorderingClassId] = useState<number | null>(null);

  // Shareable Link & Copy States
  const [copiedPageLink, setCopiedPageLink] = useState(false);
  const [copiedClassId, setCopiedClassId] = useState<number | null>(null);
  const [copiedCourseId, setCopiedCourseId] = useState<number | null>(null);
  const copyResetTimersRef = useRef<{
    page?: ReturnType<typeof setTimeout>;
    cls?: ReturnType<typeof setTimeout>;
    course?: ReturnType<typeof setTimeout>;
  }>({});

  // Add / Edit Course Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OnlineBatchCourseEntry | null>(null);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');
  const [modalClassId, setModalClassId] = useState<number>(0);
  const [modalCourseId, setModalCourseId] = useState<number>(0);
  const [existingCourseSearch, setExistingCourseSearch] = useState('');
  const [modalCustomBadge, setModalCustomBadge] = useState('');
  const [modalDisplayOrder, setModalDisplayOrder] = useState('');
  const [modalEntryStatus, setModalEntryStatus] = useState<'active' | 'inactive'>('active');

  // New / Edit Course Fields
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSlug, setCourseSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [courseOrigPrice, setCourseOrigPrice] = useState('0');
  const [courseDiscPrice, setCourseDiscPrice] = useState('0');
  const [courseDuration, setCourseDuration] = useState('১২ মাস');
  const [courseImageUrl, setCourseImageUrl] = useState('');
  const [courseAffiliateUrl, setCourseAffiliateUrl] = useState('');
  const [courseShortBadge, setCourseShortBadge] = useState('');
  const [courseFeaturesText, setCourseFeaturesText] = useState(
    'লাইভ ক্লাস ও রেকর্ডেড ভিডিও আর্কাইভ\nলেকচার শিট ও পিডিএফ নোট\nঅধ্যায়ভিত্তিক কুইজ ও মডেল টেস্ট'
  );
  const [courseStatus, setCourseStatus] = useState<'active' | 'closed' | 'inactive'>('active');
  const [savingModal, setSavingModal] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<OnlineBatchCourseEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Class Manager Modal
  const [showClassManager, setShowClassManager] = useState(false);
  const [editingClass, setEditingClass] = useState<OnlineBatchClass | null>(null);
  const [clsName, setClsName] = useState('');
  const [clsKey, setClsKey] = useState('');
  const [clsSectionTitle, setClsSectionTitle] = useState('');
  const [clsBadgeText, setClsBadgeText] = useState('');
  const [clsSubtitle, setClsSubtitle] = useState('');
  const [clsTheme, setClsTheme] = useState<OnlineBatchClassTheme>('blue');
  const [clsStatus, setClsStatus] = useState<'active' | 'inactive'>('active');
  const [savingClass, setSavingClass] = useState(false);

  const fetchOnlineBatchData = useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch('/api/admin/online-batches', {
          credentials: 'include',
          cache: 'no-store',
          signal: options?.signal,
        });
        if (options?.signal?.aborted) return;
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = (await res.json().catch(() => ({}))) as Partial<OnlineBatchAdminPayload> & {
          error?: string;
        };
        if (options?.signal?.aborted) return;
        if (!res.ok) {
          throw new Error(data.error || 'অনলাইন ব্যাচ ডেটা লোড করতে সমস্যা হয়েছে।');
        }
        const nextClasses = Array.isArray(data.classes) ? data.classes : [];
        const nextEntries = Array.isArray(data.entries) ? data.entries : [];
        const nextAvailable = Array.isArray(data.availableCourses) ? data.availableCourses : [];
        const nextPageConfig = data.pageConfig
          ? normalizeOnlineBatchPageConfig(data.pageConfig)
          : cloneDefaultOnlineBatchPageConfig();

        setClasses(nextClasses);
        setEntries(nextEntries);
        setAvailableCourses(nextAvailable);
        setPageConfig(nextPageConfig);

        onCacheUpdated?.({
          classes: nextClasses,
          entries: nextEntries,
          availableCourses: nextAvailable,
          categories: Array.isArray(data.categories) ? data.categories : [],
          pageConfig: nextPageConfig,
          stats: data.stats || {
            totalClasses: nextClasses.length,
            activeClasses: nextClasses.filter((c) => c.status === 'active').length,
            totalAssignments: nextEntries.length,
            activeAssignments: nextEntries.filter(
              (e) => e.status === 'active' && e.course?.status === 'active'
            ).length,
          },
        });
      } catch (err: unknown) {
        if (
          options?.signal?.aborted ||
          (err instanceof DOMException && err.name === 'AbortError')
        ) {
          return;
        }
        const message =
          err instanceof Error ? err.message : 'অনলাইন ব্যাচ ডেটা লোড করতে সমস্যা হয়েছে।';
        setError(message);
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [onUnauthorized, onCacheUpdated]
  );

  useEffect(() => {
    const timers = copyResetTimersRef.current;
    return () => {
      if (timers.page) clearTimeout(timers.page);
      if (timers.cls) clearTimeout(timers.cls);
      if (timers.course) clearTimeout(timers.course);
    };
  }, []);

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

  const handleCopyOnlineBatchPageLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const targetUrl = `${window.location.origin.replace(/\/+$/, '')}/online-batch`;
    const copied = await copyTextToClipboard(targetUrl);
    if (copied) {
      setCopiedPageLink(true);
      if (copyResetTimersRef.current.page) {
        clearTimeout(copyResetTimersRef.current.page);
      }
      copyResetTimersRef.current.page = setTimeout(() => {
        setCopiedPageLink(false);
      }, 2200);
      onShowToast('অনলাইন ব্যাচ পেজের শেয়ারযোগ্য লিংক কপি হয়েছে!', 'success');
    } else {
      onShowToast('লিংক কপি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
    }
  }, [copyTextToClipboard, onShowToast]);

  const handleCopyClassShareLink = useCallback(
    async (batchClass: OnlineBatchClass) => {
      if (typeof window === 'undefined') return;
      const origin = window.location.origin.replace(/\/+$/, '');
      const url = `${origin}/online-batch?class=${encodeURIComponent(batchClass.classKey)}`;
      const copied = await copyTextToClipboard(url);
      if (copied) {
        setCopiedClassId(batchClass.id);
        if (copyResetTimersRef.current.cls) {
          clearTimeout(copyResetTimersRef.current.cls);
        }
        copyResetTimersRef.current.cls = setTimeout(() => {
          setCopiedClassId((prev) => (prev === batchClass.id ? null : prev));
        }, 2000);
        onShowToast(`${batchClass.name} ব্যাচের শেয়ার লিংক কপি হয়েছে!`, 'success');
      } else {
        onShowToast('লিংক কপি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
      }
    },
    [copyTextToClipboard, onShowToast]
  );

  const handleCopyCourseShareLink = useCallback(
    async (course: Course) => {
      if (typeof window === 'undefined') return;
      const url = buildReadableCourseShareUrl(window.location.origin, course.slug);
      const copied = await copyTextToClipboard(url);
      if (copied) {
        setCopiedCourseId(course.id);
        if (copyResetTimersRef.current.course) {
          clearTimeout(copyResetTimersRef.current.course);
        }
        copyResetTimersRef.current.course = setTimeout(() => {
          setCopiedCourseId((prev) => (prev === course.id ? null : prev));
        }, 2000);
        onShowToast(`কোর্স শেয়ার লিংক কপি হয়েছে: ${course.title}`, 'success');
      } else {
        onShowToast('লিংক কপি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
      }
    },
    [copyTextToClipboard, onShowToast]
  );

  useEffect(() => {
    if (hasInitialCacheRef.current) {
      return;
    }
    const controller = new AbortController();
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active && !controller.signal.aborted) {
        await fetchOnlineBatchData({ signal: controller.signal });
      }
    };
    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchOnlineBatchData]);

  const sortedClasses = useMemo(
    () =>
      [...classes].sort(
        (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
      ),
    [classes]
  );

  const entriesCountByClass = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of entries) {
      map.set(entry.batchClassId, (map.get(entry.batchClassId) || 0) + 1);
    }
    return map;
  }, [entries]);

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetClasses =
      selectedClassFilter === 'all'
        ? sortedClasses
        : sortedClasses.filter((c) => c.id === selectedClassFilter);

    return targetClasses.map((cls) => {
      const classEntries = entries
        .filter((e) => e.batchClassId === cls.id)
        .filter((e) => {
          if (statusFilter !== 'all' && e.status !== statusFilter) return false;
          if (!q) return true;
          const title = (e.course?.title || '').toLowerCase();
          const slug = (e.course?.slug || '').toLowerCase();
          const badge = (e.customBadge || e.course?.shortBadge || '').toLowerCase();
          return title.includes(q) || slug.includes(q) || badge.includes(q);
        })
        .sort(
          (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
        );

      return {
        batchClass: cls,
        entries: classEntries,
      };
    });
  }, [sortedClasses, entries, selectedClassFilter, searchQuery, statusFilter]);

  // Courses not yet linked to the currently selected modal class
  const selectableExistingCourses = useMemo(() => {
    const alreadyLinkedIds = new Set(
      entries
        .filter((e) => e.batchClassId === modalClassId)
        .map((e) => e.courseId)
    );
    const q = existingCourseSearch.trim().toLowerCase();
    return availableCourses.filter((c) => {
      if (alreadyLinkedIds.has(c.id)) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.categorySlug || '').toLowerCase().includes(q)
      );
    });
  }, [availableCourses, entries, modalClassId, existingCourseSearch]);

  const openAddCourseModal = (defaultClassId?: number) => {
    const fallbackClassId =
      defaultClassId ||
      (selectedClassFilter !== 'all' ? selectedClassFilter : sortedClasses[0]?.id || 0);
    setEditingEntry(null);
    setAddMode('existing');
    setModalClassId(fallbackClassId);
    setModalCourseId(0);
    setExistingCourseSearch('');
    setModalCustomBadge('');
    setModalDisplayOrder('');
    setModalEntryStatus('active');

    setCourseTitle('');
    setCourseSlug('');
    setSlugManuallyEdited(false);
    setCourseOrigPrice('0');
    setCourseDiscPrice('0');
    setCourseDuration('১২ মাস');
    setCourseImageUrl('');
    setCourseAffiliateUrl('');
    setCourseShortBadge('');
    setCourseFeaturesText(
      'লাইভ ক্লাস ও রেকর্ডেড ভিডিও আর্কাইভ\nলেকচার শিট ও পিডিএফ নোট\nঅধ্যায়ভিত্তিক কুইজ ও মডেল টেস্ট'
    );
    setCourseStatus('active');
    setShowCourseModal(true);
  };

  const openEditCourseModal = (entry: OnlineBatchCourseEntry) => {
    const c = entry.course;
    setEditingEntry(entry);
    setModalClassId(entry.batchClassId);
    setModalCourseId(entry.courseId);
    setModalCustomBadge(entry.customBadge || '');
    setModalDisplayOrder(String(entry.displayOrder || 1));
    setModalEntryStatus(entry.status);

    setCourseTitle(c?.title || '');
    setCourseSlug(c?.slug || '');
    setSlugManuallyEdited(true);
    setCourseOrigPrice(String(c?.originalPrice ?? 0));
    setCourseDiscPrice(String(c?.discountPrice ?? 0));
    setCourseDuration(c?.duration || '');
    setCourseImageUrl(c?.imageUrl || '');
    setCourseAffiliateUrl(c?.affiliateUrl || '');
    setCourseShortBadge(c?.shortBadge || '');
    const featureList = c
      ? getCourseFeatureItems(c, { includeInactive: true }).map((item) => item.title)
      : [];
    setCourseFeaturesText(featureList.join('\n'));
    setCourseStatus(
      c?.status === 'closed' ? 'closed' : c?.status === 'inactive' ? 'inactive' : 'active'
    );
    setShowCourseModal(true);
  };

  const handleSubmitCourseModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClassId) {
      onShowToast('অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন।', 'error');
      return;
    }

    setSavingModal(true);
    try {
      if (editingEntry) {
        const featureLines = courseFeaturesText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        const courseUpdates: Record<string, unknown> = {
          title: courseTitle.trim(),
          originalPrice: Number(courseOrigPrice || 0),
          discountPrice: Number(courseDiscPrice || 0),
          duration: courseDuration.trim(),
          imageUrl: courseImageUrl.trim() || null,
          affiliateUrl: courseAffiliateUrl.trim(),
          shortBadge: courseShortBadge.trim(),
          status: courseStatus,
        };
        if (featureLines.length >= 2) {
          courseUpdates.courseFeatures = featureLines.map((t, idx) => ({
            title: t,
            sortOrder: idx + 1,
            isActive: true,
          }));
        }

        const res = await fetch(`/api/admin/online-batches/${editingEntry.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchClassId: modalClassId,
            customBadge: modalCustomBadge.trim(),
            displayOrder: modalDisplayOrder ? Number(modalDisplayOrder) : undefined,
            status: modalEntryStatus,
            courseUpdates,
          }),
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'ব্যাচ কোর্স আপডেট ব্যর্থ হয়েছে।');
        }
        onShowToast('অনলাইন ব্যাচের কোর্স সফলভাবে আপডেট হয়েছে।', 'success');
      } else if (addMode === 'existing') {
        if (!modalCourseId) {
          onShowToast('অনুগ্রহ করে একটি বিদ্যমান কোর্স নির্বাচন করুন।', 'error');
          setSavingModal(false);
          return;
        }
        const res = await fetch('/api/admin/online-batches', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'existing',
            batchClassId: modalClassId,
            courseId: modalCourseId,
            customBadge: modalCustomBadge.trim(),
            displayOrder: modalDisplayOrder ? Number(modalDisplayOrder) : undefined,
            status: modalEntryStatus,
          }),
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'ব্যাচে কোর্স যুক্ত করা যায়নি।');
        }
        onShowToast('কোর্সটি সফলভাবে অনলাইন ব্যাচে যুক্ত হয়েছে।', 'success');
      } else {
        if (!courseTitle.trim()) {
          onShowToast('নতুন কোর্সের নাম প্রদান করুন।', 'error');
          setSavingModal(false);
          return;
        }
        const featureLines = courseFeaturesText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);

        const res = await fetch('/api/admin/online-batches', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'new',
            batchClassId: modalClassId,
            customBadge: modalCustomBadge.trim(),
            displayOrder: modalDisplayOrder ? Number(modalDisplayOrder) : undefined,
            status: modalEntryStatus,
            newCourse: {
              title: courseTitle.trim(),
              slug: courseSlug.trim() || generateUnicodeCourseSlug(courseTitle),
              originalPrice: Number(courseOrigPrice || 0),
              discountPrice: Number(courseDiscPrice || 0),
              duration: courseDuration.trim(),
              imageUrl: courseImageUrl.trim() || null,
              affiliateUrl: courseAffiliateUrl.trim(),
              shortBadge: courseShortBadge.trim() || modalCustomBadge.trim(),
              features: featureLines,
              status: courseStatus,
            },
          }),
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'নতুন কোর্স তৈরি ও যুক্ত করতে সমস্যা হয়েছে।');
        }
        onShowToast('নতুন কোর্স তৈরি হয়ে অনলাইন ব্যাচে যুক্ত হয়েছে।', 'success');
      }

      setShowCourseModal(false);
      await fetchOnlineBatchData({ silent: true });
      onDataMutated();
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'সংরক্ষণ করতে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setSavingModal(false);
    }
  };

  const handleToggleEntryStatus = async (entry: OnlineBatchCourseEntry) => {
    const nextStatus = entry.status === 'active' ? 'inactive' : 'active';
    setBusyId(entry.id);
    try {
      const res = await fetch(`/api/admin/online-batches/${entry.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
      }
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: nextStatus } : e))
      );
      onDataMutated();
      onShowToast(
        nextStatus === 'active'
          ? 'ব্যাচ কোর্সটি সক্রিয় করা হয়েছে।'
          : 'ব্যাচ কোর্সটি হাইড (Inactive) করা হয়েছে।',
        'info'
      );
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।',
        'error'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveEntry = async (
    batchClassId: number,
    entryId: number,
    direction: 'up' | 'down'
  ) => {
    const classEntries = entries
      .filter((e) => e.batchClassId === batchClassId)
      .sort(
        (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
      );

    const idx = classEntries.findIndex((e) => e.id === entryId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= classEntries.length) return;

    const reordered = [...classEntries];
    const tmp = reordered[idx];
    reordered[idx] = reordered[swapIdx];
    reordered[swapIdx] = tmp;

    const orderedEntryIds = reordered.map((e) => e.id);
    setReorderingClassId(batchClassId);
    try {
      const res = await fetch('/api/admin/online-batches/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchClassId, orderedEntryIds }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'পজিশন পরিবর্তন করা যায়নি।');
      }
      await fetchOnlineBatchData({ silent: true });
      onDataMutated();
      onShowToast('কোর্সের পজিশন আপডেট হয়েছে।', 'success');
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'পজিশন পরিবর্তনে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setReorderingClassId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/online-batches/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'কোর্সটি সরানো যায়নি।');
      }
      setDeleteTarget(null);
      await fetchOnlineBatchData({ silent: true });
      onDataMutated();
      onShowToast('অনলাইন ব্যাচ থেকে কোর্সটি সরানো হয়েছে।', 'success');
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'মুছে ফেলতে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  // Class Manager Actions
  const resetClassForm = () => {
    setEditingClass(null);
    setClsName('');
    setClsKey('');
    setClsSectionTitle('');
    setClsBadgeText('');
    setClsSubtitle('');
    setClsTheme('blue');
    setClsStatus('active');
  };

  const startEditClass = (cls: OnlineBatchClass) => {
    setEditingClass(cls);
    setClsName(cls.name);
    setClsKey(cls.classKey);
    setClsSectionTitle(cls.sectionTitle);
    setClsBadgeText(cls.badgeText);
    setClsSubtitle(cls.subtitle || '');
    setClsTheme(cls.theme);
    setClsStatus(cls.status);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clsName.trim()) {
      onShowToast('শ্রেণির নাম প্রদান করুন।', 'error');
      return;
    }
    setSavingClass(true);
    try {
      const method = editingClass ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/online-batches/classes', {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingClass ? { id: editingClass.id } : {}),
          classKey: clsKey.trim() || clsName.trim(),
          name: clsName.trim(),
          sectionTitle:
            clsSectionTitle.trim() || `${clsName.trim()} অনলাইন ব্যাচ - ২০২৭`,
          badgeText: clsBadgeText.trim(),
          subtitle: clsSubtitle.trim() || null,
          theme: clsTheme,
          status: clsStatus,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'শ্রেণি সংরক্ষণ করা যায়নি।');
      }
      resetClassForm();
      await fetchOnlineBatchData({ silent: true });
      onDataMutated();
      onShowToast(
        editingClass ? 'শ্রেণির তথ্য আপডেট হয়েছে।' : 'নতুন শ্রেণি সফলভাবে যোগ হয়েছে।',
        'success'
      );
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'শ্রেণি সংরক্ষণে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setSavingClass(false);
    }
  };

  const handleMoveClass = async (clsId: number, direction: 'up' | 'down') => {
    const idx = sortedClasses.findIndex((c) => c.id === clsId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedClasses.length) return;
    const reordered = [...sortedClasses];
    const tmp = reordered[idx];
    reordered[idx] = reordered[swapIdx];
    reordered[swapIdx] = tmp;

    try {
      const res = await fetch('/api/admin/online-batches/classes', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'শ্রেণির ক্রম পরিবর্তন করা যায়নি।');
      }
      await fetchOnlineBatchData({ silent: true });
      onDataMutated();
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'শ্রেণির ক্রম পরিবর্তনে সমস্যা হয়েছে।',
        'error'
      );
    }
  };

  const handleDeleteClass = async (cls: OnlineBatchClass) => {
    try {
      const res = await fetch(`/api/admin/online-batches/classes?id=${cls.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'শ্রেণি মুছে ফেলা যায়নি।');
      }
      if (selectedClassFilter === cls.id) {
        setSelectedClassFilter('all');
      }
      await fetchOnlineBatchData({ silent: true });
      onDataMutated();
      onShowToast('শ্রেণিটি মুছে ফেলা হয়েছে।', 'success');
    } catch (err: unknown) {
      onShowToast(
        err instanceof Error ? err.message : 'শ্রেণি মুছতে সমস্যা হয়েছে।',
        'error'
      );
    }
  };

  if (loading && classes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="glass-strong rounded-3xl p-6 animate-pulse space-y-4">
          <div className="h-6 w-64 rounded-lg bg-rose-200/70" />
          <div className="h-4 w-96 max-w-full rounded bg-rose-100/80" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-rose-100/70" />
            ))}
          </div>
        </div>
        <div className="glass-strong rounded-3xl p-6 animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-rose-100/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error && classes.length === 0) {
    return (
      <div className="glass-strong rounded-3xl p-8 text-center space-y-3">
        <AlertCircle className="w-9 h-9 text-[#E22B2B] mx-auto" />
        <h2 className="text-base font-black text-[#2A0F12]">ডেটা লোড করতে সমস্যা হয়েছে</h2>
        <p className="text-xs text-[#6B4C4F] max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={() => void fetchOnlineBatchData()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>পুনরায় চেষ্টা করুন</span>
        </button>
      </div>
    );
  }

  const activeEntriesCount = entries.filter(
    (e) => e.status === 'active' && e.course?.status === 'active'
  ).length;
  const activeClassesCount = sortedClasses.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#b91c1c]">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>একাডেমিক অনলাইন ব্যাচ ২০২৭</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12] tracking-tight">
              অনলাইন ব্যাচ ম্যানেজমেন্ট
            </h1>
            <p className="text-xs text-[#6B4C4F]">
              ষষ্ঠ থেকে দশম শ্রেণি (ও প্রয়োজনীয় অতিরিক্ত শ্রেণি) ভিত্তিক অনলাইন ব্যাচের কোর্স যুক্ত, সম্পাদনা ও ক্রম নিয়ন্ত্রণ করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopyOnlineBatchPageLink()}
              title="অনলাইন ব্যাচ পেজের শেয়ারযোগ্য লিংক কপি করুন"
              aria-label="অনলাইন ব্যাচ পেজ লিংক কপি করুন"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                copiedPageLink
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50/90 hover:bg-[#eb1c24] text-[#b91c1c] hover:text-white hover:border-[#eb1c24]'
              }`}
            >
              {copiedPageLink ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            {onOpenPublicAcademicPage && (
              <button
                type="button"
                onClick={onOpenPublicAcademicPage}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-rose-200 bg-white/90 hover:bg-rose-50 text-[#b91c1c] text-xs font-bold transition cursor-pointer whitespace-nowrap"
              >
                <span>লাইভ পেজ (/online-batch)</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                resetClassForm();
                setShowClassManager(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white/90 hover:border-rose-300 text-[#2A0F12] text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-[#eb1c24] shrink-0" />
              <span>শ্রেণি ম্যানেজ ({toBengaliNumber(sortedClasses.length)})</span>
            </button>
            <button
              type="button"
              onClick={() => openAddCourseModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>কোর্স যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Online Batch Management Sections"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-rose-200/50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'courses'}
            onClick={() => setActiveSubTab('courses')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition cursor-pointer ${
              activeSubTab === 'courses'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                : 'bg-white/90 text-[#2A0F12] border-rose-200/80 hover:border-rose-300'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>ক্লাস ও কোর্স ম্যানেজমেন্ট</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'page_content'}
            onClick={() => setActiveSubTab('page_content')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition cursor-pointer ${
              activeSubTab === 'page_content'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                : 'bg-white/90 text-[#2A0F12] border-rose-200/80 hover:border-rose-300'
            }`}
          >
            <FileEdit className="w-4 h-4 shrink-0" />
            <span>পেজ কনটেন্ট ও সেকশন পজিশন</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'class_icons'}
            onClick={() => setActiveSubTab('class_icons')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition cursor-pointer ${
              activeSubTab === 'class_icons'
                ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                : 'bg-white/90 text-[#2A0F12] border-rose-200/80 hover:border-rose-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>ক্লাস আইকন পজিশন ও এডিট ({toBengaliNumber(pageConfig.classIcons.length)})</span>
          </button>
        </div>

        {/* Summary Metrics & Filters (Courses Tab Only) */}
        {activeSubTab === 'courses' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-card rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-[#6B4C4F]">মোট শ্রেণি</div>
                <div className="text-xl font-black text-[#2A0F12] mt-1 tabular-nums">
                  {toBengaliNumber(sortedClasses.length)}টি
                </div>
              </div>
              <div className="glass-card rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-[#6B4C4F]">সক্রিয় শ্রেণি</div>
                <div className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
                  {toBengaliNumber(activeClassesCount)}টি
                </div>
              </div>
              <div className="glass-card rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-[#6B4C4F]">ব্যাচে যুক্ত কোর্স</div>
                <div className="text-xl font-black text-[#2A0F12] mt-1 tabular-nums">
                  {toBengaliNumber(entries.length)}টি
                </div>
              </div>
              <div className="glass-card rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-[#6B4C4F]">লাইভ প্রদর্শিত কোর্স</div>
                <div className="text-xl font-black text-[#b91c1c] mt-1 tabular-nums">
                  {toBengaliNumber(activeEntriesCount)}টি
                </div>
              </div>
            </div>

            {/* Class Filter Tabs + Search + Status */}
            <div className="space-y-3 pt-1 border-t border-rose-200/50">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setSelectedClassFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition cursor-pointer ${
                    selectedClassFilter === 'all'
                      ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                      : 'bg-white/90 text-[#2A0F12] border-rose-200/80 hover:border-rose-300'
                  }`}
                >
                  সকল শ্রেণি ({toBengaliNumber(entries.length)})
                </button>
                {sortedClasses.map((cls) => {
                  const count = entriesCountByClass.get(cls.id) || 0;
                  const active = selectedClassFilter === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassFilter(cls.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-sm'
                          : 'bg-white/90 text-[#2A0F12] border-rose-200/80 hover:border-rose-300'
                      }`}
                    >
                      {cls.name} ({toBengaliNumber(count)})
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6B4C4F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কোর্সের নাম, স্লাগ বা ব্যাজ দিয়ে খুঁজুন..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-rose-200/80 bg-white/90 text-xs text-[#2A0F12] placeholder-[#6B4C4F]/70 focus:border-[#eb1c24] outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  aria-label="স্ট্যাটাস ফিল্টার"
                  className="px-3.5 py-2 rounded-xl border border-rose-200/80 bg-white/90 text-xs font-bold text-[#2A0F12] focus:border-[#eb1c24] outline-none cursor-pointer"
                >
                  <option value="all">সব স্ট্যাটাস</option>
                  <option value="active">শুধু সক্রিয় (Active)</option>
                  <option value="inactive">হাইড (Inactive)</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Page Content & Class Icons Editor */}
      {(activeSubTab === 'page_content' || activeSubTab === 'class_icons') && (
        <OnlineBatchPageConfigEditor
          mode={activeSubTab}
          config={pageConfig}
          onUnauthorized={onUnauthorized}
          onConfigSaved={(updated) => {
            setPageConfig(updated);
            if (cachedData) {
              onCacheUpdated?.({
                ...cachedData,
                pageConfig: updated,
              });
            } else {
              void fetchOnlineBatchData({ silent: true });
            }
          }}
          onDataMutated={onDataMutated}
          onShowToast={onShowToast}
        />
      )}

      {/* Per-Class Organized Course Lists */}
      {activeSubTab === 'courses' &&
        filteredSections.map(({ batchClass, entries: classEntries }) => {
        const themeOption =
          CLASS_THEME_OPTIONS.find((t) => t.value === batchClass.theme) || CLASS_THEME_OPTIONS[0];
        return (
          <section
            key={batchClass.id}
            className="glass-strong rounded-3xl p-4 sm:p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/50 pb-3.5">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-lg border ${themeOption.pillClass}`}
                  >
                    {batchClass.badgeText || batchClass.classKey.toUpperCase()}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-[#2A0F12] truncate">
                    {batchClass.sectionTitle || batchClass.name}
                  </h2>
                  {batchClass.status === 'inactive' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      শ্রেণি বন্ধ
                    </span>
                  )}
                </div>
                {batchClass.subtitle && (
                  <p className="text-xs text-[#6B4C4F] truncate">{batchClass.subtitle}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-[#6B4C4F] tabular-nums">
                  {toBengaliNumber(classEntries.length)}টি কোর্স
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyClassShareLink(batchClass)}
                  title={`${batchClass.name} ব্যাচের শেয়ারযোগ্য লিংক কপি করুন`}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                    copiedClassId === batchClass.id
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-white hover:bg-rose-50 text-[#b91c1c]'
                  }`}
                >
                  {copiedClassId === batchClass.id ? (
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
                <button
                  type="button"
                  onClick={() => openAddCourseModal(batchClass.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#b91c1c] border border-rose-200 text-xs font-bold transition cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>যোগ করুন</span>
                </button>
              </div>
            </div>

            {classEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-rose-200 bg-white/50 p-6 text-center space-y-2">
                <BookOpen className="w-7 h-7 text-rose-300 mx-auto" />
                <div className="text-xs font-bold text-[#2A0F12]">
                  {batchClass.name} ব্যাচে এখনো কোনো কোর্স পাওয়া যায়নি
                </div>
                <p className="text-[11px] text-[#6B4C4F]">
                  উপরের &ldquo;যোগ করুন&rdquo; বাটনে ক্লিক করে বিদ্যমান কোর্স বা নতুন কোর্স এই শ্রেণিতে যুক্ত করুন।
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {classEntries.map((entry, idx) => {
                  const course = entry.course;
                  if (!course) return null;
                  const isBusy = busyId === entry.id || reorderingClassId === batchClass.id;
                  const displayPrice = Number(course.discountPrice) || 0;
                  const origPrice = Number(course.originalPrice) || 0;

                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-white/90 bg-white/80 hover:bg-white/95 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        {/* Position & Up/Down */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0 || isBusy}
                            onClick={() => handleMoveEntry(batchClass.id, entry.id, 'up')}
                            title="উপরে তুলুন"
                            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-black text-[#b91c1c] tabular-nums">
                            #{toBengaliNumber(entry.displayOrder)}
                          </span>
                          <button
                            type="button"
                            disabled={idx === classEntries.length - 1 || isBusy}
                            onClick={() => handleMoveEntry(batchClass.id, entry.id, 'down')}
                            title="নিচে নামান"
                            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Thumbnail */}
                        <div className="relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl bg-rose-50 border border-rose-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {course.imageUrl ? (
                            <Image
                              src={course.imageUrl}
                              alt={course.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <GraduationCap className="w-5 h-5 text-rose-300" />
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-black text-[#2A0F12] truncate max-w-full">
                              {course.title}
                            </span>
                            {(entry.customBadge || course.shortBadge) && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-[#b91c1c] border border-rose-200/80">
                                {entry.customBadge || course.shortBadge}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B4C4F]">
                            <span className="font-black text-[#b91c1c] tabular-nums">
                              {displayPrice > 0 ? formatBDT(displayPrice) : 'ফ্রি'}
                            </span>
                            {origPrice > displayPrice && (
                              <span className="line-through text-slate-400 tabular-nums">
                                {formatBDT(origPrice)}
                              </span>
                            )}
                            {course.duration && <span>মেয়াদ: {course.duration}</span>}
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                              /{course.slug}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Row Action Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleEntryStatus(entry)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                            entry.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {entry.status === 'active' ? 'সক্রিয়' : 'হাইড'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleCopyCourseShareLink(course)}
                          title="শেয়ারযোগ্য কোর্স লিংক কপি করুন"
                          aria-label={`${course.title} Copy Link`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                            copiedCourseId === course.id
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50/80 hover:bg-[#eb1c24] text-[#b91c1c] hover:text-white hover:border-[#eb1c24]'
                          }`}
                        >
                          {copiedCourseId === course.id ? (
                            <>
                              <Check className="w-3 h-3 shrink-0" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 shrink-0" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`/courses/${encodeURIComponent(course.slug)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="কোর্স পেজ দেখুন"
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-[#6B4C4F] hover:text-[#b91c1c] transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => openEditCourseModal(entry)}
                          title="সম্পাদনা করুন"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>এডিট</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(entry)}
                          title="ব্যাচ থেকে সরান"
                          className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* ADD / EDIT COURSE IN ONLINE BATCH MODAL */}
      {showCourseModal && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
            <div className="min-h-full flex items-center justify-center">
              <form
                onSubmit={handleSubmitCourseModal}
                className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-white/90 shadow-2xl max-h-[90dvh] overflow-y-auto"
              >
            <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#eb1c24]" />
                <h3 className="text-base font-black text-[#2A0F12]">
                  {editingEntry
                    ? 'ব্যাচ কোর্স সম্পাদনা করুন'
                    : 'অনলাইন ব্যাচে কোর্স যুক্ত করুন'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseModal(false)}
                className="p-1.5 rounded-xl text-[#6B4C4F] hover:text-[#eb1c24] hover:bg-rose-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingEntry && (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-rose-50/70 border border-rose-100">
                <button
                  type="button"
                  onClick={() => setAddMode('existing')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    addMode === 'existing'
                      ? 'bg-white text-[#b91c1c] shadow-sm border border-rose-200'
                      : 'text-[#6B4C4F] hover:text-[#2A0F12]'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>বিদ্যমান কোর্স বেছে নিন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('new')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    addMode === 'new'
                      ? 'bg-white text-[#b91c1c] shadow-sm border border-rose-200'
                      : 'text-[#6B4C4F] hover:text-[#2A0F12]'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>নতুন কোর্স তৈরি করুন</span>
                </button>
              </div>
            )}

            {/* Batch Class Assignment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  শ্রেণি নির্বাচন করুন *
                </label>
                <select
                  value={modalClassId}
                  onChange={(e) => setModalClassId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                >
                  {sortedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  পজিশন / ক্রম (Position)
                </label>
                <input
                  type="number"
                  min={1}
                  value={modalDisplayOrder}
                  onChange={(e) => setModalDisplayOrder(e.target.value)}
                  placeholder="স্বয়ংক্রিয়"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  ব্যাচে প্রদর্শন অবস্থা
                </label>
                <select
                  value={modalEntryStatus}
                  onChange={(e) =>
                    setModalEntryStatus(e.target.value === 'inactive' ? 'inactive' : 'active')
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                >
                  <option value="active">সক্রিয় (Visible)</option>
                  <option value="inactive">হাইড (Hidden)</option>
                </select>
              </div>
            </div>

            {!editingEntry && addMode === 'existing' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                    কোর্স খুঁজুন ও নির্বাচন করুন *
                  </label>
                  <input
                    type="text"
                    value={existingCourseSearch}
                    onChange={(e) => setExistingCourseSearch(e.target.value)}
                    placeholder="কোর্সের নাম লিখে খুঁজুন..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none mb-2"
                  />
                  <div className="max-h-56 overflow-y-auto rounded-2xl border border-rose-100 divide-y divide-rose-50 bg-rose-50/20">
                    {selectableExistingCourses.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#6B4C4F]">
                        এই শ্রেণিতে যুক্ত করার মতো কোনো কোর্স পাওয়া যায়নি।
                      </div>
                    ) : (
                      selectableExistingCourses.slice(0, 60).map((c) => {
                        const isSelected = modalCourseId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setModalCourseId(c.id)}
                            className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                              isSelected
                                ? 'bg-rose-100/80 text-[#b91c1c] font-bold'
                                : 'hover:bg-white text-[#2A0F12]'
                            }`}
                          >
                            <span className="truncate font-bold">{c.title}</span>
                            <span className="shrink-0 text-[11px] font-extrabold text-[#b91c1c] tabular-nums">
                              {c.discountPrice > 0 ? formatBDT(c.discountPrice) : 'ফ্রি'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                    কাস্টম ব্যাজ (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={modalCustomBadge}
                    onChange={(e) => setModalCustomBadge(e.target.value)}
                    placeholder="যেমন: ২০২৭ ব্যাচ / ফুল ইয়ার"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t border-rose-100 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      কোর্সের নাম *
                    </label>
                    <input
                      type="text"
                      value={courseTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCourseTitle(val);
                        if (!editingEntry && !slugManuallyEdited) {
                          setCourseSlug(generateUnicodeCourseSlug(val));
                        }
                      }}
                      required
                      placeholder="যেমন: ৬ষ্ঠ শ্রেণি অনলাইন ব্যাচ - ২০২৭"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                    />
                  </div>

                  {!editingEntry ? (
                    <div>
                      <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                        URL স্লাগ *
                      </label>
                      <input
                        type="text"
                        value={courseSlug}
                        onChange={(e) => {
                          setCourseSlug(e.target.value);
                          setSlugManuallyEdited(true);
                        }}
                        required
                        placeholder="class-6-online-batch-2027"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                        কাস্টম ব্যাজ (ঐচ্ছিক)
                      </label>
                      <input
                        type="text"
                        value={modalCustomBadge}
                        onChange={(e) => setModalCustomBadge(e.target.value)}
                        placeholder="যেমন: ২০২৭ স্পেশাল"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      পূর্বের মূল্য (৳)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={courseOrigPrice}
                      onChange={(e) => setCourseOrigPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      অফার মূল্য (৳) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={courseDiscPrice}
                      onChange={(e) => setCourseDiscPrice(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      মেয়াদ (Duration)
                    </label>
                    <input
                      type="text"
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                      placeholder="১২ মাস"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      কোর্স স্ট্যাটাস
                    </label>
                    <select
                      value={courseStatus}
                      onChange={(e) =>
                        setCourseStatus(e.target.value as 'active' | 'closed' | 'inactive')
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                    >
                      <option value="active">সক্রিয় (Active)</option>
                      <option value="closed">ভর্তি বন্ধ (Closed)</option>
                      <option value="inactive">ইনঅ্যাক্টিভ (Hidden)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      থাম্বনেইল ইমেজ লিংক (https:// বা /images/...)
                    </label>
                    <input
                      type="text"
                      value={courseImageUrl}
                      onChange={(e) => setCourseImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      ভর্তি / অ্যাফিলিয়েট লিংক (https://...)
                    </label>
                    <input
                      type="url"
                      value={courseAffiliateUrl}
                      onChange={(e) => setCourseAffiliateUrl(e.target.value)}
                      placeholder="https://10minuteschool.com/..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                    কোর্সের মূল ফিচারসমূহ (প্রতি লাইনে ১টি করে, কমপক্ষে ২টি)
                  </label>
                  <textarea
                    rows={3}
                    value={courseFeaturesText}
                    onChange={(e) => setCourseFeaturesText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rose-100">
              <button
                type="button"
                onClick={() => setShowCourseModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:bg-rose-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={savingModal}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
              >
                {savingModal
                  ? 'সংরক্ষণ হচ্ছে...'
                  : editingEntry
                  ? 'আপডেট করুন'
                  : 'ব্যাচে যুক্ত করুন'}
              </button>
            </div>
              </form>
            </div>
          </div>
        </AdminModalPortal>
      )}

      {/* DELETE ENTRY CONFIRMATION MODAL */}
      {deleteTarget && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-6 space-y-4 border border-white/90 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-[#2A0F12]">
                  অনলাইন ব্যাচ থেকে সরাতে চান?
                </h3>
                <p className="text-xs text-[#6B4C4F]">
                  <strong>&ldquo;{deleteTarget.course?.title}&rdquo;</strong> কোর্সটি এই শ্রেণির অনলাইন ব্যাচ তালিকা থেকে সরিয়ে ফেলা হবে।
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:bg-rose-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {deleting ? 'সরানো হচ্ছে...' : 'সরিয়ে ফেলুন'}
                </button>
              </div>
            </div>
          </div>
        </AdminModalPortal>
      )}

      {/* MANAGE ONLINE BATCH CLASSES MODAL */}
      {showClassManager && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
            <div className="min-h-full flex items-center justify-center">
              <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-5 border border-white/90 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#eb1c24]" />
                <h3 className="text-base font-black text-[#2A0F12]">
                  অনলাইন ব্যাচের শ্রেণি পরিচালনা
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClassManager(false)}
                className="p-1.5 rounded-xl text-[#6B4C4F] hover:text-[#eb1c24] hover:bg-rose-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Classes List */}
            <div className="space-y-2">
              {sortedClasses.map((cls, idx) => {
                const count = entriesCountByClass.get(cls.id) || 0;
                return (
                  <div
                    key={cls.id}
                    className="rounded-2xl border border-rose-100 bg-rose-50/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveClass(cls.id, 'up')}
                          className="p-0.5 rounded border border-slate-200 bg-white disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sortedClasses.length - 1}
                          onClick={() => handleMoveClass(cls.id, 'down')}
                          className="p-0.5 rounded border border-slate-200 bg-white disabled:opacity-35 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#2A0F12] truncate">
                            {cls.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-rose-200 text-[#b91c1c]">
                            {cls.badgeText || cls.classKey}
                          </span>
                          {cls.status === 'inactive' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                              বন্ধ
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6B4C4F] truncate">
                          {cls.sectionTitle} · {toBengaliNumber(count)}টি কোর্স
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => startEditClass(cls)}
                        className="px-2.5 py-1 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-[11px] font-bold cursor-pointer"
                      >
                        এডিট
                      </button>
                      {count === 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls)}
                          className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 cursor-pointer"
                          title="শ্রেণি মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add / Edit Class Form */}
            <form
              onSubmit={handleSaveClass}
              className="rounded-2xl border border-rose-200/80 bg-white p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#2A0F12] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#eb1c24]" />
                  <span>{editingClass ? `"${editingClass.name}" সম্পাদনা` : 'নতুন শ্রেণি যোগ করুন'}</span>
                </h4>
                {editingClass && (
                  <button
                    type="button"
                    onClick={resetClassForm}
                    className="text-[11px] font-bold text-[#b91c1c] hover:underline cursor-pointer"
                  >
                    নতুন শ্রেণি যোগ করুন
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                    শ্রেণির নাম *
                  </label>
                  <input
                    type="text"
                    value={clsName}
                    onChange={(e) => setClsName(e.target.value)}
                    required
                    placeholder="যেমন: একাদশ শ্রেণি (HSC-28)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] outline-none focus:border-[#eb1c24]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                    সেকশন শিরোনাম
                  </label>
                  <input
                    type="text"
                    value={clsSectionTitle}
                    onChange={(e) => setClsSectionTitle(e.target.value)}
                    placeholder="যেমন: একাদশ শ্রেণি অনলাইন ব্যাচ - ২০২৭"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] outline-none focus:border-[#eb1c24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {!editingClass && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                      Class Key
                    </label>
                    <input
                      type="text"
                      value={clsKey}
                      onChange={(e) => setClsKey(e.target.value)}
                      placeholder="hsc-28"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-[#2A0F12] outline-none focus:border-[#eb1c24]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                    ব্যাজ টেক্সট
                  </label>
                  <input
                    type="text"
                    value={clsBadgeText}
                    onChange={(e) => setClsBadgeText(e.target.value)}
                    placeholder="CLASS 6 / SSC 29"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] outline-none focus:border-[#eb1c24]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                    থিম কালার
                  </label>
                  <select
                    value={clsTheme}
                    onChange={(e) => setClsTheme(e.target.value as OnlineBatchClassTheme)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] outline-none focus:border-[#eb1c24]"
                  >
                    {CLASS_THEME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                    স্ট্যাটাস
                  </label>
                  <select
                    value={clsStatus}
                    onChange={(e) =>
                      setClsStatus(e.target.value === 'inactive' ? 'inactive' : 'active')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] outline-none focus:border-[#eb1c24]"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">বন্ধ (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2A0F12] mb-1">
                  সংক্ষিপ্ত সাবটাইটেল
                </label>
                <input
                  type="text"
                  value={clsSubtitle}
                  onChange={(e) => setClsSubtitle(e.target.value)}
                  placeholder="এই শ্রেণির কোর্সগুলোর সংক্ষিপ্ত বিবরণ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2A0F12] outline-none focus:border-[#eb1c24]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingClass}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {savingClass
                    ? 'সংরক্ষণ হচ্ছে...'
                    : editingClass
                    ? 'শ্রেণি আপডেট করুন'
                    : 'শ্রেণি যোগ করুন'}
                </button>
              </div>
            </form>
              </div>
            </div>
          </div>
        </AdminModalPortal>
      )}
    </div>
  );
};
