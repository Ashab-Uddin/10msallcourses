import fs from 'fs';
import path from 'path';
import type {
  ClassGuideConfig,
  ClassGuideKey,
  ClassGuidesMap,
} from '../types.ts';
import {
  cloneDefaultClassGuide,
  cloneDefaultClassGuidesMap,
  isValidClassGuideKey,
  normalizeClassGuideConfig,
  normalizeClassGuidesMap,
} from '../lib/classGuideDefaults.ts';
import { invalidatePublicPortalCache } from '../lib/cacheInvalidation.ts';
import { isSupabaseDatabaseReady } from '../lib/supabase/config.ts';
import { getSupabaseAdminClient } from '../lib/supabase/admin.ts';
import { RepositoryError } from './repository.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const CLASS_GUIDES_FILE = path.join(DATA_DIR, 'class-guides.json');
const PORTAL_CONFIG_BUCKET = 'portal-config';
const CLASS_GUIDES_OBJECT = 'class-guides-config.json';
const STORAGE_CACHE_TTL_MS = 10_000;

let writeQueue: Promise<unknown> = Promise.resolve();
let cachedStorageGuides: { data: ClassGuidesMap; expiresAt: number } | null = null;
let cachedLocalGuides: { data: ClassGuidesMap; expiresAt: number } | null = null;

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

function readLocalFileSync(): ClassGuidesMap | null {
  try {
    if (!fs.existsSync(CLASS_GUIDES_FILE)) return null;
    const raw = fs.readFileSync(CLASS_GUIDES_FILE, 'utf-8');
    if (!raw.trim()) return null;
    return normalizeClassGuidesMap(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeLocalFile(guides: ClassGuidesMap): Promise<ClassGuidesMap> {
  return enqueueWrite(async () => {
    const normalized = normalizeClassGuidesMap(guides);
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const tmp = `${CLASS_GUIDES_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(normalized, null, 2), 'utf-8');
    await fs.promises.rename(tmp, CLASS_GUIDES_FILE);
    cachedLocalGuides = {
      data: normalized,
      expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
    };
    return normalized;
  });
}

async function readSupabaseGuides(options?: {
  bypassCache?: boolean;
}): Promise<ClassGuidesMap | null> {
  if (
    !options?.bypassCache &&
    cachedStorageGuides &&
    Date.now() < cachedStorageGuides.expiresAt
  ) {
    return cachedStorageGuides.data;
  }
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(PORTAL_CONFIG_BUCKET)
      .download(CLASS_GUIDES_OBJECT);
    if (error || !data) return null;
    const text = await data.text();
    const parsed = normalizeClassGuidesMap(JSON.parse(text));
    cachedStorageGuides = {
      data: parsed,
      expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
    };
    return parsed;
  } catch {
    return null;
  }
}

async function writeSupabaseGuides(guides: ClassGuidesMap): Promise<ClassGuidesMap> {
  const supabase = getSupabaseAdminClient();
  const normalized = normalizeClassGuidesMap(guides);
  const payload = Buffer.from(JSON.stringify(normalized, null, 2), 'utf-8');

  const attemptUpload = async () =>
    supabase.storage
      .from(PORTAL_CONFIG_BUCKET)
      .upload(CLASS_GUIDES_OBJECT, payload, {
        upsert: true,
        contentType: 'application/json; charset=utf-8',
        cacheControl: '0',
      });

  let result = await attemptUpload();
  if (result.error) {
    const errMsg = String(result.error.message || '').toLowerCase();
    if (errMsg.includes('not found') || errMsg.includes('bucket')) {
      await supabase.storage
        .createBucket(PORTAL_CONFIG_BUCKET, { public: false })
        .catch(() => {});
      result = await attemptUpload();
    }
  }

  if (result.error) {
    throw new RepositoryError('গাইড কনফিগারেশন ক্লাউড স্টোরেজে সংরক্ষণ করা যায়নি।', 500);
  }

  cachedStorageGuides = {
    data: normalized,
    expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
  };
  return normalized;
}

export async function getPublicClassGuides(options?: {
  bypassCache?: boolean;
}): Promise<ClassGuidesMap> {
  if (isSupabaseDatabaseReady()) {
    const fromStorage = await readSupabaseGuides({ bypassCache: options?.bypassCache });
    if (fromStorage) {
      return fromStorage;
    }
    const seeded = cloneDefaultClassGuidesMap();
    await writeSupabaseGuides(seeded).catch(() => {});
    return seeded;
  }

  if (
    !options?.bypassCache &&
    cachedLocalGuides &&
    Date.now() < cachedLocalGuides.expiresAt
  ) {
    return cachedLocalGuides.data;
  }

  const fromDisk = readLocalFileSync();
  if (fromDisk) {
    cachedLocalGuides = {
      data: fromDisk,
      expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
    };
    return fromDisk;
  }

  const seeded = cloneDefaultClassGuidesMap();
  await writeLocalFile(seeded).catch(() => {});
  return seeded;
}

export async function getAdminClassGuides(): Promise<ClassGuidesMap> {
  return getPublicClassGuides({ bypassCache: true });
}

export async function saveClassGuideConfig(
  classKey: ClassGuideKey,
  guideConfig: ClassGuideConfig
): Promise<{ guide: ClassGuideConfig; guides: ClassGuidesMap }> {
  if (!isValidClassGuideKey(classKey)) {
    throw new RepositoryError('অবৈধ শ্রেণি নির্ধারণ করা হয়েছে।', 400);
  }

  const currentMap = await getPublicClassGuides({ bypassCache: true });
  const nowIso = new Date().toISOString();
  const normalizedGuide = normalizeClassGuideConfig(classKey, {
    ...guideConfig,
    classKey,
    updatedAt: nowIso,
  });

  const nextMap: ClassGuidesMap = {
    ...currentMap,
    [classKey]: normalizedGuide,
  };

  let savedMap: ClassGuidesMap;
  if (isSupabaseDatabaseReady()) {
    savedMap = await writeSupabaseGuides(nextMap);
  } else {
    savedMap = await writeLocalFile(nextMap);
  }

  invalidatePublicPortalCache();
  return {
    guide: savedMap[classKey],
    guides: savedMap,
  };
}

export async function resetClassGuideConfig(
  classKey: ClassGuideKey
): Promise<{ guide: ClassGuideConfig; guides: ClassGuidesMap }> {
  if (!isValidClassGuideKey(classKey)) {
    throw new RepositoryError('অবৈধ শ্রেণি নির্ধারণ করা হয়েছে।', 400);
  }
  const defaults = cloneDefaultClassGuide(classKey);
  return saveClassGuideConfig(classKey, defaults);
}
