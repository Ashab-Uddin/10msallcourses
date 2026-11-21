import fs from 'fs';
import path from 'path';
import { getCourseOgTarget } from '@/src/db/repository';
import { decodeCourseSlug } from '@/src/lib/courseSlug';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;

export interface OgImagePayload {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png';
}

interface CachedOgEntry extends OgImagePayload {
  expiresAt: number;
}

const ogMemoryCache = new Map<string, CachedOgEntry>();
let cachedDefaultOgPayload: OgImagePayload | null = null;

function getCachedOg(key: string): OgImagePayload | null {
  const entry = ogMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ogMemoryCache.delete(key);
    return null;
  }
  return { buffer: entry.buffer, contentType: entry.contentType };
}

function setCachedOg(key: string, payload: OgImagePayload) {
  if (ogMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ogMemoryCache.keys().next().value;
    if (oldestKey) ogMemoryCache.delete(oldestKey);
  }
  ogMemoryCache.set(key, {
    ...payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function extractCourseIdentifierFromOgParam(rawParam: string): {
  courseKey: string;
  cacheVersion: string;
} {
  const decoded = (decodeCourseSlug(rawParam) || rawParam || '').trim();
  const withoutExt = decoded.replace(/\.(jpe?g|png|webp)$/i, '');
  const numericPrefixMatch = withoutExt.match(/^(\d+)(?:-(.+))?$/);
  if (numericPrefixMatch) {
    return {
      courseKey: numericPrefixMatch[1],
      cacheVersion: withoutExt,
    };
  }
  return {
    courseKey: withoutExt,
    cacheVersion: withoutExt || 'default',
  };
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
    return `${base}?tr=w-${OG_WIDTH},h-${OG_HEIGHT},cm-pad_resize,bg-blurred,f-jpg,q-84`;
  } catch {
    return null;
  }
}

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

async function renderBaselineOgJpegBuffer(sourceBuffer: Buffer): Promise<Buffer | null> {
  try {
    const sharpMod = await import('sharp');
    const sharp = sharpMod.default;

    const backdrop = await sharp(sourceBuffer)
      .rotate()
      .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
      .blur(22)
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
      .jpeg({
        quality: 84,
        progressive: false,
        chromaSubsampling: '4:2:0',
      })
      .toBuffer();
  } catch {
    return null;
  }
}

export async function resolveCourseOgImagePayload(
  rawParam: string,
  versionQuery = '1'
): Promise<OgImagePayload | null> {
  const { courseKey, cacheVersion } = extractCourseIdentifierFromOgParam(rawParam);
  const cacheKey = `${courseKey}::${cacheVersion}::${versionQuery}`;
  const hit = getCachedOg(cacheKey);
  if (hit) {
    return hit;
  }

  const course = courseKey ? await getCourseOgTarget(courseKey).catch(() => null) : null;
  const rawImageUrl = course?.imageUrl ? stripThumbnailResizeQuery(course.imageUrl) : '';

  if (rawImageUrl) {
    const sourceBuffer = rawImageUrl.startsWith('/')
      ? readSafeLocalPublicImageBuffer(rawImageUrl)
      : await fetchSafeHttpsImageBuffer(buildFastSourceFetchUrl(rawImageUrl));

    if (sourceBuffer) {
      const ogJpeg = await renderBaselineOgJpegBuffer(sourceBuffer);
      if (ogJpeg && ogJpeg.byteLength > 0) {
        const result: OgImagePayload = { buffer: ogJpeg, contentType: 'image/jpeg' };
        setCachedOg(cacheKey, result);
        return result;
      }
    }

    const imageKitFallback = buildImageKitOgFallbackUrl(rawImageUrl);
    if (imageKitFallback) {
      const fallbackBuf = await fetchSafeHttpsImageBuffer(imageKitFallback);
      if (fallbackBuf && fallbackBuf.byteLength > 0) {
        const reencoded = await renderBaselineOgJpegBuffer(fallbackBuf);
        const result: OgImagePayload = {
          buffer: reencoded && reencoded.byteLength > 0 ? reencoded : fallbackBuf,
          contentType: 'image/jpeg',
        };
        setCachedOg(cacheKey, result);
        return result;
      }
    }
  }

  if (cachedDefaultOgPayload) {
    return cachedDefaultOgPayload;
  }

  const defaultOgBuffer = readDefaultOgImageBuffer();
  if (defaultOgBuffer && defaultOgBuffer.byteLength > 0) {
    const ogJpeg = await renderBaselineOgJpegBuffer(defaultOgBuffer);
    if (ogJpeg && ogJpeg.byteLength > 0) {
      cachedDefaultOgPayload = { buffer: ogJpeg, contentType: 'image/jpeg' };
      return cachedDefaultOgPayload;
    }
    cachedDefaultOgPayload = { buffer: defaultOgBuffer, contentType: 'image/png' };
    return cachedDefaultOgPayload;
  }

  return null;
}
