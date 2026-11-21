import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getCourseOgTarget } from '@/src/db/repository';
import { decodeCourseSlug } from '@/src/lib/courseSlug';

export const dynamic = 'force-dynamic';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB safety cap
const IMAGE_FETCH_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;

interface CachedOgEntry {
  bytes: Uint8Array;
  contentType: 'image/jpeg' | 'image/png';
  expiresAt: number;
}

const ogMemoryCache = new Map<string, CachedOgEntry>();

function getCachedOg(key: string): CachedOgEntry | null {
  const entry = ogMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ogMemoryCache.delete(key);
    return null;
  }
  return entry;
}

function setCachedOg(key: string, entry: Omit<CachedOgEntry, 'expiresAt'>) {
  if (ogMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ogMemoryCache.keys().next().value;
    if (oldestKey) ogMemoryCache.delete(oldestKey);
  }
  ogMemoryCache.set(key, {
    ...entry,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function stripThumbnailResizeQuery(rawUrl: string): string {
  return rawUrl.replace(/\?(w=\d+.*)/i, '').trim();
}

function buildFastSourceFetchUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.toLowerCase() === 'ik.imagekit.io' && !parsed.searchParams.has('tr')) {
      return `${parsed.origin}${parsed.pathname}?tr=w-1000,f-jpg,q-88`;
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function buildImageKitOgFallbackUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.toLowerCase() !== 'ik.imagekit.io') return null;
    const base = `${parsed.origin}${parsed.pathname}`;
    return `${base}?tr=w-${OG_WIDTH},h-${OG_HEIGHT},cm-pad_resize,bg-blurred,f-jpg,q-88`;
  } catch {
    return null;
  }
}

let cachedDefaultOgBytes: { bytes: Uint8Array; contentType: 'image/jpeg' | 'image/png' } | null = null;

function readDefaultOgImageBuffer(): Buffer | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'og-image.png'),
    path.join(process.cwd(), 'public', 'images', 'logo.png'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
    } catch {
      // Try next fallback
    }
  }
  return null;
}

async function fetchSafeHttpsImageBuffer(rawUrl: string): Promise<Buffer | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') {
    return null;
  }

  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/')) {
      return null;
    }

    const declaredLength = Number(res.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_IMAGE_BYTES) {
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > MAX_SOURCE_IMAGE_BYTES) {
      return null;
    }

    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function renderOgJpegBuffer(sourceBuffer: Buffer): Promise<Buffer | null> {
  try {
    const sharpMod = await import('sharp');
    const sharp = sharpMod.default;

    const backdrop = await sharp(sourceBuffer)
      .rotate()
      .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
      .blur(24)
      .modulate({ brightness: 0.92 })
      .toBuffer();

    const foreground = await sharp(sourceBuffer)
      .rotate()
      .resize(OG_WIDTH, OG_HEIGHT, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    return await sharp(backdrop)
      .composite([{ input: foreground, gravity: 'centre' }])
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

function readSafeLocalPublicImageBuffer(relativePath: string): Buffer | null {
  if (!relativePath.startsWith('/')) return null;
  const publicDir = path.resolve(process.cwd(), 'public');
  const resolvedPath = path.resolve(publicDir, relativePath.replace(/^\/+/, ''));
  if (!resolvedPath.startsWith(`${publicDir}${path.sep}`)) {
    return null;
  }
  try {
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      const buf = fs.readFileSync(resolvedPath);
      return buf.byteLength > 0 && buf.byteLength <= MAX_SOURCE_IMAGE_BYTES ? buf : null;
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveOgImagePayload(
  rawParam: string,
  versionTag: string
): Promise<{ bytes: Uint8Array; contentType: 'image/jpeg' | 'image/png' } | null> {
  const cleanKey = decodeCourseSlug(rawParam) || rawParam.trim();
  const cacheKey = `${cleanKey}::${versionTag}`;
  const hit = getCachedOg(cacheKey);
  if (hit) {
    return { bytes: hit.bytes, contentType: hit.contentType };
  }

  const course = cleanKey ? await getCourseOgTarget(cleanKey).catch(() => null) : null;
  const rawImageUrl = course?.imageUrl ? stripThumbnailResizeQuery(course.imageUrl) : '';

  if (rawImageUrl) {
    const sourceBuffer = rawImageUrl.startsWith('/')
      ? readSafeLocalPublicImageBuffer(rawImageUrl)
      : await fetchSafeHttpsImageBuffer(buildFastSourceFetchUrl(rawImageUrl));

    if (sourceBuffer) {
      const ogJpeg = await renderOgJpegBuffer(sourceBuffer);
      if (ogJpeg && ogJpeg.byteLength > 0) {
        const result = { bytes: new Uint8Array(ogJpeg), contentType: 'image/jpeg' as const };
        setCachedOg(cacheKey, result);
        return result;
      }
    }

    const imageKitFallback = buildImageKitOgFallbackUrl(rawImageUrl);
    if (imageKitFallback) {
      const fallbackBuf = await fetchSafeHttpsImageBuffer(imageKitFallback);
      if (fallbackBuf && fallbackBuf.byteLength > 0) {
        const result = { bytes: new Uint8Array(fallbackBuf), contentType: 'image/jpeg' as const };
        setCachedOg(cacheKey, result);
        return result;
      }
    }
  }

  if (cachedDefaultOgBytes) {
    return cachedDefaultOgBytes;
  }

  const defaultOgBuffer = readDefaultOgImageBuffer();
  if (defaultOgBuffer && defaultOgBuffer.byteLength > 0) {
    const ogJpeg = await renderOgJpegBuffer(defaultOgBuffer);
    if (ogJpeg && ogJpeg.byteLength > 0) {
      cachedDefaultOgBytes = { bytes: new Uint8Array(ogJpeg), contentType: 'image/jpeg' };
      return cachedDefaultOgBytes;
    }
    cachedDefaultOgBytes = { bytes: new Uint8Array(defaultOgBuffer), contentType: 'image/png' };
    return cachedDefaultOgBytes;
  }

  return null;
}

function buildImageHeaders(contentType: string, byteLength: number): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Content-Length': String(byteLength),
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
    'Access-Control-Allow-Origin': '*',
    'X-Robots-Tag': 'all',
    'X-Content-Type-Options': 'nosniff',
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const versionTag = req.nextUrl.searchParams.get('v') || '1';
  const payload = await resolveOgImagePayload(slug, versionTag);

  if (payload) {
    return new Response(Buffer.from(payload.bytes), {
      status: 200,
      headers: buildImageHeaders(payload.contentType, payload.bytes.byteLength),
    });
  }

  return NextResponse.redirect(new URL('/og-image.png', req.url), 307);
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const versionTag = req.nextUrl.searchParams.get('v') || '1';
  const payload = await resolveOgImagePayload(slug, versionTag);

  if (payload) {
    return new Response(null, {
      status: 200,
      headers: buildImageHeaders(payload.contentType, payload.bytes.byteLength),
    });
  }

  return new Response(null, { status: 404 });
}
