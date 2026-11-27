import { MetadataRoute } from 'next';
import { getPublicPortalData } from '@/src/db/repository';
import { getRouteCourses, getSiteBaseUrl } from '@/src/lib/seo';
import { isReservedCategorySlug } from '@/src/lib/courseSlug';
import { NAVBAR_GROUP_PATHS } from '@/src/lib/navbarCategories';

export const dynamic = 'force-dynamic';

type Freq = MetadataRoute.Sitemap[number]['changeFrequency'];

// Canonical, indexable (HTTP 200, self-canonical) paths only. Aliases such as
// /ssc/ssc-29, /hsc, /ssc, /class-10 and /academic/* redirect (301) and are excluded.
const STATIC_PATHS: Array<{ path: string; freq: Freq; priority: number }> = [
  { path: '/', freq: 'daily', priority: 1.0 },
  { path: '/online-batch', freq: 'weekly', priority: 0.9 },
  { path: '/hsc/hsc-27', freq: 'weekly', priority: 0.9 },
  { path: '/hsc/hsc-26', freq: 'weekly', priority: 0.9 },
  { path: '/ssc/ssc-27', freq: 'weekly', priority: 0.9 },
  { path: '/ssc/ssc-28', freq: 'weekly', priority: 0.9 },
  { path: '/class-9', freq: 'weekly', priority: 0.9 },
  { path: '/class-5', freq: 'monthly', priority: 0.8 },
  { path: '/class-6', freq: 'monthly', priority: 0.8 },
  { path: '/class-7', freq: 'monthly', priority: 0.8 },
  { path: '/class-8', freq: 'monthly', priority: 0.8 },
  { path: '/skills', freq: 'weekly', priority: 0.85 },
  { path: '/free-course', freq: 'weekly', priority: 0.85 },
  { path: '/language-learning', freq: 'weekly', priority: 0.85 },
  { path: '/books', freq: 'weekly', priority: 0.7 },
  ...Object.values(NAVBAR_GROUP_PATHS).map((path) => ({
    path,
    freq: 'weekly' as Freq,
    priority: 0.8,
  })),
];

const ALIAS_SLUGS = new Set(['ssc-29', 'free', 'free-courses', 'school', 'hsc', 'ssc', 'class-10']);

function toDate(raw?: string | null): Date | undefined {
  if (!raw) return undefined;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? new Date(ts) : undefined;
}

function latest(dates: Array<Date | undefined>): Date | undefined {
  let max = 0;
  for (const d of dates) if (d && d.getTime() > max) max = d.getTime();
  return max ? new Date(max) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();

  let categories: Awaited<ReturnType<typeof getPublicPortalData>>['categories'] = [];
  let courses: Awaited<ReturnType<typeof getPublicPortalData>>['courses'] = [];
  try {
    const data = await getPublicPortalData();
    categories = data.categories || [];
    courses = (data.courses || []).filter((c) => c.status === 'active' || c.status === 'closed');
  } catch {
    // Fall back to static entries without lastmod
  }

  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];
  const add = (path: string, freq: Freq, priority: number, lastModified?: Date) => {
    const url = path === '/' ? baseUrl : `${baseUrl}${path}`;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({
      url,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: freq,
      priority,
    });
  };

  const courseDate = (c: (typeof courses)[number]) => toDate(c.updatedAt || c.createdAt);

  for (const item of STATIC_PATHS) {
    // lastmod = newest course shown on that page; omitted when unknown
    const pageCourses = item.path === '/books' ? [] : getRouteCourses(item.path, categories, courses);
    add(item.path, item.freq, item.priority, latest(pageCourses.map(courseDate)));
  }

  for (const cat of categories) {
    if ((cat.status || 'active') !== 'active') continue;
    if (!cat.slug || isReservedCategorySlug(cat.slug) || ALIAS_SLUGS.has(cat.slug.toLowerCase())) continue;
    const path = `/${encodeURIComponent(cat.slug)}`;
    const pageCourses = getRouteCourses(path, categories, courses);
    add(path, 'weekly', 0.75, latest(pageCourses.map(courseDate)));
  }

  for (const course of courses) {
    add(`/courses/${encodeURIComponent(course.slug)}`, 'weekly', 0.6, courseDate(course));
  }

  return entries;
}
