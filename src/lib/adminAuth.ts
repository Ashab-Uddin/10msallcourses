import { NextRequest } from 'next/server';

export function isAuthorizedAdminRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split('Bearer ')[1]?.trim() || '';
  return (
    token === 'DEMO_ADMIN_TOKEN' ||
    token === 'GOOGLE_ADMIN_TOKEN' ||
    token.startsWith('ADMIN_')
  );
}
