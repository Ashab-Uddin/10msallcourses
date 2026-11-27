'use client';

import React, { useMemo, useState } from 'react';
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
  CheckCircle2,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  OnlineBatchPageConfig,
  OnlineBatchPageIconItem,
  OnlineBatchPageSectionConfig,
} from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  CATEGORY_ICON_OPTIONS,
  type CategoryIconKey,
} from '../../lib/categoryIcons.ts';
import { getLucideIconByKey } from '../../lib/categoryIconComponents.ts';
import {
  cloneDefaultOnlineBatchPageConfig,
  moveArrayItemToPosition,
  normalizeOnlineBatchPageConfig,
  ONLINE_BATCH_HEADER_LIMITS,
  ONLINE_BATCH_ICON_LIMITS,
  ONLINE_BATCH_ICON_ROUTE_HINTS,
  ONLINE_BATCH_SECTION_LIMITS,
} from '../../lib/onlineBatchPageConfig.ts';
import { AdminModalPortal } from './AdminModalPortal.tsx';

interface OnlineBatchPageConfigEditorProps {
  mode: 'page_content' | 'class_icons';
  config: OnlineBatchPageConfig;
  onUnauthorized: () => void;
  onConfigSaved: (nextConfig: OnlineBatchPageConfig) => void;
  onDataMutated: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface SortableSectionCardProps {
  section: OnlineBatchPageSectionConfig;
  index: number;
  totalCount: number;
  disabled: boolean;
  onMoveBy: (index: number, delta: -1 | 1) => void;
  onMoveToPosition: (index: number, targetPosition: number) => void;
  onUpdate: (
    id: OnlineBatchPageSectionConfig['id'],
    patch: Partial<OnlineBatchPageSectionConfig>
  ) => void;
}

const SortableSectionCard: React.FC<SortableSectionCardProps> = ({
  section,
  index,
  totalCount,
  disabled,
  onMoveBy,
  onMoveToPosition,
  onUpdate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  const sectionLabel =
    section.id === 'academic_program'
      ? 'Academic Program Section'
      : 'Online Batch Section';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 transition-all ${
        isDragging
          ? 'z-30 opacity-60 border-2 border-dashed border-[#eb1c24] bg-rose-50/75 shadow-inner'
          : 'bg-white/95 border-rose-100/90 shadow-2xs'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-rose-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            disabled={disabled}
            aria-label={`${sectionLabel} ড্র্যাগ করে পজিশন পরিবর্তন করুন`}
            title="টেনে (Drag) সেকশনের পজিশন পরিবর্তন করুন"
            className="w-10 h-11 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white text-[#b91c1c] flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none transition-colors disabled:opacity-40"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-[#b91c1c] tabular-nums">
                পজিশন #{toBengaliNumber(index + 1)}
              </span>
              <span className="text-xs sm:text-sm font-black text-[#2A0F12] truncate">
                {sectionLabel}
              </span>
            </div>
            <div className="text-[11px] text-[#6B4C4F]">
              {section.id === 'academic_program'
                ? 'ক্লাস ও ব্যাচ আইকন নেভিগেশন গ্রিড সেকশন'
                : 'শ্রেণিভিত্তিক অনলাইন ব্যাচ ও লাইভ কোর্স সেকশন'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#6B4C4F]">
            <span>ক্রম:</span>
            <select
              value={index + 1}
              disabled={disabled}
              onChange={(e) => onMoveToPosition(index, Number(e.target.value))}
              aria-label={`${sectionLabel} পজিশন`}
              className="px-2.5 py-2 min-h-[44px] rounded-xl border border-rose-200/90 bg-white text-xs font-extrabold text-[#2A0F12] tabular-nums cursor-pointer outline-none focus:border-[#eb1c24]"
            >
              {Array.from({ length: totalCount }, (_, i) => i + 1).map((pos) => (
                <option key={pos} value={pos}>
                  {toBengaliNumber(pos)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMoveBy(index, -1)}
            title="উপরে নিন"
            aria-label={`${sectionLabel} উপরে নিন`}
            className="w-10 h-11 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={disabled || index === totalCount - 1}
            onClick={() => onMoveBy(index, 1)}
            title="নিচে নামান"
            aria-label={`${sectionLabel} নিচে নামান`}
            className="w-10 h-11 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onUpdate(section.id, { isVisible: !section.isVisible })}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              section.isVisible
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {section.isVisible ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>দৃশ্যমান</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>হাইড</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-[#2A0F12] mb-1">
            Section Title *
          </label>
          <input
            type="text"
            value={section.title}
            maxLength={ONLINE_BATCH_SECTION_LIMITS.titleMax}
            onChange={(e) => onUpdate(section.id, { title: e.target.value })}
            placeholder={sectionLabel}
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#2A0F12] mb-1">
            Section Description
          </label>
          <input
            type="text"
            value={section.description}
            maxLength={ONLINE_BATCH_SECTION_LIMITS.descriptionMax}
            onChange={(e) => onUpdate(section.id, { description: e.target.value })}
            placeholder="সেকশনের সংক্ষিপ্ত বিবরণ..."
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
          />
        </div>
      </div>
    </div>
  );
};

interface SortableClassIconRowProps {
  item: OnlineBatchPageIconItem;
  index: number;
  totalCount: number;
  disabled: boolean;
  onMoveBy: (index: number, delta: -1 | 1) => void;
  onMoveToPosition: (index: number, targetPosition: number) => void;
  onToggleVisibility: (id: OnlineBatchPageIconItem['id']) => void;
  onEdit: (item: OnlineBatchPageIconItem) => void;
}

const SortableClassIconRow: React.FC<SortableClassIconRowProps> = ({
  item,
  index,
  totalCount,
  disabled,
  onMoveBy,
  onMoveToPosition,
  onToggleVisibility,
  onEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
        isDragging
          ? 'z-30 opacity-60 border-2 border-dashed border-[#eb1c24] bg-rose-50/75 shadow-inner'
          : !item.isVisible
            ? 'bg-slate-50/90 border-slate-200/80 opacity-75'
            : 'bg-white/95 border-rose-100/90 hover:border-rose-200 shadow-2xs'
      }`}
    >
      {/* Left: Drag + Position + Icon + Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`${item.title} ড্র্যাগ করে পজিশন পরিবর্তন করুন`}
          title="টেনে (Drag) আইকন পজিশন পরিবর্তন করুন"
          className="w-10 h-11 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white text-[#b91c1c] flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none transition-colors disabled:opacity-40"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/80 text-[#b91c1c] shrink-0 tabular-nums">
          <span className="text-[9px] font-bold uppercase leading-none">Pos</span>
          <span className="text-sm font-black leading-tight">
            {toBengaliNumber(index + 1)}
          </span>
        </div>

        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shrink-0 shadow-sm">
          {React.createElement(getLucideIconByKey(item.iconKey as CategoryIconKey), {
            className: 'w-5 h-5 stroke-[2.2]',
          })}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-[#2A0F12] truncate">
              {item.title}
            </span>
            <span className="text-[10.5px] font-extrabold text-[#b91c1c] bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md">
              {item.tag}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[#6B4C4F]">
            <span className="truncate">{item.subLabel}</span>
            <span aria-hidden="true" className="text-rose-300">
              ·
            </span>
            <span className="font-mono text-[10px] text-slate-500 truncate">
              Link:{' '}
              {(ONLINE_BATCH_ICON_ROUTE_HINTS as Record<string, string>)[item.id] ||
                '/online-batch'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Direct Position Selector + Up/Down + Visibility + Edit Button */}
      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#6B4C4F]">
          <span>পজিশন:</span>
          <select
            value={index + 1}
            disabled={disabled}
            onChange={(e) => onMoveToPosition(index, Number(e.target.value))}
            aria-label={`${item.title} পজিশন নির্বাচন`}
            className="px-2.5 py-2 min-h-[44px] rounded-xl border border-rose-200/90 bg-white text-xs font-extrabold text-[#2A0F12] tabular-nums cursor-pointer outline-none focus:border-[#eb1c24]"
          >
            {Array.from({ length: totalCount }, (_, i) => i + 1).map((pos) => (
              <option key={pos} value={pos}>
                {toBengaliNumber(pos)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={disabled || index === 0}
          onClick={() => onMoveBy(index, -1)}
          title="উপরে তুলুন"
          aria-label={`${item.title} উপরে তুলুন`}
          className="w-10 h-11 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled || index === totalCount - 1}
          onClick={() => onMoveBy(index, 1)}
          title="নিচে নামান"
          aria-label={`${item.title} নিচে নামান`}
          className="w-10 h-11 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#2A0F12] flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
        >
          <ArrowDown className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleVisibility(item.id)}
          className={`inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-bold whitespace-nowrap transition cursor-pointer ${
            item.isVisible
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
          }`}
        >
          {item.isVisible ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>চালু</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>হাইড</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onEdit(item)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold whitespace-nowrap transition cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>এডিট</span>
        </button>
      </div>
    </div>
  );
};

export const OnlineBatchPageConfigEditor: React.FC<OnlineBatchPageConfigEditorProps> = ({
  mode,
  config,
  onUnauthorized,
  onConfigSaved,
  onDataMutated,
  onShowToast,
}) => {
  const [draft, setDraft] = useState<OnlineBatchPageConfig>(() =>
    normalizeOnlineBatchPageConfig(config)
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Edit Class Icon Modal state
  const [editingIcon, setEditingIcon] = useState<OnlineBatchPageIconItem | null>(null);
  const [iconTitleInput, setIconTitleInput] = useState('');
  const [iconTagInput, setIconTagInput] = useState('');
  const [iconSubLabelInput, setIconSubLabelInput] = useState('');
  const [iconKeyInput, setIconKeyInput] = useState<CategoryIconKey>('book-open');
  const [iconVisibleInput, setIconVisibleInput] = useState(true);

  const [prevConfig, setPrevConfig] = useState(config);
  if (prevConfig !== config) {
    setPrevConfig(config);
    setDraft(normalizeOnlineBatchPageConfig(config));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isDirty = useMemo(() => {
    const normalizedCurrent = normalizeOnlineBatchPageConfig(config);
    const normalizedDraft = normalizeOnlineBatchPageConfig(draft);
    return (
      JSON.stringify({
        header: normalizedCurrent.header,
        sections: normalizedCurrent.sections,
        classIcons: normalizedCurrent.classIcons,
      }) !==
      JSON.stringify({
        header: normalizedDraft.header,
        sections: normalizedDraft.sections,
        classIcons: normalizedDraft.classIcons,
      })
    );
  }, [config, draft]);

  const persistConfig = async (
    nextConfig: OnlineBatchPageConfig,
    successToastText = 'Online Batch পেজ কনফিগারেশন সংরক্ষিত হয়েছে।'
  ) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/admin/online-batches/page-config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextConfig),
      });
      if (res.status === 401) {
        onUnauthorized();
        return false;
      }
      const data = (await res.json().catch(() => ({}))) as {
        pageConfig?: OnlineBatchPageConfig;
        config?: OnlineBatchPageConfig;
        error?: string;
      };
      const savedConfig = data.pageConfig ?? data.config;
      if (!res.ok || !savedConfig) {
        throw new Error(data.error || 'কনফিগারেশন সংরক্ষণ করতে সমস্যা হয়েছে।');
      }
      const normalizedSaved = normalizeOnlineBatchPageConfig(savedConfig);
      setDraft(normalizedSaved);
      onConfigSaved(normalizedSaved);
      onDataMutated();
      setSaveMessage({ type: 'success', text: successToastText });
      onShowToast(successToastText, 'success');
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে।';
      setSaveMessage({ type: 'error', text: msg });
      onShowToast(msg, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Section helpers
  const renumberSections = (sections: OnlineBatchPageSectionConfig[]) =>
    sections.map((sec, idx) => ({ ...sec, position: idx + 1 }));

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
      const newIndex = prev.sections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return {
        ...prev,
        sections: renumberSections(arrayMove(prev.sections, oldIndex, newIndex)),
      };
    });
  };

  const handleMoveSectionBy = (index: number, delta: -1 | 1) => {
    setDraft((prev) => ({
      ...prev,
      sections: renumberSections(
        moveArrayItemToPosition(prev.sections, index, index + 1 + delta)
      ),
    }));
  };

  const handleMoveSectionToPosition = (index: number, targetPosition: number) => {
    setDraft((prev) => ({
      ...prev,
      sections: renumberSections(
        moveArrayItemToPosition(prev.sections, index, targetPosition)
      ),
    }));
  };

  const handleUpdateSection = (
    id: OnlineBatchPageSectionConfig['id'],
    patch: Partial<OnlineBatchPageSectionConfig>
  ) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)),
    }));
  };

  // Class icon helpers
  const renumberIcons = (icons: OnlineBatchPageIconItem[]) =>
    icons.map((item, idx) => ({ ...item, position: idx + 1 }));

  const handleIconDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const oldIndex = prev.classIcons.findIndex((item) => item.id === active.id);
      const newIndex = prev.classIcons.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return {
        ...prev,
        classIcons: renumberIcons(arrayMove(prev.classIcons, oldIndex, newIndex)),
      };
    });
  };

  const handleMoveIconBy = (index: number, delta: -1 | 1) => {
    setDraft((prev) => ({
      ...prev,
      classIcons: renumberIcons(
        moveArrayItemToPosition(prev.classIcons, index, index + 1 + delta)
      ),
    }));
  };

  const handleMoveIconToPosition = (index: number, targetPosition: number) => {
    setDraft((prev) => ({
      ...prev,
      classIcons: renumberIcons(
        moveArrayItemToPosition(prev.classIcons, index, targetPosition)
      ),
    }));
  };

  const handleToggleIconVisibility = (id: OnlineBatchPageIconItem['id']) => {
    setDraft((prev) => ({
      ...prev,
      classIcons: prev.classIcons.map((item) =>
        item.id === id ? { ...item, isVisible: !item.isVisible } : item
      ),
    }));
  };

  const openEditIconModal = (item: OnlineBatchPageIconItem) => {
    setEditingIcon(item);
    setIconTitleInput(item.title);
    setIconTagInput(item.tag);
    setIconSubLabelInput(item.subLabel);
    setIconKeyInput(item.iconKey);
    setIconVisibleInput(item.isVisible);
  };

  const handleApplyIconEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIcon) return;
    if (!iconTitleInput.trim() || !iconTagInput.trim()) {
      onShowToast('ক্লাসের নাম ও ব্যাজ টেক্সট দেওয়া আবশ্যক।', 'error');
      return;
    }

    const updatedDraft: OnlineBatchPageConfig = {
      ...draft,
      classIcons: draft.classIcons.map((item) =>
        item.id === editingIcon.id
          ? {
              ...item,
              title: iconTitleInput.trim(),
              tag: iconTagInput.trim(),
              subLabel: iconSubLabelInput.trim() || item.subLabel,
              iconKey: iconKeyInput,
              isVisible: iconVisibleInput,
            }
          : item
      ),
    };

    setDraft(updatedDraft);
    setEditingIcon(null);
    await persistConfig(
      updatedDraft,
      `"${iconTitleInput.trim()}" আইকন আপডেট ও সংরক্ষণ হয়েছে।`
    );
  };

  const handleResetDefaults = () => {
    const defaults = cloneDefaultOnlineBatchPageConfig();
    if (mode === 'page_content') {
      setDraft((prev) => ({
        ...prev,
        header: defaults.header,
        sections: defaults.sections,
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        classIcons: defaults.classIcons,
      }));
    }
    setSaveMessage(null);
  };

  const iconChoices = useMemo(
    () => CATEGORY_ICON_OPTIONS.filter((opt) => opt.value !== 'auto'),
    []
  );

  return (
    <div className="space-y-5">
      {/* Status Banner */}
      {saveMessage && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-xs font-bold flex items-center gap-2 ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              : 'bg-rose-50/95 border-rose-300 text-rose-900'
          }`}
        >
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{saveMessage.text}</span>
        </div>
      )}

      {mode === 'page_content' ? (
        <div className="space-y-5">
          {/* Page Header Configuration */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/50 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#2A0F12]">
                  পেজ হেডার সেটিংস (Page Header)
                </h2>
                <p className="text-xs text-[#6B4C4F]">
                  /online-batch পেজের শীর্ষ শিরোনাম, সাবটাইটেল ও বিবরণ এখান থেকে পরিবর্তন করুন।
                </p>
              </div>
              {isDirty && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  অসংরক্ষিত পরিবর্তন রয়েছে
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1.5">
                  Page Title *
                </label>
                <input
                  type="text"
                  value={draft.header.title}
                  maxLength={ONLINE_BATCH_HEADER_LIMITS.titleMax}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      header: { ...prev.header, title: e.target.value },
                    }))
                  }
                  placeholder="একাডেমিক অনলাইন ব্যাচ 2027"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1.5">
                  Subtitle *
                </label>
                <input
                  type="text"
                  value={draft.header.subtitle}
                  maxLength={ONLINE_BATCH_HEADER_LIMITS.subtitleMax}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      header: { ...prev.header, subtitle: e.target.value },
                    }))
                  }
                  placeholder="এসএসসি ও এইচএসসি একাডেমিক প্রোগ্রাম"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1.5">
                Description *
              </label>
              <textarea
                rows={2}
                value={draft.header.description}
                maxLength={ONLINE_BATCH_HEADER_LIMITS.descriptionMax}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    header: { ...prev.header, description: e.target.value },
                  }))
                }
                placeholder="পেজের বিবরণ লিখুন..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
              />
            </div>
          </div>

          {/* Section Position & Content Ordering */}
          <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="border-b border-rose-200/50 pb-3">
              <h2 className="text-base sm:text-lg font-black text-[#2A0F12]">
                সেকশন কনটেন্ট ও পজিশন পরিবর্তন (Drag &amp; Drop / Position)
              </h2>
              <p className="text-xs text-[#6B4C4F]">
                Academic Program Section এবং Online Batch Section-এর শিরোনাম, বিবরণ ও প্রদর্শনের ক্রম (১ম / ২য়) ঠিক করুন।
              </p>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={draft.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3.5">
                  {draft.sections.map((section, idx) => (
                    <SortableSectionCard
                      key={section.id}
                      section={section}
                      index={idx}
                      totalCount={draft.sections.length}
                      disabled={saving}
                      onMoveBy={handleMoveSectionBy}
                      onMoveToPosition={handleMoveSectionToPosition}
                      onUpdate={handleUpdateSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      ) : (
        /* Class Icons Position, Drag & Drop, and Edit */
        <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/50 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#2A0F12]">
                ক্লাস ও ব্যাচ আইকন পজিশন এবং এডিট (Class Icons Manager)
              </h2>
              <p className="text-xs text-[#6B4C4F]">
                ড্র্যাগ অ্যান্ড ড্রপ, ক্রম নম্বর অথবা তীর বাটন ব্যবহার করে আইকন সাজান (যেমন: ৯ম শ্রেণি পজিশন ১-এ সেট করলে ওয়েবসাইটে প্রথমে দেখাবে)।
              </p>
            </div>
            {isDirty && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
                অসংরক্ষিত পরিবর্তন রয়েছে
              </span>
            )}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleIconDragEnd}
          >
            <SortableContext
              items={draft.classIcons.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {draft.classIcons.map((item, idx) => (
                  <SortableClassIconRow
                    key={item.id}
                    item={item}
                    index={idx}
                    totalCount={draft.classIcons.length}
                    disabled={saving}
                    onMoveBy={handleMoveIconBy}
                    onMoveToPosition={handleMoveIconToPosition}
                    onToggleVisibility={handleToggleIconVisibility}
                    onEdit={openEditIconModal}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Save / Reset Action Footer */}
      <div className="glass-surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-[#2A0F12] text-xs font-bold whitespace-nowrap transition cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>ডিফল্ট মান ফিরিয়ে আনুন</span>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void persistConfig(draft)}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-md whitespace-nowrap transition cursor-pointer disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
        </button>
      </div>

      {/* EDIT CLASS ICON MODAL */}
      {editingIcon && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
            <div className="min-h-full flex items-center justify-center">
              <form
                onSubmit={handleApplyIconEdit}
                className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 border border-white/90 shadow-2xl max-h-[90dvh] overflow-y-auto"
              >
            <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#eb1c24]" />
                <h3 className="text-base font-black text-[#2A0F12]">
                  ক্লাস আইকন সম্পাদনা: {editingIcon.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingIcon(null)}
                className="p-2 rounded-xl text-[#6B4C4F] hover:text-[#eb1c24] hover:bg-rose-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={ONLINE_BATCH_ICON_LIMITS.titleMax}
                  value={iconTitleInput}
                  onChange={(e) => setIconTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  Badge Tag *
                </label>
                <input
                  type="text"
                  required
                  maxLength={ONLINE_BATCH_ICON_LIMITS.tagMax}
                  value={iconTagInput}
                  onChange={(e) => setIconTagInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  maxLength={ONLINE_BATCH_ICON_LIMITS.subLabelMax}
                  value={iconSubLabelInput}
                  onChange={(e) => setIconSubLabelInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A0F12] mb-1">
                  প্রদর্শন অবস্থা (Visibility)
                </label>
                <select
                  value={iconVisibleInput ? 'visible' : 'hidden'}
                  onChange={(e) => setIconVisibleInput(e.target.value === 'visible')}
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] bg-white focus:border-[#eb1c24] outline-none cursor-pointer"
                >
                  <option value="visible">চালু (Visible)</option>
                  <option value="hidden">হাইড (Hidden)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1.5">
                আইকন নির্বাচন করুন (Lucide Icon)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {iconChoices.map((opt) => {
                  const OptIcon = getLucideIconByKey(opt.value);
                  const selected = iconKeyInput === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIconKeyInput(opt.value)}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition cursor-pointer ${
                        selected
                          ? 'bg-rose-50 border-[#eb1c24] text-[#b91c1c] ring-1 ring-[#eb1c24]'
                          : 'bg-white border-slate-200 text-[#2A0F12] hover:bg-rose-50/50'
                      }`}
                    >
                      <OptIcon className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-bold leading-tight truncate w-full">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rose-100">
              <button
                type="button"
                onClick={() => setEditingIcon(null)}
                className="px-4 py-2 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:bg-rose-50 cursor-pointer whitespace-nowrap"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট ও সংরক্ষণ করুন'}
              </button>
            </div>
              </form>
            </div>
          </div>
        </AdminModalPortal>
      )}
    </div>
  );
};
