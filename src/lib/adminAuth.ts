import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from './csrf.ts';
import { isSupabaseAuthReady } from './supabase/config.ts';
import { getSupabaseAdminClient } from './supabase/admin.ts';
import {
  applyPendingSupabaseCookies,
  createSupabaseRouteClient,
  type PendingCookie,
} from './supabase/server.ts';

export { isSameOriginMutation };
export const ADMIN_SESSION_COOKIE = '10ms_admin_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

export function isProductionAuthStrict(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

export interface AdminSessionPayload {
  userId?: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  provider: 'supabase' | 'env-cookie';
  iat: number;
  exp: number;
}

export type AdminLoginResult =
  | {
      ok: true;
      admin: AdminSessionPayload;
      applySessionCookies: (res: NextResponse) => void;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

function getEnvSessionSecret(): string | null {
  if (isProductionAuthStrict()) {
    return null;
  }

  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }

  // Only allow derived secret in non-production local dev when env admin credentials are explicitly set
  const passSeed = process.env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_PASSWORD_HASH?.trim() || '';
  if (passSeed) {
    return crypto
      .createHash('sha256')
      .update(`${passSeed}:${process.cwd()}:${process.env.ADMIN_EMAIL || ''}`)
      .digest('hex');
  }

  return null;
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function verifyPasswordAgainstHash(password: string, storedHash: string): boolean {
  const trimmed = storedHash.trim();
  if (trimmed.startsWith('sha256:')) {
    const expectedHex = trimmed.slice('sha256:'.length).trim().toLowerCase();
    const actualHex = crypto.createHash('sha256').update(password).digest('hex');
    return timingSafeTextEqual(actualHex, expectedHex);
  }
  if (trimmed.startsWith('scrypt:')) {
    const parts = trimmed.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    try {
      const derived = crypto.scryptSync(password, salt, 64).toString('hex');
      return timingSafeTextEqual(derived, expectedHex.toLowerCase());
    } catch {
      return false;
    }
  }
  return false;
}

function createEnvSessionToken(email: string, name: string): {
  token: string;
  payload: AdminSessionPayload;
} | null {
  const secret = getEnvSessionSecret();
  if (!secret) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    name: name.trim() || 'Site Admin',
    role: 'admin',
    provider: 'env-cookie',
    iat: nowSec,
    exp: nowSec + SESSION_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`v2.${encodedPayload}`)
    .digest('base64url');

  return { token: `v2.${encodedPayload}.${signature}`, payload };
}

function verifyEnvSessionToken(token: string): AdminSessionPayload | null {
  const secret = getEnvSessionSecret();
  if (!secret || !token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'v2') {
    return null;
  }

  const [, encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`v2.${encodedPayload}`)
    .digest('base64url');

  const sigBufA = Buffer.from(providedSig, 'utf-8');
  const sigBufB = Buffer.from(expectedSig, 'utf-8');
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as AdminSessionPayload;

    if (
      !decoded ||
      (decoded.role !== 'admin' && decoded.role !== 'super_admin') ||
      typeof decoded.email !== 'string' ||
      typeof decoded.exp !== 'number'
    ) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

// Same-origin CSRF validation is imported & re-exported from ./csrf.ts (Edge & Node compatible).

function resolveAdminCookieOptions(req?: NextRequest): {
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
    // Non-Vercel HTTPS preview (e.g. AI Studio iframe) needs SameSite=None; Secure; Partitioned
    // so browsers reliably send the HttpOnly session cookie across iframe requests.
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

export function setAdminSessionCookie(
  res: NextResponse,
  token: string,
  req?: NextRequest
): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    ...resolveAdminCookieOptions(req),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(res: NextResponse, req?: NextRequest): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    ...resolveAdminCookieOptions(req),
    maxAge: 0,
  });
}

async function lookupActiveAdminAllowlist(userId: string): Promise<{
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'super_admin';
} | null> {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('admin_users')
    .select('user_id, email, display_name, role, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (data.role !== 'admin' && data.role !== 'super_admin') {
    return null;
  }

  return {
    userId: String(data.user_id),
    email: String(data.email),
    displayName: String(data.display_name || 'Site Admin'),
    role: data.role,
  };
}

/**
 * Authenticates an admin login request.
 * 1) Production / Supabase Mode: signs in via Supabase Auth (`signInWithPassword`)
 *    and verifies an active allowlist record in `public.admin_users`.
 * 2) Local Dev Fallback Mode (when Supabase is NOT configured yet): verifies against
 *    explicitly configured `ADMIN_EMAIL` + `ADMIN_PASSWORD`/`ADMIN_PASSWORD_HASH` env vars.
 * Zero hardcoded fallback passwords exist anywhere in the codebase.
 */
