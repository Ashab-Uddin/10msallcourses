'use client';

import React, { useMemo } from 'react';
import {
  BookOpen,
  Check,
  Cpu,
  Globe2,
  Landmark,
  Languages,
  Layers,
  LayoutGrid,
  Package,
  RotateCcw,
  SlidersHorizontal,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { Course } from '../../../types.ts';
import { toBengaliNumber } from '../../../utils/format.ts';
import {
  HSC28_HUMANITIES_ALL_FILTERS,
  HSC28_HUMANITIES_SUBJECT_FILTERS,
  HSC28_HUMANITIES_TYPE_FILTERS,
  getHsc28HumanitiesFilterCounts,
  type Hsc28HumanitiesFilterId,
  type Hsc28HumanitiesFilterOption,
} from '../../../lib/hsc28HumanitiesFilters.ts';
import { AutoScrollFilterTrack } from '../AutoScrollFilterTrack.tsx';

interface Hsc28HumanitiesFilterBarProps {
  courses: Course[];
  selectedFilter: Hsc28HumanitiesFilterId | 'all';
  onSelectFilter: (filterId: Hsc28HumanitiesFilterId | 'all') => void;
  onResetAll: () => void;
}

const FILTER_ICONS: Record<
  Hsc28HumanitiesFilterId,
  React.ComponentType<{ className?: string }>
> = {
  bundle: Package,
  specific: Target,
  geography: Globe2,
  economics: TrendingUp,
  civics: Landmark,
  bei: Layers,
  bangla: BookOpen,
  english: Languages,
  ict: Cpu,
};

export const Hsc28HumanitiesFilterBar: React.FC<Hsc28HumanitiesFilterBarProps> = ({
  courses,
  selectedFilter,
  onSelectFilter,
  onResetAll,
}) => {
  const counts = useMemo(() => getHsc28HumanitiesFilterCounts(courses), [courses]);

  const isAllActive = selectedFilter === 'all';
  const activeOption = useMemo(
    () =>
      selectedFilter === 'all'
        ? null
        : HSC28_HUMANITIES_ALL_FILTERS.find((opt) => opt.id === selectedFilter) || null,
    [selectedFilter]
  );

  const orderedOptions = useMemo(
    () => [...HSC28_HUMANITIES_TYPE_FILTERS, ...HSC28_HUMANITIES_SUBJECT_FILTERS],
    []
  );

  const handleChipClick = (filterId: Hsc28HumanitiesFilterId | 'all') => {
    onSelectFilter(filterId);
  };

  const renderFilterChip = (option: Hsc28HumanitiesFilterOption) => {
    const Icon = FILTER_ICONS[option.id];
    const active = selectedFilter === option.id;
    const count = counts[option.id] ?? 0;
    const hasMatches = count > 0;

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => handleChipClick(option.id)}
        aria-pressed={active}
        title={option.shortHint}
        className={`w-auto lg:w-full shrink-0 lg:shrink h-[29px] sm:h-[31px] lg:h-[33px] px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold leading-none transition-all duration-150 cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1 border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/40 ${
          active
            ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_6px_14px_-4px_rgba(185,28,28,0.42)]'
            : hasMatches
              ? 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/80 hover:text-[#B91C1C] shadow-2xs'
              : 'border-rose-100/90 bg-white/70 text-[#7A5A5D] hover:border-rose-200 hover:bg-white hover:text-[#2A0F12]'
        }`}
      >
        {active ? (
          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white shrink-0 stroke-[2.6]" aria-hidden="true" />
        ) : (
          <Icon
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
              hasMatches ? 'text-[#E22B2B]' : 'text-[#9E7B7E]'
            }`}
            aria-hidden="true"
          />
        )}
        <span className="leading-none whitespace-nowrap">{option.label}</span>
        <span
          className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] sm:text-[10px] font-extrabold leading-none tabular-nums bn-digits-fix shrink-0 ${
            active
              ? 'bg-black/20 text-white'
              : hasMatches
                ? 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
                : 'bg-rose-50/60 text-[#7A5A5D] border border-rose-100'
          }`}
        >
          {toBengaliNumber(count)}
        </span>
      </button>
    );
  };

  return (
    <div
      className="space-y-2"
      role="region"
      aria-label="HSC 28 মানবিক কোর্স ফিল্টার"
    >
      {/* Centered Filter Metadata Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold text-[#6B4C4F]">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#2A0F12]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E22B2B]" aria-hidden="true" />
            <span>ফিল্টার অপশন</span>
          </span>
          <span className="text-rose-300" aria-hidden="true">•</span>
          <span className="text-[11px] text-[#7A5A5D]">
            যেকোনো একটি ফিল্টার নির্বাচন করুন
          </span>
          {activeOption && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#B91C1C] text-[10.5px] font-extrabold">
              সক্রিয়: {activeOption.label}
            </span>
          )}
        </div>

        {!isAllActive && (
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-rose-200 bg-rose-50/90 hover:bg-rose-100 text-[#B91C1C] text-[11px] font-bold transition cursor-pointer shrink-0 active:scale-[0.97]"
          >
            <RotateCcw className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>ফিল্টার রিসেট</span>
          </button>
        )}
      </div>

      {/* Mobile & Tablet (<lg): 1 Single Horizontal Line | Laptop (lg+): 2 Equal Lines (5x2 Grid) */}
      <div className="rounded-xl sm:rounded-2xl bg-white/65 border border-rose-100/95 p-1 sm:p-1.5 shadow-2xs">
        <AutoScrollFilterTrack
          className="min-w-0 w-full flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar lg:grid lg:grid-cols-5 lg:gap-1.5 lg:overflow-visible"
          role="group"
          ariaLabel="HSC 28 মানবিক কোর্সের ধরন ও বিষয় ফিল্টার"
        >
          {/* Button 1: All Courses */}
          <button
            type="button"
            onClick={() => handleChipClick('all')}
            aria-pressed={isAllActive}
            className={`w-auto lg:w-full shrink-0 lg:shrink h-[29px] sm:h-[31px] lg:h-[33px] px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold leading-none transition-all duration-150 cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1 border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/40 ${
              isAllActive
                ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_6px_14px_-4px_rgba(185,28,28,0.42)]'
                : 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/80 hover:text-[#B91C1C] shadow-2xs'
            }`}
          >
            <LayoutGrid
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isAllActive ? 'text-white' : 'text-[#E22B2B]'}`}
              aria-hidden="true"
            />
            <span className="leading-none whitespace-nowrap">সব কোর্স</span>
            <span
              className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] sm:text-[10px] font-extrabold leading-none tabular-nums bn-digits-fix shrink-0 ${
                isAllActive
                  ? 'bg-black/20 text-white'
                  : 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
              }`}
            >
              {toBengaliNumber(counts.all)}
            </span>
          </button>

          {/* Buttons 2-10: Types + Subjects */}
          {orderedOptions.map(renderFilterChip)}
        </AutoScrollFilterTrack>
      </div>
    </div>
  );
};
