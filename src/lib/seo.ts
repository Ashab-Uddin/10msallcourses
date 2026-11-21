import type { Metadata } from 'next';
import { BookCategory, Category, Course, SiteSettings } from '@/src/types';
import { toBengaliNumber } from '@/src/utils/format';
import {
  CLASS_BENGALI_ORDINALS,
  courseMatchesAcademicBatch,
  courseMatchesCategorySlug,
  courseMatchesClass,
  type JuniorClassNumber,
} from '@/src/lib/categoryMatching';

export const DEFAULT_PUBLIC_SITE_URL = 'https://10msallcourse.com';
export const DEFAULT_SITE_NAME = '10ms All Courses';
export const DEFAULT_SITE_TITLE = '10ms All Courses';
export const DEFAULT_SITE_DESCRIPTION =
  'Explore and discover courses from 10 Minute School. Find your preferred courses, compare prices, and access them easily.';
export const DEFAULT_OG_IMAGE_PATH = '/og-image.png';

function normalizePublicOrigin(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    ) {
      return null;
    }
    return `https://${parsed.host}`;
  } catch {
    return null;
  }
}

export function getSiteBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const validOrigin = normalizePublicOrigin(candidate);
    if (validOrigin) {
      return validOrigin;
    }
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

interface ResolvedRouteSeo {
  title: string;
  description: string;
  canonicalPath: string;
  filterCourses: (allCourses: Course[]) => Course[];
  isAdmin?: boolean;
  noIndex?: boolean;
  ogImageUrl?: string;
}

function isPublicVisibleCourse(course: Course): boolean {
  return course.status === 'active' || course.status === 'closed';
}

