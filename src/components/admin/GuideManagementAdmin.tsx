'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  ClassGuideBonusItem,
  ClassGuideBundleItem,
  ClassGuideConfig,
  ClassGuideExclusiveFeature,
  ClassGuideIconKey,
  ClassGuideKey,
  ClassGuidePhaseItem,
  ClassGuidePillarItem,
  ClassGuidePlanAccordionItem,
  ClassGuideScheduleColumn,
  ClassGuideStructureItem,
  ClassGuidesMap,
} from '../../types.ts';
import {
  CLASS_GUIDE_KEYS,
  CLASS_GUIDE_META,
  cloneDefaultClassGuidesMap,
  normalizeClassGuideConfig,
  normalizeClassGuidesMap,
  validateGuideUrlInput,
} from '../../lib/classGuideDefaults.ts';
import { CLASS_GUIDE_ICON_OPTIONS } from '../../lib/classGuideIcons.ts';
import { ClassGuideIcon } from '../ClassGuideIcon.tsx';
import { toBengaliNumber } from '../../utils/format.ts';
import { AdminModalPortal } from './AdminModalPortal.tsx';

interface GuideManagementAdminProps {
  cachedData: ClassGuidesMap | null;
  onCacheUpdated: (guides: ClassGuidesMap) => void;
  onUnauthorized: () => void;
  onDataMutated: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenPublicPath?: (path: string) => void;
}

type GuideEditorSubTab =
  | 'general'
  | 'structure'
  | 'bonus'
  | 'schedule'
  | 'exclusive'
  | 'bundles'
  | 'plan'
  | 'pillars';

type GuideCollectionKey =
  | 'structureItems'
  | 'bonusItems'
  | 'scheduleColumns'
  | 'exclusiveFeatures'
  | 'bundles'
  | 'fiveMonthItems'
  | 'oneMonthItems'
  | 'planAccordionItems'
  | 'pillars';

interface NormalizedEditorRow {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  linkUrl: string;
  imageUrl: string;
  iconKey: ClassGuideIconKey;
  isActive: boolean;
  displayOrder: number;
  bulletsCount?: number;
}

interface ItemModalDraft {
  collection: GuideCollectionKey;
  mode: 'add' | 'edit';
  editingId: string | null;
  title: string;
  description: string;
  badge: string;
  timeframe: string;
  linkUrl: string;
  imageUrl: string;
  imageAlt: string;
  iconKey: ClassGuideIconKey;
  linesText: string;
  isActive: boolean;
}

const PRESET_GUIDE_IMAGES: ReadonlyArray<{ label: string; url: string }> = [
  { label: 'MasterBook Bundle + Gift', url: '/assets/aistudio/image_826376ee.png' },
  { label: 'বার্ষিক পরীক্ষা প্রস্তুতি', url: '/assets/aistudio/image_28b0a606.png' },
  { label: 'MasterBook Set', url: '/assets/aistudio/image_5f052f32.png' },
  { label: 'SuperSolve AI', url: '/assets/aistudio/image_f80fe1f0.png' },
  { label: 'SuperPrep MCQ', url: '/assets/aistudio/image_b53497e0.png' },
];

const COLLECTION_LABELS: Record<
  GuideCollectionKey,
  {
    singular: string;
    plural: string;
    titleLabel: string;
    descLabel: string;
    linesLabel?: string;
  }
> = {
  structureItems: {
    singular: 'কোর্স কাঠামো আইটেম',
    plural: 'কোর্স কাঠামো আইটেমসমূহ',
    titleLabel: 'আইটেমের নাম / শিরোনাম',
    descLabel: 'বিস্তারিত তথ্য / বিবরণ',
  },
  bonusItems: {
    singular: 'ফ্রি বোনাস আইটেম',
    plural: 'ফ্রি বোনাস আইটেমসমূহ',
    titleLabel: 'বোনাস আইটেমের নাম',
    descLabel: 'সংক্ষিপ্ত বিবরণ',
    linesLabel: 'হাইলাইট পয়েন্ট (প্রতি লাইনে একটি)',
  },
  scheduleColumns: {
    singular: 'সময়সূচি / পাঠ্যবিষয় কলাম',
    plural: 'সময়সূচি ও বিষয় কলামসমূহ',
    titleLabel: 'কলামের শিরোনাম',
    descLabel: 'উপ-বিবরণ (ঐচ্ছিক)',
    linesLabel: 'পয়েন্ট তালিকা (প্রতি লাইনে একটি)',
  },
  exclusiveFeatures: {
    singular: 'এক্সক্লুসিভ ফিচার',
    plural: 'এক্সক্লুসিভ ফিচারসমূহ',
    titleLabel: 'ফিচারের নাম',
    descLabel: 'ট্যাগলাইন / মূল তথ্য',
    linesLabel: 'ফিচার বুলেটস (প্রতি লাইনে একটি)',
  },
  bundles: {
    singular: 'বান্ডেল আইটেম',
    plural: 'বান্ডেলসমূহ',
    titleLabel: 'বান্ডেলের নাম',
    descLabel: 'বান্ডেলের সংক্ষিপ্ত বিবরণ',
  },
  fiveMonthItems: {
    singular: '৫ মাস প্রস্তুতি আইটেম',
    plural: 'পরীক্ষার পূর্বে ৫ মাস আইটেম',
    titleLabel: 'আইটেমের নাম / লেবেল',
    descLabel: 'বিস্তারিত তথ্য',
  },
  oneMonthItems: {
    singular: '১ মাস প্রস্তুতি আইটেম',
    plural: 'পরীক্ষার প্রস্তুতি ১ মাস আইটেম',
    titleLabel: 'আইটেমের নাম / লেবেল',
    descLabel: 'বিস্তারিত তথ্য',
  },
  planAccordionItems: {
    singular: 'কোর্স পরিকল্পনা আইটেম',
    plural: '২০২৭ সালের কোর্স পরিকল্পনা',
    titleLabel: 'প্রশ্ন / শিরোনাম',
    descLabel: 'বিস্তারিত উত্তর / বিবরণ',
  },
  pillars: {
    singular: 'অনলাইন ব্যাচ স্তম্ভ',
    plural: 'অনলাইন ব্যাচ ২০২৭ স্তম্ভসমূহ',
    titleLabel: 'স্তম্ভের নাম / শিরোনাম',
    descLabel: 'বিস্তারিত তথ্য',
  },
};

