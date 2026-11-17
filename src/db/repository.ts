import fs from 'fs';
import path from 'path';
import {
  Category,
  Course,
  ClickRecord,
  SiteSettings,
  CustomerInquiry,
  OfferTimer,
} from '../types.ts';
import { INITIAL_CATEGORIES, INITIAL_COURSES, INITIAL_SETTINGS } from './seedData.ts';
import { computeDiscountPercent } from '../lib/courseValidation.ts';
import { computeOfferTimerStatus } from '../lib/offerTimerUtils.ts';
import { toBengaliNumber } from '../utils/format.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');
const REDIS_STORE_KEY = process.env.STORE_REDIS_KEY?.trim() || '10ms_portal:store:v1';
const REMOTE_CACHE_TTL_MS = 3000;

export class RepositoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RepositoryError';
    this.status = status;
  }
}

export interface StorageInfo {
  backend: 'upstash-redis' | 'local-json';
  persistentOnVercel: boolean;
  warning?: string;
}

interface LocalStore {
  categories: Category[];
  courses: Course[];
  clicks: ClickRecord[];
  settings: SiteSettings;
  inquiries: CustomerInquiry[];
  offerTimers: OfferTimer[];
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    ''
  ).trim();
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    ''
  ).trim();

  if (url && token) {
    return { url: url.replace(/\/+$/, ''), token };
  }
  return null;
}

export function getStorageInfo(): StorageInfo {
  const redis = getRedisConfig();
  if (redis) {
    return {
      backend: 'upstash-redis',
      persistentOnVercel: true,
    };
  }
  const onVercel = process.env.VERCEL === '1';
  return {
    backend: 'local-json',
    persistentOnVercel: false,
    ...(onVercel
      ? {
          warning:
            'Vercel Serverless-এ স্থায়ী ডাটা সংরক্ষণের জন্য UPSTASH_REDIS_REST_URL এবং UPSTASH_REDIS_REST_TOKEN (অথবা Vercel KV) এনভায়রনমেন্ট ভ্যারিয়েবল যুক্ত করুন।',
        }
      : {}),
  };
}

let cachedStore: LocalStore | null = null;
let cachedAtMs = 0;
let writeQueue: Promise<void> = Promise.resolve();

function buildDefaultSeedStore(): LocalStore {
  return {
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c })),
    courses: INITIAL_COURSES.map((c) => ({ ...c })),
    clicks: [
      {
        id: 1,
        courseId: 1,
        courseSlug: 'hsc-28-pcmb',
        courseTitle: 'HSC 28 অনলাইন ব্যাচ (PCMB)',
        referrer: 'google.com',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        clickedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 2,
        courseId: 13,
        courseSlug: 'spoken-english-munzereen',
        courseTitle: 'ঘরে বসে Spoken English',
        referrer: 'facebook.com',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        clickedAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
    settings: { ...INITIAL_SETTINGS },
    inquiries: [],
    offerTimers: [],
  };
}

function normalizeStoreShape(raw: Partial<LocalStore> | null | undefined): LocalStore {
  const seed = buildDefaultSeedStore();
  if (!raw || typeof raw !== 'object') {
    return seed;
  }

  return {
    categories:
      Array.isArray(raw.categories) && raw.categories.length > 0
        ? raw.categories
        : seed.categories,
    courses:
      Array.isArray(raw.courses) && raw.courses.length > 0
        ? raw.courses
        : seed.courses,
    clicks: Array.isArray(raw.clicks) ? raw.clicks : [],
    settings: raw.settings ? { ...seed.settings, ...raw.settings } : seed.settings,
    inquiries: Array.isArray(raw.inquiries) ? raw.inquiries : [],
    offerTimers: Array.isArray(raw.offerTimers) ? raw.offerTimers : [],
  };
}

function readLocalFileStore(): LocalStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content) as Partial<LocalStore>;
      return normalizeStoreShape(parsed);
    }
  } catch (err) {
    console.error('[repository] Failed to read local database.json:', err);
  }

  const initial = buildDefaultSeedStore();
  if (process.env.VERCEL !== '1') {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {
      // Read-only FS fallback
    }
  }
  return initial;
}

async function redisCommand<T = unknown>(command: unknown[]): Promise<T | null> {
  const redis = getRedisConfig();
  if (!redis) return null;

  const res = await fetch(redis.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redis.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Redis REST error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) {
    throw new Error(`Redis command error: ${data.error}`);
  }
  return data.result ?? null;
}

