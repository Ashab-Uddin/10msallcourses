'use client';

import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  BookOpen,
  CheckCircle2,
  EyeOff,
  Flame,
  GripVertical,
  Info,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import type { Category, Course } from '../../types.ts';
import { toBengaliNumber } from '../../utils/format.ts';
import {
  getCategoryCoursesForSorting,
  normalizeCategoryCourseOrders,
  normalizeCategorySortSlug,
  type CategoryCourseOrdersMap,
} from '../../lib/courseSorting.ts';

function formatPrice(amount: number): string {
  return `৳${toBengaliNumber(Math.max(0, Math.round(Number(amount) || 0)))}`;
}

interface CourseSortManagerProps {
  categories: Category[];
  courses: Course[];
  initialCategoryCourseOrders?: CategoryCourseOrdersMap;
  initialCategorySlug?: string;
  onOrderSaved: (payload: {
    categorySlug: string;
    orderedCourseIds: number[];
    categoryCourseOrders: CategoryCourseOrdersMap;
    courses: Course[];
  }) => void;
  onUnauthorized: () => void;
  onDataMutated: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type SortViewMode = 'grid' | 'list';

function getCourseGradientBg(theme: string | undefined): string {
  switch (theme) {
    case 'emerald':
    case 'green':
      return 'from-[#15803d] via-[#166534] to-[#0f391e]';
    case 'purple':
    case 'violet':
      return 'from-[#7e22ce] via-[#6b21a8] to-[#450a0a]';
    case 'crimson':
    case 'rose':
      return 'from-[#991b1b] via-[#881337] to-[#4c0519]';
    case 'amber':
    case 'orange':
      return 'from-[#c2410c] via-[#9a3412] to-[#451a03]';
    case 'slate':
    case 'navy':
      return 'from-[#1e293b] via-[#0f172a] to-[#020617]';
    default:
      return 'from-[#1e40af] via-[#1d4ed8] to-[#1e1b4b]';
  }
}

function getCourseStatusMeta(status: string): {
  label: string;
  badgeClass: string;
  icon: 'active' | 'closed' | 'inactive';
} {
  if (status === 'active') {
    return {
      label: 'চালু',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
      icon: 'active',
    };
  }
  if (status === 'closed') {
    return {
      label: 'ভর্তি বন্ধ',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90',
      icon: 'closed',
    };
  }
  return {
    label: 'লুকানো',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: 'inactive',
  };
}

interface SortableCourseCardProps {
  course: Course;
  position: number;
  savedPosition: number;
  totalCount: number;
  viewMode: SortViewMode;
  disabled: boolean;
  onMoveBy: (courseId: number, delta: -1 | 1) => void;
  onMoveToPosition: (courseId: number, targetPosition: number) => void;
}

const SortableCourseCard: React.FC<SortableCourseCardProps> = ({
  course,
  position,
  savedPosition,
  totalCount,
  viewMode,
  disabled,
  onMoveBy,
  onMoveToPosition,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: course.id,
    disabled,
  });

  const [imgFailed, setImgFailed] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  const hasMoved = savedPosition > 0 && savedPosition !== position;
  const isHomeRowSlot = position <= 4;
  const statusMeta = getCourseStatusMeta(course.status);
  const displayImg =
    !imgFailed && course.imageUrl
      ? course.imageUrl.replace(/\?(w=\d+.*)/i, '').trim()
      : null;

  if (viewMode === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative rounded-2xl border transition-all duration-200 ${
          isDragging
            ? 'z-30 opacity-40 border-2 border-dashed border-[#eb1c24] bg-rose-50/75 shadow-inner'
            : hasMoved
              ? 'bg-amber-50/55 border-amber-300/90 shadow-sm ring-1 ring-amber-200/70'
              : 'bg-white/95 border-rose-100/90 hover:border-rose-200 hover:shadow-md'
        }`}
      >
        <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left: Drag Handle + Position + Thumbnail + Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
              disabled={disabled}
              aria-label={`${course.title} ড্র্যাগ করে পজিশন পরিবর্তন করুন`}
              title="টেনে (Drag) পজিশন পরিবর্তন করুন"
              className="w-9 h-10 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white text-[#b91c1c] flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none transition-colors disabled:opacity-40"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center shrink-0 min-w-[44px]">
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black tabular-nums shadow-2xs ${
                  hasMoved
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                    : isHomeRowSlot
                      ? 'bg-gradient-to-br from-[#ff5252] to-[#b91c1c] text-white'
                      : 'bg-rose-50 text-[#b91c1c] border border-rose-200/80'
                }`}
              >
                #{toBengaliNumber(position)}
              </span>
              {hasMoved && (
                <span className="mt-1 text-[9.5px] font-extrabold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-1.5 py-0.5 rounded-md tabular-nums whitespace-nowrap">
                  #{toBengaliNumber(savedPosition)} → #{toBengaliNumber(position)}
                </span>
              )}
            </div>