function countGuideItems(guide: ClassGuideConfig): number {
  return (
    guide.structureItems.length +
    guide.bonusItems.length +
    guide.scheduleColumns.length +
    guide.exclusiveFeatures.length +
    guide.bundles.length +
    guide.fiveMonthItems.length +
    guide.oneMonthItems.length +
    guide.planAccordionItems.length +
    guide.pillars.length
  );
}

function getCollectionRows(
  guide: ClassGuideConfig,
  collection: GuideCollectionKey
): NormalizedEditorRow[] {
  if (collection === 'structureItems') {
    return guide.structureItems.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.description,
      linkUrl: item.linkUrl,
      imageUrl: item.imageUrl,
      iconKey: item.iconKey,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    }));
  }
  if (collection === 'bonusItems') {
    return guide.bonusItems.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.description || item.highlights.join(' • '),
      linkUrl: item.linkUrl,
      imageUrl: item.imageUrl,
      iconKey: item.iconKey,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
      bulletsCount: item.highlights.length,
    }));
  }
  if (collection === 'scheduleColumns') {
    return guide.scheduleColumns.map((item) => ({
      id: item.id,
      title: item.heading,
      subtitle: item.description || item.points[0] || '',
      linkUrl: item.linkUrl,
      imageUrl: item.imageUrl,
      iconKey: item.iconKey,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
      bulletsCount: item.points.length,
    }));
  }
  if (collection === 'exclusiveFeatures') {
    return guide.exclusiveFeatures.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.tagline,
      badge: item.badge,
      linkUrl: item.linkUrl,
      imageUrl: item.imageUrl,
      iconKey: item.iconKey,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
      bulletsCount: item.bullets.length,
    }));
  }
  if (collection === 'bundles') {
    return guide.bundles.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: item.focusSummary,
      badge: item.timeframe,
      linkUrl: item.linkUrl,
      imageUrl: item.imageUrl,
      iconKey: item.iconKey,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    }));
  }
  if (collection === 'fiveMonthItems' || collection === 'oneMonthItems') {
    return guide[collection].map((item) => ({
      id: item.id,
      title: item.label,
      subtitle: item.detail,
      linkUrl: item.linkUrl,
      imageUrl: item.imageUrl,
      iconKey: item.iconKey,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    }));
  }
  if (collection === 'planAccordionItems') {
    return guide.planAccordionItems.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.answer,
      linkUrl: item.linkUrl,
      imageUrl: item.imageUrl,
      iconKey: item.iconKey,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    }));
  }
  return guide.pillars.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.description,
    linkUrl: item.linkUrl,
    imageUrl: item.imageUrl,
    iconKey: item.iconKey,
    isActive: item.isActive,
    displayOrder: item.displayOrder,
  }));
}

