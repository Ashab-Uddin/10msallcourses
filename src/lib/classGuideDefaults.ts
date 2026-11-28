import type {
  ClassGuideBonusItem,
  ClassGuideBundleItem,
  ClassGuideConfig,
  ClassGuideExclusiveFeature,
  ClassGuideIconKey,
  ClassGuideKey,
  ClassGuidePhaseItem,
  ClassGuidePillarItem,
  ClassGuidePlanAccordionItem,
  ClassGuideScheduleColumn,
  ClassGuideStructureItem,
  ClassGuidesMap,
} from '../types.ts';
import { normalizeClassGuideIconKey } from './classGuideIcons.ts';

export const CLASS_GUIDE_KEYS: readonly ClassGuideKey[] = [
  'class-6',
  'class-7',
  'class-8',
] as const;

export const CLASS_GUIDE_META: Record<
  ClassGuideKey,
  {
    key: ClassGuideKey;
    label: string;
    englishLabel: string;
    publicPath: string;
    shortBadge: string;
  }
> = {
  'class-6': {
    key: 'class-6',
    label: '৬ষ্ঠ শ্রেণি',
    englishLabel: 'Class 6',
    publicPath: '/class-6',
    shortBadge: 'Class 6 Guide',
  },
  'class-7': {
    key: 'class-7',
    label: '৭ম শ্রেণি',
    englishLabel: 'Class 7',
    publicPath: '/class-7',
    shortBadge: 'Class 7 Guide',
  },
  'class-8': {
    key: 'class-8',
    label: '৮ম শ্রেণি',
    englishLabel: 'Class 8',
    publicPath: '/class-8',
    shortBadge: 'Class 8 Guide',
  },
};

export function isValidClassGuideKey(value: unknown): value is ClassGuideKey {
  return value === 'class-6' || value === 'class-7' || value === 'class-8';
}

export function getClassGuideKeyFromNumber(classNum: number): ClassGuideKey | null {
  if (classNum === 6) return 'class-6';
  if (classNum === 7) return 'class-7';
  if (classNum === 8) return 'class-8';
  return null;
}

function cleanText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function cleanMultilineText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeGuideUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 600);
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Reject invalid URLs or dangerous protocols like javascript:/data:
  }
  return '';
}

export function validateGuideUrlInput(raw: unknown): {
  valid: boolean;
  value: string;
  error?: string;
} {
  if (raw === undefined || raw === null) {
    return { valid: true, value: '' };
  }
  const str = String(raw).replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!str) {
    return { valid: true, value: '' };
  }
  const safe = sanitizeGuideUrl(str);
  if (!safe) {
    return {
      valid: false,
      value: '',
      error:
        'লিংক/ইমেজ URL অবশ্যই "/" দিয়ে শুরু হওয়া পাথ অথবা বৈধ https:// বা http:// লিংক হতে হবে।',
    };
  }
  return { valid: true, value: safe };
}

function makeItemId(prefix: string, rawId: unknown, idx: number): string {
  const cleaned = cleanText(rawId, 64)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  return cleaned || `${prefix}-${idx + 1}`;
}

function cleanStringList(raw: unknown, maxItems = 12, maxItemLen = 300): string[] {
  if (!Array.isArray(raw)) return [];
  const result: string[] = [];
  for (const item of raw) {
    const txt = cleanText(item, maxItemLen);
    if (txt) result.push(txt);
    if (result.length >= maxItems) break;
  }
  return result;
}

