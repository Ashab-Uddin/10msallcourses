'use client';

import React, { useMemo } from 'react';
import {
  Home,
  GraduationCap,
  Award,
  Briefcase,
  ShoppingBag,
} from 'lucide-react';
import type { Category, Course } from '../../types.ts';
import { getNavbarGroupLucideIcon } from '../../lib/categoryIconComponents.ts';

export type MobileTab = 'home' | 'hsc27' | 'hsc28' | 'school' | 'admission' | 'books' | 'skills';

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

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  categories = [],
}) => {
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
    onTabChange(tab);
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      style={{
        paddingBottom: 'calc(0.45rem + env(safe-area-inset-bottom, 0px))',
      }}
      className="md:hidden fixed bottom-2.5 inset-x-2 sm:inset-x-4 max-w-[480px] mx-auto z-50 bg-white/88 backdrop-blur-xl border border-rose-100/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14),0_4px_16px_rgba(226,43,43,0.06)] rounded-[22px] px-1 py-1 transition-all duration-200 select-none"
    >
      <div className="grid grid-cols-7 items-center gap-0.5 w-full">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavItemTap(item.id)}
              aria-current={isActive ? 'page' : undefined}
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
  );
};
