'use client';
import { useState } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, PlusCircle, Rss, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NewAnnouncementDialog from './new-announcement-dialog';

export function AnnouncementFeed() {
  const { announcements, can } = useAppContext();
  const [isNewAnnouncementDialogOpen, setIsNewAnnouncementDialogOpen] = useState(false);
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<string[]>(
    announcements.map(a => a.id)
  );
  
  const handleDismiss = (id: string) => {
    setVisibleAnnouncements(prev => prev.filter(annoId => annoId !== id));
  };
  
  const sortedAnnouncements = announcements
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const visibleSortedAnnouncements = sortedAnnouncements.filter(a => visibleAnnouncements.includes(a.id));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
                <Rss className="h-6 w-6 text-primary" />
                <div>
                    <CardTitle>Announcements</CardTitle>
                    <CardDescription>Latest updates and news from the company.</CardDescription>
                </div>
            </div>
          {can.manage_announcements && (
            <Button size="sm" onClick={() => setIsNewAnnouncementDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visibleSortedAnnouncements.length > 0 ? visibleSortedAnnouncements.map((announcement) => (
                <div key={announcement.id} className="flex items-start gap-4 p-4 rounded-lg border bg-background relative">
                  <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{announcement.title}</p>
                    <p className="text-sm text-muted-foreground">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(announcement.publishedAt), { addSuffix: true })}
                    </p>
                  </div>
                   <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:bg-muted/50"
                        onClick={() => handleDismiss(announcement.id)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">No announcements yet.</p>
              )}
          </div>
        </CardContent>
      </Card>
      {can.manage_announcements && (
        <NewAnnouncementDialog
          isOpen={isNewAnnouncementDialogOpen}
          setIsOpen={setIsNewAnnouncementDialogOpen}
        />
      )}
    </>
  );
}
