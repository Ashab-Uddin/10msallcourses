import Link from 'next/link';
import type { Category, Course } from '@/src/types';
import { NAVBAR_GROUP_PAGE_META, NAVBAR_GROUP_PATHS } from '@/src/lib/navbarCategories';
import { toBengaliNumber } from '@/src/utils/format';

// Category slugs that redirect to / are canonicalized elsewhere; do not link them.
const ALIAS_SLUGS = new Set(['ssc-29', 'free', 'free-courses', 'school', 'hsc', 'ssc', 'class-10']);

const MAIN_LINKS: Array<{ href: string; label: string }> = [
  { href: '/hsc/hsc-28', label: 'HSC 28 অনলাইন ব্যাচ' },
  { href: '/hsc/hsc-27', label: 'HSC 27 অনলাইন ব্যাচ' },
  { href: '/hsc/hsc-26', label: 'HSC 26 অনলাইন ব্যাচ' },
  { href: '/ssc/ssc-27', label: 'SSC 27 (দশম শ্রেণি)' },
  { href: '/ssc/ssc-28', label: 'SSC 28 অনলাইন ব্যাচ' },
  { href: '/class-9', label: '৯ম শ্রেণি (SSC 29)' },
  { href: '/class-8', label: '৮ম শ্রেণি' },
  { href: '/class-7', label: '৭ম শ্রেণি' },
  { href: '/class-6', label: '৬ষ্ঠ শ্রেণি' },
  { href: '/class-5', label: '৫ম শ্রেণি' },
  { href: '/admission', label: 'বিশ্ববিদ্যালয় ও মেডিকেল এডমিশন' },
  { href: '/skills', label: 'স্কিলস ও আইটি কোর্স' },
  { href: '/language-learning', label: 'ভাষা শিক্ষা কোর্স' },
  { href: '/free-course', label: 'ফ্রি কোর্স' },
  { href: '/books', label: 'বুক স্টোর' },
];

export function priceText(course: Course): string {
  if (course.status === 'closed') return 'ভর্তি বন্ধ';
  if (!course.discountPrice) return 'সম্পূর্ণ ফ্রি';
  return `৳${toBengaliNumber(course.discountPrice)}`;
}

function isPublic(c: Course) {
  return c.status === 'active' || c.status === 'closed';
}

export function CrawlableCatalog({
  categories,
  courses,
  heading = 'সকল কোর্স ও ক্যাটাগরি',
  maxCourses = 60,
  showCategories = true,
}: {
  categories: Category[];
  courses: Course[];
  heading?: string;
  maxCourses?: number;
  showCategories?: boolean;
}) {
  const cats = categories.filter(
    (c) => (c.status || 'active') === 'active' && c.slug && !ALIAS_SLUGS.has(c.slug.toLowerCase())
  );
  const mainHrefs = new Set(MAIN_LINKS.map((l) => l.href));
  const extraCats = cats.filter((c) => !mainHrefs.has(`/${c.slug}`));
  const list = courses
    .filter(isPublic)
    .sort(
      (a, b) =>
        (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
        (a.displayOrder || 9999) - (b.displayOrder || 9999)
    )
    .slice(0, maxCourses);

  if (!showCategories && list.length === 0) return null;

  return (
    <section
      aria-labelledby="catalog-heading"
      className="mx-auto max-w-6xl px-4 py-10 text-sm text-[#2A0F12]"
    >
      <h2 id="catalog-heading" className="text-lg font-bold mb-4">
        {heading}
      </h2>
      {showCategories && (
      <nav aria-label="কোর্স ক্যাটাগরি">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {MAIN_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="underline-offset-2 hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
          {Object.entries(NAVBAR_GROUP_PATHS).map(([key, href]) => (
            <li key={href}>
              <Link href={href} className="underline-offset-2 hover:underline">
                {NAVBAR_GROUP_PAGE_META[key as keyof typeof NAVBAR_GROUP_PATHS].breadcrumbLabel}
              </Link>
            </li>
          ))}
          {extraCats.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${encodeURIComponent(c.slug)}`}
                className="underline-offset-2 hover:underline"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      )}
      {list.length > 0 && (
        <>
          <h3 className="text-base font-bold mt-8 mb-3">কোর্সের বিস্তারিত পেজ</h3>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/courses/${encodeURIComponent(c.slug)}`}
                  className="font-medium hover:underline"
                >
                  {c.title}
                </Link>
                <p className="text-xs opacity-70">
                  {[c.targetBatch, c.duration, priceText(c)].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-4 text-xs">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {it.href ? (
              <Link href={it.href} className="hover:underline">
                {it.name}
              </Link>
            ) : (
              <span aria-current="page">{it.name}</span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CourseSeoSummary({ course }: { course: Course }) {
  const rows: Array<[string, string | null | undefined]> = [
    ['কাদের জন্য', course.targetStudents],
    ['ব্যাচ', course.targetBatch],
    ['সময়কাল', course.duration],
    ['কোর্স ফি', priceText(course)],
  ];
  return (
    <section
      aria-labelledby="course-summary"
      className="mx-auto max-w-4xl px-4 py-8 text-sm text-[#2A0F12]"
    >
      <h2 id="course-summary" className="text-base font-bold mb-2">
        কোর্সের তথ্য
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