interface SortableGuideItemRowProps {
  row: NormalizedEditorRow;
  index: number;
  totalCount: number;
  onMoveBy: (index: number, delta: -1 | 1) => void;
  onToggleActive: (id: string) => void;
  onEdit: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

const SortableGuideItemRow: React.FC<SortableGuideItemRowProps> = ({
  row,
  index,
  totalCount,
  onMoveBy,
  onToggleActive,
  onEdit,
  onRequestDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
        isDragging
          ? 'z-30 opacity-65 border-2 border-dashed border-[#eb1c24] bg-rose-50/80 shadow-inner'
          : row.isActive
            ? 'bg-white/95 border-rose-100/90 shadow-2xs hover:border-rose-200'
            : 'bg-slate-50/90 border-slate-200/90 opacity-75'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${row.title} ড্র্যাগ করে অর্ডার পরিবর্তন করুন`}
          title="টেনে (Drag) অর্ডার পরিবর্তন করুন"
          className="w-9 h-10 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white text-[#b91c1c] flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-black text-[#b91c1c]/80 tabular-nums shrink-0 w-6 text-center">
          #{toBengaliNumber(index + 1)}
        </span>

        {row.imageUrl ? (
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-rose-200/80 bg-rose-50 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.imageUrl}
              alt={row.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-[#E22B2B] flex items-center justify-center shrink-0">
            <ClassGuideIcon
              iconKey={row.iconKey}
              fallback="book-open"
              className="w-4.5 h-4.5"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-xs sm:text-sm font-black text-[#2A0F12] truncate max-w-full">
              {row.title}
            </h4>
            {row.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-[#b91c1c]">
                {row.badge}
              </span>
            )}
            {typeof row.bulletsCount === 'number' && row.bulletsCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {toBengaliNumber(row.bulletsCount)} পয়েন্ট
              </span>
            )}
            {row.linkUrl && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 max-w-[180px] truncate">
                <Link2 className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{row.linkUrl}</span>
              </span>
            )}
          </div>
          {row.subtitle && (
            <p className="text-[11px] text-[#6B4C4F] line-clamp-2 leading-relaxed">
              {row.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMoveBy(index, -1)}
          title="উপরে নিন"
          aria-label={`${row.title} উপরে নিন`}
          className="w-8 h-9 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={index === totalCount - 1}
          onClick={() => onMoveBy(index, 1)}
          title="নিচে নামান"
          aria-label={`${row.title} নিচে নামান`}
          className="w-8 h-9 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onToggleActive(row.id)}
          title={row.isActive ? 'হাইড করুন' : 'দৃশ্যমান করুন'}
          className={`px-2.5 h-9 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
            row.isActive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {row.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{row.isActive ? 'সক্রিয়' : 'হাইড'}</span>
        </button>
        <button
          type="button"
          onClick={() => onEdit(row.id)}
          className="px-2.5 h-9 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white text-[#b91c1c] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>এডিট</span>
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(row.id)}
          title="মুছে ফেলুন"
          aria-label={`${row.title} মুছে ফেলুন`}
          className="w-9 h-9 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-600 hover:border-rose-600 hover:text-white text-rose-600 flex items-center justify-center cursor-pointer transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const GuideManagementAdmin: React.FC<GuideManagementAdminProps> = ({
  cachedData,
  onCacheUpdated,
  onUnauthorized,
  onDataMutated,
  onShowToast,
  onOpenPublicPath,
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassGuideKey>('class-6');
  const [activeSubTab, setActiveSubTab] = useState<GuideEditorSubTab>('general');
  const [savedGuides, setSavedGuides] = useState<ClassGuidesMap>(() =>
    cachedData ? normalizeClassGuidesMap(cachedData) : cloneDefaultClassGuidesMap()
  );
  const [draftGuides, setDraftGuides] = useState<ClassGuidesMap>(() =>
    cachedData ? normalizeClassGuidesMap(cachedData) : cloneDefaultClassGuidesMap()
  );
  const [loading, setLoading] = useState<boolean>(() => !cachedData);
  const [saving, setSaving] = useState(false);
  const [resetConfirmClass, setResetConfirmClass] = useState<ClassGuideKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    collection: GuideCollectionKey;
    id: string;
    title: string;
  } | null>(null);
  const [itemModal, setItemModal] = useState<ItemModalDraft | null>(null);
  const [itemModalError, setItemModalError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchGuides = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      try {
        const res = await fetch('/api/admin/guides', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: options?.signal,
        });
        if (options?.signal?.aborted) return;
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        if (!res.ok) {
          throw new Error('গাইড তথ্য লোড করা সম্ভব হয়নি।');
        }
        const data = (await res.json()) as { guides?: ClassGuidesMap };
        if (options?.signal?.aborted) return;
        if (data?.guides) {
          const normalized = normalizeClassGuidesMap(data.guides);
          setSavedGuides(normalized);
          setDraftGuides(normalized);
          onCacheUpdated(normalized);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        onShowToast(
          err instanceof Error ? err.message : 'গাইড লোড করতে সমস্যা হয়েছে।',
          'error'
        );
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [onCacheUpdated, onShowToast, onUnauthorized]
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active && !controller.signal.aborted) {
        await fetchGuides({ signal: controller.signal });
      }
    };
    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchGuides]);

  const currentGuide = draftGuides[selectedClass];

  const dirtyByClass = useMemo<Record<ClassGuideKey, boolean>>(() => {
    return {
      'class-6':
        JSON.stringify(draftGuides['class-6']) !== JSON.stringify(savedGuides['class-6']),
      'class-7':
        JSON.stringify(draftGuides['class-7']) !== JSON.stringify(savedGuides['class-7']),
      'class-8':
        JSON.stringify(draftGuides['class-8']) !== JSON.stringify(savedGuides['class-8']),
    };
  }, [draftGuides, savedGuides]);

  const isCurrentDirty = dirtyByClass[selectedClass];

  const updateCurrentGuide = useCallback(
    (updater: (prev: ClassGuideConfig) => ClassGuideConfig) => {
      setDraftGuides((prev) => ({
        ...prev,
        [selectedClass]: updater(prev[selectedClass]),
      }));
    },
    [selectedClass]
  );

  const handleSaveAndPublish = async () => {
    if (!currentGuide.guideName.trim()) {
      onShowToast('অনুগ্রহ করে গাইডের নাম (Guide Name) লিখুন।', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/guides/${selectedClass}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide: currentGuide }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'গাইড সংরক্ষণ ও পাবলিশ করা সম্ভব হয়নি।');
      }

      const nextGuides = data.guides
        ? normalizeClassGuidesMap(data.guides)
        : {
            ...savedGuides,
            [selectedClass]: normalizeClassGuideConfig(
              selectedClass,
              data.guide || currentGuide
            ),
          };
      setSavedGuides(nextGuides);
      setDraftGuides((prev) => ({
        ...prev,
        [selectedClass]: nextGuides[selectedClass],
      }));
      onCacheUpdated(nextGuides);
      onDataMutated();
      onShowToast(
        `${CLASS_GUIDE_META[selectedClass].label}-এর গাইড সেকশন সফলভাবে সেভ ও পাবলিশ হয়েছে!`,
        'success'
      );
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'গাইড সেভ করতে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmResetClass = async () => {
    if (!resetConfirmClass) return;
    const targetKey = resetConfirmClass;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/guides/${targetKey}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ডিফল্ট গাইড রিসেট করা সম্ভব হয়নি।');
      }
      const nextGuides = data.guides
        ? normalizeClassGuidesMap(data.guides)
        : savedGuides;
      setSavedGuides(nextGuides);
      setDraftGuides((prev) => ({
        ...prev,
        [targetKey]: nextGuides[targetKey],
      }));
      onCacheUpdated(nextGuides);
      onDataMutated();
      setResetConfirmClass(null);
      onShowToast(
        `${CLASS_GUIDE_META[targetKey].label}-এর গাইড ডিফল্ট অবস্থায় রিসেট করা হয়েছে।`,
        'info'
      );
    } catch (err) {
      onShowToast(
        err instanceof Error ? err.message : 'রিসেট করতে সমস্যা হয়েছে।',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReorderCollection = (
    collection: GuideCollectionKey,
    fromIdx: number,
    toIdx: number
  ) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    updateCurrentGuide((prev) => {
      const list = prev[collection] as Array<{ displayOrder: number }>;
      if (toIdx >= list.length) return prev;
      const moved = arrayMove(list, fromIdx, toIdx).map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
      }));
      return {
        ...prev,
        [collection]: moved,
      };
    });
  };

  const handleToggleItemActive = (collection: GuideCollectionKey, id: string) => {
    updateCurrentGuide((prev) => ({
      ...prev,
      [collection]: (prev[collection] as Array<{ id: string; isActive: boolean }>).map(
        (item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)
      ),
    }));
  };

  const openAddItemModal = (collection: GuideCollectionKey) => {
    setItemModalError(null);
    setItemModal({
      collection,
      mode: 'add',
      editingId: null,
      title: '',
      description: '',
      badge: collection === 'exclusiveFeatures' ? 'নতুন ফিচার' : '',
      timeframe: collection === 'bundles' ? 'জানুয়ারি থেকে ডিসেম্বর' : '',
      linkUrl: '',
      imageUrl: '',
      imageAlt: '',
      iconKey:
        collection === 'bonusItems'
          ? 'gift'
          : collection === 'scheduleColumns'
            ? 'book-check'
            : collection === 'exclusiveFeatures'
              ? 'zap'
              : collection === 'pillars'
                ? 'video'
                : 'book-open',
      linesText: '',
      isActive: true,
    });
  };

  const openEditItemModal = (collection: GuideCollectionKey, id: string) => {
    setItemModalError(null);
    const guide = currentGuide;
    if (collection === 'structureItems') {
      const found = guide.structureItems.find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.title,
        description: found.description,
        badge: '',
        timeframe: '',
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.title,
        iconKey: found.iconKey,
        linesText: '',
        isActive: found.isActive,
      });
    } else if (collection === 'bonusItems') {
      const found = guide.bonusItems.find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.title,
        description: found.description,
        badge: '',
        timeframe: '',
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.imageAlt,
        iconKey: found.iconKey,
        linesText: found.highlights.join('\n'),
        isActive: found.isActive,
      });
    } else if (collection === 'scheduleColumns') {
      const found = guide.scheduleColumns.find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.heading,
        description: found.description,
        badge: '',
        timeframe: '',
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.heading,
        iconKey: found.iconKey,
        linesText: found.points.join('\n'),
        isActive: found.isActive,
      });
    } else if (collection === 'exclusiveFeatures') {
      const found = guide.exclusiveFeatures.find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.title,
        description: found.tagline,
        badge: found.badge,
        timeframe: '',
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.imageAlt,
        iconKey: found.iconKey,
        linesText: found.bullets.join('\n'),
        isActive: found.isActive,
      });
    } else if (collection === 'bundles') {
      const found = guide.bundles.find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.name,
        description: found.focusSummary,
        badge: '',
        timeframe: found.timeframe,
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.name,
        iconKey: found.iconKey,
        linesText: '',
        isActive: found.isActive,
      });
    } else if (collection === 'fiveMonthItems' || collection === 'oneMonthItems') {
      const found = guide[collection].find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.label,
        description: found.detail,
        badge: '',
        timeframe: '',
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.label,
        iconKey: found.iconKey,
        linesText: '',
        isActive: found.isActive,
      });
    } else if (collection === 'planAccordionItems') {
      const found = guide.planAccordionItems.find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.title,
        description: found.answer,
        badge: '',
        timeframe: '',
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.title,
        iconKey: found.iconKey,
        linesText: '',
        isActive: found.isActive,
      });
    } else if (collection === 'pillars') {
      const found = guide.pillars.find((i) => i.id === id);
      if (!found) return;
      setItemModal({
        collection,
        mode: 'edit',
        editingId: id,
        title: found.title,
        description: found.description,
        badge: '',
        timeframe: '',
        linkUrl: found.linkUrl,
        imageUrl: found.imageUrl,
        imageAlt: found.title,
        iconKey: found.iconKey,
        linesText: '',
        isActive: found.isActive,
      });
    }
  };

  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !itemModal) return;

    setUploadingImage(true);
    setItemModalError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
      }
      if (data.url) {
        setItemModal((prev) => (prev ? { ...prev, imageUrl: String(data.url) } : prev));
        onShowToast('ছবি সফলভাবে আপলোড হয়েছে।', 'success');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ছবি আপলোড ব্যর্থ হয়েছে।';
      setItemModalError(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItemModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemModal) return;
    const cleanTitle = itemModal.title.trim();
    if (!cleanTitle) {
      setItemModalError(`${COLLECTION_LABELS[itemModal.collection].titleLabel} পূরণ করা আবশ্যক।`);
      return;
    }

    const linkCheck = validateGuideUrlInput(itemModal.linkUrl);
    if (!linkCheck.valid) {
      setItemModalError(linkCheck.error || 'অবৈধ লিংক।');
      return;
    }
    const imgCheck = validateGuideUrlInput(itemModal.imageUrl);
    if (!imgCheck.valid) {
      setItemModalError(`ছবি URL: ${imgCheck.error || 'অবৈধ ইমেজ লিংক।'}`);
      return;
    }

    const lines = itemModal.linesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const newId =
      itemModal.editingId ||
      `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    updateCurrentGuide((prev) => {
      const col = itemModal.collection;
      const upsert = <T extends { id: string; displayOrder: number }>(
        arr: T[],
        built: T
      ): T[] => {
        if (itemModal.mode === 'edit' && itemModal.editingId) {
          return arr.map((it) => (it.id === itemModal.editingId ? built : it));
        }
        return [...arr, { ...built, displayOrder: arr.length + 1 }];
      };

      if (col === 'structureItems') {
        const existingOrder =
          prev.structureItems.find((i) => i.id === newId)?.displayOrder ??
          prev.structureItems.length + 1;
        const nextItem: ClassGuideStructureItem = {
          id: newId,
          title: cleanTitle,
          description: itemModal.description.trim(),
          linkUrl: linkCheck.value,
          imageUrl: imgCheck.value,
          iconKey: itemModal.iconKey,
          displayOrder: existingOrder,
          isActive: itemModal.isActive,
        };
        return { ...prev, structureItems: upsert(prev.structureItems, nextItem) };
      }
      if (col === 'bonusItems') {
        const existingOrder =
          prev.bonusItems.find((i) => i.id === newId)?.displayOrder ??
          prev.bonusItems.length + 1;
        const nextItem: ClassGuideBonusItem = {
          id: newId,
          title: cleanTitle,
          description: itemModal.description.trim(),
          highlights: lines,
          linkUrl: linkCheck.value,
          imageUrl: imgCheck.value,
          imageAlt: itemModal.imageAlt.trim() || cleanTitle,
          iconKey: itemModal.iconKey,
          displayOrder: existingOrder,
          isActive: itemModal.isActive,
        };
        return { ...prev, bonusItems: upsert(prev.bonusItems, nextItem) };
      }
      if (col === 'scheduleColumns') {
        const existingOrder =
          prev.scheduleColumns.find((i) => i.id === newId)?.displayOrder ??
          prev.scheduleColumns.length + 1;
        const nextItem: ClassGuideScheduleColumn = {
          id: newId,
          heading: cleanTitle,
          description: itemModal.description.trim(),
          points: lines,
          linkUrl: linkCheck.value,
          imageUrl: imgCheck.value,
          iconKey: itemModal.iconKey,
          displayOrder: existingOrder,
          isActive: itemModal.isActive,
        };
        return { ...prev, scheduleColumns: upsert(prev.scheduleColumns, nextItem) };
      }
      if (col === 'exclusiveFeatures') {
        const existingOrder =
          prev.exclusiveFeatures.find((i) => i.id === newId)?.displayOrder ??
          prev.exclusiveFeatures.length + 1;
        const nextItem: ClassGuideExclusiveFeature = {
          id: newId,
          badge: itemModal.badge.trim(),
          title: cleanTitle,
          tagline: itemModal.description.trim(),
          bullets: lines,
          linkUrl: linkCheck.value,
          imageUrl: imgCheck.value,
          imageAlt: itemModal.imageAlt.trim() || cleanTitle,
          iconKey: itemModal.iconKey,
          displayOrder: existingOrder,
          isActive: itemModal.isActive,
        };
        return { ...prev, exclusiveFeatures: upsert(prev.exclusiveFeatures, nextItem) };
      }
      if (col === 'bundles') {
        const existingOrder =
          prev.bundles.find((i) => i.id === newId)?.displayOrder ??
          prev.bundles.length + 1;
        const nextItem: ClassGuideBundleItem = {
          id: newId,
          name: cleanTitle,
          timeframe: itemModal.timeframe.trim(),
          focusSummary: itemModal.description.trim(),
          linkUrl: linkCheck.value,
          imageUrl: imgCheck.value,
          iconKey: itemModal.iconKey,
          displayOrder: existingOrder,
          isActive: itemModal.isActive,
        };
        return { ...prev, bundles: upsert(prev.bundles, nextItem) };
      }
      if (col === 'fiveMonthItems' || col === 'oneMonthItems') {
        const list = prev[col];
        const existingOrder =
          list.find((i) => i.id === newId)?.displayOrder ?? list.length + 1;
        const nextItem: ClassGuidePhaseItem = {
          id: newId,
          label: cleanTitle,
          detail: itemModal.description.trim(),
          linkUrl: linkCheck.value,
          imageUrl: imgCheck.value,
          iconKey: itemModal.iconKey,
          displayOrder: existingOrder,
          isActive: itemModal.isActive,
        };
        return { ...prev, [col]: upsert(list, nextItem) };
      }
      if (col === 'planAccordionItems') {
        const existingOrder =
          prev.planAccordionItems.find((i) => i.id === newId)?.displayOrder ??
          prev.planAccordionItems.length + 1;
        const nextItem: ClassGuidePlanAccordionItem = {
          id: newId,
          title: cleanTitle,
          answer: itemModal.description.trim(),
          linkUrl: linkCheck.value,
          imageUrl: imgCheck.value,
          iconKey: itemModal.iconKey,
          displayOrder: existingOrder,
          isActive: itemModal.isActive,
        };
        return { ...prev, planAccordionItems: upsert(prev.planAccordionItems, nextItem) };
      }
      const existingOrder =
        prev.pillars.find((i) => i.id === newId)?.displayOrder ??
        prev.pillars.length + 1;
      const nextItem: ClassGuidePillarItem = {
        id: newId,
        title: cleanTitle,
        description: itemModal.description.trim(),
        linkUrl: linkCheck.value,
        imageUrl: imgCheck.value,
        iconKey: itemModal.iconKey,
        displayOrder: existingOrder,
        isActive: itemModal.isActive,
      };
      return { ...prev, pillars: upsert(prev.pillars, nextItem) };
    });

    setItemModal(null);
    onShowToast(
      itemModal.mode === 'add'
        ? 'নতুন আইটেম ড্রাফটে যুক্ত হয়েছে। স্থায়ী করতে "সেভ ও পাবলিশ করুন" বাটনে ক্লিক করুন।'
        : 'আইটেম আপডেট হয়েছে। স্থায়ী করতে "সেভ ও পাবলিশ করুন" বাটনে ক্লিক করুন।',
      'info'
    );
  };

  const handleConfirmDeleteItem = () => {
    if (!deleteTarget) return;
    updateCurrentGuide((prev) => ({
      ...prev,
      [deleteTarget.collection]: (
        prev[deleteTarget.collection] as Array<{ id: string; displayOrder: number }>
      )
        .filter((item) => item.id !== deleteTarget.id)
        .map((item, idx) => ({ ...item, displayOrder: idx + 1 })),
    }));
    onShowToast(`"${deleteTarget.title}" ড্রাফট থেকে মুছে ফেলা হয়েছে।`, 'info');
    setDeleteTarget(null);
  };

  const renderCollectionSection = (
    collection: GuideCollectionKey,
    heading?: string
  ) => {
    const rows = getCollectionRows(currentGuide, collection);
    const meta = COLLECTION_LABELS[collection];
    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = rows.findIndex((r) => r.id === String(active.id));
      const newIdx = rows.findIndex((r) => r.id === String(over.id));
      if (oldIdx !== -1 && newIdx !== -1) {
        handleReorderCollection(collection, oldIdx, newIdx);
      }
    };

    return (
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#2A0F12]">
              {heading || meta.plural} ({toBengaliNumber(rows.length)}টি)
            </h3>
            <p className="text-[11px] text-[#6B4C4F]">
              বাম পাশের গ্রিপ আইকন টেনে (Drag & Drop) আইটেমগুলোর অর্ডার সাজান, এডিট করুন বা নতুন যোগ করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAddItemModal(collection)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-sm cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন {meta.singular} যোগ করুন</span>
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rose-200 bg-white/60 p-8 text-center space-y-2.5">
            <p className="text-xs font-bold text-[#6B4C4F]">
              এই সেকশনে এখনো কোনো আইটেম নেই।
            </p>
            <button
              type="button"
              onClick={() => openAddItemModal(collection)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-white text-xs font-bold text-[#b91c1c] hover:bg-rose-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>প্রথম আইটেম যোগ করুন</span>
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {rows.map((row, idx) => (
                  <SortableGuideItemRow
                    key={row.id}
                    row={row}
                    index={idx}
                    totalCount={rows.length}
                    onMoveBy={(fromIdx, delta) =>
                      handleReorderCollection(collection, fromIdx, fromIdx + delta)
                    }
                    onToggleActive={(id) => handleToggleItemActive(collection, id)}
                    onEdit={(id) => openEditItemModal(collection, id)}
                    onRequestDelete={(id) =>
                      setDeleteTarget({ collection, id, title: row.title })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    );
  };

  const subTabs: Array<{ id: GuideEditorSubTab; label: string; count?: number }> = [
    { id: 'general', label: 'গাইড ও শিরোনাম' },
    { id: 'structure', label: 'কোর্স কাঠামো', count: currentGuide.structureItems.length },
    { id: 'bonus', label: 'ফ্রি বোনাস', count: currentGuide.bonusItems.length },
    { id: 'schedule', label: 'সময়সূচি ও বিষয়', count: currentGuide.scheduleColumns.length },
    { id: 'exclusive', label: 'এক্সক্লুসিভ ফিচার', count: currentGuide.exclusiveFeatures.length },
    {
      id: 'bundles',
      label: 'বান্ডেল ও রুটিন',
      count:
        currentGuide.bundles.length +
        currentGuide.fiveMonthItems.length +
        currentGuide.oneMonthItems.length,
    },
    { id: 'plan', label: 'কোর্স পরিকল্পনা', count: currentGuide.planAccordionItems.length },
    { id: 'pillars', label: 'অনলাইন ব্যাচ স্তম্ভ', count: currentGuide.pillars.length },
  ];

  if (loading) {
    return (
      <div className="glass-strong rounded-3xl p-10 text-center space-y-3">
        <Loader2 className="w-7 h-7 text-[#E22B2B] animate-spin mx-auto" />
        <div className="text-sm font-bold text-[#6B4C4F]">
          Guide Management কনফিগারেশন লোড হচ্ছে...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner: Guide Name + Icon + Save/Publish */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shadow-[0_8px_22px_-6px_rgba(226,43,43,0.45)] shrink-0">
              <BookOpenCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
                  Guide Management
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-[#b91c1c] text-[11px] font-bold">
                  <ClassGuideIcon
                    iconKey={currentGuide.guideIconKey}
                    fallback="book-open"
                    className="w-3 h-3"
                  />
                  <span>{currentGuide.guideName}</span>
                </span>
                {isCurrentDirty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>আনসেভড পরিবর্তন রয়েছে</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B4C4F] leading-relaxed">
                Class 6, Class 7 ও Class 8-এর গাইড সেকশন সম্পূর্ণ আলাদাভাবে কাস্টমাইজ করুন — আইটেম যোগ, এডিট, ডিলিট ও Drag & Drop করে অর্ডার পরিবর্তন করে সেভ করলেই সংশ্লিষ্ট পেজ স্বয়ংক্রিয়ভাবে আপডেট হবে।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const path = CLASS_GUIDE_META[selectedClass].publicPath;
                if (onOpenPublicPath) {
                  onOpenPublicPath(path);
                } else if (typeof window !== 'undefined') {
                  window.location.href = path;
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-[#b91c1c] text-xs font-bold transition cursor-pointer"
            >
              <span>{CLASS_GUIDE_META[selectedClass].label} পেজ দেখুন</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setResetConfirmClass(selectedClass)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#2A0F12] text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ডিফল্ট রিসেট</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAndPublish()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs sm:text-sm font-black shadow-[0_8px_22px_-6px_rgba(226,43,43,0.45)] transition cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'পাবলিশ হচ্ছে...' : 'সেভ ও পাবলিশ করুন'}</span>
            </button>
          </div>
        </div>

        {/* Step 1: Class Page Selector (Class 6, Class 7, Class 8) */}
        <div className="border-t border-rose-200/60 pt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-[#2A0F12] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#E22B2B]" />
              <span>ধাপ ১: শ্রেণি পেজ নির্বাচন করুন (Class Page Selector)</span>
            </span>
            <span className="text-[11px] font-bold text-[#6B4C4F]">
              প্রতিটি ক্লাসের ডেটা সম্পূর্ণ স্বাধীন
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CLASS_GUIDE_KEYS.map((key) => {
              const meta = CLASS_GUIDE_META[key];
              const guide = draftGuides[key];
              const isSelected = selectedClass === key;
              const isDirty = dirtyByClass[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedClass(key)}
                  className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_12px_26px_-10px_rgba(185,28,28,0.5)]'
                      : 'border-rose-200/80 bg-white/85 text-[#2A0F12] hover:border-rose-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-rose-50 border border-rose-200/70 text-[#E22B2B]'
                        }`}
                      >
                        <ClassGuideIcon
                          iconKey={guide.guideIconKey}
                          fallback="book-open"
                          className="w-5 h-5"
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-black truncate">
                          {meta.englishLabel} ({meta.label})
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-rose-50/95' : 'text-[#6B4C4F]'
                          }`}
                        >
                          {guide.guideName}
                        </div>
                      </div>
                    </div>

                    {isDirty ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-300 text-amber-950 shrink-0">
                        আনসেভড
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected
                            ? 'bg-black/20 text-white'
                            : guide.isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {guide.isEnabled ? 'পাবলিশড' : 'হাইড'}
                      </span>
                    )}
                  </div>

                  <div
                    className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-bold ${
                      isSelected
                        ? 'border-white/20 text-rose-50'
                        : 'border-rose-100 text-[#6B4C4F]'
                    }`}
                  >
                    <span>মোট আইটেম: {toBengaliNumber(countGuideItems(guide))}টি</span>
                    <span className="font-mono">{meta.publicPath}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 2: Sub-tabs for Selected Class Guide Sections */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-6">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-rose-200/60">
          {subTabs.map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition ${
                  active
                    ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                    : 'bg-white/80 border border-rose-100 text-[#2A0F12] hover:bg-rose-50 hover:text-[#b91c1c]'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-100 text-[#b91c1c]'
                    }`}
                  >
                    {toBengaliNumber(tab.count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sub-Tab 1: General Guide Name, Icon, Intro & Section Titles */}
        {activeSubTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  গাইডের নাম (Guide Name) *
                </label>
                <input
                  type="text"
                  value={currentGuide.guideName}
                  maxLength={120}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      guideName: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  গাইড আইকন (Guide Icon)
                </label>
                <div className="flex items-center gap-2">
                  <span className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-[#E22B2B] flex items-center justify-center shrink-0">
                    <ClassGuideIcon
                      iconKey={currentGuide.guideIconKey}
                      fallback="book-open"
                      className="w-5 h-5"
                    />
                  </span>
                  <select
                    value={currentGuide.guideIconKey}
                    onChange={(e) =>
                      updateCurrentGuide((prev) => ({
                        ...prev,
                        guideIconKey: e.target.value as ClassGuideIconKey,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12] focus:border-[#eb1c24] outline-none cursor-pointer"
                  >
                    {CLASS_GUIDE_ICON_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  পেজ দৃশ্যমানতা (Visibility)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      isEnabled: !prev.isEnabled,
                    }))
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition ${
                    currentGuide.isEnabled
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {currentGuide.isEnabled ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>পাবলিক পেজে সক্রিয় আছে</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>পাবলিক পেজে লুকানো আছে</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-rose-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  হেডার ব্যাজ টেক্সট
                </label>
                <input
                  type="text"
                  value={currentGuide.headerBadge}
                  maxLength={120}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      headerBadge: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  ডান পাশের সামারি পিল (Summary Pill)
                </label>
                <input
                  type="text"
                  value={currentGuide.headerSummaryPill}
                  maxLength={100}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      headerSummaryPill: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  মূল শিরোনাম (প্রথম অংশ)
                </label>
                <input
                  type="text"
                  value={currentGuide.headerTitlePrefix}
                  maxLength={160}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      headerTitlePrefix: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  মূল শিরোনাম (হাইলাইট অংশ)
                </label>
                <input
                  type="text"
                  value={currentGuide.headerTitleHighlight}
                  maxLength={180}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      headerTitleHighlight: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#b91c1c] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  হেডার বিবরণ (Header Description)
                </label>
                <textarea
                  rows={2}
                  value={currentGuide.headerDescription}
                  maxLength={600}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      headerDescription: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>
            </div>

            <div className="border-t border-rose-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  বান্ডেল সেকশন শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.bundleHeading}
                  maxLength={160}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      bundleHeading: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  অনলাইন ব্যাচ সেকশন শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.batch2027Heading}
                  maxLength={140}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      batch2027Heading: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  বান্ডেল ভূমিকা টেক্সট
                </label>
                <textarea
                  rows={2}
                  value={currentGuide.bundleIntro}
                  maxLength={500}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      bundleIntro: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  সমাপনী অঙ্গীকার বার্তা (Closing Statement)
                </label>
                <textarea
                  rows={3}
                  value={currentGuide.closingStatement}
                  maxLength={800}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      closingStatement: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Course Structure Items */}
        {activeSubTab === 'structure' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  সেকশন শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.structureHeading}
                  maxLength={160}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      structureHeading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  সেকশন উপ-শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.structureSubheading}
                  maxLength={240}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      structureSubheading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12]"
                />
              </div>
            </div>
            {renderCollectionSection('structureItems')}
          </div>
        )}

        {/* Sub-Tab 3: Free Bonus Items */}
        {activeSubTab === 'bonus' && (
          <div className="space-y-5">
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
              <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                ফ্রি বোনাস সেকশন শিরোনাম
              </label>
              <input
                type="text"
                value={currentGuide.bonusHeading}
                maxLength={160}
                onChange={(e) =>
                  updateCurrentGuide((prev) => ({
                    ...prev,
                    bonusHeading: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12]"
              />
            </div>
            {renderCollectionSection('bonusItems')}
          </div>
        )}

        {/* Sub-Tab 4: Schedule Columns */}
        {activeSubTab === 'schedule' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  সময়সূচি সেকশন শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.scheduleHeading}
                  maxLength={160}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      scheduleHeading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  সময়সূচি উপ-শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.scheduleSubheading}
                  maxLength={240}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      scheduleSubheading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12]"
                />
              </div>
            </div>
            {renderCollectionSection('scheduleColumns')}
          </div>
        )}

        {/* Sub-Tab 5: Exclusive Features */}
        {activeSubTab === 'exclusive' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  এক্সক্লুসিভ ফিচার শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.exclusiveHeading}
                  maxLength={160}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      exclusiveHeading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  এক্সক্লুসিভ ফিচার উপ-শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.exclusiveSubheading}
                  maxLength={240}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      exclusiveSubheading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12]"
                />
              </div>
            </div>
            {renderCollectionSection('exclusiveFeatures')}
          </div>
        )}

        {/* Sub-Tab 6: Bundles & 5+1 Month Routine */}
        {activeSubTab === 'bundles' && (
          <div className="space-y-8">
            {renderCollectionSection('bundles')}

            <div className="border-t border-rose-200/70 pt-6 space-y-4">
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  প্রথম ধাপের শিরোনাম (যেমন: পরীক্ষার পূর্বে ৫ মাস)
                </label>
                <input
                  type="text"
                  value={currentGuide.fiveMonthHeading}
                  maxLength={120}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      fiveMonthHeading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12]"
                />
              </div>
              {renderCollectionSection('fiveMonthItems', currentGuide.fiveMonthHeading)}
            </div>

            <div className="border-t border-rose-200/70 pt-6 space-y-4">
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  দ্বিতীয় ধাপের শিরোনাম (যেমন: পরীক্ষার প্রস্তুতি ১ মাস)
                </label>
                <input
                  type="text"
                  value={currentGuide.oneMonthHeading}
                  maxLength={120}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      oneMonthHeading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12]"
                />
              </div>
              {renderCollectionSection('oneMonthItems', currentGuide.oneMonthHeading)}
            </div>
          </div>
        )}

        {/* Sub-Tab 7: Plan 2027 Accordion */}
        {activeSubTab === 'plan' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  পরিকল্পনা সেকশন শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.planHeading}
                  maxLength={160}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      planHeading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  পরিকল্পনা উপ-শিরোনাম
                </label>
                <input
                  type="text"
                  value={currentGuide.planSubheading}
                  maxLength={240}
                  onChange={(e) =>
                    updateCurrentGuide((prev) => ({
                      ...prev,
                      planSubheading: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-[#2A0F12]"
                />
              </div>
            </div>
            {renderCollectionSection('planAccordionItems')}
          </div>
        )}

        {/* Sub-Tab 8: Batch Pillars */}
        {activeSubTab === 'pillars' && renderCollectionSection('pillars')}
      </div>

      {/* Add / Edit Item Modal */}
      {itemModal && (
        <AdminModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="গাইড আইটেম এডিটর"
            className="fixed inset-0 z-[120] bg-[#2A0F12]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          >
            <form
              onSubmit={handleSaveItemModal}
              className="w-full max-w-2xl bg-white rounded-3xl border border-rose-100 shadow-2xl overflow-hidden my-auto"
            >
              <div className="px-5 py-4 bg-gradient-to-r from-rose-50 to-white border-b border-rose-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-[#2A0F12] truncate">
                      {itemModal.mode === 'add'
                        ? `নতুন ${COLLECTION_LABELS[itemModal.collection].singular} যোগ করুন`
                        : `${COLLECTION_LABELS[itemModal.collection].singular} এডিট করুন`}
                    </h3>
                    <p className="text-[11px] text-[#6B4C4F]">
                      {CLASS_GUIDE_META[selectedClass].label} — {currentGuide.guideName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setItemModal(null)}
                  className="p-2 rounded-xl text-[#6B4C4F] hover:bg-rose-50 hover:text-[#b91c1c] cursor-pointer"
                  aria-label="বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {itemModalError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{itemModalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      {COLLECTION_LABELS[itemModal.collection].titleLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={itemModal.title}
                      onChange={(e) =>
                        setItemModal((prev) =>
                          prev ? { ...prev, title: e.target.value } : prev
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                    />
                  </div>

                  {itemModal.collection === 'exclusiveFeatures' && (
                    <div>
                      <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                        ব্যাজ টেক্সট (Badge)
                      </label>
                      <input
                        type="text"
                        value={itemModal.badge}
                        onChange={(e) =>
                          setItemModal((prev) =>
                            prev ? { ...prev, badge: e.target.value } : prev
                          )
                        }
                        placeholder="যেমন: MAP মেথডে সাজানো"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                      />
                    </div>
                  )}

                  {itemModal.collection === 'bundles' && (
                    <div>
                      <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                        সময়সীমা (Timeframe)
                      </label>
                      <input
                        type="text"
                        value={itemModal.timeframe}
                        onChange={(e) =>
                          setItemModal((prev) =>
                            prev ? { ...prev, timeframe: e.target.value } : prev
                          )
                        }
                        placeholder="যেমন: জানুয়ারি থেকে ডিসেম্বর"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                      />
                    </div>
                  )}

                  <div
                    className={
                      itemModal.collection === 'exclusiveFeatures' ||
                      itemModal.collection === 'bundles'
                        ? ''
                        : 'sm:col-span-2'
                    }
                  >
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      আইকন নির্বাচন করুন (Icon)
                    </label>
                    <select
                      value={itemModal.iconKey}
                      onChange={(e) =>
                        setItemModal((prev) =>
                          prev
                            ? { ...prev, iconKey: e.target.value as ClassGuideIconKey }
                            : prev
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none cursor-pointer"
                    >
                      {CLASS_GUIDE_ICON_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                    {COLLECTION_LABELS[itemModal.collection].descLabel}
                  </label>
                  <textarea
                    rows={3}
                    value={itemModal.description}
                    onChange={(e) =>
                      setItemModal((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                  />
                </div>

                {COLLECTION_LABELS[itemModal.collection].linesLabel && (
                  <div>
                    <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                      {COLLECTION_LABELS[itemModal.collection].linesLabel}
                    </label>
                    <textarea
                      rows={4}
                      value={itemModal.linesText}
                      onChange={(e) =>
                        setItemModal((prev) =>
                          prev ? { ...prev, linesText: e.target.value } : prev
                        )
                      }
                      placeholder="প্রতি লাইনে একটি করে পয়েন্ট লিখুন..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                    লিংক / নেভিগেশন URL (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={itemModal.linkUrl}
                    onChange={(e) =>
                      setItemModal((prev) =>
                        prev ? { ...prev, linkUrl: e.target.value } : prev
                      )
                    }
                    placeholder="/courses/slug অথবা https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                  />
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#2A0F12] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#E22B2B]" />
                      <span>ছবির URL বা আপলোড (Image)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        onChange={(e) => void handleUploadImageFile(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-[#b91c1c] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingImage ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড করুন'}</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={itemModal.imageUrl}
                    onChange={(e) =>
                      setItemModal((prev) =>
                        prev ? { ...prev, imageUrl: e.target.value } : prev
                      )
                    }
                    placeholder="/assets/aistudio/... অথবা https://..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-[#2A0F12] focus:border-[#eb1c24] outline-none"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_GUIDE_IMAGES.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setItemModal((prev) =>
                            prev ? { ...prev, imageUrl: preset.url } : prev
                          )
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition ${
                          itemModal.imageUrl === preset.url
                            ? 'bg-[#b91c1c] text-white border-[#b91c1c]'
                            : 'bg-white border-rose-200/80 text-[#6B4C4F] hover:text-[#b91c1c]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {itemModal.imageUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-rose-200 bg-white shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={itemModal.imageUrl}
                          alt={itemModal.imageAlt || itemModal.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setItemModal((prev) =>
                            prev ? { ...prev, imageUrl: '' } : prev
                          )
                        }
                        className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                      >
                        ছবি সরান
                      </button>
                    </div>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#2A0F12] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemModal.isActive}
                    onChange={(e) =>
                      setItemModal((prev) =>
                        prev ? { ...prev, isActive: e.target.checked } : prev
                      )
                    }
                    className="w-4 h-4 accent-[#E22B2B] rounded"
                  />
                  <span>পাবলিক ক্লাস পেজে দৃশ্যমান রাখুন</span>
                </label>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-rose-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setItemModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12] hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-black shadow-sm hover:opacity-95 cursor-pointer"
                >
                  {itemModal.mode === 'add' ? 'ড্রাফটে যোগ করুন' : 'আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </AdminModalPortal>
      )}

      {/* Delete Item Confirmation Modal */}
      {deleteTarget && (
        <AdminModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="আইটেম মুছে ফেলার নিশ্চিতকরণ"
            className="fixed inset-0 z-[125] bg-[#2A0F12]/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-white rounded-3xl border border-rose-100 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#2A0F12]">
                    আইটেমটি মুছে ফেলতে চান?
                  </h3>
                  <p className="text-xs text-[#6B4C4F] mt-0.5">
                    “{deleteTarget.title}” আইটেমটি ড্রাফট থেকে সরিয়ে দেওয়া হবে।
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] cursor-pointer"
                >
                  না, রাখুন
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteItem}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  হ্যাঁ, মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        </AdminModalPortal>
      )}

      {/* Reset Class Guide Confirmation Modal */}
      {resetConfirmClass && (
        <AdminModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ডিফল্ট গাইড রিসেট নিশ্চিতকরণ"
            className="fixed inset-0 z-[125] bg-[#2A0F12]/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-white rounded-3xl border border-rose-100 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#2A0F12]">
                    {CLASS_GUIDE_META[resetConfirmClass].label}-এর ডিফল্ট গাইডে ফিরে যাবেন?
                  </h3>
                  <p className="text-xs text-[#6B4C4F] mt-0.5">
                    শুধু {CLASS_GUIDE_META[resetConfirmClass].label}-এর গাইড কনফিগারেশন ডিফল্ট অবস্থায় রিসেট হবে। অন্য ক্লাসের ডেটা অপরিবর্তিত থাকবে।
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetConfirmClass(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleConfirmResetClass()}
                  className="px-4 py-2 rounded-xl bg-[#b91c1c] hover:bg-[#991b1b] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'রিসেট হচ্ছে...' : 'রিসেট করুন'}
                </button>
              </div>
            </div>
          </div>
        </AdminModalPortal>
      )}
    </div>
  );
};
