'use client';

import React from 'react';
import type { Category, Course } from '../../../types.ts';
import type { CategoryCourseOrdersMap } from '../../../lib/courseSorting.ts';
import { FilteredCategoryPage } from './FilteredCategoryPage.tsx';

interface Hsc28HumanitiesCategoryPageProps {
  category?: Category;
  courses: Course[];
  categoryCourseOrders?: CategoryCourseOrdersMap;
  onBack: () => void;
  onEnrollClick: (course: Course, referrer: string) => void;
}

export const Hsc28HumanitiesCategoryPage: React.FC<Hsc28HumanitiesCategoryPageProps> = ({
  category,
  courses,
  categoryCourseOrders,
  onBack,
  onEnrollClick,
}) => (
  <FilteredCategoryPage
    configKey="hsc-28-humanities"
    category={category}
    courses={courses}
    categoryCourseOrders={categoryCourseOrders}
    onBack={onBack}
    onEnrollClick={onEnrollClick}
  />
);

