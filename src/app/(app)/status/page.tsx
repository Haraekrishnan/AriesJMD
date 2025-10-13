
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Lock, LogOut } from 'lucide-react';

export default function StatusPage() {
    const { user, logout, requestUnlock } = useAppContext();

    const handleUnlockRequest = () => {
        if (user) {
            requestUnlock(user.id, user.name);
            alert('Your unlock request has been sent to the administrator.');
        }
    };

    if (!user) {
        return null;
    }

    if (user.status !== 'locked') {
        // This case should ideally not be reached if routing is correct,
        // but as a fallback, show a generic message.
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Account Issue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>There is an issue with your account status. Please contact an administrator.</p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button variant="outline" onClick={logout} className="w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </CardFooter>
                </Card>
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
                    <Button onClick={handleUnlockRequest} className="w-full">
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
