'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  PlusCircle,
  ShoppingBag,
  BookOpen,
  Layers,
  Menu,
  CheckCircle2,
  XCircle,
  AlarmClock,
  Settings,
  ExternalLink,
  LogOut,
  X,
  ListOrdered,
  ArrowUpDown,
  GraduationCap,
} from 'lucide-react';
import { toBengaliNumber } from '../../utils/format.ts';
import type { AdminPageTab } from './AdminDashboard.tsx';

interface AdminMobileBottomNavProps {
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
  activeOfferTimersCount?: number;
}

const MORE_MENU_TABS: AdminPageTab[] = [
  'online_batches',
  'course_sort',
  'active_courses',
  'inactive_courses',
  'book_store',
  'book_categories',
  'offer_timers',
  'settings',
  'icon_sort',
];

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = React.memo(({
  activeTab,
  onSelectTab,
  onNavigateHome,
  onRequestLogout,
  adminName,
  adminEmail,
  stats,
  activeOfferTimersCount = 0,
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Automatically close the More menu if activeTab changes externally (e.g., browser back/forward)
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab);
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    if (moreMenuOpen) {
      setMoreMenuOpen(false);
    }
  }

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moreMenuOpen]);

  const displayAdminName =
    (adminName || 'Site Admin').replace(/\s*\(Admin\)\s*/gi, '').trim() || 'Site Admin';

  const handlePrimaryTabClick = (tab: AdminPageTab) => {
    setMoreMenuOpen(false);
    onSelectTab(tab);
  };

  const handleMoreItemClick = (tab: AdminPageTab) => {
    setMoreMenuOpen(false);
    onSelectTab(tab);
  };

  const primaryItems: Array<{
    id: AdminPageTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      isActive: !moreMenuOpen && activeTab === 'overview',
    },
    {
      id: 'add_course',
      label: 'Add Course',
      icon: PlusCircle,
      isActive: !moreMenuOpen && activeTab === 'add_course',
    },
    {
      id: 'book_add',
      label: 'Add Book',
      icon: ShoppingBag,
      isActive: !moreMenuOpen && activeTab === 'book_add',
    },
    {
      id: 'all_courses',
      label: 'Courses',
      icon: BookOpen,
      isActive:
        !moreMenuOpen &&
        (activeTab === 'all_courses' || activeTab === 'course_editor'),
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Layers,
      isActive: !moreMenuOpen && activeTab === 'categories',
    },
  ];

  const isMoreActive = moreMenuOpen || MORE_MENU_TABS.includes(activeTab);

  const moreItems: Array<{
    id: AdminPageTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'online_batches',
      label: 'Online Batch',
      description: 'Online Batch পেজ, সেকশন, ক্লাস আইকন ও কোর্স পরিচালনা',
      icon: GraduationCap,
    },
    {
      id: 'course_sort',
      label: 'Course Sort',
      description: 'ক্যাটাগরি অনুযায়ী কোর্সের পজিশন ড্র্যাগ করে সাজান',
      icon: ArrowUpDown,
    },
    {
      id: 'active_courses',
      label: 'Active Courses',
      description: 'বর্তমানে চালু থাকা কোর্সসমূহ',
      icon: CheckCircle2,
      badge: stats.activeCourses,
    },
    {
      id: 'inactive_courses',
      label: 'Inactive Courses',
      description: 'বন্ধ বা হিডেন অবস্থায় থাকা কোর্স',
      icon: XCircle,
      badge: stats.inactiveCourses,
    },
    {
      id: 'book_store',
      label: 'All Books Directory',
      description: 'বুক স্টোরের সকল বই পরিচালনা',
      icon: BookOpen,
      badge: stats.totalBooks ?? 0,
    },
    {
      id: 'book_categories',
      label: 'Book Categories',
      description: 'বইয়ের ক্যাটাগরি ও সেলফ থিম',
      icon: Layers,
    },
    {
      id: 'offer_timers',
      label: 'Offer Timer',
      description: 'কাউন্টডাউন অফার টাইমার সেটআপ',
      icon: AlarmClock,
      badge: activeOfferTimersCount,
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'সাইট টাইটেল, অ্যাডমিন নাম ও যোগাযোগ',
      icon: Settings,
    },
    {
      id: 'icon_sort',
      label: 'Icon Sort (Settings)',
      description: 'মেইন ওয়েবসাইটের আইকন পজিশন সাজান',
      icon: ListOrdered,
    },
  ];

  return (
    <>
      {/* More Menu Backdrop & Floating Glass Sheet (Mobile Only) */}
      <AnimatePresence>
        {moreMenuOpen && (
          <>
            <motion.div
              key="admin-more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMoreMenuOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-[#2A0F12]/35 backdrop-blur-[2px]"
              aria-hidden="true"
            />

            <motion.div
              key="admin-more-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Admin More Navigation Menu"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="md:hidden fixed bottom-[82px] inset-x-3 sm:inset-x-4 max-w-[480px] mx-auto z-[45] bg-white/95 backdrop-blur-2xl border border-rose-100 shadow-[0_20px_50px_-10px_rgba(42,15,18,0.24),0_8px_24px_rgba(226,43,43,0.10)] rounded-[24px] p-3.5 max-h-[calc(100dvh-165px)] overflow-y-auto select-none"
            >
              {/* Admin Profile & Public Site Shortcut */}
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl bg-rose-50/75 border border-rose-100 mb-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#2A0F12] truncate">
                    {displayAdminName}
                  </div>
                  <div className="text-[10.5px] font-mono text-[#6B4C4F] truncate">
                    {adminEmail || 'admin@10ms.com'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      setMoreMenuOpen(false);
                      onNavigateHome();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-rose-200/90 text-[11px] font-bold text-[#b91c1c] hover:bg-rose-50 transition"
                  >
                    <span>মেইন সাইট</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen(false)}
                    className="p-1.5 rounded-xl text-[#6B4C4F] hover:text-[#eb1c24] hover:bg-white transition cursor-pointer"
                    aria-label="Close More Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-[10px] font-extrabold text-[#6B4C4F] px-2 pb-1.5 uppercase tracking-wider">
                অন্যান্য অ্যাডমিন অপশন
              </div>

              <div className="space-y-1">
                {moreItems.map((item) => {
                  const isItemActive = activeTab === item.id;
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMoreItemClick(item.id)}
                      aria-current={isItemActive ? 'page' : undefined}
                      className={`w-full text-left px-3 py-2.5 rounded-2xl transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] touch-manipulation ${
                        isItemActive
                          ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white shadow-[0_8px_20px_-6px_rgba(226,43,43,0.45)]'
                          : 'text-[#2A0F12] hover:bg-rose-50/80'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isItemActive
                              ? 'bg-white/20 text-white'
                              : 'bg-rose-50 text-[#eb1c24] border border-rose-100'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-extrabold truncate">
                            {item.label}
                          </span>
                          <span
                            className={`block text-[10px] truncate ${
                              isItemActive ? 'text-rose-100' : 'text-[#6B4C4F]'
                            }`}
                          >
                            {item.description}
                          </span>
                        </span>
                      </span>

                      {typeof item.badge === 'number' && (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                            isItemActive
                              ? 'bg-white/20 text-white'
                              : 'bg-rose-100/90 text-[#b91c1c]'
                          }`}
                        >
                          {toBengaliNumber(item.badge)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Utility Actions */}
              <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onRequestLogout();
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-[#eb1c24] hover:text-white text-[#991b1b] text-[11px] font-bold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fixed Mobile Bottom Navigation Bar matching Main Website MobileBottomNav */}
      <nav
        aria-label="Admin Mobile Bottom Navigation"
        style={{
          paddingBottom: 'calc(0.45rem + env(safe-area-inset-bottom, 0px))',
        }}
        className="md:hidden fixed bottom-2.5 inset-x-3 sm:inset-x-4 max-w-[480px] mx-auto z-[45] bg-white/85 backdrop-blur-xl border border-rose-100/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14),0_4px_16px_rgba(226,43,43,0.06)] rounded-[22px] px-1 py-1 transition-all duration-200 select-none"
      >
        <div className="grid grid-cols-6 items-center gap-0.5 w-full">
          {primaryItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePrimaryTabClick(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation group ${
                  item.isActive
                    ? 'bg-rose-50/90 text-[#eb1c24] border border-rose-200/60 shadow-2xs font-extrabold'
                    : 'border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/60 font-semibold'
                }`}
                aria-current={item.isActive ? 'page' : undefined}
              >
                <div
                  className={`relative flex items-center justify-center transition-transform duration-200 ${
                    item.isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                >
                  <IconComponent
                    className={`w-[19px] h-[19px] transition-colors stroke-[2] ${
                      item.isActive
                        ? 'text-[#eb1c24]'
                        : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                </div>

                <span
                  className={`text-[9px] sm:text-[10px] leading-tight tracking-tight mt-1 truncate max-w-full text-center transition-colors ${
                    item.isActive
                      ? 'text-[#eb1c24] font-extrabold'
                      : 'text-slate-600 group-hover:text-slate-900 font-bold'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More / Three Straight Lines Menu Button */}
          <button
            type="button"
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            aria-expanded={moreMenuOpen}
            aria-label="More Admin Options"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation group ${
              isMoreActive
                ? 'bg-rose-50/90 text-[#eb1c24] border border-rose-200/60 shadow-2xs font-extrabold'
                : 'border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/60 font-semibold'
            }`}
          >
            <div
              className={`relative flex items-center justify-center transition-transform duration-200 ${
                isMoreActive ? 'scale-110' : 'group-hover:scale-105'
              }`}
            >
              <Menu
                className={`w-[19px] h-[19px] transition-colors stroke-[2] ${
                  isMoreActive
                    ? 'text-[#eb1c24]'
                    : 'text-slate-500 group-hover:text-slate-800'
                }`}
              />
            </div>

            <span
              className={`text-[9px] sm:text-[10px] leading-tight tracking-tight mt-1 truncate max-w-full text-center transition-colors ${
                isMoreActive
                  ? 'text-[#eb1c24] font-extrabold'
                  : 'text-slate-600 group-hover:text-slate-900 font-bold'
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
});
AdminMobileBottomNav.displayName = 'AdminMobileBottomNav';
