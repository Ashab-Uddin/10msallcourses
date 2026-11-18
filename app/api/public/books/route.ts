import { NextRequest, NextResponse } from 'next/server';
import { getPublicBookStoreData } from '@/src/db/bookRepository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { bookCategories, books } = await getPublicBookStoreData();
    const { searchParams } = req.nextUrl;

    let filteredBooks = books;

    const category = searchParams.get('category')?.trim();
    if (category && category !== 'all') {
      const numericCatId = /^\d+$/.test(category) ? Number(category) : null;
      filteredBooks = filteredBooks.filter((b) =>
        numericCatId !== null
          ? b.categoryId === numericCatId
          : b.categorySlug.toLowerCase() === category.toLowerCase()
      );
    }

    const q = searchParams.get('q')?.trim().toLowerCase();
    if (q) {
      filteredBooks = filteredBooks.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.bookType.toLowerCase().includes(q) ||
          b.categorySlug.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(
      {
        bookCategories,
        books: filteredBooks,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[GET /api/public/books] Failed:', error);
    return NextResponse.json(
      { error: 'বুক স্টোরের ডেটা লোড করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
