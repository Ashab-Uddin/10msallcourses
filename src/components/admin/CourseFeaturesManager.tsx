'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Edit2,
  Eye,
  EyeOff,
  ListChecks,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { CourseFeatureIconKey, CourseFeatureItem } from '../../types.ts';
import {
  buildDefaultCourseFeatureDrafts,
  CARD_VISIBLE_COURSE_FEATURES,
  COURSE_FEATURE_ICON_OPTIONS,
  inferCourseFeatureIcon,
  MAX_COURSE_FEATURE_TITLE_LENGTH,
  MAX_COURSE_FEATURES_PER_COURSE,
  MIN_ACTIVE_COURSE_FEATURES,
  sortCourseFeatures,
} from '../../lib/courseFeatures.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { CourseFeatureIcon } from '../public/CourseFeatureIcon.tsx';

interface ControlledProps {
  mode: 'controlled';
  items: CourseFeatureItem[];
  onChange: (nextItems: CourseFeatureItem[]) => void;
  courseId?: number;
  courseTitle?: string;
}

interface ApiModeProps {
  mode: 'api';
  courseId: number;
  courseTitle: string;
  initialItems?: CourseFeatureItem[];
  onSaved?: (nextItems: CourseFeatureItem[]) => void;
  onUnauthorized?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export type CourseFeaturesManagerProps = ControlledProps | ApiModeProps;

export const CourseFeaturesManager: React.FC<CourseFeaturesManagerProps> = (props) => {
  const isApiMode = props.mode === 'api';
  const controlledItems = props.mode === 'controlled' ? props.items : undefined;
  const controlledOnChange = props.mode === 'controlled' ? props.onChange : undefined;

  const apiCourseId = props.mode === 'api' ? props.courseId : undefined;
  const apiInitialItems = props.mode === 'api' ? props.initialItems : undefined;
  const apiOnSaved = props.mode === 'api' ? props.onSaved : undefined;
  const apiOnUnauthorized = props.mode === 'api' ? props.onUnauthorized : undefined;
  const apiOnShowToast = props.mode === 'api' ? props.onShowToast : undefined;

  const [apiItems, setApiItems] = useState<CourseFeatureItem[]>(() =>
    sortCourseFeatures(apiInitialItems || [])
  );
  const [loadingApi, setLoadingApi] = useState<boolean>(isApiMode);
  const [busyId, setBusyId] = useState<number | 'add' | 'bulk' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Add form state
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState<CourseFeatureIconKey>('tag');
  const [iconManuallyPicked, setIconManuallyPicked] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState<CourseFeatureIconKey>('check');

  const items = useMemo(
    () => sortCourseFeatures(isApiMode ? apiItems : controlledItems || []),
    [isApiMode, apiItems, controlledItems]
  );

  // Sync API mode fetch on mount / courseId change
  const loadApiFeatures = useCallback(async () => {
    if (!isApiMode || !apiCourseId) return;
    setLoadingApi(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'ফিচার তালিকা লোড করা সম্ভব হয়নি।');
      }
      const data = await res.json();
      if (Array.isArray(data.features)) {
        const sorted = sortCourseFeatures(data.features);
        setApiItems(sorted);
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'ফিচার লোড ব্যর্থ হয়েছে।');
    } finally {
      setLoadingApi(false);
    }
  }, [isApiMode, apiCourseId, apiOnUnauthorized]);

  useEffect(() => {
    if (!isApiMode) return;
    let cancelled = false;
    const init = async () => {
      await Promise.resolve();
      if (!cancelled) {
        await loadApiFeatures();
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [isApiMode, loadApiFeatures]);

  const activeItems = useMemo(() => items.filter((item) => item.isActive), [items]);
  const activeRankMap = useMemo(() => {
    const map = new Map<number, number>();
    let rank = 1;
    for (const item of items) {
      if (item.isActive) {
        map.set(item.id, rank);
        rank += 1;
      }
    }
    return map;
  }, [items]);

  const commitControlled = (next: CourseFeatureItem[]) => {
    if (controlledOnChange) {
      controlledOnChange(sortCourseFeatures(next));
    }
  };

  const handleNewTitleChange = (val: string) => {
    setNewTitle(val);
    if (!iconManuallyPicked) {
      setNewIcon(inferCourseFeatureIcon(val, items.length));
    }
  };

  const handleAddFeature = async () => {
    const trimmed = newTitle.trim().slice(0, MAX_COURSE_FEATURE_TITLE_LENGTH);
    if (!trimmed) {
      setLocalError('ফিচারের শিরোনাম লিখুন।');
      return;
    }
    if (items.length >= MAX_COURSE_FEATURES_PER_COURSE) {
      setLocalError(`একটি কোর্সে সর্বোচ্চ ${toBengaliNumber(MAX_COURSE_FEATURES_PER_COURSE)}টি ফিচার যোগ করা যাবে।`);
      return;
    }

    setLocalError(null);

    if (!isApiMode) {
      const nextId =
        items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
      const nextItems = [
        ...items,
        {
          id: nextId,
          courseId: props.courseId || 0,
          title: trimmed,
          icon: newIcon,
          sortOrder: items.length + 1,
          isActive: true,
        },
      ];
      commitControlled(nextItems);
      setNewTitle('');
      setIconManuallyPicked(false);
      setNewIcon(inferCourseFeatureIcon('', nextItems.length));
      return;
    }

    if (!apiCourseId) return;
    setBusyId('add');
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          icon: newIcon,
          isActive: true,
        }),
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ফিচার যোগ করা সম্ভব হয়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      apiOnShowToast?.('নতুন কোর্স ফিচার যুক্ত হয়েছে।', 'success');
      setNewTitle('');
      setIconManuallyPicked(false);
      setNewIcon(inferCourseFeatureIcon('', nextList.length));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ফিচার যোগ ব্যর্থ হয়েছে।';
      setLocalError(msg);
      apiOnShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleLoadDefaults = async () => {
    const defaults = buildDefaultCourseFeatureDrafts().map((d, idx) => ({
      ...d,
      courseId: apiCourseId || props.courseId || 0,
      id: idx + 1,
    }));

    setLocalError(null);
    if (!isApiMode) {
      commitControlled(defaults);
      return;
    }

    if (!apiCourseId) return;
    setBusyId('bulk');
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: defaults }),
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ডিফল্ট ফিচার যুক্ত করা যায়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      apiOnShowToast?.('৪টি ডিফল্ট ফিচার যুক্ত হয়েছে।', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ডিফল্ট ফিচার যোগ ব্যর্থ হয়েছে।';
      setLocalError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (item: CourseFeatureItem) => {
    const nextActive = !item.isActive;
    setLocalError(null);

    if (!isApiMode) {
      commitControlled(
        items.map((f) => (f.id === item.id ? { ...f, isActive: nextActive } : f))
      );
      return;
    }

    if (!apiCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'স্ট্যাটাস আপডেট করা সম্ভব হয়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      apiOnShowToast?.(
        nextActive ? 'ফিচারটি ওয়েবসাইটে চালু করা হয়েছে।' : 'ফিচারটি ওয়েবসাইট থেকে লুকানো হয়েছে।',
        'info'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আপডেট ব্যর্থ হয়েছে।';
      setLocalError(msg);
      apiOnShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleChangeIcon = async (item: CourseFeatureItem, nextIcon: CourseFeatureIconKey) => {
    if (item.icon === nextIcon) return;
    setLocalError(null);

    if (!isApiMode) {
      commitControlled(
        items.map((f) => (f.id === item.id ? { ...f, icon: nextIcon } : f))
      );
      return;
    }

    if (!apiCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: nextIcon }),
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'আইকন পরিবর্তন করা যায়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'আইকন পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setBusyId(null);
    }
  };

  const handleStartEdit = (item: CourseFeatureItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditIcon(item.icon);
    setLocalError(null);
  };

  const handleSaveEdit = async (item: CourseFeatureItem) => {
    const trimmed = editTitle.trim().slice(0, MAX_COURSE_FEATURE_TITLE_LENGTH);
    if (!trimmed) {
      setLocalError('ফিচারের শিরোনাম খালি রাখা যাবে না।');
      return;
    }

    setLocalError(null);

    if (!isApiMode) {
      commitControlled(
        items.map((f) =>
          f.id === item.id ? { ...f, title: trimmed, icon: editIcon } : f
        )
      );
      setEditingId(null);
      return;
    }

    if (!apiCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, icon: editIcon }),
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ফিচার আপডেট করা যায়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      apiOnShowToast?.('ফিচার আপডেট করা হয়েছে।', 'success');
      setEditingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আপডেট ব্যর্থ হয়েছে।';
      setLocalError(msg);
      apiOnShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const normalizedOrder = reordered.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setLocalError(null);

    if (!isApiMode) {
      commitControlled(normalizedOrder);
      return;
    }

    if (!apiCourseId) return;
    setApiItems(normalizedOrder);
    setBusyId(moved.id);
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: normalizedOrder.map((f) => f.id) }),
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ক্রম পরিবর্তন সংরক্ষণ করা যায়নি।');
      }
      const nextList = sortCourseFeatures(data.features || normalizedOrder);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'ক্রম পরিবর্তন ব্যর্থ হয়েছে।');
      void loadApiFeatures();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: CourseFeatureItem) => {
    setLocalError(null);

    if (!isApiMode) {
      commitControlled(items.filter((f) => f.id !== item.id));
      if (editingId === item.id) setEditingId(null);
      return;
    }

    if (!apiCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${apiCourseId}/features/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        apiOnUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ফিচার মুছে ফেলা সম্ভব হয়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      apiOnShowToast?.('ফিচার মুছে ফেলা হয়েছে।', 'info');
      if (editingId === item.id) setEditingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মুছে ফেলা ব্যর্থ হয়েছে।';
      setLocalError(msg);
      apiOnShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const missingMinimum = Math.max(0, MIN_ACTIVE_COURSE_FEATURES - activeItems.length);

  return (
    <div className="space-y-3.5">
      {/* Header & Live Count Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#2A0F12]">
            <ListChecks className="w-4 h-4 text-[#eb1c24]" />
            <span>এই কোর্সে যা যা থাকছে (Dynamic Features)</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-extrabold tabular-nums">
          <span
            className={`px-2.5 py-0.5 rounded-full border ${
              missingMinimum === 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            সক্রিয়: {toBengaliNumber(activeItems.length)} / ন্যূনতম{' '}
            {toBengaliNumber(MIN_ACTIVE_COURSE_FEATURES)}টি
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#b91c1c] border border-rose-200">
            মোট: {toBengaliNumber(items.length)}টি
          </span>
        </div>
      </div>

      <p className="text-[11px] text-[#6B4C4F] leading-relaxed">
        সক্রিয় (Published) তালিকার প্রথম{' '}
        <strong>{toBengaliNumber(CARD_VISIBLE_COURSE_FEATURES)}টি</strong> ফিচার মেইন
        কোর্স কার্ডে প্রদর্শিত হবে এবং <strong>Show More</strong> বাটনে ক্লিক করলে সকল
        সক্রিয় ফিচার ও কোর্সের বিস্তারিত দেখা যাবে।
      </p>

      {/* Minimum Active Feature Notice */}
      {missingMinimum > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              পাবলিক কার্ডের জন্য ন্যূনতম {toBengaliNumber(MIN_ACTIVE_COURSE_FEATURES)}টি
              সক্রিয় ফিচার প্রয়োজন (আরও {toBengaliNumber(missingMinimum)}টি সক্রিয় করুন)।
            </span>
          </span>
          {items.length === 0 && (
            <button
              type="button"
              onClick={() => void handleLoadDefaults()}
              disabled={busyId !== null}
              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-[10.5px] font-extrabold shrink-0 cursor-pointer"
            >
              ডিফল্ট ৪টি যোগ করুন
            </button>
          )}
        </div>
      )}

      {localError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Add New Feature Input Row */}
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/35 p-3 space-y-2.5">
        <div className="text-[11px] font-extrabold text-[#2A0F12] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#eb1c24]" />
          <span>নতুন ফিচার যুক্ত করুন</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#b91c1c] shadow-2xs">
              <CourseFeatureIcon icon={newIcon} className="w-4 h-4" />
            </span>
            <select
              value={newIcon}
              onChange={(e) => {
                setNewIcon(e.target.value as CourseFeatureIconKey);
                setIconManuallyPicked(true);
              }}
              aria-label="নতুন ফিচারের আইকন নির্বাচন করুন"
              className="px-2.5 py-2 rounded-xl border border-slate-200/90 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none cursor-pointer shadow-2xs"
            >
              {COURSE_FEATURE_ICON_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => handleNewTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAddFeature();
              }
            }}
            maxLength={MAX_COURSE_FEATURE_TITLE_LENGTH}
            placeholder="যেমন: SSC'26 কোর্সে ভর্তি থাকলে ফি ৳৭৩৬০ অথবা ডেইলি ও মান্থলি এক্সাম"
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
          />

          <button
            type="button"
            onClick={() => void handleAddFeature()}
            disabled={busyId === 'add'}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-sm transition cursor-pointer shrink-0 disabled:opacity-60"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{busyId === 'add' ? 'যোগ হচ্ছে...' : 'যোগ করুন'}</span>
          </button>
        </div>
      </div>

      {/* Feature List */}
      {loadingApi ? (
        <div className="py-8 text-center text-xs font-bold text-[#6B4C4F] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#eb1c24] animate-spin" />
          <span>ফিচার তালিকা লোড হচ্ছে...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-white/70 p-6 text-center space-y-2">
          <p className="text-xs font-bold text-[#2A0F12]">কোনো ফিচার এখনো যুক্ত করা হয়নি</p>
          <p className="text-[11px] text-[#6B4C4F]">
            উপরের ফর্ম থেকে একটি করে ফিচার যোগ করুন অথবা ডিফল্ট ৪টি ফিচার যুক্ত করে এডিট করুন।
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const activeRank = activeRankMap.get(item.id);
            const isEditingRow = editingId === item.id;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-3 transition ${
                  item.isActive
                    ? 'bg-white border-rose-200/80 shadow-2xs'
                    : 'bg-slate-50/90 border-slate-200 opacity-85'
                }`}
              >
                {isEditingRow ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-[#b91c1c]">
                        <CourseFeatureIcon icon={editIcon} className="w-4 h-4" />
                      </span>
                      <select
                        value={editIcon}
                        onChange={(e) =>
                          setEditIcon(e.target.value as CourseFeatureIconKey)
                        }
                        aria-label="ফিচার আইকন"
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white outline-none cursor-pointer"
                      >
                        {COURSE_FEATURE_ICON_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSaveEdit(item);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      maxLength={MAX_COURSE_FEATURE_TITLE_LENGTH}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none font-medium"
                      autoFocus
                    />

                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(item)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>সেভ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>বাতিল</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Left: Order + Icon + Title + Placement Badge */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-[#b91c1c] text-[10.5px] font-black tabular-nums shrink-0 mt-0.5">
                        #{toBengaliNumber(idx + 1)}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[#4A2C2F]"
                          title="ফিচার আইকন"
                        >
                          <CourseFeatureIcon icon={item.icon} className="w-3.5 h-3.5" />
                        </span>
                        <select
                          value={item.icon}
                          onChange={(e) =>
                            void handleChangeIcon(
                              item,
                              e.target.value as CourseFeatureIconKey
                            )
                          }
                          disabled={isBusy}
                          aria-label={`${item.title} আইকন পরিবর্তন`}
                          className="px-1.5 py-1 rounded-lg border border-slate-200 text-[10.5px] font-bold text-[#4A2C2F] bg-white cursor-pointer outline-none max-w-[96px]"
                        >
                          {COURSE_FEATURE_ICON_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-bold leading-snug break-words ${
                            item.isActive
                              ? 'text-[#2A0F12]'
                              : 'text-slate-500 line-through'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {!item.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-extrabold">
                              লুকানো (Hidden)
                            </span>
                          ) : activeRank && activeRank <= CARD_VISIBLE_COURSE_FEATURES ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold">
                              কার্ডে দৃশ্যমান (#{toBengaliNumber(activeRank)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-extrabold">
                              Show More-এ দৃশ্যমান
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Sort + Toggle + Edit + Delete Controls */}
                    <div className="flex items-center justify-end gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleMove(idx, 'up')}
                        disabled={idx === 0 || isBusy}
                        title="উপরে নিন"
                        aria-label="উপরে নিন"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-[#b91c1c] transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleMove(idx, 'down')}
                        disabled={idx === items.length - 1 || isBusy}
                        title="নিচে নিন"
                        aria-label="নিচে নিন"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-[#b91c1c] transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleActive(item)}
                        disabled={isBusy}
                        title={
                          item.isActive
                            ? 'ওয়েবসাইট থেকে লুকান'
                            : 'ওয়েবসাইটে চালু করুন'
                        }
                        className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10.5px] font-extrabold transition cursor-pointer disabled:opacity-50 ${
                          item.isActive
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>চালু</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>লুকানো</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        disabled={isBusy}
                        title="এডিট করুন"
                        aria-label="এডিট করুন"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-blue-600 transition cursor-pointer disabled:opacity-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={isBusy}
                        title="মুছে ফেলুন"
                        aria-label="মুছে ফেলুন"
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-[#eb1c24] text-[#b91c1c] hover:text-white transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
