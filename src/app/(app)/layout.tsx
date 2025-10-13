
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
    // If not loading and there's no user, redirect to login.
    // This is the main guard for the authenticated parts of the app.
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);
  
  // While the initial user authentication is in progress, or if there's no user yet, show a loading skeleton.
  // This prevents the flicker by ensuring we don't render the app until the user state is confirmed.
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

  // If the user is not active, redirect them to the status page.
  if (user.status === 'locked' || user.status === 'deactivated') {
    if (pathname !== '/status') {
      router.replace('/status');
      // Show a loader while redirecting.
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <p>Redirecting...</p>
        </div>
      );
    }
    // If we are already on the status page, let it render.
    return <>{children}</>;
  }
  
  // If an active user somehow lands on login/status, redirect them to the dashboard.
  if (pathname === '/login' || pathname === '/status') {
    router.replace('/dashboard');
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
