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
const MAX_INLINE_IMAGE_LENGTH = 1_400_000; // ~1MB base64 data URI cap

export function validateExternalHttpUrl(raw: unknown): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'একটি বৈধ ওয়েব লিংক (URL) প্রদান করুন।' };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'লিংক (URL) খালি রাখা যাবে না।' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: 'লিংকটি অতিরিক্ত দীর্ঘ (সর্বোচ্চ ২০৪৮ অক্ষর)।' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        error: 'শুধুমাত্র http:// অথবা https:// দিয়ে শুরু হওয়া নিরাপদ লিংক গ্রহণযোগ্য।',
      };
    }
    if (!parsed.hostname) {
      return { valid: false, error: 'সঠিক ডোমেইন নামসহ বৈধ URL প্রদান করুন।' };
    }
    return { valid: true, normalized: parsed.toString() };
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
  const baseUrlStr = checked.valid && checked.normalized ? checked.normalized : FALLBACK_AFFILIATE_ORIGIN;

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

  // Allow safe local relative paths (e.g., /images/...)
  if (trimmed.startsWith('/')) {
    if (trimmed.includes('..') || trimmed.startsWith('//')) {
      return { valid: false, value: null, error: 'অনিরাপদ লোকাল ইমেজ পাথ।' };
    }
    return { valid: true, value: trimmed };
  }

  // Allow safe raster Data URIs (for local dev / small optimized images)
  if (trimmed.startsWith('data:')) {
    const isValidRasterDataUri =
      /^data:image\/(jpeg|jpg|png|webp|avif);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed);
    if (!isValidRasterDataUri) {
      return {
        valid: false,
        value: null,
        error: 'শুধুমাত্র JPG, PNG, WebP বা AVIF ছবি গ্রহণযোগ্য।',
      };
    }
    if (trimmed.length > MAX_INLINE_IMAGE_LENGTH) {
      return {
        valid: false,
        value: null,
        error: 'ইনলাইন ছবির আকার অতিরিক্ত বড়। অনুগ্রহ করে ১ মেগাবাইটের কম অথবা ক্লাউড ইমেজ URL ব্যবহার করুন।',
      };
    }
    return { valid: true, value: trimmed };
  }

  // External HTTP(S) CDN URL
  const checked = validateExternalHttpUrl(trimmed);
  if (!checked.valid) {
    return { valid: false, value: null, error: checked.error || 'অবৈধ ইমেজ URL।' };
  }
  return { valid: true, value: checked.normalized || trimmed };
}
