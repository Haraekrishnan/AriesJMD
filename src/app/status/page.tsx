'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-provider';

export default function StatusPage() {
  const { user, loading, logout, requestUnlock } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    const isInactive = user.status === 'locked' || user.status === 'deactivated';

    // If the user is on this page but is NOT inactive, send them away.
    if (!isInactive) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);


  const handleUnlockRequest = () => {
    if (user) {
      requestUnlock(user.id, user.name);
      toast({
        title: 'Unlock Request Sent',
        description: 'Your request has been sent to the administrator for review.',
      });
    }
  };
  
  // Render loading state until the checks in useEffect are complete
  if (loading || !user || (user.status !== 'locked' && user.status !== 'deactivated')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Verifying status...</p>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDeactivated = user.status === 'deactivated';

  // Only render the locked/deactivated page content if we are sure
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-4">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>{isDeactivated ? 'Account Removed' : 'Account Locked'}</CardTitle>
          <CardDescription>
            {isDeactivated 
              ? 'Your account has been deactivated by an administrator. You can no longer access the system, but your historical activity remains on record.' 
              : 'Your account has been temporarily locked by an administrator. Please contact support or request an unlock.'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
          {!isDeactivated && <Button onClick={handleUnlockRequest} className="w-full">Request Unlock</Button>}
          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}