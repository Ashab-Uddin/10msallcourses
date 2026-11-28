'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowUpRight,
  BookCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Gift,
  Layers,
  ListChecks,
  Zap,
} from 'lucide-react';
import type {
  Category,
  ClassGuideConfig,
  ClassGuideKey,
} from '../../../types.ts';
import type {
  SelectorIconId,
  SelectorIconText,
} from '../../../lib/selectorIconOrder.ts';
import { getOrderedSelectorIcons } from '../selectorIconDefinitions.ts';
import { navigateHistory } from '../../../lib/navigationHistory.ts';
import { toBengaliNumber } from '../../../utils/format.ts';
import {
  cloneDefaultClassGuide,
  normalizeClassGuideConfig,
  sanitizeGuideUrl,
} from '../../../lib/classGuideDefaults.ts';
import { ClassGuideIcon } from '../../ClassGuideIcon.tsx';

const CLASS_6_TO_10_ICON_IDS: readonly SelectorIconId[] = [
  'class-6',
  'class-7',
  'class-8',
  'ssc-28',
  'ssc-27',
];

const NEXT_IMAGE_ALLOWED_HOSTS = new Set([
  'ik.imagekit.io',
  'picsum.photos',
  'cdn.10minuteschool.com',
  '10minuteschool.com',
  '10mscourses.com',
  'res.cloudinary.com',
  'images.unsplash.com',
]);

function canUseNextImage(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const parsed = new URL(src);
    const host = parsed.hostname.toLowerCase();
    return (
      NEXT_IMAGE_ALLOWED_HOSTS.has(host) ||
      host.endsWith('.10minuteschool.com') ||
      host.endsWith('.10mscourses.com') ||
      host.endsWith('.public.blob.vercel-storage.com')
    );
  } catch {
    return false;
  }
}

interface GuideResponsiveImageProps {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  onError: () => void;
}

const GuideResponsiveImage: React.FC<GuideResponsiveImageProps> = ({
  src,
  alt,
  sizes,
  className = 'object-cover',
  onError,
}) => {
  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        referrerPolicy="no-referrer"
        onError={onError}
        className={className}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={onError}
      className={`w-full h-full ${className}`}
    />
  );
};

interface Class6CourseGuideSectionProps {
  classKey?: ClassGuideKey;
  guideConfig?: ClassGuideConfig | null;
  categories?: Category[];
  selectorIconLabels?: Partial<Record<SelectorIconId, Partial<SelectorIconText>>>;
  onNavigate?: (path: string) => void;
}

