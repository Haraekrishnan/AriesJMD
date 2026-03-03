
'use client';
import { useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Radio, X, Trash2 } from 'lucide-react';
import { parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';


export default function BroadcastFeed() {
    const { user, broadcasts, dismissBroadcast, deleteBroadcast } = useAppContext();

    const handleDismiss = (id: string) => {
        dismissBroadcast(id);
    };

    const handleDelete = (id: string) => {
        deleteBroadcast(id);
    };
    
    const visibleBroadcasts = useMemo(() => {
        if (!user || !broadcasts) return [];
        return broadcasts
            .filter(b => {
                if (!b || !b.expiryDate) return false; // Ensure expiryDate exists
                const isExpired = isAfter(new Date(), parseISO(b.expiryDate));
                if (isExpired) return false;
                
                if (user.role === 'Admin') return true;

                const hasDismissed = (b.dismissedBy || []).includes(user.id);
                if (hasDismissed) return false;

                const isRecipient = b.recipientUserIds?.includes(user.id) || (b.recipientRoles && user.role && b.recipientRoles.includes(user.role));
                return isRecipient;
            })
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [broadcasts, user]);

    if (visibleBroadcasts.length === 0) return null;

    return (
        <div className="space-y-2">
            {visibleBroadcasts.map(broadcast => {
                const animationDuration = `${Math.max(15, broadcast.message.length / 10)}s`;
                return (
                    <div key={broadcast.id} className="relative w-full rounded-lg border p-3 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 overflow-hidden">
                        <div className="flex items-center space-x-3">
                            <Radio className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                            <div className="flex-1 overflow-hidden">
                                <div 
                                    className="inline-block animate-marquee whitespace-nowrap text-base font-semibold text-yellow-900 dark:text-yellow-200"
                                    style={{ animationDuration }}
                                >
                                    {broadcast.message}
                                </div>
                            </div>
                            <div className="flex items-center">
                               {user?.role === 'Admin' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Broadcast?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently remove the broadcast message for all users.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(broadcast.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <Button 
                                    size="icon" 
                                    variant="ghost"
                                    className="h-6 w-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                    onClick={() => handleDismiss(broadcast.id)}
                                >
                                    <X className="h-4 w-4 text-black dark:text-white" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
