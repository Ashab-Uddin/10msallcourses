import { MetadataRoute } from 'next';
import { getSiteBaseUrl } from '@/src/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/go/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
