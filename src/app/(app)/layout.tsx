
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Header from '@/components/shared/header';

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

    const isLockedOrDeactivated = user.status === 'locked' || user.status === 'deactivated';

    if (isLockedOrDeactivated) {
      if (pathname !== '/status') {
        router.replace('/status');
      }
    } else { // user is active
      if (pathname === '/status') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || (!user && pathname !== '/status')) {
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
  
  if (user && (user.status === 'locked' || user.status === 'deactivated')) {
    // Render children directly for the status page without the main layout
    if (pathname === '/status') {
      return <main>{children}</main>;
    }
    // Still show loading state while redirecting to prevent flashing of incorrect UI
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


  return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col h-screen md:pl-64">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
      </div>
  );
}