export async function authenticateAdminLogin(
  req: NextRequest,
  emailInput: string,
  passwordInput: string
): Promise<AdminLoginResult> {
  if (!isSameOriginMutation(req)) {
    return {
      ok: false,
      error: 'Cross-site login request blocked by CSRF protection.',
      status: 403,
    };
  }

  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput;

  if (!cleanEmail || !cleanPass) {
    return {
      ok: false,
      error: 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।',
      status: 400,
    };
  }

  // 1. Primary Production Mode: Supabase Auth + public.admin_users allowlist
  if (isSupabaseAuthReady()) {
    const { supabase, pendingCookies } = createSupabaseRouteClient(req);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error || !data.user) {
      return {
        ok: false,
        error: 'ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক অ্যাডমিন ক্রেডেনশিয়াল দিন।',
        status: 401,
      };
    }

    const adminRecord = await lookupActiveAdminAllowlist(data.user.id);
    if (!adminRecord) {
      await supabase.auth.signOut().catch(() => {});
      return {
        ok: false,
        error:
          'এই অ্যাকাউন্টটি সক্রিয় অ্যাডমিন হিসেবে অনুমোদিত নয়। অনুগ্রহ করে `public.admin_users` টেবিলে অ্যাডমিন অনুমোদন নিশ্চিত করুন।',
        status: 403,
      };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const sessionExp = data.session?.expires_at ?? nowSec + SESSION_TTL_SECONDS;
    const adminPayload: AdminSessionPayload = {
      userId: adminRecord.userId,
      email: adminRecord.email,
      name: adminRecord.displayName,
      role: adminRecord.role,
      provider: 'supabase',
      iat: nowSec,
      exp: sessionExp,
    };

    return {
      ok: true,
      admin: adminPayload,
      applySessionCookies: (res: NextResponse) => {
        if (req.cookies.has(ADMIN_SESSION_COOKIE)) {
          clearAdminSessionCookie(res, req);
        }
        applyPendingSupabaseCookies(res, pendingCookies, req);
      },
    };
  }

  // 2. Non-Supabase Env Credentials Mode (strictly forbidden in Production/Vercel)
  if (isProductionAuthStrict()) {
    console.error(
      '[adminAuth] Production runtime requires Supabase Auth (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`). Legacy env login is disabled.'
    );
    return {
      ok: false,
      error:
        'Production পরিবেশে Supabase Auth এবং `public.admin_users` বাধ্যতামূলক। এনভায়রনমেন্ট ভ্যারিয়েবল যাচাই করুন।',
      status: 503,
    };
  }

  const envEmailRaw = process.env.ADMIN_EMAIL?.trim() || '';
  const envPassword = process.env.ADMIN_PASSWORD?.trim() || '';
  const envPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || '';
  const envAdminName = process.env.ADMIN_NAME?.trim() || 'Site Admin';

  const hasEnvCredentials = Boolean(envEmailRaw && (envPassword || envPasswordHash));

  if (!hasEnvCredentials) {
    console.error(
      '[adminAuth] Neither Supabase Auth nor ADMIN_EMAIL/ADMIN_PASSWORD env credentials are configured.'
    );
    return {
      ok: false,
      error:
        'অ্যাডমিন অথেনটিকেশন কনফিগার করা হয়নি। Supabase Auth (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) অথবা লোকাল ডেভের জন্য `ADMIN_EMAIL` ও `ADMIN_PASSWORD` সেট করুন।',
      status: 503,
    };
  }

  const allowedEmails = envEmailRaw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const emailMatched = allowedEmails.some((allowed) =>
    timingSafeTextEqual(cleanEmail, allowed)
  );
  const passwordMatched = envPasswordHash
    ? verifyPasswordAgainstHash(cleanPass, envPasswordHash)
    : timingSafeTextEqual(cleanPass, envPassword);

  if (!emailMatched || !passwordMatched) {
    return {
      ok: false,
      error: 'ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক অ্যাডমিন ক্রেডেনশিয়াল দিন।',
      status: 401,
    };
  }

  const created = createEnvSessionToken(cleanEmail, envAdminName);
  if (!created) {
    return {
      ok: false,
      error:
        'সেশন সিক্রেট কনফিগার করা নেই। Environment Variables-এ `ADMIN_SESSION_SECRET` (কমপক্ষে ৩২ অক্ষর) সেট করুন।',
      status: 503,
    };
  }

  return {
    ok: true,
    admin: created.payload,
    applySessionCookies: (res: NextResponse) => {
      setAdminSessionCookie(res, created.token, req);
    },
  };
}

