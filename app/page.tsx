import type { Metadata } from 'next';
import App from '@/src/App';
import { getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import { buildSeoMetadata, buildStructuredData } from '@/src/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicPortalData();
  return buildSeoMetadata('/', data.categories, data.settings);
}

export default async function Page() {
  const [data, bookData] = await Promise.all([
    getPublicPortalData(),
    getPublicBookStoreData(),
  ]);
  const structuredData = buildStructuredData('/', data.categories, data.courses, data.settings);

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
        initialServerNow={data.serverNow}
        initialBookCategories={bookData.bookCategories}
        initialBooks={bookData.books}
      />
    </>
  );
}
