
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
      return; // Wait until the loading state is resolved.
    }

    // If there's no user, redirect to login. This is the primary guard.
    if (!user) {
      router.replace('/login');
      return;
    }

    // If user is not active, they should only be on the status page.
    if (user.status !== 'active') {
      if (pathname !== '/status') {
        router.replace('/status');
      }
      return;
    }

    // If an active user somehow lands on the login or status page, redirect to dashboard.
    if (pathname === '/login' || pathname === '/status') {
      router.replace('/dashboard');
    }
  }, [user, loading, router, pathname]);

  // Show a full-page loader while checking auth state or during initial redirection.
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

  // If the user is not active, we want to show the dedicated status page.
  // The actual /status page content will be rendered by its own page.tsx.
  if (user.status !== 'active') {
    // Only render the children if we are on the status page
    if (pathname === '/status') {
       return <>{children}</>;
    }
    // Otherwise show a loader while redirecting
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
