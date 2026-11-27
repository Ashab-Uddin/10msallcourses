import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/src/lib/adminAuth';
import { RepositoryError } from '@/src/db/repository';
import {
  getAdminClassGuides,
  resetClassGuideConfig,
  saveClassGuideConfig,
} from '@/src/db/classGuideRepository';
import {
  isValidClassGuideKey,
  validateClassGuideConfigInput,
} from '@/src/lib/classGuideDefaults';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ classKey: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { classKey } = await context.params;
  if (!isValidClassGuideKey(classKey)) {
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অনুগ্রহ করে Class 6, Class 7 অথবা Class 8 নির্বাচন করুন।' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }

  try {
    const guides = await getAdminClassGuides();
    return auth.withSessionCookies(
      NextResponse.json(
        { guide: guides[classKey], guides },
        {
          headers: { 'Cache-Control': 'private, no-store' },
        }
      )
    );
  } catch (error) {
    console.error('Failed to load class guide:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'গাইড কনফিগারেশন লোড করতে সমস্যা হয়েছে।' },
        { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }
}

async function handleSave(req: NextRequest, context: RouteContext) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { classKey } = await context.params;
  if (!isValidClassGuideKey(classKey)) {
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অনুগ্রহ করে Class 6, Class 7 অথবা Class 8 নির্বাচন করুন।' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const candidate =
      body && typeof body === 'object' && 'guide' in body
        ? (body as Record<string, unknown>).guide
        : body;

    const validation = validateClassGuideConfigInput(classKey, candidate);
    if (!validation.valid) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: validation.error },
          { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }

    const result = await saveClassGuideConfig(classKey, validation.config);
    return auth.withSessionCookies(
      NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    if (error instanceof RepositoryError) {
      return auth.withSessionCookies(
        NextResponse.json(
          { error: error.message },
          { status: error.status, headers: { 'Cache-Control': 'private, no-store' } }
        )
      );
    }
    console.error('Save class guide failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'গাইড কনফিগারেশন সংরক্ষণ করতে সমস্যা হয়েছে।' },
        { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return handleSave(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return handleSave(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await authorizeAdminRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  const { classKey } = await context.params;
  if (!isValidClassGuideKey(classKey)) {
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'অবৈধ শ্রেণি নির্ধারণ করা হয়েছে।' },
        { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }

  try {
    const result = await resetClassGuideConfig(classKey);
    return auth.withSessionCookies(
      NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    );
  } catch (error) {
    console.error('Reset class guide failed:', error);
    return auth.withSessionCookies(
      NextResponse.json(
        { error: 'ডিফল্ট গাইড রিসেট করতে সমস্যা হয়েছে।' },
        { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
      )
    );
  }
}
