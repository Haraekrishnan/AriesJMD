
'use client';
import { useState } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

export function AnnouncementFeed() {
  const { announcements } = useAppContext();
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<string[]>(
    announcements.map(a => a.id)
  );

  const handleDismiss = (id: string) => {
    setVisibleAnnouncements(prev => prev.filter(annoId => annoId !== id));
  };
  
  const sortedAnnouncements = announcements
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return (
    <div className="space-y-4">
      {sortedAnnouncements.map(
        (announcement) =>
          visibleAnnouncements.includes(announcement.id) && (
            <Alert key={announcement.id} className="relative">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{announcement.title}</AlertTitle>
              <AlertDescription>{announcement.content}</AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => handleDismiss(announcement.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss announcement</span>
              </Button>
            </Alert>
          )
      )}
    </div>
  );
}
