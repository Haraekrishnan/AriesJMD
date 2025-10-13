
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
      return; 
    }

    if (!user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    if (user.status !== 'active') {
      if (pathname !== '/status') {
        router.replace('/status');
      }
      return; 
    }
    
    // If user is active, but they are on a non-app page, redirect them to dashboard.
    if (pathname === '/login' || pathname === '/status') {
      router.replace('/dashboard');
    }

  }, [user, loading, router, pathname]);

  // While loading, show a full-screen skeleton loader.
  if (loading) {
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

  // If there's no user, we are in the process of redirecting.
  // Render a loader to avoid flashing any content.
  if (!user) {
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

  // If the user's status is not active, but they are on the status page,
  // render the children directly without the main app layout.
  if (user.status !== 'active') {
    if (pathname === '/status') {
      return <>{children}</>;
    }
    // If they are not on the status page, the useEffect will redirect them.
    // Show a loader in the meantime.
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

    