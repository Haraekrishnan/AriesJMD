
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
    if (loading) {
      return; // Do nothing while loading, the skeleton will be shown
    }

    // If no user is logged in, redirect to login page.
    if (!user) {
      router.replace('/login');
      return;
    }

    // Handle different user statuses
    if (user.status === 'locked' || user.status === 'deactivated') {
      // If user is locked/deactivated and NOT on the status page, redirect them.
      if (pathname !== '/status') {
        router.replace('/status');
      }
    } else if (user.status === 'active') {
      // If an active user lands on login or status, redirect to dashboard.
      if (pathname === '/login' || pathname === '/status') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router, pathname]);

  // Show a full-page loader while waiting for user data or redirection to complete.
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

  // If the user is locked/deactivated, show a loading screen while redirecting to /status.
  // The actual /status page content will be rendered by its own page.tsx.
  if (user.status !== 'active') {
    if (pathname === '/status') {
       return <>{children}</>;
    }
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

  // If user is active and on a valid app page, render the full layout.
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
