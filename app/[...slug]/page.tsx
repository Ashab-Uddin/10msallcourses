import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import App from '@/src/App';
import { getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import {
  getOnlineBatchPageConfig,
  getPublicOnlineBatchSections,
} from '@/src/db/onlineBatchRepository';
import { cloneDefaultOnlineBatchPageConfig } from '@/src/lib/onlineBatchPageConfig';
import {
  buildSeoMetadata,
  buildStructuredData,
  resolveSiteOriginFromHeaders,
} from '@/src/lib/seo';
import { isKnownPublicRoute } from '@/src/lib/publicRoutes';

export const dynamic = 'force-dynamic';

interface CatchAllRouteProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: CatchAllRouteProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const pathname = `/${slug.join('/')}`;
  if (pathname.startsWith('/admin')) {
    return buildSeoMetadata(pathname, []);
  }
  const [data, bookData, origin, onlineBatchPageConfig] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
    headers().then((h) => resolveSiteOriginFromHeaders(h)),
    getOnlineBatchPageConfig().catch(() => cloneDefaultOnlineBatchPageConfig()),
  ]);
  if (!isKnownPublicRoute(pathname, data.categories, bookData.bookCategories)) {
    return { title: 'পেজ পাওয়া যায়নি', robots: { index: false, follow: false } };
  }
  return buildSeoMetadata(
    pathname,
    data.categories,
    data.settings,
    bookData.bookCategories,
    data.courses,
    origin,
    onlineBatchPageConfig
  );
}

export default async function CatchAllPage({ params }: CatchAllRouteProps) {
  const { slug = [] } = await params;
  const pathname = `/${slug.join('/')}`;

  if (pathname.startsWith('/admin')) {
    return <App />;
  }

  const [data, bookData, origin, onlineBatchPageConfig] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
    headers().then((h) => resolveSiteOriginFromHeaders(h)),
    getOnlineBatchPageConfig().catch(() => cloneDefaultOnlineBatchPageConfig()),
  ]);
  if (!isKnownPublicRoute(pathname, data.categories, bookData.bookCategories)) {
    notFound();
  }
  const onlineBatchSections = await getPublicOnlineBatchSections(data.courses).catch(() => []);
  const structuredData = buildStructuredData(
    pathname,
    data.categories,
    data.courses,
    data.settings,
    origin,
    onlineBatchPageConfig
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
        initialCourses={data.courses}
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
