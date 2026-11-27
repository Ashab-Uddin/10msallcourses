import { getSiteBaseUrl } from '@/src/lib/seo';

export const dynamic = 'force-static';

export function GET() {
  const base = getSiteBaseUrl();
  const body = `# 10msallcourses (10ms All Courses)

> A directory of all 10 Minute School (টেন মিনিট স্কুল) online courses in Bangladesh: HSC, SSC, class 5-9, university admission, skills, language learning and free courses, with prices and discounts.

## Main pages
- [Home](${base}/): all courses
- [Online Batch](${base}/online-batch)
- [HSC 27](${base}/hsc/hsc-27)
- [HSC 26](${base}/hsc/hsc-26)
- [SSC 27](${base}/ssc/ssc-27)
- [SSC 28](${base}/ssc/ssc-28)
- [SSC 29 / Class 9](${base}/class-9)
- [Skills](${base}/skills)
- [Admission](${base}/programs/admission)
- [Language Learning](${base}/language-learning)
- [Free Courses](${base}/free-course)
- [Books](${base}/books)

## Sitemap
- ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
}
