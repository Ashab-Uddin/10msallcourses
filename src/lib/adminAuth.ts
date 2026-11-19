import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from './csrf.ts';
import { getSupabaseUrl, isSupabaseAuthReady } from './supabase/config.ts';
import { getSupabaseAdminClient } from './supabase/admin.ts';
import {
  applyPendingSupabaseCookies,
  buildClearSupabaseAuthCookies,
  buildSupabaseSessionCookies,
  createSupabaseStatelessAuthClient,
  readSupabaseCookieSession,
  readSupabaseCookieSessionFromEntries,
  type PendingCookie,
} from './supabase/server.ts';

export { isSameOriginMutation };
export const ADMIN_SESSION_COOKIE = '10ms_admin_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 90 * 1000; // Refresh within 90s of expiry
const REFRESH_DEDUP_TTL_MS = 25 * 1000; // Reuse rotated session across concurrent requests for 25s
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const JWKS_FORCE_REFRESH_COOLDOWN_MS = 15 * 1000; // 15 seconds between forced kid-miss refetches
const ADMIN_ALLOWLIST_CACHE_TTL_MS = 30 * 1000; // 30s active allowlist cache (invalidated immediately on logout/profile update)

interface RefreshSessionOutcome {
  ok: boolean;
  userId?: string;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
    token_type?: string;
    user?: unknown;
  };
}

const inFlightRefreshes = new Map<string, Promise<RefreshSessionOutcome>>();
const recentRefreshOutcomes = new Map<
  string,
  { outcome: RefreshSessionOutcome; cachedAt: number }
>();

interface ActiveAdminRecord {
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'super_admin';
}

const activeAdminAllowlistCache = new Map<
  string,
  { record: ActiveAdminRecord; cachedAt: number }
>();

// Tracks explicitly logged-out access tokens until their natural exp so local JWT
// verification rejects signed-out tokens immediately with zero DB round-trip.
const revokedAccessTokenHashes = new Map<string, number>();

interface CachedJwksState {
  url: string;
  keysByKid: Map<string, crypto.KeyObject>;
  fallbackKeys: crypto.KeyObject[];
  fetchedAt: number;
}

let cachedJwks: CachedJwksState | null = null;
let inFlightJwksFetch: Promise<CachedJwksState | null> | null = null;
let lastForcedJwksFetchAt = 0;

