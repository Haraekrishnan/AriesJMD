
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { V2AppSidebar } from '@/components/v2/app-sidebar';
import Header from '@/components/shared/header';
import BroadcastFeed from '@/components/announcements/BroadcastFeed';
import { DecorationProvider } from '@/components/decorations/DecorationProvider';
import '@/app/v2.css';

export default function AppLayoutV2({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.status === 'locked') {
      router.replace('/status');
    }
  }, [user, loading, router]);

  if (loading || !user || user.status === 'locked') {
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

  return (
    <div className="theme-v2">
        <div className="flex min-h-screen w-full bg-background text-foreground">
            <DecorationProvider />
            <V2AppSidebar />
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
    </div>
  );
}
