import { NextRequest, NextResponse } from 'next/server';
import { getBookCategories, getPublicBookByIdOrSlug } from '@/src/db/bookRepository';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const book = await getPublicBookByIdOrSlug(decodeURIComponent(id || ''));
    if (!book) {
      return NextResponse.json(
        { error: 'বইটি খুঁজে পাওয়া যায়নি।' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const categories = await getBookCategories(false);
    const category =
      categories.find((c) => c.id === book.categoryId || c.slug === book.categorySlug) || null;

    return NextResponse.json(
      {
        book,
        category,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[GET /api/public/books/[id]] Failed:', error);
    return NextResponse.json(
      { error: 'বইয়ের বিস্তারিত তথ্য লোড করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
