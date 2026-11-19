import { unstable_cache } from 'next/cache';
import {
  Category,
  ClickRecord,
  Course,
  OfferTimer,
  SiteSettings,
} from '../types.ts';
import { INITIAL_SETTINGS } from './seedData.ts';
import { getSupabaseAdminClient } from '../lib/supabase/admin.ts';
import { CACHE_TAG_PUBLIC_PORTAL } from '../lib/cacheInvalidation.ts';
import {
  computeDiscountPercent,
  extractExplicitTargetGroupsFromText,
  extractMatchedBatchKeywords,
  normalizeTargetBatchId,
  normalizeTargetGroups,
  syncTargetStudentsMetadata,
} from '../lib/courseValidation.ts';
import { computeOfferTimerStatus } from '../lib/offerTimerUtils.ts';
import { parseFeatures, toBengaliNumber } from '../utils/format.ts';
import {
  RepositoryError,
  normalizeCourseStatus,
  normalizeSlug,
  parseCategoryDisplayOrder,
  parseSafePrice,
  type StorageInfo,
} from './repositoryShared.ts';

interface PgErrorLike {
  code?: string;
  message?: string;
  details?: string;
  constraint?: string;
}

function isDisplayOrderUniqueError(err: PgErrorLike): boolean {
  const combined = `${err.constraint || ''} ${err.message || ''} ${err.details || ''}`.toLowerCase();
  return (
    combined.includes('display_order') ||
    combined.includes('uq_categories_display_order')
  );
}

function isMissingTargetMetadataColumnError(err: unknown): boolean {
  const pg = (err || {}) as PgErrorLike;
  const msg = `${pg.code || ''} ${pg.message || ''} ${pg.details || ''}`.toLowerCase();
  return (
    (pg.code === '42703' || pg.code === 'PGRST204' || msg.includes('schema cache') || msg.includes('does not exist')) &&
    (msg.includes('target_batch') || msg.includes('target_groups'))
  );
}

function mapPgError(error: unknown, fallbackMessage: string): RepositoryError {
  const err = (error || {}) as PgErrorLike;
  const code = err.code || '';

  if (code === '23505') {
    if (isDisplayOrderUniqueError(err)) {
      return new RepositoryError(
        'এই ক্রম নম্বরটি ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।',
        409
      );
    }
    return new RepositoryError(
      'এই স্লাগ বা ইউনিক মানটি ইতিমধ্যে ডাটাবেসে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি মান দিন।',
      409
    );
  }
  if (code === '23503') {
    return new RepositoryError(
      'সংশ্লিষ্ট রেকর্ডের সাথে সম্পর্ক যুক্ত থাকায় এই অপারেশনটি সম্পন্ন করা যায়নি।',
      409
    );
  }
  if (code === '23514' || code === '22P02') {
    return new RepositoryError(
      'প্রদত্ত তথ্যের ফরম্যাট বা URL বৈধ নয়। অনুগ্রহ করে সঠিক তথ্য ও নিরাপদ https:// লিংক দিন।',
      400
    );
  }

  console.error('[supabaseRepository] Database error:', error);
  return new RepositoryError(fallbackMessage, 500);
}

function mapCategoryRow(row: Record<string, unknown>): Category {
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    slug: String(row.slug || ''),
    subtitle: row.subtitle === null || row.subtitle === undefined ? null : String(row.subtitle),
    badgeColor: String(row.badge_color || 'red'),
    displayOrder: Number(row.display_order ?? 1),
    status: String(row.status || 'active'),
    createdAt: row.created_at ? String(row.created_at) : null,
  };
}

function serializeFeaturesForJsonb(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  if (typeof raw === 'string') {
    return parseFeatures(raw).slice(0, 40);
  }
  return [];
}

