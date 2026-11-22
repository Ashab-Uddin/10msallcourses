/**
 * Course URL & Bengali Unicode Slug Helpers
 *
 * Ensures Bangla/English course titles produce clean, readable Unicode slugs
 * (e.g. "HSC 28 অনলাইন ব্যাচ - কেমিস্ট্রি" -> "hsc-28-অনলাইন-ব্যাচ-কেমিস্ট্রি")
 * while remaining 100% compatible with legacy percent-encoded URLs.
 */

export function decodeCourseSlug(rawSlug: string): string {
  let current = (rawSlug || '').trim();
  if (!current) return '';

  // Handle single or accidentally double-encoded UTF-8 percent sequences
  for (let pass = 0; pass < 3; pass += 1) {
    if (!/%[0-9a-fA-F]{2}/.test(current)) {
      break;
    }
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }

  return current.trim();
}

export function generateUnicodeCourseSlug(raw: string): string {
  const decoded = decodeCourseSlug(raw).normalize('NFC').trim().toLowerCase();
  if (!decoded) return '';

  return decoded
    // Strip zero-width joiners/non-joiners that sometimes sneak into Bangla text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Convert whitespace and common punctuation separators into hyphens
    .replace(/[\s_/\\|+–—−.,:;!?()[\]{}'"`~@#$%^&*=<>।]+/g, '-')
    // Keep only ASCII alphanumeric, Bengali Unicode range, and hyphens
    .replace(/[^a-z0-9\u0980-\u09FF-]/g, '')
    // Collapse multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Live-typing sanitizer for the admin slug input field.
 * Preserves a trailing hyphen while typing so users can type multi-word slugs naturally.
 */
export function sanitizeEditableUnicodeSlug(raw: string): string {
  const decoded = decodeCourseSlug(raw).normalize('NFC').toLowerCase();
  if (!decoded) return '';

  return decoded
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0980-\u09FF-]/g, '')
    .replace(/-+/g, '-');
}

/**
 * Builds a clean, human-readable Unicode path for browser display and clipboard sharing:
 * e.g. "/courses/hsc-28-অনলাইন-ব্যাচ-কেমিস্ট্রি"
 */
export function buildReadableCoursePath(slug: string): string {
  const decoded = decodeCourseSlug(slug)
    .normalize('NFC')
    .replace(/[\s]+/g, '-')
    .replace(/^\/+|\/+$/g, '');
  if (!decoded) return '/courses';
  return `/courses/${decoded}`;
}

/**
 * Builds the full readable Unicode share URL for copying to clipboard:
 * e.g. "https://10msallcourses.vercel.app/courses/hsc-28-অনলাইন-ব্যাচ-কেমিস্ট্রি"
 */
export function buildReadableCourseShareUrl(origin: string, slug: string): string {
  const cleanOrigin = (origin || '').trim().replace(/\/+$/, '');
  const path = buildReadableCoursePath(slug);
  return cleanOrigin ? `${cleanOrigin}${path}` : path;
}

/**
 * Builds a clean, human-readable Unicode category path:
 * e.g. "/category/hsc-28-বিজ্ঞান-কোর্স"
 */
export function buildReadableCategoryPath(slug: string): string {
  const decoded = decodeCourseSlug(slug)
    .normalize('NFC')
    .replace(/[\s]+/g, '-')
    .replace(/^\/+|\/+$/g, '');
  if (!decoded) return '/category';
  return `/category/${decoded}`;
}

/**
 * Builds the full readable Unicode category URL for copying to clipboard:
 * e.g. "https://10msallcourses.com/category/hsc-28-বিজ্ঞান-কোর্স"
 */
export function buildReadableCategoryUrl(origin: string, slug: string): string {
  const cleanOrigin = (origin || '').trim().replace(/\/+$/, '');
  const path = buildReadableCategoryPath(slug);
  return cleanOrigin ? `${cleanOrigin}${path}` : path;
}