function resolveRouteSeo(
  pathname: string,
  categories: Category[],
  settings?: SiteSettings | null,
  bookCategories: BookCategory[] = [],
  courses: Course[] = []
): ResolvedRouteSeo {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean.startsWith('/admin')) {
    return {
      title: 'অ্যাডমিন প্যানেল — 10msallcourse.com',
      description: '১০ মিনিট স্কুল কোর্স মার্কেটপ্লেসের অ্যাডমিন কন্ট্রোল প্যানেল।',
      canonicalPath: clean,
      filterCourses: () => [],
      isAdmin: true,
    };
  }

  if (clean === '/hsc/hsc-26' || clean === '/academic/hsc/hsc-26') {
    return {
      title: 'HSC 26 অনলাইন ব্যাচ ও এডমিশন প্রস্তুতি — ১০ মিনিট স্কুল',
      description:
        'HSC ২০২৬ পরীক্ষার্থীদের জন্য শেষ মুহূর্তের রিভিশন, মডেল টেস্ট এবং ভার্সিটি, মেডিকেল ও ইঞ্জিনিয়ারিং এডমিশন অনলাইন ব্যাচ।',
      canonicalPath: '/hsc/hsc-26',
      filterCourses: (all) =>
        all.filter(
          (c) => isPublicVisibleCourse(c) && courseMatchesAcademicBatch(c, 'hsc-26')
        ),
    };
  }

  if (clean === '/hsc/hsc-27' || clean === '/academic/hsc/hsc-27') {
    return {
      title: 'HSC 27 অনলাইন ব্যাচ (বিজ্ঞান, মানবিক, ব্যবসা) — ১০ মিনিট স্কুল',
      description:
        'HSC ২০২৭ ব্যাচের সম্পূর্ণ সিলেবাস লাইভ ক্লাস, লেকচার শিট, টেস্ট পেপার সলভ ও ডাউট সলভিং সাপোর্ট।',
      canonicalPath: '/hsc/hsc-27',
      filterCourses: (all) =>
        all.filter(
          (c) => isPublicVisibleCourse(c) && courseMatchesAcademicBatch(c, 'hsc-27')
        ),
    };
  }

  if (
    clean === '/hsc/hsc-28' ||
    clean === '/academic/hsc/hsc-28' ||
    clean === '/hsc' ||
    clean === '/academic/hsc' ||
    clean === '/academic'
  ) {
    return {
      title: 'HSC 28 অনলাইন ব্যাচ (বিজ্ঞান, মানবিক, ব্যবসা) — ১০ মিনিট স্কুল',
      description:
        'HSC ২০২৮ ব্যাচের প্রথম থেকেই A+ প্রস্তুতি: PCMB, BEI, ব্যবসায় শিক্ষা ও মানবিক বিভাগের পূর্ণাঙ্গ অনলাইন ব্যাচ।',
      canonicalPath: '/hsc/hsc-28',
      filterCourses: (all) =>
        all.filter(
          (c) => isPublicVisibleCourse(c) && courseMatchesAcademicBatch(c, 'hsc-28')
        ),
    };
  }

  if (
    clean === '/ssc/ssc-27' ||
    clean === '/academic/ssc/ssc-27' ||
    clean === '/class-10' ||
    clean === '/academic/class-10' ||
    clean === '/academic/class10' ||
    clean === '/ssc' ||
    clean === '/academic/ssc'
  ) {
    return {
      title: 'SSC 27 (দশম শ্রেণি) অনলাইন ব্যাচ — ১০ মিনিট স্কুল',
      description:
        'দশম শ্রেণি ও SSC ২০২৭ বোর্ড পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি, লাইভ ক্লাস, মডেল টেস্ট ও বোর্ড প্রশ্ন সমাধান।',
      canonicalPath: '/ssc/ssc-27',
      filterCourses: (all) =>
        all.filter(
          (c) => isPublicVisibleCourse(c) && courseMatchesAcademicBatch(c, 'ssc-2027')
        ),
    };
  }

  if (
    clean === '/ssc/ssc-28' ||
    clean === '/academic/ssc/ssc-28' ||
    clean === '/class-9' ||
    clean === '/academic/class-9' ||
    clean === '/academic/class9'
  ) {
    return {
      title: 'SSC 28 (নবম শ্রেণি) অনলাইন ব্যাচ — ১০ মিনিট স্কুল',
      description:
        'নবম শ্রেণি ও SSC ২০২৮ ব্যাচের বাংলা, ইংরেজি, গণিত, বিজ্ঞান, মানবিক ও ব্যবসায় শিক্ষার পূর্ণাঙ্গ একাডেমিক ব্যাচ।',
      canonicalPath: '/ssc/ssc-28',
      filterCourses: (all) =>
        all.filter(
          (c) => isPublicVisibleCourse(c) && courseMatchesAcademicBatch(c, 'ssc-2028')
        ),
    };
  }

  const classMatch = clean.match(/^\/(?:academic\/)?class-?([5-8])$/);
  if (classMatch) {
    const num = Number(classMatch[1]) as JuniorClassNumber;
    const bnClass = CLASS_BENGALI_ORDINALS[num] || `${toBengaliNumber(num)}ম`;
    const dbCat = categories.find((c) => c.slug === `class-${num}`);
    return {
      title: `${bnClass} শ্রেণি অনলাইন ব্যাচ — ১০ মিনিট স্কুল`,
      description:
        dbCat?.subtitle ||
        `টেন মিনিট স্কুলের ${bnClass} শ্রেণির বাংলা, ইংরেজি, গণিত ও বিজ্ঞান বিষয়ের লাইভ ক্লাস, লেকচার নোট ও সাপ্তাহিক পরীক্ষা।`,
      canonicalPath: `/class-${num}`,
      filterCourses: (all) =>
        all.filter((c) => isPublicVisibleCourse(c) && courseMatchesClass(c, num)),
    };
  }

  if (
    clean === '/free-course' ||
    clean === '/free' ||
    clean === '/free-courses' ||
    clean === '/category/free-course' ||
    clean === '/categories/free-course'
  ) {
    const freeCat = categories.find((c) => c.slug === 'free-course');
    return {
      title: `${freeCat?.name || 'ফ্রি কোর্স'} — ১০ মিনিট স্কুল`,
      description:
        freeCat?.subtitle ||
        'শিক্ষার্থীদের জন্য ১০ মিনিট স্কুলের সম্পূর্ণ বিনামূল্যের কোর্স, মাস্টারক্লাস ও লার্নিং কনটেন্ট।',
      canonicalPath: '/free-course',
      filterCourses: (all) =>
        all.filter(
          (c) => isPublicVisibleCourse(c) && courseMatchesCategorySlug(c, 'free-course')
        ),
    };
  }

  if (clean === '/categories/language-learning' || clean === '/category/language-learning') {
    return {
      title: 'ভাষা শিক্ষা কোর্স (Spoken English ও IELTS) — ১০ মিনিট স্কুল',
      description:
        'ঘরে বসে Spoken English, IELTS Complete, English Grammar ও বিদেশি ভাষা শেখার জনপ্রিয় অনলাইন কোর্সে সরাসরি ছাড়ে ভর্তি হোন।',
      canonicalPath: '/categories/language-learning',
      filterCourses: (all) =>
        all.filter(
          (c) =>
            isPublicVisibleCourse(c) &&
            courseMatchesCategorySlug(c, 'language-learning')
        ),
    };
  }

  if (clean === '/skills' || clean === '/category/skills' || clean === '/categories/skills') {
    const skillsCat = categories.find((c) => c.slug === 'skills');
    return {
      title: `${skillsCat?.name || 'স্কিলস ও আইটি'} কোর্সসমূহ — ১০ মিনিট স্কুল`,
      description:
        skillsCat?.subtitle ||
        'স্পোকেন ইংলিশ, ফ্রিল্যান্সিং, ওয়েব ডেভেলপমেন্ট, ডিজিটাল মার্কেটিং ও প্রফেশনাল ক্যারিয়ার স্কিল কোর্সসমূহ।',
      canonicalPath: '/skills',
      filterCourses: (all) =>
        all.filter((c) => isPublicVisibleCourse(c) && c.categorySlug === 'skills'),
    };
  }

  if (
    clean === '/admission' ||
    clean === '/category/admission' ||
    clean === '/categories/admission'
  ) {
    const admissionCat = categories.find((c) => c.slug === 'admission');
    return {
      title: `${admissionCat?.name || 'বিশ্ববিদ্যালয় ও মেডিকেল এডমিশন'} — ১০ মিনিট স্কুল`,
      description:
        admissionCat?.subtitle ||
        'মেডিকেল, বুয়েট, ঢাকা বিশ্ববিদ্যালয় ক, খ, গ ইউনিট এবং গুচ্ছ ভর্তি পরীক্ষার পূর্ণাঙ্গ অনলাইন এডমিশন ব্যাচ।',
      canonicalPath: '/admission',
      filterCourses: (all) =>
        all.filter((c) => isPublicVisibleCourse(c) && c.categorySlug === 'admission'),
    };
  }

  if (
    clean === '/books' ||
    clean === '/book-store' ||
    clean === '/category/books' ||
    clean === '/categories/books' ||
    clean.startsWith('/books/')
  ) {
    const bookCatSlug = clean.startsWith('/books/')
      ? clean.slice('/books/'.length).split('/')[0]
      : '';
    const matchedBookCat = bookCatSlug
      ? bookCategories.find((cat) => cat.slug === bookCatSlug)
      : undefined;

    return {
      title: matchedBookCat
        ? `${matchedBookCat.sectionTitle || matchedBookCat.name} — 10MS বুক স্টোর`
        : '10MS বুক স্টোর — সেরা শিক্ষার্থীদের প্রয়োজনীয় বই ও উপকরণ — 10msallcourse.com',
      description:
        matchedBookCat?.subtitle ||
        'এইচএসসি, এসএসসি, অষ্টম, ৭ম ও ৬ষ্ঠ শ্রেণির সেরা প্রিন্টেড মাস্টারবুক, লেকচার গাইড ও প্রয়োজনীয় শিক্ষাউপকরণ সংগ্রহ।',
      canonicalPath: matchedBookCat ? `/books/${matchedBookCat.slug}` : '/books',
      filterCourses: () => [],
    };
  }

  if (clean.startsWith('/category/') || clean.startsWith('/categories/')) {
    const slug = clean.split('/').filter(Boolean)[1] || '';
    const cat = categories.find((c) => c.slug === slug);
    return {
      title: cat ? `${cat.name} — ১০ মিনিট স্কুল` : 'কোর্স ক্যাটালগ — ১০ মিনিট স্কুল',
      description:
        cat?.subtitle ||
        `টেন মিনিট স্কুলের ${cat?.name || slug} ক্যাটাগরির সকল অনলাইন কোর্স ও ব্যাচ ডিসকাউন্টেড মূল্যে দেখুন।`,
      canonicalPath: `/category/${slug}`,
      filterCourses: (all) =>
        all.filter((c) => isPublicVisibleCourse(c) && courseMatchesCategorySlug(c, slug)),
    };
  }

  if (clean.startsWith('/courses/')) {
    const rawSlug = clean.slice('/courses/'.length).split('/')[0] || '';
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch {
      decodedSlug = rawSlug;
    }
    const targetSlug = decodedSlug.trim();
    const matchedCourse = courses.find(
      (c) =>
        isPublicVisibleCourse(c) &&
        (c.slug === targetSlug ||
          c.slug === rawSlug ||
          c.slug.toLowerCase() === targetSlug.toLowerCase())
    );
    if (matchedCourse) {
      const priceText =
        matchedCourse.discountPrice === 0
          ? 'সম্পূর্ণ ফ্রি'
          : `৳${toBengaliNumber(matchedCourse.discountPrice)}`;
      const courseOgImage =
        matchedCourse.imageUrl && /^https:\/\//i.test(matchedCourse.imageUrl.trim())
          ? matchedCourse.imageUrl.replace(/\?(w=\d+.*)/i, '').trim()
          : undefined;

      return {
        title: `${matchedCourse.title} (${priceText}) — ১০ মিনিট স্কুল`,
        description:
          matchedCourse.description?.trim() ||
          matchedCourse.fullDescription?.trim().slice(0, 160) ||
          `${matchedCourse.title} কোর্সে সরাসরি ডিসকাউন্টেড মূল্যে ভর্তি হোন।`,
        canonicalPath: `/courses/${encodeURIComponent(matchedCourse.slug)}`,
        filterCourses: () => [matchedCourse],
        ogImageUrl: courseOgImage,
      };
    }

    return {
      title: 'কোর্স পাওয়া যায়নি — ১০ মিনিট স্কুল',
      description: DEFAULT_SITE_DESCRIPTION,
      canonicalPath: clean,
      filterCourses: () => [],
      noIndex: true,
    };
  }

  return {
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    canonicalPath: '/',
    filterCourses: (all) => all.filter(isPublicVisibleCourse),
  };
}