function mapCourseRow(row: Record<string, unknown>): Course {
  const rawFeatures = row.features;
  const featuresStr = Array.isArray(rawFeatures)
    ? JSON.stringify(rawFeatures.map((item) => String(item ?? '').trim()).filter(Boolean))
    : typeof rawFeatures === 'string'
    ? rawFeatures
    : '[]';

  const targetStudentsStr =
    row.target_students === null || row.target_students === undefined
      ? ''
      : String(row.target_students);
  const titleStr = String(row.title || '');
  const slugStr = String(row.slug || '');
  const resolvedTargetBatch =
    normalizeTargetBatchId(row.target_batch) ||
    extractMatchedBatchKeywords(targetStudentsStr)[0]?.id ||
    extractMatchedBatchKeywords(`${titleStr} ${slugStr}`)[0]?.id ||
    null;
  const groupsFromCol = normalizeTargetGroups(row.target_groups);
  const resolvedTargetGroups =
    groupsFromCol.length > 0
      ? groupsFromCol
      : extractExplicitTargetGroupsFromText(targetStudentsStr);

  return {
    id: Number(row.id),
    title: titleStr,
    slug: slugStr,
    categoryId:
      row.category_id === null || row.category_id === undefined
        ? null
        : Number(row.category_id),
    categorySlug: String(row.category_slug || ''),
    shortBadge: String(row.short_badge || ''),
    headerTitle: String(row.header_title || '10MS'),
    headerSubtitle: String(row.header_subtitle || 'অনলাইন কোর্স'),
    discountBadgeText: String(row.discount_badge_text || ''),
    gradientTheme: String(row.gradient_theme || 'red'),
    description: String(row.description || ''),
    fullDescription:
      row.full_description === null || row.full_description === undefined
        ? null
        : String(row.full_description),
    imageUrl:
      row.image_url === null || row.image_url === undefined
        ? null
        : String(row.image_url),
    imageFit: String(row.image_fit || 'contain'),
    originalPrice: Number(row.original_price ?? 0),
    discountPrice: Number(row.discount_price ?? 0),
    discountPercent: Number(row.discount_percent ?? 0),
    rating: String(row.rating || '৪.৯'),
    studentCount: String(row.student_count || '১০k+ শিক্ষার্থী'),
    duration: String(row.duration || '৬ মাস'),
    targetStudents: targetStudentsStr,
    targetBatch: resolvedTargetBatch,
    targetGroups: resolvedTargetGroups,
    instructorInfo: String(
      row.instructor_info || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল'
    ),
    instructorIcon: String(row.instructor_icon || 'school'),
    features: featuresStr,
    affiliateUrl: String(row.affiliate_url || ''),
    isPopular: Boolean(row.is_popular),
    status: String(row.status || 'active'),
    clickCount: Number(row.click_count ?? 0),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapClickRow(row: Record<string, unknown>): ClickRecord {
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    courseSlug: String(row.course_slug || ''),
    courseTitle: String(row.course_title || ''),
    referrer: row.referrer === null || row.referrer === undefined ? null : String(row.referrer),
    userAgent:
      row.user_agent === null || row.user_agent === undefined ? null : String(row.user_agent),
    clickedAt: String(row.clicked_at || new Date().toISOString()),
  };
}

function mapSettingsRow(row: Record<string, unknown> | null): SiteSettings {
  if (!row) {
    return { ...INITIAL_SETTINGS };
  }
  return {
    id: Number(row.id ?? 1),
    siteTitle: String(row.site_title || INITIAL_SETTINGS.siteTitle),
    whatsappNumber: String(row.whatsapp_number ?? ''),
    whatsappLink: String(row.whatsapp_link ?? ''),
    callNumber: String(row.call_number ?? ''),
    messengerLink: String(row.messenger_link ?? ''),
    heroBadge: String(row.hero_badge ?? ''),
    heroTitle: String(row.hero_title ?? ''),
    heroSubtitle: String(row.hero_subtitle ?? ''),
    showCountdownTimer: Boolean(row.show_countdown_timer),
    countdownLabel: String(row.countdown_label ?? ''),
    countdownTargetCourse: String(row.countdown_target_course || 'all'),
    countdownTargetDate: String(row.countdown_target_date ?? ''),
    defaultAffiliateRef: String(row.default_affiliate_ref ?? ''),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function hydrateTimerRows(
  timerRows: Array<Record<string, unknown>>,
  courses: Course[]
): OfferTimer[] {
  const courseById = new Map<number, Course>();
  for (const course of courses) {
    courseById.set(course.id, course);
  }

  const hydrated: OfferTimer[] = [];
  for (const row of timerRows) {
    const courseId = Number(row.course_id);
    const course = courseById.get(courseId);
    if (!course) continue;
    hydrated.push({
      id: Number(row.id),
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      courseImageUrl: course.imageUrl || null,
      affiliateUrl: course.affiliateUrl || `/go/${course.slug}`,
      offerLabel: String(row.offer_label || 'সীমিত সময়ের স্পেশাল অফার!'),
      startAt: String(row.start_at),
      endAt: String(row.end_at),
      isPaused: Boolean(row.is_paused),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    });
  }
  return hydrated;
}

export function getSupabaseStorageInfo(): StorageInfo {
  return {
    backend: 'supabase-postgres',
    persistentOnVercel: true,
  };
}

async function sbFetchPublicPortalBase() {
  const supabase = getSupabaseAdminClient();

  const [catRes, courseRes, settingsRes, timerRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('status', 'active')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true }),
    // Approved Option 2: Public visitors see `active` and `closed` courses only; `inactive` is hidden.
    supabase
      .from('courses')
      .select('*')
      .in('status', ['active', 'closed'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('website_settings').select('*').eq('id', 1).maybeSingle(),
    supabase
      .from('offer_timers')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
  ]);

  if (catRes.error) throw mapPgError(catRes.error, 'ক্যাটাগরি লোড করতে সমস্যা হয়েছে।');
  if (courseRes.error) throw mapPgError(courseRes.error, 'কোর্স লোড করতে সমস্যা হয়েছে।');
  if (settingsRes.error) throw mapPgError(settingsRes.error, 'সেটিংস লোড করতে সমস্যা হয়েছে।');
  if (timerRes.error) throw mapPgError(timerRes.error, 'অফার টাইমার লোড করতে সমস্যা হয়েছে।');

  const categories = (catRes.data || []).map((r) =>
    mapCategoryRow(r as Record<string, unknown>)
  );
  const courses = (courseRes.data || []).map((r) =>
    mapCourseRow(r as Record<string, unknown>)
  );
  const settings = mapSettingsRow((settingsRes.data as Record<string, unknown> | null) || null);
  const allHydratedTimers = hydrateTimerRows(
    (timerRes.data || []) as Array<Record<string, unknown>>,
    courses
  );

  return {
    categories,
    courses,
    settings,
    allHydratedTimers,
  };
}

const getCachedSupabasePortalBase = unstable_cache(
  async () => sbFetchPublicPortalBase(),
  ['sb-public-portal-base-v1'],
  {
    tags: [CACHE_TAG_PUBLIC_PORTAL],
    revalidate: 60,
  }
);

export async function sbGetPublicPortalData() {
  const { categories, courses, settings, allHydratedTimers } =
    await getCachedSupabasePortalBase();

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const activeCourseIds = new Set(
    courses.filter((c) => c.status === 'active').map((c) => c.id)
  );
  const offerTimers = allHydratedTimers.filter((t) => {
    if (!activeCourseIds.has(t.courseId)) return false;
    const st = computeOfferTimerStatus(t, nowMs);
    return st === 'active' || st === 'scheduled';
  });

  return {
    categories,
    courses,
    settings,
    offerTimers,
    hasOfferTimers: allHydratedTimers.length > 0,
    serverNow: nowIso,
  };
}

export async function sbGetCourseBySlug(slug: string): Promise<Course | null> {
  const supabase = getSupabaseAdminClient();
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', cleanSlug)
    .in('status', ['active', 'closed'])
    .maybeSingle();

  if (error) throw mapPgError(error, 'কোর্স খুঁজতে সমস্যা হয়েছে।');
  return data ? mapCourseRow(data as Record<string, unknown>) : null;
}

export async function sbGetCourseById(id: number): Promise<Course | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw mapPgError(error, 'কোর্স খুঁজতে সমস্যা হয়েছে।');
  return data ? mapCourseRow(data as Record<string, unknown>) : null;
}

export async function sbCountCoursesUsingImageUrl(
  imageUrl: string,
  excludeCourseId?: number
): Promise<number> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('image_url', imageUrl);

  if (excludeCourseId !== undefined) {
    query = query.neq('id', excludeCourseId);
  }

  const { count, error } = await query;
  if (error) {
    console.warn('[supabaseRepository] Failed to count courses referencing image URL:', error);
    return 1; // Fail-safe: do not delete if reference check errored
  }
  return count ?? 0;
}

