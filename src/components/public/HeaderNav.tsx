import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { BookCategory, Category, Course } from '../../types.ts';
import {
  getNavbarCategoriesByGroup,
  inferCategoryNavGroup,
  NAVBAR_GROUP_PATHS,
  parseNavbarGroupFromPath,
  resolveCategoryNavGroup,
} from '../../lib/navbarCategories.ts';
import { getCategoryLucideIcon, NavbarGroupIcon } from '../../lib/categoryIconComponents.ts';
import { resolveCategoryCardTheme } from '../../lib/categoryIcons.ts';
import { categorySlugsMatch } from '../../lib/categoryMatching.ts';
import { buildReadableCategoryPath, decodeCourseSlug } from '../../lib/courseSlug.ts';
import { useHistoryOverlay } from '../../lib/navigationHistory.ts';
import {
  Home,
  GraduationCap,
  Award,
  ShoppingBag,
  Briefcase,
  ChevronDown,
  Search,
  Menu,
  X,
} from 'lucide-react';

interface HeaderNavProps {
  courses: Course[];
  categories?: Category[];
  bookCategories?: BookCategory[];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
  onSelectCategory: (catSlug: string, queryText?: string) => void;
  onNavigateHome: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
  onOpenCategoryPage: (slug: string) => void;
  onNavigate?: (path: string) => void;
  currentPath?: string;
  currentHash?: string;
}

type NavKey = 'school' | 'hsc27' | 'hsc28' | 'admission' | 'books' | 'skills';

