'use client';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function StatusPage() {
  const { user, logout, requestUnlock } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // If there's no user, or user is active, redirect away from this page
    if (!user || user.status === 'active') {
      router.replace('/dashboard');
    }
  }, [user, router]);
  
  const handleUnlockRequest = () => {
    if (user) {
        requestUnlock(user.id, user.name);
        toast({
            title: 'Unlock Request Sent',
            description: 'Your request has been sent to the administrator for review.',
        });
    }
  };

  if (!user || user.status === 'active') {
    // Render a loader or null while redirecting
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-4">
              <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>Account Locked</CardTitle>
          <CardDescription>
            Your account has been temporarily locked by an administrator. Please contact support or request an unlock.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleUnlockRequest} className="w-full">Request Unlock</Button>
          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