export async function sbGetPortalSettings(): Promise<SiteSettings> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('website_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw mapPgError(error, 'সেটিংস লোড করতে সমস্যা হয়েছে।');
  return mapSettingsRow((data as Record<string, unknown> | null) || null);
}

export async function sbRecordCourseClick(
  slug: string,
  referrer?: string | null,
  userAgent?: string | null
) {
  const supabase = getSupabaseAdminClient();
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  // Uses server-only atomic PostgreSQL RPC `record_active_course_click`
  const { data, error } = await supabase.rpc('record_active_course_click', {
    p_slug: cleanSlug,
    p_referrer: referrer || null,
    p_user_agent: userAgent || null,
  });

  if (error) throw mapPgError(error, 'ক্লিক রেকর্ড করতে সমস্যা হয়েছে।');

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) return null;

  const first = rows[0] as Record<string, unknown>;
  return {
    affiliateUrl: String(first.affiliate_url || ''),
    courseTitle: String(first.course_title || ''),
    clickCount: Number(first.click_count ?? 0),
    status: String(first.status || 'active'),
  };
}

export async function sbGetAdminOverviewData() {
  const supabase = getSupabaseAdminClient();

  const [catRes, courseRes, clicksRes, settingsRes, timerRes] =
    await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
      supabase
        .from('click_records')
        .select('*', { count: 'exact' })
        .order('clicked_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(200),
      supabase.from('website_settings').select('*').eq('id', 1).maybeSingle(),
      supabase
        .from('offer_timers')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
    ]);

  if (catRes.error) throw mapPgError(catRes.error, 'ক্যাটাগরি লোড ব্যর্থ হয়েছে।');
  if (courseRes.error) throw mapPgError(courseRes.error, 'কোর্স লোড ব্যর্থ হয়েছে।');
  if (clicksRes.error) throw mapPgError(clicksRes.error, 'ক্লিক অ্যানালিটিক্স লোড ব্যর্থ হয়েছে।');
  if (settingsRes.error) throw mapPgError(settingsRes.error, 'সেটিংস লোড ব্যর্থ হয়েছে।');
  if (timerRes.error) throw mapPgError(timerRes.error, 'অফার টাইমার লোড ব্যর্থ হয়েছে।');

  const allCategories = (catRes.data || []).map((r) =>
    mapCategoryRow(r as Record<string, unknown>)
  );
  const allCourses = (courseRes.data || []).map((r) =>
    mapCourseRow(r as Record<string, unknown>)
  );
  const recentClicks = (clicksRes.data || []).map((r) =>
    mapClickRow(r as Record<string, unknown>)
  );
  const currentSettings = mapSettingsRow(
    (settingsRes.data as Record<string, unknown> | null) || null
  );
  const offerTimers = hydrateTimerRows(
    (timerRes.data || []) as Array<Record<string, unknown>>,
    allCourses
  );

  const totalCourses = allCourses.length;
  const activeCourses = allCourses.filter((c) => c.status === 'active').length;
  const closedCourses = allCourses.filter((c) => c.status === 'closed').length;
  const hiddenCourses = allCourses.filter((c) => c.status === 'inactive').length;
  const inactiveCourses = totalCourses - activeCourses;
  const popularCourses = allCourses.filter((c) => c.isPopular).length;
  const courseClickSum = allCourses.reduce((sum, c) => sum + (c.clickCount || 0), 0);
  const totalHistoricalClicks = clicksRes.count ?? recentClicks.length;
  const totalClicks = Math.max(courseClickSum, totalHistoricalClicks);

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
    categories: allCategories,
    courses: allCourses,
    recentClicks,
    settings: currentSettings,
    offerTimers,
    storageInfo: getSupabaseStorageInfo(),
    serverNow: new Date().toISOString(),
  };
}

