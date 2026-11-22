import { NextRequest, NextResponse } from 'next/server';
import { getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import {
  categorySlugsMatch,
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
  normalizeCategorySlugKey,
  resolveCourseDepartments,
} from '@/src/lib/categoryMatching';
import { normalizeTargetGroups } from '@/src/lib/courseValidation';
import { resolveCategoryNavGroup } from '@/src/lib/navbarCategories';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const normalizedSlug = normalizeCategorySlugKey(slug || '');

    if (!normalizedSlug) {
      return NextResponse.json(
        { error: 'বৈধ ক্যাটাগরি স্লাগ প্রদান করুন।' },
        { status: 400 }
      );
    }

    if (normalizedSlug === 'books' || normalizedSlug === 'book-store') {
      const bookData = await getPublicBookStoreData();
      return NextResponse.json(
        {
          type: 'bookstore',
          slug: 'books',
          bookCategories: bookData.bookCategories,
          books: bookData.books,
          totalItems: bookData.books.length,
        },
        {
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const effectiveSlug = normalizedSlug === 'free' ? 'free-course' : normalizedSlug;
    const data = await getPublicPortalData();
    const matchedCategory = data.categories.find((cat) =>
      categorySlugsMatch(cat.slug, effectiveSlug)
    );

    const batchFilter = req.nextUrl.searchParams.get('batch')?.trim();
    const groupFilter = req.nextUrl.searchParams.get('group')?.trim();
    const targetGroupsFilter =
      groupFilter && groupFilter !== 'all' ? normalizeTargetGroups(groupFilter) : [];

    const aggregateGroupKey =
      !matchedCategory && (effectiveSlug === 'hsc-28' || effectiveSlug === 'hsc-27')
        ? effectiveSlug === 'hsc-28'
          ? 'hsc28'
          : 'hsc27'
        : null;
    const aggregateSubcategories = aggregateGroupKey
      ? data.categories.filter(
          (cat) =>
            (cat.status || 'active') === 'active' &&
            resolveCategoryNavGroup(cat) === aggregateGroupKey
        )
      : [];

    let matchedCourses =
      aggregateSubcategories.length > 0
        ? data.courses.filter(
            (course) =>
              aggregateSubcategories.some((subCat) =>
                courseMatchesCategorySlug(course, subCat.slug)
              ) || courseMatchesAcademicBatch(course, effectiveSlug)
          )
        : data.courses.filter((course) =>
            courseMatchesCategorySlug(course, effectiveSlug)
          );

    if (batchFilter && batchFilter !== 'all') {
      matchedCourses = matchedCourses.filter((course) =>
        courseMatchesAcademicBatch(course, batchFilter)
      );
    }

    if (targetGroupsFilter.length > 0) {
      matchedCourses = matchedCourses.filter((course) =>
        resolveCourseDepartments(course).some((g) => targetGroupsFilter.includes(g))
      );
    }

    if (
      !matchedCategory &&
      aggregateSubcategories.length === 0 &&
      !['class-5', 'class-6', 'class-7', 'class-8', 'free-course', 'skills', 'language-learning'].includes(
        effectiveSlug
      )
    ) {
      return NextResponse.json(
        { error: 'ক্যাটাগরিটি পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        type: 'courses',
        category: matchedCategory ||
          (aggregateSubcategories.length > 0
            ? {
                id: aggregateSubcategories[0].id,
                name:
                  effectiveSlug === 'hsc-28'
                    ? 'HSC 28 অনলাইন ব্যাচ'
                    : 'HSC 27 অনলাইন ব্যাচ',
                slug: effectiveSlug,
                subtitle: aggregateSubcategories.map((c) => c.name).join(' • '),
                badgeColor: '#0284c7',
                displayOrder: aggregateSubcategories[0].displayOrder,
                status: 'active',
              }
            : {
                id: 0,
                name: effectiveSlug,
                slug: effectiveSlug,
                subtitle: null,
                badgeColor: 'red',
                displayOrder: 99,
                status: 'active',
              }),
        subcategories: aggregateSubcategories,
        courses: matchedCourses,
        totalItems: matchedCourses.length,
        serverNow: data.serverNow,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Failed to load category detail:', error);
    return NextResponse.json(
      { error: 'ক্যাটাগরির তথ্য লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
