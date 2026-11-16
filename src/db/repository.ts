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

interface LocalStore {
  categories: Category[];
  courses: Course[];
  clicks: ClickRecord[];
  settings: SiteSettings;
  inquiries?: CustomerInquiry[];
  offerTimers?: OfferTimer[];
}

let cachedStore: LocalStore | null = null;

function ensureLocalStore(): LocalStore {
  if (cachedStore) {
    return cachedStore;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial: LocalStore = {
      categories: INITIAL_CATEGORIES,
      courses: INITIAL_COURSES,
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
          courseId: 9,
          courseSlug: 'spoken-english-munzereen',
          courseTitle: 'ঘরে বসে Spoken English',
          referrer: 'facebook.com',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          clickedAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
      settings: INITIAL_SETTINGS,
    };
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {}
    cachedStore = initial;
    return initial;
  }

  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content) as LocalStore;
    if (!parsed.categories || parsed.categories.length === 0) {
      parsed.categories = INITIAL_CATEGORIES;
    }
    if (!parsed.courses || parsed.courses.length === 0) {
      parsed.courses = INITIAL_COURSES;
    }
    if (!parsed.settings) {
      parsed.settings = INITIAL_SETTINGS;
    }
    if (!parsed.clicks) {
      parsed.clicks = [];
    }
    if (!Array.isArray(parsed.offerTimers)) {
      parsed.offerTimers = [];
    }
    cachedStore = parsed;
    return parsed;
  } catch {
    const initial: LocalStore = {
      categories: INITIAL_CATEGORIES,
      courses: INITIAL_COURSES,
      clicks: [],
      settings: INITIAL_SETTINGS,
    };
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {}
    cachedStore = initial;
    return initial;
  }
}

function saveLocalStore(store: LocalStore) {
  cachedStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.promises.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8').catch((err) => {
      console.error('Failed to save database.json asynchronously:', err);
    });
  } catch (err) {
    console.error('Failed to trigger database.json save:', err);
  }
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
  const store = ensureLocalStore();
  const activeCategories = store.categories.filter((c) => c.status === 'active');
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const allHydratedTimers = hydrateOfferTimers(store);
  const offerTimers = allHydratedTimers.filter((t) => {
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
  const store = ensureLocalStore();
  const found = store.courses.find((c) => c.slug === slug);
  return found || null;
}

export async function recordCourseClick(slug: string, referrer?: string, userAgent?: string) {
  const store = ensureLocalStore();
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
    referrer: referrer || 'direct',
    userAgent: userAgent || 'unknown',
    clickedAt: new Date().toISOString(),
  };

  store.clicks.unshift(clickRecord);
  if (store.clicks.length > 200) {
    store.clicks = store.clicks.slice(0, 200);
  }
  saveLocalStore(store);

  return {
    affiliateUrl: course.affiliateUrl,
    courseTitle: course.title,
    clickCount: course.clickCount,
  };
}

export async function getAdminOverviewData() {
  const store = ensureLocalStore();

  const allCategories = store.categories;
  const allCourses = store.courses;
  const recentClicks = store.clicks;
  const currentSettings = store.settings;

  const totalCourses = allCourses.length;
  const activeCourses = allCourses.filter((c) => c.status === 'active').length;
  const inactiveCourses = totalCourses - activeCourses;
  const totalClicks = allCourses.reduce((sum, c) => sum + (c.clickCount || 0), 0);

  return {
    stats: {
      totalCourses,
      activeCourses,
      inactiveCourses,
      totalClicks,
      totalCategories: allCategories.length,
    },
    categories: allCategories,
    courses: allCourses,
    recentClicks,
    settings: currentSettings,
    offerTimers: hydrateOfferTimers(store),
    serverNow: new Date().toISOString(),
  };
}

export async function createNewCourse(input: any) {
  const store = ensureLocalStore();
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

  const newCourse: Course = {
    id: newId,
    title: input.title,
    slug: input.slug,
    categoryId: input.categoryId ?? null,
    categorySlug: input.categorySlug,
    shortBadge: typeof input.shortBadge === 'string' ? input.shortBadge.trim() : '',
    headerTitle: input.headerTitle || '10MS',
    headerSubtitle: input.headerSubtitle || 'অনলাইন কোর্স',
    discountBadgeText: computedBadgeText,
    gradientTheme: input.gradientTheme || 'red',
    description: input.description,
    fullDescription: input.fullDescription || null,
    imageUrl: input.imageUrl || null,
    imageFit: input.imageFit || 'contain',
    originalPrice,
    discountPrice,
    discountPercent,
    rating: input.rating || '৪.৯',
    studentCount: input.studentCount || '১০k+ শিক্ষার্থী',
    duration: input.duration || '৬ মাস',
    targetStudents: typeof input.targetStudents === 'string' ? input.targetStudents.trim() : '',
    instructorInfo: input.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল',
    instructorIcon: input.instructorIcon || 'school',
    features: typeof input.features === 'string' ? input.features : JSON.stringify(input.features || []),
    affiliateUrl: typeof input.affiliateUrl === 'string' ? input.affiliateUrl.trim() : '',
    isPopular: input.isPopular ?? true,
    status: normalizeCourseStatus(input.status, 'active'),
    clickCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.courses.unshift(newCourse);
  saveLocalStore(store);

  return newCourse;
}

export async function updateExistingCourse(id: number, input: any) {
  const store = ensureLocalStore();
  const idx = store.courses.findIndex((c) => c.id === id);
  if (idx === -1) {
    return null;
  }

  const existing = store.courses[idx];
  const parsedOriginal =
    input.originalPrice !== undefined ? parseSafePrice(input.originalPrice) : { valid: true, value: existing.originalPrice };
  const parsedDiscount =
    input.discountPrice !== undefined ? parseSafePrice(input.discountPrice) : { valid: true, value: existing.discountPrice };

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
    ...input,
    id: existing.id,
    shortBadge:
      typeof input.shortBadge === 'string' ? input.shortBadge.trim() : existing.shortBadge,
    targetStudents:
      typeof input.targetStudents === 'string'
        ? input.targetStudents.trim()
        : existing.targetStudents,
    originalPrice,
    discountPrice,
    discountPercent,
    discountBadgeText: nextDiscountBadgeText,
    status: input.status !== undefined ? normalizeCourseStatus(input.status, existingFallback) : existingFallback,
    features:
      typeof input.features === 'string'
        ? input.features
        : input.features !== undefined
        ? JSON.stringify(input.features)
        : existing.features,
    updatedAt: new Date().toISOString(),
  };

  store.courses[idx] = updated;
  saveLocalStore(store);

  return updated;
}

