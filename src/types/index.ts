export interface Course {
  id: number;
  title: string;
  slug: string;
  category_slug: string;
  category_name?: string;
  short_badge: string;
  header_title: string;
  header_subtitle: string;
  discount_badge_text: string;
  gradient_theme: 'red' | 'blue' | 'emerald' | 'purple' | 'amber';
  description: string;
  full_description?: string;
  image_url: string;
  original_price: number;
  discount_price: number;
  discount_percent: number;
  rating: string;
  student_count: string;
  duration: string;
  target_students: string;
  instructor_info: string;
  instructor_icon?: string;
  features: string[];
  affiliate_url: string;
  is_popular: boolean;
  is_featured: boolean;
  status: 'published' | 'draft';
  click_count: number;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
  badge_color: 'red' | 'blue' | 'green' | 'purple' | 'amber' | 'slate';
  display_order: number;
  status: 'active' | 'inactive';
  icon?: string;
}

export interface SiteSettings {
  id: number;
  site_title: string;
  whatsapp_number: string;
  whatsapp_link: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  countdown_label: string;
  countdown_end_date: string;
  affiliate_disclosure_short: string;
  contact_email: string;
  notice_bar_text: string;
  notice_bar_active: boolean;
}

export interface ClickRecord {
  id: number;
  course_id: number;
  course_slug: string;
  course_title: string;
  referrer: string;
  clicked_at: string;
}

export interface PortalData {
  categories: Category[];
  courses: Course[];
  settings: SiteSettings;
}

export interface AdminStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalCategories: number;
  featuredCourses: number;
  totalClicks: number;
}
