
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
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // If the page is still loading or there's no user, show a skeleton screen.
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

  // If user is locked/deactivated AND they are NOT already on the status page, redirect them.
  if ((user.status === 'locked' || user.status === 'deactivated') && pathname !== '/status') {
    router.replace('/status');
    // Return a loader while redirecting to prevent rendering the main layout
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

  // If a logged-in, active user somehow lands on the status page, redirect them to the dashboard.
  if (user.status === 'active' && pathname === '/status') {
    router.replace('/dashboard');
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

  // If the user's status is fine or they are correctly on the status page, render the normal layout.
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
