import fs from 'fs';
import path from 'path';
import { cache } from 'react';
import {
  Category,
  Course,
  CourseFeatureItem,
  ClickRecord,
  SiteSettings,
  OfferTimer,
} from '../types.ts';
import { INITIAL_CATEGORIES, INITIAL_SETTINGS } from './seedData.ts';
import { computeDiscountPercent, syncTargetStudentsMetadata } from '../lib/courseValidation.ts';
import { computeOfferTimerStatus } from '../lib/offerTimerUtils.ts';
import {
  MAX_COURSE_FEATURES_PER_COURSE,
  MAX_COURSE_FEATURE_TITLE_LENGTH,
  extractActiveFeatureTitles,
  getCourseFeatureItems,
  normalizeCourseFeatureIcon,
  normalizeCourseFeatureItems,
} from '../lib/courseFeatures.ts';
import { toBengaliNumber } from '../utils/format.ts';
import { isSupabaseDatabaseReady } from '../lib/supabase/config.ts';
import { invalidatePublicPortalCache } from '../lib/cacheInvalidation.ts';
import {
  DEFAULT_SELECTOR_ICON_IDS,
  cloneDefaultSelectorIconLabels,
  normalizeSelectorIconLabels,
  normalizeSelectorIconOrder,
  type SelectorIconConfig,
  type SelectorIconId,
  type SelectorIconLabelsMap,
  type SelectorIconText,
} from '../lib/selectorIconOrder.ts';
import {
  RepositoryError,
  moveCourseToPosition,
  normalizeContiguousCourseOrder,
  normalizeCourseStatus,
  normalizeSlug,
  parseCategoryDisplayOrder,
  parseCourseDisplayOrder,
  parseSafePrice,
  sortCategoriesByOrder,
  sortCoursesByOrder,
  type StorageInfo,
} from './repositoryShared.ts';
import {
  getSupabaseStorageInfo,
  sbCountCoursesUsingImageUrl,
  sbCreateCourseFeature,
  sbCreateNewCategory,
  sbCreateNewCourse,
  sbCreateOfferTimer,
  sbDeleteCategoryById,
  sbDeleteCourseById,
  sbDeleteCourseFeature,
  sbDeleteOfferTimer,
  sbGetAdminCoursesList,
  sbGetAdminOverviewData,
  sbGetCourseById,
  sbGetCourseBySlug,
  sbGetCourseFeatures,
  sbGetOfferTimers,
  sbGetPortalSettings,
  sbGetPublicPortalData,
  sbGetSelectorIconConfig,
  sbGetSelectorIconOrder,
  sbRecordCourseClick,
  sbReorderCourseFeatures,
  sbReorderCoursePosition,
  sbReplaceCourseFeatures,
  sbSaveSelectorIconConfig,
  sbSaveSelectorIconOrder,
  sbSetOfferTimerPaused,
  sbSwapCategoryOrder,
  sbSwapCourseOrder,
  sbUpdateCourseFeature,
  sbUpdateExistingCategory,
  sbUpdateExistingCourse,
  sbUpdateOfferTimer,
  sbUpdatePortalSettings,
} from './supabaseRepository.ts';
import { getAdminBookStoreData } from './bookRepository.ts';

export {
  RepositoryError,
  normalizeCourseStatus,
  parseSafePrice,
  type StorageInfo,
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

interface LocalStore {
  categories: Category[];
  courses: Course[];
  clicks: ClickRecord[];
  settings: SiteSettings;
  offerTimers: OfferTimer[];
  selectorIconOrder?: SelectorIconId[];
  selectorIconLabels?: SelectorIconLabelsMap;
}

export function getStorageInfo(): StorageInfo {
  if (isSupabaseDatabaseReady()) {
    return getSupabaseStorageInfo();
  }
  const onVercel = process.env.VERCEL === '1';
  return {
    backend: 'local-json',
    persistentOnVercel: false,
    ...(onVercel
      ? {
          warning:
            'Vercel Production-এ স্থায়ী ডাটা সংরক্ষণের জন্য Supabase PostgreSQL (`NEXT_PUBLIC_SUPABASE_URL` এবং `SUPABASE_SECRET_KEY`) কনফিগার করা আবশ্যক।',
        }
      : {
          warning:
            'বর্তমানে লোকাল JSON প্রিভিউ মোড চালু রয়েছে। Production-এ Supabase PostgreSQL এনভায়রনমেন্ট ভ্যারিয়েবল যুক্ত করলে স্বয়ংক্রিয়ভাবে PostgreSQL ডাটাবেস ব্যবহৃত হবে।',
        }),
  };
}

let cachedStore: LocalStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function buildDefaultStore(): LocalStore {
  return {
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c })),
    courses: [],
    clicks: [],
    settings: { ...INITIAL_SETTINGS },
    offerTimers: [],
    selectorIconOrder: [...DEFAULT_SELECTOR_ICON_IDS],
    selectorIconLabels: cloneDefaultSelectorIconLabels(),
  };
}

