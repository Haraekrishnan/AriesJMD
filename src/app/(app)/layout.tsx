'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Header from '@/components/shared/header';
import BroadcastFeed from '@/components/announcements/BroadcastFeed';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      // If not loading and no user, redirect to login
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    if (user.status === 'locked') {
      // If user is locked, they should only be on the status page
      if (pathname !== '/status') {
        router.replace('/status');
      }
    } else if (user.status === 'active') {
      // If user is active and on login/status, redirect to dashboard
      if (pathname === '/login' || pathname === '/status') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    // Show a loading skeleton while we're determining auth state or redirecting
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
      </div>
    );
  }
  
  // A locked user should not see the main app layout.
  // The /status page will handle its own rendering.
  if (user.status === 'locked') {
    // This allows the /status page to render without triggering re-renders from this layout.
    // If we're already on /status, children will be the status page.
    // If not, the useEffect above will redirect.
    return <>{children}</>;
  }

  // If user is active, render the main app layout.
  // This condition implicitly handles redirecting away from /status if the user becomes active.
  if (user.status === 'active' && pathname !== '/status') {
    return (
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex h-screen w-full flex-col md:pl-64">
              <Header />
              <div className="p-2 border-b">
                 <BroadcastFeed />
              </div>
              <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
                  <div className="mt-4">
                      {children}
                  </div>
              </main>
          </div>
        </div>
    );
  }

  // Fallback for transitional states, e.g., before a redirect completes.
  return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
      </div>
    );
}
