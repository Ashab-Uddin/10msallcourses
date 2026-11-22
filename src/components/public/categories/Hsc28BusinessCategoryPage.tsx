'use client';

import React from 'react';
import type { Category, Course } from '../../../types.ts';
import type { CategoryCourseOrdersMap } from '../../../lib/courseSorting.ts';
import { FilteredCategoryPage } from './FilteredCategoryPage.tsx';

interface Hsc28BusinessCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

export const Hsc28BusinessCategoryPage: React.FC<Hsc28BusinessCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => (
  <FilteredCategoryPage
    configKey="hsc-28-business"
    category={category}
    courses={courses}
    categoryCourseOrders={categoryCourseOrders}
    onBack={onBack}
    onEnrollClick={onEnrollClick}
  />
);

