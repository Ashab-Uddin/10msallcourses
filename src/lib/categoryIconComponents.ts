import React from 'react';
import {
  Atom,
  Award,
  Backpack,
  BookMarked,
  BookOpen,
  Briefcase,
  Calculator,
  Compass,
  Cpu,
  FlaskConical,
  Gift,
  Globe,
  GraduationCap,
  Landmark,
  Languages,
  Laptop,
  Layers,
  Library,
  Lightbulb,
  Microscope,
  NotebookPen,
  Palette,
  School,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import type { Category } from '../types.ts';
import type { NavbarGroupKey } from './navbarCategories.ts';
import {
  resolveCategoryIconKey,
  resolveNavbarGroupIconKey,
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
  palette: Palette,
  landmark: Landmark,
  cpu: Cpu,
  stethoscope: Stethoscope,
  zap: Zap,
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

export function getNavbarGroupLucideIcon(
  group: NavbarGroupKey,
  categories: ReadonlyArray<Category> = []
): LucideIconComponent {
  const resolved = resolveNavbarGroupIconKey(group, categories);
  return CATEGORY_LUCIDE_ICON_MAP[resolved] || Sparkles;
}

export function NavbarGroupIcon({
  group,
  categories = [],
  className,
}: {
  group: NavbarGroupKey;
  categories?: ReadonlyArray<Category>;
  className?: string;
}): React.ReactElement {
  const Icon = getNavbarGroupLucideIcon(group, categories);
  return React.createElement(Icon, { className });
}
