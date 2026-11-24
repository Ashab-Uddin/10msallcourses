import type { Category } from '../types.ts';
import { categorySlugsMatch } from './categoryMatching.ts';
import { decodeCourseSlug, isReservedCategorySlug } from './courseSlug.ts';
import { parseNavbarGroupFromPath, type NavbarGroupKey } from './navbarCategories.ts';

export type AcademicLevel = 'hsc' | 'ssc' | 'class';

export type RouteState =
  | { view: 'home' }
  | { view: 'course'; slug: string }
  | { view: 'bookstore'; categorySlug?: string }
  | { view: 'navgroup'; groupKey: NavbarGroupKey; categorySlug?: string }
  | { view: 'category'; slug: string; subFilter?: string }
  | { view: 'academic_overview' }
  | { view: 'academic'; level: AcademicLevel; batchOrClass: string; sectionHash?: string }
  | { view: 'admin_login' }
  | { view: 'admin_dashboard' };

export const VIRTUAL_ROOT_CATEGORY_SLUGS = new Set([
  'language-learning',
  'skills',
  'free-course',
  'free',
  'free-courses',
  'hsc-28',
  'hsc-27',
  'ssc-29',
  'class-9',
  'school',
]);

export function parseCurrentRoute(
  pathname: string,
  hash?: string,
  categories: Category[] = []
): RouteState {
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login' || pathname === '/admin/login/') {
      return { view: 'admin_login' };
    }
    return { view: 'admin_dashboard' };
  }

  // Normalize path without trailing slashes
  const clean = pathname.replace(/\/+$/, '') || '/';
  const cleanHash = (hash || '').replace('#', '');

  // 0. Dynamic Navbar Group Category Pages: /programs/{group}[/{categorySlug}] & /school
  const navGroupMatch = parseNavbarGroupFromPath(clean);
  if (navGroupMatch) {
    return {
      view: 'navgroup',
      groupKey: navGroupMatch.groupKey,
      categorySlug: navGroupMatch.categorySlug,
    };
  }

  // 1. Language Learning: /language-learning (plus legacy /categories/language-learning or /category/language-learning)
  if (
    clean === '/language-learning' ||
    clean === '/categories/language-learning' ||
    clean === '/category/language-learning'
  ) {
    return { view: 'category', slug: 'language-learning' };
  }

  // 2. Skills: /skills/ or /category/skills/ or /categories/skills/
  if (clean === '/skills' || clean === '/category/skills' || clean === '/categories/skills') {
    return { view: 'category', slug: 'skills' };
  }

  // 3. Admission: /admission/ or /category/admission/ -> dynamic admission navgroup unless DB explicitly defines 'admission'
  if (clean === '/admission' || clean === '/category/admission' || clean === '/categories/admission') {
    const hasExactAdmission = categories.some(
      (c) => (c.status || 'active') === 'active' && categorySlugsMatch(c.slug, 'admission')
    );
    return hasExactAdmission
      ? { view: 'category', slug: 'admission' }
      : { view: 'navgroup', groupKey: 'admission' };
  }

  // 3b. Free Course: /free-course, /free, /free-courses, /category/free-course
  if (
    clean === '/free-course' ||
    clean === '/free' ||
    clean === '/free-courses' ||
    clean === '/category/free-course' ||
    clean === '/categories/free-course'
  ) {
    return { view: 'category', slug: 'free-course' };
  }

  // 4. Book Store: /books, /book-store, /books/:categorySlug, /category/books
  if (
    clean === '/books' ||
    clean === '/book-store' ||
    clean === '/category/books' ||
    clean === '/categories/books'
  ) {
    return { view: 'bookstore' };
  }
  if (clean.startsWith('/books/')) {
    const rawBookCatSlug = clean.slice('/books/'.length).split('/')[0] || '';
    const bookCatSlug = decodeCourseSlug(rawBookCatSlug).normalize('NFC');
    return { view: 'bookstore', categorySlug: bookCatSlug || undefined };
  }

  // 5. Academic Batch Selector Overview (/academic, /hsc, /hsc/hsc-28) & Dedicated HSC 26/27 routes
  if (clean === '/hsc/hsc-26' || clean === '/academic/hsc/hsc-26') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-26', sectionHash: cleanHash };
  }
  if (clean === '/hsc/hsc-27' || clean === '/academic/hsc/hsc-27') {
    return { view: 'academic', level: 'hsc', batchOrClass: 'hsc-27', sectionHash: cleanHash };
  }
  if (
    clean === '/academic' ||
    clean === '/hsc' ||
    clean === '/academic/hsc' ||
    clean === '/hsc/hsc-28' ||
    clean === '/academic/hsc/hsc-28'
  ) {
    return { view: 'academic_overview' };
  }

  // 6. SSC Routes: /ssc/ssc-27/ (দশম শ্রেণি), /class-9 & /ssc/ssc-29/ (৯ম শ্রেণি SSC 29)
  if (
    clean === '/ssc/ssc-27' ||
    clean === '/academic/ssc/ssc-27' ||
    clean === '/class-10' ||
    clean === '/academic/class-10'
  ) {
    return { view: 'academic', level: 'ssc', batchOrClass: 'ssc-27', sectionHash: cleanHash };
  }
  if (
    clean === '/ssc/ssc-29' ||
    clean === '/academic/ssc/ssc-29' ||
    clean === '/ssc-29' ||
    clean === '/class-9' ||
    clean === '/academic/class-9'
  ) {
    const matchedClass9Cat = categories.find(
      (c) =>
        categorySlugsMatch(c.slug, 'class-9') ||
        categorySlugsMatch(c.slug, 'ssc-29') ||
        categorySlugsMatch(c.slug, 'ssc-2029') ||
        categorySlugsMatch(c.slug, '৯ম-শ্রেণি-ssc-29')
    );
    return { view: 'category', slug: matchedClass9Cat?.slug || 'class-9' };
  }
  if (clean === '/ssc/ssc-28' || clean === '/academic/ssc/ssc-28') {
    return { view: 'academic', level: 'ssc', batchOrClass: 'ssc-28', sectionHash: cleanHash };
  }
  if (clean === '/ssc' || clean === '/academic/ssc') {
    return { view: 'academic', level: 'ssc', batchOrClass: 'ssc-27', sectionHash: cleanHash };
  }

  // 7. Junior School Classes: /class-5/, /class-6/, /class-7/, /class-8/
  const classMatch = clean.match(/^\/(?:academic\/)?class-?([5-8])$/);
  if (classMatch) {
    return { view: 'academic', level: 'class', batchOrClass: `class${classMatch[1]}`, sectionHash: cleanHash };
  }

  // Generic category path: /category/:slug
  if (clean.startsWith('/category/') || clean.startsWith('/categories/')) {
    const parts = clean.split('/').filter(Boolean);
    const slug = decodeCourseSlug(parts[1] || '').normalize('NFC');
    if (slug) {
      return { view: 'category', slug };
    }
  }

  // Dedicated shared course landing page: /courses/:slug
  if (clean.startsWith('/courses/')) {
    const rawSlug = clean.slice('/courses/'.length).split('/')[0] || '';
    const cleanCourseSlug = decodeCourseSlug(rawSlug);
    if (cleanCourseSlug) {
      return { view: 'course', slug: cleanCourseSlug };
    }
    return { view: 'home' };
  }

  // Root-level dynamic category route: /:slug (e.g. /hsc-28-science)
  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 1) {
    const rawSlug = segments[0] || '';
    const decodedSlug = decodeCourseSlug(rawSlug).normalize('NFC');
    if (
      decodedSlug &&
      !isReservedCategorySlug(decodedSlug) &&
      !/\.[a-z0-9]{1,8}$/i.test(decodedSlug)
    ) {
      const matchedCat = categories.find((c) => categorySlugsMatch(c.slug, decodedSlug));
      if (matchedCat) {
        return { view: 'category', slug: matchedCat.slug };
      }
      if (
        VIRTUAL_ROOT_CATEGORY_SLUGS.has(decodedSlug.toLowerCase()) ||
        categories.length === 0
      ) {
        return { view: 'category', slug: decodedSlug };
      }
    }
  }

  return { view: 'home' };
}

/**
 * Server-side check: does this public path correspond to a real page?
 * Unknown paths fall through parseCurrentRoute to the home view, so the
 * server must reject them to return a genuine HTTP 404.
 */
export function isKnownPublicRoute(
  pathname: string,
  categories: Category[],
  bookCategories: Array<{ slug: string }> = []
): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return true;
  const route = parseCurrentRoute(clean, '', categories);
  switch (route.view) {
    case 'home':
      return false;
    case 'navgroup':
      if (!route.categorySlug) return true;
      return categories.some((c) => categorySlugsMatch(c.slug, route.categorySlug!));
    case 'bookstore':
      if (!route.categorySlug) return true;
      return bookCategories.some(
        (c) => c.slug.normalize('NFC').toLowerCase() === route.categorySlug!.toLowerCase()
      );
    default:
      return true;
  }
}
