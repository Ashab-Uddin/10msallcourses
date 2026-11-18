import { NextResponse } from 'next/server';
import { getPublicPortalData } from '@/src/db/repository';
import { courseMatchesCategorySlug } from '@/src/lib/categoryMatching';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublicPortalData();
    const categoriesWithCounts = data.categories.map((cat) => ({
      ...cat,
      courseCount: data.courses.filter((course) =>
        courseMatchesCategorySlug(course, cat.slug)
      ).length,
    }));

    return NextResponse.json(
      {
        categories: categoriesWithCounts,
        totalCategories: categoriesWithCounts.length,
        serverNow: data.serverNow,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Failed to load public categories:', error);
    return NextResponse.json(
      { error: 'ক্যাটাগরি তালিকা লোড করতে সমস্যা হয়েছে।' },
      { status: 500 }
    );
  }
}
