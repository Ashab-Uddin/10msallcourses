import type { NextRequest } from 'next/server';

const SAFE_READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function extractAllowedHosts(req: NextRequest): Set<string> {
  const allowedHosts = new Set<string>();

  const forwardedHost = req.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (forwardedHost) {
    allowedHosts.add(forwardedHost);
  }

  const directHost = req.headers
    .get('host')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (directHost) {
    allowedHosts.add(directHost);
  }

  const nextHost = req.nextUrl?.host?.trim().toLowerCase();
  if (nextHost) {
    allowedHosts.add(nextHost);
  }

  for (const candidate of [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
  ]) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate.trim());
      if (parsed.host) {
        allowedHosts.add(parsed.host.toLowerCase());
      }
    } catch {
      // Ignore malformed env URL
    }
  }

  return allowedHosts;
}

/**
 * Edge & Node compatible same-origin CSRF check for mutating requests.
 * Rejects:
 *   - Explicit cross-origin `Origin` headers (including `Origin: null`)
 *   - Cross-origin `Referer` headers when `Origin` is absent
 *   - Headerless mutations lacking both matching `Origin`/`Referer` and `Sec-Fetch-Site: same-origin`
 */
export function isSameOriginMutation(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (SAFE_READ_METHODS.has(method)) {
    return true;
  }

  const allowedHosts = extractAllowedHosts(req);
  if (allowedHosts.size === 0) {
    return false;
  }

  const origin = req.headers.get('origin')?.trim();
  if (origin) {
    if (origin.toLowerCase() === 'null') {
      return false;
    }
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return allowedHosts.has(originHost);
    } catch {
      return false;
    }
  }

  const referer = req.headers.get('referer')?.trim();
  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      return allowedHosts.has(refererHost);
    } catch {
      return false;
    }
  }

  const secFetchSite = req.headers.get('sec-fetch-site')?.trim().toLowerCase();
  return secFetchSite === 'same-origin';
}
