'use client';

import React, { useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const context = useContext(AppContext);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!context?.isLoading && !context?.user) {
      router.replace('/login');
    }
  }, [context?.isLoading, context?.user, router]);

  if (context?.isLoading || !context?.user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col h-screen">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
    </div>
  );
}
