'use client';

import React, { useMemo } from 'react';
import { Category } from '../../types.ts';
import type {
  SelectorIconId,
  SelectorIconText,
} from '../../lib/selectorIconOrder.ts';
import { getOrderedSelectorIcons } from './selectorIconDefinitions.ts';

interface ClassSelectorStripProps {
  onNavigate: (path: string) => void;
  categories?: Category[];
  selectorIconOrder?: SelectorIconId[];
  selectorIconLabels?: Partial<Record<SelectorIconId, SelectorIconText>>;
}

export const ClassSelectorStrip: React.FC<ClassSelectorStripProps> = ({
  onNavigate,
  categories = [],
  selectorIconOrder,
  selectorIconLabels,
}) => {
  const categoryBySlug = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of categories) {
      map.set(cat.slug, cat);
    }
    return map;
  }, [categories]);

  const orderedIcons = useMemo(
    () => getOrderedSelectorIcons(selectorIconOrder, selectorIconLabels),
    [selectorIconOrder, selectorIconLabels]
  );

  return (
    <div className="wrap relative z-20 mt-6">
      {/* Section Strip Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E22B2B] animate-ping" />
          <span className="text-xs font-extrabold text-[#B91C1C]">
            ইন্টারেক্টিভ ক্লাস সিলেক্টর ও লাইভ ব্যাচ
          </span>
        </div>
        <span className="text-[11px] text-[#6B4C4F] hidden sm:inline-block">
          সরাসরি কাঙ্ক্ষিত ব্যাচ নির্বাচনে ক্লিক করুন
        </span>
      </div>

      {/* Frosted Glass Container */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 p-2.5 sm:p-5 rounded-3xl glass-surface">
        {orderedIcons.map((item) => {
          const IconComponent = item.Icon;
          const linkedCategory = item.categorySlug
            ? categoryBySlug.get(item.categorySlug)
            : undefined;
          return (
            <button
              key={item.id}
              type="button"
              data-category-id={linkedCategory?.id ?? undefined}
              data-category-slug={item.categorySlug}
              onClick={() => onNavigate(item.path)}
              className="group min-w-0 w-full flex flex-col items-center cursor-pointer text-left focus:outline-none"
            >
              {/* Split S-Wave Glass Card matching structural archetype */}
              <div
                className={`relative w-full aspect-square sm:aspect-auto rounded-[18px] sm:rounded-[22px] overflow-hidden border border-white/90 bg-white/80 backdrop-blur-xl shadow-[0_10px_28px_-10px_rgba(185,28,28,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ${item.hoverShadow} group-hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 flex flex-col justify-between`}
              >
                {/* TOP RICH 3D COLOR STAGE */}
                <div
                  className={`relative w-full flex-1 min-h-0 sm:flex-none sm:h-[122px] ${item.topGradient} flex flex-col items-center justify-center px-1.5 pt-4 pb-2.5 sm:px-3 sm:pb-5 sm:pt-3 overflow-hidden`}
                >
                  {/* Specular top-left glass sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-45"
                    style={{
                      background:
                        'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 55%)',
                    }}
                  />

                  {/* Compact Batch Code Tag at top-left */}
                  <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 text-[7.5px] min-[390px]:text-[8px] sm:text-[10px] font-black tracking-wider text-white/95 bg-black/20 backdrop-blur-md border border-white/25 px-1.5 sm:px-2 py-[1px] sm:py-0.5 rounded-full max-w-[calc(100%-12px)] sm:max-w-none truncate">
                    {item.tag}
                  </span>

                  {/* Centered 3D Frosted Icon Medallion */}
                  <div
                    className={`relative z-10 mt-2 sm:mt-2 w-8 h-8 min-[390px]:w-9 min-[390px]:h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${item.iconGlow} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}
                  >
                    <IconComponent className="w-4 h-4 min-[390px]:w-[18px] min-[390px]:h-[18px] sm:w-7 sm:h-7 stroke-[2.2] drop-shadow-sm" />
                  </div>

                  {/* Rising Frosted S-Curve Wave Divider */}
                  <svg
                    viewBox="0 0 240 42"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 w-full h-[13px] sm:h-[30px] pointer-events-none block"
                  >
                    <path
                      d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                      fill="rgba(255, 255, 255, 0.90)"
                    />
                  </svg>
                </div>

                {/* BOTTOM FROSTED GLASS WAVE ZONE WITH OUTLINED PILL TITLE */}
                <div className="relative shrink-0 bg-white/90 backdrop-blur-md px-1.5 pt-0.5 pb-1.5 sm:px-2.5 sm:pt-1 sm:pb-3.5 flex flex-col items-center justify-center shadow-[inset_0_-6px_12px_rgba(185,28,28,0.05)]">
                  <div
                    className={`w-full rounded-full border-[1.5px] ${item.pillBorder} ${item.pillBg} px-1.5 py-[3px] sm:px-2.5 sm:py-1.5 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),0_2px_6px_-2px_rgba(0,0,0,0.06)] group-hover:scale-[1.03] transition-transform duration-200`}
                  >
                    <span
                      className={`block font-black text-[10px] min-[390px]:text-[10.5px] sm:text-[13.5px] tracking-tight leading-tight whitespace-nowrap truncate ${item.pillText}`}
                    >
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clean Live Batch Caption below card */}
              <span
                className={`mt-1.5 sm:mt-2 text-[9px] min-[390px]:text-[9.5px] sm:text-[11px] font-bold text-center leading-tight sm:whitespace-nowrap max-w-full ${item.statusColor} opacity-90 group-hover:opacity-100 transition-opacity`}
              >
                {item.subLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
