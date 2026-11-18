'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Download,
  Layers,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Settings,
} from 'lucide-react';
import { toBengaliNumber } from '../../utils/format.ts';
import type { AdminPageTab } from './AdminDashboard.tsx';

interface AdminFooterProps {
  onSelectTab: (tab: AdminPageTab) => void;
  onNavigateHome: () => void;
  onRequestLogout?: () => void;
  onDownloadZip?: () => void;
  adminName: string;
  adminEmail: string;
  stats: {
    totalCourses: number;
    activeCourses: number;
    inactiveCourses: number;
    newInquiries?: number;
    totalBooks?: number;
  };
  categoriesCount: number;
  activeOfferTimersCount?: number;
}

export const AdminFooter: React.FC<AdminFooterProps> = ({
  onSelectTab,
  onNavigateHome,
  onDownloadZip,
  adminName,
  adminEmail,
  stats,
  categoriesCount,
  activeOfferTimersCount = 0,
}) => {
  return (
    <footer className="relative z-10 mt-auto pt-12 text-white overflow-hidden select-none">
      {/* Top Layered Organic SVG Waves matching Main Website Footer */}
      <div className="w-full overflow-hidden leading-none relative z-10 pointer-events-none">
        <svg
          className="w-full h-10 sm:h-16 lg:h-20 block"
          viewBox="0 0 1440 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0,32L48,42.7C96,53,192,75,288,74.7C384,75,480,53,576,42.7C672,32,768,32,864,48C960,64,1056,96,1152,96C1248,96,1344,64,1392,48L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            fill="#fb7185"
            fillOpacity="0.28"
          />
          <path
            d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            fill="#be123c"
            fillOpacity="0.6"
          />
          <path
            d="M0,80L48,74.7C96,69,192,59,288,64C384,69,480,91,576,90.7C672,91,768,69,864,64C960,59,1056,69,1152,74.7C1248,80,1344,80,1392,80L1440,80L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            fill="#3d0b13"
          />
        </svg>
      </div>

      {/* Main Warm Burgundy-Crimson Body Container */}
      <div
        className="relative pt-6 sm:pt-8 pb-8 px-4 sm:px-6 lg:px-8 border-t border-rose-800/40 shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #3d0b13 0%, #2a060d 50%, #1e0308 100%)',
        }}
      >
        {/* Ambient radial sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 select-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 0%, rgba(226, 43, 43, 0.35) 0%, transparent 60%), radial-gradient(circle at 12% 40%, rgba(190, 18, 60, 0.22) 0%, transparent 45%)',
          }}
        />

        <div className="max-w-[1440px] mx-auto relative z-10 space-y-7">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Column 1: Admin Panel Branding & Summary */}
            <div className="space-y-3.5">
              <Link
                href="/admin/overview"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTab('overview');
                }}
                className="inline-block group cursor-pointer"
                title="অ্যাডমিন ড্যাশবোর্ডে ফিরে যান"
              >
                <div className="bg-white px-3 py-1.5 rounded-xl shadow-md inline-flex items-center transition-transform group-hover:scale-105">
                  <Image
                    src="/logo.png"
                    alt="10 Minute School"
                    width={638}
                    height={296}
                    style={{ width: 'auto' }}
                    className="h-7 w-auto object-contain block"
                  />
                </div>
                <div className="text-[10px] text-rose-200/90 font-bold tracking-wider uppercase mt-1.5 pl-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Admin Control Panel</span>
                </div>
              </Link>

              <p className="text-xs text-rose-100/80 leading-relaxed">
                কোর্স ক্যাটালগ, ডিসকাউন্ট ও মূল্য আপডেট, ক্যাটাগরি বিন্যাস এবং পোর্টাল সেটিংস পরিচালনার কেন্দ্রীয় অ্যাডমিনিস্ট্রেটর প্যানেল।
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 backdrop-blur-xs">
                  <div className="text-[10px] text-rose-200/80 font-semibold">মোট কোর্স</div>
                  <div className="text-sm font-black text-white tabular-nums">
                    {toBengaliNumber(stats.totalCourses)}টি
                  </div>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 backdrop-blur-xs">
                  <div className="text-[10px] text-rose-200/80 font-semibold">চালু / ক্যাটাগরি</div>
                  <div className="text-sm font-black text-emerald-300 tabular-nums">
                    {toBengaliNumber(stats.activeCourses)} / {toBengaliNumber(categoriesCount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Admin Workspace Sections */}
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                <span>কোর্স ম্যানেজমেন্ট</span>
              </h4>
              <ul className="space-y-2 text-xs text-rose-100/85">
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('overview')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>Overview Dashboard</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('all_courses')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>All Courses Directory</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('add_course')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>Add New Course</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('active_courses')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>Active Courses ({toBengaliNumber(stats.activeCourses)})</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('inactive_courses')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>Inactive Courses ({toBengaliNumber(stats.inactiveCourses)})</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('book_add')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      Book Add (বুক স্টোর)
                      {typeof stats.totalBooks === 'number'
                        ? ` (${toBengaliNumber(stats.totalBooks)})`
                        : ''}
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Configuration & Admin Utilities */}
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                <span>সিস্টেম ও কনফিগারেশন</span>
              </h4>
              <ul className="space-y-2 text-xs text-rose-100/85">
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('categories')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>Course Categories ({toBengaliNumber(categoriesCount)})</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('offer_timers')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Offer Timer ({toBengaliNumber(activeOfferTimersCount)}টি সক্রিয়)
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('inquiries')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Customer Inquiries
                      {(stats.newInquiries ?? 0) > 0
                        ? ` (${toBengaliNumber(stats.newInquiries ?? 0)}টি নতুন)`
                        : ''}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSelectTab('settings')}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>Portal Settings & Contact</span>
                  </button>
                </li>
                <li>
                  <Link
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateHome();
                    }}
                    className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>পাবলিক ওয়েবসাইট ওপেন করুন</span>
                  </Link>
                </li>
                {onDownloadZip && (
                  <li>
                    <button
                      type="button"
                      onClick={onDownloadZip}
                      className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-emerald-300 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-300" />
                      <span>প্রজেক্ট ব্যাকআপ ZIP ডাউনলোড</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 4: Active Session & Version Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-emerald-300" />
                <span>অ্যাডমিন সেশন তথ্য</span>
              </h4>
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5 space-y-2 text-xs backdrop-blur-xs">
                <div>
                  <div className="text-[10px] text-rose-200/75 uppercase tracking-wider font-semibold">
                    লগইনকৃত অ্যাডমিন
                  </div>
                  <div className="font-bold text-white truncate mt-0.5">
                    {(adminName || 'Admin Manager').replace(/\s*\(Admin\)\s*/gi, '').trim() || 'Admin Manager'}
                  </div>
                  <div className="text-[11px] text-rose-200/85 truncate font-mono">
                    {adminEmail || 'admin@10ms.com'}
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-rose-200/80 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Console v2.5</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold text-[10px]">
                    সিকিউর সেশন
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Footer: Copyright & Version */}
          <div className="pt-5 border-t border-rose-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-200/80">
            <div className="text-center sm:text-left">
              © ২০২৬ | <strong className="text-white">10msallcourse.com</strong> Admin Console · সর্বস্বত্ব সংরক্ষিত · ভার্সন ২.৫
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
