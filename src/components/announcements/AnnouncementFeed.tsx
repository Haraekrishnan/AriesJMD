'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Megaphone, X } from 'lucide-react';

export default function AnnouncementFeed() {
    const { announcements } = useAppContext();
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);
    
    const visibleAnnouncements = useMemo(() => {
        return announcements
            .filter(a => a.status === 'approved' && !hiddenIds.includes(a.id))
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [announcements, hiddenIds]);

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
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setHiddenIds(prev => [...prev, announcement.id])}>
                        <X className="h-5 w-5 text-blue-800 dark:text-blue-300"/>
                    </Button>
                </Alert>
            ))}
        </div>
    );
}
