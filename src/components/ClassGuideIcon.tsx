'use client';

import React from 'react';
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
import { normalizeClassGuideIconKey } from '../lib/classGuideIcons.ts';

interface ClassGuideIconProps {
  iconKey?: unknown;
  fallback?: ClassGuideIconKey;
  className?: string;
}

export const ClassGuideIcon: React.FC<ClassGuideIconProps> = ({
  iconKey,
  fallback = 'book-open',
  className = 'w-5 h-5',
}) => {
  const normalized = normalizeClassGuideIconKey(iconKey, fallback);

  switch (normalized) {
    case 'play-circle':
      return <PlayCircle className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'file-check':
      return <FileCheck2 className={className} />;
    case 'list-checks':
      return <ListChecks className={className} />;
    case 'bot':
      return <Bot className={className} />;
    case 'user-check':
      return <UserCheck className={className} />;
    case 'bar-chart':
      return <BarChart3 className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'graduation-cap':
      return <GraduationCap className={className} />;
    case 'gift':
      return <Gift className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'book-check':
      return <BookCheck className={className} />;
    case 'clock':
      return <Clock className={className} />;
    case 'calendar-days':
      return <CalendarDays className={className} />;
    case 'calendar-clock':
      return <CalendarClock className={className} />;
    case 'target':
      return <Target className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'layers':
      return <Layers className={className} />;
    case 'check-circle':
      return <CheckCircle2 className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};