function hashTokenValue(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashRefreshToken(refreshToken: string): string {
  return hashTokenValue(refreshToken);
}

function markAccessTokenRevoked(accessToken: string, expiresAtSec?: number): void {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec =
    typeof expiresAtSec === 'number' && expiresAtSec > nowSec
      ? expiresAtSec
      : nowSec + 3600;
  if (revokedAccessTokenHashes.size > 200) {
    for (const [k, exp] of revokedAccessTokenHashes) {
      if (exp <= nowSec) revokedAccessTokenHashes.delete(k);
    }
  }
  revokedAccessTokenHashes.set(hashTokenValue(accessToken), expSec);
}

function isAccessTokenLocallyRevoked(accessToken: string): boolean {
  if (revokedAccessTokenHashes.size === 0) return false;
  const key = hashTokenValue(accessToken);
  const expSec = revokedAccessTokenHashes.get(key);
  if (expSec === undefined) return false;
  if (expSec <= Math.floor(Date.now() / 1000)) {
    revokedAccessTokenHashes.delete(key);
    return false;
  }
  return true;
}

function invalidateAdminAllowlistCache(userId?: string): void {
  if (userId) {
    activeAdminAllowlistCache.delete(userId);
  } else {
    activeAdminAllowlistCache.clear();
  }
}

async function fetchSupabaseJwks(forceRefresh = false): Promise<CachedJwksState | null> {
  const baseUrl = getSupabaseUrl().replace(/\/+$/, '');
  if (!baseUrl) return null;

  const now = Date.now();
  if (
    !forceRefresh &&
    cachedJwks &&
    cachedJwks.url === baseUrl &&
    now - cachedJwks.fetchedAt < JWKS_CACHE_TTL_MS
  ) {
    return cachedJwks;
  }

  if (forceRefresh && now - lastForcedJwksFetchAt < JWKS_FORCE_REFRESH_COOLDOWN_MS) {
    return cachedJwks && cachedJwks.url === baseUrl ? cachedJwks : null;
  }

  if (inFlightJwksFetch) {
    return inFlightJwksFetch;
  }

  if (forceRefresh) {
    lastForcedJwksFetchAt = now;
  }

  const fetchPromise = (async (): Promise<CachedJwksState | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${baseUrl}/auth/v1/.well-known/jwks.json`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        return cachedJwks && cachedJwks.url === baseUrl ? cachedJwks : null;
      }

      const json = (await res.json()) as { keys?: Array<Record<string, unknown>> };
      const rawKeys = Array.isArray(json?.keys) ? json.keys : [];
      const keysByKid = new Map<string, crypto.KeyObject>();
      const fallbackKeys: crypto.KeyObject[] = [];

      for (const jwk of rawKeys) {
        if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') continue;
        try {
          const keyObj = crypto.createPublicKey({
            key: jwk as unknown as crypto.JsonWebKey,
            format: 'jwk',
          });
          if (typeof jwk.kid === 'string' && jwk.kid.trim()) {
            keysByKid.set(jwk.kid.trim(), keyObj);
          }
          fallbackKeys.push(keyObj);
        } catch {
          // Ignore malformed individual JWK entries
        }
      }

      if (fallbackKeys.length === 0) {
        return null;
      }

      cachedJwks = {
        url: baseUrl,
        keysByKid,
        fallbackKeys,
        fetchedAt: Date.now(),
      };
      return cachedJwks;
    } catch {
      return cachedJwks && cachedJwks.url === baseUrl ? cachedJwks : null;
    } finally {
      inFlightJwksFetch = null;
    }
  })();

  inFlightJwksFetch = fetchPromise;
  return fetchPromise;
}

type LocalJwtVerifyOutcome =
  | { status: 'valid'; userId: string; exp: number }
  | { status: 'invalid' }
  | { status: 'unsupported' };

async function verifySupabaseAccessTokenLocally(
  accessToken: string
): Promise<LocalJwtVerifyOutcome> {
  if (!accessToken || typeof accessToken !== 'string') {
    return { status: 'invalid' };
  }

  if (isAccessTokenLocallyRevoked(accessToken)) {
    return { status: 'invalid' };
  }

  const parts = accessToken.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return { status: 'invalid' };
  }

  let header: { alg?: unknown; kid?: unknown };
  let payload: {
    sub?: unknown;
    exp?: unknown;
    nbf?: unknown;
    iss?: unknown;
    aud?: unknown;
  };
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { status: 'invalid' };
  }

  // Only locally verify asymmetric ES256 tokens; non-ES256 tokens fall back cleanly to GoTrue getUser()
  if (header?.alg !== 'ES256') {
    return { status: 'unsupported' };
  }

  const baseUrl = getSupabaseUrl().replace(/\/+$/, '');
  const expectedIssuer = `${baseUrl}/auth/v1`;
  const userId = typeof payload?.sub === 'string' ? payload.sub.trim() : '';
  const exp = typeof payload?.exp === 'number' ? payload.exp : 0;
  const nbf = typeof payload?.nbf === 'number' ? payload.nbf : 0;
  const nowSec = Math.floor(Date.now() / 1000);

  if (!userId || exp <= nowSec) {
    return { status: 'invalid' };
  }
  if (nbf > 0 && nbf > nowSec + 30) {
    return { status: 'invalid' };
  }
  if (typeof payload?.iss !== 'string' || payload.iss.replace(/\/+$/, '') !== expectedIssuer) {
    return { status: 'invalid' };
  }
  const audMatches =
    payload?.aud === 'authenticated' ||
    (Array.isArray(payload?.aud) && payload.aud.includes('authenticated'));
  if (!audMatches) {
    return { status: 'invalid' };
  }

  const kid = typeof header?.kid === 'string' ? header.kid.trim() : '';
  let jwks = await fetchSupabaseJwks(false);
  if (jwks && kid && !jwks.keysByKid.has(kid)) {
    jwks = await fetchSupabaseJwks(true);
  }
  if (!jwks) {
    return { status: 'unsupported' };
  }

  const candidates =
    kid && jwks.keysByKid.has(kid)
      ? [jwks.keysByKid.get(kid)!]
      : jwks.fallbackKeys;
  if (candidates.length === 0) {
    return { status: 'unsupported' };
  }

  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
  const signature = Buffer.from(parts[2], 'base64url');
  if (signature.length === 0) {
    return { status: 'invalid' };
  }

  for (const pubKey of candidates) {
    try {
      const ok = crypto.verify(
        'sha256',
        signingInput,
        { key: pubKey, dsaEncoding: 'ieee-p1363' },
        signature
      );
      if (ok) {
        return { status: 'valid', userId, exp };
      }
    } catch {
      // Try next candidate key if multiple exist
    }
  }

  return { status: 'invalid' };
}

async function verifySupabaseAccessToken(accessToken: string): Promise<{
  userId: string;
  exp?: number;
} | null> {
  const localResult = await verifySupabaseAccessTokenLocally(accessToken);
  if (localResult.status === 'valid') {
    return { userId: localResult.userId, exp: localResult.exp };
  }
  if (localResult.status === 'invalid') {
    return null;
  }

  // Fallback to Supabase Auth GoTrue verification when token is non-ES256 or JWKS is unavailable
  const stateless = createSupabaseStatelessAuthClient();
  const { data, error } = await stateless.auth.getUser(accessToken);
  if (!error && data.user) {
    return { userId: data.user.id };
  }
  return null;
}

async function singleFlightRefreshSession(
  refreshToken: string
): Promise<RefreshSessionOutcome> {
  const tokenKey = hashRefreshToken(refreshToken);
  const now = Date.now();

  const recent = recentRefreshOutcomes.get(tokenKey);
  if (recent && now - recent.cachedAt < REFRESH_DEDUP_TTL_MS) {
    return recent.outcome;
  }

  const existingInFlight = inFlightRefreshes.get(tokenKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const refreshPromise = (async (): Promise<RefreshSessionOutcome> => {
    try {
      const supabase = createSupabaseStatelessAuthClient();
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session || !data.user) {
        const failed: RefreshSessionOutcome = { ok: false };
        recentRefreshOutcomes.set(tokenKey, { outcome: failed, cachedAt: Date.now() });
        return failed;
      }

      const succeeded: RefreshSessionOutcome = {
        ok: true,
        userId: data.user.id,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
          user: data.user,
        },
      };

      // Cache briefly so parallel AdminDashboard API requests using the same incoming
      // cookie don't race against the single-use rotated refresh token.
      if (recentRefreshOutcomes.size > 100) {
        const cutoff = Date.now() - REFRESH_DEDUP_TTL_MS;
        for (const [k, v] of recentRefreshOutcomes) {
          if (v.cachedAt < cutoff) recentRefreshOutcomes.delete(k);
        }
      }
      recentRefreshOutcomes.set(tokenKey, { outcome: succeeded, cachedAt: Date.now() });
      return succeeded;
    } catch {
      return { ok: false };
    } finally {
      inFlightRefreshes.delete(tokenKey);
    }
  })();

  inFlightRefreshes.set(tokenKey, refreshPromise);
  return refreshPromise;
}

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

async function lookupActiveAdminAllowlist(
  userId: string,
  options?: { forceFresh?: boolean }
): Promise<ActiveAdminRecord | null> {
  const now = Date.now();
  if (!options?.forceFresh) {
    const cached = activeAdminAllowlistCache.get(userId);
    if (cached && now - cached.cachedAt < ADMIN_ALLOWLIST_CACHE_TTL_MS) {
      return cached.record;
    }
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('admin_users')
    .select('user_id, email, display_name, role, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    activeAdminAllowlistCache.delete(userId);
    return null;
  }

  if (data.role !== 'admin' && data.role !== 'super_admin') {
    activeAdminAllowlistCache.delete(userId);
    return null;
  }

  const record: ActiveAdminRecord = {
    userId: String(data.user_id),
    email: String(data.email),
    displayName: String(data.display_name || 'Site Admin'),
    role: data.role,
  };

  if (activeAdminAllowlistCache.size > 100) {
    const cutoff = now - ADMIN_ALLOWLIST_CACHE_TTL_MS;
    for (const [k, v] of activeAdminAllowlistCache) {
      if (v.cachedAt < cutoff) activeAdminAllowlistCache.delete(k);
    }
  }
  activeAdminAllowlistCache.set(userId, { record, cachedAt: Date.now() });

  return record;
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
    const supabase = createSupabaseStatelessAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error || !data.user || !data.session) {
      return {
        ok: false,
        error: 'ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক অ্যাডমিন ক্রেডেনশিয়াল দিন।',
        status: 401,
      };
    }

    // Pre-warm JWKS in parallel with the live allowlist lookup so post-login requests verify in <1ms
    const [adminRecord] = await Promise.all([
      lookupActiveAdminAllowlist(data.user.id, { forceFresh: true }),
      fetchSupabaseJwks(false).catch(() => null),
    ]);
    if (!adminRecord) {
      await getSupabaseAdminClient()
        .auth.admin.signOut(data.session.access_token)
        .catch(() => {});
      return {
        ok: false,
        error:
          'এই অ্যাকাউন্টটি সক্রিয় অ্যাডমিন হিসেবে অনুমোদিত নয়। অনুগ্রহ করে `public.admin_users` টেবিলে অ্যাডমিন অনুমোদন নিশ্চিত করুন।',
        status: 403,
      };
    }

    const pendingCookies = buildSupabaseSessionCookies(req, data.session);
    const nowSec = Math.floor(Date.now() / 1000);
    const sessionExp = data.session.expires_at ?? nowSec + SESSION_TTL_SECONDS;
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

  // 1. Supabase Auth cookie verification (explicit JWT verification + single-flight refresh)
  if (isSupabaseAuthReady()) {
    try {
      const { hasCookie, session } = readSupabaseCookieSession(req);
      if (!hasCookie) {
        return { admin: null, pendingCookies: [] };
      }

      if (!session || !session.access_token) {
        return {
          admin: null,
          pendingCookies: buildClearSupabaseAuthCookies(req),
        };
      }

      const expiresAtMs =
        typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0;
      const needsRefresh =
        expiresAtMs > 0 && expiresAtMs - Date.now() <= ACCESS_TOKEN_REFRESH_MARGIN_MS;

      let verifiedUserId: string | null = null;
      let verifiedExp =
        typeof session.expires_at === 'number'
          ? session.expires_at
          : Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
      let pendingCookies: PendingCookie[] = [];

      if (!needsRefresh) {
        const verified = await verifySupabaseAccessToken(session.access_token);
        if (verified) {
          verifiedUserId = verified.userId;
          if (typeof verified.exp === 'number') {
            verifiedExp = verified.exp;
          }
        }
      }

      if (!verifiedUserId) {
        if (!session.refresh_token) {
          return {
            admin: null,
            pendingCookies: buildClearSupabaseAuthCookies(req),
          };
        }

        const refreshed = await singleFlightRefreshSession(session.refresh_token);
        if (!refreshed.ok || !refreshed.userId || !refreshed.session) {
          return {
            admin: null,
            pendingCookies: buildClearSupabaseAuthCookies(req),
          };
        }

        verifiedUserId = refreshed.userId;
        verifiedExp =
          refreshed.session.expires_at ??
          Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
        pendingCookies = buildSupabaseSessionCookies(req, refreshed.session);
      }

      const adminRecord = await lookupActiveAdminAllowlist(verifiedUserId);
      if (!adminRecord) {
        return {
          admin: null,
          pendingCookies: buildClearSupabaseAuthCookies(req),
        };
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
          exp: verifiedExp,
        },
        pendingCookies,
      };
    } catch (err) {
      console.error('[adminAuth] Supabase session verification failed:', err);
      return {
        admin: null,
        pendingCookies: buildClearSupabaseAuthCookies(req),
      };
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

export async function authorizeAdminRequest(req: NextRequest): Promise<
  | {
      ok: true;
      admin: AdminSessionPayload;
      withSessionCookies: (res: NextResponse) => NextResponse;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const { admin, pendingCookies } = await getAuthenticatedAdminWithCookies(req);
  const withSessionCookies = (res: NextResponse): NextResponse => {
    applyPendingSupabaseCookies(res, pendingCookies, req);
    return res;
  };

  if (!admin) {
    const response = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
    applyPendingSupabaseCookies(response, pendingCookies, req);
    return { ok: false, response };
  }

  return { ok: true, admin, withSessionCookies };
}

export type ServerAdminAuthState =
  | { status: 'authenticated'; admin: AdminSessionPayload }
  | { status: 'needs_refresh' }
  | { status: 'unauthenticated' };

/**
 * Read-only session verification for Next.js Server Components (`app/admin/[[...slug]]/page.tsx`).
 * Never mutates cookies directly; returns `needs_refresh` if an expired/expiring session
 * holds a refresh token so the client can invoke `/api/admin/session` once to rotate cookies.
 */
export async function getServerAuthenticatedAdminFromCookieEntries(
  cookieEntries: ReadonlyArray<{ name: string; value: string }>
): Promise<ServerAdminAuthState> {
  if (isSupabaseAuthReady()) {
    try {
      const { hasCookie, session } = readSupabaseCookieSessionFromEntries(cookieEntries);
      if (!hasCookie || !session || !session.access_token) {
        return { status: 'unauthenticated' };
      }

      const expiresAtMs =
        typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0;
      const needsRefresh =
        expiresAtMs > 0 && expiresAtMs - Date.now() <= ACCESS_TOKEN_REFRESH_MARGIN_MS;

      if (needsRefresh) {
        return session.refresh_token
          ? { status: 'needs_refresh' }
          : { status: 'unauthenticated' };
      }

      const verified = await verifySupabaseAccessToken(session.access_token);
      if (!verified) {
        return session.refresh_token
          ? { status: 'needs_refresh' }
          : { status: 'unauthenticated' };
      }

      const adminRecord = await lookupActiveAdminAllowlist(verified.userId);
      if (!adminRecord) {
        return { status: 'unauthenticated' };
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const verifiedExp =
        typeof verified.exp === 'number'
          ? verified.exp
          : typeof session.expires_at === 'number'
          ? session.expires_at
          : nowSec + SESSION_TTL_SECONDS;

      return {
        status: 'authenticated',
        admin: {
          userId: adminRecord.userId,
          email: adminRecord.email,
          name: adminRecord.displayName,
          role: adminRecord.role,
          provider: 'supabase',
          iat: nowSec,
          exp: verifiedExp,
        },
      };
    } catch {
      return { status: 'unauthenticated' };
    }
  }

  if (isProductionAuthStrict()) {
    return { status: 'unauthenticated' };
  }

  const cookieToken = cookieEntries
    .find((c) => c.name === ADMIN_SESSION_COOKIE)
    ?.value?.trim();
  if (!cookieToken) {
    return { status: 'unauthenticated' };
  }

  const verified = verifyEnvSessionToken(cookieToken);
  return verified
    ? { status: 'authenticated', admin: verified }
    : { status: 'unauthenticated' };
}

export async function signOutAdminSession(
  req: NextRequest,
  res: NextResponse
): Promise<void> {
  clearAdminSessionCookie(res, req);
  if (isSupabaseAuthReady()) {
    try {
      const { session } = readSupabaseCookieSession(req);
      if (session?.access_token) {
        markAccessTokenRevoked(session.access_token, session.expires_at);
        const userObj = session.user as { id?: unknown } | undefined;
        if (typeof userObj?.id === 'string' && userObj.id) {
          invalidateAdminAllowlistCache(userObj.id);
        } else {
          invalidateAdminAllowlistCache();
        }
        await getSupabaseAdminClient()
          .auth.admin.signOut(session.access_token)
          .catch(() => {});
      }
      applyPendingSupabaseCookies(res, buildClearSupabaseAuthCookies(req), req);
    } catch (err) {
      console.warn('[adminAuth] Supabase signOut warning:', err);
      applyPendingSupabaseCookies(res, buildClearSupabaseAuthCookies(req), req);
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

    const nextDisplayName = String(data.display_name || cleanName);
    invalidateAdminAllowlistCache(admin.userId);
    return {
      ok: true,
      name: nextDisplayName,
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

