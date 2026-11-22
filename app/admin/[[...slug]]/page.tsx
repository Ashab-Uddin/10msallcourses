import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AdminPortalClient } from '@/src/components/admin/AdminPortalClient';
import { getAdminOverviewData } from '@/src/db/repository';
import { getServerAuthenticatedAdminFromCookieEntries } from '@/src/lib/adminAuth';
import { buildSeoMetadata } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

interface AdminRouteProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: AdminRouteProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const pathname = slug.length > 0 ? `/admin/${slug.join('/')}` : '/admin';
  return buildSeoMetadata(pathname, []);
}

export default async function AdminPage({ params }: AdminRouteProps) {
  const { slug = [] } = await params;
  const pathname = slug.length > 0 ? `/admin/${slug.join('/')}` : '/admin';
  const isLoginPath = pathname === '/admin/login';

  if (isLoginPath) {
    return (
      <AdminPortalClient
        initialAuthState="unauthenticated"
        initialAdmin={null}
        initialDashboardData={null}
        initialPath="/admin/login"
      />
    );
  }

  const cookieStore = await cookies();
  const authState = await getServerAuthenticatedAdminFromCookieEntries(cookieStore.getAll());

  if (authState.status === 'authenticated') {
    const initialDashboardData = await getAdminOverviewData().catch((err) => {
      console.warn('[admin/page] SSR overview preload failed:', err);
      return null;
    });

    return (
      <AdminPortalClient
        initialAuthState="authenticated"
        initialAdmin={{
          email: authState.admin.email,
          name: authState.admin.name,
        }}
        initialDashboardData={initialDashboardData}
        initialPath={pathname === '/admin' ? '/admin/dashboard' : pathname}
      />
    );
  }

  return (
    <AdminPortalClient
      initialAuthState={authState.status}
      initialAdmin={null}
      initialDashboardData={null}
      initialPath={pathname === '/admin' ? '/admin/dashboard' : pathname}
    />
  );
}

