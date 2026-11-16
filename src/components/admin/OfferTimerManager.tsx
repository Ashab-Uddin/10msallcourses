'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit,
  ExternalLink,
  Link2,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react';
import type { Course, OfferTimer, OfferTimerComputedStatus } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  computeOfferTimerStatus,
  formatOfferDateTimeDisplay,
  formatRemainingTimeSummary,
  getLocalTimezoneLabel,
  toLocalDateTimeInputValue,
} from '../../lib/offerTimerUtils.ts';

interface OfferTimerManagerProps {
  authToken: string;
  courses: Course[];
  timers: OfferTimer[];
  serverNow?: string;
  onTimersUpdated: (timers: OfferTimer[], serverNow?: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const STATUS_META: Record<
  OfferTimerComputedStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active (চলমান)',
    className: 'bg-emerald-100/90 text-emerald-800 border-emerald-300',
  },
  scheduled: {
    label: 'Scheduled (নির্ধারিত)',
    className: 'bg-blue-100/90 text-blue-800 border-blue-300',
  },
  paused: {
    label: 'Paused (বিরতি)',
    className: 'bg-amber-100/90 text-amber-800 border-amber-300',
  },
  expired: {
    label: 'Expired (মেয়াদ শেষ)',
    className: 'bg-slate-100 text-slate-600 border-slate-300',
  },
};

