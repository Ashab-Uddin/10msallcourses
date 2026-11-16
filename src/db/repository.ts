import fs from 'fs';
import path from 'path';
import { Category, Course, ClickRecord, SiteSettings, CustomerInquiry } from '../types.ts';
import { INITIAL_CATEGORIES, INITIAL_COURSES, INITIAL_SETTINGS } from './seedData.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

interface LocalStore {
  categories: Category[];
  courses: Course[];
  clicks: ClickRecord[];
  settings: SiteSettings;
  inquiries?: CustomerInquiry[];
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

export async function getPublicPortalData() {
  const store = ensureLocalStore();
  const activeCategories = store.categories.filter((c) => c.status === 'active');
  // Draft courses are hidden from the public website; active and inactive (admission closed) courses are shown
  const publicCourses = store.courses.filter((c) => c.status !== 'draft');

  return {
    categories: activeCategories,
    courses: publicCourses,
    settings: store.settings,
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
  };
}

export async function createNewCourse(input: any) {
  const store = ensureLocalStore();
  const newId = store.courses.length > 0 ? Math.max(...store.courses.map((c) => c.id)) + 1 : 1;

  const newCourse: Course = {
    id: newId,
    title: input.title,
    slug: input.slug,
    categoryId: input.categoryId ?? null,
    categorySlug: input.categorySlug,
    shortBadge: input.shortBadge || 'অফিশিয়াল ব্যাচ',
    headerTitle: input.headerTitle || '10MS',
    headerSubtitle: input.headerSubtitle || 'অনলাইন কোর্স',
    discountBadgeText: input.discountBadgeText || 'স্পেশাল ছাড়',
    gradientTheme: input.gradientTheme || 'red',
    description: input.description,
    fullDescription: input.fullDescription || null,
    imageUrl: input.imageUrl || null,
    imageFit: input.imageFit || 'contain',
    originalPrice: Number(input.originalPrice) || 0,
    discountPrice: Number(input.discountPrice) || 0,
    discountPercent: Number(input.discountPercent) || 0,
    rating: input.rating || '৪.৯',
    studentCount: input.studentCount || '১০k+ শিক্ষার্থী',
    duration: input.duration || '৬ মাস',
    targetStudents: input.targetStudents || 'সকল শিক্ষার্থী',
    instructorInfo: input.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল',
    instructorIcon: input.instructorIcon || 'school',
    features: typeof input.features === 'string' ? input.features : JSON.stringify(input.features || []),
    affiliateUrl: input.affiliateUrl || 'https://10minuteschool.com',
    isPopular: input.isPopular ?? true,
    status: input.status || 'active',
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
  const updated: Course = {
    ...existing,
    ...input,
    id: existing.id,
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