export async function sbCreateNewCourse(input: Record<string, unknown>): Promise<Course> {
  const supabase = getSupabaseAdminClient();

  const title = String(input.title || '').trim();
  const slug = normalizeSlug(String(input.slug || title));
  if (!title || !slug) {
    throw new RepositoryError('কোর্সের শিরোনাম এবং বৈধ স্লাগ পূরণ করা আবশ্যক।', 400);
  }

  const categorySlug = String(input.categorySlug || '').trim();
  const { data: matchedCat, error: catErr } = await supabase
    .from('categories')
    .select('id, slug')
    .eq('slug', categorySlug)
    .maybeSingle();

  if (catErr) throw mapPgError(catErr, 'ক্যাটাগরি যাচাই করতে সমস্যা হয়েছে।');
  if (!matchedCat) {
    throw new RepositoryError('অনুগ্রহ করে একটি বৈধ ক্যাটাগরি নির্বাচন করুন।', 400);
  }

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

  const imageFitRaw = typeof input.imageFit === 'string' ? input.imageFit.trim() : 'contain';
  const imageFit = ['contain', 'square', 'video', 'cover'].includes(imageFitRaw)
    ? imageFitRaw
    : 'contain';

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

  const insertPayload: Record<string, unknown> = {
    title: title.slice(0, 220),
    slug: slug.slice(0, 220),
    category_id: Number(matchedCat.id),
    category_slug: String(matchedCat.slug),
    short_badge:
      typeof input.shortBadge === 'string' ? input.shortBadge.trim().slice(0, 60) : '',
    header_title: String(input.headerTitle || '10MS').trim().slice(0, 80),
    header_subtitle: String(input.headerSubtitle || 'অনলাইন কোর্স').trim().slice(0, 120),
    discount_badge_text: computedBadgeText.slice(0, 60),
    gradient_theme: String(input.gradientTheme || 'red').trim().slice(0, 40) || 'red',
    description: String(input.description || '').trim().slice(0, 1000),
    full_description:
      typeof input.fullDescription === 'string' && input.fullDescription.trim()
        ? input.fullDescription.trim().slice(0, 5000)
        : null,
    image_url:
      typeof input.imageUrl === 'string' && input.imageUrl.trim()
        ? input.imageUrl.trim()
        : null,
    image_fit: imageFit,
    original_price: originalPrice,
    discount_price: discountPrice,
    discount_percent: discountPercent,
    rating: String(input.rating || '৪.৯').trim().slice(0, 10),
    student_count: String(input.studentCount || '১০k+ শিক্ষার্থী').trim().slice(0, 60),
    duration: String(input.duration || '৬ মাস').trim().slice(0, 60),
    target_students: syncedTargets.targetStudents,
    target_batch: syncedTargets.targetBatch,
    target_groups: syncedTargets.targetGroups,
    instructor_info: String(
      input.instructorInfo || '১০ মিনিট স্কুলের শীর্ষ শিক্ষক প্যানেল'
    )
      .trim()
      .slice(0, 200),
    instructor_icon: String(input.instructorIcon || 'school').trim().slice(0, 50),
    features: serializeFeaturesForJsonb(input.features),
    affiliate_url: typeof input.affiliateUrl === 'string' ? input.affiliateUrl.trim() : '',
    is_popular: Boolean(input.isPopular ?? true),
    status: normalizeCourseStatus(input.status, 'active'),
    click_count: 0,
  };

  let { data, error } = await supabase
    .from('courses')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error && isMissingTargetMetadataColumnError(error)) {
    const legacyPayload = { ...insertPayload };
    delete legacyPayload.target_batch;
    delete legacyPayload.target_groups;
    ({ data, error } = await supabase
      .from('courses')
      .insert(legacyPayload)
      .select('*')
      .single());
  }

  if (error) {
    if (error.code === '23505') {
      throw new RepositoryError(
        `"${slug}" স্লাগটি ইতিমধ্যে অন্য একটি কোর্সে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি স্লাগ দিন।`,
        409
      );
    }
    throw mapPgError(error, 'কোর্স তৈরি করতে সমস্যা হয়েছে।');
  }

  return mapCourseRow(data as Record<string, unknown>);
}

export async function sbUpdateExistingCourse(
  id: number,
  input: Record<string, unknown>
): Promise<Course | null> {
  const supabase = getSupabaseAdminClient();
  const existing = await sbGetCourseById(id);
  if (!existing) return null;

  let nextSlug = existing.slug;
  if (input.slug !== undefined) {
    const candidateSlug = normalizeSlug(String(input.slug || ''));
    if (!candidateSlug) {
      throw new RepositoryError('কোর্সের বৈধ স্লাগ প্রদান করুন।', 400);
    }
    nextSlug = candidateSlug.slice(0, 220);
  }

  let nextCategoryId = existing.categoryId;
  let nextCategorySlug = existing.categorySlug;
  if (input.categorySlug !== undefined) {
    const candidateCatSlug = String(input.categorySlug || '').trim();
    const { data: matchedCat, error: catErr } = await supabase
      .from('categories')
      .select('id, slug')
      .eq('slug', candidateCatSlug)
      .maybeSingle();

    if (catErr) throw mapPgError(catErr, 'ক্যাটাগরি যাচাই ব্যর্থ হয়েছে।');
    if (!matchedCat) {
      throw new RepositoryError('অনুগ্রহ করে একটি বৈধ ক্যাটাগরি নির্বাচন করুন।', 400);
    }
    nextCategoryId = Number(matchedCat.id);
    nextCategorySlug = String(matchedCat.slug);
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

  const updatePayload: Record<string, unknown> = {
    slug: nextSlug,
    category_id: nextCategoryId,
    category_slug: nextCategorySlug,
    original_price: originalPrice,
    discount_price: discountPrice,
    discount_percent: discountPercent,
    discount_badge_text: nextDiscountBadgeText.slice(0, 60),
    status:
      input.status !== undefined
        ? normalizeCourseStatus(input.status, existingFallback)
        : existingFallback,
  };

  if (input.title !== undefined) {
    updatePayload.title = String(input.title).trim().slice(0, 220);
  }
  if (typeof input.shortBadge === 'string') {
    updatePayload.short_badge = input.shortBadge.trim().slice(0, 60);
  }
  if (input.headerTitle !== undefined) {
    updatePayload.header_title = String(input.headerTitle).trim().slice(0, 80);
  }
  if (input.headerSubtitle !== undefined) {
    updatePayload.header_subtitle = String(input.headerSubtitle).trim().slice(0, 120);
  }
  if (input.gradientTheme !== undefined) {
    updatePayload.gradient_theme =
      String(input.gradientTheme).trim().slice(0, 40) || 'red';
  }
  if (input.description !== undefined) {
    updatePayload.description = String(input.description).trim().slice(0, 1000);
  }
  if (input.fullDescription !== undefined) {
    updatePayload.full_description =
      typeof input.fullDescription === 'string' && input.fullDescription.trim()
        ? input.fullDescription.trim().slice(0, 5000)
        : null;
  }
  if (input.imageUrl !== undefined) {
    updatePayload.image_url =
      typeof input.imageUrl === 'string' && input.imageUrl.trim()
        ? input.imageUrl.trim()
        : null;
  }
  if (input.imageFit !== undefined) {
    const rawFit = String(input.imageFit).trim();
    updatePayload.image_fit = ['contain', 'square', 'video', 'cover'].includes(rawFit)
      ? rawFit
      : 'contain';
  }
  if (input.affiliateUrl !== undefined) {
    updatePayload.affiliate_url = String(input.affiliateUrl).trim();
  }
  if (input.isPopular !== undefined) {
    updatePayload.is_popular = Boolean(input.isPopular);
  }
  if (input.rating !== undefined) {
    updatePayload.rating = String(input.rating).trim().slice(0, 10);
  }
  if (input.studentCount !== undefined) {
    updatePayload.student_count = String(input.studentCount).trim().slice(0, 60);
  }
  if (input.duration !== undefined) {
    updatePayload.duration = String(input.duration).trim().slice(0, 60);
  }
  if (input.instructorInfo !== undefined) {
    updatePayload.instructor_info = String(input.instructorInfo).trim().slice(0, 200);
  }
  if (input.instructorIcon !== undefined) {
    updatePayload.instructor_icon = String(input.instructorIcon).trim().slice(0, 50);
  }
  if (
    input.targetStudents !== undefined ||
    input.targetBatch !== undefined ||
    input.targetGroups !== undefined
  ) {
    const syncedTargets = syncTargetStudentsMetadata({
      targetStudents:
        input.targetStudents !== undefined ? input.targetStudents : existing.targetStudents,
      targetBatch: input.targetBatch,
      targetGroups: input.targetGroups,
    });
    if (!syncedTargets.valid) {
      throw new RepositoryError(
        syncedTargets.error || 'একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে।',
        400
      );
    }
    updatePayload.target_students = syncedTargets.targetStudents;
    updatePayload.target_batch = syncedTargets.targetBatch;
    updatePayload.target_groups = syncedTargets.targetGroups;
  }
  if (input.features !== undefined) {
    updatePayload.features = serializeFeaturesForJsonb(input.features);
  }

  let { data, error } = await supabase
    .from('courses')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error && isMissingTargetMetadataColumnError(error)) {
    const legacyPayload = { ...updatePayload };
    delete legacyPayload.target_batch;
    delete legacyPayload.target_groups;
    ({ data, error } = await supabase
      .from('courses')
      .update(legacyPayload)
      .eq('id', id)
      .select('*')
      .maybeSingle());
  }

  if (error) {
    if (error.code === '23505') {
      throw new RepositoryError(
        `"${nextSlug}" স্লাগটি ইতিমধ্যে অন্য একটি কোর্সে ব্যবহৃত হচ্ছে।`,
        409
      );
    }
    throw mapPgError(error, 'কোর্স আপডেট করতে সমস্যা হয়েছে।');
  }

  return data ? mapCourseRow(data as Record<string, unknown>) : null;
}

