import type { NextRequest } from 'next/server';

interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();
let lastCleanupMs = Date.now();

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
    if (first) return first;
  }

  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

export function checkRateLimit(
  req: NextRequest,
  namespace: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupExpiredBuckets(now, Math.max(windowMs, 15 * 60_000));

  const ip = getClientIp(req);
  const key = `${namespace}:${ip}`;
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
    };
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - recent.length),
    retryAfterSeconds: 0,
  };
}