function buildBaseStructureItems(): ClassGuideStructureItem[] {
  const items: Array<Omit<ClassGuideStructureItem, 'displayOrder' | 'isActive' | 'linkUrl' | 'imageUrl'>> = [
    {
      id: 'structure-1',
      title: 'ক্লাসেই চ্যাপ্টার কমপ্লিট',
      description:
        'প্রতিটি ক্লাসে কনসেপ্ট বেসিক, অনুশীলনীর প্রশ্ন ও সৃজনশীল প্রশ্নের প্রস্তুতি সম্পন্ন হবে, যেন বাসায় গিয়ে নতুন করে পড়া জমিয়ে রাখতে না হয়।',
      iconKey: 'play-circle',
    },
    {
      id: 'structure-2',
      title: 'গোছানো মাস্টারবুকে কমপ্লিট প্রিপারেশন',
      description:
        'এক্সপার্ট টিচারদের রিসার্চ-এ তৈরি মাস্টারবুকে থাকবে অধ্যায়ভিত্তিক গুরুত্বপূর্ণ বিষয়, প্রশ্ন ও পরীক্ষার সম্পূর্ণ প্রস্তুতি।',
      iconKey: 'book-open',
    },
    {
      id: 'structure-3',
      title: 'Daily MCQ + Monthly Exam',
      description:
        'প্রতিদিন MCQ কুইজ এবং মাসিক MCQ ও CQ পরীক্ষার মাধ্যমে নিয়মিত প্রস্তুতি যাচাই করার সুযোগ।',
      iconKey: 'file-check',
    },
    {
      id: 'structure-4',
      title: 'ফুল সিলেবাস মডেল টেস্ট',
      description:
        'বছরজুড়ে ধাপে ধাপে প্রস্তুতির পাশাপাশি পরীক্ষার আগে ফুল সিলেবাস মডেল টেস্ট দিয়ে নেওয়া যাবে চূড়ান্ত প্রস্তুতি।',
      iconKey: 'list-checks',
    },
    {
      id: 'structure-5',
      title: '24/7 AI Doubt Solver (TenTen)',
      description:
        'যেকোনো সময় পাওয়া যাবে AI সাপোর্ট — গণিত, বিজ্ঞান ও আইসিটি বিষয়ক যেকোনো প্রশ্নের তাৎক্ষণিক সমাধান।',
      iconKey: 'bot',
    },
    {
      id: 'structure-6',
      title: 'Dedicated Class Teacher & Student Advisor',
      description:
        'প্রতিটি শিক্ষার্থীর পড়াশোনার অগ্রগতি পর্যবেক্ষণ ও নিয়মিত একাডেমিক গাইডলাইন দিতে থাকবে ডেডিকেটেড সাপোর্ট টিম।',
      iconKey: 'user-check',
    },
    {
      id: 'structure-7',
      title: 'Monthly Progress Report',
      description:
        'প্রতি মাসে ক্লাস এটেন্ডেন্স, পরীক্ষার নম্বর ও পড়াশোনার অগ্রগতি নিয়ে বিস্তারিত রিপোর্ট কার্ড।',
      iconKey: 'bar-chart',
    },
    {
      id: 'structure-8',
      title: 'Monthly Parent-Teacher Meeting',
      description:
        'প্রতি মাসে অভিভাবকদের সাথে আলোচনায় শিক্ষার্থীর পড়াশোনা, দুর্বলতা ও পরবর্তী ধাপের প্রস্তুতির গাইডলাইন।',
      iconKey: 'users',
    },
    {
      id: 'structure-9',
      title: 'Expert Teacher Panel',
      description:
        'বাংলাদেশের অভিজ্ঞ বিষয়ভিত্তিক শিক্ষকরা তৈরি করছেন পুরো বছরের একাডেমিক ক্লাস, নোটস ও পরীক্ষার স্টাডি ম্যাটেরিয়াল।',
      iconKey: 'graduation-cap',
    },
  ];
  return items.map((item, idx) => ({
    ...item,
    linkUrl: '',
    imageUrl: '',
    displayOrder: idx + 1,
    isActive: true,
  }));
}

function buildBaseExclusiveFeatures(): ClassGuideExclusiveFeature[] {
  return [
    {
      id: 'exclusive-masterbook',
      badge: 'MAP মেথডে সাজানো',
      title: 'MasterBook',
      tagline: 'অধ্যায়ভিত্তিক পূর্ণাঙ্গ প্রিন্টেড গাইড',
      imageUrl: '/assets/aistudio/image_5f052f32.png',
      imageAlt: 'MAP মেথডে সাজানো তিনটি মাস্টারবুক',
      iconKey: 'book-open',
      bullets: [
        'যা পড়লে তুমি প্রতিটা টপিকে Master হয়ে উঠবে।',
        'এক্সামগুলো দিলে যা শিখেছ সেগুলো Apply করতে পারবে।',
        'প্র্যাকটিস করে Prove করতে পারবে তুমি প্রস্তুত।',
      ],
      linkUrl: '',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'exclusive-supersolve',
      badge: '২৪ ঘণ্টা ডাউট সলভ',
      title: 'SuperSolve',
      tagline: '২৪ ঘণ্টা ডাউট সলভের জন্য AI SuperSolve',
      imageUrl: '/assets/aistudio/image_f80fe1f0.png',
      imageAlt: '২৪ ঘণ্টা ডাউট সলভের জন্য AI SuperSolve',
      iconKey: 'bot',
      bullets: [
        'তোমার AI স্টাডি পার্টনার।',
        'গণিত ও বিজ্ঞান বিষয় রিলেটেড যেকোনো সমস্যার সমাধান।',
        'একদম ২৪/৭।',
      ],
      linkUrl: '',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'exclusive-superprep',
      badge: 'আনলিমিটেড প্র্যাকটিস',
      title: 'SuperPrep',
      tagline: 'আনলিমিটেড MCQ প্র্যাকটিসের মাধ্যমে এক্সাম প্রিপারেশন',
      imageUrl: '/assets/aistudio/image_b53497e0.png',
      imageAlt: 'SuperPrep আনলিমিটেড MCQ প্র্যাকটিস',
      iconKey: 'target',
      bullets: [
        'নিজেই তৈরি করো নিজের পরীক্ষা।',
        'যতখুশি তত MCQ পরীক্ষা।',
        'যেকোনো চ্যাপ্টারের যেকোনো টপিক ভিত্তিক পরীক্ষা।',
      ],
      linkUrl: '',
      displayOrder: 3,
      isActive: true,
    },
  ];
}

