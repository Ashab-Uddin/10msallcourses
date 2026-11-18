// Server/client safe configuration helpers for Supabase PostgreSQL & Auth.
// NEVER expose SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY to client code.

import fs from 'fs';
import path from 'path';

interface EnvLocalCache {
  mtimeMs: number;
  values: Record<string, string>;
}

let cachedEnvLocal: EnvLocalCache | null = null;

function isPlaceholderConfigValue(val: string): boolean {
  const lower = val.trim().toLowerCase();
  if (!lower) return true;
  return (
    lower.includes('your-') ||
    lower.includes('your_') ||
    lower.includes('placeholder') ||
    lower.includes('example.com') ||
    lower.includes('example.org') ||
    lower.startsWith('<') ||
    lower === 'changeme'
  );
}

/**
 * Reads `.env.local` on the server when present (local dev / preview environments).
 * In runtimes where container `process.env` pre-populates placeholder or older keys,
 * Next.js `@next/env` skips overwriting `process.env` from `.env.local`.
 * Checking `.env.local` on the server ensures user-configured `.env.local` values
 * take precedence over stale/placeholder container env vars, while Vercel production
 * (where `.env.local` does not exist) continues reading `process.env` directly.
 */
function readEnvLocalOverrides(): Record<string, string> {
  if (typeof window !== 'undefined' || process.env.VERCEL === '1') {
    return {};
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      cachedEnvLocal = null;
      return {};
    }

    const stat = fs.statSync(envPath);
    if (cachedEnvLocal && cachedEnvLocal.mtimeMs === stat.mtimeMs) {
      return cachedEnvLocal.values;
    }

    const parsed: Record<string, string> = {};
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1).trim();
      }
      if (key && val && !isPlaceholderConfigValue(val)) {
        parsed[key] = val;
      }
    }

    cachedEnvLocal = { mtimeMs: stat.mtimeMs, values: parsed };
    return parsed;
  } catch {
    return {};
  }
}

function resolveEnvValue(keys: string[]): string {
  const localOverrides = readEnvLocalOverrides();
  for (const key of keys) {
    const localVal = localOverrides[key];
    if (localVal && !isPlaceholderConfigValue(localVal)) {
      return localVal;
    }
  }
  for (const key of keys) {
    const procVal = (process.env[key] || '').trim();
    if (procVal && !isPlaceholderConfigValue(procVal)) {
      return procVal;
    }
  }
  return '';
}

export function getSupabaseUrl(): string {
  const raw = resolveEnvValue(['NEXT_PUBLIC_SUPABASE_URL']).replace(/\/+$/, '');
  if (!raw || isPlaceholderConfigValue(raw)) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return raw;
  } catch {
    return '';
  }
}

export function getSupabasePublishableKey(): string {
  return resolveEnvValue([
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]);
}

export function getSupabaseSecretKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('SUPABASE_SECRET_KEY must never be accessed in browser code.');
  }
  return resolveEnvValue([
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    getSupabaseUrl() &&
      getSupabasePublishableKey() &&
      (typeof window === 'undefined' ? getSupabaseSecretKey() : true)
  );
}

export function isSupabaseDatabaseReady(): boolean {
  if (typeof window !== 'undefined') return false;
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function isSupabaseAuthReady(): boolean {
  if (typeof window !== 'undefined') return false;
  return Boolean(
    getSupabaseUrl() &&
      getSupabasePublishableKey() &&
      getSupabaseSecretKey()
  );
}
