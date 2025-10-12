
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const { user, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // If an active user somehow lands on the login page, redirect them away.
    if (!loading && user && user.status === 'active') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // While checking auth status, show a loader to prevent the login form from flashing.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
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

  // If there's an authenticated user but they aren't active,
  // the main app layout's logic will redirect them to /status.
  // We can show a loader here as well while that happens.
  if (user && user.status !== 'active') {
    // The redirect is handled by AppLayout, just show a loader.
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
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

  // Only show the login form if we're done loading and there is no authenticated user.
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
              {false ? (
                <img src={''} alt={'Aries Marine'} className="h-10 w-auto object-contain" />
              ) : (
                <Ship className="w-8 h-8 text-primary" />
              )}
              <h1 className="text-3xl font-bold text-primary">Aries Marine</h1>
            </div>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <LoginForm />
        </Card>
      </div>
    );
  }
  
  // Fallback loader for any other in-between states while redirecting.
  return (
      <div className="flex items-center justify-center min-h-screen bg-background">
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
