import { MetadataRoute } from 'next';
import { getPublicPortalData } from '@/src/db/repository';
import { getSiteBaseUrl } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();

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
    { path: '/class-5', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/class-6', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/class-7', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/class-8', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/skills', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/free-course', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/admission', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/books', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/categories/language-learning', changeFrequency: 'weekly', priority: 0.85 },
  ];

  const fallbackNow = new Date();
  let latestSiteDate = fallbackNow;
  const categoryLastMod = new Map<string, Date>();
  let dynamicCategories: Array<{ slug: string; updatedAt?: string }> = [];

  try {
    const data = await getPublicPortalData();
    dynamicCategories = data.categories || [];
    const candidateDates: number[] = [];

    if (data.settings?.updatedAt) {
      const ts = new Date(data.settings.updatedAt).getTime();
      if (Number.isFinite(ts)) candidateDates.push(ts);
    }

    for (const course of data.courses || []) {
      const raw = course.updatedAt || course.createdAt;
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (!Number.isFinite(ts)) continue;
      candidateDates.push(ts);

      const existing = categoryLastMod.get(course.categorySlug);
      if (!existing || ts > existing.getTime()) {
        categoryLastMod.set(course.categorySlug, new Date(ts));
      }
    }

    if (candidateDates.length > 0) {
      latestSiteDate = new Date(Math.max(...candidateDates));
    }
  } catch {
    // Fall back to canonical entries with current date if repository read fails
  }

  const seenUrls = new Set<string>();
  const entries: MetadataRoute.Sitemap = canonicalPaths.map((item) => {
    const url = item.path === '/' ? baseUrl : `${baseUrl}${item.path}`;
    seenUrls.add(url);
    return {
      url,
      lastModified: latestSiteDate,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    };
  });

  for (const cat of dynamicCategories) {
    const catUrl = `${baseUrl}/category/${cat.slug}`;
    if (!seenUrls.has(catUrl)) {
      seenUrls.add(catUrl);
      entries.push({
        url: catUrl,
        lastModified: categoryLastMod.get(cat.slug) || latestSiteDate,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  }

  return entries;
}
