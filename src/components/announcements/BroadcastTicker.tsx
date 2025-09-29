
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Megaphone, X } from 'lucide-react';

export default function BroadcastTicker() {
    const { user, broadcasts, dismissBroadcast } = useAppContext();

    const handleDismiss = (id: string) => {
        dismissBroadcast(id);
    };
    
    const visibleBroadcasts = useMemo(() => {
        if (!user || !broadcasts) return [];
        return broadcasts
            .filter(b => !(b.dismissedBy || []).includes(user.id))
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [broadcasts, user]);

    if (visibleBroadcasts.length === 0) return null;

    return (
        <div className="space-y-2">
            {visibleBroadcasts.map(broadcast => (
                <div key={broadcast.id} className="relative w-full rounded-lg border p-3 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 flex items-start space-x-3 overflow-hidden">
                    <Megaphone className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm text-yellow-900 dark:text-yellow-200 whitespace-nowrap animate-marquee">
                            <p className="inline-block pr-12">{broadcast.message}</p>
                        </div>
                    </div>
                     <Button 
                        size="icon" 
                        variant="ghost"
                        className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                        onClick={() => handleDismiss(broadcast.id)}
                    >
                        <X className="h-4 w-4 text-black/70 dark:text-white/70" />
                    </Button>
                </div>
            ))}
             <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 15s linear infinite;
                }
            `}</style>
        </div>
    );
}
