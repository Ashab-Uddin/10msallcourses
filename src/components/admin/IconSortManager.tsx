'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  AlertCircle,
  CheckCircle2,
  ListOrdered,
  RotateCcw,
  Save,
  Sparkles,
  Type,
  Undo2,
} from 'lucide-react';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  DEFAULT_SELECTOR_ICON_IDS,
  DEFAULT_SELECTOR_ICON_TEXTS,
  SELECTOR_ICON_SUBLABEL_MAX_LENGTH,
  SELECTOR_ICON_TITLE_MAX_LENGTH,
  cloneDefaultSelectorIconLabels,
  moveSelectorIconInList,
  normalizeSelectorIconLabels,
  normalizeSelectorIconOrder,
  resolveBatchSelectorIconOrder,
  validateSelectorIconTextFields,
  type SelectorIconId,
  type SelectorIconLabelsMap,
  type SelectorIconText,
} from '../../lib/selectorIconOrder.ts';
import { getOrderedSelectorIcons } from '../public/selectorIconDefinitions.ts';

interface IconSortManagerProps {
  initialOrderedIds: SelectorIconId[];
  initialLabels: SelectorIconLabelsMap;
  onConfigSaved: (
    nextOrderedIds: SelectorIconId[],
    nextLabels: SelectorIconLabelsMap
  ) => void;
  onUnauthorized: () => void;
  onDataMutated: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function buildDraftRecord(orderedIds: ReadonlyArray<SelectorIconId>): Record<string, string> {
  const draft: Record<string, string> = {};
  orderedIds.forEach((id, idx) => {
    draft[id] = String(idx + 1);
  });
  return draft;
}

function cloneLabelsMap(
  labels: SelectorIconLabelsMap
): Record<SelectorIconId, SelectorIconText> {
  const copy = {} as Record<SelectorIconId, SelectorIconText>;
  for (const id of DEFAULT_SELECTOR_ICON_IDS) {
    copy[id] = {
      title: labels[id].title,
      subLabel: labels[id].subLabel,
    };
  }
  return copy;
}

function buildPropSignature(
  orderedIds: ReadonlyArray<SelectorIconId>,
  labels: SelectorIconLabelsMap
): string {
  const labelSig = DEFAULT_SELECTOR_ICON_IDS.map(
    (id) => `${id}=${labels[id].title}|${labels[id].subLabel}`
  ).join(';;');
  return `${orderedIds.join(',')}::${labelSig}`;
}

export const IconSortManager: React.FC<IconSortManagerProps> = ({
  initialOrderedIds,
  initialLabels,
  onConfigSaved,
  onUnauthorized,
  onDataMutated,
  onShowToast,
}) => {
  const normalizedInitialOrder = useMemo(
    () => normalizeSelectorIconOrder(initialOrderedIds),
    [initialOrderedIds]
  );
  const normalizedInitialLabels = useMemo(
    () => normalizeSelectorIconLabels(initialLabels),
    [initialLabels]
  );

  const [savedOrder, setSavedOrder] = useState<SelectorIconId[]>(() => normalizedInitialOrder);
  const [savedLabels, setSavedLabels] = useState<SelectorIconLabelsMap>(
    () => normalizedInitialLabels
  );
  const [draftPositions, setDraftPositions] = useState<Record<string, string>>(() =>
    buildDraftRecord(normalizedInitialOrder)
  );
  const [draftLabels, setDraftLabels] = useState<Record<SelectorIconId, SelectorIconText>>(() =>
    cloneLabelsMap(normalizedInitialLabels)
  );
  const [saving, setSaving] = useState(false);

  const incomingSignature = buildPropSignature(normalizedInitialOrder, normalizedInitialLabels);
  const [prevPropSignature, setPrevPropSignature] = useState<string>(() => incomingSignature);

  if (incomingSignature !== prevPropSignature) {
    setPrevPropSignature(incomingSignature);
    setSavedOrder(normalizedInitialOrder);
    setSavedLabels(normalizedInitialLabels);
    setDraftPositions(buildDraftRecord(normalizedInitialOrder));
    setDraftLabels(cloneLabelsMap(normalizedInitialLabels));
  }

  const orderedIcons = useMemo(
    () => getOrderedSelectorIcons(savedOrder, savedLabels),
    [savedOrder, savedLabels]
  );

  const batchResolution = useMemo(
    () => resolveBatchSelectorIconOrder(savedOrder, draftPositions),
    [savedOrder, draftPositions]
  );

  const labelValidationState = useMemo(() => {
    const byId = {} as Record<
      SelectorIconId,
      {
        valid: boolean;
        title: string;
        subLabel: string;
        changed: boolean;
        fieldErrors: { title?: string; subLabel?: string };
      }
    >;
    let firstError: string | null = null;
    let changedLabelsCount = 0;

    for (const id of DEFAULT_SELECTOR_ICON_IDS) {
      const draftEntry = draftLabels[id] ?? savedLabels[id];
      const savedEntry = savedLabels[id];
      const check = validateSelectorIconTextFields(draftEntry.title, draftEntry.subLabel);

      if (!check.valid) {
        if (!firstError) {
          firstError = `${savedEntry.title}: ${check.error}`;
        }
        byId[id] = {
          valid: false,
          title: draftEntry.title,
          subLabel: draftEntry.subLabel,
          changed: true,
          fieldErrors: check.fieldErrors,
        };
      } else {
        const changed =
          check.title !== savedEntry.title || check.subLabel !== savedEntry.subLabel;
        if (changed) {
          changedLabelsCount += 1;
        }
        byId[id] = {
          valid: true,
          title: check.title,
          subLabel: check.subLabel,
          changed,
          fieldErrors: {},
        };
      }
    }

    return {
      byId,
      hasInvalid: Boolean(firstError),
      firstError,
      changedLabelsCount,
    };
  }, [draftLabels, savedLabels]);

  const totalChangedCount = useMemo(() => {
    const posChanges = batchResolution.ok ? batchResolution.changedCount : 1;
    return posChanges + labelValidationState.changedLabelsCount;
  }, [batchResolution, labelValidationState.changedLabelsCount]);

  const hasUnsavedChanges = useMemo(() => {
    if (!batchResolution.ok || labelValidationState.hasInvalid) return true;
    return batchResolution.changedCount > 0 || labelValidationState.changedLabelsCount > 0;
  }, [
    batchResolution,
    labelValidationState.hasInvalid,
    labelValidationState.changedLabelsCount,
  ]);

  const previewIcons = useMemo(() => {
    const targetOrder = batchResolution.ok ? batchResolution.orderedIds : savedOrder;
    const baseList = getOrderedSelectorIcons(targetOrder, savedLabels);
    return baseList.map((icon) => {
      const draft = draftLabels[icon.id];
      const titleText = draft?.title?.trim() ? draft.title.trim() : icon.title;
      const subText = draft?.subLabel?.trim() ? draft.subLabel.trim() : icon.subLabel;
      return {
        ...icon,
        title: titleText,
        subLabel: subText,
      };
    });
  }, [batchResolution, savedOrder, savedLabels, draftLabels]);

  const conflictingSet = useMemo(() => {
    if (batchResolution.ok) return new Set<SelectorIconId>();
    return new Set<SelectorIconId>(batchResolution.conflictingIds);
  }, [batchResolution]);

  const isAlreadyDefaultConfig = useMemo(() => {
    const sameOrder =
      batchResolution.ok &&
      batchResolution.orderedIds.every((id, idx) => id === DEFAULT_SELECTOR_ICON_IDS[idx]);
    if (!sameOrder) return false;
    return DEFAULT_SELECTOR_ICON_IDS.every((id) => {
      const val = labelValidationState.byId[id];
      const def = DEFAULT_SELECTOR_ICON_TEXTS[id];
      return val.valid && val.title === def.title && val.subLabel === def.subLabel;
    });
  }, [batchResolution, labelValidationState]);

  const handlePositionInputChange = (iconId: SelectorIconId, value: string) => {
    setDraftPositions((prev) => ({
      ...prev,
      [iconId]: value,
    }));
  };

  const handleLabelInputChange = (
    iconId: SelectorIconId,
    field: 'title' | 'subLabel',
    value: string
  ) => {
    setDraftLabels((prev) => ({
      ...prev,
      [iconId]: {
        title: field === 'title' ? value : prev[iconId]?.title ?? '',
        subLabel: field === 'subLabel' ? value : prev[iconId]?.subLabel ?? '',
      },
    }));
  };

  const handleRestoreSingleDefaultLabel = (iconId: SelectorIconId) => {
    const def = DEFAULT_SELECTOR_ICON_TEXTS[iconId];
    setDraftLabels((prev) => ({
      ...prev,
      [iconId]: {
        title: def.title,
        subLabel: def.subLabel,
      },
    }));
  };

  const handleStepMove = (iconId: SelectorIconId, direction: 'up' | 'down') => {
    const baseOrder = batchResolution.ok ? batchResolution.orderedIds : savedOrder;
    const currentIdx = baseOrder.indexOf(iconId);
    if (currentIdx === -1) return;
    const targetPos = direction === 'up' ? currentIdx : currentIdx + 2;
    if (targetPos < 1 || targetPos > baseOrder.length) return;

    const nextOrder = moveSelectorIconInList(baseOrder, iconId, targetPos);
    setDraftPositions(buildDraftRecord(nextOrder));
  };

  const handleRevertDraft = () => {
    setDraftPositions(buildDraftRecord(savedOrder));
    setDraftLabels(cloneLabelsMap(savedLabels));
    onShowToast('অসংরক্ষিত পরিবর্তন বাতিল করা হয়েছে।', 'info');
  };

  const handleLoadDefaultDraft = () => {
    setDraftPositions(buildDraftRecord(DEFAULT_SELECTOR_ICON_IDS));
    setDraftLabels(cloneDefaultSelectorIconLabels());
    onShowToast(
      'ডিফল্ট ক্রম ও নাম লোড করা হয়েছে। কার্যকর করতে "সব পরিবর্তন সংরক্ষণ করুন" বাটনে ক্লিক করুন।',
      'info'
    );
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!batchResolution.ok) {
      onShowToast(batchResolution.error, 'error');
      return;
    }

    if (labelValidationState.hasInvalid) {
      onShowToast(
        labelValidationState.firstError || 'আইকনের নাম ও সাব-নাম সঠিকভাবে পূরণ করুন।',
        'error'
      );
      return;
    }

    if (
      batchResolution.changedCount === 0 &&
      labelValidationState.changedLabelsCount === 0
    ) {
      onShowToast('কোনো আইকনের পজিশন বা নাম পরিবর্তন করা হয়নি।', 'info');
      return;
    }

    const sanitizedLabelsPayload = {} as SelectorIconLabelsMap;
    for (const id of DEFAULT_SELECTOR_ICON_IDS) {
      const checked = labelValidationState.byId[id];
      sanitizedLabelsPayload[id] = {
        title: checked.title,
        subLabel: checked.subLabel,
      };
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/icon-sort', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderedIds: batchResolution.orderedIds,
          labels: sanitizedLabelsPayload,
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'আইকনের পজিশন ও নাম সংরক্ষণ করতে সমস্যা হয়েছে।');
      }

