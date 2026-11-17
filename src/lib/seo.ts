import type { Metadata } from 'next';
import { Category, Course, SiteSettings } from '@/src/types';
import { toBengaliNumber } from '@/src/utils/format';

export function getSiteBaseUrl(): string {
  const explicit = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim()) {
    return explicit.trim().replace(/\/+$/, '');
  }
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    const prefixed = vercelProd.startsWith('http') ? vercelProd : `https://${vercelProd}`;
    return prefixed.replace(/\/+$/, '');
  }
  return 'https://10msallcourse.com';
}

interface ResolvedRouteSeo {
  title: string;
  description: string;
  canonicalPath: string;
  filterCourses: (allCourses: Course[]) => Course[];
  isAdmin?: boolean;
}

function resolveRouteSeo(
  pathname: string,
  categories: Category[],
  settings?: SiteSettings | null
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
          (c) =>
            c.status === 'active' &&
            (c.categorySlug === 'hsc' || c.categorySlug === 'admission') &&
            (c.slug.includes('hsc-26') ||
              c.title.toLowerCase().includes('hsc 26') ||
              c.categorySlug === 'admission')
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
          (c) =>
            c.status === 'active' &&
            c.categorySlug === 'hsc' &&
            (c.slug.includes('hsc-27') || c.title.toLowerCase().includes('hsc 27'))
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
          (c) =>
            c.status === 'active' &&
            c.categorySlug === 'hsc' &&
            (c.slug.includes('hsc-28') || c.title.toLowerCase().includes('hsc 28'))
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
          (c) =>
            c.status === 'active' &&
            c.categorySlug === 'school'
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
          (c) =>
            c.status === 'active' &&
            c.categorySlug === 'school'
        ),
    };
  }

  const classMatch = clean.match(/^\/(?:academic\/)?class-?([6-8])$/);
  if (classMatch) {
    const num = Number(classMatch[1]);
    const bnClass = `${toBengaliNumber(num)}ম`;
    return {
      title: `${bnClass} শ্রেণি অনলাইন ব্যাচ — ১০ মিনিট স্কুল`,
      description: `টেন মিনিট স্কুলের ${bnClass} শ্রেণির বাংলা, ইংরেজি, গণিত ও বিজ্ঞান বিষয়ের লাইভ ক্লাস, লেকচার নোট ও সাপ্তাহিক পরীক্ষা।`,
      canonicalPath: `/class-${num}`,
      filterCourses: (all) =>
        all.filter(
          (c) =>
            c.status === 'active' &&
            c.categorySlug === 'school' &&
            (c.slug.includes(`class-${num}`) || (c.targetStudents || '').includes(`Class ${num}`))
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
            c.status === 'active' &&
            (c.categorySlug === 'skills' || c.categorySlug === 'language-learning')
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
      filterCourses: (all) => all.filter((c) => c.status === 'active' && c.categorySlug === 'skills'),
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
        all.filter((c) => c.status === 'active' && c.categorySlug === 'admission'),
    };
  }

  if (clean === '/books' || clean === '/category/books' || clean === '/categories/books') {
    return {
      title: '১০ মিনিট স্কুল বই ও মাস্টারবুক সমূহ — 10msallcourse.com',
      description:
        'একাডেমিক, এডমিশন ও ক্যারিয়ার স্কিল প্রস্তুতির সেরা মাস্টারবুক, লেকচার শিট ও প্রশ্নব্যাংক সংগ্রহ।',
      canonicalPath: '/books',
      filterCourses: (all) =>
        all.filter(
          (c) =>
            c.status === 'active' &&
            (c.categorySlug === 'books' || c.title.includes('বই') || c.slug.includes('book'))
        ),
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
      filterCourses: (all) => all.filter((c) => c.status === 'active' && c.categorySlug === slug),
    };
  }

  return {
    title:
      settings?.siteTitle ||
      '১০ মিনিট স্কুল কোর্স — ৩D ক্লাস সিলেক্টর ও মডার্ন কোর্স পোর্টাল',
    description:
      settings?.heroSubtitle ||
      'সরাসরি সর্বোচ্চ প্রাথমিক ছাড়ে যেকোনো একাডেমিক, HSC, SSC, এডমিশন ও ক্যারিয়ার স্কিল প্রোগ্রামে ভর্তি হোন।',
    canonicalPath: '/',
    filterCourses: (all) => all.filter((c) => c.status === 'active'),
  };
}

export function buildSeoMetadata(
  pathname: string,
  categories: Category[],
  settings?: SiteSettings | null
): Metadata {
  const baseUrl = getSiteBaseUrl();
  const resolved = resolveRouteSeo(pathname, categories, settings);

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

  const canonicalUrl = `${baseUrl}${resolved.canonicalPath}`;

  return {
    title: resolved.title,
    description: resolved.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: resolved.title,
      description: resolved.description,
      url: canonicalUrl,
      type: 'website',
      locale: 'bn_BD',
      siteName: '10msallcourse.com',
      images: [
        {
          url: `${baseUrl}/images/logo.png`,
          width: 512,
          height: 512,
          alt: resolved.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolved.title,
      description: resolved.description,
      images: [`${baseUrl}/images/logo.png`],
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
  const resolved = resolveRouteSeo(pathname, categories, settings);
  if (resolved.isAdmin) return null;

  const matched = resolved.filterCourses(courses).slice(0, 12);
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
                  description: course.description,
                  provider: {
                    '@type': 'Organization',
                    name: '10 Minute School',
                  },
                  offers: {
                    '@type': 'Offer',
                    priceCurrency: 'BDT',
                    price: course.discountPrice,
                    availability: 'https://schema.org/InStock',
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
