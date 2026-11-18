import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublishableKey, getSupabaseUrl } from './config.ts';

export interface PendingCookie {
  name: string;
  value: string;
  options?: CookieOptions;
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
  pendingCookies: PendingCookie[]
): void {
  const isProd = process.env.NODE_ENV === 'production';

  for (const { name, value, options } of pendingCookies) {
    res.cookies.set({
      ...options,
      name,
      value,
      httpOnly: true,
      sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
      secure: isProd ? true : Boolean(options?.secure),
      path: options?.path ?? '/',
    });
  }
}