function normalizeStoreShape(raw: Partial<LocalStore> | null | undefined): LocalStore {
  const defaults = buildDefaultStore();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const rawCategories =
    Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories
      : defaults.categories;

  const sortedRawCategories = sortCategoriesByOrder(
    rawCategories.map((c) => ({
      ...c,
      displayOrder: Math.max(1, Math.round(Number(c.displayOrder) || 1)),
    }))
  );

  // Guard local JSON against legacy duplicate displayOrder values
  const seenOrders = new Set<number>();
  let nextOrderCursor = 1;
  const deduplicatedCategories = sortedRawCategories.map((c) => {
    if (!seenOrders.has(c.displayOrder)) {
      seenOrders.add(c.displayOrder);
      nextOrderCursor = Math.max(nextOrderCursor, c.displayOrder + 1);
      return c;
    }
    while (seenOrders.has(nextOrderCursor)) {
      nextOrderCursor += 1;
    }
    seenOrders.add(nextOrderCursor);
    const repaired = { ...c, displayOrder: nextOrderCursor };
    nextOrderCursor += 1;
    return repaired;
  });

  const normalizedCourses = Array.isArray(raw.courses)
    ? normalizeContiguousCourseOrder(
        raw.courses.map((c) => {
          const base = {
            ...c,
            displayOrder:
              typeof c.displayOrder === 'number' && Number.isFinite(c.displayOrder) && c.displayOrder >= 1
                ? Math.round(c.displayOrder)
                : 0,
          };
          return {
            ...base,
            courseFeatures: Array.isArray(c.courseFeatures)
              ? normalizeCourseFeatureItems(c.courseFeatures, c.id)
              : getCourseFeatureItems(base, { includeInactive: true }),
          };
        })
      )
    : [];

  return {
    categories: sortCategoriesByOrder(deduplicatedCategories),
    courses: normalizedCourses,
    clicks: Array.isArray(raw.clicks) ? raw.clicks : [],
    settings: raw.settings ? { ...defaults.settings, ...raw.settings } : defaults.settings,
    offerTimers: Array.isArray(raw.offerTimers) ? raw.offerTimers : [],
    selectorIconOrder: normalizeSelectorIconOrder(raw.selectorIconOrder),
    selectorIconLabels: normalizeSelectorIconLabels(raw.selectorIconLabels),
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

  const initial = buildDefaultStore();
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

async function loadStore(forceFresh = false): Promise<LocalStore> {
  if (cachedStore && !forceFresh) {
    return cachedStore;
  }

  const local = readLocalFileStore();
  cachedStore = local;
  return local;
}

async function persistStore(store: LocalStore): Promise<void> {
  // Never silently pretend writes persisted on Vercel serverless without Supabase PostgreSQL.
  if (process.env.VERCEL === '1') {
    throw new RepositoryError(
      'Vercel Production-এ ডাটাবেস কনফিগার করা হয়নি। স্থায়ী ডাটা সংরক্ষণের জন্য Vercel Environment Variables-এ `NEXT_PUBLIC_SUPABASE_URL` এবং `SUPABASE_SECRET_KEY` সেট করুন।',
      503
    );
  }

  cachedStore = store;
  const serialized = JSON.stringify(store, null, 2);

  const runPersist = async () => {
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

export const getPublicPortalData = cache(async () => {
  if (isSupabaseDatabaseReady()) {
    return sbGetPublicPortalData();
  }

  const store = await loadStore();
  const activeCategories = sortCategoriesByOrder(
    store.categories.filter((c) => c.status === 'active')
  );

  // Approved Option 2 visibility: Public visitors see `active` and `closed` courses only; `inactive` is hidden.
  const publicCourses = sortCoursesByOrder(
    store.courses.filter((c) => c.status === 'active' || c.status === 'closed')
  ).map((c) => ({
    ...c,
    courseFeatures: getCourseFeatureItems(c, { includeInactive: false }),
  }));

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const activeCourseIds = new Set(
    publicCourses.filter((c) => c.status === 'active').map((c) => c.id)
  );
  const allHydratedTimers = hydrateOfferTimers(store);
  const offerTimers = allHydratedTimers.filter((t) => {
    if (!activeCourseIds.has(t.courseId)) return false;
    const status = computeOfferTimerStatus(t, nowMs);
    return status === 'active' || status === 'scheduled';
  });

  return {
    categories: activeCategories,
    courses: publicCourses,
    settings: store.settings,
    offerTimers,
    hasOfferTimers: allHydratedTimers.length > 0,
    selectorIconOrder: normalizeSelectorIconOrder(store.selectorIconOrder),
    selectorIconLabels: normalizeSelectorIconLabels(store.selectorIconLabels),
    serverNow: nowIso,
  };
});

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  if (isSupabaseDatabaseReady()) {
    return sbGetCourseBySlug(slug);
  }

  const store = await loadStore();
  const cleanSlug = slug.trim();
  const found = store.courses.find(
    (c) => c.slug === cleanSlug && (c.status === 'active' || c.status === 'closed')
  );
  if (!found) return null;
  return {
    ...found,
    courseFeatures: getCourseFeatureItems(found, { includeInactive: false }),
  };
}

export async function getCourseById(id: number): Promise<Course | null> {
  if (isSupabaseDatabaseReady()) {
    return sbGetCourseById(id);
  }

  const store = await loadStore(true);
  const found = store.courses.find((c) => c.id === id);
  if (!found) return null;
  return {
    ...found,
    courseFeatures: getCourseFeatureItems(found, { includeInactive: true }),
  };
}

export async function countCoursesUsingImageUrl(
  imageUrl: string,
  excludeCourseId?: number
): Promise<number> {
  if (isSupabaseDatabaseReady()) {
    return sbCountCoursesUsingImageUrl(imageUrl, excludeCourseId);
  }

  const store = await loadStore(true);
  return store.courses.filter(
    (c) => c.imageUrl === imageUrl && (excludeCourseId === undefined || c.id !== excludeCourseId)
  ).length;
}

export async function getPortalSettings(): Promise<SiteSettings> {
  if (isSupabaseDatabaseReady()) {
    return sbGetPortalSettings();
  }

  const store = await loadStore();
  return store.settings;
}

export async function recordCourseClick(
  slug: string,
  referrer?: string | null,
  userAgent?: string | null
) {
  if (isSupabaseDatabaseReady()) {
    return sbRecordCourseClick(slug, referrer, userAgent);
  }

  const store = await loadStore(true);
  const cleanSlug = slug.trim();
  const course = store.courses.find((c) => c.slug === cleanSlug && c.status === 'active');
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

  if (process.env.VERCEL !== '1') {
    await persistStore(store);
  }

  return {
    affiliateUrl: course.affiliateUrl,
    courseTitle: course.title,
    clickCount: course.clickCount,
    status: course.status,
  };
}

export async function getAdminCoursesList(): Promise<Course[]> {
  if (isSupabaseDatabaseReady()) {
    return sbGetAdminCoursesList();
  }
  const store = await loadStore(true);
  return normalizeContiguousCourseOrder(store.courses);
}

export async function getAdminOverviewData() {
  if (isSupabaseDatabaseReady()) {
    return sbGetAdminOverviewData();
  }

  const [store, bookData] = await Promise.all([
    loadStore(true),
    getAdminBookStoreData().catch(() => null),
  ]);

  const allCategories = sortCategoriesByOrder(store.categories);
  const allCourses = normalizeContiguousCourseOrder(store.courses);
  const currentSettings = store.settings;

  const totalCourses = allCourses.length;
  const activeCourses = allCourses.filter((c) => c.status === 'active').length;
  const closedCourses = allCourses.filter((c) => c.status === 'closed').length;
  const hiddenCourses = allCourses.filter((c) => c.status === 'inactive').length;
  const inactiveCourses = totalCourses - activeCourses;
  const popularCourses = allCourses.filter((c) => c.isPopular).length;
  const courseClickSum = allCourses.reduce((sum, c) => sum + (c.clickCount || 0), 0);
  const totalClicks = Math.max(courseClickSum, store.clicks.length);

  return {
    stats: {
      totalCourses,
      activeCourses,
      closedCourses,
      hiddenCourses,
      inactiveCourses,
      popularCourses,
      totalClicks,
      totalCategories: allCategories.length,
    },
    bookStats: {
      totalBooks: bookData?.stats?.totalBooks ?? 0,
      activeBooks: bookData?.stats?.activeBooks ?? 0,
    },
    categories: allCategories,
    courses: allCourses,
    recentClicks: [] as ClickRecord[],
    settings: currentSettings,
    offerTimers: hydrateOfferTimers(store),
    selectorIconOrder: normalizeSelectorIconOrder(store.selectorIconOrder),
    selectorIconLabels: normalizeSelectorIconLabels(store.selectorIconLabels),
    storageInfo: getStorageInfo(),
    serverNow: new Date().toISOString(),
  };
}

export async function createNewCourse(input: Record<string, unknown>) {
  if (isSupabaseDatabaseReady()) {
    const created = await sbCreateNewCourse(input);
    invalidatePublicPortalCache();
    return created;
  }

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

  const syncedTargets = syncTargetStudentsMetadata({
    targetStudents: input.targetStudents,
    targetBatch: input.targetBatch,
    targetGroups: input.targetGroups,
  });
  if (!syncedTargets.valid) {
    throw new RepositoryError(
      syncedTargets.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।',
      400
    );
  }

  let requestedDisplayOrder: number | null = null;
  if (
    input.displayOrder !== undefined &&
    input.displayOrder !== null &&
    String(input.displayOrder).trim() !== ''
  ) {
    const parsedOrder = parseCourseDisplayOrder(input.displayOrder);
    if (!parsedOrder.valid) {
      throw new RepositoryError(parsedOrder.error, 400);
    }
    requestedDisplayOrder = parsedOrder.value;
  }

  const nowIso = new Date().toISOString();
  const normalizedFeatures = Array.isArray(input.courseFeatures)
    ? normalizeCourseFeatureItems(input.courseFeatures, newId)
    : getCourseFeatureItems(
        {
          id: newId,
          features:
            typeof input.features === 'string'
              ? input.features
              : JSON.stringify(Array.isArray(input.features) ? input.features : []),
          duration: typeof input.duration === 'string' ? input.duration.trim() : '',
          instructorInfo: String(
            input.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল'
          ),
          categorySlug: matchedCategory.slug,
        },
        { includeInactive: true }
      );
  const syncedFeaturesJson = JSON.stringify(extractActiveFeatureTitles(normalizedFeatures));

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
    rating:
      input.rating === null || input.rating === undefined
        ? ''
        : String(input.rating).trim().slice(0, 10),
    studentCount:
      input.studentCount === null || input.studentCount === undefined
        ? ''
        : String(input.studentCount).trim().slice(0, 60),
    duration:
      input.duration === null || input.duration === undefined
        ? ''
        : String(input.duration).trim().slice(0, 60),
    targetStudents: syncedTargets.targetStudents,
    targetBatch: syncedTargets.targetBatch,
    targetGroups: syncedTargets.targetGroups,
    instructorInfo: String(
      input.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল'
    ).trim().slice(0, 200),
    instructorIcon: String(input.instructorIcon || 'school').trim().slice(0, 50),
    features: syncedFeaturesJson,
    courseFeatures: normalizedFeatures,
    affiliateUrl: typeof input.affiliateUrl === 'string' ? input.affiliateUrl.trim() : '',
    displayOrder: requestedDisplayOrder ?? 1,
    isPopular: Boolean(input.isPopular ?? true),
    status: normalizeCourseStatus(input.status, 'active'),
    clickCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.courses = moveCourseToPosition(
    [newCourse, ...store.courses],
    newCourse.id,
    requestedDisplayOrder ?? 1
  );
  await persistStore(store);
  invalidatePublicPortalCache();

  return store.courses.find((c) => c.id === newCourse.id) || newCourse;
}

export async function updateExistingCourse(id: number, input: Record<string, unknown>) {
  if (isSupabaseDatabaseReady()) {
    const updated = await sbUpdateExistingCourse(id, input);
    if (updated) {
      invalidatePublicPortalCache();
    }
    return updated;
  }

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
    ...(input.rating !== undefined
      ? { rating: input.rating === null ? '' : String(input.rating).trim().slice(0, 10) }
      : {}),
    ...(input.studentCount !== undefined
      ? {
          studentCount:
            input.studentCount === null ? '' : String(input.studentCount).trim().slice(0, 60),
        }
      : {}),
    ...(input.duration !== undefined
      ? { duration: input.duration === null ? '' : String(input.duration).trim().slice(0, 60) }
      : {}),
    ...(input.instructorInfo !== undefined
      ? { instructorInfo: String(input.instructorInfo).trim().slice(0, 200) }
      : {}),
    ...((): {
      targetStudents: string | null;
      targetBatch?: string | null;
      targetGroups?: Course['targetGroups'];
    } => {
      if (
        input.targetStudents === undefined &&
        input.targetBatch === undefined &&
        input.targetGroups === undefined
      ) {
        return {
          targetStudents: existing.targetStudents,
          targetBatch: existing.targetBatch,
          targetGroups: existing.targetGroups,
        };
      }
      const synced = syncTargetStudentsMetadata({
        targetStudents:
          input.targetStudents !== undefined ? input.targetStudents : existing.targetStudents,
        targetBatch: input.targetBatch,
        targetGroups: input.targetGroups,
      });
      if (!synced.valid) {
        throw new RepositoryError(
          synced.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।',
          400
        );
      }
      return {
        targetStudents: synced.targetStudents,
        targetBatch: synced.targetBatch,
        targetGroups: synced.targetGroups,
      };
    })(),
    originalPrice,
    discountPrice,
    discountPercent,
    discountBadgeText: nextDiscountBadgeText,
    status:
      input.status !== undefined
        ? normalizeCourseStatus(input.status, existingFallback)
        : existingFallback,
    features: (() => {
      if (Array.isArray(input.courseFeatures)) {
        const normalized = normalizeCourseFeatureItems(input.courseFeatures, id);
        return JSON.stringify(extractActiveFeatureTitles(normalized));
      }
      if (typeof input.features === 'string') return input.features;
      if (input.features !== undefined) return JSON.stringify(input.features);
      return existing.features;
    })(),
    courseFeatures: (() => {
      if (Array.isArray(input.courseFeatures)) {
        return normalizeCourseFeatureItems(input.courseFeatures, id);
      }
      if (input.features !== undefined) {
        const legacyStr =
          typeof input.features === 'string'
            ? input.features
            : JSON.stringify(input.features);
        return getCourseFeatureItems(
          { ...existing, features: legacyStr, courseFeatures: undefined },
          { includeInactive: true }
        );
      }
      return existing.courseFeatures;
    })(),
    updatedAt: new Date().toISOString(),
  };

  let requestedDisplayOrder: number | null = null;
  if (
    input.displayOrder !== undefined &&
    input.displayOrder !== null &&
    String(input.displayOrder).trim() !== ''
  ) {
    const parsedOrder = parseCourseDisplayOrder(input.displayOrder);
    if (!parsedOrder.valid) {
      throw new RepositoryError(parsedOrder.error, 400);
    }
    requestedDisplayOrder = parsedOrder.value;
  }

  store.courses[idx] = updated;
  if (requestedDisplayOrder !== null && requestedDisplayOrder !== existing.displayOrder) {
    store.courses = moveCourseToPosition(store.courses, id, requestedDisplayOrder);
  }
  await persistStore(store);
  invalidatePublicPortalCache();

  return store.courses.find((c) => c.id === id) || updated;
}

export async function getCourseFeatures(courseId: number): Promise<CourseFeatureItem[]> {
  if (isSupabaseDatabaseReady()) {
    return sbGetCourseFeatures(courseId);
  }
  const store = await loadStore(true);
  const course = store.courses.find((c) => c.id === courseId);
  if (!course) {
    throw new RepositoryError('কোর্সটি খুঁজে পাওয়া যায়নি।', 404);
  }
  return getCourseFeatureItems(course, { includeInactive: true });
}

export async function replaceCourseFeatures(
  courseId: number,
  rawFeatures: Array<{
    id?: unknown;
    title?: unknown;
    icon?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  }>
): Promise<CourseFeatureItem[]> {
  if (isSupabaseDatabaseReady()) {
    const saved = await sbReplaceCourseFeatures(courseId, rawFeatures);
    invalidatePublicPortalCache();
    return saved;
  }
  const store = await loadStore(true);
  const idx = store.courses.findIndex((c) => c.id === courseId);
  if (idx === -1) {
    throw new RepositoryError('কোর্সটি খুঁজে পাওয়া যায়নি।', 404);
  }
  const normalized = normalizeCourseFeatureItems(rawFeatures, courseId);
  store.courses[idx] = {
    ...store.courses[idx],
    courseFeatures: normalized,
    features: JSON.stringify(extractActiveFeatureTitles(normalized)),
    updatedAt: new Date().toISOString(),
  };
  await persistStore(store);
  invalidatePublicPortalCache();
  return normalized;
}

export async function createCourseFeature(
  courseId: number,
  input: { title: unknown; icon?: unknown; isActive?: unknown; sortOrder?: unknown }
): Promise<{ feature: CourseFeatureItem; features: CourseFeatureItem[] }> {
  if (isSupabaseDatabaseReady()) {
    const result = await sbCreateCourseFeature(courseId, input);
    invalidatePublicPortalCache();
    return result;
  }
  const title = String(input.title || '').trim().slice(0, MAX_COURSE_FEATURE_TITLE_LENGTH);
  if (!title) {
    throw new RepositoryError('ফিচারের শিরোনাম পূরণ করা আবশ্যক।', 400);
  }
  const store = await loadStore(true);
  const idx = store.courses.findIndex((c) => c.id === courseId);
  if (idx === -1) {
    throw new RepositoryError('কোর্সটি খুঁজে পাওয়া যায়নি।', 404);
  }
  const current = getCourseFeatureItems(store.courses[idx], { includeInactive: true });
  if (current.length >= MAX_COURSE_FEATURES_PER_COURSE) {
    throw new RepositoryError(
      `একটি কোর্সে সর্বোচ্চ ${toBengaliNumber(MAX_COURSE_FEATURES_PER_COURSE)}টি ফিচার যুক্ত করা যাবে।`,
      400
    );
  }
  const maxId = current.reduce((m, item) => Math.max(m, item.id), 0);
  const nowIso = new Date().toISOString();
  const desiredOrder =
    Number.isFinite(Number(input.sortOrder)) && Number(input.sortOrder) >= 1
      ? Math.min(current.length + 1, Math.round(Number(input.sortOrder)))
      : current.length + 1;
  const created: CourseFeatureItem = {
    id: maxId + 1,
    courseId,
    title,
    icon: normalizeCourseFeatureIcon(input.icon, title, current.length),
    sortOrder: desiredOrder,
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const nextList = [...current];
  nextList.splice(desiredOrder - 1, 0, created);
  const normalized = nextList.map((item, i) => ({ ...item, sortOrder: i + 1 }));
  store.courses[idx] = {
    ...store.courses[idx],
    courseFeatures: normalized,
    features: JSON.stringify(extractActiveFeatureTitles(normalized)),
    updatedAt: nowIso,
  };
  await persistStore(store);
  invalidatePublicPortalCache();
  return {
    feature: normalized.find((item) => item.id === created.id) || created,
    features: normalized,
  };
}

export async function updateCourseFeature(
  courseId: number,
  featureId: number,
  input: Partial<{ title: unknown; icon: unknown; isActive: unknown; sortOrder: unknown }>
): Promise<{ feature: CourseFeatureItem; features: CourseFeatureItem[] } | null> {
  if (isSupabaseDatabaseReady()) {
    const result = await sbUpdateCourseFeature(courseId, featureId, input);
    if (result) invalidatePublicPortalCache();
    return result;
  }
  const store = await loadStore(true);
  const idx = store.courses.findIndex((c) => c.id === courseId);
  if (idx === -1) {
    throw new RepositoryError('কোর্সটি খুঁজে পাওয়া যায়নি।', 404);
  }
  const current = getCourseFeatureItems(store.courses[idx], { includeInactive: true });
  const target = current.find((item) => item.id === featureId);
  if (!target) return null;

  const nextTitle =
    input.title !== undefined
      ? String(input.title || '').trim().slice(0, MAX_COURSE_FEATURE_TITLE_LENGTH)
      : target.title;
  if (!nextTitle) {
    throw new RepositoryError('ফিচারের শিরোনাম খালি রাখা যাবে না।', 400);
  }
  const nowIso = new Date().toISOString();
  let updatedList = current.map((item) =>
    item.id === featureId
      ? {
          ...item,
          title: nextTitle,
          icon:
            input.icon !== undefined
              ? normalizeCourseFeatureIcon(input.icon, nextTitle, item.sortOrder - 1)
              : item.icon,
          isActive: input.isActive !== undefined ? Boolean(input.isActive) : item.isActive,
          updatedAt: nowIso,
        }
      : item
  );
  if (input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder))) {
    const targetPos = Math.min(updatedList.length, Math.max(1, Math.round(Number(input.sortOrder))));
    const moving = updatedList.find((f) => f.id === featureId)!;
    const others = updatedList.filter((f) => f.id !== featureId);
    others.splice(targetPos - 1, 0, moving);
    updatedList = others.map((f, i) => ({ ...f, sortOrder: i + 1 }));
  }

  store.courses[idx] = {
    ...store.courses[idx],
    courseFeatures: updatedList,
    features: JSON.stringify(extractActiveFeatureTitles(updatedList)),
    updatedAt: nowIso,
  };
  await persistStore(store);
  invalidatePublicPortalCache();
  return {
    feature: updatedList.find((f) => f.id === featureId)!,
    features: updatedList,
  };
}

export async function deleteCourseFeature(
  courseId: number,
  featureId: number
): Promise<{ deleted: boolean; features: CourseFeatureItem[] }> {
  if (isSupabaseDatabaseReady()) {
    const result = await sbDeleteCourseFeature(courseId, featureId);
    if (result.deleted) invalidatePublicPortalCache();
    return result;
  }
  const store = await loadStore(true);
  const idx = store.courses.findIndex((c) => c.id === courseId);
  if (idx === -1) {
    throw new RepositoryError('কোর্সটি খুঁজে পাওয়া যায়নি।', 404);
  }
  const current = getCourseFeatureItems(store.courses[idx], { includeInactive: true });
  if (!current.some((f) => f.id === featureId)) {
    return { deleted: false, features: current };
  }
  const nextList = current
    .filter((f) => f.id !== featureId)
    .map((f, i) => ({ ...f, sortOrder: i + 1 }));
  store.courses[idx] = {
    ...store.courses[idx],
    courseFeatures: nextList,
    features: JSON.stringify(extractActiveFeatureTitles(nextList)),
    updatedAt: new Date().toISOString(),
  };
  await persistStore(store);
  invalidatePublicPortalCache();
  return { deleted: true, features: nextList };
}

export async function reorderCourseFeatures(
  courseId: number,
  orderedIds: number[]
): Promise<CourseFeatureItem[]> {
  if (isSupabaseDatabaseReady()) {
    const reordered = await sbReorderCourseFeatures(courseId, orderedIds);
    invalidatePublicPortalCache();
    return reordered;
  }
  const store = await loadStore(true);
  const idx = store.courses.findIndex((c) => c.id === courseId);
  if (idx === -1) {
    throw new RepositoryError('কোর্সটি খুঁজে পাওয়া যায়নি।', 404);
  }
  const current = getCourseFeatureItems(store.courses[idx], { includeInactive: true });
  const byId = new Map(current.map((f) => [f.id, f]));
  const ordered: CourseFeatureItem[] = [];
  const seen = new Set<number>();
  for (const rawId of orderedIds) {
    const fid = Number(rawId);
    const match = byId.get(fid);
    if (match && !seen.has(fid)) {
      seen.add(fid);
      ordered.push(match);
    }
  }
  for (const f of current) {
    if (!seen.has(f.id)) ordered.push(f);
  }
  const normalized = ordered.map((f, i) => ({ ...f, sortOrder: i + 1 }));
  store.courses[idx] = {
    ...store.courses[idx],
    courseFeatures: normalized,
    features: JSON.stringify(extractActiveFeatureTitles(normalized)),
    updatedAt: new Date().toISOString(),
  };
  await persistStore(store);
  invalidatePublicPortalCache();
  return normalized;
}

export async function reorderCoursePosition(
  courseId: number,
  targetPosition: number
): Promise<Course[]> {
  if (isSupabaseDatabaseReady()) {
    const courses = await sbReorderCoursePosition(courseId, targetPosition);
    invalidatePublicPortalCache();
    return courses;
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new RepositoryError('অবৈধ কোর্স আইডি প্রদান করা হয়েছে।', 400);
  }
  const parsedPos = parseCourseDisplayOrder(targetPosition);
  if (!parsedPos.valid) {
    throw new RepositoryError(parsedPos.error, 400);
  }

  const store = await loadStore(true);
  if (!store.courses.some((c) => c.id === courseId)) {
    throw new RepositoryError('কোর্সটি খুঁজে পাওয়া যায়নি।', 404);
  }

  store.courses = moveCourseToPosition(store.courses, courseId, parsedPos.value);
  await persistStore(store);
  invalidatePublicPortalCache();

  return store.courses;
}

export async function swapCourseOrder(firstId: number, secondId: number): Promise<Course[]> {
  if (isSupabaseDatabaseReady()) {
    const courses = await sbSwapCourseOrder(firstId, secondId);
    invalidatePublicPortalCache();
    return courses;
  }

  if (
    !Number.isInteger(firstId) ||
    !Number.isInteger(secondId) ||
    firstId <= 0 ||
    secondId <= 0 ||
    firstId === secondId
  ) {
    throw new RepositoryError('ক্রম অদলবদলের জন্য দুইটি ভিন্ন বৈধ কোর্স নির্বাচন করুন।', 400);
  }

  const store = await loadStore(true);
  const ordered = normalizeContiguousCourseOrder(store.courses);
  const firstIdx = ordered.findIndex((c) => c.id === firstId);
  const secondIdx = ordered.findIndex((c) => c.id === secondId);
  if (firstIdx === -1 || secondIdx === -1) {
    throw new RepositoryError('এক বা একাধিক কোর্স খুঁজে পাওয়া যায়নি।', 404);
  }

  const temp = ordered[firstIdx];
  ordered[firstIdx] = ordered[secondIdx];
  ordered[secondIdx] = temp;
  store.courses = ordered.map((c, idx) => ({ ...c, displayOrder: idx + 1 }));

  await persistStore(store);
  invalidatePublicPortalCache();

  return store.courses;
}

export async function deleteCourseById(
  id: number
): Promise<{ deleted: boolean; found: boolean; previousImageUrl: string | null }> {
  if (isSupabaseDatabaseReady()) {
    const result = await sbDeleteCourseById(id);
    if (result.deleted) {
      invalidatePublicPortalCache();
    }
    return result;
  }

  const store = await loadStore(true);
  const target = store.courses.find((c) => c.id === id);
  if (!target) {
    return { deleted: false, found: false, previousImageUrl: null };
  }

  // Preserve historical click_records (append-only analytics); clean up offerTimers.
  store.courses = normalizeContiguousCourseOrder(store.courses.filter((c) => c.id !== id));
  store.offerTimers = store.offerTimers.filter((t) => t.courseId !== id);
  await persistStore(store);
  invalidatePublicPortalCache();

  return {
    deleted: true,
    found: true,
    previousImageUrl: target.imageUrl || null,
  };
}

export async function createNewCategory(input: Record<string, unknown>) {
  if (isSupabaseDatabaseReady()) {
    const created = await sbCreateNewCategory(input);
    invalidatePublicPortalCache();
    return created;
  }

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

  let displayOrder: number;
  if (
    input.displayOrder !== undefined &&
    input.displayOrder !== null &&
    String(input.displayOrder).trim() !== ''
  ) {
    const parsedOrder = parseCategoryDisplayOrder(input.displayOrder);
    if (!parsedOrder.valid) {
      throw new RepositoryError(parsedOrder.error, 400);
    }
    displayOrder = parsedOrder.value;
  } else {
    displayOrder =
      store.categories.length > 0
        ? Math.max(...store.categories.map((c) => Number(c.displayOrder) || 0)) + 1
        : 1;
  }

  const duplicateOrderCat = store.categories.find((c) => c.displayOrder === displayOrder);
  if (duplicateOrderCat) {
    throw new RepositoryError(
      `এই ক্রম নম্বরটি (${toBengaliNumber(displayOrder)}) ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ("${duplicateOrderCat.name}") ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।`,
      409
    );
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
    displayOrder,
    status: input.status === 'inactive' ? 'inactive' : 'active',
    createdAt: new Date().toISOString(),
  };

  store.categories = sortCategoriesByOrder([...store.categories, newCat]);
  await persistStore(store);
  invalidatePublicPortalCache();

  return newCat;
}

export async function updateExistingCategory(id: number, input: Record<string, unknown>) {
  if (isSupabaseDatabaseReady()) {
    const updated = await sbUpdateExistingCategory(id, input);
    if (updated) {
      invalidatePublicPortalCache();
    }
    return updated;
  }

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

  let nextDisplayOrder = existing.displayOrder;
  if (input.displayOrder !== undefined) {
    const parsedOrder = parseCategoryDisplayOrder(input.displayOrder);
    if (!parsedOrder.valid) {
      throw new RepositoryError(parsedOrder.error, 400);
    }
    nextDisplayOrder = parsedOrder.value;
  }

  const duplicateOrderCat = store.categories.find(
    (c) => c.id !== id && c.displayOrder === nextDisplayOrder
  );
  if (duplicateOrderCat) {
    throw new RepositoryError(
      `এই ক্রম নম্বরটি (${toBengaliNumber(nextDisplayOrder)}) ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ("${duplicateOrderCat.name}") ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।`,
      409
    );
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
    displayOrder: nextDisplayOrder,
    status:
      input.status !== undefined
        ? input.status === 'inactive'
          ? 'inactive'
          : 'active'
        : existing.status,
  };

  store.categories[idx] = updated;
  store.categories = sortCategoriesByOrder(store.categories);

  // Cascade category slug change to all linked courses so referential integrity stays intact.
  if (nextSlug !== existing.slug) {
    store.courses = store.courses.map((course) =>
      course.categoryId === id || course.categorySlug === existing.slug
        ? { ...course, categoryId: id, categorySlug: nextSlug }
        : course
    );
  }

  await persistStore(store);
  invalidatePublicPortalCache();

  return updated;
}

export async function swapCategoryOrder(
  firstId: number,
  secondId: number
): Promise<Category[]> {
  if (isSupabaseDatabaseReady()) {
    const categories = await sbSwapCategoryOrder(firstId, secondId);
    invalidatePublicPortalCache();
    return categories;
  }

  if (
    !Number.isInteger(firstId) ||
    !Number.isInteger(secondId) ||
    firstId <= 0 ||
    secondId <= 0 ||
    firstId === secondId
  ) {
    throw new RepositoryError('ক্রম অদলবদলের জন্য দুইটি ভিন্ন বৈধ ক্যাটাগরি নির্বাচন করুন।', 400);
  }

  const store = await loadStore(true);
  const firstIdx = store.categories.findIndex((c) => c.id === firstId);
  const secondIdx = store.categories.findIndex((c) => c.id === secondId);
  if (firstIdx === -1 || secondIdx === -1) {
    throw new RepositoryError('এক বা একাধিক ক্যাটাগরি পাওয়া যায়নি।', 404);
  }

  const firstOrder = store.categories[firstIdx].displayOrder;
  const secondOrder = store.categories[secondIdx].displayOrder;
  store.categories[firstIdx] = { ...store.categories[firstIdx], displayOrder: secondOrder };
  store.categories[secondIdx] = { ...store.categories[secondIdx], displayOrder: firstOrder };
  store.categories = sortCategoriesByOrder(store.categories);

  await persistStore(store);
  invalidatePublicPortalCache();

  return store.categories;
}

export async function deleteCategoryById(
  id: number
): Promise<{ deleted: boolean; found: boolean }> {
  if (isSupabaseDatabaseReady()) {
    const result = await sbDeleteCategoryById(id);
    if (result.deleted) {
      invalidatePublicPortalCache();
    }
    return result;
  }

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
  invalidatePublicPortalCache();

  return { deleted: true, found: true };
}

export async function updatePortalSettings(input: Record<string, unknown>) {
  if (isSupabaseDatabaseReady()) {
    const updated = await sbUpdatePortalSettings(input);
    invalidatePublicPortalCache();
    return updated;
  }

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
  invalidatePublicPortalCache();

  return updated;
}

export async function getSelectorIconConfig(): Promise<SelectorIconConfig> {
  if (isSupabaseDatabaseReady()) {
    return sbGetSelectorIconConfig();
  }

  const store = await loadStore(true);
  return {
    orderedIds: normalizeSelectorIconOrder(store.selectorIconOrder),
    labels: normalizeSelectorIconLabels(store.selectorIconLabels),
  };
}

export async function saveSelectorIconConfig(input: {
  orderedIds: ReadonlyArray<string>;
  labels: Partial<Record<string, Partial<SelectorIconText>>>;
}): Promise<SelectorIconConfig> {
  const normalizedOrder = normalizeSelectorIconOrder(input.orderedIds);
  const normalizedLabels = normalizeSelectorIconLabels(input.labels);

  if (isSupabaseDatabaseReady()) {
    const saved = await sbSaveSelectorIconConfig({
      orderedIds: normalizedOrder,
      labels: normalizedLabels,
    });
    invalidatePublicPortalCache();
    return saved;
  }

  const store = await loadStore(true);
  store.selectorIconOrder = normalizedOrder;
  store.selectorIconLabels = normalizedLabels;
  await persistStore(store);
  invalidatePublicPortalCache();
  return {
    orderedIds: normalizedOrder,
    labels: normalizedLabels,
  };
}

export async function getSelectorIconOrder(): Promise<SelectorIconId[]> {
  if (isSupabaseDatabaseReady()) {
    return sbGetSelectorIconOrder();
  }

  const store = await loadStore(true);
  return normalizeSelectorIconOrder(store.selectorIconOrder);
}

export async function saveSelectorIconOrder(
  orderedIds: ReadonlyArray<string>
): Promise<SelectorIconId[]> {
  const normalized = normalizeSelectorIconOrder(orderedIds);
  if (isSupabaseDatabaseReady()) {
    const saved = await sbSaveSelectorIconOrder(normalized);
    invalidatePublicPortalCache();
    return saved;
  }

  const store = await loadStore(true);
  store.selectorIconOrder = normalized;
  await persistStore(store);
  invalidatePublicPortalCache();
  return normalized;
}

export async function getOfferTimers(): Promise<{ timers: OfferTimer[]; serverNow: string }> {
  if (isSupabaseDatabaseReady()) {
    return sbGetOfferTimers();
  }

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
  if (isSupabaseDatabaseReady()) {
    const result = await sbCreateOfferTimer(input);
    if (result.ok) {
      invalidatePublicPortalCache();
    }
    return result;
  }

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
  if (!validation.isPaused && store.settings.showCountdownTimer === false) {
    store.settings = {
      ...store.settings,
      showCountdownTimer: true,
      updatedAt: nowIso,
    };
  }
  await persistStore(store);
  invalidatePublicPortalCache();

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
  if (isSupabaseDatabaseReady()) {
    const result = await sbUpdateOfferTimer(id, input);
    if (result.ok) {
      invalidatePublicPortalCache();
    }
    return result;
  }

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
  invalidatePublicPortalCache();

  return { ok: true, timer: updated, serverNow: nowIso };
}

export async function setOfferTimerPaused(
  id: number,
  isPaused: boolean
): Promise<
  | { ok: true; timer: OfferTimer; serverNow: string }
  | { ok: false; error: string; status: number }
> {
  if (isSupabaseDatabaseReady()) {
    const result = await sbSetOfferTimerPaused(id, isPaused);
    if (result.ok) {
      invalidatePublicPortalCache();
    }
    return result;
  }

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
  invalidatePublicPortalCache();

  const hydrated = hydrateOfferTimers(store).find((t) => t.id === id) || updated;
  return { ok: true, timer: hydrated, serverNow: nowIso };
}

export async function deleteOfferTimer(
  id: number
): Promise<{ deleted: boolean; found: boolean }> {
  if (isSupabaseDatabaseReady()) {
    const result = await sbDeleteOfferTimer(id);
    if (result.deleted) {
      invalidatePublicPortalCache();
    }
    return result;
  }

  const store = await loadStore(true);
  const exists = store.offerTimers.some((t) => t.id === id);
  if (!exists) {
    return { deleted: false, found: false };
  }
  store.offerTimers = store.offerTimers.filter((t) => t.id !== id);
  await persistStore(store);
  invalidatePublicPortalCache();
  return { deleted: true, found: true };
}
