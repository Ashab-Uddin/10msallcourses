import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { countBooksUsingImageUrl } from '@/src/db/bookRepository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import {
  deleteImageKitFileById,
  deleteImageKitFileByUrl,
  getImageKitConfig,
  isImageKitConfigured,
  isManagedImageKitUrl,
  uploadImageToImageKit,
} from '@/src/lib/imagekit';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB
const LOCAL_BOOKS_UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'images', 'books');

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

function detectImageTypeFromMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
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
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
      return 'image/avif';
    }
  }
  return null;
}

async function safeDeleteLocalBookFile(relativeUrl: string): Promise<boolean> {
  if (
    process.env.VERCEL === '1' ||
    !relativeUrl.startsWith('/images/books/') ||
    relativeUrl.includes('..')
  ) {
    return false;
  }
  const resolved = path.resolve(process.cwd(), 'public', relativeUrl.replace(/^\/+/, ''));
  if (!resolved.startsWith(LOCAL_BOOKS_UPLOAD_DIR + path.sep)) {
    return false;
  }
  if (!fs.existsSync(resolved)) {
    return false;
  }
  await fs.promises.unlink(resolved);
  return true;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const rate = await checkRateLimit(req, 'admin_book_upload', 30, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'অতিরিক্ত আপলোড অনুরোধ করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSeconds),
          'Cache-Control': 'private, no-store',
        },
      }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const previousFileIdRaw = formData.get('previousFileId');
    const previousFileId =
      typeof previousFileIdRaw === 'string' ? previousFileIdRaw.trim() : '';
    const previousUrlRaw = formData.get('previousUrl');
    const previousUrl = typeof previousUrlRaw === 'string' ? previousUrlRaw.trim() : '';

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'কোনো বুক কভার ইমেজ ফাইল পাওয়া যায়নি।' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'খালি ফাইল আপলোড করা যাবে না।' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'বইয়ের কভার ছবির আকার সর্বোচ্চ ৪ মেগাবাইট হতে পারবে।' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
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
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const ext = ALLOWED_MIME_EXT[detectedMime];

    // Production path: Upload to ImageKit CDN inside a dedicated books folder
    if (isImageKitConfigured()) {
      const ikConfig = getImageKitConfig();
      const booksFolder =
        (process.env.IMAGEKIT_BOOKS_FOLDER || '').trim() ||
        `${(ikConfig?.uploadFolder || '/10ms-courses').replace(/\/+$/, '')}/books`;

      const uploaded = await uploadImageToImageKit(buffer, detectedMime, ext, file.name, {
        folder: booksFolder,
        tag: '10ms-book-cover',
        defaultPrefix: 'book',
      });

      if (previousFileId && previousFileId !== uploaded.fileId) {
        await deleteImageKitFileById(previousFileId).catch(() => {});
      }

      return NextResponse.json(
        {
          url: uploaded.url,
          fileId: uploaded.fileId,
          filePath: uploaded.filePath,
          width: uploaded.width,
          height: uploaded.height,
          size: uploaded.size ?? buffer.length,
          mimeType: detectedMime,
          storage: 'imagekit',
        },
        { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // On Vercel serverless without ImageKit, never write to ephemeral FS
    if (process.env.VERCEL === '1') {
      return NextResponse.json(
        {
          error:
            'ImageKit ক্লাউড স্টোরেজ কনফিগার করা হয়নি। Vercel Environment Variables-এ IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY এবং IMAGEKIT_URL_ENDPOINT সেট করুন অথবা সরাসরি বৈধ HTTPS কভার ইমেজ URL দিন।',
        },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    // Local development fallback: store cleanly under /public/images/books/
    const safeBase =
      (file.name || 'book-cover')
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'book-cover';
    const fileName = `${safeBase}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

    await fs.promises.mkdir(LOCAL_BOOKS_UPLOAD_DIR, { recursive: true });
    const destination = path.join(LOCAL_BOOKS_UPLOAD_DIR, fileName);
    await fs.promises.writeFile(destination, buffer);

    const publicUrl = `/images/books/${fileName}`;

    if (previousUrl && previousUrl !== publicUrl) {
      const refs = await countBooksUsingImageUrl(previousUrl);
      if (refs === 0) {
        await safeDeleteLocalBookFile(previousUrl).catch(() => {});
      }
    }

    return NextResponse.json(
      {
        url: publicUrl,
        fileId: null,
        filePath: publicUrl,
        size: buffer.length,
        mimeType: detectedMime,
        storage: 'local',
      },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[POST /api/admin/books/upload] Failed:', err);
    return NextResponse.json(
      { error: 'বইয়ের কভার ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const fileId = typeof body?.fileId === 'string' ? body.fileId.trim() : '';
    const url = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!fileId && !url) {
      return NextResponse.json(
        { error: 'মুছে ফেলার জন্য fileId অথবা url প্রদান করুন।' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    if (url) {
      const refs = await countBooksUsingImageUrl(url);
      if (refs > 0) {
        return NextResponse.json(
          { deleted: false, inUse: true },
          { headers: { 'Cache-Control': 'private, no-store' } }
        );
      }
    }

    if (fileId && isImageKitConfigured()) {
      const result = await deleteImageKitFileById(fileId);
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    if (url && isManagedImageKitUrl(url)) {
      const result = await deleteImageKitFileByUrl(url);
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    if (url && url.startsWith('/images/books/')) {
      const deleted = await safeDeleteLocalBookFile(url);
      return NextResponse.json(
        { deleted },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    return NextResponse.json(
      { deleted: false, unmanaged: true },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[DELETE /api/admin/books/upload] Failed:', err);
    return NextResponse.json(
      { error: 'বইয়ের কভার ছবি মুছে ফেলতে সমস্যা হয়েছে।' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}