async function loadStore(forceFresh = false): Promise<LocalStore> {
  const now = Date.now();
  const redis = getRedisConfig();

  if (redis) {
    if (!forceFresh && cachedStore && now - cachedAtMs < REMOTE_CACHE_TTL_MS) {
      return cachedStore;
    }

    try {
      const rawValue = await redisCommand<string>(['GET', REDIS_STORE_KEY]);
      if (typeof rawValue === 'string' && rawValue.trim()) {
        const parsed = normalizeStoreShape(JSON.parse(rawValue) as Partial<LocalStore>);
        cachedStore = parsed;
        cachedAtMs = now;
        return parsed;
      }

      // First run on fresh Redis instance: seed from bundled data/database.json so zero existing data is lost.
      const seeded = readLocalFileStore();
      await redisCommand(['SET', REDIS_STORE_KEY, JSON.stringify(seeded)]);
      cachedStore = seeded;
      cachedAtMs = now;
      return seeded;
    } catch (err) {
      console.error('[repository] Upstash Redis read failed, falling back to cache/local:', err);
      if (cachedStore) return cachedStore;
      const fallback = readLocalFileStore();
      cachedStore = fallback;
      cachedAtMs = now;
      return fallback;
    }
  }

  if (cachedStore && !forceFresh) {
    return cachedStore;
  }

  const local = readLocalFileStore();
  cachedStore = local;
  cachedAtMs = now;
  return local;
}

async function persistStore(store: LocalStore): Promise<void> {
  cachedStore = store;
  cachedAtMs = Date.now();
  const serialized = JSON.stringify(store, null, 2);
  const redis = getRedisConfig();

  const runPersist = async () => {
    if (redis) {
      await redisCommand(['SET', REDIS_STORE_KEY, serialized]);
      return;
    }

    // In Vercel serverless without Redis configured, filesystem is read-only — keep in-memory without throwing EROFS.
    if (process.env.VERCEL === '1') {
      console.warn(
        '[repository] Running on Vercel without UPSTASH_REDIS_REST_URL/KV_REST_API_URL; mutation is ephemeral in memory.'
      );
      return;
    }

    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, serialized, 'utf-8');
    await fs.promises.rename(tmpFile, DATA_FILE);
  };

  // Serialize writes to prevent concurrent corruption or out-of-order overwrites.
  const nextWrite = writeQueue.then(runPersist, runPersist);
  writeQueue = nextWrite.catch((err) => {
    console.error('[repository] Failed to persist store:', err);
  });
  await nextWrite;
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseSafePrice(value: unknown): { valid: boolean; value: number } {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return { valid: false, value: 0 };
    return { valid: true, value: Math.round(value) };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { valid: false, value: 0 };
    const ascii = trimmed.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    if (!/^\d+$/.test(ascii)) return { valid: false, value: 0 };
    const normalized = ascii.replace(/^0+(?=\d)/, '').replace(/^0+$/, '0');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return { valid: false, value: 0 };
    return { valid: true, value: Math.round(parsed) };
  }
  return { valid: false, value: 0 };
}

export function normalizeCourseStatus(
  status: unknown,
  fallback: 'active' | 'inactive' | 'closed' = 'active'
): 'active' | 'inactive' | 'closed' {
  if (status === 'active' || status === 'inactive' || status === 'closed') {
    return status;
  }
  return fallback;
}

function hydrateOfferTimers(store: LocalStore): OfferTimer[] {
  const rawTimers = Array.isArray(store.offerTimers) ? store.offerTimers : [];
  const courseById = new Map<number, Course>();
  for (const c of store.courses) {
    courseById.set(c.id, c);
  }

  return rawTimers
    .map((timer) => {
      const course = courseById.get(Number(timer.courseId));
      if (!course) return null;
      return {
        ...timer,
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: course.title,
        courseImageUrl: course.imageUrl || null,
        affiliateUrl: course.affiliateUrl || `/go/${course.slug}`,
      };
    })
    .filter((t): t is OfferTimer => Boolean(t));
}

export async function getPublicPortalData() {
  const store = await loadStore();
  const activeCategories = [...store.categories]
    .filter((c) => c.status === 'active')
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const activeCourseIds = new Set(
    store.courses.filter((c) => c.status === 'active').map((c) => c.id)
  );
  const allHydratedTimers = hydrateOfferTimers(store);
  const offerTimers = allHydratedTimers.filter((t) => {
    if (!activeCourseIds.has(t.courseId)) return false;
    const status = computeOfferTimerStatus(t, nowMs);
    return status === 'active' || status === 'scheduled';
  });

  return {
    categories: activeCategories,
    courses: store.courses,
    settings: store.settings,
    offerTimers,
    hasOfferTimers: allHydratedTimers.length > 0,
    serverNow: nowIso,
  };
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const store = await loadStore();
  const cleanSlug = slug.trim();
  const found = store.courses.find((c) => c.slug === cleanSlug);
  return found || null;
}

export async function getPortalSettings(): Promise<SiteSettings> {
  const store = await loadStore();
  return store.settings;
}

