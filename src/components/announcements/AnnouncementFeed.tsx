

'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Megaphone, X } from 'lucide-react';

export default function AnnouncementFeed() {
    const { user, announcements, dismissAnnouncement } = useAppContext();

    const handleHide = (id: string) => {
        dismissAnnouncement(id);
    };
    
    const visibleAnnouncements = useMemo(() => {
        if (!user) return [];
        return announcements
            .filter(a => a.status === 'approved' && !(a.dismissedBy || []).includes(user.id))
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [announcements, user]);

    if (visibleAnnouncements.length === 0) return null;

    return (
        <div className="space-y-4">
            {visibleAnnouncements.map(announcement => (
                <Alert key={announcement.id} className="relative bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                    <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="text-blue-900 dark:text-blue-200">{announcement.title}</AlertTitle>
                    <AlertDescription className="text-blue-800 dark:text-blue-300">
                        {announcement.content}
                    </AlertDescription>
                    <Button 
                        size="icon" 
                        variant="ghost"
                        className="absolute top-2 right-2 h-6 w-6 rounded-full text-blue-900 bg-blue-200/50 hover:bg-blue-200/80 dark:bg-blue-800/50 dark:text-blue-200 dark:hover:bg-blue-800/80"
                        onClick={() => handleHide(announcement.id)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </Alert>
            ))}
        </div>
    );
}
