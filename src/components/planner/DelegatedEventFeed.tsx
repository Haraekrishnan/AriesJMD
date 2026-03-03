'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { CalendarCheck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { parseISO } from 'date-fns';

export default function DelegatedEventFeed() {
  const { user, plannerEvents, users, markPlannerEventAsViewed } = useAppContext();

  const newDelegatedEvents = useMemo(() => {
    if (!user) return [];
    return plannerEvents.filter(e =>
      e.userId === user.id &&
      e.creatorId !== user.id &&
      !e.viewedBy?.[user.id]
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [plannerEvents, user]);

  if (newDelegatedEvents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {newDelegatedEvents.map(event => {
        const creator = users.find(u => u.id === event.creatorId);
        const eventDate = parseISO(event.date);
        const animationDuration = `${Math.max(15, (event.title.length + (creator?.name || '').length) / 5)}s`;

        return (
          <div key={event.id} className="relative w-full rounded-lg border p-3 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 overflow-hidden">
            <div className="flex items-center space-x-3">
              <CalendarCheck className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div 
                  className="inline-block animate-marquee whitespace-nowrap text-sm font-semibold text-purple-900 dark:text-purple-200"
                  style={{ animationDuration }}
                >
                  New Delegated Event for {format(eventDate, 'dd MMM, yyyy')}: "{event.title}" from {creator?.name || 'Unknown'}.
                </div>
              </div>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => markPlannerEventAsViewed(event.id)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Acknowledge
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
