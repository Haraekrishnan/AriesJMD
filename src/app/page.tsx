'use client';
import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    if (!context?.isLoading) {
      if (context?.user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [context?.isLoading, context?.user, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
