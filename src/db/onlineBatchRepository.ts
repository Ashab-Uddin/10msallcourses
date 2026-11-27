import fs from 'fs';
import path from 'path';
import { cache } from 'react';
import type {
  Category,
  Course,
  OnlineBatchAdminPayload,
  OnlineBatchClass,
  OnlineBatchClassTheme,
  OnlineBatchCourseEntry,
  OnlineBatchPageConfig,
  OnlineBatchSection,
} from '../types.ts';
import {
  RepositoryError,
  createNewCourse,
  getAdminCoursesList,
  getPublicPortalData,
  normalizeCourseStatus,
  updateExistingCourse,
  deleteCourseById,
} from './repository.ts';
import { getSupabaseAdminClient } from '../lib/supabase/admin.ts';
import { isSupabaseDatabaseReady } from '../lib/supabase/config.ts';
import { invalidatePublicPortalCache } from '../lib/cacheInvalidation.ts';
import {
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
  courseMatchesClass,
} from '../lib/categoryMatching.ts';
import { generateUnicodeCourseSlug } from '../lib/courseSlug.ts';
import {
  cloneDefaultOnlineBatchPageConfig,
  normalizeOnlineBatchPageConfig,
} from '../lib/onlineBatchPageConfig.ts';

interface OnlineBatchStoreData {
  initialized: boolean;
  classes: OnlineBatchClass[];
  entries: OnlineBatchCourseEntry[];
  pageConfig?: OnlineBatchPageConfig;
  updatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const ONLINE_BATCH_FILE = path.join(DATA_DIR, 'online-batches.json');
const PORTAL_CONFIG_BUCKET = 'portal-config';
const ONLINE_BATCH_CONFIG_OBJECT = 'online-batches-config.json';
const ONLINE_BATCH_PAGE_CONFIG_OBJECT = 'online-batch-page-config.json';
const STORAGE_CACHE_TTL_MS = 10_000;

let cachedStoragePayload: { data: OnlineBatchStoreData; expiresAt: number } | null = null;
let cachedPageConfigStorage: { data: OnlineBatchPageConfig; expiresAt: number } | null = null;
let localWriteQueue: Promise<void> = Promise.resolve();

const VALID_THEMES: ReadonlySet<OnlineBatchClassTheme> = new Set([
  'indigo',
  'emerald',
  'teal',
  'purple',
  'orange',
  'blue',
  'rose',
]);

function normalizeTheme(raw: unknown): OnlineBatchClassTheme {
  const val = String(raw || '').trim().toLowerCase() as OnlineBatchClassTheme;
  return VALID_THEMES.has(val) ? val : 'indigo';
}

function normalizeClassKey(raw: unknown, fallbackName = ''): string {
  const source = String(raw || fallbackName || '').trim();
  if (!source) return '';
  const cleaned = source
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u0980-\u09FF-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return cleaned || generateUnicodeCourseSlug(source).slice(0, 80);
}

export const DEFAULT_ONLINE_BATCH_CLASSES: ReadonlyArray<
  Omit<OnlineBatchClass, 'id' | 'createdAt' | 'updatedAt'>
> = [
  {
    classKey: 'class-6',
    name: 'ষষ্ঠ শ্রেণি',
    sectionTitle: 'ষষ্ঠ শ্রেণি অনলাইন ব্যাচ - ২০২৭',
    badgeText: 'CLASS 6',
    subtitle: 'বাংলা, ইংরেজি, গণিত ও বিজ্ঞান বিষয়ের লাইভ ক্লাস ও মডেল টেস্ট',
    theme: 'blue',
    iconKey: 'book-open',
    categorySlug: 'class-6',
    displayOrder: 1,
    status: 'active',
  },
  {
    classKey: 'class-7',
    name: 'সপ্তম শ্রেণি',
    sectionTitle: 'সপ্তম শ্রেণি অনলাইন ব্যাচ - ২০২৭',
    badgeText: 'CLASS 7',
    subtitle: 'সপ্তম শ্রেণির সম্পূর্ণ সিলেবাস কভারেজ ও সাপ্তাহিক মূল্যায়ন',
    theme: 'teal',
    iconKey: 'compass',
    categorySlug: 'class-7',
    displayOrder: 2,
    status: 'active',
  },
  {
    classKey: 'class-8',
    name: 'অষ্টম শ্রেণি',
    sectionTitle: 'অষ্টম শ্রেণি অনলাইন ব্যাচ - ২০২৭',
    badgeText: 'CLASS 8',
    subtitle: 'অষ্টম শ্রেণির বোর্ড ফাউন্ডেশন ও পূর্ণাঙ্গ একাডেমিক ব্যাচ',
    theme: 'emerald',
    iconKey: 'layers',
    categorySlug: 'class-8',
    displayOrder: 3,
    status: 'active',
  },
  {
    classKey: 'class-9',
    name: 'নবম শ্রেণি (SSC-29)',
    sectionTitle: 'নবম শ্রেণি (SSC 29) অনলাইন ব্যাচ - ২০২৭',
    badgeText: 'SSC 29',
    subtitle: 'বিজ্ঞান, ব্যবসায় শিক্ষা ও মানবিক বিভাগের পূর্ণাঙ্গ লাইভ ব্যাচ',
    theme: 'purple',
    iconKey: 'sparkles',
    categorySlug: 'class-9',
    displayOrder: 4,
    status: 'active',
  },
  {
    classKey: 'class-10',
    name: 'দশম শ্রেণি (SSC-28)',
    sectionTitle: 'দশম শ্রেণি (SSC 28) অনলাইন ব্যাচ - ২০২৭',
    badgeText: 'SSC 28',
    subtitle: 'এসএসসি ২০২৮ বোর্ড পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি ও টেস্ট পেপার সলভ',
    theme: 'orange',
    iconKey: 'graduation-cap',
    categorySlug: 'ssc-28',
    displayOrder: 5,
    status: 'active',
  },
];

function isMissingOnlineBatchTableError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null): boolean {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    msg.includes('online_batch_classes') && (msg.includes('does not exist') || msg.includes('schema cache')) ||
    msg.includes('online_batch_courses') && (msg.includes('does not exist') || msg.includes('schema cache'))
  );
}

