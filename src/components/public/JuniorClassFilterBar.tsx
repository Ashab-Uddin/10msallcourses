'use client';

import React, { useMemo } from 'react';
import {
  Award,
  BookCopy,
  BookmarkCheck,
  CalendarCheck,
  CalendarRange,
  CreditCard,
  Gift,
  LayoutGrid,
  Target,
} from 'lucide-react';
import type { Course } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  JUNIOR_CLASS_FILTERS,
  getJuniorClassFilterCounts,
  type JuniorClassFilterId,
} from '../../lib/juniorClassFilters.ts';
import { AutoScrollFilterTrack } from './AutoScrollFilterTrack.tsx';

interface JuniorClassFilterBarProps {
  classLabel: string;
  courses: Course[];
  selectedFilter: JuniorClassFilterId;
  onSelectFilter: (filterId: JuniorClassFilterId) => void;
}

const FILTER_ICONS: Record<
  JuniorClassFilterId,
  React.ComponentType<{ className?: string }>
> = {
  all: LayoutGrid,
  'full-year': CalendarCheck,
  'half-yearly': CalendarRange,
  'annual-exam': Award,
  'pre-book': BookmarkCheck,
  monthly: CreditCard,
  masterbook: BookCopy,
  specific: Target,
  free: Gift,
};

export const JuniorClassFilterBar: React.FC<JuniorClassFilterBarProps> = ({
  classLabel,
  courses,
  selectedFilter,
  onSelectFilter,
}) => {
  const filterCounts = useMemo(
    () => getJuniorClassFilterCounts(courses),
    [courses]
  );

  return (
    <div
      className="bg-white/92 backdrop-blur-md rounded-2xl sm:rounded-[20px] p-1.5 sm:px-2.5 sm:py-2 border border-rose-100/90 shadow-[0_8px_24px_rgba(185,28,28,0.07)] max-w-full mx-auto"
      role="region"
      aria-label={`${classLabel} কোর্স ফিল্টার`}
    >
      <AutoScrollFilterTrack className="w-full overflow-x-auto no-scrollbar">
        <div
          className="flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5 w-max min-w-full"
          role="group"
          aria-label={`${classLabel} কোর্স ক্যাটাগরি ফিল্টারসমূহ`}
        >
          {JUNIOR_CLASS_FILTERS.map((filter) => {
            const Icon = FILTER_ICONS[filter.id];
            const count = filterCounts[filter.id] ?? 0;
            const isActive = selectedFilter === filter.id;
            const hasCourses = count > 0;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onSelectFilter(filter.id)}
                aria-pressed={isActive}
                title={filter.shortHint}
                className={`h-[28px] sm:h-[30px] px-2 sm:px-2.5 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-bold leading-none transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1 border active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E22B2B]/40 ${
                  isActive
                    ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_4px_12px_-3px_rgba(185,28,28,0.42)]'
                    : hasCourses
                      ? 'border-rose-200/90 bg-white text-[#2A0F12] hover:border-[#E22B2B]/65 hover:bg-rose-50/70 hover:text-[#B91C1C] shadow-2xs'
                      : 'border-rose-100/90 bg-rose-50/35 text-[#6B4C4F] hover:border-rose-200 hover:bg-white/90 hover:text-[#2A0F12]'
                }`}
              >
                <Icon
                  className={`w-3 h-3 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : hasCourses
                        ? 'text-[#E22B2B]'
                        : 'text-[#9E7B7E]'
                  }`}
                />
                <span className="leading-none">{filter.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-extrabold leading-none tabular-nums bn-digits-fix shrink-0 ${
                    isActive
                      ? 'bg-black/20 text-white'
                      : hasCourses
                        ? 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
                        : 'bg-white/85 text-[#7A5A5D] border border-rose-100'
                  }`}
                >
                  {toBengaliNumber(count)}
                </span>
              </button>
            );
          })}
        </div>
      </AutoScrollFilterTrack>
    </div>
  );
};
