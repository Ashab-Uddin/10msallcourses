const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumber(value: number | string): string {
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  const formatted = !isNaN(num) ? num.toLocaleString('en-IN') : String(value);
  return formatted.replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);
}

export function parseFeatures(featuresRaw: string): string[] {
  if (!featuresRaw) return [];
  try {
    const parsed = JSON.parse(featuresRaw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fallback to comma-separated string
  }
  return featuresRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getGradientClasses(theme: string): {
  bg: string;
  badgeText: string;
} {
  switch (theme) {
    case 'slate':
      return {
        bg: 'bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a]',
        badgeText: 'text-red-600',
      };
    case 'rose':
      return {
        bg: 'bg-gradient-to-r from-[#881337] via-[#701a75] to-[#4c0519]',
        badgeText: 'text-red-600',
      };
    case 'crimson':
      return {
        bg: 'bg-gradient-to-r from-[#be123c] via-[#9f1239] to-[#881337]',
        badgeText: 'text-red-600',
      };
    case 'emerald':
      return {
        bg: 'bg-gradient-to-r from-[#065f46] via-[#047857] to-[#064e3b]',
        badgeText: 'text-red-600',
      };
    case 'amber':
      return {
        bg: 'bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#78350f]',
        badgeText: 'text-red-600',
      };
    case 'blue':
      return {
        bg: 'bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#1e40af]',
        badgeText: 'text-red-600',
      };
    case 'red':
    default:
      return {
        bg: 'bg-gradient-to-r from-[#dc2626] to-[#b91c1c]',
        badgeText: 'text-red-600',
      };
  }
}

export const PRESET_COURSE_IMAGES = [
  {
    label: 'HSC Science 3D Cover',
    url: '/images/course_hsc_science_1791228377506.jpg',
  },
  {
    label: 'Spoken English & IELTS Cover',
    url: '/images/course_spoken_english_1791228393736.jpg',
  },
  {
    label: 'Web Development & Coding Cover',
    url: '/images/course_web_development_1791228405497.jpg',
  },
  {
    label: 'Varsity Admission Cover',
    url: '/images/course_varsity_admission_1791228416821.jpg',
  },
];
