import { NextResponse } from 'next/server';
import { getBookCategories } from '@/src/db/bookRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getBookCategories(false);
    return NextResponse.json(categories, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/public/book-categories] Failed:', error);
    return NextResponse.json(
      { error: 'বুক ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
