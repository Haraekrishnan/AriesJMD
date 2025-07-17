
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  const { user } = useAuth();
  const { appName, appLogo, loading: contextLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);
  
  const isLoading = contextLoading;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-8 w-48" />
            </div>
          ) : (
            <div className="flex justify-center items-center gap-3 mb-4">
              {appLogo ? (
                <img src={appLogo} alt={appName} className="h-10 w-auto object-contain" />
              ) : (
                <Ship className="w-8 h-8 text-primary" />
              )}
              <h1 className="text-3xl font-bold text-primary">{appName}</h1>
            </div>
          )}
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <LoginForm />
      </Card>
    </div>
  );
}
