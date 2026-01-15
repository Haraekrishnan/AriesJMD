
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Header from '@/components/shared/header';
import BroadcastFeed from '@/components/announcements/BroadcastFeed';
import { DecorationProvider } from '@/components/decorations/DecorationProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.status === 'locked' && pathname !== '/status') {
        router.replace('/status');
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || !user || (user.status === 'locked' && pathname !== '/status')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <p className="text-muted-foreground">Redirecting...</p>
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  // If the user is locked, we want to show the /status page, which doesn't use this layout.
  // But if they somehow land on another app page, the useEffect will redirect them.
  // This prevents rendering the main app layout for a locked user.
  if (user.status === 'locked') {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <p>Redirecting to status page...</p>
          </div>
      );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <DecorationProvider />
      <AppSidebar />
      <div className="flex h-screen w-full flex-col md:pl-64">
        <Header />
        <div className="p-2 border-b">
          <BroadcastFeed />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mt-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
