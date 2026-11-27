import type { CategoryIconKey } from './lib/categoryIcons.ts';

export type NavbarGroupKey = 'school' | 'hsc27' | 'hsc28' | 'admission' | 'skills';
export type CategoryNavAssignment = NavbarGroupKey | 'auto' | 'none';

export interface Category {
  id: number;
  name: string;
  slug: string;
  subtitle: string | null;
  cardTitle?: string | null;
  badgeColor: string;
  displayOrder: number;
  status: string;
  navGroup?: CategoryNavAssignment;
  iconKey?: CategoryIconKey;
  createdAt?: string | null;
}

export type CourseGroupKey = 'science' | 'business' | 'humanities';

export type CourseFeatureIconKey =
  | 'tag'
  | 'laptop'
  | 'help'
  | 'file'
  | 'clock'
  | 'book'
  | 'award'
  | 'check';

export interface CourseFeatureItem {
  id: number;
  courseId: number;
  title: string;
  icon: CourseFeatureIconKey;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  categoryId: number | null;
  categorySlug: string;
  categoryIds?: number[];
  categorySlugs?: string[];
  shortBadge: string;
  headerTitle: string;
  headerSubtitle: string;
  discountBadgeText: string;
  gradientTheme: string;
  description: string;
  fullDescription: string | null;
  imageUrl: string | null;
  imageFit?: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  rating: string;
  studentCount: string;
  duration: string;
  targetStudents: string | null;
  targetBatch?: string | null;
  targetGroups?: CourseGroupKey[];
  instructorInfo: string;
  instructorIcon: string;
  features: string; // JSON string array (legacy fallback & search index)
  courseFeatures?: CourseFeatureItem[];
  affiliateUrl: string;
  displayOrder: number;
  isPopular: boolean;
  status: string;
  clickCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClickRecord {
  id: number;
  courseId: number;
  courseSlug: string;
  courseTitle: string;
  referrer: string | null;
  userAgent: string | null;
  clickedAt: string;
}

export interface SiteSettings {
  id: number;
  siteTitle: string;
  whatsappNumber: string;
  whatsappLink: string;
  callNumber?: string;
  messengerLink?: string;
  facebookLink?: string;
  youtubeLink?: string;
  instagramLink?: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  showCountdownTimer?: boolean;
  countdownLabel: string;
  countdownTargetCourse?: string;
  countdownTargetDate?: string;
  defaultAffiliateRef: string;
  updatedAt?: string | null;
}

export type OfferTimerComputedStatus = 'scheduled' | 'active' | 'expired' | 'paused';

export interface OfferTimer {
  id: number;
  courseId: number;
  courseSlug: string;
  courseTitle: string;
  courseImageUrl: string | null;
  affiliateUrl: string;
  offerLabel: string;
  startAt: string;
  endAt: string;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookShelfTheme = 'blue' | 'rose' | 'amber' | 'emerald' | 'slate';

export interface BookCategory {
  id: number;
  name: string;
  slug: string;
  sectionTitle?: string | null;
  subtitle?: string | null;
  shelfTheme?: BookShelfTheme;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Book {
  id: number;
  title: string;
  slug: string;
  categoryId: number | null;
  categorySlug: string;
  bookType: string;
  author: string;
  publisher: string;
  edition: string;
  pages: string;
  coverImageUrl: string | null;
  originalPrice: number;
  price: number;
  discountPercent: number;
  affiliateUrl: string;
  orderUrl?: string;
  features: string; // JSON string array
  isFeatured: boolean;
  clickCount?: number;
  status: 'active' | 'inactive';
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminOverviewStats {
  totalCourses: number;
  activeCourses: number;
  closedCourses: number;
  hiddenCourses: number;
  inactiveCourses: number;
  popularCourses: number;
  totalClicks: number;
  totalCategories?: number;
}

export interface AdminOverviewData {
  stats: AdminOverviewStats;
  bookStats?: {
    totalBooks: number;
    activeBooks: number;
  };
  categories: Category[];
  courses: Course[];
  recentClicks?: ClickRecord[];
  settings: SiteSettings | null;
  offerTimers: OfferTimer[];
  selectorIconOrder?: string[];
  selectorIconLabels?: Record<string, { tag?: string; title?: string; subLabel?: string }>;
  categoryCourseOrders?: Record<string, number[]>;
  storageInfo?: {
    backend: string;
    persistentOnVercel: boolean;
    warning?: string;
  } | null;
  serverNow?: string;
}

export interface BookStoreAdminPayload {
  books: Book[];
  bookCategories: BookCategory[];
  stats: {
    totalBooks: number;
    activeBooks: number;
    inactiveBooks: number;
    featuredBooks: number;
    totalCategories: number;
  };
}

export type OnlineBatchClassTheme =
  | 'indigo'
  | 'emerald'
  | 'teal'
  | 'purple'
  | 'orange'
  | 'blue'
  | 'rose';

export interface OnlineBatchClass {
  id: number;
  classKey: string;
  name: string;
  sectionTitle: string;
  badgeText: string;
  subtitle: string | null;
  theme: OnlineBatchClassTheme;
  iconKey: string;
  categorySlug: string | null;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface OnlineBatchCourseEntry {
  id: number;
  batchClassId: number;
  courseId: number;
  customBadge: string;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt?: string | null;
  updatedAt?: string | null;
  course?: Course;
}

export interface OnlineBatchSection {
  batchClass: OnlineBatchClass;
  courses: Course[];
  entries: OnlineBatchCourseEntry[];
}

export type OnlineBatchSectionKey = 'academic_program' | 'online_batch';

export interface OnlineBatchPageHeaderConfig {
  title: string;
  subtitle: string;
  description: string;
}

export interface OnlineBatchPageSectionConfig {
  id: OnlineBatchSectionKey;
  title: string;
  description: string;
  position: number;
  isVisible: boolean;
}

export interface OnlineBatchPageIconItem {
  id: string;
  tag: string;
  title: string;
  subLabel: string;
  iconKey: CategoryIconKey;
  position: number;
  isVisible: boolean;
}

export interface OnlineBatchPageConfig {
  header: OnlineBatchPageHeaderConfig;
  sections: OnlineBatchPageSectionConfig[];
  classIcons: OnlineBatchPageIconItem[];
  updatedAt?: string | null;
}

export interface OnlineBatchAdminPayload {
  classes: OnlineBatchClass[];
  entries: OnlineBatchCourseEntry[];
  availableCourses: Course[];
  categories: Category[];
  pageConfig?: OnlineBatchPageConfig;
  stats: {
    totalClasses: number;
    activeClasses: number;
    totalAssignments: number;
    activeAssignments: number;
  };
}

export type ClassGuideKey = 'class-6' | 'class-7' | 'class-8';

export type ClassGuideIconKey =
  | 'play-circle'
  | 'book-open'
  | 'file-check'
  | 'list-checks'
  | 'bot'
  | 'user-check'
  | 'bar-chart'
  | 'users'
  | 'graduation-cap'
  | 'gift'
  | 'award'
  | 'book-check'
  | 'clock'
  | 'calendar-days'
  | 'calendar-clock'
  | 'target'
  | 'video'
  | 'sparkles'
  | 'zap'
  | 'layers'
  | 'check-circle';

export interface ClassGuideStructureItem {
  id: string;
  title: string;
  description: string;
  linkUrl: string;
  imageUrl: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuideBonusItem {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  linkUrl: string;
  imageUrl: string;
  imageAlt: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuideScheduleColumn {
  id: string;
  heading: string;
  description: string;
  points: string[];
  linkUrl: string;
  imageUrl: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuideExclusiveFeature {
  id: string;
  badge: string;
  title: string;
  tagline: string;
  bullets: string[];
  linkUrl: string;
  imageUrl: string;
  imageAlt: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuideBundleItem {
  id: string;
  name: string;
  timeframe: string;
  focusSummary: string;
  linkUrl: string;
  imageUrl: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuidePhaseItem {
  id: string;
  label: string;
  detail: string;
  linkUrl: string;
  imageUrl: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuidePlanAccordionItem {
  id: string;
  title: string;
  answer: string;
  linkUrl: string;
  imageUrl: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuidePillarItem {
  id: string;
  title: string;
  description: string;
  linkUrl: string;
  imageUrl: string;
  iconKey: ClassGuideIconKey;
  displayOrder: number;
  isActive: boolean;
}

export interface ClassGuideConfig {
  classKey: ClassGuideKey;
  guideName: string;
  guideIconKey: ClassGuideIconKey;
  isEnabled: boolean;
  headerBadge: string;
  headerTitlePrefix: string;
  headerTitleHighlight: string;
  headerDescription: string;
  headerSummaryPill: string;
  structureHeading: string;
  structureSubheading: string;
  structureItems: ClassGuideStructureItem[];
  bonusHeading: string;
  bonusItems: ClassGuideBonusItem[];
  scheduleHeading: string;
  scheduleSubheading: string;
  scheduleColumns: ClassGuideScheduleColumn[];
  exclusiveHeading: string;
  exclusiveSubheading: string;
  exclusiveFeatures: ClassGuideExclusiveFeature[];
  bundleHeading: string;
  bundleIntro: string;
  bundles: ClassGuideBundleItem[];
  fiveMonthHeading: string;
  fiveMonthItems: ClassGuidePhaseItem[];
  oneMonthHeading: string;
  oneMonthItems: ClassGuidePhaseItem[];
  planHeading: string;
  planSubheading: string;
  planAccordionItems: ClassGuidePlanAccordionItem[];
  batch2027Heading: string;
  pillars: ClassGuidePillarItem[];
  closingStatement: string;
  updatedAt?: string | null;
}

export type ClassGuidesMap = Record<ClassGuideKey, ClassGuideConfig>;



