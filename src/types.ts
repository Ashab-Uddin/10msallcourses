export interface Category {
  id: number;
  name: string;
  slug: string;
  subtitle: string | null;
  badgeColor: string;
  displayOrder: number;
  status: string;
  createdAt?: string | null;
}

export type CourseGroupKey = 'science' | 'business' | 'humanities';

export interface Course {
  id: number;
  title: string;
  slug: string;
  categoryId: number | null;
  categorySlug: string;
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
  features: string; // JSON string array
  affiliateUrl: string;
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


