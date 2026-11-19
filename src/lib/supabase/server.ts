import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublishableKey, getSupabaseUrl } from './config.ts';

export interface PendingCookie {
  name: string;
  value: string;
  options?: CookieOptions;
}

export interface ParsedSupabaseCookieSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: unknown;
}

const BASE64_COOKIE_PREFIX = 'base64-';
const MAX_COOKIE_CHUNK_SIZE = 3180;
const CHUNK_SUFFIX_REGEX = /^(.*)\.(0|[1-9][0-9]*)$/;

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

export function getSupabaseStorageKey(): string {
  const url = getSupabaseUrl();
  if (!url) return 'sb-auth-token';
  try {
    const projectRef = new URL(url).hostname.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return 'sb-auth-token';
  }
}

let cachedStatelessAuthClient: SupabaseClient | null = null;
let cachedStatelessAuthFingerprint = '';

/**
 * Singleton stateless Supabase Auth client (no cookie storage, no `onAuthStateChange`
 * background session recovery/logging). Reuses HTTP keep-alive connections across
 * login, explicit JWT fallback verification (`getUser(jwt)`), and single-flight refresh.
 */
export function createSupabaseStatelessAuthClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase Auth credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) are not configured.'
    );
  }

  const fingerprint = `${url}|${publishableKey.slice(0, 12)}|${publishableKey.length}`;
  if (cachedStatelessAuthClient && cachedStatelessAuthFingerprint === fingerprint) {
    return cachedStatelessAuthClient;
  }

  cachedStatelessAuthClient = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  cachedStatelessAuthFingerprint = fingerprint;

  return cachedStatelessAuthClient;
}

function isSupabaseAuthCookieName(name: string, storageKey: string): boolean {
  if (name === storageKey || name.startsWith(`${storageKey}.`)) return true;
  return name.startsWith('sb-') && (name.includes('-auth-token') || name.includes('-code-verifier'));
}

function createCookieChunks(key: string, value: string): Array<{ name: string; value: string }> {
  let encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= MAX_COOKIE_CHUNK_SIZE) {
    return [{ name: key, value }];
  }

  const chunks: string[] = [];
  while (encodedValue.length > 0) {
    let encodedHead = encodedValue.slice(0, MAX_COOKIE_CHUNK_SIZE);
    const lastEscapePos = encodedHead.lastIndexOf('%');
    if (lastEscapePos > MAX_COOKIE_CHUNK_SIZE - 3) {
      encodedHead = encodedHead.slice(0, lastEscapePos);
    }

    let decodedHead = '';
    while (encodedHead.length > 0) {
      try {
        decodedHead = decodeURIComponent(encodedHead);
        break;
      } catch (err) {
        if (
          err instanceof URIError &&
          encodedHead.at(-3) === '%' &&
          encodedHead.length > 3
        ) {
          encodedHead = encodedHead.slice(0, encodedHead.length - 3);
        } else {
          throw err;
        }
      }
    }

    chunks.push(decodedHead);
    encodedValue = encodedValue.slice(encodedHead.length);
  }

  return chunks.map((chunkVal, i) => ({ name: `${key}.${i}`, value: chunkVal }));
}

