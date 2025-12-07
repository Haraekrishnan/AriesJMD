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
      return; // Wait until loading is false
    }

    if (!user) {
      // If not loading and no user, redirect to login
      router.replace('/login');
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

  // Show a loading skeleton while we're determining auth state or redirecting
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
  
  // A locked user should not see the main app layout.
  // The /status page will handle its own rendering.
  if (user.status === 'locked') {
    // This allows the /status page to render without triggering re-renders from this layout.
    // If we're already on /status, children will be the status page.
    return <>{children}</>;
  }
  
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