function buildBaseBundles(): ClassGuideBundleItem[] {
  return [
    {
      id: 'half-yearly',
      name: 'অর্ধ-বার্ষিক পরীক্ষা প্রস্তুতি',
      timeframe: 'জানুয়ারি থেকে জুন',
      focusSummary: 'ষান্মাসিক/অর্ধ-বার্ষিক পরীক্ষার সম্পূর্ণ সিলেবাস ও ৫+১ মাস প্রস্তুতি কাঠামো।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'book-check',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'annual',
      name: 'বার্ষিক পরীক্ষা প্রস্তুতি',
      timeframe: 'জুলাই থেকে ডিসেম্বর',
      focusSummary: 'বার্ষিক পরীক্ষার পূর্ণাঙ্গ সিলেবাস কভারেজ ও চূড়ান্ত মডেল টেস্ট প্রস্তুতি।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'award',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'full-year',
      name: 'সম্পূর্ণ বছর',
      timeframe: 'জানুয়ারি থেকে ডিসেম্বর',
      focusSummary: 'অর্ধ-বার্ষিক ও বার্ষিক—পুরো শিক্ষাবর্ষের ধারাবাহিক ক্লাস, বই ও মূল্যায়ন।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'sparkles',
      displayOrder: 3,
      isActive: true,
    },
  ];
}

function buildBaseFiveMonthItems(): ClassGuidePhaseItem[] {
  return [
    {
      id: 'five-live-class',
      label: 'Live Class',
      detail: 'সপ্তাহে ৫ দিন লাইভ ক্লাস',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'video',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'five-daily-hw',
      label: 'Daily HW',
      detail: 'প্রতিটি ক্লাস শেষে ক্লাস টপিকের ওপর MCQ এক্সাম',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'file-check',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'five-monthly-exam',
      label: 'Monthly Exam',
      detail: 'প্রতি ক্লাস শেষে (CQ+MCQ) – খাতা দেখে দেওয়া হবে',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'list-checks',
      displayOrder: 3,
      isActive: true,
    },
    {
      id: 'five-revision-week',
      label: 'Revision Week',
      detail: 'মাসের সবগুলো মূল ক্লাস শেষে পুরো মাসের পড়া ঝালাই হবে রিভিশন উইকে।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'calendar-clock',
      displayOrder: 4,
      isActive: true,
    },
    {
      id: 'five-super-solve',
      label: 'Super Solve (AI)',
      detail:
        'গণিত ও বিজ্ঞান বিষয় তোমার যেকোনো কনফিউশন ক্লিয়ার করবে তোমার AI স্টাডি পার্টনার, একদম ২৪/৭।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'bot',
      displayOrder: 5,
      isActive: true,
    },
  ];
}

function buildBaseOneMonthItems(): ClassGuidePhaseItem[] {
  return [
    {
      id: 'one-model-test',
      label: 'Model Test (CQ+MCQ)',
      detail: '৫ মাসের সিলেবাসের ওপর লিখিত ও নৈর্ব্যক্তিক পরীক্ষা নেওয়া হবে এবং খাতাও দেখে দেওয়া হবে',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'list-checks',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'one-doubt-solve',
      label: 'Doubt Solve Class',
      detail: 'আগের কোনো ক্লাসে থাকা কনফিউশন ও প্রশ্নের সল্যুশন দেওয়া হবে।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'user-check',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'one-super-solve',
      label: 'Super Solve (AI)',
      detail:
        'গণিত ও বিজ্ঞান বিষয় তোমার যেকোনো কনফিউশন ক্লিয়ার করবে তোমার AI স্টাডি পার্টনার, একদম ২৪/৭।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'bot',
      displayOrder: 3,
      isActive: true,
    },
    {
      id: 'one-exam-prep',
      label: 'Exam Prep',
      detail: 'চ্যাপ্টার ও টপিক ধরে ধরে নিজের ইচ্ছা ও সুবিধামতো এক্সাম দিতে পারবে অ্যাপে।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'target',
      displayOrder: 4,
      isActive: true,
    },
    {
      id: 'one-recorded-class',
      label: 'Recorded Class',
      detail:
        'পুরো মাসে আর কোনো রেগুলার ক্লাস থাকবে না। তবে যে অধ্যায়গুলো লাইভে পড়ানো হবে না সেগুলোর উপর রেকর্ডেড ক্লাস দেওয়া হবে।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'play-circle',
      displayOrder: 5,
      isActive: true,
    },
  ];
}

