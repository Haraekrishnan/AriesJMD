
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
    if (loading) return; // Do nothing until context is ready

    if (!user && pathname !== '/login') {
      router.replace('/login');
    } else if (user && (user.status === 'locked' || user.status === 'deactivated') && pathname !== '/status') {
      router.replace('/status');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    // Still fetching user info — show skeleton loader
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
  
  if (!user && pathname !== '/login') {
    return null; // Prevents showing login briefly while redirecting
  }

  // If user is not loading and is authenticated, but is on a non-app page that isn't the status page,
  // they should not see the app layout. This handles cases where they might land on /login while authenticated.
  if (user && pathname === '/login') {
    return null; 
  }
  
  // If the user's status is locked/deactivated, show a minimal loading state or nothing, 
  // as the status page will take over. This prevents flashing the main layout.
  if (user && (user.status === 'locked' || user.status === 'deactivated') && pathname !== '/status') {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <p>Redirecting...</p>
          </div>
      );
  }

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
