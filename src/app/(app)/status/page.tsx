
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { AlertTriangle, UserX, Lock, LogOut } from 'lucide-react';

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

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    {user.status === 'locked' ? (
                        <div className="mx-auto bg-yellow-100 p-3 rounded-full w-fit mb-4">
                           <Lock className="h-10 w-10 text-yellow-600" />
                        </div>
                    ) : (
                         <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                           <UserX className="h-10 w-10 text-red-600" />
                        </div>
                    )}
                    <CardTitle className="text-2xl">
                        Account {user.status === 'locked' ? 'Locked' : 'Deactivated'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {user.status === 'locked' ? (
                        <p>Your account has been temporarily locked by an administrator. You can request to have it unlocked.</p>
                    ) : (
                        <p>Your account has been deactivated. Please contact your administrator for further assistance.</p>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                     {user.status === 'locked' && (
                        <Button onClick={handleUnlockRequest} className="w-full">
                            Request Unlock
                        </Button>
                    )}
                    <Button variant="outline" onClick={logout} className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
