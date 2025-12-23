
'use client';
import { useAuth } from '@/contexts/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function StatusPage() {
  const { user, loading, logout, requestUnlock } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.status === 'active') {
        // If the user becomes active while on this page, move to dashboard
        router.replace('/dashboard');
    }
  }, [user, loading, router]);


  // Show a loading skeleton while we determine status, but only if we don't have a locked user yet
  if (loading || !user || user.status !== 'locked') {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
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

  const handleUnlockRequest = () => {
    if (user) {
        requestUnlock(user.id, user.name);
        toast({
            title: 'Unlock Request Sent',
            description: 'Your request has been sent to the administrator for review.',
        });
    }
  };

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