interface SubMenuItem {
  label: string;
  categorySlug?: string;
  urlPath: string;
  category?: Category;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  categories = [],
  bookCategories = [],
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSelectCategory,
  onNavigateHome,
  onNavigate,
  currentPath = '/',
}) => {
  const [hoverMenu, setHoverMenu] = useState<NavKey | null>(null);
  const [pinnedMenu, setPinnedMenu] = useState<NavKey | null>(null);
  const [mobileMenuOpenPath, setMobileMenuOpenPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileMenuOpenPath === currentPath;
  const setMobileMenuOpen = (
    next: boolean | ((prev: boolean) => boolean)
  ) => {
    setMobileMenuOpenPath((prevPath) => {
      const currentlyOpen = prevPath === currentPath;
      const resolved = typeof next === 'function' ? next(currentlyOpen) : next;
      return resolved ? currentPath : null;
    });
  };
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const activeMenu = pinnedMenu ?? hoverMenu;

  const closeMobileDrawer = useCallback(() => {
    setMobileMenuOpenPath(null);
  }, []);

  useHistoryOverlay('header-mobile-drawer', mobileMenuOpen, closeMobileDrawer);

  // Close pinned/hover dropdown and mobile drawer when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setPinnedMenu(null);
        setHoverMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedMenu(null);
        setHoverMenu(null);
        setMobileMenuOpenPath(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Build 100% dynamic category lists per Navbar button directly from existing Categories
  const groupedCategories = useMemo(
    () => getNavbarCategoriesByGroup(categories),
    [categories]
  );

  const mapCategoriesToSubItems = (list: Category[]): SubMenuItem[] =>
    list.map((cat) => ({
      label: cat.name,
      categorySlug: cat.slug,
      urlPath: buildReadableCategoryPath(cat.slug),
      category: cat,
    }));

  const class6to12Items = useMemo(
    () => mapCategoriesToSubItems(groupedCategories.school),
    [groupedCategories.school]
  );
  const hsc27Items = useMemo(
    () => mapCategoriesToSubItems(groupedCategories.hsc27),
    [groupedCategories.hsc27]
  );
  const hsc28Items = useMemo(
    () => mapCategoriesToSubItems(groupedCategories.hsc28),
    [groupedCategories.hsc28]
  );
  const admissionItems = useMemo(
    () => mapCategoriesToSubItems(groupedCategories.admission),
    [groupedCategories.admission]
  );

  // Dynamic Book Store categories dropdown items
  const bookStoreItems: SubMenuItem[] = useMemo(
    () => [
      { label: '📚 সকল বই (10MS বুক স্টোর)', urlPath: '/books' },
      ...bookCategories
        .filter((cat) => cat.status === 'active')
        .map((cat) => ({
          label: cat.sectionTitle || `${cat.name}-এর সকল বই`,
          urlPath: `/books/${cat.slug}`,
        })),
    ],
    [bookCategories]
  );

  const skillsItems = useMemo(
    () => mapCategoriesToSubItems(groupedCategories.skills),
    [groupedCategories.skills]
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

  // Determine active navigation item based on current URL path and active category
  const getActiveKey = (): 'home' | 'school' | 'hsc27' | 'hsc28' | 'admission' | 'books' | 'skills' => {
    const clean = currentPath.replace(/\/+$/, '') || '/';

    const navGroupMatch = parseNavbarGroupFromPath(clean);
    if (navGroupMatch) {
      return navGroupMatch.groupKey;
    }

    if (
      clean === '/books' ||
      clean.startsWith('/books/') ||
      clean === '/book-store' ||
      clean === '/category/books' ||
      clean === '/categories/books'
    ) {
      return 'books';
    }

    if (activeCategorySlugFromPath) {
      const matchedCategory = categories.find((cat) =>
        categorySlugsMatch(cat.slug, activeCategorySlugFromPath)
      );
      if (matchedCategory) {
        const group = resolveCategoryNavGroup(matchedCategory);
        if (group !== 'none') return group;
      }
      const slugLower = activeCategorySlugFromPath.trim().toLowerCase();
      if (slugLower === 'skills' || slugLower.includes('skill')) {
        return 'skills';
      }
      const inferred = inferCategoryNavGroup({
        name: activeCategorySlugFromPath,
        slug: activeCategorySlugFromPath,
        subtitle: null,
      });
      if (inferred !== 'none') return inferred;
    }

    if (
      clean === '/skills' ||
      clean.startsWith('/skills/') ||
      clean === '/category/skills' ||
      clean === '/categories/skills' ||
      clean === '/language-learning' ||
      clean === '/category/language-learning' ||
      clean === '/categories/language-learning'
    ) {
      return 'skills';
    }

    if (clean.includes('/hsc/hsc-27') || clean.includes('/academic/hsc/hsc-27')) return 'hsc27';
    if (clean.includes('/hsc/hsc-28') || clean.includes('/academic/hsc/hsc-28')) return 'hsc28';

    if (
      clean.includes('/class-') ||
      clean.includes('/ssc/') ||
      clean.includes('/ssc-29') ||
      clean.includes('/academic/class') ||
      clean.includes('/academic/ssc') ||
      clean === '/school' ||
      clean === '/category/school'
    ) {
      return 'school';
    }

    if (clean.includes('/admission') || clean === '/category/admission') return 'admission';

    if (clean === '/' && !searchQuery.trim()) return 'home';

    return 'home';
  };

  const activeNavKey = getActiveKey();

  const handleMouseEnter = (key: NavKey) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoverMenu(key);
    if (pinnedMenu && pinnedMenu !== key) {
      setPinnedMenu(null);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoverMenu(null);
    }, 180);
  };

  const handleSubItemClick = (item: SubMenuItem) => {
    setPinnedMenu(null);
    setHoverMenu(null);
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(item.urlPath);
    } else if (item.categorySlug) {
      onSelectCategory(item.categorySlug, '');
    }
  };

  const handleDirectNavClick = (key: NavKey) => {
    setPinnedMenu(null);
    setHoverMenu(null);
    setMobileMenuOpen(false);
    if (onNavigate) {
      if (key === 'books') onNavigate('/books');
      else onNavigate(NAVBAR_GROUP_PATHS[key]);
    } else {
      if (key === 'school') onSelectCategory('school', '');
      else if (key === 'hsc27' || key === 'hsc28') onSelectCategory('hsc', '');
      else if (key === 'admission') onSelectCategory('admission', '');
      else if (key === 'books') onSelectCategory('all', 'বুক');
      else if (key === 'skills') onSelectCategory('skills', '');
    }
  };

  const handleNavButtonClick = (key: NavKey) => {
    handleDirectNavClick(key);
  };

  const isSubItemActive = (item: SubMenuItem): boolean => {
    if (item.categorySlug && activeCategorySlugFromPath) {
      return categorySlugsMatch(item.categorySlug, activeCategorySlugFromPath);
    }
    return currentPath.replace(/\/+$/, '') === item.urlPath;
  };

  // Active pill classes vs inactive neutral classes
  const activePillClass = 'bg-rose-50 text-[#eb1c24] border border-rose-200/60 font-bold shadow-2xs';
  const inactivePillClass = 'text-slate-700 hover:text-[#eb1c24] hover:bg-slate-50 border border-transparent font-bold';

  return (
    <header
      ref={headerRef}
      style={{ borderRadius: mobileMenuOpen ? '26px' : '22px' }}
      className={`sticky top-3 z-50 mx-auto max-w-[1360px] w-[calc(100%-16px)] sm:w-[calc(100%-28px)] bg-white border border-slate-200/90 shadow-[0_10px_32px_-6px_rgba(0,0,0,0.11),0_4px_14px_rgba(226,43,43,0.05)] transition-all duration-200 relative overflow-visible ${
        mobileMenuOpen ? 'rounded-[26px]' : 'rounded-[22px]'
      }`}
    >
      {/* Decorative Brand Waves (Left & Right corner accents strictly clipped to exact 22px reference curve) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none -z-0"
        style={{ borderRadius: mobileMenuOpen ? '26px' : '22px' }}
      >
        {/* Left Decorative Wave */}
        <div className="absolute left-0 top-0 bottom-0 w-32 sm:w-44 select-none opacity-90">
          <svg viewBox="0 0 160 64" fill="none" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0 0 L45 0 C70 20 48 45 80 64 L0 64 Z" fill="#eb1c24" opacity="0.10" />
            <path d="M0 0 L30 0 C52 16 32 38 60 64 L0 64 Z" fill="#dc2626" opacity="0.16" />
            <path d="M0 0 L18 0 C34 14 18 30 42 64 L0 64 Z" fill="#b91c1c" opacity="0.22" />
          </svg>
        </div>

        {/* Right Decorative Warm Wave */}
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-36 select-none opacity-80">
          <svg viewBox="0 0 140 64" fill="none" preserveAspectRatio="none" className="w-full h-full">
            <path d="M140 0 L90 0 C70 20 95 44 60 64 L140 64 Z" fill="#f59e0b" opacity="0.08" />
            <path d="M140 0 L108 0 C92 16 112 36 85 64 L140 64 Z" fill="#f97316" opacity="0.14" />
            <path d="M140 0 L124 0 C112 14 125 30 105 64 L140 64 Z" fill="#eb1c24" opacity="0.20" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 lg:gap-3">
        
        {/* LEFT: 10 MINUTE SCHOOL LOGO (10msallcourses) */}
        <button
          type="button"
          onClick={() => {
            setPinnedMenu(null);
            setHoverMenu(null);
            setMobileMenuOpen(false);
            onNavigateHome();
          }}
          className="flex items-center cursor-pointer group shrink-0 select-none py-0.5 transition-transform hover:scale-105 active:scale-95"
          title="১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস"
        >
          <Image
            src="/images/logo-transparent.png"
            alt="১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস লোগো"
            width={638}
            height={296}
            priority
            style={{ width: 'auto' }}
            className="h-8 sm:h-9.5 w-auto object-contain block drop-shadow-xs"
          />
        </button>

        {/* MIDDLE: NAVBAR MENU LINKS (100% Dynamic Category-Based Dropdowns) */}
        <nav className="hidden lg:flex lg:flex-1 lg:justify-center items-center gap-0.5 xl:gap-2 text-[12.5px] xl:text-[13.5px] text-slate-700 relative py-0.5 min-w-0">
          {/* 1. হোম (Active ONLY when actually on Home Page) */}
          <button
            type="button"
            onClick={() => {
              setPinnedMenu(null);
              setHoverMenu(null);
              onNavigateHome();
            }}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 xl:px-3 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeNavKey === 'home' ? activePillClass : inactivePillClass
            }`}
          >
            <Home className={`w-3.5 h-3.5 ${activeNavKey === 'home' ? 'text-[#eb1c24]' : 'text-slate-500'}`} />
            <span>হোম</span>
          </button>

          {/* 2. ক্লাস 6-12 (Dynamic dropdown from categories) */}
          <div
            onMouseEnter={() => {
              if (class6to12Items.length > 0) handleMouseEnter('school');
            }}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => handleNavButtonClick('school')}
              aria-expanded={class6to12Items.length > 0 ? activeMenu === 'school' : undefined}
              className={`flex items-center gap-1 py-1.5 px-2 xl:px-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavKey === 'school' ? activePillClass : inactivePillClass
              }`}
            >
              <GraduationCap className={`w-3.5 h-3.5 ${activeNavKey === 'school' ? 'text-[#eb1c24]' : 'text-slate-500'}`} />
              <span>ক্লাস 6-12</span>
              {class6to12Items.length > 0 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'school' ? 'rotate-180 text-[#eb1c24]' : 'text-slate-400'
                  }`}
                />
              )}
            </button>

            {activeMenu === 'school' && class6to12Items.length > 0 && (
              <div
                onMouseEnter={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
                onMouseLeave={handleMouseLeave}
                className="absolute left-0 top-full mt-2 w-[275px] bg-white rounded-2xl border border-rose-100 border-t-[3px] border-t-[#eb1c24] shadow-[0_16px_40px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden"
              >
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ক্লাস ৬–১২ ক্যাটাগরি
                </div>
                {class6to12Items.map((item, idx) => {
                  const isCurrent = isSubItemActive(item);
                  const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                  const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                  return (
                    <button
                      key={item.urlPath}
                      type="button"
                      onClick={() => handleSubItemClick(item)}
                      className={`w-full text-left px-3.5 py-2 text-[13px] font-semibold transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'text-[#eb1c24] bg-rose-50/80'
                          : 'text-slate-800 hover:text-[#eb1c24] hover:bg-rose-50/60'
                      }`}
                    >
                      {CatIcon && theme && (
                        <span className={`w-6 h-6 rounded-lg ${theme.topGradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                          <CatIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. HSC 27 (Dynamic dropdown from categories) */}
          <div
            onMouseEnter={() => {
              if (hsc27Items.length > 0) handleMouseEnter('hsc27');
            }}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => handleNavButtonClick('hsc27')}
              aria-expanded={hsc27Items.length > 0 ? activeMenu === 'hsc27' : undefined}
              className={`flex items-center gap-1 py-1.5 px-2 xl:px-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavKey === 'hsc27' ? activePillClass : inactivePillClass
              }`}
            >
              <NavbarGroupIcon
                group="hsc27"
                categories={categories}
                className={`w-3.5 h-3.5 ${activeNavKey === 'hsc27' ? 'text-[#eb1c24]' : 'text-amber-500'}`}
              />
              <span>HSC 27</span>
              {hsc27Items.length > 0 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'hsc27' ? 'rotate-180 text-[#eb1c24]' : 'text-slate-400'
                  }`}
                />
              )}
            </button>

            {activeMenu === 'hsc27' && hsc27Items.length > 0 && (
              <div
                onMouseEnter={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
                onMouseLeave={handleMouseLeave}
                className="absolute left-0 top-full mt-2 w-[295px] bg-white rounded-2xl border border-rose-100 border-t-[3px] border-t-[#eb1c24] shadow-[0_16px_40px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden"
              >
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  HSC 2027 ক্যাটাগরি
                </div>
                {hsc27Items.map((item, idx) => {
                  const isCurrent = isSubItemActive(item);
                  const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                  const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                  return (
                    <button
                      key={item.urlPath}
                      type="button"
                      onClick={() => handleSubItemClick(item)}
                      className={`w-full text-left px-3.5 py-2 text-[12.5px] font-semibold transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'text-[#eb1c24] bg-rose-50/80'
                          : 'text-slate-800 hover:text-[#eb1c24] hover:bg-rose-50/60'
                      }`}
                    >
                      {CatIcon && theme && (
                        <span className={`w-6 h-6 rounded-lg ${theme.topGradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                          <CatIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. HSC 28 (Dynamic dropdown from categories) */}
          <div
            onMouseEnter={() => {
              if (hsc28Items.length > 0) handleMouseEnter('hsc28');
            }}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => handleNavButtonClick('hsc28')}
              aria-expanded={hsc28Items.length > 0 ? activeMenu === 'hsc28' : undefined}
              className={`flex items-center gap-1 py-1.5 px-2 xl:px-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavKey === 'hsc28' ? activePillClass : inactivePillClass
              }`}
            >
              <NavbarGroupIcon
                group="hsc28"
                categories={categories}
                className={`w-3.5 h-3.5 ${activeNavKey === 'hsc28' ? 'text-[#eb1c24]' : 'text-rose-500'}`}
              />
              <span>HSC 28</span>
              {hsc28Items.length > 0 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'hsc28' ? 'rotate-180 text-[#eb1c24]' : 'text-slate-400'
                  }`}
                />
              )}
            </button>

            {activeMenu === 'hsc28' && hsc28Items.length > 0 && (
              <div
                onMouseEnter={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
                onMouseLeave={handleMouseLeave}
                className="absolute left-0 top-full mt-2 w-[295px] bg-white rounded-2xl border border-rose-100 border-t-[3px] border-t-[#eb1c24] shadow-[0_16px_40px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden"
              >
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  HSC 2028 ক্যাটাগরি
                </div>
                {hsc28Items.map((item, idx) => {
                  const isCurrent = isSubItemActive(item);
                  const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                  const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                  return (
                    <button
                      key={item.urlPath}
                      type="button"
                      onClick={() => handleSubItemClick(item)}
                      className={`w-full text-left px-3.5 py-2 text-[12.5px] font-semibold transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'text-[#eb1c24] bg-rose-50/80'
                          : 'text-slate-800 hover:text-[#eb1c24] hover:bg-rose-50/60'
                      }`}
                    >
                      {CatIcon && theme && (
                        <span className={`w-6 h-6 rounded-lg ${theme.topGradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                          <CatIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. ভর্তি পরীক্ষা (Dynamic dropdown from categories) */}
          <div
            onMouseEnter={() => {
              if (admissionItems.length > 0) handleMouseEnter('admission');
            }}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => handleNavButtonClick('admission')}
              aria-expanded={admissionItems.length > 0 ? activeMenu === 'admission' : undefined}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 xl:px-3 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavKey === 'admission' ? activePillClass : inactivePillClass
              }`}
            >
              <Award className={`w-3.5 h-3.5 ${activeNavKey === 'admission' ? 'text-[#eb1c24]' : 'text-emerald-600'}`} />
              <span>ভর্তি পরীক্ষা</span>
              {admissionItems.length > 0 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'admission' ? 'rotate-180 text-[#eb1c24]' : 'text-slate-400'
                  }`}
                />
              )}
            </button>

            {activeMenu === 'admission' && admissionItems.length > 0 && (
              <div
                onMouseEnter={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
                onMouseLeave={handleMouseLeave}
                className="absolute left-0 top-full mt-2 w-[285px] bg-white rounded-2xl border border-rose-100 border-t-[3px] border-t-[#eb1c24] shadow-[0_16px_40px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden"
              >
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ভর্তি পরীক্ষা ক্যাটাগরি
                </div>
                {admissionItems.map((item, idx) => {
                  const isCurrent = isSubItemActive(item);
                  const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                  const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                  return (
                    <button
                      key={item.urlPath}
                      type="button"
                      onClick={() => handleSubItemClick(item)}
                      className={`w-full text-left px-3.5 py-2 text-[12.5px] font-semibold transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'text-[#eb1c24] bg-rose-50/80'
                          : 'text-slate-800 hover:text-[#eb1c24] hover:bg-rose-50/60'
                      }`}
                    >
                      {CatIcon && theme && (
                        <span className={`w-6 h-6 rounded-lg ${theme.topGradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                          <CatIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. বুক স্টোর (with dynamic Book Store categories dropdown) */}
          <div
            onMouseEnter={() => {
              if (bookStoreItems.length > 1) handleMouseEnter('books');
            }}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => handleDirectNavClick('books')}
              aria-expanded={bookStoreItems.length > 1 ? activeMenu === 'books' : undefined}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 xl:px-3 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavKey === 'books' ? activePillClass : inactivePillClass
              }`}
            >
              <ShoppingBag className={`w-3.5 h-3.5 ${activeNavKey === 'books' ? 'text-[#eb1c24]' : 'text-indigo-500'}`} />
              <span>বুক স্টোর</span>
              {bookStoreItems.length > 1 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'books' ? 'rotate-180 text-[#eb1c24]' : 'text-slate-400'
                  }`}
                />
              )}
            </button>

            {activeMenu === 'books' && bookStoreItems.length > 1 && (
              <div
                onMouseEnter={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
                onMouseLeave={handleMouseLeave}
                className="absolute right-0 top-full mt-2 w-[270px] bg-white rounded-2xl border border-rose-100 border-t-[3px] border-t-[#eb1c24] shadow-[0_16px_40px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden"
              >
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  বুক স্টোর ক্যাটাগরি
                </div>
                {bookStoreItems.map((item, idx) => {
                  const isCurrent = isSubItemActive(item);
                  return (
                    <button
                      key={item.urlPath + idx}
                      type="button"
                      onClick={() => handleSubItemClick(item)}
                      className={`w-full text-left px-4 py-2 text-[12.5px] font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'text-[#eb1c24] bg-rose-50/80'
                          : 'text-slate-800 hover:text-[#eb1c24] hover:bg-rose-50/60'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. Skills (immediately right of বুক স্টোর, matching all other dynamic category dropdown buttons) */}
          <div
            onMouseEnter={() => {
              if (skillsItems.length > 0) handleMouseEnter('skills');
            }}
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              type="button"
              onClick={() => handleNavButtonClick('skills')}
              aria-expanded={skillsItems.length > 0 ? activeMenu === 'skills' : undefined}
              className={`flex items-center gap-1 py-1.5 px-2.5 xl:px-3 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavKey === 'skills' ? activePillClass : inactivePillClass
              }`}
            >
              <Briefcase className={`w-3.5 h-3.5 ${activeNavKey === 'skills' ? 'text-[#eb1c24]' : 'text-cyan-600'}`} />
              <span>স্কিলস</span>
              {skillsItems.length > 0 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeMenu === 'skills' ? 'rotate-180 text-[#eb1c24]' : 'text-slate-400'
                  }`}
                />
              )}
            </button>

            {activeMenu === 'skills' && skillsItems.length > 0 && (
              <div
                onMouseEnter={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
                onMouseLeave={handleMouseLeave}
                className="absolute right-0 top-full mt-2 w-[285px] bg-white rounded-2xl border border-rose-100 border-t-[3px] border-t-[#eb1c24] shadow-[0_16px_40px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden"
              >
                <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  স্কিলস ক্যাটাগরি
                </div>
                {skillsItems.map((item, idx) => {
                  const isCurrent = isSubItemActive(item);
                  const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                  const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                  return (
                    <button
                      key={item.urlPath}
                      type="button"
                      onClick={() => handleSubItemClick(item)}
                      className={`w-full text-left px-3.5 py-2 text-[12.5px] font-semibold transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isCurrent
                          ? 'text-[#eb1c24] bg-rose-50/80'
                          : 'text-slate-800 hover:text-[#eb1c24] hover:bg-rose-50/60'
                      }`}
                    >
                      {CatIcon && theme && (
                        <span className={`w-6 h-6 rounded-lg ${theme.topGradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                          <CatIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* RIGHT: SEARCH BAR PILL */}
        <div className="flex items-center gap-2 max-w-[230px] sm:max-w-[260px] lg:max-w-[175px] xl:max-w-[255px] w-full justify-end shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            className="relative flex items-center w-full bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200/90 focus-within:border-[#eb1c24] rounded-full pl-3.5 pr-1 py-1 transition-all shadow-2xs"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="কোর্স সার্চ করুন..."
              className="w-full bg-transparent border-none outline-none text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 font-medium pr-1"
            />

            {/* Circular Red Search Button */}
            <button
              type="submit"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#eb1c24] to-[#b91c1c] hover:from-[#dc2626] hover:to-[#991b1b] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-transform active:scale-95"
              title="সার্চ করুন"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-full text-slate-700 hover:bg-rose-50 cursor-pointer transition-colors shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#eb1c24]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE EXPANDED MENU DRAWER (Dynamic Category-Based) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-3 rounded-b-[22px] animate-in fade-in">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
              কোর্স ক্যাটাগরি ও ব্যাচ
            </div>

            {/* হোম Mobile Link */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateHome();
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                activeNavKey === 'home' ? 'text-[#eb1c24] bg-rose-50 border border-rose-200' : 'text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Home className="w-4 h-4 text-[#eb1c24]" />
              <span>হোম পেজ</span>
            </button>

            {/* ক্লাস 6-12 */}
            {class6to12Items.length > 0 ? (
              <details className="group" open={activeNavKey === 'school'}>
                <summary className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold cursor-pointer list-none ${
                  activeNavKey === 'school' ? 'text-[#eb1c24] bg-rose-50/70' : 'text-slate-800 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-600" />
                    <span>ক্লাস 6-12</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#eb1c24] ml-3 my-1">
                  <button
                    type="button"
                    onClick={() => handleDirectNavClick('school')}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md font-bold text-[#eb1c24] bg-rose-50/70 hover:bg-rose-100/70 transition-colors"
                  >
                    সব ক্লাস ৬–১২ ক্যাটাগরি দেখুন →
                  </button>
                  {class6to12Items.map((item, idx) => {
                    const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                    const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                    return (
                      <button
                        key={item.urlPath}
                        type="button"
                        onClick={() => handleSubItemClick(item)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-2 ${
                          isSubItemActive(item)
                            ? 'text-[#eb1c24] bg-red-50/80 font-bold'
                            : 'text-slate-700 hover:text-[#eb1c24] hover:bg-red-50/70'
                        }`}
                      >
                        {CatIcon && theme && (
                          <span className={`w-5 h-5 rounded-md ${theme.topGradient} text-white flex items-center justify-center shrink-0`}>
                            <CatIcon className="w-3 h-3 stroke-[2.2]" />
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ) : (
              <button
                type="button"
                onClick={() => handleDirectNavClick('school')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                  activeNavKey === 'school' ? 'text-[#eb1c24] bg-rose-50 border border-rose-200' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-slate-600" />
                <span>ক্লাস 6-12</span>
              </button>
            )}

            {/* HSC 27 */}
            {hsc27Items.length > 0 ? (
              <details className="group" open={activeNavKey === 'hsc27'}>
                <summary className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold cursor-pointer list-none ${
                  activeNavKey === 'hsc27' ? 'text-[#eb1c24] bg-rose-50/70' : 'text-slate-800 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <NavbarGroupIcon group="hsc27" categories={categories} className="w-4 h-4 text-amber-500" />
                    <span>HSC 27 (২য় বর্ষ)</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#eb1c24] ml-3 my-1">
                  <button
                    type="button"
                    onClick={() => handleDirectNavClick('hsc27')}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md font-bold text-[#eb1c24] bg-rose-50/70 hover:bg-rose-100/70 transition-colors"
                  >
                    সব HSC 27 ক্যাটাগরি দেখুন →
                  </button>
                  {hsc27Items.map((item, idx) => {
                    const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                    const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                    return (
                      <button
                        key={item.urlPath}
                        type="button"
                        onClick={() => handleSubItemClick(item)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-2 ${
                          isSubItemActive(item)
                            ? 'text-[#eb1c24] bg-red-50/80 font-bold'
                            : 'text-slate-700 hover:text-[#eb1c24] hover:bg-red-50/70'
                        }`}
                      >
                        {CatIcon && theme && (
                          <span className={`w-5 h-5 rounded-md ${theme.topGradient} text-white flex items-center justify-center shrink-0`}>
                            <CatIcon className="w-3 h-3 stroke-[2.2]" />
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ) : (
              <button
                type="button"
                onClick={() => handleDirectNavClick('hsc27')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                  activeNavKey === 'hsc27' ? 'text-[#eb1c24] bg-rose-50 border border-rose-200' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <NavbarGroupIcon group="hsc27" categories={categories} className="w-4 h-4 text-amber-500" />
                <span>HSC 27 (২য় বর্ষ)</span>
              </button>
            )}

            {/* HSC 28 */}
            {hsc28Items.length > 0 ? (
              <details className="group" open={activeNavKey === 'hsc28'}>
                <summary className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold cursor-pointer list-none ${
                  activeNavKey === 'hsc28' ? 'text-[#eb1c24] bg-rose-50/70' : 'text-slate-800 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <NavbarGroupIcon group="hsc28" categories={categories} className="w-4 h-4 text-rose-500" />
                    <span>HSC 28 (১ম বর্ষ)</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#eb1c24] ml-3 my-1">
                  <button
                    type="button"
                    onClick={() => handleDirectNavClick('hsc28')}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md font-bold text-[#eb1c24] bg-rose-50/70 hover:bg-rose-100/70 transition-colors"
                  >
                    সব HSC 28 ক্যাটাগরি দেখুন →
                  </button>
                  {hsc28Items.map((item, idx) => {
                    const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                    const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                    return (
                      <button
                        key={item.urlPath}
                        type="button"
                        onClick={() => handleSubItemClick(item)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-2 ${
                          isSubItemActive(item)
                            ? 'text-[#eb1c24] bg-red-50/80 font-bold'
                            : 'text-slate-700 hover:text-[#eb1c24] hover:bg-red-50/70'
                        }`}
                      >
                        {CatIcon && theme && (
                          <span className={`w-5 h-5 rounded-md ${theme.topGradient} text-white flex items-center justify-center shrink-0`}>
                            <CatIcon className="w-3 h-3 stroke-[2.2]" />
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ) : (
              <button
                type="button"
                onClick={() => handleDirectNavClick('hsc28')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                  activeNavKey === 'hsc28' ? 'text-[#eb1c24] bg-rose-50 border border-rose-200' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <NavbarGroupIcon group="hsc28" categories={categories} className="w-4 h-4 text-rose-500" />
                <span>HSC 28 (১ম বর্ষ)</span>
              </button>
            )}

            {/* ভর্তি পরীক্ষা */}
            {admissionItems.length > 0 ? (
              <details className="group" open={activeNavKey === 'admission'}>
                <summary className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold cursor-pointer list-none ${
                  activeNavKey === 'admission' ? 'text-[#eb1c24] bg-rose-50/70' : 'text-slate-800 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>ভর্তি পরীক্ষা</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#eb1c24] ml-3 my-1">
                  <button
                    type="button"
                    onClick={() => handleDirectNavClick('admission')}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md font-bold text-[#eb1c24] bg-rose-50/70 hover:bg-rose-100/70 transition-colors"
                  >
                    সব ভর্তি পরীক্ষা ক্যাটাগরি দেখুন →
                  </button>
                  {admissionItems.map((item, idx) => {
                    const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                    const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                    return (
                      <button
                        key={item.urlPath}
                        type="button"
                        onClick={() => handleSubItemClick(item)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-2 ${
                          isSubItemActive(item)
                            ? 'text-[#eb1c24] bg-red-50/80 font-bold'
                            : 'text-slate-700 hover:text-[#eb1c24] hover:bg-red-50/70'
                        }`}
                      >
                        {CatIcon && theme && (
                          <span className={`w-5 h-5 rounded-md ${theme.topGradient} text-white flex items-center justify-center shrink-0`}>
                            <CatIcon className="w-3 h-3 stroke-[2.2]" />
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ) : (
              <button
                type="button"
                onClick={() => handleDirectNavClick('admission')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                  activeNavKey === 'admission' ? 'text-[#eb1c24] bg-rose-50 border border-rose-200' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Award className="w-4 h-4 text-emerald-600" />
                <span>ভর্তি পরীক্ষা</span>
              </button>
            )}

            {/* বুক স্টোর */}
            <button
              type="button"
              onClick={() => handleDirectNavClick('books')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                activeNavKey === 'books'
                  ? 'text-[#eb1c24] bg-rose-50 border border-rose-200'
                  : 'text-slate-800 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-indigo-500" />
              <span>বুক স্টোর ও প্রিন্টেড বই</span>
            </button>

            {/* Skills (immediately right/after বুক স্টোর, matching all other dynamic category dropdowns) */}
            {skillsItems.length > 0 ? (
              <details className="group" open={activeNavKey === 'skills'}>
                <summary className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold cursor-pointer list-none ${
                  activeNavKey === 'skills' ? 'text-[#eb1c24] bg-rose-50/70' : 'text-slate-800 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-cyan-600" />
                    <span>স্কিলস</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#eb1c24] ml-3 my-1">
                  <button
                    type="button"
                    onClick={() => handleDirectNavClick('skills')}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md font-bold text-[#eb1c24] bg-rose-50/70 hover:bg-rose-100/70 transition-colors"
                  >
                    সব স্কিলস ক্যাটাগরি দেখুন →
                  </button>
                  {skillsItems.map((item, idx) => {
                    const CatIcon = item.category ? getCategoryLucideIcon(item.category) : null;
                    const theme = item.category ? resolveCategoryCardTheme(item.category, idx) : null;
                    return (
                      <button
                        key={item.urlPath}
                        type="button"
                        onClick={() => handleSubItemClick(item)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center gap-2 ${
                          isSubItemActive(item)
                            ? 'text-[#eb1c24] bg-red-50/80 font-bold'
                            : 'text-slate-700 hover:text-[#eb1c24] hover:bg-red-50/70'
                        }`}
                      >
                        {CatIcon && theme && (
                          <span className={`w-5 h-5 rounded-md ${theme.topGradient} text-white flex items-center justify-center shrink-0`}>
                            <CatIcon className="w-3 h-3 stroke-[2.2]" />
                          </span>
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ) : (
              <button
                type="button"
                onClick={() => handleDirectNavClick('skills')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                  activeNavKey === 'skills'
                    ? 'text-[#eb1c24] bg-rose-50 border border-rose-200'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4 text-cyan-600" />
                <span>স্কিলস</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