export const OfferTimerManager: React.FC<OfferTimerManagerProps> = ({
  authToken,
  courses,
  timers,
  serverNow,
  onTimersUpdated,
  onShowToast,
}) => {
  // Synchronized live clock (avoids pure render Date.now() calls)
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(() => {
    if (serverNow) {
      const parsed = new Date(serverNow).getTime();
      if (Number.isFinite(parsed)) return parsed - Date.now();
    }
    return 0;
  });
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [timezoneLabel] = useState<string>(() => getLocalTimezoneLabel());

  useEffect(() => {
    if (!serverNow) return;
    const t = setTimeout(() => {
      const parsed = new Date(serverNow).getTime();
      if (Number.isFinite(parsed)) {
        setClockOffsetMs(parsed - Date.now());
      }
    }, 0);
    return () => clearTimeout(t);
  }, [serverNow]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const effectiveNowMs = nowMs + clockOffsetMs;

  // Form state
  const formRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingTimer, setEditingTimer] = useState<OfferTimer | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseSearch, setCourseSearch] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [offerLabel, setOfferLabel] = useState<string>('');
  const [startLocal, setStartLocal] = useState<string>(() =>
    toLocalDateTimeInputValue(new Date())
  );
  const [endLocal, setEndLocal] = useState<string>(() =>
    toLocalDateTimeInputValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // List filter & row action states
  const [statusFilter, setStatusFilter] = useState<
    'all' | OfferTimerComputedStatus
  >('all');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [deleteConfirmTimer, setDeleteConfirmTimer] =
    useState<OfferTimer | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Close searchable course dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  // Track which courses already have an Active or Scheduled timer (excluding current edited timer)
  const conflictingCourseIds = useMemo(() => {
    const set = new Set<number>();
    for (const t of timers) {
      if (editingTimer && t.id === editingTimer.id) continue;
      const status = computeOfferTimerStatus(t, effectiveNowMs);
      if (status === 'active' || status === 'scheduled') {
        set.add(Number(t.courseId));
      }
    }
    return set;
  }, [timers, editingTimer, effectiveNowMs]);

  const filteredDropdownCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.categorySlug.toLowerCase().includes(q)
    );
  }, [courses, courseSearch]);

  const statusCounts = useMemo(() => {
    const counts = { all: timers.length, active: 0, scheduled: 0, paused: 0, expired: 0 };
    for (const t of timers) {
      const st = computeOfferTimerStatus(t, effectiveNowMs);
      counts[st] += 1;
    }
    return counts;
  }, [timers, effectiveNowMs]);

  const displayedTimers = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return timers.filter((t) => {
      const st = computeOfferTimerStatus(t, effectiveNowMs);
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (q) {
        const matchTitle = t.courseTitle.toLowerCase().includes(q);
        const matchLabel = t.offerLabel.toLowerCase().includes(q);
        const matchSlug = t.courseSlug.toLowerCase().includes(q);
        if (!matchTitle && !matchLabel && !matchSlug) return false;
      }
      return true;
    });
  }, [timers, statusFilter, tableSearch, effectiveNowMs]);

  const resetForm = () => {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    setEditingTimer(null);
    setSelectedCourseId(null);
    setCourseSearch('');
    setOfferLabel('');
    setStartLocal(toLocalDateTimeInputValue(now));
    setEndLocal(toLocalDateTimeInputValue(threeDaysLater));
    setFormError(null);
  };

  const handleStartPreset = (offsetHours: number) => {
    const d = new Date(effectiveNowMs + offsetHours * 60 * 60 * 1000);
    setStartLocal(toLocalDateTimeInputValue(d));
    setFormError(null);
  };

  const handleEndPreset = (offsetHours: number) => {
    const startMs = new Date(startLocal).getTime();
    const baseMs = Number.isFinite(startMs)
      ? Math.max(startMs, effectiveNowMs)
      : effectiveNowMs;
    const d = new Date(baseMs + offsetHours * 60 * 60 * 1000);
    setEndLocal(toLocalDateTimeInputValue(d));
    setFormError(null);
  };

  const refreshTimersFromServer = async (showFeedback = false) => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/timers', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('টাইমার তালিকা রিফ্রেশ করা যায়নি।');
      const data = await res.json();
      onTimersUpdated(data.timers || [], data.serverNow);
      if (showFeedback) {
        onShowToast('অফার টাইমার তালিকা রিফ্রেশ করা হয়েছে।', 'info');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিফ্রেশ ত্রুটি।';
      onShowToast(msg, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCourse) {
      setFormError('অনুগ্রহ করে ড্রপডাউন থেকে একটি কোর্স নির্বাচন করুন।');
      return;
    }

    if (!startLocal || !endLocal) {
      setFormError('অফার শুরু এবং শেষের সঠিক তারিখ ও সময় দিন।');
      return;
    }

    const startDate = new Date(startLocal);
    const endDate = new Date(endLocal);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setFormError('প্রদত্ত তারিখ বা সময় সঠিক নয়।');
      return;
    }

    if (endDate.getTime() <= effectiveNowMs) {
      setFormError(
        'অফার শেষের তারিখ ও সময় (End Date & Time) অবশ্যই বর্তমান সময়ের পরবর্তী হতে হবে।'
      );
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setFormError(
        'অফার শেষের সময় অবশ্যই শুরুর সময়ের চেয়ে পরবর্তী হতে হবে।'
      );
      return;
    }

    if (conflictingCourseIds.has(selectedCourse.id)) {
      setFormError(
        `"${selectedCourse.title}" কোর্সের জন্য ইতিমধ্যে একটি সক্রিয় বা নির্ধারিত (Active/Scheduled) টাইমার রয়েছে।`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        courseId: selectedCourse.id,
        offerLabel:
          offerLabel.trim() || 'সীমিত সময়ের স্পেশাল অফার!',
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        isPaused: editingTimer ? editingTimer.isPaused : false,
      };

      const url = editingTimer
        ? `/api/admin/timers/${editingTimer.id}`
        : '/api/admin/timers';
      const method = editingTimer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'অফার টাইমার সংরক্ষণ করা সম্ভব হয়নি।');
      }

      await refreshTimersFromServer(false);
      onShowToast(
        editingTimer
          ? `"${selectedCourse.title}" এর অফার টাইমার সফলভাবে আপডেট হয়েছে।`
          : `"${selectedCourse.title}" এর জন্য অফার টাইমার তৈরি হয়েছে।`,
        'success'
      );
      resetForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'টাইমার সংরক্ষণে ত্রুটি হয়েছে।';
      setFormError(msg);
      onShowToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (timer: OfferTimer) => {
    setEditingTimer(timer);
    setSelectedCourseId(timer.courseId);
    setOfferLabel(timer.offerLabel);
    setStartLocal(toLocalDateTimeInputValue(timer.startAt));
    setEndLocal(toLocalDateTimeInputValue(timer.endAt));
    setFormError(null);
    setDropdownOpen(false);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTogglePause = async (timer: OfferTimer) => {
    const nextPaused = !timer.isPaused;
    setActionLoadingId(timer.id);
    try {
      const res = await fetch(`/api/admin/timers/${timer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ isPaused: nextPaused }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'স্ট্যাটাস পরিবর্তন করা যায়নি।');
      }

      await refreshTimersFromServer(false);
      onShowToast(
        nextPaused
          ? `"${timer.courseTitle}" টাইমার বিরতিতে (Paused) রাখা হয়েছে।`
          : `"${timer.courseTitle}" টাইমার পুনরায় চালু করা হয়েছে।`,
        'info'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'স্ট্যাটাস পরিবর্তনে ত্রুটি হয়েছে।';
      onShowToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTimer) return;
    const target = deleteConfirmTimer;
    setActionLoadingId(target.id);
    try {
      const res = await fetch(`/api/admin/timers/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        throw new Error('টাইমারটি মুছে ফেলা সম্ভব হয়নি।');
      }

      if (editingTimer?.id === target.id) {
        resetForm();
      }
      await refreshTimersFromServer(false);
      setDeleteConfirmTimer(null);
      onShowToast(`"${target.courseTitle}" এর অফার টাইমার মুছে ফেলা হয়েছে।`, 'info');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'ডিলিট করতে ব্যর্থ হয়েছে।';
      onShowToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Bar */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] shrink-0">
            <AlarmClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-[#2A0F12]">
              হোমপেজ অফার কাউন্টডাউন টাইমার ম্যানেজমেন্ট
            </h1>
            <p className="text-xs text-[#6B4C4F] mt-0.5">
              কোর্স নির্বাচন করে নির্দিষ্ট তারিখ ও সময়সীমা অনুযায়ী হোমপেজে রিয়েল-টাইম অফার টাইমার চালু করুন।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tabular-nums">
            সক্রিয়: {toBengaliNumber(statusCounts.active)}টি
          </span>
          <span className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold tabular-nums">
            নির্ধারিত: {toBengaliNumber(statusCounts.scheduled)}টি
          </span>
          <button
            type="button"
            onClick={() => refreshTimersFromServer(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-white/80 hover:bg-white text-xs font-bold text-[#2A0F12] transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#eb1c24] ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Create / Edit Timer Form + Live Course Preview */}
      <div
        ref={formRef}
        className="glass-strong rounded-3xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/50 pb-3.5">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#eb1c24]" />
            <h2 className="text-sm sm:text-base font-black text-[#2A0F12]">
              {editingTimer
                ? `টাইমার সম্পাদনা: ${editingTimer.courseTitle}`
                : 'নতুন কোর্স অফার টাইমার তৈরি করুন'}
            </h2>
          </div>

          <span className="text-[11px] font-semibold text-[#6B4C4F] bg-rose-50/80 border border-rose-200/70 px-2.5 py-1 rounded-full">
            সময় অঞ্চল: {timezoneLabel}
          </span>
        </div>

        {formError && (
          <div className="rounded-2xl bg-rose-50/95 border border-rose-300 px-4 py-3 text-xs font-bold text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#eb1c24] shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Form Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Searchable Course Select */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs font-bold text-[#2A0F12] mb-1.5">
                কোর্স নির্বাচন করুন (Course Selection){' '}
                <span className="text-[#eb1c24]">*</span>
              </label>

              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white/95 hover:border-[#eb1c24]/70 focus:border-[#eb1c24] text-left text-xs font-bold text-[#2A0F12] flex items-center justify-between gap-2 shadow-2xs transition cursor-pointer"
              >
                <span className="truncate">
                  {selectedCourse
                    ? `${selectedCourse.title} (${selectedCourse.slug})`
                    : 'ডাটাবেস থেকে একটি কোর্স খুঁজুন বা সিলেক্ট করুন...'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#6B4C4F] shrink-0 transition-transform ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 z-40 rounded-2xl bg-white/98 backdrop-blur-2xl border border-rose-200 shadow-2xl overflow-hidden">
                  <div className="p-2.5 border-b border-rose-100 bg-rose-50/40">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#6B4C4F] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        placeholder="কোর্সের নাম, স্লাগ বা ক্যাটাগরি দিয়ে খুঁজুন..."
                        autoFocus
                        className="w-full pl-8 pr-8 py-2 rounded-xl border border-rose-200 bg-white text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none font-medium"
                      />
                      {courseSearch && (
                        <button
                          type="button"
                          onClick={() => setCourseSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#eb1c24] cursor-pointer"
                          aria-label="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-rose-100/60">
                    {filteredDropdownCourses.length === 0 ? (
                      <div className="p-4 text-center text-xs font-semibold text-[#6B4C4F]">
                        কোনো কোর্স খুঁজে পাওয়া যায়নি।
                      </div>
                    ) : (
                      filteredDropdownCourses.map((course) => {
                        const isSelected = course.id === selectedCourseId;
                        const hasConflict = conflictingCourseIds.has(course.id);

                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setDropdownOpen(false);
                              setFormError(null);
                            }}
                            className={`w-full px-3 py-2.5 text-left flex items-center gap-3 transition cursor-pointer ${
                              isSelected
                                ? 'bg-rose-50 text-[#b91c1c]'
                                : 'hover:bg-rose-50/50 text-[#2A0F12]'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff5252] to-[#b91c1c] shrink-0 overflow-hidden flex items-center justify-center border border-rose-200/70">
                              {course.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={course.imageUrl}
                                  alt={course.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[9px] font-black text-white px-1 text-center leading-tight">
                                  10MS
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                <span className="truncate">{course.title}</span>
                                {isSelected && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#eb1c24] shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-[#6B4C4F] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className="font-mono font-bold text-emerald-700">
                                  ৳{toBengaliNumber(course.discountPrice)}
                                </span>
                                <span className="font-mono text-[10px] truncate">
                                  /go/{course.slug}
                                </span>
                                {hasConflict && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                                    সক্রিয় টাইমার রয়েছে
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Offer Headline / Label */}
            <div>
              <label className="block text-xs font-bold text-[#2A0F12] mb-1.5">
                অফার শিরোনাম / বার্তা (Offer Label)
              </label>
              <input
                type="text"
                value={offerLabel}
                onChange={(e) => setOfferLabel(e.target.value)}
                placeholder="যেমন: HSC ২৮ আর্লি বার্ড স্পেশাল অফার — সীমিত সময়ের ছাড়!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs text-[#2A0F12] bg-white/95 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs font-medium"
              />
            </div>

            {/* Start & End Datetime Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#2A0F12]">
                  অফার শুরুর তারিখ ও সময় (Start){' '}
                  <span className="text-[#eb1c24]">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => {
                    setStartLocal(e.target.value);
                    setFormError(null);
                  }}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 text-xs font-mono font-bold text-[#2A0F12] bg-white/95 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartPreset(0)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-[10px] font-bold text-[#991b1b] transition cursor-pointer"
                  >
                    এখনই শুরু
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartPreset(1)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-[10px] font-bold text-[#991b1b] transition cursor-pointer"
                  >
                    +১ ঘণ্টা পর
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#2A0F12]">
                  অফার শেষের তারিখ ও সময় (End){' '}
                  <span className="text-[#eb1c24]">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => {
                    setEndLocal(e.target.value);
                    setFormError(null);
                  }}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/90 text-xs font-mono font-bold text-[#2A0F12] bg-white/95 focus:bg-white focus:border-[#eb1c24] outline-none shadow-2xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEndPreset(24)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-[10px] font-bold text-[#991b1b] transition cursor-pointer"
                  >
                    +২৪ ঘণ্টা
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndPreset(72)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-[10px] font-bold text-[#991b1b] transition cursor-pointer"
                  >
                    +৩ দিন
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndPreset(168)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-[10px] font-bold text-[#991b1b] transition cursor-pointer"
                  >
                    +৭ দিন
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-[0_8px_20px_-4px_rgba(226,43,43,0.4)] transition cursor-pointer disabled:opacity-60"
              >
                <PlusCircle className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'সংরক্ষণ হচ্ছে...'
                    : editingTimer
                    ? 'টাইমার আপডেট করুন'
                    : 'অফার টাইমার চালু করুন'}
                </span>
              </button>

              {(editingTimer || selectedCourseId !== null) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 transition cursor-pointer"
                >
                  বাতিল করুন
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Live Selected Course Preview Card */}
          <div className="lg:col-span-5">
            <div className="glass-surface rounded-2xl p-4 sm:p-5 space-y-3.5 border border-rose-200/70">
              <div className="flex items-center justify-between border-b border-rose-200/50 pb-2.5">
                <span className="text-xs font-black text-[#2A0F12] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#eb1c24]" />
                  <span>নির্বাচিত কোর্স প্রিভিউ</span>
                </span>
                {selectedCourse && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      selectedCourse.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {selectedCourse.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>

              {selectedCourse ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff5252] to-[#991b1b] overflow-hidden shrink-0 border border-rose-200 flex items-center justify-center shadow-sm">
                      {selectedCourse.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedCourse.imageUrl}
                          alt={selectedCourse.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-black text-white text-center px-1">
                          {selectedCourse.headerTitle || '10MS'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-sm font-black text-[#2A0F12] leading-snug">
                        {selectedCourse.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-emerald-700 font-mono">
                          ৳{toBengaliNumber(selectedCourse.discountPrice)}
                        </span>
                        {selectedCourse.originalPrice > selectedCourse.discountPrice && (
                          <span className="text-xs text-slate-400 line-through font-mono">
                            ৳{toBengaliNumber(selectedCourse.originalPrice)}
                          </span>
                        )}
                        {selectedCourse.discountBadgeText && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                            {selectedCourse.discountBadgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6B4C4F] line-clamp-2">
                        {selectedCourse.description}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/85 border border-rose-200/70 p-2.5 space-y-1">
                    <div className="text-[10px] font-bold text-[#6B4C4F] uppercase tracking-wider flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-[#eb1c24]" />
                      <span>সংযুক্ত এফিলিয়েট লিংক (টাইমার ক্লিক গন্তব্য)</span>
                    </div>
                    <a
                      href={selectedCourse.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono font-semibold text-[#b91c1c] hover:underline flex items-center gap-1 break-all"
                    >
                      <span className="truncate">{selectedCourse.affiliateUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2 text-[#6B4C4F]">
                  <Clock className="w-8 h-8 text-rose-300 mx-auto" />
                  <p className="text-xs font-bold">
                    বাম পাশ থেকে কোনো কোর্স নির্বাচন করলে এখানে কোর্সের ছবি, মূল্য এবং এফিলিয়েট লিংক প্রিভিউ দেখাবে।
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Existing Timers Management Table & Mobile Cards */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-rose-200/50 pb-4">
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#2A0F12]">
              সকল অফার টাইমার তালিকা ({toBengaliNumber(timers.length)})
            </h2>
            <p className="text-xs text-[#6B4C4F] mt-0.5">
              হোমপেজে শুধুমাত্র Active স্ট্যাটাসের টাইমারগুলো প্রদর্শিত হয় এবং সেগুলোতে ক্লিক করলে সরাসরি উক্ত কোর্সের এফিলিয়েট লিংকে চলে যায়।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B4C4F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="টাইমার খুঁজুন..."
                className="w-full sm:w-52 pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white/90 text-xs text-[#2A0F12] focus:border-[#eb1c24] outline-none font-medium"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'all' | OfferTimerComputedStatus
                )
              }
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white/90 text-xs font-bold text-[#2A0F12] focus:border-[#eb1c24] outline-none cursor-pointer"
            >
              <option value="all">
                সব স্ট্যাটাস ({toBengaliNumber(statusCounts.all)})
              </option>
              <option value="active">
                Active ({toBengaliNumber(statusCounts.active)})
              </option>
              <option value="scheduled">
                Scheduled ({toBengaliNumber(statusCounts.scheduled)})
              </option>
              <option value="paused">
                Paused ({toBengaliNumber(statusCounts.paused)})
              </option>
              <option value="expired">
                Expired ({toBengaliNumber(statusCounts.expired)})
              </option>
            </select>
          </div>
        </div>

        {displayedTimers.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-[#6B4C4F]">
            <AlarmClock className="w-9 h-9 text-rose-300 mx-auto" />
            <p className="text-sm font-bold text-[#2A0F12]">
              কোনো অফার টাইমার পাওয়া যায়নি
            </p>
            <p className="text-xs">
              উপরের ফর্ম থেকে একটি কোর্স নির্বাচন করে নতুন অফার টাইমার তৈরি করুন।
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-rose-200/50 text-[#6B4C4F] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">কোর্স ও লিংক</th>
                    <th className="py-3 px-3">শুরুর সময়</th>
                    <th className="py-3 px-3">শেষের সময়</th>
                    <th className="py-3 px-3">বাকি সময় (Live)</th>
                    <th className="py-3 px-3">স্ট্যাটাস</th>
                    <th className="py-3 px-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/80">
                  {displayedTimers.map((timer) => {
                    const status = computeOfferTimerStatus(
                      timer,
                      effectiveNowMs
                    );
                    const meta = STATUS_META[status];
                    const remainingText = formatRemainingTimeSummary(
                      timer,
                      effectiveNowMs
                    );
                    const isBusy = actionLoadingId === timer.id;

                    return (
                      <tr
                        key={timer.id}
                        className="hover:bg-rose-50/40 transition-colors"
                      >
                        <td className="py-3 px-3 max-w-[260px]">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] shrink-0 overflow-hidden border border-rose-200 flex items-center justify-center">
                              {timer.courseImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={timer.courseImageUrl}
                                  alt={timer.courseTitle}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[9px] font-black text-white">
                                  10MS
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#2A0F12] truncate">
                                {timer.courseTitle}
                              </div>
                              <div className="text-[11px] text-[#6B4C4F] truncate">
                                {timer.offerLabel}
                              </div>
                              <a
                                href={timer.affiliateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-mono text-[#b91c1c] hover:underline truncate max-w-full"
                              >
                                <span className="truncate">
                                  {timer.affiliateUrl}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-[11px] font-medium text-[#2A0F12]">
                          {formatOfferDateTimeDisplay(timer.startAt)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-[11px] font-medium text-[#2A0F12]">
                          {formatOfferDateTimeDisplay(timer.endAt)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-[11px] tabular-nums ${
                              status === 'active'
                                ? 'text-[#b91c1c]'
                                : status === 'scheduled'
                                ? 'text-blue-700'
                                : 'text-[#6B4C4F]'
                            }`}
                          >
                            {remainingText}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditClick(timer)}
                              disabled={isBusy}
                              className="p-2 rounded-xl border border-slate-200 bg-white/90 hover:border-[#eb1c24] hover:text-[#eb1c24] text-[#2A0F12] transition cursor-pointer disabled:opacity-50"
                              title="টাইমার সম্পাদনা করুন"
                              aria-label="Edit timer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {status !== 'expired' && (
                              <button
                                type="button"
                                onClick={() => handleTogglePause(timer)}
                                disabled={isBusy}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer disabled:opacity-50 ${
                                  timer.isPaused
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                }`}
                                title={
                                  timer.isPaused
                                    ? 'টাইমার পুনরায় চালু করুন'
                                    : 'টাইমার বিরতিতে রাখুন'
                                }
                              >
                                {timer.isPaused ? (
                                  <>
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    <span>Resume</span>
                                  </>
                                ) : (
                                  <>
                                    <PauseCircle className="w-3.5 h-3.5" />
                                    <span>Pause</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTimer(timer)}
                              disabled={isBusy}
                              className="p-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white text-[#b91c1c] transition cursor-pointer disabled:opacity-50"
                              title="টাইমার মুছে ফেলুন"
                              aria-label="Delete timer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Small Tablet Cards */}
            <div className="md:hidden space-y-3">
              {displayedTimers.map((timer) => {
                const status = computeOfferTimerStatus(
                  timer,
                  effectiveNowMs
                );
                const meta = STATUS_META[status];
                const remainingText = formatRemainingTimeSummary(
                  timer,
                  effectiveNowMs
                );
                const isBusy = actionLoadingId === timer.id;

                return (
                  <div
                    key={timer.id}
                    className="glass-card rounded-2xl p-4 space-y-3 border border-rose-200/60 overflow-hidden"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff5252] to-[#b91c1c] shrink-0 overflow-hidden border border-rose-200 flex items-center justify-center">
                        {timer.courseImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={timer.courseImageUrl}
                            alt={timer.courseTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-black text-white">
                            10MS
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-start justify-between gap-1.5 min-w-0">
                          <h3 className="text-xs font-black text-[#2A0F12] leading-snug break-words min-w-0 flex-1">
                            {timer.courseTitle}
                          </h3>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B4C4F] break-words line-clamp-2">
                          {timer.offerLabel}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/80 rounded-xl p-2.5 border border-rose-100">
                      <div>
                        <span className="text-[10px] text-[#6B4C4F] block">
                          শুরু:
                        </span>
                        <span className="font-semibold text-[#2A0F12]">
                          {formatOfferDateTimeDisplay(timer.startAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#6B4C4F] block">
                          শেষ:
                        </span>
                        <span className="font-semibold text-[#2A0F12]">
                          {formatOfferDateTimeDisplay(timer.endAt)}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-rose-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#6B4C4F]">
                          বাকি সময়:
                        </span>
                        <span className="font-mono font-bold text-[#b91c1c] tabular-nums">
                          {remainingText}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleEditClick(timer)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {status !== 'expired' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePause(timer)}
                          disabled={isBusy}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            timer.isPaused
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                          }`}
                        >
                          {timer.isPaused ? (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTimer(timer)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-[#b91c1c] hover:bg-[#eb1c24] hover:text-white transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTimer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-6 space-y-4 border border-white/90 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-[#2A0F12]">
                অফার টাইমারটি মুছে ফেলতে চান?
              </h3>
              <p className="text-xs text-[#6B4C4F]">
                <strong>&ldquo;{deleteConfirmTimer.courseTitle}&rdquo;</strong>{' '}
                কোর্সের এই কাউন্টডাউন টাইমারটি স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTimer(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#2A0F12] hover:border-[#eb1c24] hover:text-[#eb1c24] hover:bg-rose-50/60 transition cursor-pointer"
              >
                না, বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoadingId === deleteConfirmTimer.id}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