export async function sbDeleteCourseById(
  id: number
): Promise<{ deleted: boolean; found: boolean; previousImageUrl: string | null }> {
  const supabase = getSupabaseAdminClient();
  const existing = await sbGetCourseById(id);
  if (!existing) {
    return { deleted: false, found: false, previousImageUrl: null };
  }

  // `offer_timers` cascades automatically via FK `ON DELETE CASCADE`;
  // `click_records` is append-only historical analytics and is intentionally preserved.
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw mapPgError(error, 'কোর্স মুছে ফেলতে সমস্যা হয়েছে।');

  return {
    deleted: true,
    found: true,
    previousImageUrl: existing.imageUrl || null,
  };
}

export async function sbCreateNewCategory(input: Record<string, unknown>): Promise<Category> {
  const supabase = getSupabaseAdminClient();
  const name = String(input.name || '').trim();
  const slug = normalizeSlug(String(input.slug || name));

  if (!name || !slug) {
    throw new RepositoryError('ক্যাটাগরির নাম এবং স্লাগ পূরণ করা আবশ্যক।', 400);
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
    const { data: maxRow, error: maxErr } = await supabase
      .from('categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) throw mapPgError(maxErr, 'ক্যাটাগরি ক্রম যাচাই ব্যর্থ হয়েছে।');
    displayOrder = (Number(maxRow?.display_order) || 0) + 1;
  }

  const { data: duplicateOrderRow, error: orderCheckErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('display_order', displayOrder)
    .limit(1)
    .maybeSingle();

  if (orderCheckErr) throw mapPgError(orderCheckErr, 'ক্যাটাগরি ক্রম যাচাই ব্যর্থ হয়েছে।');
  if (duplicateOrderRow) {
    throw new RepositoryError(
      `এই ক্রম নম্বরটি (${toBengaliNumber(displayOrder)}) ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ("${String(duplicateOrderRow.name || '')}") ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।`,
      409
    );
  }

  const insertPayload = {
    name: name.slice(0, 120),
    slug: slug.slice(0, 120),
    subtitle:
      typeof input.subtitle === 'string' && input.subtitle.trim()
        ? input.subtitle.trim().slice(0, 250)
        : null,
    badge_color: String(input.badgeColor || 'red').trim().slice(0, 30) || 'red',
    display_order: displayOrder,
    status: input.status === 'inactive' ? 'inactive' : 'active',
  };

  const { data, error } = await supabase
    .from('categories')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      if (isDisplayOrderUniqueError(error as PgErrorLike)) {
        throw new RepositoryError(
          `এই ক্রম নম্বরটি (${toBengaliNumber(displayOrder)}) ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।`,
          409
        );
      }
      throw new RepositoryError(`"${slug}" স্লাগসহ একটি ক্যাটাগরি ইতিমধ্যে রয়েছে।`, 409);
    }
    throw mapPgError(error, 'ক্যাটাগরি তৈরি ব্যর্থ হয়েছে।');
  }

  return mapCategoryRow(data as Record<string, unknown>);
}