export function readSupabaseCookieSessionFromEntries(
  allCookies: ReadonlyArray<{ name: string; value: string }>
): {
  hasCookie: boolean;
  storageKey: string;
  session: ParsedSupabaseCookieSession | null;
} {
  const storageKey = getSupabaseStorageKey();
  const cookieMap = new Map(allCookies.map((c) => [c.name, c.value]));

  const hasMatchingCookie = allCookies.some((c) =>
    isSupabaseAuthCookieName(c.name, storageKey)
  );

  let effectiveKey = storageKey;
  if (!cookieMap.has(storageKey) && !cookieMap.has(`${storageKey}.0`)) {
    const altAuthCookie = allCookies.find(
      (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
    );
    if (altAuthCookie) {
      const match = altAuthCookie.name.match(CHUNK_SUFFIX_REGEX);
      effectiveKey = match ? match[1] : altAuthCookie.name;
    }
  }

  let rawCombined = cookieMap.get(effectiveKey) ?? '';
  if (!rawCombined) {
    const parts: string[] = [];
    for (let i = 0; ; i++) {
      const chunkVal = cookieMap.get(`${effectiveKey}.${i}`);
      if (!chunkVal) break;
      parts.push(chunkVal);
    }
    rawCombined = parts.join('');
  }

  if (!rawCombined) {
    return {
      hasCookie: hasMatchingCookie,
      storageKey,
      session: null,
    };
  }

  try {
    const jsonText = rawCombined.startsWith(BASE64_COOKIE_PREFIX)
      ? Buffer.from(rawCombined.slice(BASE64_COOKIE_PREFIX.length), 'base64url').toString('utf8')
      : rawCombined;

    const parsed = JSON.parse(jsonText) as ParsedSupabaseCookieSession;
    if (!parsed || typeof parsed !== 'object') {
      return { hasCookie: true, storageKey, session: null };
    }
    return {
      hasCookie: true,
      storageKey,
      session: parsed,
    };
  } catch {
    return {
      hasCookie: true,
      storageKey,
      session: null,
    };
  }
}

export function readSupabaseCookieSession(req: NextRequest): {
  hasCookie: boolean;
  storageKey: string;
  session: ParsedSupabaseCookieSession | null;
} {
  return readSupabaseCookieSessionFromEntries(req.cookies.getAll());
}

export function buildSupabaseSessionCookies(
  req: NextRequest,
  session: unknown
): PendingCookie[] {
  const storageKey = getSupabaseStorageKey();
  const jsonPayload = JSON.stringify(session);
  const encodedPayload =
    BASE64_COOKIE_PREFIX + Buffer.from(jsonPayload, 'utf8').toString('base64url');
  const nextChunks = createCookieChunks(storageKey, encodedPayload);
  const nextChunkNames = new Set(nextChunks.map((c) => c.name));

  const cookiesToWrite: PendingCookie[] = [];

  // Clear any old/stale auth chunks not present in the new chunk set
  for (const existing of req.cookies.getAll()) {
    if (
      isSupabaseAuthCookieName(existing.name, storageKey) &&
      !nextChunkNames.has(existing.name)
    ) {
      cookiesToWrite.push({
        name: existing.name,
        value: '',
        options: { maxAge: 0 },
      });
    }
  }

  for (const chunk of nextChunks) {
    cookiesToWrite.push({
      name: chunk.name,
      value: chunk.value,
      options: { maxAge: 60 * 60 * 24 * 365 },
    });
  }

  return cookiesToWrite;
}

export function buildClearSupabaseAuthCookies(req: NextRequest): PendingCookie[] {
  const storageKey = getSupabaseStorageKey();
  const namesToClear = new Set<string>([storageKey]);

  for (const existing of req.cookies.getAll()) {
    if (isSupabaseAuthCookieName(existing.name, storageKey)) {
      namesToClear.add(existing.name);
    }
  }

  return Array.from(namesToClear).map((name) => ({
    name,
    value: '',
    options: { maxAge: 0 },
  }));
}

/**
 * Creates a request-scoped Supabase SSR client for Next.js Route Handlers.
 * Cookies mutated by Supabase Auth (login, token refresh, logout) are collected
 * into `pendingCookies` and attached with HttpOnly security attributes onto the
 * returned NextResponse via `applyPendingSupabaseCookies()`.
 */
export function createSupabaseRouteClient(
  req: NextRequest,
  options?: { ignoreIncomingCookies?: boolean }
) {
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
        return options?.ignoreIncomingCookies ? [] : req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options: cookieOpts } of cookiesToSet) {
          pendingCookies.push({ name, value, options: cookieOpts });
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
  if (!pendingCookies.length) return;
  const securityAttrs = resolveSupabaseCookieSecurity(req);

  for (const { name, value, options } of pendingCookies) {
    const isDelete = value === '' || options?.maxAge === 0;
    res.cookies.set({
      ...options,
      name,
      value,
      httpOnly: true,
      sameSite: securityAttrs.sameSite,
      secure: securityAttrs.secure,
      ...(securityAttrs.partitioned ? { partitioned: true } : {}),
      path: options?.path ?? securityAttrs.path,
      ...(isDelete ? { maxAge: 0 } : {}),
    });
  }
}
