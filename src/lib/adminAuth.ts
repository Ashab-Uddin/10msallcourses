import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

export const ADMIN_SESSION_COOKIE = '10ms_admin_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

export interface AdminSessionPayload {
  email: string;
  name: string;
  role: 'admin';
  iat: number;
  exp: number;
}

// Ephemeral fallback secret for local development only (never hardcoded static string).
const DEV_EPHEMERAL_SECRET = crypto
  .createHash('sha256')
  .update(`10ms-local-dev:${process.cwd()}:${process.env.ADMIN_EMAIL || 'local'}`)
  .digest('hex');

function getSessionSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }

  // On Vercel production, derive a deployment-scoped secret if ADMIN_SESSION_SECRET is missing
  // while ADMIN_PASSWORD is set, and log a warning so the owner configures ADMIN_SESSION_SECRET.
  const passSeed = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH || '';
  if (process.env.VERCEL === '1' && passSeed) {
    console.warn(
      '[adminAuth] ADMIN_SESSION_SECRET is not set. Set a 32+ character ADMIN_SESSION_SECRET in Vercel Environment Variables.'
    );
    return crypto
      .createHash('sha256')
      .update(`${passSeed}:${process.env.VERCEL_PROJECT_ID || 'vercel'}:${process.env.ADMIN_EMAIL || ''}`)
      .digest('hex');
  }

  return DEV_EPHEMERAL_SECRET;
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

export function verifyAdminCredentials(
  emailInput: string,
  passwordInput: string
):
  | { ok: true; email: string; name: string }
  | { ok: false; error: string; status: number } {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput;

  if (!cleanEmail || !cleanPass) {
    return {
      ok: false,
      error: 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।',
      status: 400,
    };
  }

  const envEmailRaw = process.env.ADMIN_EMAIL?.trim() || '';
  const envPassword = process.env.ADMIN_PASSWORD?.trim() || '';
  const envPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || '';
  const envAdminName = process.env.ADMIN_NAME?.trim() || 'Site Admin';

  const hasEnvCredentials = Boolean(envEmailRaw && (envPassword || envPasswordHash));

  if (hasEnvCredentials) {
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

    if (emailMatched && passwordMatched) {
      return {
        ok: true,
        email: cleanEmail,
        name: envAdminName,
      };
    }

    return {
      ok: false,
      error: 'ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক অ্যাডমিন ক্রেডেনশিয়াল দিন।',
      status: 401,
    };
  }

  // On Vercel production, never allow fallback demo credentials.
  if (process.env.VERCEL === '1' || process.env.REQUIRE_ENV_ADMIN_AUTH === 'true') {
    console.error(
      '[adminAuth] Missing ADMIN_EMAIL and ADMIN_PASSWORD environment variables in production.'
    );
    return {
      ok: false,
      error:
        'অ্যাডমিন অথেনটিকেশন কনফিগার করা হয়নি। Vercel Environment Variables-এ ADMIN_EMAIL, ADMIN_PASSWORD এবং ADMIN_SESSION_SECRET সেট করুন।',
      status: 503,
    };
  }

  // Local development / preview mode fallback (still uses real signed HMAC-SHA256 sessions).
  const isLocalAdmin =
    (timingSafeTextEqual(cleanEmail, 'ashabuddin2274@gmail.com') ||
      timingSafeTextEqual(cleanEmail, 'admin@10ms.com')) &&
    timingSafeTextEqual(cleanPass, 'admin123');

  if (isLocalAdmin) {
    return {
      ok: true,
      email: cleanEmail,
      name: cleanEmail === 'ashabuddin2274@gmail.com' ? 'Ashab Uddin' : 'Site Admin',
    };
  }

  return {
    ok: false,
    error: 'ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে সঠিক ক্রেডেনশিয়াল দিন।',
    status: 401,
  };
}

export function createAdminSessionToken(email: string, name: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    name: name.trim() || 'Site Admin',
    role: 'admin',
    iat: nowSec,
    exp: nowSec + SESSION_TTL_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`v1.${encodedPayload}`)
    .digest('base64url');

  return `v1.${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    return null;
  }

  const [, encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`v1.${encodedPayload}`)
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
      decoded.role !== 'admin' ||
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

export function extractAdminToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice('Bearer '.length).trim();
    if (bearer) return bearer;
  }

  const cookieToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim();
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export function isSameOriginMutation(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const origin = req.headers.get('origin');
  if (!origin) {
    return true;
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = (
      req.headers.get('x-forwarded-host') ||
      req.headers.get('host') ||
      ''
    )
      .split(',')[0]
      ?.trim()
      .toLowerCase();

    if (!requestHost) return true;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

export function getAuthenticatedAdmin(req: NextRequest): AdminSessionPayload | null {
  if (!isSameOriginMutation(req)) {
    return null;
  }
  const token = extractAdminToken(req);
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export function isAuthorizedAdminRequest(req: NextRequest): boolean {
  return Boolean(getAuthenticatedAdmin(req));
}

export function setAdminSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
