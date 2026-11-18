import { NextRequest, NextResponse } from 'next/server';
import { getPublicPortalData } from '@/src/db/repository';
import { getPublicBookStoreData } from '@/src/db/bookRepository';
import { courseMatchesCategorySlug } from '@/src/lib/categoryMatching';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const normalizedSlug = decodeURIComponent(slug || '')
      .trim()
      .toLowerCase();

    if (!normalizedSlug) {
      return NextResponse.json(
        { error: 'বৈধ ক্যাটাগরি স্লাগ প্রদান করুন।' },
        { status: 400 }
      );
    }

    if (normalizedSlug === 'books' || normalizedSlug === 'book-store') {
      const bookData = await getPublicBookStoreData();
      return NextResponse.json(
        {
          type: 'bookstore',
          slug: 'books',
          bookCategories: bookData.bookCategories,
          books: bookData.books,
          totalItems: bookData.books.length,
        },
        {
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const effectiveSlug = normalizedSlug === 'free' ? 'free-course' : normalizedSlug;
    const data = await getPublicPortalData();
    const matchedCategory = data.categories.find(
      (cat) => cat.slug.toLowerCase() === effectiveSlug
    );

    const matchedCourses = data.courses.filter((course) =>
      courseMatchesCategorySlug(course, effectiveSlug)
    );

    if (
      !matchedCategory &&
      !['class-5', 'class-6', 'class-7', 'class-8', 'free-course', 'skills', 'language-learning'].includes(
        effectiveSlug
      )
    ) {
      return NextResponse.json(
        { error: 'ক্যাটাগরিটি পাওয়া যায়নি।' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        type: 'courses',
        category: matchedCategory || {
          id: 0,
          name: effectiveSlug,
          slug: effectiveSlug,
          subtitle: null,
          badgeColor: 'red',
          displayOrder: 99,
          status: 'active',
        },
        courses: matchedCourses,
        totalItems: matchedCourses.length,
        serverNow: data.serverNow,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Failed to load category detail:', error);
    return NextResponse.json(
      { error: 'ক্যাটাগরির তথ্য লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
