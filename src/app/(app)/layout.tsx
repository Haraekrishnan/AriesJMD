
'use client';

import React, { useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Header from '@/components/shared/header';
import BroadcastFeed from '@/components/announcements/BroadcastFeed';
import { DecorationProvider } from '@/components/decorations/DecorationProvider';
import { useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.status === 'locked') {
      router.replace('/status');
    }
  }, [user, loading, router]);


  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <p className="text-muted-foreground">Verifying status...</p>
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
      </div>
    );
  }

  // If the user is locked, we show a loading state while redirecting
  if (user.status === 'locked') {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <p className="text-muted-foreground">Redirecting...</p>
                <Skeleton className="h-4 w-[250px]" />
            </div>
        </div>
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
                <div className="mt-4">
                    {children}
                </div>
            </main>
        </div>
      </div>
  );
}
