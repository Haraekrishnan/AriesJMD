
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Megaphone, X } from 'lucide-react';

export default function AnnouncementFeed() {
    const { announcements } = useAppContext();
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);
    
    useEffect(() => {
        const storedHiddenIds = sessionStorage.getItem('hiddenAnnouncementIds');
        if (storedHiddenIds) {
            setHiddenIds(JSON.parse(storedHiddenIds));
        }
    }, []);

    const handleHide = (id: string) => {
        const newHiddenIds = [...hiddenIds, id];
        setHiddenIds(newHiddenIds);
        sessionStorage.setItem('hiddenAnnouncementIds', JSON.stringify(newHiddenIds));
    };
    
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
                    <Button 
                        size="icon" 
                        variant="ghost"
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-blue-200/50 hover:bg-blue-300/70 dark:bg-blue-800/50 dark:hover:bg-blue-700/70"
                        onClick={() => handleHide(announcement.id)}
                    >
                        <X className="h-4 w-4 text-blue-700 dark:text-blue-200" />
                    </Button>
                </Alert>
            ))}
        </div>
    );
}