export async function recordCourseClick(
  slug: string,
  referrer?: string | null,
  userAgent?: string | null
) {
  const store = await loadStore(true);
  const course = store.courses.find((c) => c.slug === slug);
  if (!course) {
    return null;
  }

  course.clickCount = (course.clickCount || 0) + 1;
  const clickRecord: ClickRecord = {
    id: Date.now(),
    courseId: course.id,
    courseSlug: course.slug,
    courseTitle: course.title,
    referrer: (referrer || 'direct').slice(0, 300),
    userAgent: (userAgent || 'unknown').slice(0, 300),
    clickedAt: new Date().toISOString(),
  };

  store.clicks.unshift(clickRecord);
  if (store.clicks.length > 200) {
    store.clicks = store.clicks.slice(0, 200);
  }
  await persistStore(store);

  return {
    affiliateUrl: course.affiliateUrl,
    courseTitle: course.title,
    clickCount: course.clickCount,
    status: course.status,
  };
}

export async function getAdminOverviewData() {
  const store = await loadStore(true);

  const allCategories = [...store.categories].sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );
  const allCourses = store.courses;
  const recentClicks = store.clicks;
  const currentSettings = store.settings;

  const totalCourses = allCourses.length;
  const activeCourses = allCourses.filter((c) => c.status === 'active').length;
  const inactiveCourses = totalCourses - activeCourses;
  const popularCourses = allCourses.filter((c) => c.isPopular).length;
  const totalClicks = allCourses.reduce((sum, c) => sum + (c.clickCount || 0), 0);

  return {
    stats: {
      totalCourses,
      activeCourses,
      inactiveCourses,
      popularCourses,
      totalClicks,
      totalCategories: allCategories.length,
      totalInquiries: store.inquiries.length,
    },
    categories: allCategories,
    courses: allCourses,
    recentClicks,
    settings: currentSettings,
    offerTimers: hydrateOfferTimers(store),
    storageInfo: getStorageInfo(),
    serverNow: new Date().toISOString(),
  };
}

