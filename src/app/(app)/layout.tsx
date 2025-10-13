'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Header from '@/components/shared/header';
import BroadcastFeed from '@/components/announcements/BroadcastFeed';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If loading is finished, there's no user, and we are not already on the login page, redirect.
    if (!loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, loading, router, pathname]);

  // While the initial authentication is loading, or if there's no user yet (and we're about to redirect),
  // show a consistent loading skeleton. This prevents any flickering of the main layout.
  if (loading || !user) {
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

  // If the user's account is locked or deactivated, redirect them to the status page.
  if (user.status === 'locked' || user.status === 'deactivated') {
    if (pathname !== '/status') {
      router.replace('/status');
      // Continue to show a loader while the redirection is in progress.
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <p>Redirecting...</p>
        </div>
      );
    }
    // If we are already on the status page, let it render without the main layout.
    return <>{children}</>;
  }
  
  // If an active user somehow lands on a public page like login or status, redirect them to the dashboard.
  if (pathname === '/login' || pathname === '/status') {
    router.replace('/dashboard');
    // Show a loader during this redirect as well.
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
           <p>Redirecting...</p>
        </div>
    );
  }

  // If all checks pass, render the main application layout.
  return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex h-screen w-full flex-col md:pl-64">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
                <BroadcastFeed />
                <div className="mt-4">
                    {children}
                </div>
            </main>
        </div>
      </div>
  );
}
