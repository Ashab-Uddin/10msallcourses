import { NextRequest, NextResponse } from 'next/server';
import { resolveCourseOgImagePayload } from '@/src/lib/ogImageBuilder';

export const dynamic = 'force-dynamic';

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
  const payload = await resolveCourseOgImagePayload(slug, versionTag);

  if (payload) {
    return new Response(new Uint8Array(payload.buffer), {
      status: 200,
      headers: buildImageHeaders(payload.contentType, payload.buffer.byteLength),
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
  const payload = await resolveCourseOgImagePayload(slug, versionTag);

  if (payload) {
    return new Response(null, {
      status: 200,
      headers: buildImageHeaders(payload.contentType, payload.buffer.byteLength),
    });
  }

  return new Response(null, { status: 404 });
}