export async function createNewCourse(input: Record<string, unknown>) {
  const store = await loadStore(true);

  const title = String(input.title || '').trim();
  const slug = normalizeSlug(String(input.slug || title));
  if (!title || !slug) {
    throw new RepositoryError('কোর্সের শিরোনাম এবং বৈধ স্লাগ পূরণ করা আবশ্যক।', 400);
  }

  const slugExists = store.courses.some((c) => c.slug.toLowerCase() === slug.toLowerCase());
  if (slugExists) {
    throw new RepositoryError(
      `"${slug}" স্লাগটি ইতিমধ্যে অন্য একটি কোর্সে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি স্লাগ দিন।`,
      409
    );
  }

  const categorySlug = String(input.categorySlug || '').trim();
  const matchedCategory = store.categories.find((c) => c.slug === categorySlug);
  if (!matchedCategory) {
    throw new RepositoryError('অনুগ্রহ করে একটি বৈধ ক্যাটাগরি নির্বাচন করুন।', 400);
  }

  const newId = store.courses.length > 0 ? Math.max(...store.courses.map((c) => c.id)) + 1 : 1;

  const parsedOriginal = parseSafePrice(input.originalPrice ?? 0);
  const parsedDiscount = parseSafePrice(input.discountPrice ?? 0);
  const originalPrice = parsedOriginal.valid ? parsedOriginal.value : 0;
  const discountPrice = parsedDiscount.valid ? parsedDiscount.value : 0;
  const discountPercent = computeDiscountPercent(originalPrice, discountPrice);
  const flatSavings = Math.max(0, originalPrice - discountPrice);

  const computedBadgeText =
    typeof input.discountBadgeText === 'string' && input.discountBadgeText.trim()
      ? input.discountBadgeText.trim()
      : flatSavings > 0
      ? `৳${toBengaliNumber(flatSavings)} ছাড়`
      : discountPercent > 0
      ? `${toBengaliNumber(discountPercent)}% ছাড়`
      : '';

  const nowIso = new Date().toISOString();
  const newCourse: Course = {
    id: newId,
    title: title.slice(0, 220),
    slug,
    categoryId: matchedCategory.id,
    categorySlug: matchedCategory.slug,
    shortBadge: typeof input.shortBadge === 'string' ? input.shortBadge.trim().slice(0, 60) : '',
    headerTitle: String(input.headerTitle || '10MS').trim().slice(0, 80),
    headerSubtitle: String(input.headerSubtitle || 'অনলাইন কোর্স').trim().slice(0, 120),
    discountBadgeText: computedBadgeText.slice(0, 60),
    gradientTheme: String(input.gradientTheme || 'red').trim(),
    description: String(input.description || '').trim().slice(0, 1000),
    fullDescription:
      typeof input.fullDescription === 'string' && input.fullDescription.trim()
        ? input.fullDescription.trim().slice(0, 5000)
        : null,
    imageUrl: typeof input.imageUrl === 'string' && input.imageUrl.trim() ? input.imageUrl.trim() : null,
    imageFit: typeof input.imageFit === 'string' ? input.imageFit : 'contain',
    originalPrice,
    discountPrice,
    discountPercent,
    rating: String(input.rating || '৪.৯').trim().slice(0, 10),
    studentCount: String(input.studentCount || '১০k+ শিক্ষার্থী').trim().slice(0, 60),
    duration: String(input.duration || '৬ মাস').trim().slice(0, 60),
    targetStudents:
      typeof input.targetStudents === 'string' ? input.targetStudents.trim().slice(0, 200) : '',
    instructorInfo: String(
      input.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল'
    ).trim().slice(0, 200),
    instructorIcon: String(input.instructorIcon || 'school').trim().slice(0, 50),
    features:
      typeof input.features === 'string'
        ? input.features
        : JSON.stringify(Array.isArray(input.features) ? input.features : []),
    affiliateUrl: typeof input.affiliateUrl === 'string' ? input.affiliateUrl.trim() : '',
    isPopular: Boolean(input.isPopular ?? true),
    status: normalizeCourseStatus(input.status, 'active'),
    clickCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.courses.unshift(newCourse);
  await persistStore(store);

  return newCourse;
}

export async function updateExistingCourse(id: number, input: Record<string, unknown>) {
  const store = await loadStore(true);
  const idx = store.courses.findIndex((c) => c.id === id);
  if (idx === -1) {
    return null;
  }

  const existing = store.courses[idx];

  let nextSlug = existing.slug;
  if (input.slug !== undefined) {
    const candidateSlug = normalizeSlug(String(input.slug || ''));
    if (!candidateSlug) {
      throw new RepositoryError('কোর্সের বৈধ স্লাগ প্রদান করুন।', 400);
    }
    const duplicate = store.courses.some(
      (c) => c.id !== id && c.slug.toLowerCase() === candidateSlug.toLowerCase()
    );
    if (duplicate) {
      throw new RepositoryError(
        `"${candidateSlug}" স্লাগটি ইতিমধ্যে অন্য একটি কোর্সে ব্যবহৃত হচ্ছে।`,
        409
      );
    }
    nextSlug = candidateSlug;
  }

  let nextCategoryId = existing.categoryId;
  let nextCategorySlug = existing.categorySlug;
  if (input.categorySlug !== undefined) {
    const candidateCatSlug = String(input.categorySlug || '').trim();
    const matchedCat = store.categories.find((c) => c.slug === candidateCatSlug);
    if (!matchedCat) {
      throw new RepositoryError('অনুগ্রহ করে একটি বৈধ ক্যাটাগরি নির্বাচন করুন।', 400);
    }
    nextCategoryId = matchedCat.id;
    nextCategorySlug = matchedCat.slug;
  }

  const parsedOriginal =
    input.originalPrice !== undefined
      ? parseSafePrice(input.originalPrice)
      : { valid: true, value: existing.originalPrice };
  const parsedDiscount =
    input.discountPrice !== undefined
      ? parseSafePrice(input.discountPrice)
      : { valid: true, value: existing.discountPrice };

  const originalPrice = parsedOriginal.valid ? parsedOriginal.value : existing.originalPrice;
  const discountPrice = parsedDiscount.valid ? parsedDiscount.value : existing.discountPrice;
  const discountPercent = computeDiscountPercent(originalPrice, discountPrice);
  const flatSavings = Math.max(0, originalPrice - discountPrice);

  const nextDiscountBadgeText =
    typeof input.discountBadgeText === 'string'
      ? input.discountBadgeText.trim()
      : input.originalPrice !== undefined || input.discountPrice !== undefined
      ? flatSavings > 0
        ? `৳${toBengaliNumber(flatSavings)} ছাড়`
        : discountPercent > 0
        ? `${toBengaliNumber(discountPercent)}% ছাড়`
        : ''
      : existing.discountBadgeText;

  const existingFallback = normalizeCourseStatus(existing.status, 'active');

  const updated: Course = {
    ...existing,
    ...(input.title !== undefined ? { title: String(input.title).trim().slice(0, 220) } : {}),
    slug: nextSlug,
    categoryId: nextCategoryId,
    categorySlug: nextCategorySlug,
    shortBadge:
      typeof input.shortBadge === 'string'
        ? input.shortBadge.trim().slice(0, 60)
        : existing.shortBadge,
    ...(input.headerTitle !== undefined
      ? { headerTitle: String(input.headerTitle).trim().slice(0, 80) }
      : {}),
    ...(input.headerSubtitle !== undefined
      ? { headerSubtitle: String(input.headerSubtitle).trim().slice(0, 120) }
      : {}),
    ...(input.gradientTheme !== undefined
      ? { gradientTheme: String(input.gradientTheme).trim() }
      : {}),
    ...(input.description !== undefined
      ? { description: String(input.description).trim().slice(0, 1000) }
      : {}),
    ...(input.fullDescription !== undefined
      ? {
          fullDescription:
            typeof input.fullDescription === 'string' && input.fullDescription.trim()
              ? input.fullDescription.trim().slice(0, 5000)
              : null,
        }
      : {}),
    ...(input.imageUrl !== undefined
      ? {
          imageUrl:
            typeof input.imageUrl === 'string' && input.imageUrl.trim()
              ? input.imageUrl.trim()
              : null,
        }
      : {}),
    ...(input.imageFit !== undefined ? { imageFit: String(input.imageFit) } : {}),
    ...(input.affiliateUrl !== undefined
      ? { affiliateUrl: String(input.affiliateUrl).trim() }
      : {}),
    ...(input.isPopular !== undefined ? { isPopular: Boolean(input.isPopular) } : {}),
    ...(input.rating !== undefined ? { rating: String(input.rating).trim().slice(0, 10) } : {}),
    ...(input.studentCount !== undefined
      ? { studentCount: String(input.studentCount).trim().slice(0, 60) }
      : {}),
    ...(input.duration !== undefined
      ? { duration: String(input.duration).trim().slice(0, 60) }
      : {}),
    ...(input.instructorInfo !== undefined
      ? { instructorInfo: String(input.instructorInfo).trim().slice(0, 200) }
      : {}),
    targetStudents:
      typeof input.targetStudents === 'string'
        ? input.targetStudents.trim().slice(0, 200)
        : existing.targetStudents,
    originalPrice,
    discountPrice,
    discountPercent,
    discountBadgeText: nextDiscountBadgeText,
    status:
      input.status !== undefined
        ? normalizeCourseStatus(input.status, existingFallback)
        : existingFallback,
    features:
      typeof input.features === 'string'
        ? input.features
        : input.features !== undefined
        ? JSON.stringify(input.features)
        : existing.features,
    updatedAt: new Date().toISOString(),
  };

  store.courses[idx] = updated;
  await persistStore(store);

  return updated;
}

export async function deleteCourseById(id: number): Promise<{ deleted: boolean; found: boolean }> {
  const store = await loadStore(true);
  const exists = store.courses.some((c) => c.id === id);
  if (!exists) {
    return { deleted: false, found: false };
  }

  store.courses = store.courses.filter((c) => c.id !== id);
  store.clicks = store.clicks.filter((c) => c.courseId !== id);
  store.offerTimers = store.offerTimers.filter((t) => t.courseId !== id);
  await persistStore(store);

  return { deleted: true, found: true };
}

export async function createNewCategory(input: Record<string, unknown>) {
  const store = await loadStore(true);
  const name = String(input.name || '').trim();
  const slug = normalizeSlug(String(input.slug || name));

  if (!name || !slug) {
    throw new RepositoryError('ক্যাটাগরির নাম এবং স্লাগ পূরণ করা আবশ্যক।', 400);
  }

  const dup = store.categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase());
  if (dup) {
    throw new RepositoryError(`"${slug}" স্লাগসহ একটি ক্যাটাগরি ইতিমধ্যে রয়েছে।`, 409);
  }

  const newId =
    store.categories.length > 0 ? Math.max(...store.categories.map((c) => c.id)) + 1 : 1;

  const newCat: Category = {
    id: newId,
    name: name.slice(0, 120),
    slug,
    subtitle:
      typeof input.subtitle === 'string' && input.subtitle.trim()
        ? input.subtitle.trim().slice(0, 250)
        : null,
    badgeColor: String(input.badgeColor || 'red').trim().slice(0, 30),
    displayOrder: Number(input.displayOrder) || store.categories.length + 1,
    status: input.status === 'inactive' ? 'inactive' : 'active',
    createdAt: new Date().toISOString(),
  };

  store.categories.push(newCat);
  await persistStore(store);

  return newCat;
}

