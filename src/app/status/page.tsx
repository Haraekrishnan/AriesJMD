
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Lock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StatusPage() {
    const { user, logout, requestUnlock, loading } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.status === 'active')) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    if (loading || !user) {
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

    if (user.status !== 'locked') {
        // This case should ideally not be reached due to the redirect logic,
        // but it's a safe fallback.
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex items-center space-x-4">
                    <p>Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-yellow-100 p-3 rounded-full w-fit mb-4">
                        <Lock className="h-10 w-10 text-yellow-600" />
                    </div>
                    <CardTitle className="text-2xl">
                        Account Locked
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Your account has been temporarily locked by an administrator. You can request to have it unlocked.</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button onClick={() => requestUnlock(user.id, user.name)} className="w-full">
                        Request Unlock
                    </Button>
                    <Button variant="outline" onClick={logout} className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