function buildBasePlanAccordion(): ClassGuidePlanAccordionItem[] {
  return [
    {
      id: 'super-solve',
      title: '২৪/৭ পড়াশোনার সব কনফিউশনের সল্যুশন (Super Solve)',
      answer:
        'গণিত ও বিজ্ঞান বিষয় রিলেটেড তোমার যেকোনো কনফিউশন ক্লিয়ার করবে তোমার AI স্টাডি পার্টনার, একদম ২৪/৭।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'bot',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'why-masterbook',
      title: 'কেন মাস্টারবুকেই সম্পূর্ণ প্রস্তুতি নেওয়া সম্ভব?',
      answer:
        'MAP (Master–Apply–Prove) মেথডে সাজানো প্রতিটি মাস্টারবুকে অধ্যায়ভিত্তিক মূল ধারণা, অনুশীলনীর সমাধান ও পরীক্ষার মানসম্পন্ন সৃজনশীল এবং MCQ প্রশ্ন একসাথে গুছিয়ে দেওয়া হয়েছে।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'book-open',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'complete-prep-masterbook',
      title: 'গোছানো মাস্টারবুকে কমপ্লিট প্রিপারেশন',
      answer:
        'এক্সপার্ট টিচার প্যানেলের রিসার্চে তৈরি মাস্টারবুক অনুসরণ করে প্রতিটি টপিক সহজে আয়ত্ত করা, এক্সামের মাধ্যমে প্রয়োগ করা এবং প্র্যাকটিসের মাধ্যমে পূর্ণ আত্মবিশ্বাস গড়ে তোলা সম্ভব।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'book-check',
      displayOrder: 3,
      isActive: true,
    },
    {
      id: 'expert-panel',
      title: 'এক্সপার্ট টিচার প্যানেল',
      answer:
        'দেশের অভিজ্ঞ ও বিষয়ভিত্তিক দক্ষ শিক্ষকরা নিয়মিত লাইভ ক্লাস, লেকচার নোট, দাগানো বইয়ের পিডিএফ এবং পরীক্ষার প্রশ্নপত্র প্রস্তুত করেন।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'graduation-cap',
      displayOrder: 4,
      isActive: true,
    },
    {
      id: 'super-prep',
      title: 'ইচ্ছামত পরীক্ষা দিয়ে প্রস্তুতি যাচাই (Super Prep)',
      answer:
        'চ্যাপ্টার ও টপিক ধরে ধরে নিজের সুবিধা ও প্রয়োজন অনুযায়ী যত খুশি তত MCQ পরীক্ষা দিয়ে নিজের প্রস্তুতির ঘাটতি দ্রুত চিহ্নিত ও সংশোধন করা যাবে।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'target',
      displayOrder: 5,
      isActive: true,
    },
    {
      id: 'class-finish',
      title: 'ক্লাসের পড়া ক্লাসেই শেষ',
      answer:
        'প্রতিটি লাইভ ক্লাসে টপিকের বেসিক, অনুশীলনী ও সৃজনশীল প্রশ্নের সমাধান ধাপে ধাপে করানো হয়, আর ক্লাস শেষেই Daily HW MCQ-এর মাধ্যমে যাচাই সম্পন্ন হয়।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'play-circle',
      displayOrder: 6,
      isActive: true,
    },
    {
      id: 'full-syllabus-exam',
      title: 'পুরো সিলেবাসের উপর পরীক্ষা প্রস্তুতি',
      answer:
        'মাসিক CQ ও MCQ পরীক্ষা, মাসের শেষে রিভিশন উইক এবং পরীক্ষার আগের ১ মাসে পূর্ণাঙ্গ সিলেবাসের ওপর মডেল টেস্ট ও স্পেশাল ডাউট সলভ ক্লাস অনুষ্ঠিত হয়।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'list-checks',
      displayOrder: 7,
      isActive: true,
    },
    {
      id: 'year-long-support',
      title: 'বছরজুড়ে পার্সোনাল সাপোর্ট ও গাইডলাইন',
      answer:
        'ডেডিকেটেড ক্লাস টিচার ও স্টুডেন্ট অ্যাডভাইজরের তত্ত্বাবধান, মাসিক প্রোগ্রেস রিপোর্ট কার্ড এবং নিয়মিত প্যারেন্ট-টিচার মিটিংয়ের মাধ্যমে সারা বছর নিবিড় একাডেমিক গাইডলাইন দেওয়া হয়।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'user-check',
      displayOrder: 8,
      isActive: true,
    },
  ];
}

function buildBasePillars(): ClassGuidePillarItem[] {
  return [
    {
      id: 'pillar-live-class',
      title: 'লাইভ ক্লাস',
      description:
        'লাইভ ক্লাস ও দাগানো বই এর পিডিএফ এর মাধ্যমে বেসিক ক্লিয়ার এর পাশাপাশি বিভিন্ন টপিকের শর্টকাট জানা যাবে।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'video',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'pillar-practice-book',
      title: 'প্র্যাকটিস বুক ও সাজেশন',
      description:
        'বোর্ড সিলেবাসের ফুল প্রস্তুতি, পরীক্ষায় আসার মতো প্রশ্ন ও সমাধান এবং ফ্রি মাস্টারবুকে MCQ প্র্যাকটিস।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'book-open',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'pillar-parents-meeting',
      title: 'প্যারেন্টস মিটিং ও রিপোর্ট কার্ড',
      description:
        'মান্থলি প্যারেন্টস-টিচার মিটিং, রেগুলার অ্যাটেন্ডেন্স এবং আপডেটেড এক্সাম রিপোর্ট কার্ড।',
      linkUrl: '',
      imageUrl: '',
      iconKey: 'calendar-clock',
      displayOrder: 3,
      isActive: true,
    },
  ];
}