export const Class6CourseGuideSection: React.FC<Class6CourseGuideSectionProps> = ({
  classKey = 'class-6',
  guideConfig,
  categories = [],
  selectorIconLabels,
  onNavigate,
}) => {
  const resolvedConfig = useMemo(
    () =>
      guideConfig
        ? normalizeClassGuideConfig(classKey, guideConfig)
        : cloneDefaultClassGuide(classKey),
    [classKey, guideConfig]
  );

  const activeStructureItems = useMemo(
    () => resolvedConfig.structureItems.filter((item) => item.isActive !== false),
    [resolvedConfig.structureItems]
  );
  const activeBonusItems = useMemo(
    () => resolvedConfig.bonusItems.filter((item) => item.isActive !== false),
    [resolvedConfig.bonusItems]
  );
  const activeScheduleColumns = useMemo(
    () => resolvedConfig.scheduleColumns.filter((item) => item.isActive !== false),
    [resolvedConfig.scheduleColumns]
  );
  const activeExclusiveFeatures = useMemo(
    () => resolvedConfig.exclusiveFeatures.filter((item) => item.isActive !== false),
    [resolvedConfig.exclusiveFeatures]
  );
  const activeBundles = useMemo(
    () => resolvedConfig.bundles.filter((item) => item.isActive !== false),
    [resolvedConfig.bundles]
  );
  const activeFiveMonthItems = useMemo(
    () => resolvedConfig.fiveMonthItems.filter((item) => item.isActive !== false),
    [resolvedConfig.fiveMonthItems]
  );
  const activeOneMonthItems = useMemo(
    () => resolvedConfig.oneMonthItems.filter((item) => item.isActive !== false),
    [resolvedConfig.oneMonthItems]
  );
  const activePlanItems = useMemo(
    () => resolvedConfig.planAccordionItems.filter((item) => item.isActive !== false),
    [resolvedConfig.planAccordionItems]
  );
  const activePillars = useMemo(
    () => resolvedConfig.pillars.filter((item) => item.isActive !== false),
    [resolvedConfig.pillars]
  );

  const [selectedBundleId, setSelectedBundleId] = useState<string>(
    () => activeBundles.find((b) => b.id === 'full-year')?.id || activeBundles[0]?.id || ''
  );
  const [openPlanId, setOpenPlanId] = useState<string>(
    () => activePlanItems[0]?.id || ''
  );
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const markImageFailed = (src: string) => {
    setFailedImages((prev) => (prev[src] ? prev : { ...prev, [src]: true }));
  };

  const class6To10Icons = useMemo(() => {
    const allResolved = getOrderedSelectorIcons(
      CLASS_6_TO_10_ICON_IDS,
      selectorIconLabels,
      categories
    );
    const byId = new Map(allResolved.map((item) => [item.id, item]));
    return CLASS_6_TO_10_ICON_IDS.map((id) => byId.get(id)).filter(
      (item): item is (typeof allResolved)[number] => Boolean(item)
    );
  }, [selectorIconLabels, categories]);

  const handleClassNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigateHistory(path);
    }
  };

  const renderItemLinkCue = (rawUrl: string, label: string) => {
    const safeUrl = sanitizeGuideUrl(rawUrl);
    if (!safeUrl) return null;
    const isExternal = /^https?:\/\//i.test(safeUrl);
    if (isExternal) {
      return (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B91C1C] hover:text-[#E22B2B] hover:underline mt-1.5"
        >
          <span>{label}</span>
          <ArrowUpRight className="w-3 h-3 shrink-0" />
        </a>
      );
    }
    return (
      <a
        href={safeUrl}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          handleClassNavigate(safeUrl);
        }}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B91C1C] hover:text-[#E22B2B] hover:underline mt-1.5"
      >
        <span>{label}</span>
        <ArrowUpRight className="w-3 h-3 shrink-0" />
      </a>
    );
  };

  if (resolvedConfig.isEnabled === false) {
    return null;
  }

  const activeBundle =
    activeBundles.find((b) => b.id === selectedBundleId) ||
    activeBundles[activeBundles.length - 1] ||
    activeBundles[0];

  return (
    <section
      aria-labelledby={`${classKey}-course-guide-heading`}
      className="max-w-[1240px] mx-auto px-4 sm:px-6 mt-12 sm:mt-14"
    >
      <div className="glass-surface rounded-3xl p-5 sm:p-8 lg:p-10 space-y-10 sm:space-y-12 overflow-hidden">
        {/* Section Intro */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-rose-200/70 pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-inset text-[#B91C1C] text-xs font-bold">
              <ClassGuideIcon
                iconKey={resolvedConfig.guideIconKey}
                fallback="sparkles"
                className="w-3.5 h-3.5 text-[#E22B2B]"
              />
              <span>{resolvedConfig.headerBadge}</span>
            </div>
            <h2
              id={`${classKey}-course-guide-heading`}
              className="text-xl sm:text-2xl lg:text-[30px] font-black text-[#2A0F12] tracking-tight leading-snug"
            >
              {resolvedConfig.headerTitlePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E22B2B] to-[#B91C1C]">
                {resolvedConfig.headerTitleHighlight}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[#6B4C4F] leading-relaxed">
              {resolvedConfig.headerDescription}
            </p>
          </div>
          {resolvedConfig.headerSummaryPill && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#B91C1C] glass-inset px-3.5 py-2 rounded-2xl shrink-0 self-start lg:self-auto tabular-nums bn-digits-fix">
              <CalendarDays className="w-4 h-4 text-[#E22B2B] shrink-0" />
              <span>{resolvedConfig.headerSummaryPill}</span>
            </div>
          )}
        </header>

        {/* ১. কোর্সটি যেভাবে সাজানো হয়েছে */}
        {activeStructureItems.length > 0 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shadow-sm shrink-0">
                  <Layers className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
                    {resolvedConfig.structureHeading}
                  </h3>
                  <p className="text-xs text-[#6B4C4F]">
                    {resolvedConfig.structureSubheading} ({toBengaliNumber(activeStructureItems.length)}টি ধাপ)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {activeStructureItems.map((item, idx) => {
                const safeImage = sanitizeGuideUrl(item.imageUrl);
                const showImg = Boolean(safeImage && !failedImages[safeImage]);
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl bg-white/75 border border-rose-100/90 p-4 sm:p-5 hover:bg-white/95 hover:border-rose-200 transition-colors shadow-2xs flex items-start gap-3.5"
                  >
                    {showImg ? (
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-rose-50 border border-rose-200/80 shrink-0">
                        <GuideResponsiveImage
                          src={safeImage}
                          alt={item.title}
                          sizes="44px"
                          onError={() => markImageFailed(safeImage)}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-[#E22B2B] flex items-center justify-center shrink-0">
                        <ClassGuideIcon
                          iconKey={item.iconKey}
                          fallback="play-circle"
                          className="w-5 h-5"
                        />
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-[#B91C1C]/75 tabular-nums bn-digits-fix">
                          {idx + 1 < 10 ? `০${toBengaliNumber(idx + 1)}` : toBengaliNumber(idx + 1)}
                        </span>
                        <h4 className="text-sm font-extrabold text-[#2A0F12] leading-snug">
                          {item.title}
                        </h4>
                      </div>
                      {item.description && (
                        <p className="text-xs text-[#6B4C4F] leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      {renderItemLinkCue(item.linkUrl, 'বিস্তারিত দেখুন')}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* এই কোর্সের সাথে ফ্রি পাচ্ছেন */}
        {activeBonusItems.length > 0 && (
          <div className="rounded-2xl bg-white/70 border border-rose-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-rose-100 text-[#B91C1C] flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#2A0F12]">
                {resolvedConfig.bonusHeading}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBonusItems.map((item, idx) => {
                const safeImage = sanitizeGuideUrl(item.imageUrl);
                const showImg = Boolean(safeImage && !failedImages[safeImage]);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white/90 border border-rose-100 p-4 flex items-center gap-3.5 sm:gap-4 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-2xl sm:text-3xl font-black text-rose-200 tabular-nums bn-digits-fix select-none leading-none">
                        {toBengaliNumber(idx + 1)}
                      </span>
                      <div className="relative w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#ff5252] to-[#b91c1c] border border-rose-200/80 shadow-xs shrink-0 flex items-center justify-center">
                        {showImg ? (
                          <GuideResponsiveImage
                            src={safeImage}
                            alt={item.imageAlt || item.title}
                            sizes="88px"
                            onError={() => markImageFailed(safeImage)}
                          />
                        ) : (
                          <ClassGuideIcon
                            iconKey={item.iconKey}
                            fallback="gift"
                            className="w-8 h-8 text-white"
                          />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <h4 className="text-sm sm:text-[15px] font-black text-[#2A0F12] leading-snug">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-[11px] text-[#6B4C4F] leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      {item.highlights.length > 0 && (
                        <ul className="space-y-1">
                          {item.highlights.map((hl) => (
                            <li
                              key={hl}
                              className="flex items-center gap-1.5 text-xs text-[#6B4C4F] font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#E22B2B] shrink-0" />
                              <span>{hl}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {renderItemLinkCue(item.linkUrl, 'অফার দেখুন')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ২. বিষয়সমূহ, ক্লাসের সময় ও মেয়াদ */}
        {activeScheduleColumns.length > 0 && (
          <div className="border-t border-rose-200/70 pt-8 sm:pt-10 space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#B91C1C] flex items-center justify-center shrink-0">
                <CalendarClock className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
                  {resolvedConfig.scheduleHeading}
                </h3>
                <p className="text-xs text-[#6B4C4F]">
                  {resolvedConfig.scheduleSubheading}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {activeScheduleColumns.map((col) => {
                const safeImage = sanitizeGuideUrl(col.imageUrl);
                const showImg = Boolean(safeImage && !failedImages[safeImage]);
                return (
                  <div
                    key={col.id}
                    className="rounded-2xl bg-white/80 border border-rose-100/90 p-5 space-y-3.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 pb-3 border-b border-rose-100">
                      <span className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/80 text-[#E22B2B] flex items-center justify-center shrink-0">
                        <ClassGuideIcon
                          iconKey={col.iconKey}
                          fallback="book-check"
                          className="w-4 h-4"
                        />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-[15px] font-black text-[#2A0F12] leading-snug">
                          {col.heading}
                        </h4>
                        {col.description && (
                          <p className="text-[11px] text-[#6B4C4F] truncate">
                            {col.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {showImg && (
                      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-rose-100">
                        <GuideResponsiveImage
                          src={safeImage}
                          alt={col.heading}
                          sizes="360px"
                          onError={() => markImageFailed(safeImage)}
                        />
                      </div>
                    )}
                    <ul className="space-y-2.5">
                      {col.points.map((pt) => (
                        <li
                          key={pt}
                          className="flex items-start gap-2 text-xs sm:text-[13px] text-[#4A2528] leading-relaxed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#E22B2B] shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                    {renderItemLinkCue(col.linkUrl, 'রুটিন / বিস্তারিত দেখুন')}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ৩. কোর্স এক্সক্লুসিভ ফিচার */}
        {activeExclusiveFeatures.length > 0 && (
          <div className="border-t border-rose-200/70 pt-8 sm:pt-10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shadow-sm shrink-0">
                  <Zap className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
                    {resolvedConfig.exclusiveHeading}
                  </h3>
                  <p className="text-xs text-[#6B4C4F]">
                    {resolvedConfig.exclusiveSubheading}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeExclusiveFeatures.map((feat) => {
                const safeImage = sanitizeGuideUrl(feat.imageUrl);
                const showImg = Boolean(safeImage && !failedImages[safeImage]);
                return (
                  <div
                    key={feat.id}
                    className="rounded-2xl bg-white/85 border border-rose-200/75 p-5 flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-[#B91C1C] text-[11px] font-bold">
                          {feat.badge || 'ফিচার'}
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-rose-50 text-[#E22B2B] flex items-center justify-center shrink-0">
                          <ClassGuideIcon
                            iconKey={feat.iconKey}
                            fallback="zap"
                            className="w-4.5 h-4.5"
                          />
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-[#2A0F12] tracking-tight">
                          {feat.title}
                        </h4>
                        {feat.tagline && (
                          <p className="text-xs font-semibold text-[#B91C1C] mt-0.5">
                            {feat.tagline}
                          </p>
                        )}
                      </div>

                      {feat.bullets.length > 0 && (
                        <ul className="space-y-2 pt-1">
                          {feat.bullets.map((line) => (
                            <li
                              key={line}
                              className="flex items-start gap-2 text-xs text-[#4A2528] leading-relaxed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#E22B2B] shrink-0 mt-0.5" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {renderItemLinkCue(feat.linkUrl, 'আরও জানুন')}
                    </div>

                    <div className="relative w-full aspect-[25/18] rounded-2xl overflow-hidden bg-gradient-to-br from-[#2A0F12] via-[#3F1419] to-[#591620] border border-rose-200/70 shadow-xs flex items-center justify-center">
                      {showImg ? (
                        <GuideResponsiveImage
                          src={safeImage}
                          alt={feat.imageAlt || feat.title}
                          sizes="(max-width: 768px) 100vw, 360px"
                          onError={() => markImageFailed(safeImage)}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-rose-100 p-4">
                          <ClassGuideIcon
                            iconKey={feat.iconKey}
                            fallback="zap"
                            className="w-8 h-8"
                          />
                          <span className="text-sm font-black">{feat.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ৪. যে যে বান্ডেল থাকছে */}
        {(activeBundles.length > 0 ||
          activeFiveMonthItems.length > 0 ||
          activeOneMonthItems.length > 0) && (
          <div className="border-t border-rose-200/70 pt-8 sm:pt-10 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#B91C1C] flex items-center justify-center shrink-0">
                  <BookCheck className="w-4.5 h-4.5" />
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
                  {resolvedConfig.bundleHeading}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#6B4C4F] leading-relaxed">
                {resolvedConfig.bundleIntro}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {activeBundles.length > 0 && (
                <div
                  role="tablist"
                  aria-label={`${resolvedConfig.guideName} বান্ডেল তালিকা`}
                  className="lg:col-span-4 flex flex-col gap-2.5"
                >
                  {activeBundles.map((bundle) => {
                    const isSelected = activeBundle?.id === bundle.id;
                    return (
                      <button
                        key={bundle.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setSelectedBundleId(bundle.id)}
                        className={`w-full text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#b91c1c] bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_10px_22px_-8px_rgba(185,28,28,0.45)]'
                            : 'border-rose-200/85 bg-white/85 text-[#2A0F12] hover:border-rose-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black leading-snug">
                            {bundle.name}
                          </span>
                          {bundle.timeframe && (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                                isSelected
                                  ? 'bg-black/20 text-white'
                                  : 'bg-rose-50 text-[#B91C1C] border border-rose-200/75'
                              }`}
                            >
                              {bundle.timeframe}
                            </span>
                          )}
                        </div>
                        {bundle.focusSummary && (
                          <p
                            className={`text-xs mt-1.5 leading-relaxed ${
                              isSelected ? 'text-rose-50/95' : 'text-[#6B4C4F]'
                            }`}
                          >
                            {bundle.focusSummary}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div
                role="tabpanel"
                aria-label={`${activeBundle?.name || 'বান্ডেল'} — যা যা থাকছে`}
                className={`${
                  activeBundles.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'
                } rounded-2xl bg-white/85 border border-rose-200/80 p-5 sm:p-6 space-y-5 shadow-2xs`}
              >
                {activeBundle && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-rose-100">
                    <div>
                      <p className="text-[11px] font-bold text-[#B91C1C]">
                        নির্বাচিত বান্ডেলের সুবিধাসমূহ
                      </p>
                      <h4 className="text-base sm:text-lg font-black text-[#2A0F12]">
                        {activeBundle.name}
                      </h4>
                      {renderItemLinkCue(activeBundle.linkUrl, 'বান্ডেল কোর্স দেখুন')}
                    </div>
                    {activeBundle.timeframe && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[#B91C1C] text-xs font-bold">
                        <CalendarDays className="w-3.5 h-3.5 text-[#E22B2B]" />
                        <span>সময়সীমা: {activeBundle.timeframe}</span>
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <h5 className="text-sm font-black text-[#B91C1C] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E22B2B]" />
                      <span>{resolvedConfig.fiveMonthHeading}</span>
                    </h5>
                    <ul className="space-y-2">
                      {activeFiveMonthItems.map((item) => (
                        <li
                          key={item.id}
                          className="text-xs leading-relaxed text-[#4A2528]"
                        >
                          <span className="font-extrabold text-[#2A0F12]">
                            {item.label}:
                          </span>{' '}
                          {item.detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2.5 md:border-l md:border-rose-100 md:pl-5">
                    <h5 className="text-sm font-black text-[#B91C1C] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E22B2B]" />
                      <span>{resolvedConfig.oneMonthHeading}</span>
                    </h5>
                    <ul className="space-y-2">
                      {activeOneMonthItems.map((item) => (
                        <li
                          key={item.id}
                          className="text-xs leading-relaxed text-[#4A2528]"
                        >
                          <span className="font-extrabold text-[#2A0F12]">
                            {item.label}:
                          </span>{' '}
                          {item.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ৫. ২০২৭ সালের কোর্স পরিকল্পনা */}
        {activePlanItems.length > 0 && (
          <div className="border-t border-rose-200/70 pt-8 sm:pt-10 space-y-5">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-rose-100 text-[#B91C1C] flex items-center justify-center shrink-0">
                <ListChecks className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#2A0F12] tracking-tight">
                  {resolvedConfig.planHeading}
                </h3>
                <p className="text-xs text-[#6B4C4F]">
                  {resolvedConfig.planSubheading}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {activePlanItems.map((item) => {
                const isOpen = openPlanId === item.id;
                const safeImage = sanitizeGuideUrl(item.imageUrl);
                const showImg = Boolean(safeImage && !failedImages[safeImage]);
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-colors ${
                      isOpen
                        ? 'bg-white/95 border-rose-300 shadow-xs'
                        : 'bg-white/75 border-rose-100/90 hover:bg-white/90 hover:border-rose-200'
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenPlanId((prev) => (prev === item.id ? '' : item.id))
                      }
                      className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-extrabold text-[#2A0F12] leading-snug">
                        {item.title}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#B91C1C] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-rose-100/80 space-y-2.5">
                        {showImg && (
                          <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-rose-100">
                            <GuideResponsiveImage
                              src={safeImage}
                              alt={item.title}
                              sizes="460px"
                              onError={() => markImageFailed(safeImage)}
                            />
                          </div>
                        )}
                        <p className="text-xs sm:text-[13px] text-[#6B4C4F] leading-relaxed">
                          {item.answer}
                        </p>
                        {renderItemLinkCue(item.linkUrl, 'লিংকে যান')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ৬. অনলাইন ব্যাচ ২০২৭ — ক্লাস ৬-১০ ও মূল স্তম্ভসমূহ */}
        <div className="border-t border-rose-200/70 pt-8 sm:pt-10 space-y-6">
          <div className="text-center space-y-4">
            <h3 className="text-xl sm:text-2xl font-black text-[#B91C1C] tracking-tight">
              {resolvedConfig.batch2027Heading}
            </h3>

            {/* Existing Class 6 - 10 Course Selector Icons with proper navigation */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-4 max-w-4xl mx-auto pt-1">
              {class6To10Icons.map((item) => {
                const IconComponent = item.Icon;
                const isCurrentClass = item.id === classKey;
                return (
                  <a
                    key={item.id}
                    href={item.path}
                    onClick={(e) => {
                      if (
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.altKey ||
                        e.button !== 0
                      ) {
                        return;
                      }
                      e.preventDefault();
                      handleClassNavigate(item.path);
                    }}
                    aria-current={isCurrentClass ? 'page' : undefined}
                    className="group min-w-0 w-full flex flex-col items-center cursor-pointer text-left focus:outline-none"
                  >
                    <div
                      className={`relative w-full aspect-square sm:aspect-auto rounded-[18px] sm:rounded-[22px] overflow-hidden border bg-white/85 backdrop-blur-xl shadow-[0_10px_28px_-10px_rgba(185,28,28,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ${item.hoverShadow} ${
                        isCurrentClass
                          ? 'border-[#E22B2B] ring-2 ring-[#E22B2B]/30'
                          : 'border-white/90'
                      } group-hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 flex flex-col justify-between`}
                    >
                      <div
                        className={`relative w-full flex-1 min-h-0 sm:flex-none sm:h-[112px] ${item.topGradient} flex flex-col items-center justify-center px-1.5 pt-4 pb-2.5 sm:px-3 sm:pb-5 sm:pt-3 overflow-hidden`}
                      >
                        <div
                          className="absolute inset-0 pointer-events-none opacity-45"
                          style={{
                            background:
                              'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 55%)',
                          }}
                        />

                        <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 text-[7.5px] min-[390px]:text-[8px] sm:text-[10px] font-black tracking-wider text-white/95 bg-black/20 backdrop-blur-md border border-white/25 px-1.5 sm:px-2 py-[1px] sm:py-0.5 rounded-full max-w-[calc(100%-12px)] sm:max-w-none truncate">
                          {item.tag}
                        </span>

                        <div
                          className={`relative z-10 mt-2 sm:mt-2 w-8 h-8 min-[390px]:w-9 min-[390px]:h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${item.iconGlow} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}
                        >
                          <IconComponent className="w-4 h-4 min-[390px]:w-[18px] min-[390px]:h-[18px] sm:w-6 sm:h-6 stroke-[2.2] drop-shadow-sm" />
                        </div>

                        <svg
                          viewBox="0 0 240 42"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                          className="absolute bottom-0 left-0 w-full h-[13px] sm:h-[28px] pointer-events-none block"
                        >
                          <path
                            d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                            fill="rgba(255, 255, 255, 0.90)"
                          />
                        </svg>
                      </div>

                      <div className="relative shrink-0 bg-white/90 backdrop-blur-md px-1.5 pt-0.5 pb-1.5 sm:px-2.5 sm:pt-1 sm:pb-3 flex flex-col items-center justify-center shadow-[inset_0_-6px_12px_rgba(185,28,28,0.05)]">
                        <div
                          className={`w-full rounded-full border-[1.5px] ${item.pillBorder} ${item.pillBg} px-1.5 py-[3px] sm:px-2 sm:py-1 text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),0_2px_6px_-2px_rgba(0,0,0,0.06)] group-hover:scale-[1.03] transition-transform duration-200`}
                        >
                          <span
                            className={`block font-black text-[10px] min-[390px]:text-[10.5px] sm:text-[13px] tracking-tight leading-tight whitespace-nowrap truncate ${item.pillText}`}
                          >
                            {item.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`mt-1.5 sm:mt-2 text-[9px] min-[390px]:text-[9.5px] sm:text-[11px] font-bold text-center leading-tight sm:whitespace-nowrap max-w-full ${item.statusColor} opacity-90 group-hover:opacity-100 transition-opacity`}
                    >
                      {item.subLabel}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          {activePillars.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activePillars.map((pillar) => {
                const safeImage = sanitizeGuideUrl(pillar.imageUrl);
                const showImg = Boolean(safeImage && !failedImages[safeImage]);
                return (
                  <div
                    key={pillar.id}
                    className="rounded-2xl bg-white/80 border border-rose-100/90 p-5 text-center space-y-2.5 shadow-2xs"
                  >
                    {showImg ? (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-rose-200/80 mx-auto">
                        <GuideResponsiveImage
                          src={safeImage}
                          alt={pillar.title}
                          sizes="48px"
                          onError={() => markImageFailed(safeImage)}
                        />
                      </div>
                    ) : (
                      <span className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-[#E22B2B] flex items-center justify-center mx-auto">
                        <ClassGuideIcon
                          iconKey={pillar.iconKey}
                          fallback="video"
                          className="w-5 h-5"
                        />
                      </span>
                    )}
                    <h4 className="text-sm sm:text-base font-black text-[#2A0F12]">
                      {pillar.title}
                    </h4>
                    {pillar.description && (
                      <p className="text-xs text-[#6B4C4F] leading-relaxed">
                        {pillar.description}
                      </p>
                    )}
                    <div className="flex justify-center">
                      {renderItemLinkCue(pillar.linkUrl, 'বিস্তারিত দেখুন')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {resolvedConfig.closingStatement && (
            <p className="text-center text-xs sm:text-sm text-[#4A2528] leading-relaxed max-w-4xl mx-auto pt-1 font-medium">
              {resolvedConfig.closingStatement}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export const ClassCourseGuideSection = Class6CourseGuideSection;