export async function updateExistingCategory(id: number, input: Record<string, unknown>) {
  const store = await loadStore(true);
  const idx = store.categories.findIndex((c) => c.id === id);
  if (idx === -1) {
    return null;
  }

  const existing = store.categories[idx];
  const nextName =
    input.name !== undefined ? String(input.name || '').trim() : existing.name;
  const nextSlug =
    input.slug !== undefined ? normalizeSlug(String(input.slug || '')) : existing.slug;

  if (!nextName || !nextSlug) {
    throw new RepositoryError('ক্যাটাগরির নাম এবং স্লাগ খালি রাখা যাবে না।', 400);
  }

  const dup = store.categories.some(
    (c) => c.id !== id && c.slug.toLowerCase() === nextSlug.toLowerCase()
  );
  if (dup) {
    throw new RepositoryError(`"${nextSlug}" স্লাগটি অন্য ক্যাটাগরিতে ব্যবহৃত হচ্ছে।`, 409);
  }

  const updated: Category = {
    ...existing,
    name: nextName.slice(0, 120),
    slug: nextSlug,
    subtitle:
      input.subtitle !== undefined
        ? typeof input.subtitle === 'string' && input.subtitle.trim()
          ? input.subtitle.trim().slice(0, 250)
          : null
        : existing.subtitle,
    badgeColor:
      input.badgeColor !== undefined
        ? String(input.badgeColor || 'red').trim().slice(0, 30)
        : existing.badgeColor,
    displayOrder:
      input.displayOrder !== undefined
        ? Number(input.displayOrder) || existing.displayOrder
        : existing.displayOrder,
    status:
      input.status !== undefined
        ? input.status === 'inactive'
          ? 'inactive'
          : 'active'
        : existing.status,
  };

  store.categories[idx] = updated;

  // Cascade category slug change to all linked courses so referential integrity stays intact.
  if (nextSlug !== existing.slug) {
    store.courses = store.courses.map((course) =>
      course.categoryId === id || course.categorySlug === existing.slug
        ? { ...course, categoryId: id, categorySlug: nextSlug }
        : course
    );
  }

  await persistStore(store);

  return updated;
}

