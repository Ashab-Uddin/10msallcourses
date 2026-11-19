import type { Course, CourseFeatureIconKey, CourseFeatureItem } from '../types.ts';
import { parseFeatures } from '../utils/format.ts';

export const MIN_ACTIVE_COURSE_FEATURES = 4;
export const CARD_VISIBLE_COURSE_FEATURES = 4;
export const MAX_COURSE_FEATURE_TITLE_LENGTH = 300;
export const MAX_COURSE_FEATURES_PER_COURSE = 40;

export const VALID_COURSE_FEATURE_ICONS: readonly CourseFeatureIconKey[] = [
  'tag',
  'laptop',
  'help',
  'file',
  'clock',
  'book',
  'award',
  'check',
] as const;

export const COURSE_FEATURE_ICON_OPTIONS: Array<{
  key: CourseFeatureIconKey;
  label: string;
  hint: string;
}> = [
  { key: 'tag', label: 'ফি / অফার', hint: 'ট্যাগ আইকন' },
  { key: 'laptop', label: 'ক্লাস ও বিষয়', hint: 'ল্যাপটপ আইকন' },
  { key: 'help', label: 'এক্সাম ও QnA', hint: 'প্রশ্নোত্তর আইকন' },
  { key: 'file', label: 'লেকচার শিট', hint: 'ফাইল/নোট আইকন' },
  { key: 'clock', label: 'সময় / ব্যাচ', hint: 'ঘড়ি আইকন' },
  { key: 'book', label: 'বই / সিলেবাস', hint: 'বই আইকন' },
  { key: 'award', label: 'মেন্টর / গাইড', hint: 'অ্যাওয়ার্ড আইকন' },
  { key: 'check', label: 'সাধারণ সুবিধা', hint: 'চেক আইকন' },
];

const ICON_CYCLE: CourseFeatureIconKey[] = ['tag', 'laptop', 'help', 'file', 'clock', 'check'];

export function inferCourseFeatureIcon(text: string, index = 0): CourseFeatureIconKey {
  const lower = String(text || '').toLowerCase();
  if (
    lower.includes('ফি') ||
    lower.includes('৳') ||
    lower.includes('ছাড়') ||
    lower.includes('ডিসকাউন্ট') ||
    lower.includes('অফার') ||
    lower.includes('fee') ||
    lower.includes('discount')
  ) {
    return 'tag';
  }
  if (
    lower.includes('এক্সাম') ||
    lower.includes('পরীক্ষা') ||
    lower.includes('qna') ||
    lower.includes('সলভ') ||
    lower.includes('ডাউট') ||
    lower.includes('মক') ||
    lower.includes('টেস্ট') ||
    lower.includes('quiz') ||
    lower.includes('exam')
  ) {
    return 'help';
  }
  if (
    lower.includes('শিট') ||
    lower.includes('নোট') ||
    lower.includes('পিডিএফ') ||
    lower.includes('pdf') ||
    lower.includes('sheet') ||
    lower.includes('সাজেশন') ||
    lower.includes('প্রশ্নব্যাংক')
  ) {
    return 'file';
  }
  if (
    lower.includes('বই') ||
    lower.includes('মাস্টারবুক') ||
    lower.includes('সিলেবাস') ||
    lower.includes('book') ||
    lower.includes('syllabus')
  ) {
    return 'book';
  }
  if (
    lower.includes('পর্যন্ত') ||
    lower.includes('সময়') ||
    lower.includes('মাস') ||
    lower.includes('মেয়াদ') ||
    lower.includes('ভর্তি') ||
    lower.includes('চলমান') ||
    lower.includes('duration')
  ) {
    return 'clock';
  }
  if (
    lower.includes('লাইভ') ||
    lower.includes('ক্লাস') ||
    lower.includes('প্রস্তুতি') ||
    lower.includes('বিষয়') ||
    lower.includes('রেকর্ড') ||
    lower.includes('live') ||
    lower.includes('class') ||
    lower.includes('board')
  ) {
    return 'laptop';
  }
  if (
    lower.includes('শিক্ষক') ||
    lower.includes('মেন্টর') ||
    lower.includes('সার্টিফিকেট') ||
    lower.includes('গাইড') ||
    lower.includes('mentor') ||
    lower.includes('certificate')
  ) {
    return 'award';
  }

  return ICON_CYCLE[index % ICON_CYCLE.length] || 'check';
}