export async function getAuthenticatedAdminWithCookies(req: NextRequest): Promise<{
  admin: AdminSessionPayload | null;
  pendingCookies: PendingCookie[];
}> {
  if (!isSameOriginMutation(req)) {
    return { admin: null, pendingCookies: [] };
  }

  // 1. Supabase Auth SSR cookie verification (server-verified getUser() + active admin_users check)
  if (isSupabaseAuthReady()) {
    try {
      const { supabase, pendingCookies } = createSupabaseRouteClient(req);
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        return { admin: null, pendingCookies };
      }

      const adminRecord = await lookupActiveAdminAllowlist(data.user.id);
      if (!adminRecord) {
        return { admin: null, pendingCookies };
      }

      const nowSec = Math.floor(Date.now() / 1000);
      return {
        admin: {
          userId: adminRecord.userId,
          email: adminRecord.email,
          name: adminRecord.displayName,
          role: adminRecord.role,
          provider: 'supabase',
          iat: nowSec,
          exp: nowSec + SESSION_TTL_SECONDS,
        },
        pendingCookies,
      };
    } catch (err) {
      console.error('[adminAuth] Supabase session verification failed:', err);
      return { admin: null, pendingCookies: [] };
    }
  }

  // 2. Env-signed HttpOnly cookie session verification (non-production local dev fallback ONLY)
  if (isProductionAuthStrict()) {
    return { admin: null, pendingCookies: [] };
  }

  const cookieToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim();
  if (!cookieToken) {
    return { admin: null, pendingCookies: [] };
  }

  const verified = verifyEnvSessionToken(cookieToken);
  return { admin: verified, pendingCookies: [] };
}

export async function getAuthenticatedAdmin(
  req: NextRequest
): Promise<AdminSessionPayload | null> {
  const { admin } = await getAuthenticatedAdminWithCookies(req);
  return admin;
}

export async function isAuthorizedAdminRequest(req: NextRequest): Promise<boolean> {
  const admin = await getAuthenticatedAdmin(req);
  return Boolean(admin);
}

export async function signOutAdminSession(
  req: NextRequest,
  res: NextResponse
): Promise<void> {
  clearAdminSessionCookie(res, req);
  if (isSupabaseAuthReady()) {
    try {
      const { supabase, pendingCookies } = createSupabaseRouteClient(req);
      await supabase.auth.signOut();
      applyPendingSupabaseCookies(res, pendingCookies, req);
    } catch (err) {
      console.warn('[adminAuth] Supabase signOut warning:', err);
    }
  }
}

export async function updateAdminDisplayName(
  req: NextRequest,
  admin: AdminSessionPayload,
  nextNameInput: string
): Promise<
  | {
      ok: true;
      name: string;
      applySessionCookies?: (res: NextResponse) => void;
    }
  | {
      ok: false;
      error: string;
      status: number;
    }
> {
  const cleanName = nextNameInput.trim().slice(0, 120);
  if (!cleanName) {
    return {
      ok: false,
      error: 'অ্যাডমিনের নাম খালি রাখা যাবে না।',
      status: 400,
    };
  }

  if (admin.provider === 'supabase' && admin.userId && isSupabaseAuthReady()) {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('admin_users')
      .update({
        display_name: cleanName,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', admin.userId)
      .eq('is_active', true)
      .select('display_name')
      .maybeSingle();

    if (error || !data) {
      console.error('[adminAuth] Failed to update admin display_name:', error);
      return {
        ok: false,
        error: 'অ্যাডমিনের নাম আপডেট করা যায়নি।',
        status: 500,
      };
    }

    return {
      ok: true,
      name: String(data.display_name || cleanName),
    };
  }

  if (admin.provider === 'env-cookie') {
    const created = createEnvSessionToken(admin.email, cleanName);
    if (!created) {
      return {
        ok: true,
        name: cleanName,
      };
    }

    return {
      ok: true,
      name: created.payload.name,
      applySessionCookies: (res: NextResponse) => {
        setAdminSessionCookie(res, created.token, req);
      },
    };
  }

  return {
    ok: true,
    name: cleanName,
  };
}

