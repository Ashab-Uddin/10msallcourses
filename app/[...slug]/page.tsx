import type { Metadata } from 'next';
import App from '@/src/App';
import { getPublicPortalData } from '@/src/db/repository';
import { buildSeoMetadata, buildStructuredData } from '@/src/lib/seo';

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
  const data = await getPublicPortalData();
  return buildSeoMetadata(pathname, data.categories, data.settings);
}

export default async function CatchAllPage({ params }: CatchAllRouteProps) {
  const { slug = [] } = await params;
  const pathname = `/${slug.join('/')}`;

  if (pathname.startsWith('/admin')) {
    return <App />;
  }

  const data = await getPublicPortalData();
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
      />
    </>
  );
}