export function buildSeoMetadata(
  pathname: string,
  categories: Category[],
  settings?: SiteSettings | null,
  bookCategories: BookCategory[] = [],
  courses: Course[] = []
): Metadata {
  const baseUrl = getSiteBaseUrl();
  const resolved = resolveRouteSeo(pathname, categories, settings, bookCategories, courses);

  if (resolved.isAdmin) {
    return {
      title: resolved.title,
      description: resolved.description,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl =
    resolved.canonicalPath === '/' ? baseUrl : `${baseUrl}${resolved.canonicalPath}`;
  const ogImageUrl = resolved.ogImageUrl || `${baseUrl}${DEFAULT_OG_IMAGE_PATH}`;
  const ogImageAlt =
    resolved.title === DEFAULT_SITE_NAME
      ? `${DEFAULT_SITE_NAME} — 10 Minute School Courses`
      : `${resolved.title} — ${DEFAULT_SITE_NAME}`;

  return {
    title: resolved.title,
    description: resolved.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !resolved.noIndex,
      follow: !resolved.noIndex,
    },
    openGraph: {
      title: resolved.title,
      description: resolved.description,
      url: canonicalUrl,
      type: 'website',
      locale: 'bn_BD',
      siteName: DEFAULT_SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolved.title,
      description: resolved.description,
      images: [
        {
          url: ogImageUrl,
          alt: ogImageAlt,
        },
      ],
    },
  };
}

export function buildStructuredData(
  pathname: string,
  categories: Category[],
  courses: Course[],
  settings?: SiteSettings | null
) {
  const baseUrl = getSiteBaseUrl();
  const resolved = resolveRouteSeo(pathname, categories, settings, [], courses);
  if (resolved.isAdmin) return null;

  const matched = resolved
    .filterCourses(courses)
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1))
    .slice(0, 12);
  const pageUrl = `${baseUrl}${resolved.canonicalPath}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: '10msallcourse.com — ১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/images/logo.png`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: '১০ মিনিট স্কুল কোর্স মার্কেটপ্লেস',
        inLanguage: 'bn-BD',
        publisher: { '@id': `${baseUrl}/#organization` },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: resolved.title,
        description: resolved.description,
        isPartOf: { '@id': `${baseUrl}/#website` },
        inLanguage: 'bn-BD',
      },
      ...(resolved.canonicalPath !== '/'
        ? [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'হোম',
                  item: baseUrl,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: resolved.title,
                  item: pageUrl,
                },
              ],
            },
          ]
        : []),
      ...(matched.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: resolved.title,
              numberOfItems: matched.length,
              itemListElement: matched.map((course, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                  '@type': 'Course',
                  name: course.title,
                  description: course.description || course.title,
                  image:
                    course.imageUrl && course.imageUrl.startsWith('https://')
                      ? course.imageUrl
                      : `${baseUrl}/images/logo.png`,
                  provider: {
                    '@type': 'Organization',
                    name: '10 Minute School',
                  },
                  offers: {
                    '@type': 'Offer',
                    priceCurrency: 'BDT',
                    price: course.discountPrice,
                    availability:
                      course.status === 'active'
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/SoldOut',
                    url: `${baseUrl}/go/${course.slug}`,
                  },
                },
              })),
            },
          ]
        : []),
    ],
  };
}
