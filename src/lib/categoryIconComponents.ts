import type React from 'react';
import {
  Atom,
  Award,
  Backpack,
  BookMarked,
  BookOpen,
  Briefcase,
  Calculator,
  Compass,
  FlaskConical,
  Gift,
  Globe,
  GraduationCap,
  Languages,
  Laptop,
  Layers,
  Library,
  Lightbulb,
  Microscope,
  NotebookPen,
  School,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { Category } from '../types.ts';
import {
  resolveCategoryIconKey,
  type CategoryIconKey,
  type ResolvedCategoryIconKey,
} from './categoryIcons.ts';

export type LucideIconComponent = React.ComponentType<{ className?: string }>;

export const CATEGORY_LUCIDE_ICON_MAP: Record<ResolvedCategoryIconKey, LucideIconComponent> = {
  atom: Atom,
  microscope: Microscope,
  flask: FlaskConical,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  'book-open': BookOpen,
  globe: Globe,
  languages: Languages,
  laptop: Laptop,
  'graduation-cap': GraduationCap,
  target: Target,
  trophy: Trophy,
  award: Award,
  sparkles: Sparkles,
  school: School,
  backpack: Backpack,
  'book-marked': BookMarked,
  'notebook-pen': NotebookPen,
  lightbulb: Lightbulb,
  library: Library,
  calculator: Calculator,
  compass: Compass,
  gift: Gift,
  layers: Layers,
};

export function getLucideIconByKey(
  key: CategoryIconKey | undefined,
  fallbackCat?: Pick<Category, 'name' | 'slug' | 'subtitle' | 'navGroup'>
): LucideIconComponent {
  if (key && key !== 'auto') {
    return CATEGORY_LUCIDE_ICON_MAP[key] || Sparkles;
  }
  if (fallbackCat) {
    return CATEGORY_LUCIDE_ICON_MAP[resolveCategoryIconKey(fallbackCat)] || Sparkles;
  }
  return Sparkles;
}

export function getCategoryLucideIcon(
  cat: Pick<Category, 'name' | 'slug' | 'subtitle' | 'navGroup' | 'iconKey'>
): LucideIconComponent {
  const resolved = resolveCategoryIconKey(cat);
  return CATEGORY_LUCIDE_ICON_MAP[resolved] || Sparkles;
}