      const persistedOrder = normalizeSelectorIconOrder(
        Array.isArray(data.orderedIds) ? data.orderedIds : batchResolution.orderedIds
      );
      const persistedLabels = normalizeSelectorIconLabels(
        data.labels && typeof data.labels === 'object'
          ? data.labels
          : sanitizedLabelsPayload
      );

      setSavedOrder(persistedOrder);
      setSavedLabels(persistedLabels);
      setDraftPositions(buildDraftRecord(persistedOrder));
      setDraftLabels(cloneLabelsMap(persistedLabels));
      setPrevPropSignature(buildPropSignature(persistedOrder, persistedLabels));
      onConfigSaved(persistedOrder, persistedLabels);
      onDataMutated();
      onShowToast(
        'মেইন ওয়েবসাইটের আইকন পজিশন, নাম ও সাব-নাম সফলভাবে সংরক্ষণ ও আপডেট করা হয়েছে।',
        'success'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'আইকনের পজিশন ও নাম সংরক্ষণ করতে সমস্যা হয়েছে।';
      onShowToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    !saving &&
    batchResolution.ok &&
    !labelValidationState.hasInvalid &&
    hasUnsavedChanges;

  const activeErrorBanner = !batchResolution.ok
    ? batchResolution.error
    : labelValidationState.hasInvalid
    ? labelValidationState.firstError
    : null;

  return (
    <form onSubmit={handleSaveAll} className="space-y-5">
      {/* Top Info & Batch Action Toolbar */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#b91c1c] bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Icon Sort & Labels · মোট {toBengaliNumber(orderedIcons.length)}টি আইকন</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
              মেইন ওয়েবসাইট আইকন পজিশন, নাম ও সাব-নাম ম্যানেজার
            </h2>
            <p className="text-xs text-[#6B4C4F] leading-relaxed max-w-2xl">
              প্রতিটি আইকনের মূল নাম (Title), সাব নাম (Sub Name) বাংলা বা ইংরেজিতে এডিট করুন এবং পজিশন নম্বর (১ থেকে{' '}
              {toBengaliNumber(orderedIcons.length)}) পরিবর্তন করে একসঙ্গে Save করুন। Save করার সাথে সাথে মেইন ওয়েবসাইটে নতুন নাম ও ক্রম প্রদর্শিত হবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadDefaultDraft}
              disabled={saving || isAlreadyDefaultConfig}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white/90 hover:bg-rose-50 hover:border-rose-200 text-[#2A0F12] hover:text-[#b91c1c] text-xs font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              title="মূল সিরিয়াল ও ডিফল্ট নাম লোড করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ডিফল্ট ক্রম ও নাম</span>
            </button>

            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleRevertDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-[#991b1b] text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>বাতিল</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(226,43,43,0.45)] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? 'সংরক্ষণ হচ্ছে...'
                  : hasUnsavedChanges && !activeErrorBanner
                  ? `পরিবর্তন সংরক্ষণ করুন (${toBengaliNumber(totalChangedCount)}টি)`
                  : 'সব পরিবর্তন সংরক্ষণ করুন'}
              </span>
            </button>
          </div>
        </div>

        {/* Conflict Error or Unsaved Live Preview */}
        {activeErrorBanner ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-bold text-red-700"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{activeErrorBanner}</span>
          </div>
        ) : hasUnsavedChanges ? (
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/75 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-amber-900">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>সেভ করার পর মেইন ওয়েবসাইটে আইকনের নতুন প্রিভিউ:</span>
              </span>
              <span className="text-[11px] font-bold text-amber-700">
                কোনো ডুপ্লিকেট পজিশন বা খালি ফিল্ড নেই
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {previewIcons.map((item, idx) => {
                const prevIndex = savedOrder.indexOf(item.id);
                const moved = prevIndex !== idx;
                const textEdited = labelValidationState.byId[item.id]?.changed;
                const changed = moved || textEdited;
                return (
                  <div
                    key={`preview-${item.id}`}
                    className={`flex items-start gap-2 px-2.5 py-2 rounded-xl border text-[11px] ${
                      changed
                        ? 'bg-white border-amber-400 text-[#b91c1c] shadow-2xs'
                        : 'bg-white/75 border-amber-200/70 text-[#2A0F12]'
                    }`}
                  >
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-rose-100 text-[#b91c1c] text-[10px] font-black flex items-center justify-center shrink-0 tabular-nums">
                      {toBengaliNumber(idx + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-black truncate">{item.title}</div>
                      <div className="text-[9.5px] font-semibold text-[#6B4C4F] truncate">
                        {item.subLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-2.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              সবগুলো আইকনের পজিশন, মূল নাম ও সাব-নাম মেইন ওয়েবসাইটে সঠিকভাবে সংরক্ষিত ও সক্রিয় রয়েছে।
            </span>
          </div>
        )}
      </div>

      {/* Icon Position + Name & Sub Name Editor Rows */}
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="hidden lg:grid grid-cols-[190px_1fr_210px] items-center gap-4 px-6 py-3.5 border-b border-rose-200/60 bg-rose-50/50 text-[11px] font-black text-[#6B4C4F] uppercase tracking-wider">
          <div>ক্রম ও লাইভ আইকন প্রিভিউ</div>
          <div>আইকনের মূল নাম ও সাব-নাম এডিট</div>
          <div className="text-right">পজিশন নম্বর ও স্থানান্তর</div>
        </div>

        <div className="divide-y divide-rose-100/85">
          {orderedIcons.map((item, idx) => {
            const currentPos = idx + 1;
            const IconComponent = item.Icon;
            const draftPosVal = draftPositions[item.id] ?? String(currentPos);
            const draftLabelVal = draftLabels[item.id] ?? {
              title: item.title,
              subLabel: item.subLabel,
            };
            const labelCheck = labelValidationState.byId[item.id];
            const isConflictingPos = conflictingSet.has(item.id);
            const hasFieldError = !labelCheck.valid;
            const previewPos = batchResolution.ok
              ? batchResolution.orderedIds.indexOf(item.id) + 1
              : currentPos;
            const willMove = batchResolution.ok && previewPos !== currentPos;
            const textChanged = labelCheck.changed;
            const defText = DEFAULT_SELECTOR_ICON_TEXTS[item.id];
            const differsFromDefaultText =
              draftLabelVal.title.trim() !== defText.title ||
              draftLabelVal.subLabel.trim() !== defText.subLabel;

            const titleCharCount = Array.from(draftLabelVal.title.trim()).length;
            const subLabelCharCount = Array.from(draftLabelVal.subLabel.trim()).length;

            const livePreviewTitle = draftLabelVal.title.trim() || item.title;
            const livePreviewSub = draftLabelVal.subLabel.trim() || item.subLabel;

            return (
              <div
                key={item.id}
                className={`p-4 sm:px-6 sm:py-5 transition-colors grid grid-cols-1 lg:grid-cols-[190px_1fr_210px] items-start lg:items-center gap-4 ${
                  isConflictingPos || hasFieldError
                    ? 'bg-red-50/65'
                    : willMove || textChanged
                    ? 'bg-amber-50/45'
                    : 'hover:bg-white/60'
                }`}
              >
                {/* Column 1: Serial Badges + Faithful Live Miniature Icon Card Preview */}
                <div className="flex sm:flex-row lg:flex-col items-center sm:items-start lg:items-center gap-3">
                  <div className="flex items-center gap-1.5 self-start lg:self-auto">
                    <span className="inline-flex items-center justify-center min-w-[34px] h-7 px-2.5 rounded-xl bg-rose-100/90 border border-rose-200 text-xs font-black text-[#b91c1c] tabular-nums">
                      #{toBengaliNumber(currentPos)}
                    </span>
                    {willMove && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-black text-amber-900 tabular-nums">
                        → #{toBengaliNumber(previewPos)}
                      </span>
                    )}
                    {textChanged && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-[10px] font-extrabold text-blue-800">
                        টেক্সট এডিটেড
                      </span>
                    )}
                  </div>

                  {/* Miniature faithful preview of ClassSelectorStrip card */}
                  <div className="w-[126px] shrink-0 flex flex-col items-center">
                    <div className="relative w-full rounded-[16px] overflow-hidden border border-white/90 bg-white/85 shadow-[0_8px_20px_-8px_rgba(185,28,28,0.22)] flex flex-col">
                      <div
                        className={`relative w-full h-[68px] ${item.topGradient} flex flex-col items-center justify-center pt-3 pb-3 overflow-hidden`}
                      >
                        <span className="absolute top-1.5 left-1.5 text-[7.5px] font-black tracking-wider text-white/95 bg-black/20 border border-white/25 px-1.5 py-[1px] rounded-full truncate max-w-[92%]">
                          {item.tag}
                        </span>
                        <div
                          className={`relative z-10 mt-1.5 w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${item.iconGlow}`}
                        >
                          <IconComponent className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <svg
                          viewBox="0 0 240 42"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                          className="absolute bottom-0 left-0 w-full h-[14px] pointer-events-none block"
                        >
                          <path
                            d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                            fill="rgba(255, 255, 255, 0.92)"
                          />
                        </svg>
                      </div>
                      <div className="bg-white/95 px-2 pt-0.5 pb-2 flex items-center justify-center">
                        <div
                          className={`w-full rounded-full border ${item.pillBorder} ${item.pillBg} px-1.5 py-0.5 text-center`}
                        >
                          <span
                            className={`block font-black text-[10.5px] leading-tight truncate ${item.pillText}`}
                          >
                            {livePreviewTitle}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`mt-1 text-[10px] font-bold text-center leading-tight max-w-full truncate ${item.statusColor}`}
                    >
                      {livePreviewSub}
                    </span>
                  </div>
                </div>

                {/* Column 2: Editable Icon Name (Title) & Sub Name (Subtitle) */}
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.pillBorder} ${item.pillBg} ${item.pillText}`}
                      >
                        {item.tag}
                      </span>
                      <span className="font-mono text-[10.5px] text-slate-500 truncate">
                        {item.path}
                      </span>
                    </div>

                    {differsFromDefaultText && (
                      <button
                        type="button"
                        onClick={() => handleRestoreSingleDefaultLabel(item.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 bg-white/90 hover:bg-rose-50 hover:border-rose-200 text-[10.5px] font-bold text-[#6B4C4F] hover:text-[#b91c1c] transition cursor-pointer disabled:opacity-45"
                        title="এই আইকনের ডিফল্ট নাম ও সাব-নাম ফিরিয়ে আনুন"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>ডিফল্ট নাম</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Icon Name / Title Input */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label
                          htmlFor={`icon-title-${item.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#2A0F12]"
                        >
                          <Type className="w-3 h-3 text-[#b91c1c]" />
                          <span>আইকন নাম (Title)</span>
                        </label>
                        <span
                          className={`text-[10px] font-bold tabular-nums ${
                            titleCharCount === 0 ||
                            titleCharCount > SELECTOR_ICON_TITLE_MAX_LENGTH
                              ? 'text-red-600'
                              : 'text-[#6B4C4F]'
                          }`}
                        >
                          {toBengaliNumber(titleCharCount)} / {toBengaliNumber(SELECTOR_ICON_TITLE_MAX_LENGTH)}
                        </span>
                      </div>
                      <input
                        id={`icon-title-${item.id}`}
                        type="text"
                        value={draftLabelVal.title}
                        onChange={(e) =>
                          handleLabelInputChange(item.id, 'title', e.target.value)
                        }
                        placeholder={defText.title}
                        aria-invalid={Boolean(labelCheck.fieldErrors.title)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none shadow-2xs transition ${
                          labelCheck.fieldErrors.title
                            ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-600'
                            : 'border-slate-200 bg-white text-[#2A0F12] focus:border-[#eb1c24]'
                        }`}
                      />
                      {labelCheck.fieldErrors.title && (
                        <p className="mt-1 text-[10.5px] font-bold text-red-600">
                          {labelCheck.fieldErrors.title}
                        </p>
                      )}
                    </div>

                    {/* Icon Sub Name / Subtitle Input */}
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label
                          htmlFor={`icon-sub-${item.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#2A0F12]"
                        >
                          <span>সাব নাম (Sub Name)</span>
                        </label>
                        <span
                          className={`text-[10px] font-bold tabular-nums ${
                            subLabelCharCount === 0 ||
                            subLabelCharCount > SELECTOR_ICON_SUBLABEL_MAX_LENGTH
                              ? 'text-red-600'
                              : 'text-[#6B4C4F]'
                          }`}
                        >
                          {toBengaliNumber(subLabelCharCount)} / {toBengaliNumber(SELECTOR_ICON_SUBLABEL_MAX_LENGTH)}
                        </span>
                      </div>
                      <input
                        id={`icon-sub-${item.id}`}
                        type="text"
                        value={draftLabelVal.subLabel}
                        onChange={(e) =>
                          handleLabelInputChange(item.id, 'subLabel', e.target.value)
                        }
                        placeholder={defText.subLabel}
                        aria-invalid={Boolean(labelCheck.fieldErrors.subLabel)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none shadow-2xs transition ${
                          labelCheck.fieldErrors.subLabel
                            ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-600'
                            : 'border-slate-200 bg-white text-[#2A0F12] focus:border-[#eb1c24]'
                        }`}
                      />
                      {labelCheck.fieldErrors.subLabel && (
                        <p className="mt-1 text-[10.5px] font-bold text-red-600">
                          {labelCheck.fieldErrors.subLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Before vs After Comparison strip when edited */}
                  {textChanged && labelCheck.valid && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-50/75 px-3 py-1.5 text-[11px]">
                      <span className="text-[#6B4C4F]">
                        <strong className="text-[#2A0F12]">আগে:</strong> {item.title} ({item.subLabel})
                      </span>
                      <span className="text-amber-700 font-black">→</span>
                      <span className="text-[#b91c1c] font-bold">
                        <strong>পরে:</strong> {labelCheck.title} ({labelCheck.subLabel})
                      </span>
                    </div>
                  )}
                </div>

                {/* Column 3: Position Input & Quick Up/Down Step Controls */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`icon-pos-${item.id}`}
                      className="text-[11px] font-bold text-[#6B4C4F] whitespace-nowrap"
                    >
                      পজিশন:
                    </label>
                    <input
                      id={`icon-pos-${item.id}`}
                      type="text"
                      inputMode="numeric"
                      aria-label={`${livePreviewTitle} পজিশন নম্বর`}
                      value={draftPosVal}
                      onChange={(e) => handlePositionInputChange(item.id, e.target.value)}
                      aria-invalid={isConflictingPos}
                      className={`w-20 px-3 py-2 rounded-xl border text-xs font-mono font-black text-center outline-none shadow-2xs transition ${
                        isConflictingPos
                          ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-600'
                          : 'border-slate-200 bg-white text-[#2A0F12] focus:border-[#eb1c24]'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepMove(item.id, 'up')}
                      disabled={saving || previewPos <= 1}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/90 hover:border-rose-300 hover:bg-rose-50 text-[#2A0F12] hover:text-[#b91c1c] text-[11px] font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                      title={`${livePreviewTitle} এক ধাপ আগে নিন`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>আগে</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepMove(item.id, 'down')}
                      disabled={saving || previewPos >= orderedIcons.length}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/90 hover:border-rose-300 hover:bg-rose-50 text-[#2A0F12] hover:text-[#b91c1c] text-[11px] font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                      title={`${livePreviewTitle} এক ধাপ পরে নিন`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>পরে</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Save Footer */}
        <div className="px-6 py-4 border-t border-rose-200/60 bg-rose-50/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-semibold text-[#6B4C4F]">
            একই সাথে একাধিক আইকনের পজিশন, মূল নাম ও সাব-নাম পরিবর্তন করে এক ক্লিকেই সংরক্ষণ করতে পারবেন।
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(226,43,43,0.45)] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সব পরিবর্তন সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
