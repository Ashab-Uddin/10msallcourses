import { MetadataRoute } from 'next';
import { getPublicPortalData } from '@/src/db/repository';
import { getSiteBaseUrl } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  const lastModified = new Date();

  const canonicalPaths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }> = [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    { path: '/hsc/hsc-28', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/hsc/hsc-27', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/hsc/hsc-26', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/ssc/ssc-27', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/ssc/ssc-28', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/class-6', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/class-7', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/class-8', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/skills', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/admission', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/books', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/categories/language-learning', changeFrequency: 'weekly', priority: 0.85 },
  ];

  const seenUrls = new Set<string>();
  const entries: MetadataRoute.Sitemap = canonicalPaths.map((item) => {
    const url = item.path === '/' ? baseUrl : `${baseUrl}${item.path}`;
    seenUrls.add(url);
    return {
      url,
      lastModified,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    };
  });

  try {
    const data = await getPublicPortalData();
    for (const cat of data.categories || []) {
      const catUrl = `${baseUrl}/category/${cat.slug}`;
      if (!seenUrls.has(catUrl)) {
        seenUrls.add(catUrl);
        entries.push({
          url: catUrl,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.85,
        });
      }
    }
  } catch {
    // Return canonical entries if repository read fails
  }

  return entries;
}
