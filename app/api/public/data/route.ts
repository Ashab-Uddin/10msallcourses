import { NextResponse } from 'next/server';
import { getPublicPortalData } from '@/src/db/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublicPortalData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to load public portal data:', error);
    return NextResponse.json(
      { error: 'Failed to load public portal data' },
      { status: 500 }
    );
  }
}
