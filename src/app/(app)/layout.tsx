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
    // 1. Wait until authentication is resolved
    if (loading) {
      return;
    }

    // 2. If no user, redirect to login (unless already there)
    if (!user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    // 3. If user is not active (e.g., 'locked'), handle status page
    if (user.status !== 'active') {
      if (pathname !== '/status') {
        router.replace('/status');
      }
      return;
    }

    // 4. If user is active, but on login or status page, redirect to dashboard
    if (user.status === 'active' && (pathname === '/login' || pathname === '/status')) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, pathname]);

  // Show a full-screen loader while authentication is in progress
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

  // If user is not authenticated yet, render a blank screen or loader to prevent flashing content
  // as the redirect to /login is in progress.
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

  // If user is locked and on the status page, render only the children (the status page itself)
  if (user.status === 'locked' && pathname === '/status') {
    return <>{children}</>;
  }

  // If we are in the middle of a redirect for a non-active user, show loader.
  if (user.status !== 'active' && pathname !== '/status') {
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
