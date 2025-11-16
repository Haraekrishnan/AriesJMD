
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Header from '@/components/shared/header';

const Redirecting = () => (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Redirecting...</p>
    </div>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
    } else if (user) {
      if ((user.status === 'locked' || user.status === 'deactivated') && pathname !== '/status') {
        router.replace('/status');
      } else if (user.status === 'active' && pathname === '/status') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router, pathname]);

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

  // Handle redirection states explicitly
  if (!user && pathname !== '/login') {
    return <Redirecting />;
  }
  if (user?.status === 'locked' && pathname !== '/status') {
    return <Redirecting />;
  }
  if (user?.status === 'deactivated' && pathname !== '/status') {
    return <Redirecting />;
  }

  // If user is authenticated but on a page they shouldn't be, the useEffect handles it.
  // Don't render the layout for the login page if the user is somehow still there.
  if (user && pathname === '/login') {
    return null;
  }

  // The status page has its own layout, so we don't render the AppLayout there.
  if (pathname === '/status') {
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