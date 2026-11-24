'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useHistoryOverlay } from '../../lib/navigationHistory.ts';
import type { Category, Course } from '../../types.ts';
import { courseMatchesCategorySlug } from '../../lib/categoryMatching.ts';
import { buildReadableCategoryPath } from '../../lib/courseSlug.ts';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  Smartphone,
  Zap,
  Users,
  X,
  Sparkles,
} from 'lucide-react';

export interface SiteFooterProps {
  onNavigate: (path: string) => void;
  onQuickFilter?: (catSlug: string, queryText?: string) => void;
  onDirectCourseLink?: (slug: string) => void;
  categories?: Category[];
  courses?: Course[];
  isAdminAuthenticated?: boolean;
  authToken?: string | null;
  whatsappNumber?: string;
  whatsappLink?: string;
  facebookLink?: string;
  youtubeLink?: string;
  instagramLink?: string;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  onNavigate,
  onQuickFilter,
  categories = [],
  courses = [],
  whatsappNumber = '+880 1625171822',
  whatsappLink = 'https://wa.me/8801625171822',
  facebookLink = 'https://www.facebook.com/10ms.official',
  youtubeLink = 'https://www.youtube.com/@10MinuteSchool',
  instagramLink = 'https://www.instagram.com/10ms_official',
}) => {
  const dynamicFooterCategories = useMemo(() => {
    const activeOrdered = [...categories]
      .filter((cat) => cat.status !== 'inactive')
      .sort(
        (a, b) =>
          (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
      );

    if (courses.length === 0) {
      return activeOrdered;
    }

    const withCourses = activeOrdered.filter((cat) =>
      courses.some((course) => courseMatchesCategorySlug(course, cat.slug))
    );
    return withCourses.length > 0 ? withCourses : activeOrdered;
  }, [categories, courses]);
  // Modal for Policy / Information popups
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const closeFooterModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  useHistoryOverlay('footer-info-modal', Boolean(activeModal), closeFooterModal);

  const handleLinkClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    action();
  };

  const modalContents: Record<string, { title: string; subtitle: string; content: React.ReactNode }> = {
    about: {
      title: 'আমাদের সম্পর্কে',
      subtitle: '১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস ও অনুমোদিত অ্যাফিলিয়েট হাব',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>10msallcourses.com</strong> হলো ১০ মিনিট স্কুলের সকল একাডেমিক, এডমিশন ও প্রফেশনাল স্কিল কোর্সের একটি ডেডিকেটেড ডিসকাউন্ট ও ইনফরমেশন প্ল্যাটফর্ম।
          </p>
          <p>
            শিক্ষার্থীরা যেন প্রতিটি কোর্সের সঠিক সিলেবাস, ক্লাস রুটিন, অভিজ্ঞ শিক্ষক মণ্ডলী এবং সর্বোচ্চ অনুমোদিত প্রোমো/কুপন কোড ব্যবহার করে সাশ্রয়ী মূল্যে সরাসরি ১০ মিনিট স্কুলে ভর্তি হতে পারে—সেটি নিশ্চিত করাই আমাদের প্রধান লক্ষ্য।
          </p>
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 space-y-1.5">
            <h6 className="font-bold text-[#991b1b]">আমাদের প্রতিশ্রুতি:</h6>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>১০০% অফিসিয়াল ১০ মিনিট স্কুল সরাসরি পেমেন্ট গেটওয়ে।</li>
              <li>সর্বোচ্চ স্পেশাল ছাড় ও ক্যাশব্যাক অফারের তাৎক্ষণিক আপডেট।</li>
              <li>ভর্তি প্রক্রিয়ায় যেকোনো সহায়তার জন্য সার্বক্ষণিক ডেডিকেটেড সাপোর্ট।</li>
            </ul>
          </div>
        </div>
      ),
    },
    privacy: {
      title: 'গোপনীয়তা নীতি (Privacy Policy)',
      subtitle: 'আপনার তথ্যের সর্বোচ্চ নিরাপত্তা আমাদের অঙ্গীকার',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            আমরা ব্যবহারকারীদের ব্যক্তিগত গোপনীয়তাকে সর্বোচ্চ গুরুত্ব দেই। আমাদের ওয়েবসাইটে ব্রাউজ করার সময় কোনো সংবেদনশীল ব্যক্তিগত ডেটা বিনা অনুমতিতে সংগ্রহ বা সংরক্ষণ করা হয় না।
          </p>
          <div className="space-y-2">
            <h6 className="font-bold text-[#2A0F12]">তথ্য সংগ্রহ ও ব্যবহার:</h6>
            <p>
              কোর্সে ভর্তির সময় শিক্ষার্থীরা সরাসরি ১০ মিনিট স্কুলের অফিসিয়াল সিকিউর পেমেন্ট গেটওয়ে ব্যবহার করে ভর্তি সম্পন্ন করেন। পেমেন্ট তথ্য বা কার্ডের কোনো ডাটা আমাদের সার্ভারে সংরক্ষিত হয় না।
            </p>
          </div>
          <div className="space-y-2">
            <h6 className="font-bold text-[#2A0F12]">কুকিজ ও ব্রাউজিং এক্সপেরিয়েন্স:</h6>
            <p>
              শুধুমাত্র ব্যবহারকারীর পছন্দসই কোর্স ফিল্টারিং ও মসৃণ ব্রাউজিং অভিজ্ঞতা নিশ্চিত করতে সাধারণ সেশন কুকিজ ব্যবহার করা হতে পারে।
            </p>
          </div>
        </div>
      ),
    },
    terms: {
      title: 'ব্যবহারের শর্তাবলী (Terms & Conditions)',
      subtitle: 'প্ল্যাটফর্ম ব্যবহারের নিয়মাবলী ও নীতিমালা',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            এই প্ল্যাটফর্মটি ১০ মিনিট স্কুলের অফিশিয়াল অ্যাফিলিয়েট পার্টনারশিপ কাঠামোর অধীনে পরিচালিত। আমাদের মাধ্যমে ভর্তি হওয়া সকল কোর্সের একাডেমিক ক্লাস, কনটেন্ট, এক্সাম এবং সার্টিফিকেট সম্পূর্ণভাবে ১০ মিনিট স্কুল কর্তৃপক্ষ দ্বারা পরিচালিত ও নিয়ন্ত্রিত।
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>কোর্সের মূল্য, ছাড় এবং অফারের মেয়াদ ১০ মিনিট স্কুলের কেন্দ্রীয় নীতিমালা অনুযায়ী পরিবর্তনশীল হতে পারে।</li>
            <li>ভর্তির পর কোর্স অ্যাক্সেস পেতে সরাসরি আপনার রেজিস্টার্ড ফোন নম্বরে ১০ মিনিট স্কুল অ্যাপ বা ওয়েবসাইটে লগইন করতে হবে।</li>
          </ul>
        </div>
      ),
    },
    refund: {
      title: 'রিফান্ড নীতি (Refund Policy)',
      subtitle: 'কোর্স বাতিল ও অর্থ ফেরত সংক্রান্ত নীতিমালা',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            যেহেতু সকল পেমেন্ট সরাসরি ১০ মিনিট স্কুলের অফিশিয়াল গেটওয়েতে জমা হয়, সেহেতু কোর্সের রিফান্ড পলিসি সরাসরি ১০ মিনিট স্কুলের সেন্ট্রাল রিফান্ড পলিসি অনুযায়ী কার্যকর হবে।
          </p>
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-slate-800 space-y-1.5">
            <h6 className="font-bold text-amber-900">রিফান্ড আবেদন প্রক্রিয়া:</h6>
            <p>
              কোনো কোর্সে রিফান্ডের প্রয়োজন হলে ভর্তির ৪৮ ঘণ্টার মধ্যে ১০ মিনিট স্কুলের অফিসিয়াল হেল্পলাইন <strong>16910</strong> নম্বরে কল করে অথবা আমাদের হোয়াটসঅ্যাপে সহায়তা নিয়ে আবেদন করা যাবে।
            </p>
          </div>
        </div>
      ),
    },
    resources: {
      title: 'ফ্রি রিসোর্স ও সহায়িকা',
      subtitle: 'শিক্ষার্থীদের জন্য বিনামূল্যে ক্লাস ও গাইডলাইন',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <p>
            ১০ মিনিট স্কুলের প্ল্যাটফর্মে একাডেমিক ও স্কিল ডেভেলপমেন্টের হাজার হাজার ফ্রি ক্লাস, লেকচার শিট ও প্র্যাকটিস টেস্ট রয়েছে।
          </p>
          <p>
            আপনি যদি কোনো নির্দিষ্ট বিষয়ের ফ্রি ডেমো ক্লাস বা গাইডলাইন দেখতে চান, সরাসরি আমাদের হোয়াটসঅ্যাপ হেল্পলাইনে জানান। আমাদের টিম আপনাকে সঠিক ফ্রি রিসোর্সের লিংক পৌঁছে দেবে।
          </p>
        </div>
      ),
    },
  };

  return (
    <>
      <footer className="relative z-10 mt-16 text-white overflow-hidden select-none">
        {/* ========================================================= */}
        {/* TOP LAYERED ORGANIC SVG WAVES TRANSITION                  */}
        {/* Blends smoothly from soft rose page into warm burgundy    */}
        {/* ========================================================= */}
        <div className="w-full overflow-hidden leading-none relative z-10 pointer-events-none">
          <svg
            className="w-full h-12 sm:h-20 lg:h-24 block"
            viewBox="0 0 1440 120"
            fill="none"
            preserveAspectRatio="none"
          >
            {/* Wave 1: Soft Translucent Rose Ribbon */}
            <path
              d="M0,32L48,42.7C96,53,192,75,288,74.7C384,75,480,53,576,42.7C672,32,768,32,864,48C960,64,1056,96,1152,96C1248,96,1344,64,1392,48L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill="#fb7185"
              fillOpacity="0.28"
            />
            {/* Wave 2: Middle Vibrant Rose-Wine Wave */}
            <path
              d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill="#be123c"
              fillOpacity="0.6"
            />
            {/* Wave 3: Solid Warm Burgundy Base smoothly matching container */}
            <path
              d="M0,80L48,74.7C96,69,192,59,288,64C384,69,480,91,576,90.7C672,91,768,69,864,64C960,59,1056,69,1152,74.7C1248,80,1344,80,1392,80L1440,80L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill="#3d0b13"
            />
          </svg>
        </div>

        {/* ========================================================= */}
        {/* MAIN BODY CONTAINER: WARM BURGUNDY-CRIMSON THEME          */}
        {/* (Not too dark, matching website colors perfectly)         */}
        {/* ========================================================= */}
        <div
          className="relative pt-6 sm:pt-10 pb-10 px-4 sm:px-6 lg:px-8 border-t border-rose-800/40 shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, #3d0b13 0%, #2a060d 50%, #1e0308 100%)',
          }}
        >
          {/* Soft ambient lighting glows */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 select-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 0%, rgba(226, 43, 43, 0.35) 0%, transparent 60%), radial-gradient(circle at 12% 40%, rgba(190, 18, 60, 0.22) 0%, transparent 45%)',
            }}
          />

          {/* Tiny subtle micro-sparkles (small and tasteful) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 select-none">
            <Sparkles className="absolute top-8 left-16 w-5 h-5 text-amber-300" />
            <Sparkles className="absolute bottom-16 right-20 w-4 h-4 text-rose-300" />
            <Sparkles className="absolute top-1/2 left-1/3 w-3.5 h-3.5 text-amber-200" />
          </div>

          <div className="max-w-[1240px] mx-auto relative z-10 space-y-8">
            <h2 className="sr-only">ফুটার নেভিগেশন ও যোগাযোগ</h2>
            {/* ===================================================== */}
            {/* 4-COLUMN MAIN FOOTER CONTENT                          */}
            {/* ===================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
              {/* --------------------------------------------------- */}
              {/* COLUMN 1: BRANDING, TAGLINE & OUR FAMILY            */}
              {/* --------------------------------------------------- */}
              <div className="space-y-4">
                {/* Brand Logo & Title */}
                <div
                  onClick={() => onNavigate('/')}
                  className="cursor-pointer inline-block group"
                  title="হোমপেজে ফিরে যান"
                >
                  <div className="bg-white px-3.5 py-1.5 rounded-xl shadow-md inline-flex items-center transition-transform group-hover:scale-105">
                    <Image
                      src="/logo.png"
                      alt="১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস লোগো"
                      width={638}
                      height={296}
                      style={{ width: 'auto' }}
                      className="h-8 sm:h-9 w-auto object-contain block"
                    />
                  </div>
                  <div className="text-[10px] text-rose-200/90 font-semibold tracking-wider uppercase mt-1.5 pl-0.5">
                    কোর্স মার্কেটপ্লেস ও অ্যাফিলিয়েট হাব
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-xs text-rose-100/85 leading-relaxed">
                  এসএসসি, এইচএসসি, এডমিশন, স্কিলস ও জব প্রিপারেশন — শিক্ষার্থীদের প্রতিটি ধাপের নির্ভরযোগ্য ও পূর্ণাঙ্গ প্রস্তুতি এক প্ল্যাটফর্মে।
                </p>

                {/* আমাদের সেবা ও পরিবার (Clean, colorful cards) */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-rose-200 block mb-2.5">
                    আমাদের সেবা ও পরিবার
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 p-2 rounded-xl border border-white/15 transition backdrop-blur-xs">
                      <div className="w-6 h-6 rounded-lg bg-red-500/25 flex items-center justify-center text-red-300">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-rose-50">১০এমএস অ্যাপ</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 p-2 rounded-xl border border-white/15 transition backdrop-blur-xs">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/25 flex items-center justify-center text-amber-300">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-rose-50">অনলাইন ব্যাচ</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 p-2 rounded-xl border border-white/15 transition backdrop-blur-xs">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/25 flex items-center justify-center text-emerald-300">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-rose-50">লাইভ এক্সাম</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 p-2 rounded-xl border border-white/15 transition backdrop-blur-xs">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/25 flex items-center justify-center text-blue-300">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-rose-50">কমিউনিটি</span>
                    </div>
                  </div>
                </div>

                {/* Social Links: ORIGINAL BRAND COLORS AND ICONS */}
                <div className="pt-2 flex items-center gap-3">
                  {/* Facebook - Official Blue */}
                  <a
                    href={facebookLink || 'https://www.facebook.com/10ms.official'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#1877F2] hover:bg-[#166fe5] flex items-center justify-center text-white shadow-md shadow-blue-900/40 transition-all hover:scale-110 active:scale-95"
                    title="Facebook"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>

                  {/* YouTube - Official Red */}
                  <a
                    href={youtubeLink || 'https://www.youtube.com/@10MinuteSchool'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#FF0000] hover:bg-[#e60000] flex items-center justify-center text-white shadow-md shadow-red-900/40 transition-all hover:scale-110 active:scale-95"
                    title="YouTube"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>

                  {/* Instagram - Official Gradient */}
                  <a
                    href={instagramLink || 'https://www.instagram.com/10ms_official'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md shadow-pink-900/40 transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                    }}
                    title="Instagram"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                  </a>

                  {/* WhatsApp - Official Green */}
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20ba59] flex items-center justify-center text-white shadow-md shadow-emerald-900/40 transition-all hover:scale-110 active:scale-95"
                    title="WhatsApp"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* --------------------------------------------------- */}
              {/* COLUMN 2: কোর্সসমূহ (DYNAMIC CATEGORY-WISE LIST)     */}
              {/* --------------------------------------------------- */}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span>কোর্সসমূহ</span>
                </h3>
                <ul className="space-y-2 text-xs text-rose-100/85">
                  {dynamicFooterCategories.length > 0 ? (
                    dynamicFooterCategories.map((cat) => (
                      <li key={`footer-cat-${cat.id}-${cat.slug}`}>
                        <button
                          type="button"
                          onClick={(e) =>
                            handleLinkClick(e, () =>
                              onNavigate(buildReadableCategoryPath(cat.slug))
                            )
                          }
                          className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-left"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{cat.name}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <>
                      <li>
                        <button
                          type="button"
                          onClick={(e) =>
                            handleLinkClick(e, () =>
                              onQuickFilter ? onQuickFilter('all') : onNavigate('/')
                            )
                          }
                          className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>সকল কোর্স দেখুন</span>
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* --------------------------------------------------- */}
              {/* COLUMN 3: সহায়তা ও পলিসি (SUPPORT & POLICIES)        */}
              {/* --------------------------------------------------- */}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>সহায়তা ও পলিসি</span>
                </h3>
                <ul className="space-y-2 text-xs text-rose-100/85">
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('about')}
                      className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>আমাদের সম্পর্কে</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('resources')}
                      className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>ফ্রি রিসোর্স ও সহায়িকা</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('privacy')}
                      className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>গোপনীয়তা নীতি (Privacy Policy)</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('terms')}
                      className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>ব্যবহারের শর্তাবলী</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveModal('refund')}
                      className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>রিফান্ড নীতি</span>
                    </button>
                  </li>
                  <li>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-emerald-300 font-semibold"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
                      <span>সরাসরি হোয়াটসঅ্যাপে সাহায্য নিন</span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* --------------------------------------------------- */}
              {/* COLUMN 4: যোগাযোগ ও অফিসিয়াল ভেরিফিকেশন (CONTACT)   */}
              {/* --------------------------------------------------- */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>যোগাযোগ</span>
                </h3>
                <div className="space-y-2.5 text-xs text-rose-100/85">
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div>
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-white text-xs hover:text-emerald-300 transition inline-block"
                      >
                        {whatsappNumber} (WhatsApp)
                      </a>
                      <div className="text-[10.5px] text-rose-200/80">সকাল ৮টা থেকে রাত ১১টা</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div>
                      <a
                        href="mailto:10msallcoursess@gmail.com"
                        className="font-bold text-white text-xs hover:text-rose-200 transition inline-block break-all"
                      >
                        10msallcoursess@gmail.com
                      </a>
                      <div className="text-[10.5px] text-rose-200/80">যেকোনো জিজ্ঞাসা ও সহায়তায়</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white text-xs leading-relaxed">
                        মহাখালী: লিফট-৭, ব্লক-১০৮, রোড-৮, মহাখালী ডিওএইচএস, ঢাকা
                      </div>
                      <div className="text-[10.5px] text-rose-200/80">বাংলাদেশ</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-300">
                        অনুমোদিত ১০ মিনিট স্কুল অ্যাফিলিয়েট পার্টনার
                      </div>
                      <div className="text-[10px] text-rose-200/70">
                        রেজিস্টার্ড পার্টনার কোড সহ ইনস্ট্যান্ট ছাড়
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* BOTTOM SUB-FOOTER: COPYRIGHT                          */}
            {/* ===================================================== */}
            <div className="pt-6 border-t border-rose-800/40 text-center md:text-left text-xs text-rose-200/80">
              © ২০২৬ | <strong className="text-white">10msallcourses.com</strong> (১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস)। সর্বস্বত্ব সংরক্ষিত।
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* INFORMATION & POLICIES MODAL DIALOG                      */}
      {/* ========================================================= */}
      {activeModal && modalContents[activeModal] && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white p-5 flex items-center justify-between">
              <div>
                <h4 className="text-base sm:text-lg font-bold">
                  {modalContents[activeModal].title}
                </h4>
                <p className="text-[11px] text-rose-200 mt-0.5">
                  {modalContents[activeModal].subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto">
              {modalContents[activeModal].content}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>১০ মিনিট স্কুল অফিশিয়াল অ্যাফিলিয়েট প্ল্যাটফর্ম</span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-bold rounded-xl transition cursor-pointer"
              >
                বুঝেছি / বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
