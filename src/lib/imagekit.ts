import crypto from 'crypto';

export interface ImageKitConfig {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
  uploadFolder: string;
}

export interface ImageKitUploadResult {
  url: string;
  fileId: string;
  filePath: string;
  width?: number;
  height?: number;
  size?: number;
}

function isPlaceholderImageKitValue(val: string): boolean {
  const lower = val.trim().toLowerCase();
  if (!lower) return true;
  return (
    lower.includes('your-') ||
    lower.includes('your_') ||
    lower.includes('placeholder') ||
    lower.includes('example.com') ||
    lower.startsWith('<') ||
    lower === 'changeme'
  );
}

export function getImageKitConfig(): ImageKitConfig | null {
  if (typeof window !== 'undefined') {
    throw new Error('ImageKit server credentials must never be accessed in browser code.');
  }

  const publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  const urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || '').trim().replace(/\/+$/, '');
  const rawFolder = (process.env.IMAGEKIT_UPLOAD_FOLDER || '/10ms-courses').trim();
  const uploadFolder = rawFolder.startsWith('/') ? rawFolder.replace(/\/+$/, '') || '/10ms-courses' : `/${rawFolder.replace(/\/+$/, '')}`;

  if (
    isPlaceholderImageKitValue(publicKey) ||
    isPlaceholderImageKitValue(privateKey) ||
    isPlaceholderImageKitValue(urlEndpoint)
  ) {
    return null;
  }

  return { publicKey, privateKey, urlEndpoint, uploadFolder };
}

export function isImageKitConfigured(): boolean {
  if (typeof window !== 'undefined') return false;
  return Boolean(getImageKitConfig());
}

