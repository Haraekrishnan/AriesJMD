'use client';
import { LoginForm } from '@/components/auth/login-form';
import { Ship } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                <Ship className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Aries Marine</h1>
            <p className="text-muted-foreground">Please sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
