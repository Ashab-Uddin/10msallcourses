import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublishableKey, getSupabaseUrl } from './config.ts';

export interface PendingCookie {
  name: string;
  value: string;
  options?: CookieOptions;
}

function resolveSupabaseCookieSecurity(req?: NextRequest): {
  httpOnly: true;
  sameSite: 'lax' | 'none';
  secure: boolean;
  partitioned?: boolean;
  path: '/';
} {
  if (process.env.VERCEL === '1') {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    };
  }

  const forwardedProto = req?.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  const isHttpsPreview =
    forwardedProto === 'https' ||
    req?.nextUrl?.protocol === 'https:' ||
    Boolean(process.env.APP_URL?.trim().toLowerCase().startsWith('https://'));

  if (isHttpsPreview) {
    return {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      partitioned: true,
      path: '/',
    };
  }

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/**
 * Creates a request-scoped Supabase SSR client for Next.js Route Handlers.
 * Cookies mutated by Supabase Auth (login, token refresh, logout) are collected
 * into `pendingCookies` and attached with HttpOnly security attributes onto the
 * returned NextResponse via `applyPendingSupabaseCookies()`.
 */
export function createSupabaseRouteClient(req: NextRequest) {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase Auth credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) are not configured.'
    );
  }

  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          pendingCookies.push({ name, value, options });
        }
      },
    },
  });

  return { supabase, pendingCookies };
}

export function applyPendingSupabaseCookies(
  res: NextResponse,
  pendingCookies: PendingCookie[],
  req?: NextRequest
): void {
  const securityAttrs = resolveSupabaseCookieSecurity(req);

  for (const { name, value, options } of pendingCookies) {
    res.cookies.set({
      ...options,
      name,
      value,
      httpOnly: true,
      sameSite: securityAttrs.sameSite,
      secure: securityAttrs.secure,
      ...(securityAttrs.partitioned ? { partitioned: true } : {}),
      path: options?.path ?? securityAttrs.path,
    });
  }
}
