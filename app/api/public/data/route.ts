import { NextResponse } from 'next/server';
import { getPublicPortalData } from '@/src/db/repository';
import {
  getOnlineBatchPageConfig,
  getPublicOnlineBatchSections,
} from '@/src/db/onlineBatchRepository';
import { cloneDefaultOnlineBatchPageConfig } from '@/src/lib/onlineBatchPageConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublicPortalData();
    const [onlineBatchSections, onlineBatchPageConfig] = await Promise.all([
      getPublicOnlineBatchSections(data.courses).catch(() => []),
      getOnlineBatchPageConfig().catch(() => cloneDefaultOnlineBatchPageConfig()),
    ]);
    return NextResponse.json(
      {
        ...data,
        onlineBatchSections,
        onlineBatchPageConfig,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Failed to load public portal data:', error);
    return NextResponse.json(
      { error: 'Failed to load public portal data' },
      { status: 500 }
    );
  }
}