function createClassGuideDefaults(classKey: ClassGuideKey): ClassGuideConfig {
  const isClass6 = classKey === 'class-6';
  const isClass7 = classKey === 'class-7';

  const bnClassLabel = isClass6
    ? '৬ষ্ঠ শ্রেণি'
    : isClass7
      ? '৭ম শ্রেণি'
      : '৮ম শ্রেণি';
  const bnClassPossessive = isClass6
    ? '৬ষ্ঠ শ্রেণির'
    : isClass7
      ? '৭ম শ্রেণির'
      : '৮ম শ্রেণির';
  const bnClassLocative = isClass6
    ? '৬ষ্ঠ শ্রেণিতে'
    : isClass7
      ? '৭ম শ্রেণিতে'
      : '৮ম শ্রেণিতে';
  const bnOrdinalWord = isClass6
    ? 'ষষ্ঠ শ্রেণি'
    : isClass7
      ? 'সপ্তম শ্রেণি'
      : 'অষ্টম শ্রেণি';
  const bonusScheduleNote = isClass6
    ? 'প্রতি সপ্তাহে ৩ দিন লাইভ ক্লাস'
    : isClass7
      ? 'প্রতি সপ্তাহে ৪ দিন লাইভ ক্লাস'
      : 'প্রতি সপ্তাহে ৫ দিন লাইভ ক্লাস';

  const bonusItems: ClassGuideBonusItem[] = [
    {
      id: 'bonus-1',
      title: 'Free Masterbook Bundle + Gift Pack',
      description: 'অধ্যায়ভিত্তিক প্রিন্টেড মাস্টারবুক সেট ও স্পেশাল গিফট প্যাক',
      imageUrl: '/assets/aistudio/image_826376ee.png',
      imageAlt: 'Free Masterbook Bundle ও Gift Pack সেট',
      highlights: [
        'অধ্যায়ভিত্তিক প্রিন্টেড মাস্টারবুক সেট',
        'শিক্ষার্থীদের জন্য স্পেশাল গিফট প্যাক',
      ],
      linkUrl: '',
      iconKey: 'gift',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'bonus-2',
      title: `${bnOrdinalWord} - বার্ষিক পরীক্ষা প্রস্তুতি ২০২৬`,
      description: `${bnClassPossessive} বার্ষিক পরীক্ষার চূড়ান্ত রিভিশন ও মডেল টেস্ট`,
      imageUrl: '/assets/aistudio/image_28b0a606.png',
      imageAlt: `${bnOrdinalWord} - বার্ষিক পরীক্ষা প্রস্তুতি ২০২৬`,
      highlights: ['৭টি মূল বিষয়', bonusScheduleNote, 'ডেইলি HW'],
      linkUrl: '',
      iconKey: 'award',
      displayOrder: 2,
      isActive: true,
    },
  ];

  const scheduleColumns: ClassGuideScheduleColumn[] = [
    {
      id: 'schedule-subjects',
      heading: `${bnClassLocative} যা যা পড়ানো হবে`,
      description: 'বোর্ড সিলেবাস অনুযায়ী মূল ও ঐচ্ছিক বিষয়সমূহ',
      iconKey: 'book-check',
      points: [
        '৮টি মূল বিষয়: বাংলা ১ম ও ২য় পত্র, ইংরেজি ১ম ও ২য় পত্র, সাধারণ গণিত, ICT, BGS, বিজ্ঞান',
        '৩টি ঐচ্ছিক বিষয়: কৃষিশিক্ষা / গার্হস্থ্য অর্থনীতি / কর্ম ও জীবনমুখী শিক্ষা / শারীরিক শিক্ষা',
      ],
      linkUrl: '',
      imageUrl: '',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'schedule-time',
      heading: 'ক্লাসের সময় ও কোর্সের মেয়াদ',
      description: 'নিয়মিত সন্ধ্যা ও রাতের লাইভ স্লট',
      iconKey: 'clock',
      points: [
        isClass6
          ? 'সন্ধ্যা ৬:৩০–৭:৩০ | রাত ৮:০০–৯:০০ [প্রতি ক্লাস ১ ঘণ্টা]'
          : isClass7
            ? 'সন্ধ্যা ৬:৩০–৭:৩০ | রাত ৮:০০–৯:০০ [প্রতি ক্লাস ১ ঘণ্টা]'
            : 'বিকাল ৫:০০–৬:০০ | সন্ধ্যা ৭:০০–৮:০০ [প্রতি ক্লাস ১ ঘণ্টা]',
        'কোর্সের মেয়াদ: ১ জানুয়ারি ২০২৬ থেকে ১৬ ডিসেম্বর ২০২৬ পর্যন্ত',
      ],
      linkUrl: '',
      imageUrl: '',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'schedule-duration',
      heading: 'ক্লাস কতদিন চলবে',
      description: 'বার্ষিক ক্লাস ক্যালেন্ডার ও স্পেশাল ডাউট সলভ',
      iconKey: 'calendar-days',
      points: [
        'জানুয়ারি ১০ থেকে ডিসেম্বর ১০ পর্যন্ত। সিলেবাস অনুযায়ী পুরো বই ও রেগুলার ক্লাস ১৫ই নভেম্বরের মধ্যে শেষ হবে।',
        'জুনে ও নভেম্বর ১৫ থেকে ডিসেম্বর ১৫ পর্যন্ত রেগুলার ক্লাস বন্ধ থাকবে, তবে পরীক্ষার জন্য স্পেশাল ডাউট সলভ ক্লাস চলবে।',
      ],
      linkUrl: '',
      imageUrl: '',
      displayOrder: 3,
      isActive: true,
    },
  ];

  return {
    classKey,
    guideName: `${bnClassLabel} কোর্স গাইড`,
    guideIconKey: 'book-open',
    isEnabled: true,
    headerBadge: `${bnClassLabel} একাডেমিক প্রোগ্রাম গাইড`,
    headerTitlePrefix: `${bnClassLabel} অনলাইন ব্যাচ —`,
    headerTitleHighlight: 'সম্পূর্ণ কোর্স কাঠামো ও প্রস্তুতি পরিকল্পনা',
    headerDescription: `গত পাঁচ বছর ধরে প্রায় দেড় হাজার স্কুল শিক্ষার্থীর সাফল্যের ধারাবাহিকতায় ${bnClassPossessive} লাইভ ক্লাস, মাস্টারবুক, ডেইলি এক্সাম ও AI সাপোর্টের পূর্ণাঙ্গ বিবরণ।`,
    headerSummaryPill: '৮টি মূল + ৩টি ঐচ্ছিক বিষয়',
    structureHeading: 'কোর্সটি যেভাবে সাজানো হয়েছে',
    structureSubheading: 'সারা বছরের পড়াশোনা, মূল্যায়ন ও অভিভাবক সমন্বয়ের ধাপসমূহ',
    structureItems: buildBaseStructureItems(),
    bonusHeading: 'এই কোর্সের সাথে ফ্রি পাচ্ছেন',
    bonusItems,
    scheduleHeading: 'পাঠ্যবিষয়, ক্লাসের সময়সূচি ও কোর্সের মেয়াদ',
    scheduleSubheading: 'সপ্তাহের নিয়মিত লাইভ ক্লাস, সিলেবাস সমাপ্তি ও ডাউট সলভ সেশনের সময়সীমা',
    scheduleColumns,
    exclusiveHeading: 'কোর্স এক্সক্লুসিভ ফিচার',
    exclusiveSubheading: 'MAP মেথডে সাজানো মাস্টারবুক | SuperSolve | SuperPrep',
    exclusiveFeatures: buildBaseExclusiveFeatures(),
    bundleHeading: 'যে যে বান্ডেল থাকছে',
    bundleIntro: `গত পাঁচ বছর ধরে প্রায় দেড় হাজার স্কুল শিক্ষার্থীদের সাফল্যের ধারাবাহিকতায় টেন মিনিট স্কুল নতুন বছরে নিয়ে এসেছে ${bnClassPossessive} অনলাইন ব্যাচ ২০২৭!`,
    bundles: buildBaseBundles(),
    fiveMonthHeading: 'পরীক্ষার পূর্বে ৫ মাস',
    fiveMonthItems: buildBaseFiveMonthItems(),
    oneMonthHeading: 'পরীক্ষার প্রস্তুতি ১ মাস',
    oneMonthItems: buildBaseOneMonthItems(),
    planHeading: '২০২৭ সালের কোর্স পরিকল্পনা',
    planSubheading: 'প্রতিটি পরিকল্পনার বিস্তারিত জানতে শিরোনামে ক্লিক করুন',
    planAccordionItems: buildBasePlanAccordion(),
    batch2027Heading: 'অনলাইন ব্যাচ ২০২৭',
    pillars: buildBasePillars(),
    closingStatement:
      'এক্সপার্ট টিচারদের রেগুলার লাইভ ক্লাস, মাস্টারবুক, মডেল টেস্ট নিয়ে সারা বছর সেরা রেজাল্টের পারফেক্ট প্ল্যান! দেশের যেকোনো প্রান্ত থেকে ঘরে বসেই দেশ সেরা শিক্ষকদের সাথে নাও সম্পূর্ণ সিলেবাসের ১০০ তে ১০০ প্রস্তুতি! শেখার যাত্রা শুরু এখানেই 10 Minute School All Courses এর সঙ্গে!',
    updatedAt: null,
  };
}

