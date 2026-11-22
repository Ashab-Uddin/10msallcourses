'use client';

import React, { useMemo } from 'react';
import {
  Atom,
  BookOpen,
  Calculator,
  Cpu,
  Dna,
  FlaskConical,
  Languages,
  Layers,
  LayoutGrid,
  Package,
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
  selectedFilter: Hsc28ScienceFilterId | 'all';
  onSelectFilter: (filterId: Hsc28ScienceFilterId | 'all') => void;
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
  selectedFilter,
  onSelectFilter,
}) => {
  const counts = useMemo(() => getHsc28ScienceFilterCounts(courses), [courses]);
  const isAllActive = selectedFilter === 'all';

  const renderFilterChip = (option: Hsc28ScienceFilterOption) => {
    const Icon = FILTER_ICONS[option.id];
    const active = selectedFilter === option.id;
    const count = counts[option.id] ?? 0;
    const hasMatches = count > 0;

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onSelectFilter(option.id)}
        aria-pressed={active}
        title={option.shortHint}
        className={`h-[31px] sm:h-[33px] px-2.5 sm:px-2.5 rounded-full text-[11px] sm:text-[11.5px] font-bold leading-none transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1 border active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/40 ${
          active
            ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_5px_12px_-3px_rgba(185,28,28,0.42)]'
            : hasMatches
              ? 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/75 hover:text-[#B91C1C] shadow-2xs'
              : 'border-rose-100/90 bg-rose-50/35 text-[#7A5A5D] hover:border-rose-200 hover:bg-white/90 hover:text-[#2A0F12]'
        }`}
      >
        <Icon
          className={`w-3 h-3 shrink-0 ${
            active
              ? 'text-white'
              : hasMatches
                ? 'text-[#E22B2B]'
                : 'text-[#9E7B7E]'
          }`}
          aria-hidden="true"
        />
        <span className="leading-none">{option.label}</span>
        <span
          className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-extrabold leading-none tabular-nums bn-digits-fix shrink-0 ${
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
      className="w-full overflow-x-auto no-scrollbar scroll-smooth"
      role="region"
      aria-label="HSC 28 বিজ্ঞান কোর্স ফিল্টার"
    >
      <div
        className="flex flex-nowrap items-center justify-start lg:justify-between gap-1 sm:gap-1.5 w-max min-w-full py-0.5"
        role="radiogroup"
        aria-label="HSC 28 বিজ্ঞান কোর্সের ধরন ও বিষয় ফিল্টার"
      >
        {/* All Courses Reset Chip */}
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          aria-pressed={isAllActive}
          className={`h-[31px] sm:h-[33px] px-2.5 sm:px-3 rounded-full text-[11px] sm:text-[11.5px] font-bold leading-none transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1 border active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/40 ${
            isAllActive
              ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_5px_12px_-3px_rgba(185,28,28,0.42)]'
              : 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/75 hover:text-[#B91C1C] shadow-2xs'
          }`}
        >
          <LayoutGrid
            className={`w-3 h-3 shrink-0 ${isAllActive ? 'text-white' : 'text-[#E22B2B]'}`}
            aria-hidden="true"
          />
          <span className="leading-none">সব কোর্স</span>
          <span
            className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-extrabold leading-none tabular-nums bn-digits-fix shrink-0 ${
              isAllActive
                ? 'bg-black/20 text-white'
                : 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
            }`}
          >
            {toBengaliNumber(counts.all)}
          </span>
        </button>

        <span
          aria-hidden="true"
          className="w-px h-4 bg-rose-200/80 mx-0.5 shrink-0"
        />

        {/* Package Type Filters (বান্ডেল, নির্দিষ্ট) */}
        {HSC28_TYPE_FILTERS.map(renderFilterChip)}

        <span
          aria-hidden="true"
          className="w-px h-4 bg-rose-200/80 mx-0.5 shrink-0"
        />

        {/* Subject & Track Filters (PCMB, বায়োলজি, ফিজিক্স, কেমিস্ট্রি, ম্যাথ, BEI, বাংলা, ইংরেজি, ICT) */}
        {HSC28_SUBJECT_FILTERS.map(renderFilterChip)}
      </div>
    </div>
  );
};