export async function deleteCourseById(id: number) {
  const store = ensureLocalStore();
  store.courses = store.courses.filter((c) => c.id !== id);
  store.clicks = store.clicks.filter((c) => c.courseId !== id);
  if (Array.isArray(store.offerTimers)) {
    store.offerTimers = store.offerTimers.filter((t) => t.courseId !== id);
  }
  saveLocalStore(store);

  return { deleted: true };
}

export async function createNewCategory(input: any) {
  const store = ensureLocalStore();
  const newId = store.categories.length > 0 ? Math.max(...store.categories.map((c) => c.id)) + 1 : 1;

  const newCat: Category = {
    id: newId,
    name: input.name,
    slug: input.slug,
    subtitle: input.subtitle || null,
    badgeColor: input.badgeColor || 'red',
    displayOrder: Number(input.displayOrder) || store.categories.length + 1,
    status: input.status || 'active',
    createdAt: new Date().toISOString(),
  };

  store.categories.push(newCat);
  saveLocalStore(store);

  return newCat;
}

export async function updateExistingCategory(id: number, input: any) {
  const store = ensureLocalStore();
  const idx = store.categories.findIndex((c) => c.id === id);
  if (idx === -1) {
    return null;
  }

  const existing = store.categories[idx];
  const updated: Category = {
    ...existing,
    ...input,
    id: existing.id,
  };

  store.categories[idx] = updated;
  saveLocalStore(store);

  return updated;
}

export async function deleteCategoryById(id: number) {
  const store = ensureLocalStore();
  store.categories = store.categories.filter((c) => c.id !== id);
  saveLocalStore(store);

  return { deleted: true };
}

export async function updatePortalSettings(input: any) {
  const store = ensureLocalStore();
  const updated: SiteSettings = {
    ...store.settings,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  store.settings = updated;
  saveLocalStore(store);

  return updated;
}

export async function saveCustomerInquiry(input: {
  name: string;
  phoneOrEmail: string;
  message: string;
  courseTitle?: string;
}): Promise<CustomerInquiry> {
  const store = ensureLocalStore();
  if (!store.inquiries) store.inquiries = [];

  const newId = store.inquiries.length > 0 ? Math.max(...store.inquiries.map((i) => i.id)) + 1 : 1;
  const newInquiry: CustomerInquiry = {
    id: newId,
    name: input.name?.trim() || 'Anonymous',
    phoneOrEmail: input.phoneOrEmail?.trim() || '',
    message: input.message?.trim() || '',
    courseTitle: input.courseTitle?.trim() || undefined,
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  store.inquiries.unshift(newInquiry);
  if (store.inquiries.length > 300) {
    store.inquiries = store.inquiries.slice(0, 300);
  }
  saveLocalStore(store);

  return newInquiry;
}

export async function getCustomerInquiries(): Promise<CustomerInquiry[]> {
  const store = ensureLocalStore();
  return store.inquiries || [];
}

export async function deleteCustomerInquiry(id: number): Promise<{ deleted: boolean }> {
  const store = ensureLocalStore();
  if (store.inquiries) {
    store.inquiries = store.inquiries.filter((i) => i.id !== id);
    saveLocalStore(store);
  }
  return { deleted: true };
}

export async function getOfferTimers(): Promise<{ timers: OfferTimer[]; serverNow: string }> {
  const store = ensureLocalStore();
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
    const timers = Array.isArray(store.offerTimers) ? store.offerTimers : [];
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
      ? input.offerLabel.trim()
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
  const store = ensureLocalStore();
  if (!Array.isArray(store.offerTimers)) {
    store.offerTimers = [];
  }

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
  saveLocalStore(store);

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
  const store = ensureLocalStore();
  if (!Array.isArray(store.offerTimers)) {
    store.offerTimers = [];
  }

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
  saveLocalStore(store);

  return { ok: true, timer: updated, serverNow: nowIso };
}

export async function setOfferTimerPaused(
  id: number,
  isPaused: boolean
): Promise<
  | { ok: true; timer: OfferTimer; serverNow: string }
  | { ok: false; error: string; status: number }
> {
  const store = ensureLocalStore();
  if (!Array.isArray(store.offerTimers)) {
    store.offerTimers = [];
  }

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
  saveLocalStore(store);

  const hydrated = hydrateOfferTimers(store).find((t) => t.id === id) || updated;
  return { ok: true, timer: hydrated, serverNow: nowIso };
}

export async function deleteOfferTimer(id: number): Promise<{ deleted: boolean }> {
  const store = ensureLocalStore();
  if (Array.isArray(store.offerTimers)) {
    store.offerTimers = store.offerTimers.filter((t) => t.id !== id);
    saveLocalStore(store);
  }
  return { deleted: true };
}


