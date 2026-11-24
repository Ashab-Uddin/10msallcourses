'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  ArrowLeft,
  LogIn,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import type { AdminOverviewData } from '../../types.ts';
import { GlassAmbientBackdrop } from '../public/GlassAmbientBackdrop.tsx';

interface AdminLoginProps {
  onLoginSuccess: (
    email: string,
    name: string,
    initialDashboardData?: AdminOverviewData | null
  ) => void;
  onBackToSite: () => void;
}

let dashboardChunkPreloaded = false;
function preloadAdminDashboardChunk() {
  if (dashboardChunkPreloaded || typeof window === 'undefined') return;
  dashboardChunkPreloaded = true;
  void import('./AdminDashboard.tsx').catch(() => {
    dashboardChunkPreloaded = false;
  });
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToSite,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Warm up AdminDashboard JS chunk in background while the admin enters credentials
  useEffect(() => {
    preloadAdminDashboardChunk();
  }, []);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      setError('অনুগ্রহ করে অ্যাডমিন ইমেইল এবং পাসওয়ার্ড দিন।');
      return;
    }

    setLoading(true);
    setError(null);
    preloadAdminDashboardChunk();

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          includeOverview: true,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: {
        error?: string;
        success?: boolean;
        email?: string;
        name?: string;
        role?: string;
        provider?: string;
        initialDashboardData?: AdminOverviewData | null;
      } = {};
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text();
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {
            error:
              res.status === 502 || res.status === 503 || res.status === 504
                ? 'সার্ভার প্রস্তুত হচ্ছে, অনুগ্রহ করে ২-৩ সেকেন্ড পর আবার চেষ্টা করুন।'
                : 'সার্ভার থেকে অপ্রত্যাশিত রেসপন্স এসেছে।',
          };
        }
      }

      if (!res.ok || !data.success) {
        throw new Error(data?.error || `লগইন ব্যর্থ হয়েছে (${res.status})।`);
      }

      const userEmail = data.email || cleanEmail;
      const userName = data.name || 'Site Admin';

      onLoginSuccess(userEmail, userName, data.initialDashboardData ?? null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'সার্ভারে লগইন করতে সমস্যা হয়েছে।';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#2A0F12] flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      <GlassAmbientBackdrop />
      <div className="max-w-md w-full mx-auto my-auto relative z-10">
        <button
          type="button"
          onClick={onBackToSite}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B4C4F] hover:text-[#eb1c24] mb-5 px-3 py-1.5 rounded-full glass-surface transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>পাবলিক ওয়েবসাইটে ফিরে যান</span>
        </button>

        <div className="glass-strong rounded-3xl p-6 sm:p-8 space-y-5">
          {/* Logo & Heading */}
          <div className="text-center space-y-2">
            <Image
              src="/images/logo-transparent.png"
              alt="10 Minute School"
              width={638}
              height={296}
              priority
              style={{ width: 'auto' }}
              className="h-10 w-auto object-contain mx-auto block drop-shadow-xs mb-2"
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#b91c1c] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#eb1c24]" />
              <span>সিকিউর অ্যাডমিন পোর্টাল</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#2A0F12]">
              অ্যাডমিনিস্ট্রেটর লগইন
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              কোর্স ম্যানেজমেন্ট, মূল্য ও ডিসকাউন্ট, অফার টাইমার এবং ওয়েবসাইট কনফিগারেশনে প্রবেশ করতে সাইন ইন করুন।
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email-input"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                অ্যাডমিন ইমেইল
              </label>
              <input
                id="admin-email-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={preloadAdminDashboardChunk}
                disabled={loading}
                required
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb1c24] transition shadow-2xs font-medium disabled:opacity-65"
                placeholder="admin@yourdomain.com"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={preloadAdminDashboardChunk}
                  disabled={loading}
                  required
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#eb1c24] transition shadow-2xs font-mono font-bold disabled:opacity-65"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-75 shadow-md shadow-red-500/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? 'লগইন ও ড্যাশবোর্ড প্রস্তুত হচ্ছে...' : 'সিকিউর লগইন করুন'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-rose-200/50 text-[11px] text-[#6B4C4F] flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 font-medium">
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>HttpOnly Secure Auth</span>
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              সুরক্ষিত সংযোগ
            </span>
          </div>
        </div>
      </div>

      <footer className="relative z-10 text-center text-xs text-[#6B4C4F] font-medium py-3">
        © ২০২৬ · 10msallcourses.com Admin Console
      </footer>
    </div>
  );
};
