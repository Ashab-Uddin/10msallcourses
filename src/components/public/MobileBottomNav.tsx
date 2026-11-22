'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Home,
  GraduationCap,
  Award,
  Briefcase,
  ShoppingBag,
  X,
  ArrowRight,
  Check,
} from 'lucide-react';
import type { Category, Course } from '../../types.ts';
import {
  getNavbarCategoriesByGroup,
  type NavbarGroupKey,
} from '../../lib/navbarCategories.ts';
import { resolveCategoryCardTheme } from '../../lib/categoryIcons.ts';
import { getCategoryLucideIcon, getNavbarGroupLucideIcon } from '../../lib/categoryIconComponents.ts';
import { categorySlugsMatch, courseMatchesCategorySlug } from '../../lib/categoryMatching.ts';
import { buildReadableCategoryPath, decodeCourseSlug } from '../../lib/courseSlug.ts';
import { useHistoryOverlay } from '../../lib/navigationHistory.ts';
import { toBengaliNumber } from '../../utils/format.ts';

export type MobileTab = 'home' | 'hsc27' | 'hsc28' | 'school' | 'admission' | 'books' | 'skills';

type SheetGroupKey = NavbarGroupKey;

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  categories?: Category[];
  courses?: Course[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

interface NavItem {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SHEET_HEADER_META: Record<
  SheetGroupKey,
  {
    title: string;
    subtitle: string;
    overviewPath: string;
    overviewLabel: string;
  }
> = {
  hsc28: {
    title: 'HSC 28 ক্যাটাগরি সমূহ',
    subtitle: 'বিভাগ অনুযায়ী কোর্স নির্বাচন করুন',
    overviewPath: '/hsc/hsc-28',
    overviewLabel: 'সব HSC 28',
  },
  hsc27: {
    title: 'HSC 27 ক্যাটাগরি সমূহ',
    subtitle: 'দ্বিতীয় বর্ষ ও রিভিশন প্রোগ্রাম',
    overviewPath: '/hsc/hsc-27',
    overviewLabel: 'সব HSC 27',
  },
  school: {
    title: 'ক্লাস ৬–১২ ক্যাটাগরি সমূহ',
    subtitle: 'শ্রেণি অনুযায়ী অনলাইন ব্যাচ',
    overviewPath: '/ssc/ssc-27',
    overviewLabel: 'ক্লাস ওভারভিউ',
  },
  admission: {
    title: 'ভর্তি পরীক্ষা ক্যাটাগরি',
    subtitle: 'বিশ্ববিদ্যালয় ও মেডিকেল প্রস্তুতি',
    overviewPath: '/admission',
    overviewLabel: 'সব ভর্তি কোর্স',
  },
  skills: {
    title: 'স্কিলস ও বিশেষ কোর্স',
    subtitle: 'ক্যারিয়ার ও আইটি দক্ষতা উন্নয়ন',
    overviewPath: '/skills',
    overviewLabel: 'সব স্কিলস',
  },
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  categories = [],
  courses = [],
  currentPath = '/',
  onNavigate,
}) => {
  const [openSheetState, setOpenSheetState] = useState<{
    group: SheetGroupKey;
    path: string;
  } | null>(null);
  const openGroup: SheetGroupKey | null =
    openSheetState && openSheetState.path === currentPath ? openSheetState.group : null;
  const setOpenGroup = (
    next:
      | SheetGroupKey
      | null
      | ((prev: SheetGroupKey | null) => SheetGroupKey | null)
  ) => {
    setOpenSheetState((prevState) => {
      const prevGroup =
        prevState && prevState.path === currentPath ? prevState.group : null;
      const resolved = typeof next === 'function' ? next(prevGroup) : next;
      return resolved ? { group: resolved, path: currentPath } : null;
    });
  };
  const prefersReducedMotion = useReducedMotion();

  const closeBottomSheet = useCallback(() => {
    setOpenSheetState(null);
  }, []);

  useHistoryOverlay('mobile-bottom-sheet', Boolean(openGroup), closeBottomSheet);

  const groupedCategories = useMemo(
    () => getNavbarCategoriesByGroup(categories),
    [categories]
  );

  const activeCategorySlugFromPath = useMemo(() => {
    const clean = currentPath.replace(/\/+$/, '') || '/';
    const match = clean.match(/^\/categor(?:y|ies)\/(.+)$/i);
    if (match) {
      return decodeCourseSlug(match[1]) || match[1];
    }
    const parts = clean.split('/').filter(Boolean);
    if (parts.length === 1) {
      const candidate = decodeCourseSlug(parts[0]) || parts[0];
      if (categories.some((cat) => categorySlugsMatch(cat.slug, candidate))) {
        return candidate;
      }
    }
    return null;
  }, [currentPath, categories]);

  // Close sheet on Escape key
  useEffect(() => {
    if (!openGroup) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenSheetState(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openGroup]);

  const getCategoriesForGroup = (group: SheetGroupKey): Category[] => {
    return groupedCategories[group] || [];
  };

  const sheetCategories = openGroup ? getCategoriesForGroup(openGroup) : [];
  const sheetMeta = openGroup ? SHEET_HEADER_META[openGroup] : null;

  const publicVisibleCourses = useMemo(
    () =>
      courses.filter((c) => c.status === 'active' || c.status === 'closed'),
    [courses]
  );

  const Hsc27Icon = useMemo(
    () => getNavbarGroupLucideIcon('hsc27', categories),
    [categories]
  );
  const Hsc28Icon = useMemo(
    () => getNavbarGroupLucideIcon('hsc28', categories),
    [categories]
  );

  // Navigation Items:
  // 1. Home, 2. HSC 27, 3. HSC 28, 4. Class 6–12, 5. Admission, 6. Books, 7. Skills
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
    },
    {
      id: 'hsc27',
      label: 'HSC 27',
      icon: Hsc27Icon,
    },
    {
      id: 'hsc28',
      label: 'HSC 28',
      icon: Hsc28Icon,
    },
    {
      id: 'school',
      label: 'Class 6–12',
      icon: GraduationCap,
    },
    {
      id: 'admission',
      label: 'Admission',
      icon: Award,
    },
    {
      id: 'books',
      label: 'Books',
      icon: ShoppingBag,
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: Briefcase,
    },
  ];

  const handleNavItemTap = (tab: MobileTab) => {
    if (tab === 'home' || tab === 'books') {
      setOpenGroup(null);
      onTabChange(tab);
      return;
    }

    const groupItems = groupedCategories[tab];
    if (groupItems && groupItems.length > 0) {
      setOpenGroup((prev) => (prev === tab ? null : tab));
      return;
    }

    setOpenGroup(null);
    onTabChange(tab);
  };

  const handleCategoryCardSelect = (cat: Category) => {
    setOpenGroup(null);
    if (onNavigate) {
      onNavigate(buildReadableCategoryPath(cat.slug));
    } else {
      onTabChange(openGroup && openGroup !== 'skills' ? openGroup : activeTab);
    }
  };

  return (
    <>
      <AnimatePresence>
        {openGroup && sheetMeta && (
          <>
            {/* Frosted Backdrop Overlay */}
            <motion.div
              key="mobile-cat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
              onClick={() => setOpenGroup(null)}
              aria-hidden="true"
              className="md:hidden fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
            />

            {/* Dynamic Category Selection Sheet */}
            <motion.section
              key={`mobile-cat-sheet-${openGroup}`}
              role="dialog"
              aria-modal="true"
              aria-label={sheetMeta.title}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed bottom-[78px] inset-x-2.5 sm:inset-x-4 max-w-[480px] mx-auto z-50 bg-white/95 backdrop-blur-2xl border border-rose-100/95 shadow-[0_22px_54px_-12px_rgba(185,28,28,0.28),0_10px_28px_rgba(0,0,0,0.14)] rounded-[26px] overflow-hidden"
            >
              {/* Drag Handle */}
              <div className="pt-2.5 pb-1 flex justify-center">
                <span className="w-10 h-1 rounded-full bg-rose-200/90 block" />
              </div>

              {/* Sheet Header */}
              <div className="px-4 pt-1 pb-3 border-b border-rose-100/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-black text-[#2A0F12] tracking-tight truncate">
                    {sheetMeta.title}
                  </h2>
                  <p className="text-[11px] font-semibold text-[#6B4C4F] truncate mt-0.5 tabular-nums">
                    {sheetMeta.subtitle} · {toBengaliNumber(sheetCategories.length)}টি ক্যাটাগরি
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenGroup(null);
                        onNavigate(sheetMeta.overviewPath);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-xl text-[11px] font-bold text-[#b91c1c] hover:bg-rose-50 transition cursor-pointer whitespace-nowrap"
                    >
                      <span>{sheetMeta.overviewLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpenGroup(null)}
                    aria-label="বন্ধ করুন"
                    className="min-w-[44px] min-h-[44px] w-11 h-11 -mr-1.5 rounded-full flex items-center justify-center text-slate-500 hover:text-[#eb1c24] hover:bg-rose-50/80 transition cursor-pointer active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Dynamic S-Wave Reference Icon Cards Grid */}
              <div className="p-3.5 max-h-[56dvh] overflow-y-auto bg-gradient-to-b from-rose-50/35 to-white">
                <div className="grid grid-cols-2 gap-3">
                  {sheetCategories.map((cat, idx) => {
                    const IconComp = getCategoryLucideIcon(cat);
                    const theme = resolveCategoryCardTheme(cat, idx);
                    const isCurrentCategory = activeCategorySlugFromPath
                      ? categorySlugsMatch(cat.slug, activeCategorySlugFromPath)
                      : false;
                    const courseCount = publicVisibleCourses.filter((c) =>
                      courseMatchesCategorySlug(c, cat.slug)
                    ).length;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryCardSelect(cat)}
                        data-category-id={cat.id}
                        data-category-slug={cat.slug}
                        className="group min-w-0 w-full flex flex-col items-center cursor-pointer text-left focus:outline-none touch-manipulation"
                      >
                        {/* Split S-Wave 3D Glass Card matching ClassSelectorStrip & Reference Icon */}
                        <div
                          className={`relative w-full rounded-[20px] overflow-hidden border bg-white/90 backdrop-blur-xl transition-all duration-200 flex flex-col justify-between group-active:scale-[0.97] ${
                            isCurrentCategory
                              ? 'border-rose-400 ring-2 ring-[#eb1c24]/80 shadow-[0_14px_28px_-10px_rgba(235,28,36,0.35)]'
                              : `border-white/95 shadow-[0_10px_24px_-10px_rgba(185,28,28,0.2),inset_0_1px_0_rgba(255,255,255,0.95)] ${theme.hoverShadow} group-hover:-translate-y-0.5`
                          }`}
                        >
                          {/* Top Rich 3D Radial Gradient Stage */}
                          <div
                            className={`relative w-full h-[88px] ${theme.topGradient} flex flex-col items-center justify-center px-2 pt-4 pb-3 overflow-hidden`}
                          >
                            {/* Specular top-left glass sheen */}
                            <div
                              className="absolute inset-0 pointer-events-none opacity-45"
                              style={{
                                background:
                                  'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 55%)',
                              }}
                            />

                            {/* Compact Tag at top-left */}
                            <span className="absolute top-2 left-2 text-[8.5px] font-black tracking-wider text-white/95 bg-black/20 backdrop-blur-md border border-white/25 px-2 py-0.5 rounded-full max-w-[calc(100%-36px)] truncate">
                              {theme.tag}
                            </span>

                            {/* Active Indicator Checkmark */}
                            {isCurrentCategory && (
                              <span
                                aria-label="বর্তমানে নির্বাচিত"
                                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-[#eb1c24] flex items-center justify-center shadow-sm"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}

                            {/* Centered 3D Frosted Icon Medallion */}
                            <div
                              className={`relative z-10 mt-1.5 w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/45 flex items-center justify-center text-white ${theme.iconGlow} group-hover:scale-105 transition-transform duration-200`}
                            >
                              <IconComp className="w-[22px] h-[22px] stroke-[2.2] drop-shadow-sm" />
                            </div>

                            {/* Rising Frosted S-Curve Wave Divider */}
                            <svg
                              viewBox="0 0 240 42"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                              className="absolute bottom-0 left-0 w-full h-[18px] pointer-events-none block"
                            >
                              <path
                                d="M0,18 C68,-4 148,42 240,12 L240,42 L0,42 Z"
                                fill="rgba(255, 255, 255, 0.94)"
                              />
                            </svg>
                          </div>

                          {/* Bottom Frosted White Zone with Outlined Pill Title */}
                          <div className="relative shrink-0 bg-white/95 px-2 pt-0.5 pb-2.5 flex flex-col items-center justify-center shadow-[inset_0_-6px_12px_rgba(185,28,28,0.04)]">
                            <div
                              className={`w-full rounded-full border-[1.5px] ${theme.pillBorder} ${theme.pillBg} px-2 py-1 min-h-[36px] flex items-center justify-center text-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.95),0_2px_6px_-2px_rgba(0,0,0,0.06)]`}
                            >
                              <span
                                className={`block font-black text-[11px] tracking-tight leading-snug line-clamp-2 ${theme.pillText}`}
                              >
                                {cat.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Clean Caption below card */}
                        <span
                          className={`mt-1.5 text-[10.5px] font-bold text-center leading-tight max-w-full truncate tabular-nums ${theme.statusColor} opacity-90 group-hover:opacity-100`}
                        >
                          {courseCount > 0
                            ? `${toBengaliNumber(courseCount)}টি কোর্স`
                            : cat.subtitle || 'কোর্স দেখুন'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        style={{
          paddingBottom: 'calc(0.45rem + env(safe-area-inset-bottom, 0px))',
        }}
        className="md:hidden fixed bottom-2.5 inset-x-2 sm:inset-x-4 max-w-[480px] mx-auto z-50 bg-white/88 backdrop-blur-xl border border-rose-100/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14),0_4px_16px_rgba(226,43,43,0.06)] rounded-[22px] px-1 py-1 transition-all duration-200 select-none"
      >
        <div className="grid grid-cols-7 items-center gap-0.5 w-full">
          {navItems.map((item) => {
            const isSheetOpenForItem = openGroup === item.id;
            const isActive = isSheetOpenForItem || (!openGroup && activeTab === item.id);
            const IconComponent = item.icon;
            const hasSubCategories =
              item.id !== 'home' &&
              item.id !== 'books' &&
              (groupedCategories[item.id]?.length ?? 0) > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavItemTap(item.id)}
                aria-expanded={hasSubCategories ? isSheetOpenForItem : undefined}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation group ${
                  isActive
                    ? 'bg-rose-50/95 text-[#eb1c24] border border-rose-200/70 shadow-2xs font-extrabold'
                    : 'border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/60 font-semibold'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                >
                  <IconComponent
                    className={`w-[18px] h-[18px] sm:w-[19px] sm:h-[19px] transition-colors stroke-[2] ${
                      isActive ? 'text-[#eb1c24]' : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                </div>

                <span
                  className={`text-[8.5px] sm:text-[10px] leading-tight tracking-tight mt-1 truncate max-w-full text-center transition-colors ${
                    isActive
                      ? 'text-[#eb1c24] font-extrabold'
                      : 'text-slate-600 group-hover:text-slate-900 font-bold'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
