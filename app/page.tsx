import type { Metadata } from 'next';
import { headers } from 'next/headers';
import App from '@/src/App';
import { CrawlableCatalog } from '@/src/components/public/CrawlableCatalog';
import { getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import {
  buildSeoMetadata,
  buildStructuredData,
  resolveSiteOriginFromHeaders,
} from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const [data, bookData, origin] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
    headers().then((h) => resolveSiteOriginFromHeaders(h)),
  ]);
  return buildSeoMetadata(
    '/',
    data.categories,
    data.settings,
    bookData.bookCategories,
    data.courses,
    origin
  );
}

export default async function Page() {
  const [data, bookData, origin] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
    headers().then((h) => resolveSiteOriginFromHeaders(h)),
  ]);
  const structuredData = buildStructuredData(
    '/',
    data.categories,
    data.courses,
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
      />
      <CrawlableCatalog categories={data.categories} courses={data.courses} />
    </>
  );
}
