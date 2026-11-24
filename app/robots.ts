import { MetadataRoute } from 'next';
import { getSiteBaseUrl } from '@/src/lib/seo';

// Policy: all public pages are crawlable by every bot (including search/AI-search
// crawlers); admin, API and /go/ affiliate redirects are blocked. Training-related
// crawlers (GPTBot, Google-Extended, CCBot, ...) are intentionally not singled out,
// so they keep following the "*" rule exactly as before.
const SEARCH_BOTS = ['Googlebot', 'Googlebot-Image', 'OAI-SearchBot', 'ChatGPT-User'];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();
  const allow = ['/', '/og/', '/api/og/'];
  const disallow = ['/admin', '/admin/', '/api/', '/go/'];

  return {
    rules: [
      { userAgent: '*', allow, disallow },
      { userAgent: SEARCH_BOTS, allow, disallow },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