export function normalizeCourseFeatureIcon(
  raw: unknown,
  textFallback = '',
  indexFallback = 0
): CourseFeatureIconKey {
  if (typeof raw === 'string') {
    const clean = raw.trim().toLowerCase() as CourseFeatureIconKey;
    if ((VALID_COURSE_FEATURE_ICONS as readonly string[]).includes(clean)) {
      return clean;
    }
  }
  return inferCourseFeatureIcon(textFallback, indexFallback);
}

export function sortCourseFeatures(items: ReadonlyArray<CourseFeatureItem>): CourseFeatureItem[] {
  return [...items]
    .sort((a, b) => {
      const orderDiff = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
      if (orderDiff !== 0) return orderDiff;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    })
    .map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
}

export function normalizeCourseFeatureItems(
  rawItems: unknown,
  courseId = 0
): CourseFeatureItem[] {
  if (!Array.isArray(rawItems)) return [];
  const normalized: CourseFeatureItem[] = [];
  for (let i = 0; i < rawItems.length && normalized.length < MAX_COURSE_FEATURES_PER_COURSE; i += 1) {
    const entry = rawItems[i];
    if (typeof entry === 'string') {
      const title = entry.trim().slice(0, MAX_COURSE_FEATURE_TITLE_LENGTH);
      if (!title) continue;
      normalized.push({
        id: i + 1,
        courseId,
        title,
        icon: inferCourseFeatureIcon(title, normalized.length),
        sortOrder: normalized.length + 1,
        isActive: true,
      });
      continue;
    }

    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const title = String(obj.title || '').trim().slice(0, MAX_COURSE_FEATURE_TITLE_LENGTH);
    if (!title) continue;

    const rawId = Number(obj.id);
    const id = Number.isInteger(rawId) && rawId > 0 ? rawId : i + 1;
    const rawOrder = Number(obj.sortOrder ?? obj.sort_order);
    const sortOrder = Number.isFinite(rawOrder) && rawOrder >= 1 ? Math.round(rawOrder) : normalized.length + 1;
    const rawActive = obj.isActive ?? obj.is_active;
    const isActive = rawActive === undefined ? true : Boolean(rawActive);

    normalized.push({
      id,
      courseId: Number(obj.courseId ?? obj.course_id ?? courseId) || courseId,
      title,
      icon: normalizeCourseFeatureIcon(obj.icon, title, normalized.length),
      sortOrder,
      isActive,
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : typeof obj.created_at === 'string' ? obj.created_at : null,
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : typeof obj.updated_at === 'string' ? obj.updated_at : null,
    });
  }

  return sortCourseFeatures(normalized);
}

export function buildDefaultCourseFeatureDrafts(
  courseLike?: Partial<Pick<Course, 'duration' | 'instructorInfo' | 'categorySlug'>>
): CourseFeatureItem[] {
  const defaults = [
    {
      title: 'অভিজ্ঞ শিক্ষকদের লাইভ ও রেকর্ডেড ক্লাস',
      icon: 'laptop' as CourseFeatureIconKey,
    },
    {
      title: 'ডেইলি ও মান্থলি এক্সাম এবং QnA সেশন',
      icon: 'help' as CourseFeatureIconKey,
    },
    {
      title: 'অধ্যায়ভিত্তিক গোছানো লেকচার শিট ও নোটস',
      icon: 'file' as CourseFeatureIconKey,
    },
    {
      title: courseLike?.duration?.trim()
        ? `${courseLike.duration.trim()} মেয়াদ • সম্পূর্ণ গাইডলাইন ও ভর্তি চলমান`
        : 'সম্পূর্ণ সিলেবাস কভারেজ ও পরীক্ষা পর্যন্ত গাইডলাইন',
      icon: 'clock' as CourseFeatureIconKey,
    },
  ];

  return defaults.map((d, idx) => ({
    id: idx + 1,
    courseId: 0,
    title: d.title,
    icon: d.icon,
    sortOrder: idx + 1,
    isActive: true,
  }));
}

