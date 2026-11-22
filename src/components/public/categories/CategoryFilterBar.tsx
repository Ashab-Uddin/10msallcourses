'use client';

import React, { useMemo } from 'react';
import {
  Atom,
  Award,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarCheck,
  Coins,
  Cpu,
  Dna,
  Flame,
  FlaskConical,
  Globe2,
  GraduationCap,
  Landmark,
  Languages,
  Layers,
  LayoutGrid,
  Megaphone,
  Package,
  PlayCircle,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { Course } from '../../../types.ts';
import { toBengaliNumber } from '../../../utils/format.ts';
import {
  getCategoryFilterCounts,
  type CategoryFilterConfig,
  type CategoryFilterIconKey,
  type CategoryFilterOption,
} from '../../../lib/categoryFilterConfigs.ts';

interface CategoryFilterBarProps {
  config: CategoryFilterConfig;
  courses: Course[];
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
}

const FILTER_ICONS: Record<
  CategoryFilterIconKey,
  React.ComponentType<{ className?: string }>
> = {
  bundle: Package,
  specific: Target,
  pcmb: Atom,
  biology: Dna,
  physics: Zap,
  chemistry: FlaskConical,
  math: Calculator,
  geography: Globe2,
  economics: TrendingUp,
  civics: Landmark,
  finance: Coins,
  accounting: Calculator,
  management: Briefcase,
  marketing: Megaphone,
  bei: Layers,
  bangla: BookOpen,
  english: Languages,
  ict: Cpu,
  science: Atom,
  humanities: Landmark,
  business: Briefcase,
  'full-year': CalendarCheck,
  'board-exam': GraduationCap,
  smp: Flame,
  'annual-exam': Award,
  recorded: PlayCircle,
};

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  config,
  courses,
  selectedFilter,
  onSelectFilter,
}) => {
  const counts = useMemo(
    () => getCategoryFilterCounts(config, courses),
    [config, courses]
  );

  const primaryOptions = useMemo(
    () => config.options.filter((opt) => opt.group === 'primary'),
    [config.options]
  );
  const secondaryOptions = useMemo(
    () => config.options.filter((opt) => opt.group === 'secondary'),
    [config.options]
  );

  const isAllActive = selectedFilter === 'all';

  const handleChipClick = (filterId: string, buttonEl: HTMLButtonElement) => {
    const nextFilter =
      filterId === 'all' || selectedFilter === filterId ? 'all' : filterId;
    onSelectFilter(nextFilter);
    buttonEl.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  };

  const renderFilterChip = (option: CategoryFilterOption) => {
    const Icon = FILTER_ICONS[option.iconKey];
    const active = selectedFilter === option.id;
    const count = counts[option.id] ?? 0;
    const hasMatches = count > 0;

    return (
      <button
        key={option.id}
        type="button"
        onClick={(e) => handleChipClick(option.id, e.currentTarget)}
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
      aria-label={config.ariaLabel}
    >
      <div
        className="flex flex-nowrap items-center justify-start gap-1 sm:gap-1.5 w-max min-w-full py-0.5"
        role="radiogroup"
        aria-label={config.groupAriaLabel}
      >
        {/* All Courses Reset Chip */}
        <button
          type="button"
          onClick={(e) => handleChipClick('all', e.currentTarget)}
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
            {toBengaliNumber(counts.all ?? courses.length)}
          </span>
        </button>

        {primaryOptions.length > 0 && (
          <>
            <span
              aria-hidden="true"
              className="w-px h-4 bg-rose-200/80 mx-0.5 shrink-0"
            />
            {primaryOptions.map(renderFilterChip)}
          </>
        )}

        {secondaryOptions.length > 0 && (
          <>
            <span
              aria-hidden="true"
              className="w-px h-4 bg-rose-200/80 mx-0.5 shrink-0"
            />
            {secondaryOptions.map(renderFilterChip)}
          </>
        )}
      </div>
    </div>
  );
};
