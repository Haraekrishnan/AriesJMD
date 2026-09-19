'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSidebar } from '@/components/shared/app-sidebar';
import Header from '@/components/shared/header';
import BroadcastFeed from '@/components/announcements/BroadcastFeed';
import { DecorationProvider } from '@/components/decorations/DecorationProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isInactive = user?.status === 'locked' || user?.status === 'deactivated';

  useEffect(() => {
    if (!hasMounted || loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (isInactive) {
      // Inactive users (locked/deactivated) must not access the main app routes
      router.replace('/status');
    }
  }, [user, loading, isInactive, hasMounted, router]);

  // Handle Loading and Authorization states
  if (!hasMounted || loading || !user || isInactive) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {isInactive ? 'Redirecting...' : 'Verifying session...'}
            </p>
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
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
          <div className="mt-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