            <div className="w-20 sm:w-24 aspect-video rounded-xl overflow-hidden border border-rose-100 shrink-0 bg-slate-100 relative">
              {displayImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImg}
                  alt={course.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${getCourseGradientBg(
                    course.gradientTheme
                  )} flex items-center justify-center p-1.5`}
                >
                  <BookOpen className="w-4 h-4 text-white/85" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusMeta.badgeClass}`}
                >
                  {statusMeta.icon === 'active' ? (
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  ) : statusMeta.icon === 'closed' ? (
                    <Lock className="w-2.5 h-2.5" />
                  ) : (
                    <EyeOff className="w-2.5 h-2.5" />
                  )}
                  <span>{statusMeta.label}</span>
                </span>
                {isHomeRowSlot && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-[#b91c1c] border border-rose-200/70">
                    হোমপেজ প্রথম ৪টি
                  </span>
                )}
                {course.isPopular && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                    <Flame className="w-2.5 h-2.5 text-amber-600" />
                    <span>জনপ্রিয়</span>
                  </span>
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-black text-[#2A0F12] line-clamp-1">
                {course.title}
              </h4>

              <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold">
                <span className="text-[#15803d] tabular-nums">
                  {course.discountPrice === 0 ? 'ফ্রি' : formatPrice(course.discountPrice)}
                </span>
                {course.originalPrice > course.discountPrice && (
                  <span className="text-[#7A5A5D] line-through font-medium tabular-nums">
                    {formatPrice(course.originalPrice)}
                  </span>
                )}
                {course.targetStudents && (
                  <span className="hidden md:inline text-[#6B4C4F] font-medium truncate">
                    • {course.targetStudents}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Precision Controls */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-100/70">
            <select
              value={position}
              disabled={disabled}
              aria-label={`${course.title} এর পজিশন নির্বাচন করুন`}
              onChange={(e) => {
                const nextPos = Number(e.target.value);
                if (Number.isInteger(nextPos) && nextPos >= 1 && nextPos <= totalCount) {
                  onMoveToPosition(course.id, nextPos);
                }
              }}
              className="h-8 px-2 rounded-lg border border-rose-200/80 bg-white text-[11px] font-extrabold text-[#2A0F12] focus:border-[#eb1c24] outline-none cursor-pointer tabular-nums"
            >
              {Array.from({ length: totalCount }, (_, i) => i + 1).map((pos) => (
                <option key={pos} value={pos}>
                  পজিশন #{toBengaliNumber(pos)}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={disabled || position === 1}
              onClick={() => onMoveToPosition(course.id, 1)}
              title="১ম পজিশনে নিন"
              className="w-8 h-8 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 hover:text-[#eb1c24] text-[#6B4C4F] flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={disabled || position === 1}
              onClick={() => onMoveBy(course.id, -1)}
              title="এক ধাপ আগে নিন"
              className="w-8 h-8 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 hover:text-[#eb1c24] text-[#6B4C4F] flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={disabled || position === totalCount}
              onClick={() => onMoveBy(course.id, 1)}
              title="এক ধাপ পরে নিন"
              className="w-8 h-8 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 hover:text-[#eb1c24] text-[#6B4C4F] flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GRID CARD VIEW (Mirrors Main Website 4-Column Course Card Layout!)
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
        isDragging
          ? 'z-30 opacity-35 border-2 border-dashed border-[#eb1c24] bg-rose-50/75 shadow-inner'
          : hasMoved
            ? 'bg-white border-amber-300 shadow-[0_10px_28px_-10px_rgba(217,119,6,0.28)] ring-1 ring-amber-200/80'
            : 'bg-white/95 border-rose-100/90 hover:border-rose-300/90 shadow-xs hover:shadow-[0_12px_28px_-10px_rgba(42,15,18,0.14)]'
      }`}
    >
      {/* Top Bar: Drag Handle + Position Badge + Move Delta */}
      <div
        className={`px-3 py-2 flex items-center justify-between gap-2 border-b ${
          hasMoved
            ? 'bg-amber-50/85 border-amber-200/80'
            : 'bg-rose-50/45 border-rose-100/80'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            disabled={disabled}
            aria-label={`${course.title} ড্র্যাগ করে পজিশন পরিবর্তন করুন`}
            title="ধরে টানুন (Drag & Drop)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-rose-200/90 hover:bg-[#eb1c24] hover:border-[#eb1c24] hover:text-white text-[#b91c1c] text-[11px] font-extrabold cursor-grab active:cursor-grabbing touch-none shadow-2xs transition-colors disabled:opacity-40"
          >
            <GripVertical className="w-3.5 h-3.5" />
            <span>টানুন</span>
          </button>

          <span
            className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-[11px] font-black tabular-nums ${
              hasMoved
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                : isHomeRowSlot
                  ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white'
                  : 'bg-white text-[#2A0F12] border border-rose-200/80'
            }`}
          >
            #{toBengaliNumber(position)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasMoved ? (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300/90 tabular-nums">
              #{toBengaliNumber(savedPosition)} → #{toBengaliNumber(position)}
            </span>
          ) : isHomeRowSlot ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-[#b91c1c] border border-rose-200/70">
              হোমপেজ #{toBengaliNumber(position)}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-[#7A5A5D] tabular-nums">
              স্লট {toBengaliNumber(position)}
            </span>
          )}
        </div>
      </div>

      {/* Course Thumbnail Preview */}
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
        {displayImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImg}
            alt={course.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${getCourseGradientBg(
              course.gradientTheme
            )} flex flex-col items-center justify-center text-white p-3 text-center`}
          >
            <BookOpen className="w-6 h-6 opacity-85 mb-1" />
            <span className="text-[11px] font-bold line-clamp-2 opacity-95">
              {course.headerTitle || course.title}
            </span>
          </div>
        )}

        {/* Status Pill overlaid cleanly at top-right */}
        <span
          className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border backdrop-blur-md shadow-xs ${statusMeta.badgeClass}`}
        >
          {statusMeta.icon === 'active' ? (
            <CheckCircle2 className="w-2.5 h-2.5" />
          ) : statusMeta.icon === 'closed' ? (
            <Lock className="w-2.5 h-2.5" />
          ) : (
            <EyeOff className="w-2.5 h-2.5" />
          )}
          <span>{statusMeta.label}</span>
        </span>
      </div>

      {/* Card Body */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <h4 className="text-xs sm:text-[13px] font-black text-[#2A0F12] leading-snug line-clamp-2 min-h-[2.4em]">
            {course.title}
          </h4>

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-sm font-black text-[#15803d] tabular-nums">
                {course.discountPrice === 0 ? 'ফ্রি' : formatPrice(course.discountPrice)}
              </span>
              {course.originalPrice > course.discountPrice && (
                <span className="text-[11px] text-[#7A5A5D] line-through tabular-nums">
                  {formatPrice(course.originalPrice)}
                </span>
              )}
            </div>

            {course.isPopular && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0">
                <Flame className="w-2.5 h-2.5 text-amber-600" />
                <span>জনপ্রিয়</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Quick Controls */}
        <div className="pt-2 border-t border-rose-100/80 flex items-center justify-between gap-1.5">
          <select
            value={position}
            disabled={disabled}
            aria-label={`${course.title} এর পজিশন নির্বাচন করুন`}
            onChange={(e) => {
              const nextPos = Number(e.target.value);
              if (Number.isInteger(nextPos) && nextPos >= 1 && nextPos <= totalCount) {
                onMoveToPosition(course.id, nextPos);
              }
            }}
            className="flex-1 min-w-0 h-7 px-2 rounded-lg border border-rose-200/80 bg-rose-50/40 hover:bg-white text-[11px] font-bold text-[#2A0F12] focus:border-[#eb1c24] outline-none cursor-pointer tabular-nums"
          >
            {Array.from({ length: totalCount }, (_, i) => i + 1).map((pos) => (
              <option key={pos} value={pos}>
                পজিশন #{toBengaliNumber(pos)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={disabled || position === 1}
              onClick={() => onMoveToPosition(course.id, 1)}
              title="১ম স্থানে নিন"
              className="w-7 h-7 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 hover:text-[#eb1c24] text-[#6B4C4F] flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || position === 1}
              onClick={() => onMoveBy(course.id, -1)}
              title="এক ধাপ আগে নিন"
              className="w-7 h-7 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 hover:text-[#eb1c24] text-[#6B4C4F] flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || position === totalCount}
              onClick={() => onMoveBy(course.id, 1)}
              title="এক ধাপ পরে নিন"
              className="w-7 h-7 rounded-lg border border-rose-200/80 bg-white hover:bg-rose-50 hover:text-[#eb1c24] text-[#6B4C4F] flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DragOverlayPreviewProps {
  course: Course;
  position: number;
}

const DragOverlayPreview: React.FC<DragOverlayPreviewProps> = ({ course, position }) => {
  const displayImg = course.imageUrl
    ? course.imageUrl.replace(/\?(w=\d+.*)/i, '').trim()
    : null;

  return (
    <div className="w-[270px] sm:w-[290px] rounded-2xl bg-white border-2 border-[#eb1c24] shadow-[0_24px_56px_-10px_rgba(185,28,28,0.34)] ring-4 ring-rose-500/15 overflow-hidden scale-[1.03] cursor-grabbing select-none">
      <div className="px-3 py-2 bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold">
          <GripVertical className="w-3.5 h-3.5" />
          <span>সরিয়ে নিচ্ছেন</span>
        </span>
        <span className="px-2 py-0.5 rounded-md bg-black/20 text-[11px] font-black tabular-nums">
          #{toBengaliNumber(position)}
        </span>
      </div>
      <div className="p-3 flex items-center gap-2.5">
        <div className="w-16 aspect-video rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-rose-100">
          {displayImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImg}
              alt={course.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${getCourseGradientBg(
                course.gradientTheme
              )} flex items-center justify-center`}
            >
              <BookOpen className="w-4 h-4 text-white/85" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-black text-[#2A0F12] line-clamp-2 leading-snug">
            {course.title}
          </div>
          <div className="text-[11px] font-extrabold text-[#15803d] mt-1 tabular-nums">
            {course.discountPrice === 0 ? 'ফ্রি' : formatPrice(course.discountPrice)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CourseSortManager: React.FC<CourseSortManagerProps> = ({
  categories,
  courses,
  initialCategoryCourseOrders,
  initialCategorySlug,
  onOrderSaved,
  onUnauthorized,
  onDataMutated,
  onShowToast,
}) => {
  const orderedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
      ),
    [categories]
  );

  const savedOrders = useMemo(
    () => normalizeCategoryCourseOrders(initialCategoryCourseOrders),
    [initialCategoryCourseOrders]
  );

  // Build category tabs list (all DB categories, ordered by displayOrder)
  const categoryOptions = useMemo(() => {
    return orderedCategories.map((cat) => {
      const slug = normalizeCategorySortSlug(cat.slug);
      const count = getCategoryCoursesForSorting(courses, slug, savedOrders, {
        includeInactive: true,
      }).length;
      return {
        id: cat.id,
        slug,
        name: cat.name,
        subtitle: cat.subtitle,
        courseCount: count,
      };
    });
  }, [orderedCategories, courses, savedOrders]);

  const defaultSelectedSlug = useMemo(() => {
    const requested = normalizeCategorySortSlug(initialCategorySlug);
    if (requested && categoryOptions.some((c) => c.slug === requested)) {
      return requested;
    }
    const firstWithMultiple = categoryOptions.find((c) => c.courseCount >= 2);
    if (firstWithMultiple) return firstWithMultiple.slug;
    const firstWithAny = categoryOptions.find((c) => c.courseCount > 0);
    return firstWithAny?.slug || categoryOptions[0]?.slug || '';
  }, [categoryOptions, initialCategorySlug]);

  const [selectedSlug, setSelectedSlug] = useState<string>(() => defaultSelectedSlug);
  const [viewMode, setViewMode] = useState<SortViewMode>('grid');
  const [draftIdsBySlug, setDraftIdsBySlug] = useState<Record<string, number[]>>({});
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingSwitchSlug, setPendingSwitchSlug] = useState<string | null>(null);

  const activeCategorySlug =
    selectedSlug && categoryOptions.some((c) => c.slug === selectedSlug)
      ? selectedSlug
      : defaultSelectedSlug;

  const activeCategory = useMemo(
    () => categoryOptions.find((c) => c.slug === activeCategorySlug) || null,
    [categoryOptions, activeCategorySlug]
  );

  // Courses currently saved in DB for the selected category (exact Main Website order)
  const savedCategoryCourses = useMemo(() => {
    if (!activeCategorySlug) return [];
    return getCategoryCoursesForSorting(courses, activeCategorySlug, savedOrders, {
      includeInactive: true,
    });
  }, [courses, activeCategorySlug, savedOrders]);

  const savedOrderedIds = useMemo(
    () => savedCategoryCourses.map((c) => c.id),
    [savedCategoryCourses]
  );

  const courseMapById = useMemo(() => {
    const map = new Map<number, Course>();
    for (const c of savedCategoryCourses) {
      map.set(c.id, c);
    }
    return map;
  }, [savedCategoryCourses]);

  // Reconcile draft IDs against the current category's actual course IDs (handles add/delete seamlessly)
  const workingOrderedIds = useMemo(() => {
    const rawDraft = draftIdsBySlug[activeCategorySlug];
    if (!Array.isArray(rawDraft) || rawDraft.length === 0) {
      return savedOrderedIds;
    }
    const validSet = new Set(savedOrderedIds);
    const cleaned = rawDraft.filter((id) => validSet.has(id));
    for (const id of savedOrderedIds) {
      if (!cleaned.includes(id)) {
        cleaned.push(id);
      }
    }
    return cleaned;
  }, [draftIdsBySlug, activeCategorySlug, savedOrderedIds]);

  const workingCourses = useMemo(
    () =>
      workingOrderedIds
        .map((id) => courseMapById.get(id))
        .filter((c): c is Course => Boolean(c)),
    [workingOrderedIds, courseMapById]
  );

  const savedPositionById = useMemo(() => {
    const map = new Map<number, number>();
    savedOrderedIds.forEach((id, idx) => {
      map.set(id, idx + 1);
    });
    return map;
  }, [savedOrderedIds]);

  const changedCount = useMemo(() => {
    let diff = 0;
    for (let i = 0; i < workingOrderedIds.length; i += 1) {
      if (workingOrderedIds[i] !== savedOrderedIds[i]) {
        diff += 1;
      }
    }
    return diff;
  }, [workingOrderedIds, savedOrderedIds]);

  const hasUnsavedChanges = changedCount > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateDraftForActiveCategory = (nextIds: number[]) => {
    if (!activeCategorySlug) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingSwitchSlug(null);

    const isSameAsSaved =
      nextIds.length === savedOrderedIds.length &&
      nextIds.every((id, idx) => id === savedOrderedIds[idx]);

    setDraftIdsBySlug((prev) => {
      const next = { ...prev };
      if (isSameAsSaved) {
        delete next[activeCategorySlug];
      } else {
        next[activeCategorySlug] = nextIds;
      }
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(event.active.id);
    if (Number.isInteger(id) && id > 0) {
      setActiveDragId(id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = workingOrderedIds.indexOf(Number(active.id));
    const newIndex = workingOrderedIds.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(workingOrderedIds, oldIndex, newIndex);
    updateDraftForActiveCategory(reordered);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const handleMoveBy = (courseId: number, delta: -1 | 1) => {
    const idx = workingOrderedIds.indexOf(courseId);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= workingOrderedIds.length) return;
    updateDraftForActiveCategory(arrayMove(workingOrderedIds, idx, nextIdx));
  };

  const handleMoveToPosition = (courseId: number, targetPosition: number) => {
    const idx = workingOrderedIds.indexOf(courseId);
    if (idx === -1) return;
    const clampedIndex = Math.max(
      0,
      Math.min(workingOrderedIds.length - 1, targetPosition - 1)
    );
    if (idx === clampedIndex) return;
    updateDraftForActiveCategory(arrayMove(workingOrderedIds, idx, clampedIndex));
  };

  const handleResetChanges = () => {
    if (!activeCategorySlug) return;
    setDraftIdsBySlug((prev) => {
      const next = { ...prev };
      delete next[activeCategorySlug];
      return next;
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingSwitchSlug(null);
    onShowToast('অসংরক্ষিত পরিবর্তন বাতিল করা হয়েছে।', 'info');
  };

  const saveCurrentCategoryOrder = async (): Promise<boolean> => {
    if (!activeCategorySlug || workingOrderedIds.length === 0 || saving) {
      return false;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/courses/reorder', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categorySlug: activeCategorySlug,
          orderedCourseIds: workingOrderedIds,
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return false;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' && data.error
            ? data.error
            : 'কোর্সের পজিশন সংরক্ষণ করতে সমস্যা হয়েছে।'
        );
      }

      const nextOrders = normalizeCategoryCourseOrders(data.categoryCourseOrders);
      const nextCourses = Array.isArray(data.courses) ? (data.courses as Course[]) : courses;
      const savedIds = Array.isArray(data.orderedCourseIds)
        ? (data.orderedCourseIds as number[])
        : workingOrderedIds;

      setDraftIdsBySlug((prev) => {
        const next = { ...prev };
        delete next[activeCategorySlug];
        return next;
      });

      onOrderSaved({
        categorySlug: activeCategorySlug,
        orderedCourseIds: savedIds,
        categoryCourseOrders: nextOrders,
        courses: nextCourses,
      });
      onDataMutated();

      const catLabel = activeCategory?.name || activeCategorySlug;
      const msg = `"${catLabel}" ক্যাটাগরির কোর্স পজিশন সফলভাবে সংরক্ষণ ও মেইন ওয়েবসাইটে সিঙ্ক হয়েছে!`;
      setSuccessMessage(msg);
      onShowToast(msg, 'success');
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'কোর্সের পজিশন সংরক্ষণ ব্যর্থ হয়েছে। পূর্বের ক্রম নিরাপদে সংরক্ষিত আছে।';
      setErrorMessage(msg);
      onShowToast(msg, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryTabClick = (nextSlug: string) => {
    if (nextSlug === activeCategorySlug || saving) return;
    if (hasUnsavedChanges) {
      setPendingSwitchSlug(nextSlug);
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedSlug(nextSlug);
  };

  const handleConfirmSwitchDiscard = () => {
    if (!pendingSwitchSlug) return;
    const targetSlug = pendingSwitchSlug;
    setDraftIdsBySlug((prev) => {
      const next = { ...prev };
      delete next[activeCategorySlug];
      return next;
    });
    setPendingSwitchSlug(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedSlug(targetSlug);
  };

  const handleConfirmSwitchSave = async () => {
    if (!pendingSwitchSlug) return;
    const targetSlug = pendingSwitchSlug;
    const ok = await saveCurrentCategoryOrder();
    if (ok) {
      setPendingSwitchSlug(null);
      setSelectedSlug(targetSlug);
    }
  };

  const activeDragCourse =
    activeDragId !== null ? courseMapById.get(activeDragId) || null : null;
  const activeDragPosition =
    activeDragId !== null ? workingOrderedIds.indexOf(activeDragId) + 1 : 0;

  return (
    <div className="space-y-5">
      {/* 1. HEADER & PRIMARY ACTION BAR */}
      <div className="glass-strong rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200/80 text-[#b91c1c] text-[11px] font-extrabold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#eb1c24]" />
              <span>Dynamic Drag &amp; Drop Course Sorting</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-[#2A0F12] tracking-tight leading-snug">
              কোর্স পজিশন ম্যানেজার (ক্যাটাগরি অনুযায়ী ড্র্যাগ ও ড্রপ)
            </h1>
            <p className="text-xs text-[#6B4C4F] mt-1 leading-relaxed">
              প্রতিটি ক্যাটাগরির কোর্স কার্ডগুলো ড্র্যাগ অ্যান্ড ড্রপ করে ১ম, ২য় বা আপনার পছন্দমতো যেকোনো পজিশনে সাজান এবং সেভ করুন। মেইন ওয়েবসাইটের ডেস্কটপ, ট্যাবলেট ও মোবাইল ভিউতে সাথে সাথে আপডেট হয়ে যাবে।
            </p>
          </div>

          {/* Primary Save / Cancel Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetChanges}
              disabled={!hasUnsavedChanges || saving}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200/90 bg-white hover:bg-rose-50 text-[#6B4C4F] hover:text-[#b91c1c] text-xs font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>বাতিল / রিসেট</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void saveCurrentCategoryOrder();
              }}
              disabled={!hasUnsavedChanges || saving || workingCourses.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-extrabold shadow-[0_8px_22px_-4px_rgba(226,43,43,0.45)] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    পরিবর্তন সংরক্ষণ করুন
                    {hasUnsavedChanges ? ` (${toBengaliNumber(changedCount)})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Category Isolation Info Chip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-rose-200/50 text-[11.5px]">
          <div className="inline-flex items-center gap-1.5 text-[#6B4C4F] font-semibold">
            <Info className="w-3.5 h-3.5 text-[#eb1c24] shrink-0" />
            <span>
              প্রতিটি ক্যাটাগরির নিজস্ব সর্টিং সিস্টেম রয়েছে — একটি ক্যাটাগরির ক্রম পরিবর্তন করলে অন্য কোনো ক্যাটাগরির ক্রম পরিবর্তন হবে না।
            </span>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-rose-50/80 border border-rose-200/70 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#eb1c24] shadow-2xs border border-rose-200/70'
                  : 'text-[#6B4C4F] hover:text-[#2A0F12]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>কার্ড গ্রিড</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#eb1c24] shadow-2xs border border-rose-200/70'
                  : 'text-[#6B4C4F] hover:text-[#2A0F12]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>তালিকা</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY SELECTOR TABS */}
      <div className="glass-surface rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-extrabold text-[#2A0F12]">
            ক্যাটাগরি নির্বাচন করুন ({toBengaliNumber(categoryOptions.length)}টি ক্যাটাগরি)
          </div>
          {activeCategory && (
            <div className="text-[11px] font-bold text-[#6B4C4F]">
              নির্বাচিত:{' '}
              <span className="text-[#b91c1c] font-extrabold">{activeCategory.name}</span> (
              {toBengaliNumber(workingCourses.length)}টি কোর্স)
            </div>
          )}
        </div>

        <div
          className="flex flex-nowrap lg:flex-wrap items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0"
          role="tablist"
          aria-label="কোর্স সর্টিং ক্যাটাগরি নির্বাচন"
        >
          {categoryOptions.map((cat) => {
            const isSelected = cat.slug === activeCategorySlug;
            const hasDraft = Boolean(draftIdsBySlug[cat.slug]);
            return (
              <button
                key={cat.slug}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleCategoryTabClick(cat.slug)}
                className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white border-[#b91c1c] shadow-[0_6px_16px_-4px_rgba(226,43,43,0.45)]'
                    : 'bg-white/95 text-[#2A0F12] border-rose-200/80 hover:border-[#eb1c24] hover:text-[#b91c1c]'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                    isSelected
                      ? 'bg-black/20 text-white'
                      : 'bg-rose-50 text-[#b91c1c] border border-rose-200/70'
                  }`}
                >
                  {toBengaliNumber(cat.courseCount)}
                </span>
                {hasDraft && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white"
                    title="অসংরক্ষিত পরিবর্তন রয়েছে"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Unsaved Category Switch Guard Banner (No browser alert/confirm!) */}
        {pendingSwitchSlug && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2 text-xs font-bold text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                &ldquo;{activeCategory?.name}&rdquo; ক্যাটাগরিতে {toBengaliNumber(changedCount)}টি
                অসংরক্ষিত পরিবর্তন রয়েছে। অন্য ক্যাটাগরিতে যাওয়ার আগে কি সংরক্ষণ করতে চান?
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void handleConfirmSwitchSave();
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-[11px] font-extrabold cursor-pointer disabled:opacity-50"
              >
                সংরক্ষণ করে যান
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmSwitchDiscard}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-[11px] font-bold cursor-pointer"
              >
                বাতিল করে যান
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPendingSwitchSlug(null)}
                className="px-2.5 py-1.5 rounded-lg text-amber-800 hover:bg-amber-100/80 text-[11px] font-bold cursor-pointer"
              >
                থাকুন
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. FEEDBACK BANNERS (Unsaved / Success / Error) */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50/95 p-4 flex items-start sm:items-center justify-between gap-3 text-xs font-bold text-rose-900"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-950 text-[11px] font-extrabold shrink-0 cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {successMessage && !hasUnsavedChanges && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50/95 p-4 flex items-center justify-between gap-3 text-xs font-bold text-emerald-900"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 text-[11px] font-extrabold shrink-0 cursor-pointer"
          >
            ঠিক আছে
          </button>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="rounded-2xl border border-amber-300/90 bg-amber-50/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              মোট {toBengaliNumber(changedCount)}টি কোর্সের পজিশন পরিবর্তিত হয়েছে। মেইন ওয়েবসাইটে প্রকাশ করতে &ldquo;পরিবর্তন সংরক্ষণ করুন&rdquo; বাটনে ক্লিক করুন।
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetChanges}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-[11px] font-bold cursor-pointer"
            >
              বাতিল করুন
            </button>
            <button
              type="button"
              onClick={() => {
                void saveCurrentCategoryOrder();
              }}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#ff5252] to-[#b91c1c] text-white text-[11px] font-extrabold shadow-xs cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>এখনই সংরক্ষণ করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. LIVE POSITION ORDER PREVIEW STRIP */}
      {workingCourses.length > 0 && (
        <div className="glass-surface rounded-2xl p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-extrabold text-[#2A0F12]">
              লাইভ অর্ডার প্রিভিউ ({activeCategory?.name}) — মেইন ওয়েবসাইটে যেভাবে দেখাবে:
            </span>
            <span className="text-[#6B4C4F] font-semibold hidden sm:inline">
              প্রথম ৪টি কোর্স হোমপেজের প্রথম সারিতে দেখাবে
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {workingCourses.map((course, idx) => {
              const pos = idx + 1;
              const savedPos = savedPositionById.get(course.id) ?? pos;
              const moved = savedPos !== pos;
              return (
                <div
                  key={`preview-${course.id}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap shrink-0 max-w-[200px] ${
                    moved
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : pos <= 4
                        ? 'bg-rose-50/90 border-rose-200/90 text-[#2A0F12]'
                        : 'bg-white/90 border-slate-200 text-[#6B4C4F]'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black tabular-nums shrink-0 ${
                      moved
                        ? 'bg-amber-500 text-white'
                        : pos <= 4
                          ? 'bg-[#eb1c24] text-white'
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {toBengaliNumber(pos)}
                  </span>
                  <span className="truncate">{course.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. DRAG & DROP SORTABLE WORKSPACE */}
      <div className="glass-strong rounded-3xl p-4 sm:p-6">
        {workingCourses.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 text-[#eb1c24] flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-[#2A0F12]">
              এই ক্যাটাগরিতে কোনো কোর্স পাওয়া যায়নি
            </h3>
            <p className="text-xs text-[#6B4C4F] max-w-md mx-auto">
              উপরের ক্যাটাগরি ট্যাব থেকে অন্য একটি ক্যাটাগরি নির্বাচন করুন অথবা এই ক্যাটাগরিতে নতুন কোর্স যুক্ত করুন।
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={workingOrderedIds}
              strategy={
                viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy
              }
            >
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'
                    : 'space-y-2.5'
                }
              >
                {workingCourses.map((course, idx) => {
                  const pos = idx + 1;
                  const savedPos = savedPositionById.get(course.id) ?? pos;
                  return (
                    <SortableCourseCard
                      key={course.id}
                      course={course}
                      position={pos}
                      savedPosition={savedPos}
                      totalCount={workingCourses.length}
                      viewMode={viewMode}
                      disabled={saving}
                      onMoveBy={handleMoveBy}
                      onMoveToPosition={handleMoveToPosition}
                    />
                  );
                })}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
              {activeDragCourse ? (
                <DragOverlayPreview
                  course={activeDragCourse}
                  position={activeDragPosition}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Bottom Sticky-Feeling Save Footer when there are multiple courses */}
        {workingCourses.length > 1 && (
          <div className="mt-6 pt-4 border-t border-rose-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11.5px] font-semibold text-[#6B4C4F]">
              টিপস: প্রতিটি কার্ডের <strong className="text-[#2A0F12]">টানুন (Grip)</strong> হ্যান্ডেল ধরে ড্র্যাগ করে যেকোনো অবস্থানে ছাড়ুন, অথবা দ্রুত পজিশন ড্রপডাউন ব্যবহার করুন।
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetChanges}
                disabled={!hasUnsavedChanges || saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-[#6B4C4F] text-xs font-bold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveCurrentCategoryOrder();
                }}
                disabled={!hasUnsavedChanges || saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5252] to-[#b91c1c] hover:from-[#eb1c24] hover:to-[#991b1b] text-white text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>পরিবর্তন সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