export async function sbUpdateExistingCategory(
  id: number,
  input: Record<string, unknown>
): Promise<Category | null> {
  const supabase = getSupabaseAdminClient();
  const { data: existingRow, error: fetchErr } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) throw mapPgError(fetchErr, 'ক্যাটাগরি খুঁজতে সমস্যা হয়েছে।');
  if (!existingRow) return null;

  const existing = mapCategoryRow(existingRow as Record<string, unknown>);
  const nextName =
    input.name !== undefined ? String(input.name || '').trim() : existing.name;
  const nextSlug =
    input.slug !== undefined ? normalizeSlug(String(input.slug || '')) : existing.slug;

  if (!nextName || !nextSlug) {
    throw new RepositoryError('ক্যাটাগরির নাম এবং স্লাগ খালি রাখা যাবে না।', 400);
  }

  let nextDisplayOrder = existing.displayOrder;
  if (input.displayOrder !== undefined) {
    const parsedOrder = parseCategoryDisplayOrder(input.displayOrder);
    if (!parsedOrder.valid) {
      throw new RepositoryError(parsedOrder.error, 400);
    }
    nextDisplayOrder = parsedOrder.value;
  }

  const { data: duplicateOrderRow, error: orderCheckErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('display_order', nextDisplayOrder)
    .neq('id', id)
    .limit(1)
    .maybeSingle();

  if (orderCheckErr) throw mapPgError(orderCheckErr, 'ক্যাটাগরি ক্রম যাচাই ব্যর্থ হয়েছে।');
  if (duplicateOrderRow) {
    throw new RepositoryError(
      `এই ক্রম নম্বরটি (${toBengaliNumber(nextDisplayOrder)}) ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ("${String(duplicateOrderRow.name || '')}") ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।`,
      409
    );
  }

  const updatePayload = {
    name: nextName.slice(0, 120),
    slug: nextSlug.slice(0, 120),
    subtitle:
      input.subtitle !== undefined
        ? typeof input.subtitle === 'string' && input.subtitle.trim()
          ? input.subtitle.trim().slice(0, 250)
          : null
        : existing.subtitle,
    badge_color:
      input.badgeColor !== undefined
        ? String(input.badgeColor || 'red').trim().slice(0, 30) || 'red'
        : existing.badgeColor,
    display_order: nextDisplayOrder,
    status:
      input.status !== undefined
        ? input.status === 'inactive'
          ? 'inactive'
          : 'active'
        : existing.status,
  };

  // Trigger `trg_categories_sync_course_slug` automatically cascades slug rename to linked courses.
  const { data, error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      if (isDisplayOrderUniqueError(error as PgErrorLike)) {
        throw new RepositoryError(
          `এই ক্রম নম্বরটি (${toBengaliNumber(nextDisplayOrder)}) ইতিমধ্যে অন্য একটি ক্যাটাগরিতে ব্যবহৃত হচ্ছে। অনুগ্রহ করে ভিন্ন একটি নম্বর দিন।`,
          409
        );
      }
      throw new RepositoryError(
        `"${nextSlug}" স্লাগটি অন্য ক্যাটাগরিতে ব্যবহৃত হচ্ছে।`,
        409
      );
    }
    throw mapPgError(error, 'ক্যাটাগরি আপডেট ব্যর্থ হয়েছে।');
  }

  return data ? mapCategoryRow(data as Record<string, unknown>) : null;
}

export async function sbSwapCategoryOrder(
  firstId: number,
  secondId: number
): Promise<Category[]> {
  const supabase = getSupabaseAdminClient();
  if (!Number.isInteger(firstId) || !Number.isInteger(secondId) || firstId <= 0 || secondId <= 0 || firstId === secondId) {
    throw new RepositoryError('ক্রম অদলবদলের জন্য দুইটি ভিন্ন বৈধ ক্যাটাগরি নির্বাচন করুন।', 400);
  }

  const { error: rpcErr } = await supabase.rpc('swap_category_display_order', {
    p_first_id: firstId,
    p_second_id: secondId,
  });

  if (rpcErr) {
    const rpcMsg = `${rpcErr.code || ''} ${rpcErr.message || ''}`.toLowerCase();
    const isMissingRpc =
      rpcErr.code === '42883' ||
      rpcErr.code === 'PGRST202' ||
      rpcMsg.includes('swap_category_display_order');

    if (!isMissingRpc) {
      if (rpcErr.code === 'P0002' || rpcMsg.includes('not found')) {
        throw new RepositoryError('ক্যাটাগরিটি পাওয়া যায়নি।', 404);
      }
      throw mapPgError(rpcErr, 'ক্যাটাগরি ক্রম পরিবর্তন ব্যর্থ হয়েছে।');
    }

    // Safe 3-step fallback if SQL migration 0008 RPC has not been applied yet
    const { data: allRows, error: listErr } = await supabase
      .from('categories')
      .select('id, display_order')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });

    if (listErr) throw mapPgError(listErr, 'ক্যাটাগরি লোড ব্যর্থ হয়েছে।');
    const rows = allRows || [];
    const first = rows.find((r) => Number(r.id) === firstId);
    const second = rows.find((r) => Number(r.id) === secondId);
    if (!first || !second) {
      throw new RepositoryError('এক বা একাধিক ক্যাটাগরি পাওয়া যায়নি।', 404);
    }

    const firstOrder = Number(first.display_order);
    const secondOrder = Number(second.display_order);
    const maxOrder = rows.reduce((m, r) => Math.max(m, Number(r.display_order) || 0), 0);
    const tempOrder = maxOrder + 10000;

    if (firstOrder !== secondOrder) {
      const step1 = await supabase
        .from('categories')
        .update({ display_order: tempOrder })
        .eq('id', firstId);
      if (step1.error) throw mapPgError(step1.error, 'ক্যাটাগরি ক্রম পরিবর্তন ব্যর্থ হয়েছে।');

      const step2 = await supabase
        .from('categories')
        .update({ display_order: firstOrder })
        .eq('id', secondId);
      if (step2.error) {
        await supabase.from('categories').update({ display_order: firstOrder }).eq('id', firstId);
        throw mapPgError(step2.error, 'ক্যাটাগরি ক্রম পরিবর্তন ব্যর্থ হয়েছে।');
      }

      const step3 = await supabase
        .from('categories')
        .update({ display_order: secondOrder })
        .eq('id', firstId);
      if (step3.error) {
        await supabase.from('categories').update({ display_order: secondOrder }).eq('id', secondId);
        await supabase.from('categories').update({ display_order: firstOrder }).eq('id', firstId);
        throw mapPgError(step3.error, 'ক্যাটাগরি ক্রম পরিবর্তন ব্যর্থ হয়েছে।');
      }
    }
  }

  const { data: sortedRows, error: fetchSortedErr } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if (fetchSortedErr) throw mapPgError(fetchSortedErr, 'ক্যাটাগরি তালিকা লোড ব্যর্থ হয়েছে।');
  return (sortedRows || []).map((r) => mapCategoryRow(r as Record<string, unknown>));
}

