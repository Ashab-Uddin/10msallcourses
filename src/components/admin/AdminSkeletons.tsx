'use client';

import React from 'react';
import { GlassAmbientBackdrop } from '../public/GlassAmbientBackdrop.tsx';

export const AdminDashboardSkeleton: React.FC = React.memo(() => {
  return (
    <div
      className="space-y-6 animate-pulse"
      role="status"
      aria-label="অ্যাডমিন ড্যাশবোর্ড লোড হচ্ছে"
    >
      {/* Status Banner Skeleton */}
      <div className="glass-surface rounded-2xl border border-rose-100/80 px-4 py-3 flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-rose-200/80 shrink-0" />
        <div className="h-3 w-64 max-w-[75%] rounded-full bg-rose-200/70" />
      </div>

      {/* Offer Countdown Quick Bar Skeleton */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-200/75 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-52 max-w-full rounded-lg bg-rose-200/80" />
            <div className="h-3 w-72 max-w-[85%] rounded-lg bg-rose-100/90" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-28 rounded-xl bg-rose-100/90" />
          <div className="h-9 w-32 rounded-xl bg-white/80 border border-rose-100" />
        </div>
      </div>

      {/* 4 KPI Metric Cards Grid Skeleton */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
          <div className="h-4 w-56 rounded-lg bg-rose-200/75" />
          <div className="h-3 w-24 rounded-lg bg-rose-100/90" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 rounded bg-rose-100/90" />
                <div className="w-4 h-4 rounded bg-rose-200/75" />
              </div>
              <div className="h-7 w-14 rounded-lg bg-rose-200/80" />
              <div className="h-2.5 w-32 rounded bg-rose-100/80" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Courses / Activity Table Skeleton */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-rose-200/50 pb-3">
          <div className="h-4 w-44 rounded-lg bg-rose-200/75" />
          <div className="h-7 w-24 rounded-xl bg-rose-100/90" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-rose-100/90 shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-3.5 w-2/3 max-w-xs rounded bg-rose-200/75" />
                  <div className="h-2.5 w-1/3 max-w-[180px] rounded bg-rose-100/90" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="h-7 w-16 rounded-xl bg-rose-100/80" />
                <div className="h-7 w-16 rounded-xl bg-rose-100/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
AdminDashboardSkeleton.displayName = 'AdminDashboardSkeleton';

export const AdminSessionVerifyingSkeleton: React.FC = React.memo(() => {
  return (
    <div
      className="relative min-h-screen text-[#2A0F12] flex flex-col"
      role="status"
      aria-label="অ্যাডমিন সেশন যাচাই করা হচ্ছে"
    >
      <GlassAmbientBackdrop />

      {/* Top Floating Navbar Skeleton */}
      <div className="sticky top-3 z-50 mx-auto max-w-[1440px] w-[calc(100%-16px)] sm:w-[calc(100%-28px)] bg-white/90 backdrop-blur-xl border border-white/90 rounded-[22px] px-4 sm:px-6 py-3 shadow-[0_10px_32px_-6px_rgba(42,15,18,0.10)] animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-8 w-28 rounded-xl bg-rose-200/75" />
          <div className="hidden lg:flex items-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-rose-100/85" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block h-8 w-24 rounded-full bg-rose-200/80" />
            <div className="h-8 w-20 rounded-full bg-rose-100/90" />
          </div>
        </div>
      </div>

      {/* Workspace Skeleton */}
      <div className="relative z-10 flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Skeleton */}
        <aside className="hidden lg:block w-72 shrink-0 animate-pulse">
          <div className="glass-strong rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200/50 pb-4">
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-rose-200/80" />
                <div className="h-2.5 w-36 rounded bg-rose-100/90" />
              </div>
              <div className="h-5 w-10 rounded-full bg-rose-100" />
            </div>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-9 w-full rounded-2xl bg-rose-100/70" />
            ))}
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 min-w-0 w-full">
          <AdminDashboardSkeleton />
        </main>
      </div>
    </div>
  );
});
AdminSessionVerifyingSkeleton.displayName = 'AdminSessionVerifyingSkeleton';

export const BookStoreListSkeleton: React.FC = React.memo(() => {
  return (
    <div
      className="space-y-3 animate-pulse"
      role="status"
      aria-label="বইয়ের তালিকা লোড হচ্ছে"
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card rounded-2xl p-3.5 sm:p-4 border border-rose-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-14 h-18 rounded-xl bg-rose-100/90 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-3 w-36 rounded bg-rose-100/90" />
              <div className="h-4 w-2/3 max-w-xs rounded bg-rose-200/80" />
              <div className="h-3 w-48 max-w-full rounded bg-rose-100/80" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-16 rounded-xl bg-rose-100/85" />
            <div className="h-8 w-8 rounded-xl bg-rose-100/80" />
            <div className="h-8 w-16 rounded-xl bg-rose-100/85" />
            <div className="h-8 w-8 rounded-xl bg-rose-100/80" />
          </div>
        </div>
      ))}
    </div>
  );
});
BookStoreListSkeleton.displayName = 'BookStoreListSkeleton';
