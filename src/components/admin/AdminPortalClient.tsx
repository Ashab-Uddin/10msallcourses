'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { AdminOverviewData } from '../../types.ts';
import {
  canGoBackInApp,
  ensureCurrentHistoryEntry,
  flushCurrentScrollPosition,
  navigateBack,
  navigateHistory,
  normalizeUrlParts,
  recordCrossRouterBridge,
  useNavigationLocation,
} from '../../lib/navigationHistory.ts';
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
  const [authState, setAuthState] = useState<'authenticated' | 'needs_refresh' | 'unauthenticated'>(
    initialAuthState
  );
  const [adminSession, setAdminSession] = useState<{ email: string; name: string } | null>(
    initialAdmin
  );
  const [dashboardData, setDashboardData] = useState<AdminOverviewData | null>(
    initialDashboardData
  );
  const navLocation = useNavigationLocation(initialPath || '/admin/dashboard');
  const currentPath = navLocation.pathname.startsWith('/admin')
    ? navLocation.pathname
    : initialPath || '/admin/dashboard';

  // Ensure initial admin history entry and scroll listeners are registered
  useEffect(() => {
    ensureCurrentHistoryEntry();
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

  const handleNavigate = useCallback(
    (targetPath: string) => {
      const cleanTarget = targetPath || '/admin/overview';
      if (!cleanTarget.startsWith('/admin')) {
        flushCurrentScrollPosition({ force: true });
        recordCrossRouterBridge(cleanTarget);
        router.push(cleanTarget);
        return;
      }

      navigateHistory(cleanTarget);
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
      if (
        typeof window !== 'undefined' &&
        normalizeUrlParts(window.location.pathname).decodedPathname !== nextPath
      ) {
        navigateHistory(nextPath, { replace: true, noScroll: true });
      }
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
    flushCurrentScrollPosition({ force: true });
    recordCrossRouterBridge('/');
    router.push('/');
  }, [router]);

  const handleBackToSite = useCallback(() => {
    if (canGoBackInApp()) {
      navigateBack('/');
      return;
    }
    flushCurrentScrollPosition({ force: true });
    recordCrossRouterBridge('/');
    router.push('/');
  }, [router]);

  const handleAdminNameUpdated = useCallback((nextName: string) => {
    setAdminSession((prev) => (prev ? { ...prev, name: nextName } : prev));
  }, []);

  // Refresh Next.js client router cache when admin mutates data so returning to public routes
  // immediately reflects the updated database state.
  const handleDataMutated = useCallback(() => {
    router.refresh();
  }, [router]);

  const isLoginPath = currentPath === '/admin/login';

  if (isLoginPath) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToSite={handleBackToSite}
      />
    );
  }

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

  return (
    <AdminDashboard
      adminEmail={adminSession.email}
      adminName={adminSession.name}
      currentPath={currentPath}
      initialData={dashboardData}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      onDataMutated={handleDataMutated}
      onAdminNameUpdated={handleAdminNameUpdated}
    />
  );
};
