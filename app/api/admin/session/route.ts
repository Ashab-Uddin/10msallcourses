import { NextRequest, NextResponse } from 'next/server';
import {
  extractAdminToken,
  getAuthenticatedAdmin,
} from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = getAuthenticatedAdmin(req);
  if (!session) {
    return NextResponse.json(
      { authenticated: false, error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  const token = extractAdminToken(req) || '';
  return NextResponse.json(
    {
      authenticated: true,
      email: session.email,
      name: session.name,
      token,
      expiresAt: new Date(session.exp * 1000).toISOString(),
    },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
}