function mapClassRow(row: Record<string, unknown>): OnlineBatchClass {
  return {
    id: Number(row.id),
    classKey: String(row.class_key || ''),
    name: String(row.name || ''),
    sectionTitle: String(row.section_title || row.name || ''),
    badgeText: String(row.badge_text || ''),
    subtitle: typeof row.subtitle === 'string' && row.subtitle.trim() ? row.subtitle : null,
    theme: normalizeTheme(row.theme),
    iconKey: String(row.icon_key || 'graduation-cap'),
    categorySlug:
      typeof row.category_slug === 'string' && row.category_slug.trim()
        ? row.category_slug
        : null,
    displayOrder: Number(row.display_order ?? 1),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

function mapEntryRow(row: Record<string, unknown>): OnlineBatchCourseEntry {
  return {
    id: Number(row.id),
    batchClassId: Number(row.batch_class_id),
    courseId: Number(row.course_id),
    customBadge: String(row.custom_badge || ''),
    displayOrder: Number(row.display_order ?? 1),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

function sortClasses(classes: OnlineBatchClass[]): OnlineBatchClass[] {
  return [...classes].sort(
    (a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) || a.id - b.id
  );
}

function sortEntries(entries: OnlineBatchCourseEntry[]): OnlineBatchCourseEntry[] {
  return [...entries].sort(
    (a, b) =>
      a.batchClassId - b.batchClassId ||
      (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0) ||
      a.id - b.id
  );
}

function matchExistingCoursesForDefaultClass(
  classKey: string,
  allCourses: Course[]
): Course[] {
  const visible = allCourses.filter((c) => c.status === 'active' || c.status === 'closed');
  if (classKey === 'class-6') {
    return visible.filter((c) => courseMatchesClass(c, 6));
  }
  if (classKey === 'class-7') {
    return visible.filter((c) => courseMatchesClass(c, 7));
  }
  if (classKey === 'class-8') {
    return visible.filter((c) => courseMatchesClass(c, 8));
  }
  if (classKey === 'class-9') {
    return visible.filter(
      (c) =>
        courseMatchesAcademicBatch(c, 'ssc-2029') ||
        courseMatchesCategorySlug(c, 'class-9') ||
        courseMatchesCategorySlug(c, 'ssc-29') ||
        courseMatchesCategorySlug(c, '৯ম-শ্রেণি-ssc-29')
    );
  }
  if (classKey === 'class-10') {
    return visible.filter(
      (c) =>
        courseMatchesAcademicBatch(c, 'ssc-2028') ||
        courseMatchesCategorySlug(c, 'ssc-28') ||
        courseMatchesCategorySlug(c, '১০ম-শ্রেণি-ssc-28') ||
        courseMatchesCategorySlug(c, 'class-10')
    );
  }
  return [];
}

function buildInitialStoreFromCourses(allCourses: Course[]): OnlineBatchStoreData {
  const nowIso = new Date().toISOString();
  const classes: OnlineBatchClass[] = DEFAULT_ONLINE_BATCH_CLASSES.map((def, idx) => ({
    ...def,
    id: idx + 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  const entries: OnlineBatchCourseEntry[] = [];
  let nextEntryId = 1;
  for (const cls of classes) {
    const matched = matchExistingCoursesForDefaultClass(cls.classKey, allCourses);
    matched.forEach((course, idx) => {
      entries.push({
        id: nextEntryId++,
        batchClassId: cls.id,
        courseId: course.id,
        customBadge: '',
        displayOrder: idx + 1,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });
  }

  return {
    initialized: true,
    classes,
    entries,
    updatedAt: nowIso,
  };
}

function normalizeStoreShape(raw: unknown): OnlineBatchStoreData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const rawClasses = Array.isArray(obj.classes) ? obj.classes : [];
  const rawEntries = Array.isArray(obj.entries) ? obj.entries : [];

  const classes: OnlineBatchClass[] = rawClasses
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: Number(item.id) > 0 ? Number(item.id) : idx + 1,
      classKey: normalizeClassKey(item.classKey || item.name) || `class-${idx + 1}`,
      name: String(item.name || '').trim() || `শ্রেণি ${idx + 1}`,
      sectionTitle: String(item.sectionTitle || item.name || '').trim(),
      badgeText: String(item.badgeText || '').trim(),
      subtitle:
        typeof item.subtitle === 'string' && item.subtitle.trim() ? item.subtitle.trim() : null,
      theme: normalizeTheme(item.theme),
      iconKey: String(item.iconKey || 'graduation-cap').trim() || 'graduation-cap',
      categorySlug:
        typeof item.categorySlug === 'string' && item.categorySlug.trim()
          ? item.categorySlug.trim()
          : null,
      displayOrder: Number.isFinite(Number(item.displayOrder))
        ? Math.max(0, Math.round(Number(item.displayOrder)))
        : idx + 1,
      status: (item.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
    }));

  const validClassIds = new Set(classes.map((c) => c.id));
  const entries: OnlineBatchCourseEntry[] = rawEntries
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: Number(item.id) > 0 ? Number(item.id) : idx + 1,
      batchClassId: Number(item.batchClassId),
      courseId: Number(item.courseId),
      customBadge: String(item.customBadge || '').trim(),
      displayOrder: Number.isFinite(Number(item.displayOrder))
        ? Math.max(0, Math.round(Number(item.displayOrder)))
        : idx + 1,
      status: (item.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
    }))
    .filter(
      (entry) =>
        validClassIds.has(entry.batchClassId) &&
        Number.isInteger(entry.courseId) &&
        entry.courseId > 0
    );

  return {
    initialized: obj.initialized !== false,
    classes: sortClasses(classes),
    entries: sortEntries(entries),
    ...(obj.pageConfig ? { pageConfig: normalizeOnlineBatchPageConfig(obj.pageConfig) } : {}),
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
  };
}

// ----------------------------------------------------------------------------
// Local JSON File Persistence (Dev / Non-Supabase)
// ----------------------------------------------------------------------------
function readLocalStoreSync(): OnlineBatchStoreData | null {
  try {
    if (!fs.existsSync(ONLINE_BATCH_FILE)) return null;
    const raw = fs.readFileSync(ONLINE_BATCH_FILE, 'utf-8');
    return normalizeStoreShape(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function persistLocalStore(data: OnlineBatchStoreData): Promise<void> {
  if (process.env.VERCEL === '1') {
    throw new RepositoryError(
      'Vercel Production-এ ডাটাবেস কনফিগার করা হয়নি।',
      503
    );
  }
  const serialized = JSON.stringify(
    { ...data, updatedAt: new Date().toISOString() },
    null,
    2
  );
  const runPersist = async () => {
    if (!fs.existsSync(DATA_DIR)) {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
    }
    const tmp = `${ONLINE_BATCH_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmp, serialized, 'utf-8');
    await fs.promises.rename(tmp, ONLINE_BATCH_FILE);
  };
  const nextWrite = localWriteQueue.then(runPersist, runPersist);
  localWriteQueue = nextWrite.catch((err) => {
    console.error('[onlineBatchRepository] Local persist failed:', err);
  });
  await nextWrite;
}

// ----------------------------------------------------------------------------
// Supabase Storage Config Fallback (when SQL migration 0021 not yet executed)
// ----------------------------------------------------------------------------
async function readStorageFallback(
  options?: { bypassCache?: boolean }
): Promise<OnlineBatchStoreData | null> {
  if (
    !options?.bypassCache &&
    cachedStoragePayload &&
    Date.now() < cachedStoragePayload.expiresAt
  ) {
    return cachedStoragePayload.data;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(PORTAL_CONFIG_BUCKET)
      .download(ONLINE_BATCH_CONFIG_OBJECT);
    if (error || !data) return null;
    const text = await data.text();
    const parsed = normalizeStoreShape(JSON.parse(text));
    if (parsed) {
      cachedStoragePayload = {
        data: parsed,
        expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeStorageFallback(store: OnlineBatchStoreData): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const payloadData: OnlineBatchStoreData = {
    ...store,
    initialized: true,
    updatedAt: new Date().toISOString(),
  };
  const payload = Buffer.from(JSON.stringify(payloadData, null, 2), 'utf-8');

  const attemptUpload = async () =>
    supabase.storage
      .from(PORTAL_CONFIG_BUCKET)
      .upload(ONLINE_BATCH_CONFIG_OBJECT, payload, {
        upsert: true,
        contentType: 'application/json; charset=utf-8',
        cacheControl: '0',
      });

  const first = await attemptUpload();
  if (!first.error) {
    cachedStoragePayload = {
      data: payloadData,
      expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
    };
    return;
  }

  const errMsg = String(first.error.message || '').toLowerCase();
  if (errMsg.includes('not found') || errMsg.includes('bucket')) {
    await supabase.storage.createBucket(PORTAL_CONFIG_BUCKET, { public: false }).catch(() => {});
    const retry = await attemptUpload();
    if (!retry.error) {
      cachedStoragePayload = {
        data: payloadData,
        expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
      };
      return;
    }
  }

  throw new RepositoryError('অনলাইন ব্যাচ কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে।', 500);
}

// ----------------------------------------------------------------------------
// Unified Storage Backend Loader (SQL Table -> Storage Fallback -> Local JSON)
// ----------------------------------------------------------------------------
async function loadOnlineBatchState(options?: {
  allCourses?: Course[];
  allowSeedPersist?: boolean;
  bypassCache?: boolean;
}): Promise<{
  backend: 'sql' | 'supabase-storage' | 'local-file';
  store: OnlineBatchStoreData;
}> {
  if (!isSupabaseDatabaseReady()) {
    const existing = readLocalStoreSync();
    if (existing && existing.initialized) {
      return { backend: 'local-file', store: existing };
    }
    const courses =
      options?.allCourses ?? (await getPublicPortalData().then((d) => d.courses).catch(() => []));
    const seeded = buildInitialStoreFromCourses(courses);
    if (options?.allowSeedPersist !== false && process.env.VERCEL !== '1') {
      await persistLocalStore(seeded).catch(() => {});
    }
    return { backend: 'local-file', store: seeded };
  }

  const supabase = getSupabaseAdminClient();
  const [clsRes, entRes] = await Promise.all([
    supabase
      .from('online_batch_classes')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('online_batch_courses')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  if (
    isMissingOnlineBatchTableError(clsRes.error) ||
    isMissingOnlineBatchTableError(entRes.error)
  ) {
    const existingStorage = await readStorageFallback({ bypassCache: options?.bypassCache });
    if (existingStorage && existingStorage.initialized) {
      return { backend: 'supabase-storage', store: existingStorage };
    }
    const courses =
      options?.allCourses ?? (await getPublicPortalData().then((d) => d.courses).catch(() => []));
    const seeded = buildInitialStoreFromCourses(courses);
    if (options?.allowSeedPersist !== false) {
      await writeStorageFallback(seeded).catch(() => {});
    }
    return { backend: 'supabase-storage', store: seeded };
  }

  if (clsRes.error) {
    throw new RepositoryError('অনলাইন ব্যাচ শ্রেণি লোড করতে সমস্যা হয়েছে।', 500);
  }
  if (entRes.error) {
    throw new RepositoryError('অনলাইন ব্যাচ কোর্স লোড করতে সমস্যা হয়েছে।', 500);
  }

  let classes = ((clsRes.data || []) as Array<Record<string, unknown>>).map(mapClassRow);
  let entries = ((entRes.data || []) as Array<Record<string, unknown>>).map(mapEntryRow);

  // If SQL table exists and has classes seeded by migration 0021, but ZERO course mappings exist yet,
  // check once if we have never seeded mappings (only when entries is empty and storage marker absent).
  if (classes.length === 0) {
    const insertRows = DEFAULT_ONLINE_BATCH_CLASSES.map((def) => ({
      class_key: def.classKey,
      name: def.name,
      section_title: def.sectionTitle,
      badge_text: def.badgeText,
      subtitle: def.subtitle,
      theme: def.theme,
      icon_key: def.iconKey,
      category_slug: def.categorySlug,
      display_order: def.displayOrder,
      status: def.status,
    }));
    const { data: insertedCls } = await supabase
      .from('online_batch_classes')
      .upsert(insertRows, { onConflict: 'class_key' })
      .select('*');
    if (Array.isArray(insertedCls) && insertedCls.length > 0) {
      classes = sortClasses(
        (insertedCls as Array<Record<string, unknown>>).map(mapClassRow)
      );
    }
  }

  // Auto-link initial matching courses once when `online_batch_courses` is empty and not yet initialized
  if (entries.length === 0 && classes.length > 0 && options?.allowSeedPersist !== false) {
    const marker = await readStorageFallback({ bypassCache: true });
    if (!marker?.initialized) {
      const courses =
        options?.allCourses ?? (await getAdminCoursesList().catch(() => []));
      const rowsToInsert: Array<{
        batch_class_id: number;
        course_id: number;
        custom_badge: string;
        display_order: number;
        status: 'active';
      }> = [];
      for (const cls of classes) {
        const matched = matchExistingCoursesForDefaultClass(cls.classKey, courses);
        matched.forEach((course, idx) => {
          rowsToInsert.push({
            batch_class_id: cls.id,
            course_id: course.id,
            custom_badge: '',
            display_order: idx + 1,
            status: 'active',
          });
        });
      }
      if (rowsToInsert.length > 0) {
        const { data: insertedEntries } = await supabase
          .from('online_batch_courses')
          .upsert(rowsToInsert, { onConflict: 'batch_class_id,course_id' })
          .select('*');
        if (Array.isArray(insertedEntries)) {
          entries = sortEntries(
            (insertedEntries as Array<Record<string, unknown>>).map(mapEntryRow)
          );
        }
      }
      await writeStorageFallback({
        initialized: true,
        classes,
        entries,
      }).catch(() => {});
    }
  }

  return {
    backend: 'sql',
    store: {
      initialized: true,
      classes: sortClasses(classes),
      entries: sortEntries(entries),
    },
  };
}

// ----------------------------------------------------------------------------
// Public Query (SSR + API)
// ----------------------------------------------------------------------------
export const getPublicOnlineBatchSections = cache(
  async (preloadedCourses?: Course[]): Promise<OnlineBatchSection[]> => {
    const courses: Course[] =
      preloadedCourses ?? (await getPublicPortalData().then((d) => d.courses ?? []));
    const { store } = await loadOnlineBatchState({
      allCourses: courses,
      allowSeedPersist: true,
    });

    const visibleCourseById = new Map<number, Course>();
    for (const c of courses) {
      if (c.status === 'active' || c.status === 'closed') {
        visibleCourseById.set(c.id, c);
      }
    }

    const activeClasses = sortClasses(
      store.classes.filter((cls) => cls.status === 'active')
    );

    return activeClasses.map((batchClass) => {
      const classEntries = sortEntries(
        store.entries.filter(
          (entry) =>
            entry.batchClassId === batchClass.id &&
            entry.status === 'active' &&
            visibleCourseById.has(entry.courseId)
        )
      );

      const hydratedEntries: OnlineBatchCourseEntry[] = [];
      const classCourses: Course[] = [];
      for (const entry of classEntries) {
        const course = visibleCourseById.get(entry.courseId);
        if (!course) continue;
        const hydratedCourse: Course =
          entry.customBadge && !course.shortBadge
            ? { ...course, shortBadge: entry.customBadge }
            : course;
        hydratedEntries.push({ ...entry, course: hydratedCourse });
        classCourses.push(hydratedCourse);
      }

      return {
        batchClass,
        courses: classCourses,
        entries: hydratedEntries,
      };
    });
  }
);

// ----------------------------------------------------------------------------
// Online Batch Page Config (Header, Section Order, Class Icons Position & Edit)
// ----------------------------------------------------------------------------
function isMissingPageConfigTableError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null): boolean {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    (msg.includes('online_batch_page_config') &&
      (msg.includes('does not exist') || msg.includes('schema cache')))
  );
}

async function readPageConfigStorageFallback(options?: {
  bypassCache?: boolean;
}): Promise<OnlineBatchPageConfig | null> {
  if (
    !options?.bypassCache &&
    cachedPageConfigStorage &&
    Date.now() < cachedPageConfigStorage.expiresAt
  ) {
    return cachedPageConfigStorage.data;
  }
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(PORTAL_CONFIG_BUCKET)
      .download(ONLINE_BATCH_PAGE_CONFIG_OBJECT);
    if (error || !data) return null;
    const text = await data.text();
    const parsed = normalizeOnlineBatchPageConfig(JSON.parse(text));
    cachedPageConfigStorage = {
      data: parsed,
      expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
    };
    return parsed;
  } catch {
    return null;
  }
}

async function writePageConfigStorageFallback(
  config: OnlineBatchPageConfig
): Promise<OnlineBatchPageConfig> {
  const supabase = getSupabaseAdminClient();
  const normalized = normalizeOnlineBatchPageConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  });
  const payload = Buffer.from(JSON.stringify(normalized, null, 2), 'utf-8');

  const attemptUpload = async () =>
    supabase.storage
      .from(PORTAL_CONFIG_BUCKET)
      .upload(ONLINE_BATCH_PAGE_CONFIG_OBJECT, payload, {
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
    throw new RepositoryError('অনলাইন ব্যাচ পেজ কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে।', 500);
  }

  cachedPageConfigStorage = {
    data: normalized,
    expiresAt: Date.now() + STORAGE_CACHE_TTL_MS,
  };
  return normalized;
}

export async function getOnlineBatchPageConfig(options?: {
  bypassCache?: boolean;
}): Promise<OnlineBatchPageConfig> {
  if (!isSupabaseDatabaseReady()) {
    const existing = readLocalStoreSync();
    return existing?.pageConfig
      ? normalizeOnlineBatchPageConfig(existing.pageConfig)
      : cloneDefaultOnlineBatchPageConfig();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('online_batch_page_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (isMissingPageConfigTableError(error)) {
    const storageCfg = await readPageConfigStorageFallback({
      bypassCache: options?.bypassCache,
    });
    return storageCfg ?? cloneDefaultOnlineBatchPageConfig();
  }

  if (error) {
    const storageCfg = await readPageConfigStorageFallback({
      bypassCache: options?.bypassCache,
    });
    return storageCfg ?? cloneDefaultOnlineBatchPageConfig();
  }

  if (!data) {
    return cloneDefaultOnlineBatchPageConfig();
  }

  const row = data as Record<string, unknown>;
  return normalizeOnlineBatchPageConfig({
    header: {
      title: row.header_title,
      subtitle: row.header_subtitle,
      description: row.header_description,
    },
    sections: row.sections,
    classIcons: row.class_icons,
    updatedAt: row.updated_at,
  });
}

export async function saveOnlineBatchPageConfig(
  config: OnlineBatchPageConfig
): Promise<OnlineBatchPageConfig> {
  const normalized = normalizeOnlineBatchPageConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  });

  if (!isSupabaseDatabaseReady()) {
    const { store } = await loadOnlineBatchState({
      allowSeedPersist: true,
      bypassCache: true,
    });
    const nextStore: OnlineBatchStoreData = {
      ...store,
      initialized: true,
      pageConfig: normalized,
    };
    await persistLocalStore(nextStore);
    invalidatePublicPortalCache();
    return normalized;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('online_batch_page_config')
    .upsert(
      {
        id: 1,
        header_title: normalized.header.title,
        header_subtitle: normalized.header.subtitle,
        header_description: normalized.header.description,
        sections: normalized.sections,
        class_icons: normalized.classIcons,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (isMissingPageConfigTableError(error)) {
    const saved = await writePageConfigStorageFallback(normalized);
    invalidatePublicPortalCache();
    return saved;
  }

  if (error) {
    throw new RepositoryError('অনলাইন ব্যাচ পেজ কনফিগারেশন সংরক্ষণ করতে সমস্যা হয়েছে।', 500);
  }

  const row = (data || {}) as Record<string, unknown>;
  const saved = normalizeOnlineBatchPageConfig({
    header: {
      title: row.header_title ?? normalized.header.title,
      subtitle: row.header_subtitle ?? normalized.header.subtitle,
      description: row.header_description ?? normalized.header.description,
    },
    sections: row.sections ?? normalized.sections,
    classIcons: row.class_icons ?? normalized.classIcons,
    updatedAt: row.updated_at ?? normalized.updatedAt,
  });

  invalidatePublicPortalCache();
  return saved;
}

// ----------------------------------------------------------------------------
// Admin Payload Query
// ----------------------------------------------------------------------------
export async function getAdminOnlineBatchData(): Promise<OnlineBatchAdminPayload> {
  const [courses, portalData, pageConfig] = await Promise.all([
    getAdminCoursesList(),
    getPublicPortalData().catch(() => ({ categories: [] as Category[] })),
    getOnlineBatchPageConfig({ bypassCache: true }).catch(() =>
      cloneDefaultOnlineBatchPageConfig()
    ),
  ]);

  const { store } = await loadOnlineBatchState({
    allCourses: courses,
    allowSeedPersist: true,
    bypassCache: true,
  });

  const courseById = new Map<number, Course>(courses.map((c) => [c.id, c]));
  const hydratedEntries = sortEntries(store.entries)
    .map((entry) => {
      const course = courseById.get(entry.courseId);
      if (!course) return null;
      return {
        ...entry,
        course,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const classes = sortClasses(store.classes);

  return {
    classes,
    entries: hydratedEntries,
    availableCourses: courses,
    categories: portalData.categories || [],
    pageConfig,
    stats: {
      totalClasses: classes.length,
      activeClasses: classes.filter((c) => c.status === 'active').length,
      totalAssignments: hydratedEntries.length,
      activeAssignments: hydratedEntries.filter(
        (e) => e.status === 'active' && e.course?.status === 'active'
      ).length,
    },
  };
}

// ----------------------------------------------------------------------------
// Helper to renumber contiguous 1..N displayOrder for entries in a class
// ----------------------------------------------------------------------------
function normalizeClassEntryOrders(
  entries: OnlineBatchCourseEntry[],
  batchClassId: number
): OnlineBatchCourseEntry[] {
  const inClass = sortEntries(
    entries.filter((e) => e.batchClassId === batchClassId)
  ).map((e, idx) => ({ ...e, displayOrder: idx + 1 }));
  const others = entries.filter((e) => e.batchClassId !== batchClassId);
  return sortEntries([...others, ...inClass]);
}

function insertEntryAtPosition(
  entries: OnlineBatchCourseEntry[],
  entry: OnlineBatchCourseEntry,
  requestedPos?: number
): OnlineBatchCourseEntry[] {
  const withoutTarget = entries.filter((e) => e.id !== entry.id);
  const peers = sortEntries(
    withoutTarget.filter((e) => e.batchClassId === entry.batchClassId)
  );
  const targetIdx =
    typeof requestedPos === 'number' && Number.isFinite(requestedPos)
      ? Math.max(0, Math.min(peers.length, Math.round(requestedPos) - 1))
      : peers.length;
  peers.splice(targetIdx, 0, entry);
  const renumbered = peers.map((e, idx) => ({ ...e, displayOrder: idx + 1 }));
  const others = withoutTarget.filter((e) => e.batchClassId !== entry.batchClassId);
  return sortEntries([...others, ...renumbered]);
}

// ----------------------------------------------------------------------------
// Class Management CRUD
// ----------------------------------------------------------------------------
export async function createOnlineBatchClass(input: {
  classKey?: unknown;
  name?: unknown;
  sectionTitle?: unknown;
  badgeText?: unknown;
  subtitle?: unknown;
  theme?: unknown;
  iconKey?: unknown;
  categorySlug?: unknown;
  displayOrder?: unknown;
  status?: unknown;
}): Promise<OnlineBatchClass> {
  const name = String(input.name || '').trim().slice(0, 120);
  if (!name) {
    throw new RepositoryError('শ্রেণির নাম প্রদান করা আবশ্যক।', 400);
  }
  const classKey = normalizeClassKey(input.classKey, name);
  if (!classKey) {
    throw new RepositoryError('বৈধ শ্রেণি কী (Class Key) প্রদান করুন।', 400);
  }
  const sectionTitle =
    String(input.sectionTitle || '').trim().slice(0, 160) ||
    `${name} অনলাইন ব্যাচ - ২০২৭`;
  const badgeText = String(input.badgeText || '').trim().slice(0, 40);
  const subtitle =
    typeof input.subtitle === 'string' && input.subtitle.trim()
      ? input.subtitle.trim().slice(0, 250)
      : null;
  const theme = normalizeTheme(input.theme);
  const iconKey = String(input.iconKey || 'graduation-cap').trim().slice(0, 40) || 'graduation-cap';
  const categorySlug =
    typeof input.categorySlug === 'string' && input.categorySlug.trim()
      ? input.categorySlug.trim().slice(0, 120)
      : null;
  const status: 'active' | 'inactive' = input.status === 'inactive' ? 'inactive' : 'active';

  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });

  if (store.classes.some((c) => c.classKey.toLowerCase() === classKey.toLowerCase())) {
    throw new RepositoryError(`"${classKey}" শ্রেণিটি ইতিমধ্যে বিদ্যমান।`, 409);
  }

  const nextOrder =
    Number.isFinite(Number(input.displayOrder)) && Number(input.displayOrder) > 0
      ? Math.round(Number(input.displayOrder))
      : store.classes.reduce((max, c) => Math.max(max, c.displayOrder), 0) + 1;

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('online_batch_classes')
      .insert({
        class_key: classKey,
        name,
        section_title: sectionTitle,
        badge_text: badgeText,
        subtitle,
        theme,
        icon_key: iconKey,
        category_slug: categorySlug,
        display_order: nextOrder,
        status,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new RepositoryError(`"${classKey}" শ্রেণিটি ইতিমধ্যে বিদ্যমান।`, 409);
      }
      throw new RepositoryError('নতুন শ্রেণি যোগ করতে সমস্যা হয়েছে।', 500);
    }
    invalidatePublicPortalCache();
    return mapClassRow(data as Record<string, unknown>);
  }

  const nowIso = new Date().toISOString();
  const newId = store.classes.reduce((m, c) => Math.max(m, c.id), 0) + 1;
  const created: OnlineBatchClass = {
    id: newId,
    classKey,
    name,
    sectionTitle,
    badgeText,
    subtitle,
    theme,
    iconKey,
    categorySlug,
    displayOrder: nextOrder,
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const nextStore: OnlineBatchStoreData = {
    ...store,
    initialized: true,
    classes: sortClasses([...store.classes, created]),
  };
  if (backend === 'supabase-storage') {
    await writeStorageFallback(nextStore);
  } else {
    await persistLocalStore(nextStore);
  }
  invalidatePublicPortalCache();
  return created;
}

export async function updateOnlineBatchClass(
  id: number,
  input: Record<string, unknown>
): Promise<OnlineBatchClass | null> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new RepositoryError('অবৈধ শ্রেণি আইডি।', 400);
  }

  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });
  const existing = store.classes.find((c) => c.id === id);
  if (!existing) return null;

  const nextName =
    input.name !== undefined ? String(input.name || '').trim().slice(0, 120) : existing.name;
  if (!nextName) {
    throw new RepositoryError('শ্রেণির নাম খালি রাখা যাবে না।', 400);
  }
  const nextSectionTitle =
    input.sectionTitle !== undefined
      ? String(input.sectionTitle || '').trim().slice(0, 160) || nextName
      : existing.sectionTitle;
  const nextBadgeText =
    input.badgeText !== undefined
      ? String(input.badgeText || '').trim().slice(0, 40)
      : existing.badgeText;
  const nextSubtitle =
    input.subtitle !== undefined
      ? typeof input.subtitle === 'string' && input.subtitle.trim()
        ? input.subtitle.trim().slice(0, 250)
        : null
      : existing.subtitle;
  const nextTheme = input.theme !== undefined ? normalizeTheme(input.theme) : existing.theme;
  const nextIconKey =
    input.iconKey !== undefined
      ? String(input.iconKey || 'graduation-cap').trim().slice(0, 40) || 'graduation-cap'
      : existing.iconKey;
  const nextCategorySlug =
    input.categorySlug !== undefined
      ? typeof input.categorySlug === 'string' && input.categorySlug.trim()
        ? input.categorySlug.trim().slice(0, 120)
        : null
      : existing.categorySlug;
  const nextDisplayOrder =
    input.displayOrder !== undefined && Number.isFinite(Number(input.displayOrder))
      ? Math.max(1, Math.round(Number(input.displayOrder)))
      : existing.displayOrder;
  const nextStatus: 'active' | 'inactive' =
    input.status !== undefined
      ? input.status === 'inactive'
        ? 'inactive'
        : 'active'
      : existing.status;

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('online_batch_classes')
      .update({
        name: nextName,
        section_title: nextSectionTitle,
        badge_text: nextBadgeText,
        subtitle: nextSubtitle,
        theme: nextTheme,
        icon_key: nextIconKey,
        category_slug: nextCategorySlug,
        display_order: nextDisplayOrder,
        status: nextStatus,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      throw new RepositoryError('শ্রেণি আপডেট করতে সমস্যা হয়েছে।', 500);
    }
    invalidatePublicPortalCache();
    return mapClassRow(data as Record<string, unknown>);
  }

  const updated: OnlineBatchClass = {
    ...existing,
    name: nextName,
    sectionTitle: nextSectionTitle,
    badgeText: nextBadgeText,
    subtitle: nextSubtitle,
    theme: nextTheme,
    iconKey: nextIconKey,
    categorySlug: nextCategorySlug,
    displayOrder: nextDisplayOrder,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  const nextStore: OnlineBatchStoreData = {
    ...store,
    initialized: true,
    classes: sortClasses(store.classes.map((c) => (c.id === id ? updated : c))),
  };
  if (backend === 'supabase-storage') {
    await writeStorageFallback(nextStore);
  } else {
    await persistLocalStore(nextStore);
  }
  invalidatePublicPortalCache();
  return updated;
}

export async function reorderOnlineBatchClasses(
  orderedIds: ReadonlyArray<number>
): Promise<OnlineBatchClass[]> {
  const cleanIds = orderedIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (cleanIds.length === 0) {
    throw new RepositoryError('সঠিক শ্রেণির তালিকা প্রদান করুন।', 400);
  }

  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });
  const byId = new Map(store.classes.map((c) => [c.id, c]));
  const ordered: OnlineBatchClass[] = [];
  const seen = new Set<number>();
  for (const id of cleanIds) {
    const match = byId.get(id);
    if (match && !seen.has(id)) {
      seen.add(id);
      ordered.push(match);
    }
  }
  for (const cls of store.classes) {
    if (!seen.has(cls.id)) ordered.push(cls);
  }
  const normalized = ordered.map((cls, idx) => ({
    ...cls,
    displayOrder: idx + 1,
    updatedAt: new Date().toISOString(),
  }));

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    await Promise.all(
      normalized.map((cls) =>
        supabase
          .from('online_batch_classes')
          .update({ display_order: cls.displayOrder })
          .eq('id', cls.id)
      )
    );
    invalidatePublicPortalCache();
    return normalized;
  }

  const nextStore: OnlineBatchStoreData = {
    ...store,
    initialized: true,
    classes: normalized,
  };
  if (backend === 'supabase-storage') {
    await writeStorageFallback(nextStore);
  } else {
    await persistLocalStore(nextStore);
  }
  invalidatePublicPortalCache();
  return normalized;
}

export async function deleteOnlineBatchClass(id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new RepositoryError('অবৈধ শ্রেণি আইডি।', 400);
  }
  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });
  const target = store.classes.find((c) => c.id === id);
  if (!target) return false;

  const linkedCount = store.entries.filter((e) => e.batchClassId === id).length;
  if (linkedCount > 0) {
    throw new RepositoryError(
      'এই শ্রেণিতে এখনো কোর্স যুক্ত আছে। শ্রেণিটি মুছে ফেলার আগে এর কোর্সগুলো সরিয়ে নিন।',
      409
    );
  }

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('online_batch_classes').delete().eq('id', id);
    if (error) throw new RepositoryError('শ্রেণি মুছে ফেলতে সমস্যা হয়েছে।', 500);
    invalidatePublicPortalCache();
    return true;
  }

  const nextStore: OnlineBatchStoreData = {
    ...store,
    initialized: true,
    classes: store.classes.filter((c) => c.id !== id),
  };
  if (backend === 'supabase-storage') {
    await writeStorageFallback(nextStore);
  } else {
    await persistLocalStore(nextStore);
  }
  invalidatePublicPortalCache();
  return true;
}

// ----------------------------------------------------------------------------
// Online Batch Courses CRUD (Link Existing OR Create New Course + Assign)
// ----------------------------------------------------------------------------
export async function addOnlineBatchCourse(input: {
  mode?: 'existing' | 'new';
  batchClassId: number;
  courseId?: number;
  newCoursePayload?: Record<string, unknown>;
  customBadge?: string;
  displayOrder?: number;
  status?: 'active' | 'inactive';
}): Promise<OnlineBatchCourseEntry> {
  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });
  const targetClass = store.classes.find((c) => c.id === Number(input.batchClassId));
  if (!targetClass) {
    throw new RepositoryError('অনুগ্রহ করে একটি বৈধ শ্রেণি নির্বাচন করুন।', 404);
  }

  let course: Course | undefined;
  if (input.mode === 'new' && input.newCoursePayload) {
    // Ensure a valid categorySlug is attached to the new course
    const portal = await getPublicPortalData().catch(() => ({ categories: [] as Category[] }));
    const categories = portal.categories || [];
    const fallbackCat =
      (targetClass.categorySlug &&
        categories.find((c) => c.slug === targetClass.categorySlug)) ||
      categories.find((c) => c.slug === 'school') ||
      categories[0];

    const payload = { ...input.newCoursePayload };
    if (!payload.categorySlug && fallbackCat) {
      payload.categorySlug = fallbackCat.slug;
    }
    if (!payload.targetBatch && /^(class-[5-8]|class-9|class-10)$/.test(targetClass.classKey)) {
      if (targetClass.classKey === 'class-9') payload.targetBatch = 'ssc-2029';
      else if (targetClass.classKey === 'class-10') payload.targetBatch = 'ssc-2028';
      else payload.targetBatch = targetClass.classKey;
    }
    course = await createNewCourse(payload);
  } else {
    const courseId = Number(input.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw new RepositoryError('অনুগ্রহ করে একটি বৈধ কোর্স নির্বাচন করুন।', 400);
    }
    const allCourses = await getAdminCoursesList();
    course = allCourses.find((c) => c.id === courseId);
    if (!course) {
      throw new RepositoryError('নির্বাচিত কোর্সটি ডাটাবেসে পাওয়া যায়নি।', 404);
    }
  }

  const duplicate = store.entries.find(
    (e) => e.batchClassId === targetClass.id && e.courseId === course!.id
  );
  if (duplicate) {
    throw new RepositoryError(
      `"${course.title}" কোর্সটি ইতিমধ্যে "${targetClass.name}" ব্যাচে যুক্ত আছে।`,
      409
    );
  }

  const customBadge = String(input.customBadge || '').trim().slice(0, 60);
  const status: 'active' | 'inactive' = input.status === 'inactive' ? 'inactive' : 'active';
  const classPeers = store.entries.filter((e) => e.batchClassId === targetClass.id);
  const requestedOrder =
    typeof input.displayOrder === 'number' &&
    Number.isFinite(input.displayOrder) &&
    input.displayOrder > 0
      ? Math.min(classPeers.length + 1, Math.round(input.displayOrder))
      : classPeers.length + 1;

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('online_batch_courses')
      .insert({
        batch_class_id: targetClass.id,
        course_id: course.id,
        custom_badge: customBadge,
        display_order: requestedOrder,
        status,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new RepositoryError('এই কোর্সটি ইতিমধ্যে নির্বাচিত শ্রেণিতে যুক্ত আছে।', 409);
      }
      throw new RepositoryError('অনলাইন ব্যাচে কোর্স যুক্ত করতে সমস্যা হয়েছে।', 500);
    }
    const created = mapEntryRow(data as Record<string, unknown>);
    const normalizedEntries = insertEntryAtPosition(store.entries, created, requestedOrder);
    await Promise.all(
      normalizedEntries
        .filter((e) => e.batchClassId === targetClass.id)
        .map((e) =>
          supabase
            .from('online_batch_courses')
            .update({ display_order: e.displayOrder })
            .eq('id', e.id)
        )
    );
    invalidatePublicPortalCache();
    return {
      ...(normalizedEntries.find((e) => e.id === created.id) || created),
      course,
    };
  }

  const nowIso = new Date().toISOString();
  const nextId = store.entries.reduce((m, e) => Math.max(m, e.id), 0) + 1;
  const newEntry: OnlineBatchCourseEntry = {
    id: nextId,
    batchClassId: targetClass.id,
    courseId: course.id,
    customBadge,
    displayOrder: requestedOrder,
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const nextEntries = insertEntryAtPosition(store.entries, newEntry, requestedOrder);
  const nextStore: OnlineBatchStoreData = {
    ...store,
    initialized: true,
    entries: nextEntries,
  };
  if (backend === 'supabase-storage') {
    await writeStorageFallback(nextStore);
  } else {
    await persistLocalStore(nextStore);
  }
  invalidatePublicPortalCache();
  return {
    ...(nextEntries.find((e) => e.id === newEntry.id) || newEntry),
    course,
  };
}

export async function updateOnlineBatchCourse(
  entryId: number,
  input: {
    batchClassId?: number;
    customBadge?: string;
    displayOrder?: number;
    status?: 'active' | 'inactive';
    courseUpdates?: Record<string, unknown>;
  }
): Promise<OnlineBatchCourseEntry | null> {
  if (!Number.isInteger(entryId) || entryId <= 0) {
    throw new RepositoryError('অবৈধ ব্যাচ এন্ট্রি আইডি।', 400);
  }

  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });
  const existing = store.entries.find((e) => e.id === entryId);
  if (!existing) return null;

  const nextBatchClassId =
    input.batchClassId !== undefined ? Number(input.batchClassId) : existing.batchClassId;
  const targetClass = store.classes.find((c) => c.id === nextBatchClassId);
  if (!targetClass) {
    throw new RepositoryError('নির্বাচিত শ্রেণিটি পাওয়া যায়নি।', 404);
  }

  if (
    nextBatchClassId !== existing.batchClassId &&
    store.entries.some(
      (e) =>
        e.id !== entryId &&
        e.batchClassId === nextBatchClassId &&
        e.courseId === existing.courseId
    )
  ) {
    throw new RepositoryError(
      `এই কোর্সটি ইতিমধ্যে "${targetClass.name}" শ্রেণিতে যুক্ত আছে।`,
      409
    );
  }

  let updatedCourse: Course | null = null;
  if (input.courseUpdates && Object.keys(input.courseUpdates).length > 0) {
    updatedCourse = await updateExistingCourse(existing.courseId, {
      ...input.courseUpdates,
      ...(input.courseUpdates.status !== undefined
        ? { status: normalizeCourseStatus(input.courseUpdates.status, 'active') }
        : {}),
    });
  }

  const nextBadge =
    input.customBadge !== undefined
      ? String(input.customBadge || '').trim().slice(0, 60)
      : existing.customBadge;
  const nextStatus: 'active' | 'inactive' =
    input.status !== undefined
      ? input.status === 'inactive'
        ? 'inactive'
        : 'active'
      : existing.status;

  const updatedEntryBase: OnlineBatchCourseEntry = {
    ...existing,
    batchClassId: nextBatchClassId,
    customBadge: nextBadge,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  let nextEntries = store.entries;
  if (
    input.displayOrder !== undefined &&
    Number.isFinite(Number(input.displayOrder))
  ) {
    nextEntries = insertEntryAtPosition(
      store.entries,
      updatedEntryBase,
      Number(input.displayOrder)
    );
  } else if (nextBatchClassId !== existing.batchClassId) {
    const moved = insertEntryAtPosition(store.entries, updatedEntryBase);
    nextEntries = normalizeClassEntryOrders(moved, existing.batchClassId);
  } else {
    nextEntries = store.entries.map((e) => (e.id === entryId ? updatedEntryBase : e));
  }

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('online_batch_courses')
      .update({
        batch_class_id: nextBatchClassId,
        custom_badge: nextBadge,
        status: nextStatus,
      })
      .eq('id', entryId);
    if (error) {
      throw new RepositoryError('ব্যাচ কোর্স আপডেট করতে সমস্যা হয়েছে।', 500);
    }

    const touchedClassIds = new Set([existing.batchClassId, nextBatchClassId]);
    await Promise.all(
      nextEntries
        .filter((e) => touchedClassIds.has(e.batchClassId))
        .map((e) =>
          supabase
            .from('online_batch_courses')
            .update({ display_order: e.displayOrder })
            .eq('id', e.id)
        )
    );
  } else {
    const nextStore: OnlineBatchStoreData = {
      ...store,
      initialized: true,
      entries: nextEntries,
    };
    if (backend === 'supabase-storage') {
      await writeStorageFallback(nextStore);
    } else {
      await persistLocalStore(nextStore);
    }
  }

  invalidatePublicPortalCache();
  const finalEntry = nextEntries.find((e) => e.id === entryId) || updatedEntryBase;
  if (!updatedCourse) {
    const allCourses = await getAdminCoursesList();
    updatedCourse = allCourses.find((c) => c.id === existing.courseId) || null;
  }
  return {
    ...finalEntry,
    ...(updatedCourse ? { course: updatedCourse } : {}),
  };
}

export async function reorderOnlineBatchCourses(
  batchClassId: number,
  orderedEntryIds: ReadonlyArray<number>
): Promise<OnlineBatchCourseEntry[]> {
  if (!Number.isInteger(batchClassId) || batchClassId <= 0) {
    throw new RepositoryError('অবৈধ শ্রেণি আইডি।', 400);
  }
  const cleanIds = orderedEntryIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (cleanIds.length === 0) {
    throw new RepositoryError('সাজানোর জন্য অন্তত একটি কোর্স এন্ট্রি প্রদান করুন।', 400);
  }

  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });
  const classEntries = store.entries.filter((e) => e.batchClassId === batchClassId);
  const byId = new Map(classEntries.map((e) => [e.id, e]));

  const reordered: OnlineBatchCourseEntry[] = [];
  const seen = new Set<number>();
  for (const id of cleanIds) {
    const match = byId.get(id);
    if (match && !seen.has(id)) {
      seen.add(id);
      reordered.push(match);
    }
  }
  for (const entry of classEntries) {
    if (!seen.has(entry.id)) reordered.push(entry);
  }

  const nowIso = new Date().toISOString();
  const normalizedClassEntries = reordered.map((entry, idx) => ({
    ...entry,
    displayOrder: idx + 1,
    updatedAt: nowIso,
  }));

  const otherEntries = store.entries.filter((e) => e.batchClassId !== batchClassId);
  const nextEntries = sortEntries([...otherEntries, ...normalizedClassEntries]);

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    await Promise.all(
      normalizedClassEntries.map((entry) =>
        supabase
          .from('online_batch_courses')
          .update({ display_order: entry.displayOrder })
          .eq('id', entry.id)
      )
    );
  } else {
    const nextStore: OnlineBatchStoreData = {
      ...store,
      initialized: true,
      entries: nextEntries,
    };
    if (backend === 'supabase-storage') {
      await writeStorageFallback(nextStore);
    } else {
      await persistLocalStore(nextStore);
    }
  }

  invalidatePublicPortalCache();
  return normalizedClassEntries;
}

export async function deleteOnlineBatchCourse(
  entryId: number,
  options?: { deleteUnderlyingCourse?: boolean }
): Promise<{ deleted: boolean; found: boolean }> {
  if (!Number.isInteger(entryId) || entryId <= 0) {
    throw new RepositoryError('অবৈধ ব্যাচ এন্ট্রি আইডি।', 400);
  }

  const { backend, store } = await loadOnlineBatchState({ bypassCache: true });
  const existing = store.entries.find((e) => e.id === entryId);
  if (!existing) {
    return { deleted: false, found: false };
  }

  const remaining = normalizeClassEntryOrders(
    store.entries.filter((e) => e.id !== entryId),
    existing.batchClassId
  );

  if (backend === 'sql') {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('online_batch_courses')
      .delete()
      .eq('id', entryId);
    if (error) {
      throw new RepositoryError('ব্যাচ কোর্সটি মুছে ফেলতে সমস্যা হয়েছে।', 500);
    }
    await Promise.all(
      remaining
        .filter((e) => e.batchClassId === existing.batchClassId)
        .map((e) =>
          supabase
            .from('online_batch_courses')
            .update({ display_order: e.displayOrder })
            .eq('id', e.id)
        )
    );
  } else {
    const nextStore: OnlineBatchStoreData = {
      ...store,
      initialized: true,
      entries: remaining,
    };
    if (backend === 'supabase-storage') {
      await writeStorageFallback(nextStore);
    } else {
      await persistLocalStore(nextStore);
    }
  }

  if (options?.deleteUnderlyingCourse) {
    const stillReferencedElsewhere = remaining.some(
      (e) => e.courseId === existing.courseId
    );
    if (!stillReferencedElsewhere) {
      await deleteCourseById(existing.courseId).catch(() => {});
    }
  }

  invalidatePublicPortalCache();
  return { deleted: true, found: true };
}