function buildAuthHeader(privateKey: string): string {
  const encoded = Buffer.from(`${privateKey}:`, 'utf-8').toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Checks whether a given image URL belongs strictly to the configured ImageKit endpoint
 * (never touches external 10MS CDN URLs or unrelated domains).
 */
export function isManagedImageKitUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const config = getImageKitConfig();
  if (!config) return false;

  try {
    const target = new URL(rawUrl.trim());
    const endpoint = new URL(config.urlEndpoint);
    if (target.protocol !== 'https:' || target.origin !== endpoint.origin) {
      return false;
    }
    const basePath = endpoint.pathname.replace(/\/+$/, '');
    if (basePath && !target.pathname.startsWith(`${basePath}/`)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function uploadImageToImageKit(
  buffer: Buffer,
  mimeType: string,
  ext: string,
  originalFileName?: string,
  options?: { folder?: string; tag?: string; defaultPrefix?: string }
): Promise<ImageKitUploadResult> {
  const config = getImageKitConfig();
  if (!config) {
    throw new Error(
      'ImageKit কনফিগার করা হয়নি। IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY এবং IMAGEKIT_URL_ENDPOINT সেট করুন।'
    );
  }

  const fallbackPrefix = options?.defaultPrefix || 'course';
  const safeBase = (originalFileName || fallbackPrefix)
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || fallbackPrefix;

  const fileName = `${safeBase}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const rawTargetFolder = (options?.folder || config.uploadFolder).trim();
  const targetFolder = rawTargetFolder.startsWith('/')
    ? rawTargetFolder.replace(/\/+$/, '') || config.uploadFolder
    : `/${rawTargetFolder.replace(/\/+$/, '')}`;
  const tag = (options?.tag || '10ms-course-thumbnail').trim();

  const form = new FormData();
  form.append('file', `data:${mimeType};base64,${buffer.toString('base64')}`);
  form.append('fileName', fileName);
  form.append('folder', targetFolder);
  form.append('useUniqueFileName', 'true');
  form.append('tags', tag);

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      Authorization: buildAuthHeader(config.privateKey),
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ImageKit upload failed (${res.status}): ${errText.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    url?: string;
    fileId?: string;
    filePath?: string;
    width?: number;
    height?: number;
    size?: number;
  };

  if (!data.url || !data.fileId) {
    throw new Error('ImageKit upload response missing url or fileId.');
  }

  return {
    url: data.url,
    fileId: data.fileId,
    filePath: data.filePath || `${targetFolder}/${fileName}`,
    width: data.width,
    height: data.height,
    size: data.size ?? buffer.length,
  };
}

export async function deleteImageKitFileById(
  fileId: string
): Promise<{ deleted: boolean; notFound?: boolean }> {
  const config = getImageKitConfig();
  const cleanId = fileId.trim();
  if (!config || !cleanId) {
    return { deleted: false };
  }

  const res = await fetch(
    `https://api.imagekit.io/api/v1/files/${encodeURIComponent(cleanId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: buildAuthHeader(config.privateKey),
      },
    }
  );

  if (res.status === 404) {
    return { deleted: true, notFound: true };
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ImageKit delete failed (${res.status}): ${errText.slice(0, 240)}`);
  }

  return { deleted: true };
}

/**
 * Resolves an ImageKit fileId from a managed ImageKit URL and deletes it safely.
 * Best-effort: returns `{ deleted: false }` if not managed by this ImageKit account.
 */
export async function deleteImageKitFileByUrl(
  rawUrl: string | null | undefined
): Promise<{ deleted: boolean; fileId?: string }> {
  if (!rawUrl || !isManagedImageKitUrl(rawUrl)) {
    return { deleted: false };
  }

  const config = getImageKitConfig();
  if (!config) return { deleted: false };

  try {
    const target = new URL(rawUrl.trim());
    const endpoint = new URL(config.urlEndpoint);
    const endpointBasePath = endpoint.pathname.replace(/\/+$/, '');

    // Relative filePath stored in ImageKit (e.g. /10ms-courses/file.webp)
    let relativePath = target.pathname;
    if (endpointBasePath && relativePath.startsWith(endpointBasePath)) {
      relativePath = relativePath.slice(endpointBasePath.length);
    }
    // Strip optional ImageKit transformation segment (/tr:...)
    relativePath = relativePath.replace(/^\/tr:[^/]+/, '');
    if (!relativePath.startsWith('/')) {
      relativePath = `/${relativePath}`;
    }

    const lastSlash = relativePath.lastIndexOf('/');
    const folderPath = lastSlash > 0 ? relativePath.slice(0, lastSlash) : '/';
    const fileName = decodeURIComponent(relativePath.slice(lastSlash + 1));
    if (!fileName) {
      return { deleted: false };
    }

    const escapedName = fileName.replace(/"/g, '\\"');
    const searchParams = new URLSearchParams({
      path: folderPath,
      searchQuery: `name = "${escapedName}"`,
      limit: '10',
    });

    const listRes = await fetch(
      `https://api.imagekit.io/api/v1/files?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: buildAuthHeader(config.privateKey),
        },
      }
    );

    if (!listRes.ok) {
      const errText = await listRes.text().catch(() => '');
      console.warn(`[imagekit] File lookup failed (${listRes.status}): ${errText.slice(0, 160)}`);
      return { deleted: false };
    }

    const files = (await listRes.json()) as Array<{
      fileId?: string;
      filePath?: string;
      url?: string;
      name?: string;
    }>;

    if (!Array.isArray(files) || files.length === 0) {
      return { deleted: false };
    }

    const cleanTargetUrl = `${target.origin}${target.pathname}`;
    const matched = files.find((item) => {
      const itemCleanUrl = item.url ? item.url.split('?')[0] : '';
      return (
        item.filePath === relativePath ||
        itemCleanUrl === cleanTargetUrl ||
        item.name === fileName
      );
    });

    if (!matched?.fileId) {
      return { deleted: false };
    }

    const delResult = await deleteImageKitFileById(matched.fileId);
    return { deleted: delResult.deleted, fileId: matched.fileId };
  } catch (err) {
    console.warn('[imagekit] Best-effort delete by URL failed:', err);
    return { deleted: false };
  }
}
