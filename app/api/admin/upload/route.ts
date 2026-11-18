import { NextRequest, NextResponse } from 'next/server';
import { countCoursesUsingImageUrl } from '@/src/db/repository';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';
import {
  deleteImageKitFileById,
  deleteImageKitFileByUrl,
  isImageKitConfigured,
  isManagedImageKitUrl,
  uploadImageToImageKit,
} from '@/src/lib/imagekit';
import { checkRateLimit } from '@/src/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB (safely under Vercel's 4.5MB body limit)

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

export async function POST(req: NextRequest) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const rate = await checkRateLimit(req, 'admin_upload', 30, 10 * 60 * 1000);
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

  if (!isImageKitConfigured()) {
    return NextResponse.json(
      {
        error:
          'ImageKit ক্লাউড স্টোরেজ কনফিগার করা হয়নি। সার্ভার এনভায়রনমেন্ট ভ্যারিয়েবলে IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY এবং IMAGEKIT_URL_ENDPOINT সেট করুন অথবা সরাসরি বৈধ HTTPS ইমেজ URL ব্যবহার করুন।',
      },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const previousFileIdRaw = formData.get('previousFileId');
    const previousFileId =
      typeof previousFileIdRaw === 'string' ? previousFileIdRaw.trim() : '';

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'কোনো ইমেজ ফাইল পাওয়া যায়নি।' },
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
        { error: 'ছবির আকার সর্বোচ্চ ৪ মেগাবাইট হতে পারবে।' },
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
    const uploaded = await uploadImageToImageKit(buffer, detectedMime, ext, file.name);

    // Best-effort cleanup of an unsaved draft thumbnail replaced during the same editing session
    if (previousFileId && previousFileId !== uploaded.fileId) {
      await deleteImageKitFileById(previousFileId).catch((err) => {
        console.warn('[upload] Best-effort cleanup of replaced draft fileId failed:', err);
      });
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
  } catch (err) {
    console.error('ImageKit upload failed:', err);
    return NextResponse.json(
      { error: 'ImageKit-এ ছবি আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' },
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

  if (!isImageKitConfigured()) {
    return NextResponse.json(
      { deleted: false, skipped: true },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
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
      const refCount = await countCoursesUsingImageUrl(url);
      if (refCount > 0) {
        return NextResponse.json(
          { deleted: false, inUse: true },
          { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
        );
      }
    }

    if (fileId) {
      const result = await deleteImageKitFileById(fileId);
      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    if (!isManagedImageKitUrl(url)) {
      return NextResponse.json(
        { deleted: false, unmanaged: true },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const result = await deleteImageKitFileByUrl(url);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (err) {
    console.error('ImageKit delete failed:', err);
    return NextResponse.json(
      { error: 'ImageKit থেকে ছবি মুছে ফেলতে সমস্যা হয়েছে।' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}
