import type { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from './supabase/admin.ts';
import { isSupabaseDatabaseReady } from './supabase/config.ts';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  backend: 'supabase-rpc' | 'memory';
}

interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();
let lastCleanupMs = Date.now();
let lastRpcWarnMs = 0;

function cleanupExpiredBuckets(now: number, maxWindowMs: number) {
  if (now - lastCleanupMs < 60_000 && buckets.size < 500) {
    return;
  }
  lastCleanupMs = now;
  const cutoff = now - maxWindowMs;
  for (const [key, bucket] of buckets.entries()) {
    const recent = bucket.timestamps.filter((ts) => ts > cutoff);
    if (recent.length === 0) {
      buckets.delete(key);
    } else {
      bucket.timestamps = recent;
    }
  }
}

export function getClientIp(req: NextRequest): string {
  // Prefer Vercel & Cloudflare edge-verified IP headers before generic X-Forwarded-For
  const vercelForwarded = req.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    const first = vercelForwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  return 'unknown';
}

function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now, Math.max(windowMs, 15 * 60_000));

  const cutoff = now - windowMs;
  const existing = buckets.get(key);
  const recent = existing ? existing.timestamps.filter((ts) => ts > cutoff) : [];

  if (recent.length >= maxRequests) {
    const oldest = recent[0] || now;
    const retryAfterMs = Math.max(1000, oldest + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      backend: 'memory',
    };
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - recent.length),
    retryAfterSeconds: 0,
    backend: 'memory',
  };
}

/**
 * Distributed rate limiter backed by Supabase PostgreSQL atomic RPC (`public.consume_rate_limit`).
 * Falls back cleanly to per-instance memory only when Supabase DB is not configured (local dev)
 * or if the `0006_security_rate_limits.sql` migration has not yet been applied.
 */
export async function checkRateLimit(
  req: NextRequest,
  namespace: string,
  maxRequests: number,
  windowMs: number,
  subjectOverride?: string
): Promise<RateLimitResult> {
  const safeNamespace = namespace.trim().toLowerCase().slice(0, 60) || 'default';
  const subject = (subjectOverride?.trim() || getClientIp(req))
    .toLowerCase()
    .slice(0, 120);
  const key = `${safeNamespace}:${subject}`.slice(0, 220);

  if (isSupabaseDatabaseReady()) {
    try {
      const adminClient = getSupabaseAdminClient();
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      const { data, error } = await adminClient.rpc('consume_rate_limit', {
        p_bucket_key: key,
        p_max_requests: Math.max(1, maxRequests),
        p_window_seconds: windowSeconds,
      });

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row && typeof row.allowed === 'boolean') {
          return {
            allowed: row.allowed,
            remaining: Math.max(0, Number(row.remaining ?? 0)),
            retryAfterSeconds: Math.max(0, Number(row.retry_after_seconds ?? 0)),
            backend: 'supabase-rpc',
          };
        }
      }

      if (error && Date.now() - lastRpcWarnMs > 60_000) {
        lastRpcWarnMs = Date.now();
        console.warn(
          '[rateLimit] Supabase RPC consume_rate_limit failed; falling back to memory:',
          error.message
        );
      }
    } catch (err) {
      if (Date.now() - lastRpcWarnMs > 60_000) {
        lastRpcWarnMs = Date.now();
        console.warn('[rateLimit] Supabase RPC threw error; falling back to memory:', err);
      }
    }
  }

  return checkRateLimitMemory(key, maxRequests, windowMs);
}
