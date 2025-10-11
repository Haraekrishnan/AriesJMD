
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
    // Wait until the initial loading is complete.
    if (loading) {
      return;
    }

    // If loading is finished and there's no user, redirect to login.
    if (!user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    // Handle different user statuses if a user object exists.
    const isLockedOrDeactivated = user.status === 'locked' || user.status === 'deactivated';

    if (isLockedOrDeactivated) {
      // If user is locked/deactivated, redirect to the status page.
      if (pathname !== '/status') {
        router.replace('/status');
      }
    } else {
      // If the user is active but on the status page, redirect to the dashboard.
      if (pathname === '/status') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router, pathname]);

  // Show a loading skeleton while checking auth state or if there's no user (to prevent flashing the app layout).
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
  
  // Special case for the status page: it should not have the main app layout.
  if (user.status === 'locked' || user.status === 'deactivated') {
    if (pathname === '/status') {
      return <main>{children}</main>;
    }
    // If on any other page, the effect above will redirect, so we continue to show a loader.
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

  // If user is authenticated and active, render the full app layout.
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
