const SAFE_TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
]);

const FALLBACK_AFFILIATE_ORIGIN = 'https://10minuteschool.com';
const MAX_URL_LENGTH = 2048;
const MAX_LOCAL_IMAGE_PATH_LENGTH = 512;

// Mirrors PostgreSQL CHECK constraints (`chk_courses_affiliate_url_allowlist`,
// `chk_courses_image_url_allowlist`, `chk_website_settings_*_link_allowlist`) 1:1.
const PUBLIC_HTTPS_URL_RE =
  /^https:\/\/([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+([A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})(:[0-9]{1,5})?([/?#][^\s\x00-\x1f\x7f]*)?$/;

const LOCAL_IMAGES_PATH_RE =
  /^\/images\/[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

export function validateExternalHttpUrl(raw: unknown): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'একটি বৈধ ওয়েব লিংক (https://...) প্রদান করুন।' };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'লিংক (URL) খালি রাখা যাবে না।' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: 'লিংকটি অতিরিক্ত দীর্ঘ (সর্বোচ্চ ২০৪৮ অক্ষর)।' };
  }

  if (trimmed.includes('\\') || /[\s\x00-\x1f\x7f]/.test(trimmed)) {
    return {
      valid: false,
      error: 'URL-এ কোনো স্পেস, ব্যাকস্ল্যাশ বা অনিরাপদ অক্ষর থাকতে পারবে না।',
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'নিরাপত্তার জন্য শুধুমাত্র https:// দিয়ে শুরু হওয়া পাবলিক ওয়েব লিংক গ্রহণযোগ্য।',
      };
    }
    if (parsed.username || parsed.password) {
      return {
        valid: false,
        error: 'URL-এ ইউজারনেম বা পাসওয়ার্ড যুক্ত করা যাবে না।',
      };
    }

    const normalized = parsed.toString();
    if (!PUBLIC_HTTPS_URL_RE.test(normalized)) {
      return {
        valid: false,
        error: 'সঠিক পাবলিক ডোমেইনসহ বৈধ https:// URL প্রদান করুন (localhost বা IP গ্রহণযোগ্য নয়)।',
      };
    }

    return { valid: true, normalized };
  } catch {
    return {
      valid: false,
      error: 'অবৈধ URL ফরম্যাট। উদাহরণ: https://10minuteschool.com/product/course-name',
    };
  }
}

export function buildAffiliateRedirectUrl(
  rawUrl?: string | null,
  defaultAffiliateRef?: string | null,
  incomingSearchParams?: URLSearchParams | null
): string {
  const checked = validateExternalHttpUrl(rawUrl || '');
  const baseUrlStr =
    checked.valid && checked.normalized ? checked.normalized : FALLBACK_AFFILIATE_ORIGIN;

  try {
    const target = new URL(baseUrlStr);

    // Preserve all existing query parameters on the affiliate URL.
    // Only append defaultAffiliateRef if the link does not already have an affiliate/ref parameter.
    const cleanRef = (defaultAffiliateRef || '').trim();
    if (
      cleanRef &&
      !target.searchParams.has('aff') &&
      !target.searchParams.has('ref') &&
      !target.searchParams.has('aff_id')
    ) {
      target.searchParams.set('ref', cleanRef);
    }

    // Forward safe campaign tracking query parameters without overriding existing link params.
    if (incomingSearchParams) {
      incomingSearchParams.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (
          SAFE_TRACKING_PARAMS.has(lowerKey) &&
          value &&
          value.length <= 200 &&
          !target.searchParams.has(key)
        ) {
          target.searchParams.set(key, value);
        }
      });
    }

    return target.toString();
  } catch {
    return FALLBACK_AFFILIATE_ORIGIN;
  }
}

export function sanitizeImageUrl(raw: unknown): {
  valid: boolean;
  value: string | null;
  error?: string;
} {
  if (raw === null || raw === undefined) {
    return { valid: true, value: null };
  }
  if (typeof raw !== 'string') {
    return { valid: false, value: null, error: 'অবৈধ ইমেজ লিংক ফরম্যাট।' };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, value: null };
  }

  // Strictly reject inline data: URIs so PostgreSQL CHECK constraints & DB storage stay clean
  if (trimmed.toLowerCase().startsWith('data:')) {
    return {
      valid: false,
      value: null,
      error:
        'সরাসরি base64/data ইমেজ সংরক্ষণ করা যাবে না। অনুগ্রহ করে ImageKit-এ আপলোড করুন অথবা বৈধ https:// ইমেজ URL দিন।',
    };
  }

  // Strict project-owned relative /images/... path allowlist (mirrors PostgreSQL CHECK constraint)
  if (trimmed.startsWith('/')) {
    if (
      trimmed.length > MAX_LOCAL_IMAGE_PATH_LENGTH ||
      trimmed.includes('..') ||
      !LOCAL_IMAGES_PATH_RE.test(trimmed)
    ) {
      return {
        valid: false,
        value: null,
        error: 'লোকাল ইমেজ পাথ অবশ্যই নিরাপদ /images/... ফরম্যাটে হতে হবে।',
      };
    }
    return { valid: true, value: trimmed };
  }

  // External public HTTPS CDN / ImageKit URL
  const checked = validateExternalHttpUrl(trimmed);
  if (!checked.valid) {
    return {
      valid: false,
      value: null,
      error: checked.error || 'অবৈধ ইমেজ URL। শুধুমাত্র https:// লিংক গ্রহণযোগ্য।',
    };
  }
  return { valid: true, value: checked.normalized || trimmed };
}
