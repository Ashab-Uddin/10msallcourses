import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveCourseOgImagePayload } from '@/src/lib/ogImageBuilder';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return;
  }

  const rawFile = Array.isArray(req.query.file)
    ? req.query.file[0]
    : req.query.file || '';
  const rawSlug = Array.isArray(req.query.slug)
    ? req.query.slug[0]
    : req.query.slug || '';
  const rawVersion = Array.isArray(req.query.v)
    ? req.query.v[0]
    : req.query.v || '1';

  const targetParam = String(rawFile || rawSlug || '').trim();
  const payload = await resolveCourseOgImagePayload(targetParam, String(rawVersion));

  if (!payload) {
    res.redirect(307, '/og-image.png');
    return;
  }

  res.setHeader('Content-Type', payload.contentType);
  res.setHeader('Content-Length', String(payload.buffer.byteLength));
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader(
    'Cache-Control',
    'public, max-age=31536000, s-maxage=31536000, immutable'
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'all');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200);

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  res.end(payload.buffer);
}