export async function sbDeleteCategoryById(
  id: number
): Promise<{ deleted: boolean; found: boolean }> {
  const supabase = getSupabaseAdminClient();
  const { data: existingRow, error: fetchErr } = await supabase
    .from('categories')
    .select('id, slug')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) throw mapPgError(fetchErr, 'ক্যাটাগরি যাচাই ব্যর্থ হয়েছে।');
  if (!existingRow) {
    return { deleted: false, found: false };
  }

  const { count, error: countErr } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countErr) throw mapPgError(countErr, 'ক্যাটাগরির কোর্স যাচাই ব্যর্থ হয়েছে।');

  const linkedCount = count ?? 0;
  if (linkedCount > 0) {
    throw new RepositoryError(
      `এই ক্যাটাগরিতে ${toBengaliNumber(linkedCount)}টি কোর্স যুক্ত রয়েছে। ক্যাটাগরি মুছে ফেলার আগে কোর্সগুলো অন্য ক্যাটাগরিতে স্থানান্তর করুন।`,
      409
    );
  }

  const { error: delErr } = await supabase.from('categories').delete().eq('id', id);
  if (delErr) {
    if (delErr.code === '23503') {
      throw new RepositoryError(
        'এই ক্যাটাগরিতে এখনো কোর্স যুক্ত রয়েছে। আগে কোর্সগুলো স্থানান্তর করুন।',
        409
      );
    }
    throw mapPgError(delErr, 'ক্যাটাগরি মুছে ফেলতে ব্যর্থ হয়েছে।');
  }

  return { deleted: true, found: true };
}

