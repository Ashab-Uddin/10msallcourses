import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getCourseBySlug } from '@/src/db/repository';

export const dynamic = 'force-dynamic';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB safety cap
const IMAGE_FETCH_TIMEOUT_MS = 4500;

function decodeSlugParam(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

function stripThumbnailResizeQuery(rawUrl: string): string {
  return rawUrl.replace(/\?(w=\d+.*)/i, '').trim();
}

function buildImageKitOgFallbackUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.toLowerCase() !== 'ik.imagekit.io') return null;
    const base = `${parsed.origin}${parsed.pathname}`;
    return `${base}?tr=w-${OG_WIDTH},h-${OG_HEIGHT},cm-pad_resize,bg-FFFFFF,f-jpg,q-88`;
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
      .blur(26)
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
      .jpeg({ quality: 86, mozjpeg: true })
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const cleanSlug = decodeSlugParam(slug);

  const course = cleanSlug ? await getCourseBySlug(cleanSlug).catch(() => null) : null;
  const rawImageUrl = course?.imageUrl ? stripThumbnailResizeQuery(course.imageUrl) : '';

  if (rawImageUrl) {
    const sourceBuffer = rawImageUrl.startsWith('/')
      ? readSafeLocalPublicImageBuffer(rawImageUrl)
      : await fetchSafeHttpsImageBuffer(rawImageUrl);
    if (sourceBuffer) {
      const ogJpeg = await renderOgJpegBuffer(sourceBuffer);
      if (ogJpeg) {
        return new NextResponse(new Uint8Array(ogJpeg), {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
            'Access-Control-Allow-Origin': '*',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }

    const imageKitFallback = buildImageKitOgFallbackUrl(rawImageUrl);
    if (imageKitFallback) {
      return NextResponse.redirect(imageKitFallback, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  }

  const defaultOgBuffer = readDefaultOgImageBuffer();
  if (defaultOgBuffer) {
    const ogJpeg = await renderOgJpegBuffer(defaultOgBuffer);
    if (ogJpeg) {
      return new NextResponse(new Uint8Array(ogJpeg), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return new NextResponse(new Uint8Array(defaultOgBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return NextResponse.redirect(new URL('/og-image.png', req.url), 307);
}