export function getCourseFeatureItems(
  course: Pick<Course, 'id' | 'features' | 'courseFeatures' | 'duration' | 'instructorInfo' | 'categorySlug'>,
  options?: { includeInactive?: boolean; fallbackIfEmpty?: boolean }
): CourseFeatureItem[] {
  const includeInactive = Boolean(options?.includeInactive);
  const fallbackIfEmpty = options?.fallbackIfEmpty ?? false;

  let items: CourseFeatureItem[] = [];
  if (Array.isArray(course.courseFeatures) && course.courseFeatures.length > 0) {
    items = normalizeCourseFeatureItems(course.courseFeatures, course.id);
  } else {
    const legacy = parseFeatures(course.features || '');
    if (legacy.length > 0) {
      items = normalizeCourseFeatureItems(legacy, course.id);
    } else if (fallbackIfEmpty) {
      items = buildDefaultCourseFeatureDrafts(course).map((item) => ({
        ...item,
        courseId: course.id,
      }));
    }
  }

  if (!includeInactive) {
    items = items.filter((item) => item.isActive);
  }

  return sortCourseFeatures(items);
}

export function extractActiveFeatureTitles(items: ReadonlyArray<CourseFeatureItem>): string[] {
  return sortCourseFeatures(items)
    .filter((item) => item.isActive && item.title.trim().length > 0)
    .map((item) => item.title.trim());
}

export function deriveCourseSummaryDescription(
  explicitDescription: string | null | undefined,
  featureItems: ReadonlyArray<CourseFeatureItem>,
  courseTitle?: string
): string {
  const clean = String(explicitDescription || '').trim();
  if (clean) return clean.slice(0, 1000);

  const activeTitles = extractActiveFeatureTitles(featureItems);
  if (activeTitles.length > 0) {
    return activeTitles.slice(0, 3).join(' • ').slice(0, 1000);
  }
  if (courseTitle && courseTitle.trim()) {
    return `${courseTitle.trim()} — লাইভ ক্লাস, লেকচার শিট ও সম্পূর্ণ পরীক্ষার প্রস্তুতি।`.slice(0, 1000);
  }
  return 'অভিজ্ঞ শিক্ষকদের লাইভ ক্লাস, লেকচার শিট ও পূর্ণাঙ্গ পরীক্ষার প্রস্তুতি।';
}

export function normalizeWhatsAppDigits(rawNumber?: string | null): string {
  const ascii = String(rawNumber || '').replace(/[০-৯]/g, (d) =>
    String('০১২৩৪৫৬৭৮৯'.indexOf(d))
  );
  const digits = ascii.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('01') && digits.length === 11) {
    return `88${digits}`;
  }
  if (digits.startsWith('880') && digits.length >= 13) {
    return digits;
  }
  return digits;
}

export function buildWhatsAppCourseInquiryUrl(
  whatsappLink?: string | null,
  whatsappNumber?: string | null,
  courseTitle?: string | null
): string {
  const cleanTitle = String(courseTitle || '').trim();
  const prefilledText = cleanTitle
    ? `আসসালামু আলাইকুম! আমি "${cleanTitle}" কোর্সটি সম্পর্কে বিস্তারিত জানতে এবং স্পেশাল ডিসকাউন্ট অফার পেতে চাই।`
    : 'আসসালামু আলাইকুম! আমি ১০ মিনিট স্কুলের কোর্সে ডিসকাউন্ট অফার পেতে চাই।';

  const encodedText = encodeURIComponent(prefilledText);
  const rawLink = String(whatsappLink || '').trim();

  if (rawLink && /^https?:\/\//i.test(rawLink)) {
    try {
      const url = new URL(rawLink);
      url.searchParams.set('text', prefilledText);
      return url.toString();
    } catch {
      const sep = rawLink.includes('?') ? '&' : '?';
      return `${rawLink}${sep}text=${encodedText}`;
    }
  }

  const digits = normalizeWhatsAppDigits(whatsappNumber) || '8801625171822';
  return `https://wa.me/${digits}?text=${encodedText}`;
}