export async function deleteCategoryById(id: number): Promise<{ deleted: boolean; found: boolean }> {
  const store = await loadStore(true);
  const existing = store.categories.find((c) => c.id === id);
  if (!existing) {
    return { deleted: false, found: false };
  }

  const linkedCoursesCount = store.courses.filter(
    (c) => c.categoryId === id || c.categorySlug === existing.slug
  ).length;
  if (linkedCoursesCount > 0) {
    throw new RepositoryError(
      `এই ক্যাটাগরিতে ${toBengaliNumber(linkedCoursesCount)}টি কোর্স যুক্ত রয়েছে। ক্যাটাগরি মুছে ফেলার আগে কোর্সগুলো অন্য ক্যাটাগরিতে স্থানান্তর করুন।`,
      409
    );
  }

  store.categories = store.categories.filter((c) => c.id !== id);
  await persistStore(store);

  return { deleted: true, found: true };
}

export async function updatePortalSettings(input: Record<string, unknown>) {
  const store = await loadStore(true);
  const s = store.settings;
  const updated: SiteSettings = {
    ...s,
    ...(input.siteTitle !== undefined ? { siteTitle: String(input.siteTitle).trim().slice(0, 160) } : {}),
    ...(input.whatsappNumber !== undefined
      ? { whatsappNumber: String(input.whatsappNumber).trim().slice(0, 40) }
      : {}),
    ...(input.whatsappLink !== undefined
      ? { whatsappLink: String(input.whatsappLink).trim().slice(0, 500) }
      : {}),
    ...(input.callNumber !== undefined
      ? { callNumber: String(input.callNumber).trim().slice(0, 40) }
      : {}),
    ...(input.messengerLink !== undefined
      ? { messengerLink: String(input.messengerLink).trim().slice(0, 500) }
      : {}),
    ...(input.heroBadge !== undefined ? { heroBadge: String(input.heroBadge).trim().slice(0, 200) } : {}),
    ...(input.heroTitle !== undefined ? { heroTitle: String(input.heroTitle).trim().slice(0, 200) } : {}),
    ...(input.heroSubtitle !== undefined
      ? { heroSubtitle: String(input.heroSubtitle).trim().slice(0, 500) }
      : {}),
    ...(input.showCountdownTimer !== undefined
      ? { showCountdownTimer: Boolean(input.showCountdownTimer) }
      : {}),
    ...(input.countdownLabel !== undefined
      ? { countdownLabel: String(input.countdownLabel).trim().slice(0, 200) }
      : {}),
    ...(input.countdownTargetCourse !== undefined
      ? { countdownTargetCourse: String(input.countdownTargetCourse).trim().slice(0, 120) }
      : {}),
    ...(input.countdownTargetDate !== undefined
      ? { countdownTargetDate: String(input.countdownTargetDate).trim().slice(0, 80) }
      : {}),
    ...(input.defaultAffiliateRef !== undefined
      ? { defaultAffiliateRef: String(input.defaultAffiliateRef).trim().slice(0, 120) }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  store.settings = updated;
  await persistStore(store);

  return updated;
}

export async function saveCustomerInquiry(input: {
  name: string;
  phoneOrEmail: string;
  message: string;
  courseTitle?: string;
}): Promise<CustomerInquiry> {
  const store = await loadStore(true);

  const newId =
    store.inquiries.length > 0 ? Math.max(...store.inquiries.map((i) => i.id)) + 1 : 1;
  const newInquiry: CustomerInquiry = {
    id: newId,
    name: (input.name?.trim() || 'Anonymous').slice(0, 100),
    phoneOrEmail: (input.phoneOrEmail?.trim() || '').slice(0, 120),
    message: (input.message?.trim() || '').slice(0, 2000),
    courseTitle: input.courseTitle?.trim().slice(0, 200) || undefined,
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  store.inquiries.unshift(newInquiry);
  if (store.inquiries.length > 300) {
    store.inquiries = store.inquiries.slice(0, 300);
  }
  await persistStore(store);

  return newInquiry;
}

export async function getCustomerInquiries(): Promise<CustomerInquiry[]> {
  const store = await loadStore(true);
  return store.inquiries;
}

export async function updateCustomerInquiryStatus(
  id: number,
  status: 'new' | 'resolved'
): Promise<CustomerInquiry | null> {
  const store = await loadStore(true);
  const idx = store.inquiries.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const updated: CustomerInquiry = { ...store.inquiries[idx], status };
  store.inquiries[idx] = updated;
  await persistStore(store);
  return updated;
}

export async function deleteCustomerInquiry(
  id: number
): Promise<{ deleted: boolean; found: boolean }> {
  const store = await loadStore(true);
  const exists = store.inquiries.some((i) => i.id === id);
  if (!exists) {
    return { deleted: false, found: false };
  }
  store.inquiries = store.inquiries.filter((i) => i.id !== id);
  await persistStore(store);
  return { deleted: true, found: true };
}

export async function getOfferTimers(): Promise<{ timers: OfferTimer[]; serverNow: string }> {
  const store = await loadStore(true);
  return {
    timers: hydrateOfferTimers(store),
    serverNow: new Date().toISOString(),
  };
}

function validateOfferTimerPayload(
  store: LocalStore,
  input: {
    courseId?: unknown;
    startAt?: unknown;
    endAt?: unknown;
    offerLabel?: unknown;
    isPaused?: unknown;
  },
  excludeTimerId?: number
):
  | {
      valid: true;
      course: Course;
      startIso: string;
      endIso: string;
      offerLabel: string;
      isPaused: boolean;
    }
  | { valid: false; error: string; status: number } {
  const courseId = Number(input.courseId);
  const course = store.courses.find((c) => c.id === courseId);
  if (!course) {
    return {
      valid: false,
      error: 'অনুগ্রহ করে একটি বৈধ কোর্স নির্বাচন করুন।',
      status: 400,
    };
  }

  const startMs = new Date(String(input.startAt || '')).getTime();
  const endMs = new Date(String(input.endAt || '')).getTime();
  const nowMs = Date.now();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return {
      valid: false,
      error: 'অফার শুরু এবং শেষের সঠিক তারিখ ও সময় নির্বাচন করুন।',
      status: 400,
    };
  }

  if (endMs <= nowMs) {
    return {
      valid: false,
      error: 'অফার শেষের সময় (End Date & Time) অবশ্যই বর্তমান সময়ের পরবর্তী হতে হবে।',
      status: 400,
    };
  }

  if (endMs <= startMs) {
    return {
      valid: false,
      error: 'অফার শেষের সময় অবশ্যই শুরুর সময়ের চেয়ে বেশি হতে হবে।',
      status: 400,
    };
  }

  const isPaused = Boolean(input.isPaused);
  if (!isPaused) {
    const timers = store.offerTimers;
    const conflicting = timers.find((t) => {
      if (excludeTimerId !== undefined && t.id === excludeTimerId) return false;
      if (Number(t.courseId) !== course.id) return false;
      const st = computeOfferTimerStatus(t, nowMs);
      return st === 'active' || st === 'scheduled';
    });

    if (conflicting) {
      return {
        valid: false,
        error: `"${course.title}" কোর্সের জন্য ইতিমধ্যে একটি সক্রিয় বা নির্ধারিত (Active/Scheduled) অফার টাইমার রয়েছে।`,
        status: 409,
      };
    }
  }

  const offerLabel =
    typeof input.offerLabel === 'string' && input.offerLabel.trim()
      ? input.offerLabel.trim().slice(0, 160)
      : 'সীমিত সময়ের স্পেশাল অফার!';

  return {
    valid: true,
    course,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    offerLabel,
    isPaused,
  };
}

export async function createOfferTimer(input: {
  courseId?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  offerLabel?: unknown;
  isPaused?: unknown;
}): Promise<
  | { ok: true; timer: OfferTimer; serverNow: string }
  | { ok: false; error: string; status: number }
> {
  const store = await loadStore(true);

  const validation = validateOfferTimerPayload(store, input);
  if (!validation.valid) {
    return { ok: false, error: validation.error, status: validation.status };
  }

  const newId =
    store.offerTimers.length > 0
      ? Math.max(...store.offerTimers.map((t) => t.id)) + 1
      : 1;
  const nowIso = new Date().toISOString();

  const newTimer: OfferTimer = {
    id: newId,
    courseId: validation.course.id,
    courseSlug: validation.course.slug,
    courseTitle: validation.course.title,
    courseImageUrl: validation.course.imageUrl || null,
    affiliateUrl: validation.course.affiliateUrl || `/go/${validation.course.slug}`,
    offerLabel: validation.offerLabel,
    startAt: validation.startIso,
    endAt: validation.endIso,
    isPaused: validation.isPaused,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.offerTimers.unshift(newTimer);
  // Ensure the homepage countdown banner is enabled when admin explicitly adds an active timer.
  if (!validation.isPaused && store.settings.showCountdownTimer === false) {
    store.settings = {
      ...store.settings,
      showCountdownTimer: true,
      updatedAt: nowIso,
    };
  }
  await persistStore(store);

  return { ok: true, timer: newTimer, serverNow: nowIso };
}

export async function updateOfferTimer(
  id: number,
  input: {
    courseId?: unknown;
    startAt?: unknown;
    endAt?: unknown;
    offerLabel?: unknown;
    isPaused?: unknown;
  }
): Promise<
  | { ok: true; timer: OfferTimer; serverNow: string }
  | { ok: false; error: string; status: number }
> {
  const store = await loadStore(true);

  const idx = store.offerTimers.findIndex((t) => t.id === id);
  if (idx === -1) {
    return { ok: false, error: 'অফার টাইমারটি পাওয়া যায়নি।', status: 404 };
  }

  const existing = store.offerTimers[idx];
  const merged = {
    courseId: input.courseId !== undefined ? input.courseId : existing.courseId,
    startAt: input.startAt !== undefined ? input.startAt : existing.startAt,
    endAt: input.endAt !== undefined ? input.endAt : existing.endAt,
    offerLabel: input.offerLabel !== undefined ? input.offerLabel : existing.offerLabel,
    isPaused: input.isPaused !== undefined ? input.isPaused : existing.isPaused,
  };

  const validation = validateOfferTimerPayload(store, merged, id);
  if (!validation.valid) {
    return { ok: false, error: validation.error, status: validation.status };
  }

  const nowIso = new Date().toISOString();
  const updated: OfferTimer = {
    ...existing,
    courseId: validation.course.id,
    courseSlug: validation.course.slug,
    courseTitle: validation.course.title,
    courseImageUrl: validation.course.imageUrl || null,
    affiliateUrl: validation.course.affiliateUrl || `/go/${validation.course.slug}`,
    offerLabel: validation.offerLabel,
    startAt: validation.startIso,
    endAt: validation.endIso,
    isPaused: validation.isPaused,
    updatedAt: nowIso,
  };

  store.offerTimers[idx] = updated;
  await persistStore(store);

  return { ok: true, timer: updated, serverNow: nowIso };
}

export async function setOfferTimerPaused(
  id: number,
  isPaused: boolean
): Promise<
  | { ok: true; timer: OfferTimer; serverNow: string }
  | { ok: false; error: string; status: number }
> {
  const store = await loadStore(true);

  const idx = store.offerTimers.findIndex((t) => t.id === id);
  if (idx === -1) {
    return { ok: false, error: 'অফার টাইমারটি পাওয়া যায়নি।', status: 404 };
  }

  const existing = store.offerTimers[idx];
  const nowMs = Date.now();
  const endMs = new Date(existing.endAt).getTime();

  if (!isPaused) {
    if (!Number.isFinite(endMs) || endMs <= nowMs) {
      return {
        ok: false,
        error: 'মেয়াদ উত্তীর্ণ (Expired) টাইমার পুনরায় চালু করা যাবে না। অনুগ্রহ করে এডিট করে নতুন শেষ সময় দিন।',
        status: 400,
      };
    }

    const conflicting = store.offerTimers.find((t) => {
      if (t.id === id) return false;
      if (Number(t.courseId) !== Number(existing.courseId)) return false;
      const st = computeOfferTimerStatus(t, nowMs);
      return st === 'active' || st === 'scheduled';
    });

    if (conflicting) {
      return {
        ok: false,
        error: `"${existing.courseTitle}" কোর্সের জন্য ইতিমধ্যে আরেকটি সক্রিয়/নির্ধারিত টাইমার চালু আছে।`,
        status: 409,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const updated: OfferTimer = {
    ...existing,
    isPaused,
    updatedAt: nowIso,
  };
  store.offerTimers[idx] = updated;
  await persistStore(store);

  const hydrated = hydrateOfferTimers(store).find((t) => t.id === id) || updated;
  return { ok: true, timer: hydrated, serverNow: nowIso };
}

export async function deleteOfferTimer(
  id: number
): Promise<{ deleted: boolean; found: boolean }> {
  const store = await loadStore(true);
  const exists = store.offerTimers.some((t) => t.id === id);
  if (!exists) {
    return { deleted: false, found: false };
  }
  store.offerTimers = store.offerTimers.filter((t) => t.id !== id);
  await persistStore(store);
  return { deleted: true, found: true };
}
