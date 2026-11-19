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
  Undo2,
} from 'lucide-react';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  DEFAULT_SELECTOR_ICON_IDS,
  moveSelectorIconInList,
  normalizeSelectorIconOrder,
  resolveBatchSelectorIconOrder,
  type SelectorIconId,
} from '../../lib/selectorIconOrder.ts';
import { getOrderedSelectorIcons } from '../public/selectorIconDefinitions.ts';

interface IconSortManagerProps {
  initialOrderedIds: SelectorIconId[];
  onOrderSaved: (nextOrderedIds: SelectorIconId[]) => void;
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

export const IconSortManager: React.FC<IconSortManagerProps> = ({
  initialOrderedIds,
  onOrderSaved,
  onUnauthorized,
  onDataMutated,
  onShowToast,
}) => {
  const normalizedInitial = useMemo(
    () => normalizeSelectorIconOrder(initialOrderedIds),
    [initialOrderedIds]
  );

  const [savedOrder, setSavedOrder] = useState<SelectorIconId[]>(() => normalizedInitial);
  const [draftPositions, setDraftPositions] = useState<Record<string, string>>(() =>
    buildDraftRecord(normalizedInitial)
  );
  const [saving, setSaving] = useState(false);
  const [prevPropSignature, setPrevPropSignature] = useState<string>(() =>
    normalizedInitial.join(',')
  );

  const incomingSignature = normalizedInitial.join(',');
  if (incomingSignature !== prevPropSignature) {
    setPrevPropSignature(incomingSignature);
    setSavedOrder(normalizedInitial);
    setDraftPositions(buildDraftRecord(normalizedInitial));
  }

  const orderedIcons = useMemo(
    () => getOrderedSelectorIcons(savedOrder),
    [savedOrder]
  );

  const batchResolution = useMemo(
    () => resolveBatchSelectorIconOrder(savedOrder, draftPositions),
    [savedOrder, draftPositions]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!batchResolution.ok) return true;
    return batchResolution.changedCount > 0;
  }, [batchResolution]);

  const previewIcons = useMemo(() => {
    if (!batchResolution.ok) return orderedIcons;
    return getOrderedSelectorIcons(batchResolution.orderedIds);
  }, [batchResolution, orderedIcons]);

  const conflictingSet = useMemo(() => {
    if (batchResolution.ok) return new Set<SelectorIconId>();
    return new Set<SelectorIconId>(batchResolution.conflictingIds);
  }, [batchResolution]);

  const isAlreadyDefaultOrder = useMemo(
    () =>
      batchResolution.ok &&
      batchResolution.orderedIds.every(
        (id, idx) => id === DEFAULT_SELECTOR_ICON_IDS[idx]
      ),
    [batchResolution]
  );

  const handlePositionInputChange = (iconId: SelectorIconId, value: string) => {
    setDraftPositions((prev) => ({
      ...prev,
      [iconId]: value,
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
    onShowToast('অসংরক্ষিত পরিবর্তন বাতিল করা হয়েছে।', 'info');
  };

  const handleLoadDefaultDraft = () => {
    const defaultDraft = buildDraftRecord(DEFAULT_SELECTOR_ICON_IDS);
    setDraftPositions(defaultDraft);
    onShowToast(
      'ডিফল্ট ক্রম (১–১২) লোড করা হয়েছে। কার্যকর করতে "পজিশন সংরক্ষণ করুন" বাটনে ক্লিক করুন।',
      'info'
    );
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!batchResolution.ok) {
      onShowToast(batchResolution.error, 'error');
      return;
    }

    if (batchResolution.changedCount === 0) {
      onShowToast('কোনো আইকনের পজিশন পরিবর্তন করা হয়নি।', 'info');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/icon-sort', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderedIds: batchResolution.orderedIds }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'আইকনের পজিশন সংরক্ষণ করতে সমস্যা হয়েছে।');
      }

      const persistedOrder = normalizeSelectorIconOrder(
        Array.isArray(data.orderedIds) ? data.orderedIds : batchResolution.orderedIds
      );
      setSavedOrder(persistedOrder);
      setDraftPositions(buildDraftRecord(persistedOrder));
      setPrevPropSignature(persistedOrder.join(','));
      onOrderSaved(persistedOrder);
      onDataMutated();
      onShowToast(
        'মেইন ওয়েবসাইটের আইকন পজিশন সফলভাবে সংরক্ষণ ও আপডেট করা হয়েছে।',
        'success'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'আইকনের পজিশন সংরক্ষণ করতে সমস্যা হয়েছে।';
      onShowToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-5">
      {/* Top Info & Batch Action Toolbar */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#b91c1c] bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Icon Sort · মোট {toBengaliNumber(orderedIcons.length)}টি আইকন</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
              মেইন ওয়েবসাইট আইকন পজিশন সর্টিং (Icon Sort)
            </h2>
            <p className="text-xs text-[#6B4C4F] leading-relaxed max-w-2xl">
              যেকোনো এক বা একাধিক আইকনের পজিশন নম্বর (১ থেকে {toBengaliNumber(orderedIcons.length)}) পরিবর্তন করে একসঙ্গে Save করুন। বাকি আইকনগুলোর পজিশন স্বয়ংক্রিয়ভাবে সমন্বয় হবে এবং মেইন ওয়েবসাইটে সিরিয়াল অনুযায়ী প্রদর্শিত হবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadDefaultDraft}
              disabled={saving || isAlreadyDefaultOrder}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white/90 hover:bg-rose-50 hover:border-rose-200 text-[#2A0F12] hover:text-[#b91c1c] text-xs font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              title="১ থেকে ১২ মূল সিরিয়াল লোড করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ডিফল্ট ক্রম (১–১২)</span>
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
              disabled={saving || !batchResolution.ok || !hasUnsavedChanges}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(226,43,43,0.45)] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? 'সংরক্ষণ হচ্ছে...'
                  : hasUnsavedChanges && batchResolution.ok
                  ? `পজিশন সংরক্ষণ করুন (${toBengaliNumber(batchResolution.changedCount)}টি পরিবর্তন)`
                  : 'পজিশন সংরক্ষণ করুন'}
              </span>
            </button>
          </div>
        </div>

        {/* Conflict Error or Unsaved Live Auto-Adjusted Order Preview */}
        {!batchResolution.ok ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-bold text-red-700"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{batchResolution.error}</span>
          </div>
        ) : hasUnsavedChanges ? (
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/75 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-amber-900">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>সেভ করার পর মেইন ওয়েবসাইটে আইকনের নতুন ক্রম প্রিভিউ:</span>
              </span>
              <span className="text-[11px] font-bold text-amber-700">
                কোনো ডুপ্লিকেট পজিশন নেই
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {previewIcons.map((item, idx) => {
                const prevIndex = savedOrder.indexOf(item.id);
                const moved = prevIndex !== idx;
                return (
                  <div
                    key={`preview-${item.id}`}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${
                      moved
                        ? 'bg-white border-amber-400 text-[#b91c1c] shadow-2xs'
                        : 'bg-white/75 border-amber-200/70 text-[#2A0F12]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-[#b91c1c] text-[10px] font-black flex items-center justify-center shrink-0 tabular-nums">
                      {toBengaliNumber(idx + 1)}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-2.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              সবগুলো আইকন বর্তমানে সিরিয়াল ১ থেকে {toBengaliNumber(orderedIcons.length)} অনুযায়ী ডুপ্লিকেট-মুক্তভাবে সাজানো আছে।
            </span>
          </div>
        )}
      </div>

      {/* Icon Position Editor Rows */}
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[90px_84px_1fr_170px_210px] items-center gap-3 px-6 py-3.5 border-b border-rose-200/60 bg-rose-50/50 text-[11px] font-black text-[#6B4C4F] uppercase tracking-wider">
          <div>বর্তমান ক্রম</div>
          <div>আইকন প্রিভিউ</div>
          <div>আইকনের নাম ও লেবেল</div>
          <div>টার্গেট পজিশন (১–{toBengaliNumber(orderedIcons.length)})</div>
          <div className="text-right">দ্রুত স্থানান্তর</div>
        </div>

        <div className="divide-y divide-rose-100/80">
          {orderedIcons.map((item, idx) => {
            const currentPos = idx + 1;
            const IconComponent = item.Icon;
            const draftVal = draftPositions[item.id] ?? String(currentPos);
            const isConflicting = conflictingSet.has(item.id);
            const previewPos = batchResolution.ok
              ? batchResolution.orderedIds.indexOf(item.id) + 1
              : currentPos;
            const willMove = batchResolution.ok && previewPos !== currentPos;

            return (
              <div
                key={item.id}
                className={`p-4 sm:px-6 sm:py-4 transition-colors grid grid-cols-1 md:grid-cols-[90px_84px_1fr_170px_210px] items-center gap-3.5 ${
                  isConflicting
                    ? 'bg-red-50/70'
                    : willMove
                    ? 'bg-amber-50/45'
                    : 'hover:bg-white/60'
                }`}
              >
                {/* Column 1: Current Serial Number */}
                <div className="flex items-center justify-between md:justify-start gap-2">
                  <span className="md:hidden text-[11px] font-bold text-[#6B4C4F]">
                    বর্তমান ক্রম:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center min-w-[34px] h-8 px-2.5 rounded-xl bg-rose-100/90 border border-rose-200 text-xs font-black text-[#b91c1c] tabular-nums">
                      #{toBengaliNumber(currentPos)}
                    </span>
                    {willMove && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-black text-amber-900 tabular-nums">
                        → #{toBengaliNumber(previewPos)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Column 2: Exact Visual Icon Preview */}
                <div className="flex items-center gap-3">
                  <div
                    className={`relative w-14 h-14 rounded-2xl ${item.topGradient} ${item.iconGlow} flex items-center justify-center shrink-0 overflow-hidden shadow-md`}
                    aria-hidden="true"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/35 flex items-center justify-center text-white shadow-inner">
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="md:hidden min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-black text-[#2A0F12]">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.pillBorder} ${item.pillBg} ${item.pillText}`}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#6B4C4F] mt-0.5">
                      {item.subLabel}
                    </div>
                  </div>
                </div>

                {/* Column 3: Icon Name / Label (Desktop) */}
                <div className="hidden md:block min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-[#2A0F12]">
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${item.pillBorder} ${item.pillBg} ${item.pillText}`}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6B4C4F]">
                    <span className="font-semibold">{item.subLabel}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-[10.5px] text-slate-500">
                      {item.path}
                    </span>
                  </div>
                </div>

                {/* Column 4: Position Input Field */}
                <div>
                  <label
                    htmlFor={`icon-pos-${item.id}`}
                    className="md:hidden block text-[11px] font-bold text-[#6B4C4F] mb-1"
                  >
                    নতুন পজিশন নম্বর (১–{toBengaliNumber(orderedIcons.length)})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`icon-pos-${item.id}`}
                      type="text"
                      inputMode="numeric"
                      aria-label={`${item.title} পজিশন নম্বর`}
                      value={draftVal}
                      onChange={(e) => handlePositionInputChange(item.id, e.target.value)}
                      aria-invalid={isConflicting}
                      className={`w-24 px-3 py-2 rounded-xl border text-xs font-mono font-black text-center outline-none shadow-2xs transition ${
                        isConflicting
                          ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-600'
                          : 'border-slate-200 bg-white text-[#2A0F12] focus:border-[#eb1c24]'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-[#6B4C4F]">
                      নং পজিশন
                    </span>
                  </div>
                </div>

                {/* Column 5: Quick Up/Down Step Controls */}
                <div className="flex items-center md:justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStepMove(item.id, 'up')}
                    disabled={saving || previewPos <= 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/90 hover:border-rose-300 hover:bg-rose-50 text-[#2A0F12] hover:text-[#b91c1c] text-[11px] font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                    title={`${item.title} এক ধাপ আগে নিন`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>আগে</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepMove(item.id, 'down')}
                    disabled={saving || previewPos >= orderedIcons.length}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/90 hover:border-rose-300 hover:bg-rose-50 text-[#2A0F12] hover:text-[#b91c1c] text-[11px] font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                    title={`${item.title} এক ধাপ পরে নিন`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>পরে</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Save Footer */}
        <div className="px-6 py-4 border-t border-rose-200/60 bg-rose-50/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-semibold text-[#6B4C4F]">
            একই সাথে একাধিক আইকনের পজিশন নম্বর পরিবর্তন করে এক ক্লিকেই সংরক্ষণ করতে পারবেন।
          </div>
          <button
            type="submit"
            disabled={saving || !batchResolution.ok || !hasUnsavedChanges}
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
