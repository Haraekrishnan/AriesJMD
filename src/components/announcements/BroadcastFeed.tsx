
'use client';
import { useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Radio, X } from 'lucide-react';
import { parseISO, isAfter } from 'date-fns';

export default function BroadcastFeed() {
    const { user, broadcasts, dismissBroadcast } = useAppContext();

    const handleDismiss = (id: string) => {
        dismissBroadcast(id);
    };
    
    const visibleBroadcasts = useMemo(() => {
        if (!user || !broadcasts) return [];
        return broadcasts
            .filter(b => {
                if (!b.expiryDate) return false; // Ensure expiryDate exists
                const isExpired = isAfter(new Date(), parseISO(b.expiryDate));
                if (isExpired) return false;
                
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
            {visibleBroadcasts.map(broadcast => (
                <div key={broadcast.id} className="relative w-full rounded-lg border p-3 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 overflow-hidden">
                    <div className="flex items-center space-x-3">
                        <Radio className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                            <div className="inline-block animate-marquee whitespace-nowrap text-sm text-yellow-800 dark:text-yellow-300">
                                <span className='font-semibold'>Broadcast:</span> {broadcast.message}
                            </div>
                        </div>
                         <Button 
                            size="icon" 
                            variant="ghost"
                            className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                            onClick={() => handleDismiss(broadcast.id)}
                        >
                            <X className="h-4 w-4 text-black dark:text-white" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
