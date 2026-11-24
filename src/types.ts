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
