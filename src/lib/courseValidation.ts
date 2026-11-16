export interface BatchKeywordOption {
  id: string;
  label: string;
  subLabel: string;
  matcher: RegExp;
}

export const BATCH_KEYWORD_OPTIONS: BatchKeywordOption[] = [
  {
    id: 'hsc-26',
    label: 'HSC 26',
    subLabel: 'HSC ২০২৬',
    matcher:
      /(?:^|[\s,|/(\[])(?:hsc[\s-]*(?:26|2026|২৬|২০২৬)|এইচএসসি[\s-]*(?:26|2026|২৬|২০২৬))(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'hsc-27',
    label: 'HSC 27',
    subLabel: 'HSC ২০২৭',
    matcher:
      /(?:^|[\s,|/(\[])(?:hsc[\s-]*(?:27|2027|২৭|২০২৭)|এইচএসসি[\s-]*(?:27|2027|২৭|২০২৭))(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'hsc-28',
    label: 'HSC 28',
    subLabel: 'HSC ২০২৮',
    matcher:
      /(?:^|[\s,|/(\[])(?:hsc[\s-]*(?:28|2028|২৮|২০২৮)|এইচএসসি[\s-]*(?:28|2028|২৮|২০২৮))(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'ssc-2027',
    label: 'SSC 2027',
    subLabel: '১০ম শ্রেণি',
    matcher:
      /(?:^|[\s,|/(\[])(?:ssc[\s-]*(?:2027|27|২০২৭|২৭)|এসএসসি[\s-]*(?:2027|27|২০২৭|২৭)|class[\s-]*10|(?:১০ম|দশম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'ssc-2028',
    label: 'SSC 2028',
    subLabel: '৯ম শ্রেণি',
    matcher:
      /(?:^|[\s,|/(\[])(?:ssc[\s-]*(?:2028|28|২০২৮|২৮)|এসএসসি[\s-]*(?:2028|28|২০২৮|২৮)|class[\s-]*9|(?:৯ম|নবম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'class-6',
    label: 'Class 6',
    subLabel: '৬ষ্ঠ শ্রেণি',
    matcher: /(?:^|[\s,|/(\[])(?:class[\s-]*6|(?:৬ষ্ঠ|ষষ্ঠ)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'class-7',
    label: 'Class 7',
    subLabel: '৭ম শ্রেণি',
    matcher: /(?:^|[\s,|/(\[])(?:class[\s-]*7|(?:৭ম|সপ্তম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
  {
    id: 'class-8',
    label: 'Class 8',
    subLabel: '৮ম শ্রেণি',
    matcher: /(?:^|[\s,|/(\[])(?:class[\s-]*8|(?:৮ম|অষ্টম)(?:[\s-]*শ্রে[ণন]ি)?)(?=$|[\s,|/)\].!])/i,
  },
];

export const DEPARTMENT_KEYWORD_OPTIONS = [
  'বিজ্ঞান বিভাগ',
  'ব্যবসায় শিক্ষা',
  'মানবিক বিভাগ',
  'এডমিশন',
  'ভার্সিটি',
  'মেডিকেল',
  'বুয়েট',
] as const;

export function extractMatchedBatchKeywords(input: string): BatchKeywordOption[] {
  const normalized = (input || '')
    .normalize('NFC')
    .replace(/য\u09BC/g, 'য়')
    .replace(/ড\u09BC/g, 'ড়')
    .replace(/ঢ\u09BC/g, 'ঢ়')
    .trim();

  if (!normalized) return [];

  return BATCH_KEYWORD_OPTIONS.filter((opt) => opt.matcher.test(normalized));
}

export function validateSingleBatchKeyword(targetStudents: unknown): {
  valid: boolean;
  matchedBatches: BatchKeywordOption[];
  error?: string;
} {
  const text = typeof targetStudents === 'string' ? targetStudents.trim() : '';
  if (!text) {
    return { valid: true, matchedBatches: [] };
  }

  const matchedBatches = extractMatchedBatchKeywords(text);
  if (matchedBatches.length > 1) {
    const names = matchedBatches.map((b) => b.label).join(', ');
    return {
      valid: false,
      matchedBatches,
      error: `একটি কোর্সে শুধুমাত্র একটি ব্যাচ কীওয়ার্ড নির্বাচন করা যাবে (পাওয়া গেছে: ${names})। অনুগ্রহ করে একটিমাত্র ব্যাচ রাখুন।`,
    };
  }

  return { valid: true, matchedBatches };
}

export function computeDiscountPercent(originalPrice: number, discountPrice: number): number {
  if (
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(discountPrice) ||
    originalPrice <= 0 ||
    discountPrice < 0 ||
    discountPrice >= originalPrice
  ) {
    return 0;
  }
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

export function validateCoursePricing(
  originalPrice: number,
  discountPrice: number
): { valid: boolean; discountPercent: number; error?: string } {
  if (
    !Number.isFinite(originalPrice) ||
    originalPrice < 0 ||
    !Number.isFinite(discountPrice) ||
    discountPrice < 0
  ) {
    return {
      valid: false,
      discountPercent: 0,
      error: 'কোর্সের মূল্য অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।',
    };
  }

  if (originalPrice > 0 && discountPrice > originalPrice) {
    return {
      valid: false,
      discountPercent: 0,
      error: 'ডিসকাউন্টেড অফার মূল্য (Discount Price) পূর্বের মূল মূল্যের (Original Price) চেয়ে বেশি হতে পারবে না।',
    };
  }

  return {
    valid: true,
    discountPercent: computeDiscountPercent(originalPrice, discountPrice),
  };
}
