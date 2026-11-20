'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  CheckSquare,
  CopyPlus,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  ListChecks,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type { Category, Course, CourseFeatureIconKey, CourseFeatureItem } from '../../types.ts';
import {
  CARD_VISIBLE_COURSE_FEATURES,
  COURSE_FEATURE_ICON_OPTIONS,
  hasDuplicateFeatureTitle,
  inferCourseFeatureIcon,
  MAX_COURSE_FEATURE_TITLE_LENGTH,
  MAX_COURSE_FEATURES_PER_COURSE,
  MIN_ACTIVE_COURSE_FEATURES,
  normalizeFeatureTitleForComparison,
  sortCourseFeatures,
} from '../../lib/courseFeatures.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import { CourseFeatureIcon } from '../public/CourseFeatureIcon.tsx';

interface CommonProps {
  existingCourses?: Course[];
  categories?: Category[];
  onUnauthorized?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface ControlledProps extends CommonProps {
  mode: 'controlled';
  items: CourseFeatureItem[];
  onChange: (nextItems: CourseFeatureItem[]) => void;
  courseId?: number;
  courseTitle?: string;
}

interface ApiModeProps extends CommonProps {
  mode: 'api';
  courseId: number;
  courseTitle: string;
  initialItems?: CourseFeatureItem[];
  onSaved?: (nextItems: CourseFeatureItem[]) => void;
}

export type CourseFeaturesManagerProps = ControlledProps | ApiModeProps;

export const CourseFeaturesManager: React.FC<CourseFeaturesManagerProps> = (props) => {
  const isApiMode = props.mode === 'api';
  const controlledItems = props.mode === 'controlled' ? props.items : undefined;
  const controlledOnChange = props.mode === 'controlled' ? props.onChange : undefined;

  const targetCourseId = props.courseId;
  const apiInitialItems = props.mode === 'api' ? props.initialItems : undefined;
  const apiOnSaved = props.mode === 'api' ? props.onSaved : undefined;
  const onUnauthorized = props.onUnauthorized;
  const onShowToast = props.onShowToast;
  const propCourses = props.existingCourses;
  const propCategories = props.categories;

  const [apiItems, setApiItems] = useState<CourseFeatureItem[]>(() =>
    sortCourseFeatures(apiInitialItems || [])
  );
  const [loadingApi, setLoadingApi] = useState<boolean>(isApiMode);
  const [busyId, setBusyId] = useState<number | 'add' | 'bulk' | 'import' | 'reorder' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // Add form state
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState<CourseFeatureIconKey>('tag');
  const [iconManuallyPicked, setIconManuallyPicked] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState<CourseFeatureIconKey>('check');

  // Drag & Drop state
  const [draggedFeatureId, setDraggedFeatureId] = useState<number | null>(null);
  const [dragOverFeatureId, setDragOverFeatureId] = useState<number | null>(null);

  // Course-to-Course Feature Import state
  const [fetchedCourses, setFetchedCourses] = useState<Course[]>([]);
  const [loadingCoursesList, setLoadingCoursesList] = useState(false);
  const [selectedSourceCourseId, setSelectedSourceCourseId] = useState<string>('');
  const [sourceFeatures, setSourceFeatures] = useState<CourseFeatureItem[]>([]);
  const [loadingSourceFeatures, setLoadingSourceFeatures] = useState(false);
  const [sourceLoadError, setSourceLoadError] = useState<string | null>(null);
  const [selectedImportIds, setSelectedImportIds] = useState<number[]>([]);

  const items = useMemo(
    () => sortCourseFeatures(isApiMode ? apiItems : controlledItems || []),
    [isApiMode, apiItems, controlledItems]
  );

  // Category name lookup map
  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of propCategories || []) {
      map.set(cat.slug, cat.name);
    }
    return map;
  }, [propCategories]);

  // Load existing courses list from API if not supplied via props
  useEffect(() => {
    if (Array.isArray(propCourses) && propCourses.length > 0) return;
    let cancelled = false;
    const fetchAllCourses = async () => {
      setLoadingCoursesList(true);
      try {
        const res = await fetch('/api/admin/courses', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.status === 401) {
          onUnauthorized?.();
          return;
        }
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        if (!cancelled && Array.isArray(data)) {
          setFetchedCourses(data);
        }
      } catch {
        // Ignore silent background load error; user can still manage features manually
      } finally {
        if (!cancelled) {
          setLoadingCoursesList(false);
        }
      }
    };
    void fetchAllCourses();
    return () => {
      cancelled = true;
    };
  }, [propCourses, onUnauthorized]);

  const availableSourceCourses = useMemo(() => {
    const base =
      Array.isArray(propCourses) && propCourses.length > 0 ? propCourses : fetchedCourses;
    return base.filter((c) => !targetCourseId || c.id !== targetCourseId);
  }, [propCourses, fetchedCourses, targetCourseId]);

  // Fetch target course features in API mode
  const loadApiFeatures = useCallback(async () => {
    if (!isApiMode || !targetCourseId) return;
    setLoadingApi(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        onUnauthorized?.();
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
  }, [isApiMode, targetCourseId, onUnauthorized]);

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

  // Automatically load features whenever admin selects a Source Course from the dropdown
  const handleSelectSourceCourse = async (courseIdStr: string) => {
    setSelectedSourceCourseId(courseIdStr);
    setSelectedImportIds([]);
    setSourceLoadError(null);
    setLocalSuccess(null);

    const sourceId = Number(courseIdStr);
    if (!sourceId || !Number.isInteger(sourceId) || sourceId <= 0) {
      setSourceFeatures([]);
      return;
    }

    setLoadingSourceFeatures(true);
    try {
      const res = await fetch(`/api/admin/courses/${sourceId}/features`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'নির্বাচিত কোর্সের ফিচার লোড করা যায়নি।');
      }
      const loaded = sortCourseFeatures(Array.isArray(data.features) ? data.features : []);
      setSourceFeatures(loaded);
    } catch (err: unknown) {
      setSourceFeatures([]);
      setSourceLoadError(
        err instanceof Error ? err.message : 'কোর্সের ফিচার লোড করতে সমস্যা হয়েছে।'
      );
    } finally {
      setLoadingSourceFeatures(false);
    }
  };

  // Existing normalized target feature titles (for duplicate prevention in UI)
  const existingTargetTitleSet = useMemo(
    () => new Set(items.map((f) => normalizeFeatureTitleForComparison(f.title))),
    [items]
  );

  // Selectable (non-duplicate) source features
  const selectableSourceFeatures = useMemo(
    () =>
      sourceFeatures.filter((f) => {
        const norm = normalizeFeatureTitleForComparison(f.title);
        return norm.length > 0 && !existingTargetTitleSet.has(norm);
      }),
    [sourceFeatures, existingTargetTitleSet]
  );

  const selectedImportIdSet = useMemo(() => new Set(selectedImportIds), [selectedImportIds]);

  const effectiveSelectedImportIds = useMemo(
    () =>
      selectableSourceFeatures
        .filter((f) => selectedImportIdSet.has(f.id))
        .map((f) => f.id),
    [selectableSourceFeatures, selectedImportIdSet]
  );

  const isAllSelectableChecked =
    selectableSourceFeatures.length > 0 &&
    effectiveSelectedImportIds.length === selectableSourceFeatures.length;

  const handleToggleSelectAllImport = () => {
    if (isAllSelectableChecked) {
      setSelectedImportIds([]);
    } else {
      setSelectedImportIds(selectableSourceFeatures.map((f) => f.id));
    }
  };

  const handleToggleSingleImport = (featureId: number) => {
    setSelectedImportIds((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleImportSelectedFeatures = async () => {
    const sourceId = Number(selectedSourceCourseId);
    if (!sourceId || effectiveSelectedImportIds.length === 0) return;

    setLocalError(null);
    setLocalSuccess(null);

    const selectedIdSet = new Set(effectiveSelectedImportIds);
    const chosenItems = sourceFeatures.filter((f) => selectedIdSet.has(f.id));
    if (chosenItems.length === 0) return;

    const remainingCapacity = MAX_COURSE_FEATURES_PER_COURSE - items.length;
    if (remainingCapacity <= 0) {
      const msg = `একটি কোর্সে সর্বোচ্চ ${toBengaliNumber(MAX_COURSE_FEATURES_PER_COURSE)}টি ফিচার যুক্ত করা যাবে।`;
      setLocalError(msg);
      onShowToast?.(msg, 'error');
      return;
    }

    if (!isApiMode) {
      const seenTitles = new Set(existingTargetTitleSet);
      const uniqueCopies: CourseFeatureItem[] = [];
      let skippedDuplicates = 0;
      let nextId =
        items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;

      for (const srcItem of chosenItems) {
        const norm = normalizeFeatureTitleForComparison(srcItem.title);
        if (!norm || seenTitles.has(norm)) {
          skippedDuplicates += 1;
          continue;
        }
        if (uniqueCopies.length >= remainingCapacity) break;
        seenTitles.add(norm);
        uniqueCopies.push({
          id: nextId,
          courseId: targetCourseId || 0,
          title: srcItem.title.trim().slice(0, MAX_COURSE_FEATURE_TITLE_LENGTH),
          icon: srcItem.icon,
          sortOrder: items.length + uniqueCopies.length + 1,
          isActive: srcItem.isActive,
        });
        nextId += 1;
      }

      if (uniqueCopies.length === 0) {
        const msg = 'নির্বাচিত ফিচারগুলো ইতিমধ্যেই এই কোর্সে যুক্ত রয়েছে।';
        setLocalError(msg);
        return;
      }

      const nextList = sortCourseFeatures([...items, ...uniqueCopies]);
      commitControlled(nextList);
      setSelectedImportIds([]);

      const successMsg =
        skippedDuplicates > 0
          ? `${toBengaliNumber(uniqueCopies.length)}টি ফিচার যুক্ত হয়েছে (${toBengaliNumber(skippedDuplicates)}টি ডুপ্লিকেট বাদ দেওয়া হয়েছে)।`
          : `${toBengaliNumber(uniqueCopies.length)}টি ফিচার সফলভাবে কপি করে যুক্ত হয়েছে।`;
      setLocalSuccess(successMsg);
      onShowToast?.(successMsg, 'success');
      return;
    }

    if (!targetCourseId) return;
    setBusyId('import');
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCourseId: sourceId,
          featureIds: effectiveSelectedImportIds,
          selectAll: false,
        }),
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ফিচার ইম্পোর্ট করতে সমস্যা হয়েছে।');
      }

      const nextList = sortCourseFeatures(Array.isArray(data.features) ? data.features : items);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      setSelectedImportIds([]);

      const addedCount = Number(data.addedCount) || 0;
      const skippedCount = Number(data.skippedDuplicateCount) || 0;
      if (addedCount > 0) {
        const msg =
          skippedCount > 0
            ? `${toBengaliNumber(addedCount)}টি ফিচার সফলভাবে যুক্ত হয়েছে (${toBengaliNumber(skippedCount)}টি ডুপ্লিকেট বাদ দেওয়া হয়েছে)।`
            : `${toBengaliNumber(addedCount)}টি ফিচার সফলভাবে যুক্ত হয়েছে।`;
        setLocalSuccess(msg);
        onShowToast?.(msg, 'success');
      } else {
        const msg = 'নির্বাচিত ফিচারগুলো ইতিমধ্যেই এই কোর্সে যুক্ত রয়েছে।';
        setLocalError(msg);
        onShowToast?.(msg, 'info');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ফিচার ইম্পোর্ট ব্যর্থ হয়েছে।';
      setLocalError(msg);
      onShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

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
    if (hasDuplicateFeatureTitle(items, trimmed)) {
      setLocalError('এই ফিচারটি ইতিমধ্যে এই কোর্সে যুক্ত আছে।');
      return;
    }
    if (items.length >= MAX_COURSE_FEATURES_PER_COURSE) {
      setLocalError(
        `একটি কোর্সে সর্বোচ্চ ${toBengaliNumber(MAX_COURSE_FEATURES_PER_COURSE)}টি ফিচার যোগ করা যাবে।`
      );
      return;
    }

    setLocalError(null);
    setLocalSuccess(null);

    if (!isApiMode) {
      const nextId =
        items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
      const nextItems = [
        ...items,
        {
          id: nextId,
          courseId: targetCourseId || 0,
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

    if (!targetCourseId) return;
    setBusyId('add');
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features`, {
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
        onUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ফিচার যোগ করা সম্ভব হয়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      onShowToast?.('নতুন কোর্স ফিচার যুক্ত হয়েছে।', 'success');
      setNewTitle('');
      setIconManuallyPicked(false);
      setNewIcon(inferCourseFeatureIcon('', nextList.length));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ফিচার যোগ ব্যর্থ হয়েছে।';
      setLocalError(msg);
      onShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (item: CourseFeatureItem) => {
    const nextActive = !item.isActive;
    setLocalError(null);
    setLocalSuccess(null);

    if (!isApiMode) {
      commitControlled(
        items.map((f) => (f.id === item.id ? { ...f, isActive: nextActive } : f))
      );
      return;
    }

    if (!targetCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'স্ট্যাটাস আপডেট করা সম্ভব হয়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      onShowToast?.(
        nextActive ? 'ফিচারটি ওয়েবসাইটে চালু করা হয়েছে।' : 'ফিচারটি ওয়েবসাইট থেকে লুকানো হয়েছে।',
        'info'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আপডেট ব্যর্থ হয়েছে।';
      setLocalError(msg);
      onShowToast?.(msg, 'error');
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

    if (!targetCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: nextIcon }),
      });
      if (res.status === 401) {
        onUnauthorized?.();
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
    if (hasDuplicateFeatureTitle(items, trimmed, item.id)) {
      setLocalError('এই নামের ফিচারটি ইতিমধ্যে এই কোর্সে যুক্ত আছে।');
      return;
    }

    setLocalError(null);
    setLocalSuccess(null);

    if (!isApiMode) {
      commitControlled(
        items.map((f) =>
          f.id === item.id ? { ...f, title: trimmed, icon: editIcon } : f
        )
      );
      setEditingId(null);
      return;
    }

    if (!targetCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, icon: editIcon }),
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ফিচার আপডেট করা যায়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      onShowToast?.('ফিচার আপডেট করা হয়েছে।', 'success');
      setEditingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আপডেট ব্যর্থ হয়েছে।';
      setLocalError(msg);
      onShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const commitReorderedList = async (reordered: CourseFeatureItem[]) => {
    const normalizedOrder = reordered.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setLocalError(null);

    if (!isApiMode) {
      commitControlled(normalizedOrder);
      return;
    }

    if (!targetCourseId) return;
    setApiItems(normalizedOrder);
    setBusyId('reorder');
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: normalizedOrder.map((f) => f.id) }),
      });
      if (res.status === 401) {
        onUnauthorized?.();
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

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await commitReorderedList(reordered);
  };

  const handleDropFeature = async (dropTargetId: number) => {
    const fromId = draggedFeatureId;
    setDraggedFeatureId(null);
    setDragOverFeatureId(null);

    if (!fromId || fromId === dropTargetId) return;
    const fromIndex = items.findIndex((f) => f.id === fromId);
    const toIndex = items.findIndex((f) => f.id === dropTargetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await commitReorderedList(reordered);
  };

  const handleDelete = async (item: CourseFeatureItem) => {
    setLocalError(null);
    setLocalSuccess(null);

    if (!isApiMode) {
      commitControlled(items.filter((f) => f.id !== item.id));
      if (editingId === item.id) setEditingId(null);
      return;
    }

    if (!targetCourseId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/courses/${targetCourseId}/features/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        onUnauthorized?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ফিচার মুছে ফেলা সম্ভব হয়নি।');
      }
      const nextList = sortCourseFeatures(data.features || []);
      setApiItems(nextList);
      apiOnSaved?.(nextList);
      onShowToast?.('ফিচার মুছে ফেলা হয়েছে।', 'info');
      if (editingId === item.id) setEditingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মুছে ফেলা ব্যর্থ হয়েছে।';
      setLocalError(msg);
      onShowToast?.(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const missingMinimum = Math.max(0, MIN_ACTIVE_COURSE_FEATURES - activeItems.length);
  const selectedSourceCourse = availableSourceCourses.find(
    (c) => String(c.id) === selectedSourceCourseId
  );

  return (
    <div className="space-y-3.5 min-w-0 w-full">
      {/* Header & Live Count Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#2A0F12]">
            <ListChecks className="w-4 h-4 text-[#eb1c24] shrink-0" />
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
        সক্রিয় ফিচার ও কোর্সের বিস্তারিত দেখা যাবে। ড্র্যাগ (⇅) করে বা ↑↓ বাটনে সিরিয়াল সাজাতে পারবেন।
      </p>

      {/* Minimum Active Feature Notice */}
      {missingMinimum > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              পাবলিক কার্ডের জন্য ন্যূনতম {toBengaliNumber(MIN_ACTIVE_COURSE_FEATURES)}টি
              সক্রিয় ফিচার প্রয়োজন (আরও {toBengaliNumber(missingMinimum)}টি সক্রিয় করুন)।
            </span>
          </span>
        </div>
      )}

      {localError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="break-words">{localError}</span>
          </span>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="text-rose-500 hover:text-rose-800 cursor-pointer shrink-0"
            aria-label="বন্ধ করুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {localSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="break-words">{localSuccess}</span>
          </span>
          <button
            type="button"
            onClick={() => setLocalSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer shrink-0"
            aria-label="বন্ধ করুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Existing Course Feature Import / Reuse Box */}
      <div className="rounded-2xl border border-sky-200/85 bg-gradient-to-br from-sky-50/65 via-white to-rose-50/35 p-3 space-y-2.5 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="text-[11.5px] font-extrabold text-[#2A0F12] flex items-center gap-1.5 min-w-0">
            <CopyPlus className="w-3.5 h-3.5 text-[#b91c1c] shrink-0" />
            <span className="leading-snug">অন্য কোর্স থেকে ফিচার কপি / ইম্পোর্ট করুন (Reuse Existing Features)</span>
          </div>
          <span className="text-[10px] font-bold text-[#6B4C4F] bg-white/90 border border-sky-200/70 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
            সোর্স কোর্স অপরিবর্তিত থাকবে
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center min-w-0 w-full">
          <div className="min-w-0 flex-1 w-full">
            <select
              value={selectedSourceCourseId}
              onChange={(e) => void handleSelectSourceCourse(e.target.value)}
              disabled={loadingCoursesList || busyId === 'import'}
              aria-label="ফিচার ইম্পোর্ট করার জন্য বিদ্যমান কোর্স নির্বাচন করুন"
              className="w-full min-w-0 max-w-full truncate px-3 py-2 rounded-xl border border-slate-200/90 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <option value="">
                {loadingCoursesList
                  ? 'কোর্স তালিকা লোড হচ্ছে...'
                  : availableSourceCourses.length === 0
                  ? 'অন্য কোনো বিদ্যমান কোর্স পাওয়া যায়নি'
                  : '— একটি বিদ্যমান কোর্স (Source Course) নির্বাচন করুন —'}
              </option>
              {availableSourceCourses.map((c) => {
                const catLabel = categoryNameBySlug.get(c.categorySlug) || c.categorySlug;
                const featCount = Array.isArray(c.courseFeatures) ? c.courseFeatures.length : 0;
                return (
                  <option key={c.id} value={String(c.id)}>
                    {c.title} ({catLabel}
                    {featCount > 0 ? ` • ${toBengaliNumber(featCount)}টি ফিচার` : ''})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedSourceCourseId && (
            <button
              type="button"
              onClick={() => void handleSelectSourceCourse('')}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-600 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>রিসেট</span>
            </button>
          )}
        </div>

        {/* Source Course Loaded Features Picker */}
        {selectedSourceCourseId && (
          <div className="rounded-xl border border-sky-200/80 bg-white/95 p-2.5 space-y-2.5">
            {loadingSourceFeatures ? (
              <div className="py-5 text-center text-xs font-bold text-[#6B4C4F] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#eb1c24] animate-spin" />
                <span>কোর্সের সংরক্ষিত ফিচারসমূহ লোড হচ্ছে...</span>
              </div>
            ) : sourceLoadError ? (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sourceLoadError}</span>
              </div>
            ) : sourceFeatures.length === 0 ? (
              <div className="py-4 text-center text-[11px] font-bold text-[#6B4C4F]">
                “{selectedSourceCourse?.title || 'নির্বাচিত কোর্স'}”-এ এখনো কোনো ফিচার সংরক্ষিত নেই।
              </div>
            ) : (
              <>
                {/* Picker Toolbar: Select All + Counts */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllImport}
                    disabled={selectableSourceFeatures.length === 0 || busyId === 'import'}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-[11px] font-extrabold text-[#2A0F12] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAllSelectableChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#eb1c24]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>
                      {isAllSelectableChecked ? 'সব আনসিলেক্ট করুন' : 'Select All (সব সিলেক্ট করুন)'}
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold tabular-nums">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      মোট: {toBengaliNumber(sourceFeatures.length)}টি
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      যুক্ত করা যাবে: {toBengaliNumber(selectableSourceFeatures.length)}টি
                    </span>
                    {sourceFeatures.length > selectableSourceFeatures.length && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        ইতিমধ্যে যুক্ত:{' '}
                        {toBengaliNumber(
                          sourceFeatures.length - selectableSourceFeatures.length
                        )}
                        টি
                      </span>
                    )}
                  </div>
                </div>

                {/* Source Features Checklist */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {sourceFeatures.map((srcItem) => {
                    const normTitle = normalizeFeatureTitleForComparison(srcItem.title);
                    const isAlreadyInTarget = existingTargetTitleSet.has(normTitle);
                    const isChecked =
                      !isAlreadyInTarget && selectedImportIdSet.has(srcItem.id);

                    return (
                      <label
                        key={`import-src-${srcItem.id}`}
                        className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border transition select-none ${
                          isAlreadyInTarget
                            ? 'bg-slate-50/90 border-slate-200/80 opacity-65 cursor-not-allowed'
                            : isChecked
                            ? 'bg-rose-50/60 border-rose-300 cursor-pointer shadow-2xs'
                            : 'bg-white border-slate-200/80 hover:border-rose-200 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isAlreadyInTarget || busyId === 'import'}
                            onChange={() => handleToggleSingleImport(srcItem.id)}
                            className="w-4 h-4 accent-[#eb1c24] rounded cursor-pointer disabled:cursor-not-allowed shrink-0"
                          />
                          <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[#4A2C2F] shrink-0">
                            <CourseFeatureIcon icon={srcItem.icon} className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-bold text-[#2A0F12] leading-snug break-words">
                            {srcItem.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isAlreadyInTarget ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[9.5px] font-extrabold whitespace-nowrap">
                              ইতিমধ্যে যুক্ত
                            </span>
                          ) : !srcItem.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9.5px] font-extrabold whitespace-nowrap">
                              লুকানো
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-extrabold whitespace-nowrap">
                              সক্রিয়
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Import Action Footer */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#6B4C4F] tabular-nums">
                    নির্বাচিত:{' '}
                    <strong className="text-[#2A0F12]">
                      {toBengaliNumber(effectiveSelectedImportIds.length)}টি
                    </strong>{' '}
                    ফিচার
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleImportSelectedFeatures()}
                    disabled={
                      effectiveSelectedImportIds.length === 0 || busyId === 'import'
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                    <span>
                      {busyId === 'import'
                        ? 'যুক্ত হচ্ছে...'
                        : effectiveSelectedImportIds.length > 0
                        ? `Add Selected Features (${toBengaliNumber(effectiveSelectedImportIds.length)}টি)`
                        : 'Add Selected Features'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add New Feature Input Row */}
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/35 p-3 space-y-2.5 min-w-0 overflow-hidden">
        <div className="text-[11px] font-extrabold text-[#2A0F12] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#eb1c24] shrink-0" />
          <span>নতুন ফিচার যুক্ত করুন</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 min-w-0 w-full">
          <div className="flex items-center gap-1.5 shrink-0 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#b91c1c] shadow-2xs shrink-0">
              <CourseFeatureIcon icon={newIcon} className="w-4 h-4" />
            </span>
            <select
              value={newIcon}
              onChange={(e) => {
                setNewIcon(e.target.value as CourseFeatureIconKey);
                setIconManuallyPicked(true);
              }}
              aria-label="নতুন ফিচারের আইকন নির্বাচন করুন"
              className="min-w-0 max-w-full px-2.5 py-2 rounded-xl border border-slate-200/90 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none cursor-pointer shadow-2xs"
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
            className="w-full min-w-0 sm:flex-1 px-3.5 py-2 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
          />

          <button
            type="button"
            onClick={() => void handleAddFeature()}
            disabled={busyId === 'add'}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-sm transition cursor-pointer shrink-0 disabled:opacity-60 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{busyId === 'add' ? 'যোগ হচ্ছে...' : 'যোগ করুন'}</span>
          </button>
        </div>
      </div>

      {/* Target Course Feature List (Supports Drag & Drop + Up/Down + Edit + Toggle + Delete) */}
      {loadingApi ? (
        <div className="py-8 text-center text-xs font-bold text-[#6B4C4F] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#eb1c24] animate-spin" />
          <span>ফিচার তালিকা লোড হচ্ছে...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-white/70 p-6 text-center space-y-2">
          <p className="text-xs font-bold text-[#2A0F12]">কোনো ফিচার এখনো যুক্ত করা হয়নি</p>
          <p className="text-[11px] text-[#6B4C4F]">
            উপরের ফর্ম থেকে একটি করে ফিচার যোগ করুন অথবা অন্য কোর্স থেকে ইম্পোর্ট করুন।
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const activeRank = activeRankMap.get(item.id);
            const isEditingRow = editingId === item.id;
            const isBusy = busyId === item.id || busyId === 'reorder';
            const isDragging = draggedFeatureId === item.id;
            const isDragTarget = dragOverFeatureId === item.id && draggedFeatureId !== item.id;

            return (
              <div
                key={item.id}
                draggable={!isBusy && !isEditingRow}
                onDragStart={(e) => {
                  setDraggedFeatureId(item.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(item.id));
                }}
                onDragOver={(e) => {
                  if (draggedFeatureId && draggedFeatureId !== item.id) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverFeatureId !== item.id) {
                      setDragOverFeatureId(item.id);
                    }
                  }
                }}
                onDragLeave={() => {
                  if (dragOverFeatureId === item.id) {
                    setDragOverFeatureId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDropFeature(item.id);
                }}
                onDragEnd={() => {
                  setDraggedFeatureId(null);
                  setDragOverFeatureId(null);
                }}
                className={`rounded-2xl border px-3 py-2.5 sm:px-3.5 sm:py-3 transition min-w-0 ${
                  isDragging
                    ? 'opacity-50 border-dashed border-[#eb1c24] bg-rose-50/40'
                    : isDragTarget
                    ? 'ring-2 ring-[#eb1c24]/45 border-[#eb1c24] bg-rose-50/55 shadow-sm'
                    : item.isActive
                    ? 'bg-white border-rose-200/80 shadow-2xs'
                    : 'bg-slate-50/90 border-slate-200 opacity-85'
                }`}
              >
                {isEditingRow ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-[#b91c1c] shrink-0">
                        <CourseFeatureIcon icon={editIcon} className="w-4 h-4" />
                      </span>
                      <select
                        value={editIcon}
                        onChange={(e) =>
                          setEditIcon(e.target.value as CourseFeatureIconKey)
                        }
                        aria-label="ফিচার আইকন"
                        className="min-w-0 max-w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white outline-none cursor-pointer"
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
                      className="w-full min-w-0 sm:flex-1 px-3 py-1.5 rounded-lg border border-rose-300 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none font-medium"
                      autoFocus
                    />

                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(item)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60 whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>সেভ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>বাতিল</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 min-w-0">
                    {/* Top Strip: Drag Handle + Serial + Icon Selector on Left, Action Controls on Right */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-rose-100/75 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span
                          title="টেনে সিরিয়াল পরিবর্তন করুন (Drag to reorder)"
                          className="text-slate-400 hover:text-[#b91c1c] cursor-grab active:cursor-grabbing shrink-0"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>

                        <span className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-[#b91c1c] text-[10.5px] font-black tabular-nums shrink-0 whitespace-nowrap">
                          #{toBengaliNumber(idx + 1)}
                        </span>

                        <span
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[#4A2C2F] shrink-0"
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
                          className="px-1.5 py-1 rounded-lg border border-slate-200 text-[10.5px] font-bold text-[#4A2C2F] bg-white cursor-pointer outline-none max-w-[112px] min-w-0 truncate"
                        >
                          {COURSE_FEATURE_ICON_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-auto">
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
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-extrabold transition cursor-pointer disabled:opacity-50 whitespace-nowrap ${
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

                    {/* Bottom Content Area: Full-Width Readable Title & Single-Line Visibility Badge */}
                    <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 min-w-0 pt-0.5">
                      <p
                        className={`text-xs sm:text-[13px] font-bold leading-snug break-words min-w-0 flex-1 ${
                          item.isActive
                            ? 'text-[#2A0F12]'
                            : 'text-slate-500 line-through'
                        }`}
                      >
                        {item.title}
                      </p>

                      <div className="shrink-0">
                        {!item.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-extrabold whitespace-nowrap">
                            লুকানো (Hidden)
                          </span>
                        ) : activeRank && activeRank <= CARD_VISIBLE_COURSE_FEATURES ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold whitespace-nowrap">
                            কার্ডে দৃশ্যমান (#{toBengaliNumber(activeRank)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-extrabold whitespace-nowrap">
                            Show More-এ দৃশ্যমান
                          </span>
                        )}
                      </div>
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
