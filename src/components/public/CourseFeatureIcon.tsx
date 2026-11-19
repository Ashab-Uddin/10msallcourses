'use client';

import React from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Laptop,
  Tag,
} from 'lucide-react';
import type { CourseFeatureIconKey } from '../../types.ts';

interface CourseFeatureIconProps {
  icon: CourseFeatureIconKey;
  className?: string;
}

export const CourseFeatureIcon: React.FC<CourseFeatureIconProps> = ({
  icon,
  className = 'w-3.5 h-3.5',
}) => {
  switch (icon) {
    case 'tag':
      return <Tag className={className} aria-hidden="true" />;
    case 'laptop':
      return <Laptop className={className} aria-hidden="true" />;
    case 'help':
      return <HelpCircle className={className} aria-hidden="true" />;
    case 'file':
      return <FileText className={className} aria-hidden="true" />;
    case 'clock':
      return <Clock className={className} aria-hidden="true" />;
    case 'book':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'award':
      return <Award className={className} aria-hidden="true" />;
    case 'check':
    default:
      return <CheckCircle2 className={className} aria-hidden="true" />;
  }
};
