import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import App from '@/src/App';
import { getCourseBySlug, getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import {
  getOnlineBatchPageConfig,
  getPublicOnlineBatchSections,
} from '@/src/db/onlineBatchRepository';
import { cloneDefaultOnlineBatchPageConfig } from '@/src/lib/onlineBatchPageConfig';
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
  const nfcDecoded = decodedSlug.normalize('NFC');
  const lowerDecoded = nfcDecoded.toLowerCase();
  const normalizedTarget = generateUnicodeCourseSlug(nfcDecoded);
  return (
    courses.find(
      (c) =>
        isPublicVisibleCourse(c) &&
        (c.slug.normalize('NFC') === nfcDecoded ||
          c.slug === rawSlug ||
          c.slug.normalize('NFC').toLowerCase() === lowerDecoded)
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

  const [data, bookData, onlineBatchPageConfig] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
    getOnlineBatchPageConfig().catch(() => cloneDefaultOnlineBatchPageConfig()),
  ]);

  let matchedCourse = findMatchingCourse(data.courses, slug, decodedSlug);
  if (!matchedCourse && decodedSlug) {
    matchedCourse = await getCourseBySlug(decodedSlug).catch(() => null);
  }

  if (!matchedCourse) {
    notFound();
  }

  if (
    matchedCourse &&
    decodedSlug &&
    decodedSlug.normalize('NFC') !== matchedCourse.slug.normalize('NFC')
  ) {
    permanentRedirect(`/courses/${encodeURIComponent(matchedCourse.slug)}`);
  }

  const onlineBatchSections = await getPublicOnlineBatchSections(data.courses).catch(() => []);

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
        initialOnlineBatchSections={onlineBatchSections}
        initialOnlineBatchPageConfig={onlineBatchPageConfig}
      />
    </>
  );
}
