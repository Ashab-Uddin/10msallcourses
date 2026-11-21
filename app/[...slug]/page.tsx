import type { Metadata } from 'next';
import App from '@/src/App';
import { getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import { buildSeoMetadata, buildStructuredData } from '@/src/lib/seo';

export const revalidate = 60;

interface CatchAllRouteProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: CatchAllRouteProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const pathname = `/${slug.join('/')}`;
  if (pathname.startsWith('/admin')) {
    return buildSeoMetadata(pathname, []);
  }
  const [data, bookData] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
  ]);
  return buildSeoMetadata(
    pathname,
    data.categories,
    data.settings,
    bookData.bookCategories,
    data.courses
  );
}

export default async function CatchAllPage({ params }: CatchAllRouteProps) {
  const { slug = [] } = await params;
  const pathname = `/${slug.join('/')}`;

  if (pathname.startsWith('/admin')) {
    return <App />;
  }

  const [data, bookData] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
  ]);
  const structuredData = buildStructuredData(
    pathname,
    data.categories,
    data.courses,
    data.settings
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
    </>
  );
}
