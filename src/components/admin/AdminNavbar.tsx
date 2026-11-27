'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Settings,
  PlusCircle,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlarmClock,
  ShoppingBag,
  ArrowUpDown,
  GraduationCap,
  BookOpenCheck,
} from 'lucide-react';
import { toBengaliNumber } from '../../utils/format.ts';
import type { AdminPageTab } from './AdminDashboard.tsx';

interface AdminNavbarProps {
  activeTab: AdminPageTab;
  onSelectTab: (tab: AdminPageTab) => void;
  onNavigateHome: () => void;
  onRequestLogout: () => void;
  adminName: string;
  adminEmail: string;
  stats: {
    totalCourses: number;
    activeCourses: number;
    inactiveCourses: number;
    totalBooks?: number;
  };
  categoriesCount: number;
  activeOfferTimersCount?: number;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = React.memo(({
  activeTab,
  onSelectTab,
  onNavigateHome,
  onRequestLogout,
  adminName,
  adminEmail,
  stats,
  categoriesCount,
  activeOfferTimersCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayAdminName =
    (adminName || 'Admin Manager').replace(/\s*\(Admin\)\s*/gi, '').trim() || 'Admin Manager';

  const isCoursesSection =
    activeTab === 'all_courses' ||
    activeTab === 'active_courses' ||
    activeTab === 'inactive_courses' ||
    activeTab === 'add_course' ||
    activeTab === 'course_editor';

  const isBookStoreSection =
    activeTab === 'book_add' ||
    activeTab === 'book_store' ||
    activeTab === 'book_categories';

  const activePillClass =
    'bg-rose-50 text-[#eb1c24] border border-rose-200/80 font-bold shadow-2xs';
  const inactivePillClass =
    'text-[#2A0F12]/80 hover:text-[#eb1c24] hover:bg-rose-50/60 border border-transparent font-bold';

  const handleNavClick = (tab: AdminPageTab) => {
    setMobileMenuOpen(false);
    onSelectTab(tab);
  };

  const mobileLinks: Array<{
    id: AdminPageTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'all_courses',
      label: 'All Courses',
      icon: <BookOpen className="w-4 h-4" />,
      badge: stats.totalCourses,
    },
    {
      id: 'course_sort',
      label: 'Course Sort',
      icon: <ArrowUpDown className="w-4 h-4" />,
    },
    {
      id: 'add_course',
      label: 'Add New Course',
      icon: <PlusCircle className="w-4 h-4" />,
    },
    {
      id: 'active_courses',
      label: 'Active Courses',
      icon: <CheckCircle2 className="w-4 h-4" />,
      badge: stats.activeCourses,
    },
    {
      id: 'inactive_courses',
      label: 'Inactive Courses',
      icon: <XCircle className="w-4 h-4" />,
      badge: stats.inactiveCourses,
    },
    {
      id: 'categories',
      label: 'Course Categories',
      icon: <Layers className="w-4 h-4" />,
      badge: categoriesCount,
    },
    {
      id: 'book_add',
      label: 'Book Add',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: stats.totalBooks,
    },
    {
      id: 'book_store',
      label: 'All Books Directory',
      icon: <BookOpen className="w-4 h-4" />,
      badge: stats.totalBooks,
    },
    {
      id: 'online_batches',
      label: 'Online Batch',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: 'guides',
      label: 'Guide Management',
      icon: <BookOpenCheck className="w-4 h-4" />,
    },
    {
      id: 'offer_timers',
      label: 'Offer Timer',
      icon: <AlarmClock className="w-4 h-4" />,
      badge: activeOfferTimersCount,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'icon_sort',
      label: 'Settings → Icon Sort',
      icon: <Layers className="w-4 h-4" />,
    },
  ];

  return (
    <header
      className={`sticky top-3 z-50 mx-auto max-w-[1440px] w-[calc(100%-16px)] sm:w-[calc(100%-28px)] bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_10px_32px_-6px_rgba(42,15,18,0.12),0_4px_14px_rgba(226,43,43,0.08)] transition-all duration-200 relative overflow-visible rounded-[22px] ${
        mobileMenuOpen ? 'md:rounded-[26px]' : ''
      }`}
    >
      {/* Decorative Brand Waves matching Main Website HeaderNav */}
      <div
        className={`absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-[22px] ${
          mobileMenuOpen ? 'md:rounded-[26px]' : ''
        }`}
      >
        {/* Left Crimson Wave */}
        <div className="absolute left-0 top-0 bottom-0 w-32 sm:w-44 select-none opacity-90">
          <svg
            viewBox="0 0 160 64"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <path d="M0 0 L45 0 C70 20 48 45 80 64 L0 64 Z" fill="#eb1c24" opacity="0.10" />
            <path d="M0 0 L30 0 C52 16 32 38 60 64 L0 64 Z" fill="#dc2626" opacity="0.16" />
            <path d="M0 0 L18 0 C34 14 18 30 42 64 L0 64 Z" fill="#b91c1c" opacity="0.22" />
          </svg>
        </div>

        {/* Right Warm Amber-Crimson Wave */}
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-36 select-none opacity-80">
          <svg
            viewBox="0 0 140 64"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <path d="M140 0 L90 0 C70 20 95 44 60 64 L140 64 Z" fill="#f59e0b" opacity="0.08" />
            <path d="M140 0 L108 0 C92 16 112 36 85 64 L140 64 Z" fill="#f97316" opacity="0.14" />
            <path d="M140 0 L124 0 C112 14 125 30 105 64 L140 64 Z" fill="#eb1c24" opacity="0.20" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* LEFT: Admin Brand Logo (Clicking returns to Admin Dashboard Overview) */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/overview"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onSelectTab('overview');
            }}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0 select-none py-0.5 transition-transform hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
            title="অ্যাডমিন ড্যাশবোর্ডে ফিরে যান"
          >
            <Image
              src="/images/logo-transparent.png"
              alt="10 Minute School"
              width={638}
              height={296}
              priority
              style={{ width: 'auto' }}
              className="h-8 sm:h-9 w-auto object-contain block drop-shadow-xs"
            />
          </Link>
        </div>

        {/* CENTER: Admin Primary Navigation */}
        <nav
          className="hidden lg:flex items-center gap-1.5 xl:gap-2 text-[13px] py-0.5"
          aria-label="Admin Top Navigation"
        >
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'overview' ? activePillClass : inactivePillClass
            }`}
          >
            <LayoutDashboard
              className={`w-3.5 h-3.5 ${
                activeTab === 'overview' ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'
              }`}
            />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('all_courses')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isCoursesSection ? activePillClass : inactivePillClass
            }`}
          >
            <BookOpen
              className={`w-3.5 h-3.5 ${isCoursesSection ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'}`}
            />
            <span>Courses</span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums ${
                isCoursesSection
                  ? 'bg-[#eb1c24]/15 text-[#b91c1c]'
                  : 'bg-rose-100/80 text-[#6B4C4F]'
              }`}
            >
              {toBengaliNumber(stats.totalCourses)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('course_sort')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'course_sort' ? activePillClass : inactivePillClass
            }`}
          >
            <ArrowUpDown
              className={`w-3.5 h-3.5 ${
                activeTab === 'course_sort' ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'
              }`}
            />
            <span>Course Sort</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('book_add')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isBookStoreSection ? activePillClass : inactivePillClass
            }`}
          >
            <ShoppingBag
              className={`w-3.5 h-3.5 ${
                isBookStoreSection ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'
              }`}
            />
            <span>Book Add</span>
            {(stats.totalBooks ?? 0) > 0 && (
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums ${
                  isBookStoreSection
                    ? 'bg-[#eb1c24]/15 text-[#b91c1c]'
                    : 'bg-rose-100/80 text-[#6B4C4F]'
                }`}
              >
                {toBengaliNumber(stats.totalBooks ?? 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('categories')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'categories' ? activePillClass : inactivePillClass
            }`}
          >
            <Layers
              className={`w-3.5 h-3.5 ${
                activeTab === 'categories' ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'
              }`}
            />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('online_batches')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'online_batches' ? activePillClass : inactivePillClass
            }`}
          >
            <GraduationCap
              className={`w-3.5 h-3.5 ${
                activeTab === 'online_batches' ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'
              }`}
            />
            <span>Online Batch</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('guides')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'guides' ? activePillClass : inactivePillClass
            }`}
          >
            <BookOpenCheck
              className={`w-3.5 h-3.5 ${
                activeTab === 'guides' ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'
              }`}
            />
            <span>Guide</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('offer_timers')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'offer_timers' ? activePillClass : inactivePillClass
            }`}
          >
            <AlarmClock
              className={`w-3.5 h-3.5 ${
                activeTab === 'offer_timers' ? 'text-[#eb1c24]' : 'text-[#6B4C4F]'
              }`}
            />
            <span>Offer Timer</span>
            {activeOfferTimersCount > 0 && (
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums ${
                  activeTab === 'offer_timers'
                    ? 'bg-[#eb1c24]/15 text-[#b91c1c]'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {toBengaliNumber(activeOfferTimersCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'settings' || activeTab === 'icon_sort'
                ? activePillClass
                : inactivePillClass
            }`}
          >
            <Settings
              className={`w-3.5 h-3.5 ${
                activeTab === 'settings' || activeTab === 'icon_sort'
                  ? 'text-[#eb1c24]'
                  : 'text-[#6B4C4F]'
              }`}
            />
            <span>Settings</span>
          </button>
        </nav>

        {/* RIGHT: Admin Actions & Mobile Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('add_course')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-[0_6px_18px_-4px_rgba(226,43,43,0.45)] transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>নতুন কোর্স</span>
          </button>

          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              onNavigateHome();
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-rose-200/90 bg-white/95 hover:bg-rose-50 hover:border-rose-300 text-[#b91c1c] text-xs font-bold shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="মেইন ওয়েবসাইট দেখুন"
          >
            <span>মেইন সাইট</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={onRequestLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-rose-200/90 bg-rose-50/80 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white hover:shadow-[0_6px_16px_-4px_rgba(235,28,36,0.45)] text-[#991b1b] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            title="অ্যাডমিন প্যানেল থেকে লগআউট করুন"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">লগআউট</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="hidden md:inline-flex lg:hidden p-2 rounded-full text-[#2A0F12] hover:bg-rose-50 cursor-pointer transition-colors shrink-0 border border-rose-100"
            aria-label="Toggle Admin Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-[#eb1c24]" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* TABLET EXPANDED ADMIN DRAWER (Mobile uses Bottom Navigation Bar + More Menu) */}
      {mobileMenuOpen && (
        <div className="hidden md:block lg:hidden border-t border-rose-100 bg-white/95 px-4 py-3.5 space-y-3 rounded-b-[22px] relative z-10">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-rose-50/70 border border-rose-100">
            <div className="min-w-0">
              <div className="text-xs font-black text-[#2A0F12] truncate">
                {displayAdminName}
              </div>
              <div className="text-[11px] font-medium text-[#6B4C4F] truncate">
                {adminEmail || 'admin@10ms.com'}
              </div>
            </div>
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                onNavigateHome();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-[11px] font-bold text-[#b91c1c] shrink-0"
            >
              <span>মেইন সাইট</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-[#6B4C4F] px-2 py-0.5 uppercase tracking-wider">
              অ্যাডমিন নেভিগেশন
            </div>
            {mobileLinks.map((item) => {
              const isActive =
                activeTab === item.id ||
                (activeTab === 'course_editor' && item.id === 'all_courses') ||
                (activeTab === 'book_categories' && item.id === 'book_add');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-sm'
                      : 'text-[#2A0F12] hover:bg-rose-50/80'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-rose-100 text-[#b91c1c]'
                      }`}
                    >
                      {toBengaliNumber(item.badge)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
});
AdminNavbar.displayName = 'AdminNavbar';
