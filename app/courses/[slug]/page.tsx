import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { permanentRedirect } from 'next/navigation';
import App from '@/src/App';
import { getCourseBySlug, getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import { decodeCourseSlug, generateUnicodeCourseSlug } from '@/src/lib/courseSlug';
import {
  buildCourseSeoMetadata,
  buildStructuredData,
  resolveSiteOriginFromHeaders,
} from '@/src/lib/seo';
import type { Course } from '@/src/types';

export const dynamic = 'force-dynamic';

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

function isPublicVisibleCourse(course: Course): boolean {
  return course.status === 'active' || course.status === 'closed';
}

function findMatchingCourse(courses: Course[], rawSlug: string, decodedSlug: string): Course | null {
  const lowerDecoded = decodedSlug.toLowerCase();
  const normalizedTarget = generateUnicodeCourseSlug(decodedSlug);
  return (
    courses.find(
      (c) =>
        isPublicVisibleCourse(c) &&
        (c.slug === decodedSlug ||
          c.slug === rawSlug ||
          c.slug.toLowerCase() === lowerDecoded)
    ) ??
    (normalizedTarget
      ? courses.find(
          (c) =>
            isPublicVisibleCourse(c) &&
            generateUnicodeCourseSlug(c.slug) === normalizedTarget
        ) ?? null
      : null)
  );
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeCourseSlug(slug);
  const origin = resolveSiteOriginFromHeaders(await headers());

  let matchedCourse = decodedSlug ? await getCourseBySlug(decodedSlug).catch(() => null) : null;
  if (!matchedCourse && slug && slug !== decodedSlug) {
    matchedCourse = await getCourseBySlug(slug).catch(() => null);
  }
  if (!matchedCourse) {
    const portalData = await getPublicPortalData().catch(() => null);
    if (portalData?.courses) {
      matchedCourse = findMatchingCourse(portalData.courses, slug, decodedSlug);
    }
  }

  return buildCourseSeoMetadata(matchedCourse, decodedSlug || slug, origin);
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const decodedSlug = decodeCourseSlug(slug);
  const origin = resolveSiteOriginFromHeaders(await headers());

  const [data, bookData] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
  ]);

  let matchedCourse = findMatchingCourse(data.courses, slug, decodedSlug);
  if (!matchedCourse && decodedSlug) {
    matchedCourse = await getCourseBySlug(decodedSlug).catch(() => null);
  }

  if (matchedCourse && decodedSlug && decodedSlug !== matchedCourse.slug) {
    permanentRedirect(`/courses/${encodeURIComponent(matchedCourse.slug)}`);
  }

  const initialCourses =
    matchedCourse && !data.courses.some((c) => c.id === matchedCourse.id)
      ? [matchedCourse, ...data.courses]
      : data.courses;

  const canonicalPath = matchedCourse
    ? `/courses/${encodeURIComponent(matchedCourse.slug)}`
    : `/courses/${encodeURIComponent(decodedSlug || slug)}`;

  const structuredData = buildStructuredData(
    canonicalPath,
    data.categories,
    initialCourses,
    data.settings,
    origin
  );

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <App
        initialCategories={data.categories}
        initialCourses={initialCourses}
        initialSettings={data.settings}
        initialOfferTimers={data.offerTimers}
        initialHasOfferTimers={data.hasOfferTimers}
        initialSelectorIconOrder={data.selectorIconOrder}
        initialSelectorIconLabels={data.selectorIconLabels}
        initialCategoryCourseOrders={data.categoryCourseOrders}
        initialServerNow={data.serverNow}
        initialBookCategories={bookData.bookCategories}
        initialBooks={bookData.books}
      />
    </>
  );
}