export async function sbUpdatePortalSettings(
  input: Record<string, unknown>
): Promise<SiteSettings> {
  const supabase = getSupabaseAdminClient();
  const current = await sbGetPortalSettings();

  const nextPayload = {
    id: 1,
    site_title:
      input.siteTitle !== undefined
        ? String(input.siteTitle).trim().slice(0, 160) || current.siteTitle
        : current.siteTitle,
    whatsapp_number:
      input.whatsappNumber !== undefined
        ? String(input.whatsappNumber).trim().slice(0, 40)
        : current.whatsappNumber,
    whatsapp_link:
      input.whatsappLink !== undefined
        ? String(input.whatsappLink).trim().slice(0, 500)
        : current.whatsappLink,
    call_number:
      input.callNumber !== undefined
        ? String(input.callNumber).trim().slice(0, 40)
        : current.callNumber || '',
    messenger_link:
      input.messengerLink !== undefined
        ? String(input.messengerLink).trim().slice(0, 500)
        : current.messengerLink || '',
    hero_badge:
      input.heroBadge !== undefined
        ? String(input.heroBadge).trim().slice(0, 200)
        : current.heroBadge,
    hero_title:
      input.heroTitle !== undefined
        ? String(input.heroTitle).trim().slice(0, 200)
        : current.heroTitle,
    hero_subtitle:
      input.heroSubtitle !== undefined
        ? String(input.heroSubtitle).trim().slice(0, 500)
        : current.heroSubtitle,
    show_countdown_timer:
      input.showCountdownTimer !== undefined
        ? Boolean(input.showCountdownTimer)
        : Boolean(current.showCountdownTimer),
    countdown_label:
      input.countdownLabel !== undefined
        ? String(input.countdownLabel).trim().slice(0, 200)
        : current.countdownLabel,
    countdown_target_course:
      input.countdownTargetCourse !== undefined
        ? String(input.countdownTargetCourse).trim().slice(0, 120) || 'all'
        : current.countdownTargetCourse || 'all',
    countdown_target_date:
      input.countdownTargetDate !== undefined
        ? String(input.countdownTargetDate).trim().slice(0, 80)
        : current.countdownTargetDate || '',
    default_affiliate_ref:
      input.defaultAffiliateRef !== undefined
        ? String(input.defaultAffiliateRef).trim().slice(0, 120)
        : current.defaultAffiliateRef,
  };

  const { data, error } = await supabase
    .from('website_settings')
    .upsert(nextPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw mapPgError(error, 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।');
  return mapSettingsRow(data as Record<string, unknown>);
}

export async function sbGetOfferTimers(): Promise<{
  timers: OfferTimer[];
  serverNow: string;
}> {
  const supabase = getSupabaseAdminClient();
  const [courseRes, timerRes] = await Promise.all([
    supabase.from('courses').select('*'),
    supabase
      .from('offer_timers')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
  ]);

  if (courseRes.error) throw mapPgError(courseRes.error, 'কোর্স লোড ব্যর্থ হয়েছে।');
  if (timerRes.error) throw mapPgError(timerRes.error, 'অফার টাইমার লোড ব্যর্থ হয়েছে।');

  const courses = (courseRes.data || []).map((r) =>
    mapCourseRow(r as Record<string, unknown>)
  );
  const timers = hydrateTimerRows(
    (timerRes.data || []) as Array<Record<string, unknown>>,
    courses
  );

  return {
    timers,
    serverNow: new Date().toISOString(),
  };
}

async function validateOfferTimerInput(
  input: {
    courseId?: unknown;
    startAt?: unknown;
    endAt?: unknown;
    offerLabel?: unknown;
    isPaused?: unknown;
  },
  excludeTimerId?: number
): Promise<
  | {
      valid: true;
      course: Course;
      startIso: string;
      endIso: string;
      offerLabel: string;
      isPaused: boolean;
    }
  | { valid: false; error: string; status: number }
> {
  const courseId = Number(input.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return {
      valid: false,
      error: 'অনুগ্রহ করে একটি বৈধ কোর্স নির্বাচন করুন।',
      status: 400,
    };
  }

  const course = await sbGetCourseById(courseId);
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
    const supabase = getSupabaseAdminClient();
    const { data: existingTimers, error: timerErr } = await supabase
      .from('offer_timers')
      .select('id, start_at, end_at, is_paused')
      .eq('course_id', course.id);

    if (timerErr) throw mapPgError(timerErr, 'বিদ্যমান অফার টাইমার যাচাই ব্যর্থ হয়েছে।');

    const conflicting = (existingTimers || []).find((row) => {
      if (excludeTimerId !== undefined && Number(row.id) === excludeTimerId) {
        return false;
      }
      const st = computeOfferTimerStatus(
        {
          startAt: String(row.start_at),
          endAt: String(row.end_at),
          isPaused: Boolean(row.is_paused),
        },
        nowMs
      );
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

export async function sbCreateOfferTimer(input: {
  courseId?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  offerLabel?: unknown;
  isPaused?: unknown;
}): Promise<
  | { ok: true; timer: OfferTimer; serverNow: string }
  | { ok: false; error: string; status: number }
> {
  const validation = await validateOfferTimerInput(input);
  if (!validation.valid) {
    return { ok: false, error: validation.error, status: validation.status };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('offer_timers')
    .insert({
      course_id: validation.course.id,
      offer_label: validation.offerLabel,
      start_at: validation.startIso,
      end_at: validation.endIso,
      is_paused: validation.isPaused,
    })
    .select('*')
    .single();

  if (error) throw mapPgError(error, 'অফার টাইমার তৈরি করতে ব্যর্থ হয়েছে।');

  if (!validation.isPaused) {
    const settings = await sbGetPortalSettings();
    if (settings.showCountdownTimer === false) {
      await sbUpdatePortalSettings({ showCountdownTimer: true }).catch(() => {});
    }
  }

  const hydrated = hydrateTimerRows(
    [data as Record<string, unknown>],
    [validation.course]
  )[0];
  return { ok: true, timer: hydrated, serverNow: new Date().toISOString() };
}

export async function sbUpdateOfferTimer(
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
  const supabase = getSupabaseAdminClient();
  const { data: existingRow, error: fetchErr } = await supabase
    .from('offer_timers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) throw mapPgError(fetchErr, 'অফার টাইমার খুঁজতে সমস্যা হয়েছে।');
  if (!existingRow) {
    return { ok: false, error: 'অফার টাইমারটি পাওয়া যায়নি।', status: 404 };
  }

  const merged = {
    courseId: input.courseId !== undefined ? input.courseId : existingRow.course_id,
    startAt: input.startAt !== undefined ? input.startAt : existingRow.start_at,
    endAt: input.endAt !== undefined ? input.endAt : existingRow.end_at,
    offerLabel:
      input.offerLabel !== undefined ? input.offerLabel : existingRow.offer_label,
    isPaused: input.isPaused !== undefined ? input.isPaused : existingRow.is_paused,
  };

  const validation = await validateOfferTimerInput(merged, id);
  if (!validation.valid) {
    return { ok: false, error: validation.error, status: validation.status };
  }

  const { data, error } = await supabase
    .from('offer_timers')
    .update({
      course_id: validation.course.id,
      offer_label: validation.offerLabel,
      start_at: validation.startIso,
      end_at: validation.endIso,
      is_paused: validation.isPaused,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw mapPgError(error, 'অফার টাইমার আপডেট ব্যর্থ হয়েছে।');

  const hydrated = hydrateTimerRows(
    [data as Record<string, unknown>],
    [validation.course]
  )[0];
  return { ok: true, timer: hydrated, serverNow: new Date().toISOString() };
}

export async function sbSetOfferTimerPaused(
  id: number,
  isPaused: boolean
): Promise<
  | { ok: true; timer: OfferTimer; serverNow: string }
  | { ok: false; error: string; status: number }
> {
  const supabase = getSupabaseAdminClient();
  const { data: existingRow, error: fetchErr } = await supabase
    .from('offer_timers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) throw mapPgError(fetchErr, 'অফার টাইমার খুঁজতে সমস্যা হয়েছে।');
  if (!existingRow) {
    return { ok: false, error: 'অফার টাইমারটি পাওয়া যায়নি।', status: 404 };
  }

  const course = await sbGetCourseById(Number(existingRow.course_id));
  if (!course) {
    return { ok: false, error: 'টাইমারের সাথে যুক্ত কোর্সটি পাওয়া যায়নি।', status: 404 };
  }

  const nowMs = Date.now();
  const endMs = new Date(String(existingRow.end_at)).getTime();

  if (!isPaused) {
    if (!Number.isFinite(endMs) || endMs <= nowMs) {
      return {
        ok: false,
        error:
          'মেয়াদ উত্তীর্ণ (Expired) টাইমার পুনরায় চালু করা যাবে না। অনুগ্রহ করে এডিট করে নতুন শেষ সময় দিন।',
        status: 400,
      };
    }

    const { data: peerTimers, error: peerErr } = await supabase
      .from('offer_timers')
      .select('id, start_at, end_at, is_paused')
      .eq('course_id', course.id)
      .neq('id', id);

    if (peerErr) throw mapPgError(peerErr, 'টাইমার যাচাই করতে সমস্যা হয়েছে।');

    const conflicting = (peerTimers || []).find((row) => {
      const st = computeOfferTimerStatus(
        {
          startAt: String(row.start_at),
          endAt: String(row.end_at),
          isPaused: Boolean(row.is_paused),
        },
        nowMs
      );
      return st === 'active' || st === 'scheduled';
    });

    if (conflicting) {
      return {
        ok: false,
        error: `"${course.title}" কোর্সের জন্য ইতিমধ্যে আরেকটি সক্রিয়/নির্ধারিত টাইমার চালু আছে।`,
        status: 409,
      };
    }
  }

  const { data, error } = await supabase
    .from('offer_timers')
    .update({ is_paused: isPaused })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw mapPgError(error, 'অফার টাইমারের অবস্থা পরিবর্তন করা যায়নি।');

  const hydrated = hydrateTimerRows([data as Record<string, unknown>], [course])[0];
  return { ok: true, timer: hydrated, serverNow: new Date().toISOString() };
}

export async function sbDeleteOfferTimer(
  id: number
): Promise<{ deleted: boolean; found: boolean }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('offer_timers')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw mapPgError(error, 'অফার টাইমার মুছে ফেলতে ব্যর্থ হয়েছে।');
  if (!data) {
    return { deleted: false, found: false };
  }
  return { deleted: true, found: true };
}
