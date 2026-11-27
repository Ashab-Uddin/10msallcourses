import type React from 'react';
import {
  Award,
  BarChart3,
  BookCheck,
  BookOpen,
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  Gift,
  GraduationCap,
  Layers,
  ListChecks,
  PlayCircle,
  Sparkles,
  Target,
  UserCheck,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import type { ClassGuideIconKey } from '../types.ts';

export const CLASS_GUIDE_ICON_MAP: Record<
  ClassGuideIconKey,
  React.ComponentType<{ className?: string }>
> = {
  'play-circle': PlayCircle,
  'book-open': BookOpen,
  'file-check': FileCheck2,
  'list-checks': ListChecks,
  bot: Bot,
  'user-check': UserCheck,
  'bar-chart': BarChart3,
  users: Users,
  'graduation-cap': GraduationCap,
  gift: Gift,
  award: Award,
  'book-check': BookCheck,
  clock: Clock,
  'calendar-days': CalendarDays,
  'calendar-clock': CalendarClock,
  target: Target,
  video: Video,
  sparkles: Sparkles,
  zap: Zap,
  layers: Layers,
  'check-circle': CheckCircle2,
};

export const CLASS_GUIDE_ICON_OPTIONS: ReadonlyArray<{
  key: ClassGuideIconKey;
  label: string;
}> = [
  { key: 'book-open', label: 'বই / মাস্টারবুক' },
  { key: 'play-circle', label: 'লাইভ ক্লাস / প্লে' },
  { key: 'video', label: 'ভিডিও ক্লাস' },
  { key: 'file-check', label: 'পরীক্ষা / কুইজ' },
  { key: 'list-checks', label: 'মডেল টেস্ট / তালিকা' },
  { key: 'bot', label: 'AI ডাউট সলভ' },
  { key: 'user-check', label: 'ক্লাস টিচার / মেন্টর' },
  { key: 'bar-chart', label: 'প্রোগ্রেস রিপোর্ট' },
  { key: 'users', label: 'প্যারেন্ট-টিচার মিটিং' },
  { key: 'graduation-cap', label: 'এক্সপার্ট প্যানেল' },
  { key: 'gift', label: 'ফ্রি গিফট / বোনাস' },
  { key: 'award', label: 'অ্যাওয়ার্ড / প্রস্তুতি' },
  { key: 'book-check', label: 'পাঠ্যবিষয় / বান্ডেল' },
  { key: 'clock', label: 'সময়সূচি' },
  { key: 'calendar-days', label: 'ক্যালেন্ডার / মেয়াদ' },
  { key: 'calendar-clock', label: 'সময়সীমা' },
  { key: 'target', label: 'লক্ষ্য / SuperPrep' },
  { key: 'sparkles', label: 'স্পেশাল গাইড' },
  { key: 'zap', label: 'এক্সক্লুসিভ ফিচার' },
  { key: 'layers', label: 'কোর্স কাঠামো' },
  { key: 'check-circle', label: 'চেকলিস্ট' },
];

const VALID_GUIDE_ICON_KEYS = new Set<string>(Object.keys(CLASS_GUIDE_ICON_MAP));

export function normalizeClassGuideIconKey(
  raw: unknown,
  fallback: ClassGuideIconKey = 'book-open'
): ClassGuideIconKey {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (VALID_GUIDE_ICON_KEYS.has(trimmed)) {
      return trimmed as ClassGuideIconKey;
    }
  }
  return fallback;
}

export function getClassGuideIcon(
  key?: unknown,
  fallback: ClassGuideIconKey = 'book-open'
): React.ComponentType<{ className?: string }> {
  const normalized = normalizeClassGuideIconKey(key, fallback);
  return CLASS_GUIDE_ICON_MAP[normalized] || BookOpen;
}
