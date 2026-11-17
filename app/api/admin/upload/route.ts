import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB (safely under Vercel's 4.5MB body limit)
const MAX_INLINE_FALLBACK_BYTES = 750 * 1024; // 750KB max when cloud storage is not configured

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

function detectImageTypeFromMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  // AVIF: ....ftypavif or ....ftypavis
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
      return 'image/avif';
    }
  }
  return null;
}

async function uploadToVercelBlob(
  buffer: Buffer,
  contentType: string,
  ext: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN!.trim();
  const safeFileName = `courses/course-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const res = await fetch(`https://blob.vercel-storage.com/${safeFileName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'x-api-version': '7',
      'x-add-random-suffix': '1',
      'x-cache-control-max-age': '31536000',
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vercel Blob upload failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error('Vercel Blob response missing url');
  }
  return data.url;
}

async function uploadToCloudinary(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY!.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET!.trim();
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || '10ms-courses';
  const timestamp = String(Math.floor(Date.now() / 1000));

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(`${paramsToSign}${apiSecret}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', `data:${contentType};base64,${buffer.toString('base64')}`);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    {
      method: 'POST',
      body: form,
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error('Cloudinary response missing secure_url');
  }
  return data.secure_url;
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(req, 'admin_upload', 30, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'অতিরিক্ত আপলোড অনুরোধ করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'কোনো ইমেজ ফাইল পাওয়া যায়নি।' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'খালি ফাইল আপলোড করা যাবে না।' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'ছবির আকার সর্বোচ্চ ৪ মেগাবাইট হতে পারবে।' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedMime = detectImageTypeFromMagicBytes(buffer);

    if (!detectedMime || !ALLOWED_MIME_EXT[detectedMime]) {
      return NextResponse.json(
        {
          error:
            'অবৈধ ইমেজ ফরম্যাট। শুধুমাত্র JPG, PNG, WebP অথবা AVIF ছবি আপলোড করা যাবে।',
        },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME_EXT[detectedMime];

    // 1. Prefer Vercel Blob when configured
    if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
      const url = await uploadToVercelBlob(buffer, detectedMime, ext);
      return NextResponse.json(
        { url, storage: 'vercel-blob', mimeType: detectedMime, size: buffer.length },
        { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // 2. Otherwise use Cloudinary when configured
    if (
      process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
    ) {
      const url = await uploadToCloudinary(buffer, detectedMime);
      return NextResponse.json(
        { url, storage: 'cloudinary', mimeType: detectedMime, size: buffer.length },
        { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // 3. Fallback for local dev / unconfigured cloud storage (requires compact compressed image)
    if (buffer.length > MAX_INLINE_FALLBACK_BYTES) {
      return NextResponse.json(
        {
          error:
            'ক্লাউড স্টোরেজ কনফিগার করা নেই বলে সর্বোচ্চ ৭৫০ কেবি সাইজের ছবি আপলোড করা যাবে। স্থায়ী হাই-রেজোলিউশন ছবির জন্য Vercel Blob (BLOB_READ_WRITE_TOKEN) অথবা Cloudinary যুক্ত করুন।',
        },
        { status: 400 }
      );
    }

    const dataUrl = `data:${detectedMime};base64,${buffer.toString('base64')}`;
    return NextResponse.json(
      {
        url: dataUrl,
        storage: 'inline-optimized',
        mimeType: detectedMime,
        size: buffer.length,
      },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('Image upload failed:', err);
    return NextResponse.json(
      { error: 'ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' },
      { status: 500 }
    );
  }
}
