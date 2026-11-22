'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { AdminOverviewData } from '../../types.ts';
import {
  isAdminRoutePath,
  markPushNavigation,
  markReplaceNavigation,
  normalizeComparablePath,
  performShallowNavigation,
  recordCurrentScrollSnapshot,
  useBrowserLocation,
} from '../../lib/universalNavigation.ts';
import { AdminLogin } from './AdminLogin.tsx';
import { AdminSessionVerifyingSkeleton } from './AdminSkeletons.tsx';

const AdminDashboard = dynamic(
  () => import('./AdminDashboard.tsx').then((m) => m.AdminDashboard),
  {
    ssr: true,
    loading: () => <AdminSessionVerifyingSkeleton />,
  }
);

export interface AdminPortalClientProps {
  initialAuthState: 'authenticated' | 'needs_refresh' | 'unauthenticated';
  initialAdmin: { email: string; name: string } | null;
  initialDashboardData: AdminOverviewData | null;
  initialPath: string;
}

export const AdminPortalClient: React.FC<AdminPortalClientProps> = ({
  initialAuthState,
  initialAdmin,
  initialDashboardData,
  initialPath,
}) => {
  const router = useRouter();
  const browserLoc = useBrowserLocation(initialPath || '/admin/dashboard');
  const [authState, setAuthState] = useState<'authenticated' | 'needs_refresh' | 'unauthenticated'>(
    initialAuthState
  );
  const [adminSession, setAdminSession] = useState<{ email: string; name: string } | null>(
    initialAdmin
  );
  const [dashboardData, setDashboardData] = useState<AdminOverviewData | null>(
    initialDashboardData
  );

  const normalizedPath = normalizeComparablePath(
    browserLoc.pathname || initialPath || '/admin/dashboard'
  );
  const currentPath = isAdminRoutePath(normalizedPath) ? normalizedPath : '/admin/dashboard';
  const isLoginPath = currentPath === '/admin/login';

  // Ensure BFCache back/forward restores (Safari iOS/macOS, Samsung Internet, Chrome) always
  // re-verify the active HttpOnly admin cookie so a logged-out user never sees stale admin screens.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      void fetch('/api/admin/session?includeOverview=1', {
        credentials: 'include',
        cache: 'no-store',
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data?.authenticated) {
              setAdminSession({
                email: data.email || '',
                name: data.name || 'Site Admin',
              });
              if (data.initialDashboardData) {
                setDashboardData(data.initialDashboardData as AdminOverviewData);
              }
              setAuthState('authenticated');
              return;
            }
          }
          setAdminSession(null);
          setDashboardData(null);
          setAuthState('unauthenticated');
          if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
            performShallowNavigation('/admin/login', { replace: true });
          }
        })
        .catch(() => {
          setAdminSession(null);
          setDashboardData(null);
          setAuthState('unauthenticated');
        });
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Only perform client session recovery when SSR detected an expired access token with a refresh cookie
  useEffect(() => {
    if (authState !== 'needs_refresh') return;

    let cancelled = false;
    const recoverSession = async () => {
      try {
        const res = await fetch('/api/admin/session?includeOverview=1', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data?.authenticated) {
            setAdminSession({
              email: data.email || '',
              name: data.name || 'Site Admin',
            });
            if (data.initialDashboardData) {
              setDashboardData(data.initialDashboardData as AdminOverviewData);
            }
            setAuthState('authenticated');
            return;
          }
        }
        setAdminSession(null);
        setDashboardData(null);
        setAuthState('unauthenticated');
      } catch {
        if (!cancelled) {
          setAdminSession(null);
          setDashboardData(null);
          setAuthState('unauthenticated');
        }
      }
    };

    void recoverSession();
    return () => {
      cancelled = true;
    };
  }, [authState]);

  // Prevent authenticated admins who navigate Back/Forward onto /admin/login from getting stuck on login UI
  useEffect(() => {
    if (authState === 'authenticated' && adminSession && isLoginPath) {
      performShallowNavigation('/admin/dashboard', { replace: true });
    }
  }, [authState, adminSession, isLoginPath]);

  const handleNavigate = useCallback(
    (targetPath: string) => {
      const cleanTarget = targetPath || '/admin/overview';
      if (!isAdminRoutePath(cleanTarget)) {
        recordCurrentScrollSnapshot();
        markPushNavigation();
        router.push(cleanTarget);
        return;
      }

      performShallowNavigation(cleanTarget);
    },
    [router]
  );

  const handleLoginSuccess = useCallback(
    (email: string, name: string, preloadedOverview?: AdminOverviewData | null) => {
      setAdminSession({ email, name });
      if (preloadedOverview) {
        setDashboardData(preloadedOverview);
      }
      setAuthState('authenticated');

      const nextPath =
        currentPath === '/admin/login' || currentPath === '/admin'
          ? '/admin/dashboard'
          : currentPath;
      performShallowNavigation(nextPath, { replace: true });
    },
    [currentPath]
  );

  const handleLogout = useCallback(() => {
    fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    }).catch(() => {});

    setAdminSession(null);
    setDashboardData(null);
    setAuthState('unauthenticated');
    markReplaceNavigation();
    router.replace('/');
  }, [router]);

  const handleBackToSite = useCallback(() => {
    recordCurrentScrollSnapshot();
    markPushNavigation();
    router.push('/');
  }, [router]);

  const handleAdminNameUpdated = useCallback((nextName: string) => {
    setAdminSession((prev) => (prev ? { ...prev, name: nextName } : prev));
  }, []);

  // No-op in dedicated admin shell: server-side cache tags are already invalidated on mutation,
  // so navigating to the public site automatically serves fresh SSR data without wasted admin fetches.
  const handleDataMutated = useCallback(() => {}, []);

  if (authState === 'needs_refresh') {
    return <AdminSessionVerifyingSkeleton />;
  }

  if (authState !== 'authenticated' || !adminSession) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToSite={handleBackToSite}
      />
    );
  }

  const effectiveDashboardPath = isLoginPath ? '/admin/dashboard' : currentPath;

  return (
    <AdminDashboard
      adminEmail={adminSession.email}
      adminName={adminSession.name}
      currentPath={effectiveDashboardPath}
      initialData={dashboardData}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onDataMutated={handleDataMutated}
      onAdminNameUpdated={handleAdminNameUpdated}
    />
  );
};

