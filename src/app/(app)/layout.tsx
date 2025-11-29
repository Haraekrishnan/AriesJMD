
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

    // If no user is logged in, and we are not on a public page, redirect to login.
    if (!user) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    // If the user is locked
    if (user.status === 'locked') {
      // and they are not on the status page, force them there.
      if (pathname !== '/status') {
        router.replace('/status');
      }
      // If they are on the status page, do nothing and let it render.
      return;
    }
    
    // If the user is active and somehow lands on login or status, redirect to dashboard.
    if (user.status === 'active' && (pathname === '/login' || pathname === '/status')) {
      router.replace('/dashboard');
    }

  }, [user, loading, router, pathname]);

  // Loading state while checking user session
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
  
  // These pages have their own layout and should not be wrapped by AppSidebar/Header
  if (pathname === '/login' || pathname === '/status') {
    return <>{children}</>;
  }

  return (
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex h-screen w-full flex-col md:pl-64">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
                <div className="mt-4">
                    {children}
                </div>
            </main>
        </div>
      </div>
  );
}