export function cloneDefaultClassGuide(classKey: ClassGuideKey): ClassGuideConfig {
  return createClassGuideDefaults(classKey);
}

export function cloneDefaultClassGuidesMap(): ClassGuidesMap {
  return {
    'class-6': createClassGuideDefaults('class-6'),
    'class-7': createClassGuideDefaults('class-7'),
    'class-8': createClassGuideDefaults('class-8'),
  };
}

function sortByOrder<T extends { displayOrder: number }>(items: T[]): T[] {
  return [...items]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item, idx) => ({ ...item, displayOrder: idx + 1 }));
}

function normalizeStructureItems(
  raw: unknown,
  fallback: ClassGuideStructureItem[]
): ClassGuideStructureItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuideStructureItem[] = [];
  for (let i = 0; i < raw.length && out.length < 30; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = cleanText(obj.title, 140);
    if (!title) continue;
    out.push({
      id: makeItemId('structure', obj.id, i),
      title,
      description: cleanMultilineText(obj.description, 600),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      iconKey: normalizeClassGuideIconKey(obj.iconKey, 'play-circle'),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

function normalizeBonusItems(
  raw: unknown,
  fallback: ClassGuideBonusItem[]
): ClassGuideBonusItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuideBonusItem[] = [];
  for (let i = 0; i < raw.length && out.length < 20; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = cleanText(obj.title, 160);
    if (!title) continue;
    out.push({
      id: makeItemId('bonus', obj.id, i),
      title,
      description: cleanMultilineText(obj.description, 400),
      highlights: cleanStringList(obj.highlights, 10, 200),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      imageAlt: cleanText(obj.imageAlt, 180) || title,
      iconKey: normalizeClassGuideIconKey(obj.iconKey, 'gift'),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

function normalizeScheduleColumns(
  raw: unknown,
  fallback: ClassGuideScheduleColumn[]
): ClassGuideScheduleColumn[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuideScheduleColumn[] = [];
  for (let i = 0; i < raw.length && out.length < 15; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const heading = cleanText(obj.heading, 160);
    if (!heading) continue;
    out.push({
      id: makeItemId('schedule', obj.id, i),
      heading,
      description: cleanMultilineText(obj.description, 400),
      points: cleanStringList(obj.points, 12, 360),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      iconKey: normalizeClassGuideIconKey(obj.iconKey, 'book-check'),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

function normalizeExclusiveFeatures(
  raw: unknown,
  fallback: ClassGuideExclusiveFeature[]
): ClassGuideExclusiveFeature[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuideExclusiveFeature[] = [];
  for (let i = 0; i < raw.length && out.length < 15; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = cleanText(obj.title, 140);
    if (!title) continue;
    out.push({
      id: makeItemId('exclusive', obj.id, i),
      badge: cleanText(obj.badge, 80),
      title,
      tagline: cleanText(obj.tagline, 200),
      bullets: cleanStringList(obj.bullets, 10, 240),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      imageAlt: cleanText(obj.imageAlt, 180) || title,
      iconKey: normalizeClassGuideIconKey(obj.iconKey, 'zap'),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

function normalizeBundles(
  raw: unknown,
  fallback: ClassGuideBundleItem[]
): ClassGuideBundleItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuideBundleItem[] = [];
  for (let i = 0; i < raw.length && out.length < 12; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const name = cleanText(obj.name, 140);
    if (!name) continue;
    out.push({
      id: makeItemId('bundle', obj.id, i),
      name,
      timeframe: cleanText(obj.timeframe, 100),
      focusSummary: cleanMultilineText(obj.focusSummary, 400),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      iconKey: normalizeClassGuideIconKey(obj.iconKey, 'book-check'),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

function normalizePhaseItems(
  raw: unknown,
  fallback: ClassGuidePhaseItem[],
  prefix: string,
  defaultIcon: ClassGuideIconKey
): ClassGuidePhaseItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuidePhaseItem[] = [];
  for (let i = 0; i < raw.length && out.length < 20; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const label = cleanText(obj.label, 120);
    if (!label) continue;
    out.push({
      id: makeItemId(prefix, obj.id, i),
      label,
      detail: cleanMultilineText(obj.detail, 400),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      iconKey: normalizeClassGuideIconKey(obj.iconKey, defaultIcon),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

function normalizePlanAccordionItems(
  raw: unknown,
  fallback: ClassGuidePlanAccordionItem[]
): ClassGuidePlanAccordionItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuidePlanAccordionItem[] = [];
  for (let i = 0; i < raw.length && out.length < 25; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = cleanText(obj.title, 180);
    if (!title) continue;
    out.push({
      id: makeItemId('plan', obj.id, i),
      title,
      answer: cleanMultilineText(obj.answer, 800),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      iconKey: normalizeClassGuideIconKey(obj.iconKey, 'list-checks'),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

function normalizePillars(
  raw: unknown,
  fallback: ClassGuidePillarItem[]
): ClassGuidePillarItem[] {
  if (!Array.isArray(raw)) return fallback;
  const out: ClassGuidePillarItem[] = [];
  for (let i = 0; i < raw.length && out.length < 12; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = cleanText(obj.title, 140);
    if (!title) continue;
    out.push({
      id: makeItemId('pillar', obj.id, i),
      title,
      description: cleanMultilineText(obj.description, 400),
      linkUrl: sanitizeGuideUrl(obj.linkUrl),
      imageUrl: sanitizeGuideUrl(obj.imageUrl),
      iconKey: normalizeClassGuideIconKey(obj.iconKey, 'video'),
      displayOrder:
        typeof obj.displayOrder === 'number' && Number.isFinite(obj.displayOrder)
          ? obj.displayOrder
          : i + 1,
      isActive: obj.isActive !== false,
    });
  }
  return sortByOrder(out);
}

export function normalizeClassGuideConfig(
  classKey: ClassGuideKey,
  raw: unknown
): ClassGuideConfig {
  const defaults = createClassGuideDefaults(classKey);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;
  const pickText = (val: unknown, fb: string, maxLen: number): string => {
    const cleaned = cleanText(val, maxLen);
    return cleaned || fb;
  };
  const pickMultiline = (val: unknown, fb: string, maxLen: number): string => {
    const cleaned = cleanMultilineText(val, maxLen);
    return cleaned || fb;
  };

  return {
    classKey,
    guideName: pickText(obj.guideName, defaults.guideName, 120),
    guideIconKey: normalizeClassGuideIconKey(obj.guideIconKey, defaults.guideIconKey),
    isEnabled: obj.isEnabled !== false,
    headerBadge: pickText(obj.headerBadge, defaults.headerBadge, 120),
    headerTitlePrefix: pickText(obj.headerTitlePrefix, defaults.headerTitlePrefix, 160),
    headerTitleHighlight: pickText(obj.headerTitleHighlight, defaults.headerTitleHighlight, 180),
    headerDescription: pickMultiline(obj.headerDescription, defaults.headerDescription, 600),
    headerSummaryPill: cleanText(obj.headerSummaryPill, 100) || defaults.headerSummaryPill,
    structureHeading: pickText(obj.structureHeading, defaults.structureHeading, 160),
    structureSubheading: pickText(obj.structureSubheading, defaults.structureSubheading, 240),
    structureItems: normalizeStructureItems(obj.structureItems, defaults.structureItems),
    bonusHeading: pickText(obj.bonusHeading, defaults.bonusHeading, 160),
    bonusItems: normalizeBonusItems(obj.bonusItems, defaults.bonusItems),
    scheduleHeading: pickText(obj.scheduleHeading, defaults.scheduleHeading, 160),
    scheduleSubheading: pickText(obj.scheduleSubheading, defaults.scheduleSubheading, 240),
    scheduleColumns: normalizeScheduleColumns(obj.scheduleColumns, defaults.scheduleColumns),
    exclusiveHeading: pickText(obj.exclusiveHeading, defaults.exclusiveHeading, 160),
    exclusiveSubheading: pickText(obj.exclusiveSubheading, defaults.exclusiveSubheading, 240),
    exclusiveFeatures: normalizeExclusiveFeatures(obj.exclusiveFeatures, defaults.exclusiveFeatures),
    bundleHeading: pickText(obj.bundleHeading, defaults.bundleHeading, 160),
    bundleIntro: pickMultiline(obj.bundleIntro, defaults.bundleIntro, 500),
    bundles: normalizeBundles(obj.bundles, defaults.bundles),
    fiveMonthHeading: pickText(obj.fiveMonthHeading, defaults.fiveMonthHeading, 120),
    fiveMonthItems: normalizePhaseItems(
      obj.fiveMonthItems,
      defaults.fiveMonthItems,
      'five',
      'video'
    ),
    oneMonthHeading: pickText(obj.oneMonthHeading, defaults.oneMonthHeading, 120),
    oneMonthItems: normalizePhaseItems(
      obj.oneMonthItems,
      defaults.oneMonthItems,
      'one',
      'list-checks'
    ),
    planHeading: pickText(obj.planHeading, defaults.planHeading, 160),
    planSubheading: pickText(obj.planSubheading, defaults.planSubheading, 240),
    planAccordionItems: normalizePlanAccordionItems(
      obj.planAccordionItems,
      defaults.planAccordionItems
    ),
    batch2027Heading: pickText(obj.batch2027Heading, defaults.batch2027Heading, 140),
    pillars: normalizePillars(obj.pillars, defaults.pillars),
    closingStatement: pickMultiline(obj.closingStatement, defaults.closingStatement, 800),
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : null,
  };
}

export function normalizeClassGuidesMap(raw: unknown): ClassGuidesMap {
  const defaults = cloneDefaultClassGuidesMap();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  return {
    'class-6': normalizeClassGuideConfig('class-6', obj['class-6']),
    'class-7': normalizeClassGuideConfig('class-7', obj['class-7']),
    'class-8': normalizeClassGuideConfig('class-8', obj['class-8']),
  };
}

export function validateClassGuideConfigInput(
  classKey: ClassGuideKey,
  raw: unknown
):
  | { valid: true; config: ClassGuideConfig }
  | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'গাইড কনফিগারেশন ডেটা সঠিক ফরম্যাটে পাওয়া যায়নি।' };
  }

  const obj = raw as Record<string, unknown>;
  const guideName = cleanText(obj.guideName, 120);
  if (!guideName) {
    return { valid: false, error: 'গাইডের নাম (Guide Name) পূরণ করা আবশ্যক।' };
  }

  const checkUrlArray = (
    listRaw: unknown,
    label: string
  ): { valid: true } | { valid: false; error: string } => {
    if (!Array.isArray(listRaw)) return { valid: true };
    for (let i = 0; i < listRaw.length; i += 1) {
      const entry = listRaw[i];
      if (!entry || typeof entry !== 'object') continue;
      const rec = entry as Record<string, unknown>;
      const linkCheck = validateGuideUrlInput(rec.linkUrl);
      if (!linkCheck.valid) {
        return {
          valid: false,
          error: `${label} (#${i + 1}): ${linkCheck.error}`,
        };
      }
      const imgCheck = validateGuideUrlInput(rec.imageUrl);
      if (!imgCheck.valid) {
        return {
          valid: false,
          error: `${label} (#${i + 1}) ছবি: ${imgCheck.error}`,
        };
      }
    }
    return { valid: true };
  };

  const urlChecks = [
    checkUrlArray(obj.structureItems, 'কোর্স কাঠামো'),
    checkUrlArray(obj.bonusItems, 'ফ্রি বোনাস'),
    checkUrlArray(obj.scheduleColumns, 'সময়সূচি'),
    checkUrlArray(obj.exclusiveFeatures, 'এক্সক্লুসিভ ফিচার'),
    checkUrlArray(obj.bundles, 'বান্ডেল'),
    checkUrlArray(obj.fiveMonthItems, '৫ মাসের প্রস্তুতি'),
    checkUrlArray(obj.oneMonthItems, '১ মাসের প্রস্তুতি'),
    checkUrlArray(obj.planAccordionItems, 'কোর্স পরিকল্পনা'),
    checkUrlArray(obj.pillars, 'অনলাইন ব্যাচ স্তম্ভ'),
  ];
  for (const res of urlChecks) {
    if (!res.valid) return res;
  }

  const normalized = normalizeClassGuideConfig(classKey, obj);
  return { valid: true, config: normalized };
}
