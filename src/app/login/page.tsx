
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const { appName, appLogo, loading: contextLoading } = useAppContext();
  const router = useRouter();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // This effect runs when auth state is determined.
    if (!authLoading) {
      if (user) {
        // If user exists, redirect them based on their status.
        if (user.status === 'locked' || user.status === 'deactivated') {
          router.replace('/status');
        } else {
          router.replace('/dashboard');
        }
      } else {
        // If no user, it's safe to show the login form.
        setInitialLoad(false);
      }
    }
  }, [user, authLoading, router]);

  const isLoading = authLoading || contextLoading || initialLoad;

  if (isLoading) {
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

  // Only render the login form if not loading and no user is found.
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            {appLogo ? (
              <img src={appLogo} alt={appName} className="h-10 w-auto object-contain" />
            ) : (
              <Ship className="w-8 h-8 text-primary" />
            )}
            <h1 className="text-3xl font-bold text-primary">{appName}</h1>
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <LoginForm />
      </Card>
    </div>
  );
}
