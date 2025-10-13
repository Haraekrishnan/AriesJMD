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
    // If loading is finished and there's no user, redirect to login page,
    // but only if we are not already on a public-facing page that doesn't need auth.
    if (!loading && !user && pathname !== '/login' && pathname !== '/status') {
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
  
  // If an active user somehow lands on a public page like login or status, redirect them to the dashboard.
  if (user.status === 'active' && (pathname === '/login' || pathname === '/status')) {
    router.replace('/dashboard');
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
           <p>Redirecting...</p>
        </div>
    );
  }
  
  // If a non-active user tries to access an app page, send them to the status page.
  if (user.status !== 'active' && pathname !== '/status') {
      router.replace('/status');
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
             <p>Redirecting...</p>
          </div>
      );
  }
  
  // Only render the main layout if the user is active and on an app page.
  // The status page will render its own content without the main layout.
  if (user.status === 'active' && pathname !== '/status') {
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

  // For non-active users on the status page, just render the children (the status page itself).
  return <>{children}</>;
}
