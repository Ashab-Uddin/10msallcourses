'use client';

import React, { useMemo } from 'react';
import {
  Atom,
  BookOpen,
  Calculator,
  Check,
  Cpu,
  Dna,
  FlaskConical,
  Languages,
  Layers,
  LayoutGrid,
  Package,
  RotateCcw,
  SlidersHorizontal,
  Target,
  Zap,
} from 'lucide-react';
import type { Course } from '../../../types.ts';
import { toBengaliNumber } from '../../../utils/format.ts';
import {
  HSC28_SUBJECT_FILTERS,
  HSC28_TYPE_FILTERS,
  getHsc28ScienceFilterCounts,
  type Hsc28ScienceFilterId,
  type Hsc28ScienceFilterOption,
} from '../../../lib/hsc28ScienceFilters.ts';

interface Hsc28ScienceFilterBarProps {
  courses: Course[];
  selectedFilters: Hsc28ScienceFilterId[];
  onToggleFilter: (filterId: Hsc28ScienceFilterId | 'all') => void;
  onResetAll: () => void;
  hasSearchQuery: boolean;
}

const FILTER_ICONS: Record<
  Hsc28ScienceFilterId,
  React.ComponentType<{ className?: string }>
> = {
  bundle: Package,
  specific: Target,
  pcmb: Atom,
  biology: Dna,
  physics: Zap,
  chemistry: FlaskConical,
  math: Calculator,
  bei: Layers,
  bangla: BookOpen,
  english: Languages,
  ict: Cpu,
};

export const Hsc28ScienceFilterBar: React.FC<Hsc28ScienceFilterBarProps> = ({
  courses,
  selectedFilters,
  onToggleFilter,
  onResetAll,
  hasSearchQuery,
}) => {
  const counts = useMemo(() => getHsc28ScienceFilterCounts(courses), [courses]);
  const isAllActive = selectedFilters.length === 0;
  const hasAnyActiveControl = selectedFilters.length > 0 || hasSearchQuery;

  const renderFilterChip = (option: Hsc28ScienceFilterOption) => {
    const Icon = FILTER_ICONS[option.id];
    const active = selectedFilters.includes(option.id);
    const count = counts[option.id] ?? 0;
    const hasMatches = count > 0;

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onToggleFilter(option.id)}
        aria-pressed={active}
        title={option.shortHint}
        className={`h-[34px] sm:h-[36px] px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold leading-none transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 border active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/40 ${
          active
            ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_6px_14px_-4px_rgba(185,28,28,0.42)]'
            : hasMatches
              ? 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/75 hover:text-[#B91C1C] shadow-2xs'
              : 'border-rose-100/90 bg-rose-50/35 text-[#7A5A5D] hover:border-rose-200 hover:bg-white/90 hover:text-[#2A0F12]'
        }`}
      >
        {active ? (
          <Check className="w-3 h-3 text-white shrink-0 stroke-[2.6]" aria-hidden="true" />
        ) : (
          <Icon
            className={`w-3.5 h-3.5 shrink-0 ${
              hasMatches ? 'text-[#E22B2B]' : 'text-[#9E7B7E]'
            }`}
            aria-hidden="true"
          />
        )}
        <span className="leading-none">{option.label}</span>
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold leading-none tabular-nums bn-digits-fix shrink-0 ${
            active
              ? 'bg-black/20 text-white'
              : hasMatches
                ? 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
                : 'bg-white/90 text-[#7A5A5D] border border-rose-100'
          }`}
        >
          {toBengaliNumber(count)}
        </span>
      </button>
    );
  };

  return (
    <div
      className="space-y-3"
      role="region"
      aria-label="HSC 28 বিজ্ঞান কোর্স ফিল্টার"
    >
      {/* Top Filter Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-semibold text-[#6B4C4F]">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#2A0F12]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E22B2B]" aria-hidden="true" />
            <span>ফিল্টার অপশন</span>
          </span>
          <span className="hidden sm:inline text-rose-300" aria-hidden="true">•</span>
          <span className="text-[11px] text-[#7A5A5D]">
            একাধিক ফিল্টার একসাথে সিলেক্ট করা যাবে
          </span>
          {selectedFilters.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[#B91C1C] text-[10.5px] font-extrabold tabular-nums bn-digits-fix">
              {toBengaliNumber(selectedFilters.length)}টি সক্রিয়
            </span>
          )}
        </div>

        {hasAnyActiveControl && (
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/90 hover:bg-rose-100 text-[#B91C1C] text-[11px] font-bold transition cursor-pointer shrink-0 active:scale-[0.97]"
          >
            <RotateCcw className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>সব রিসেট করুন</span>
          </button>
        )}
      </div>

      {/* Unified Multi-Filter Button Strip */}
      <div
        className="flex flex-wrap items-center gap-1.5 sm:gap-2"
        role="group"
        aria-label="HSC 28 বিজ্ঞান কোর্সের ধরন ও বিষয় ফিল্টার"
      >
        {/* All Courses Reset Chip */}
        <button
          type="button"
          onClick={() => onToggleFilter('all')}
          aria-pressed={isAllActive}
          className={`h-[34px] sm:h-[36px] px-2.5 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold leading-none transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 border active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/40 ${
            isAllActive
              ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_6px_14px_-4px_rgba(185,28,28,0.42)]'
              : 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/75 hover:text-[#B91C1C] shadow-2xs'
          }`}
        >
          <LayoutGrid
            className={`w-3.5 h-3.5 shrink-0 ${isAllActive ? 'text-white' : 'text-[#E22B2B]'}`}
            aria-hidden="true"
          />
          <span className="leading-none">সব কোর্স</span>
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold leading-none tabular-nums bn-digits-fix shrink-0 ${
              isAllActive
                ? 'bg-black/20 text-white'
                : 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
            }`}
          >
            {toBengaliNumber(counts.all)}
          </span>
        </button>

        {/* Subtle Visual Divider between All & Type Filters */}
        <span
          aria-hidden="true"
          className="hidden sm:inline-block w-px h-5 bg-rose-200/80 mx-0.5 shrink-0"
        />

        {/* Package Type Filters (বান্ডেল, নির্দিষ্ট) */}
        {HSC28_TYPE_FILTERS.map(renderFilterChip)}

        {/* Subtle Visual Divider between Type & Subject Filters */}
        <span
          aria-hidden="true"
          className="hidden sm:inline-block w-px h-5 bg-rose-200/80 mx-0.5 shrink-0"
        />

        {/* Subject & Track Filters (PCMB, বায়োলজি, ফিজিক্স, কেমিস্ট্রি, ম্যাথ, BEI, বাংলা, ইংরেজি, ICT) */}
        {HSC28_SUBJECT_FILTERS.map(renderFilterChip)}
      </div>
    </div>
  );
};
