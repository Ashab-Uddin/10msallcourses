import type { Metadata } from 'next';
import App from '@/src/App';
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

export default function AdminPage() {
  return <App />;
}
