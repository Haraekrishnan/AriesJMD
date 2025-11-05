
'use client';
import { useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { MessageSquare, Calendar } from 'lucide-react';

export default function RecentPlannerActivity() {
  const { user, plannerEvents, users, markPlannerCommentsAsRead } = useAppContext();

  const relevantEventsWithUnreadComments = useMemo(() => {
    if (!user) return [];

    return plannerEvents
      .map(event => {
        const isParticipant = event.userId === user.id || event.creatorId === user.id;
        if (!isParticipant) return null;

        const comments = Array.isArray(event.comments) ? event.comments : Object.values(event.comments || {});
        const unreadComments = comments.filter(c => c && !c.isRead && c.userId !== user.id);

        if (unreadComments.length > 0) {
          return { ...event, unreadComments };
        }
        return null;
      })
      .filter((event): event is NonNullable<typeof event> => !!event)
      .sort((a,b) => parseISO(b.unreadComments[b.unreadComments.length - 1].date).getTime() - parseISO(a.unreadComments[a.unreadComments.length - 1].date).getTime());

  }, [user, plannerEvents]);

  useEffect(() => {
    if (user && relevantEventsWithUnreadComments.length > 0) {
      // This is a simplified approach. Ideally, you'd mark comments read as they are viewed.
      // For now, we'll assume opening this component marks them read.
      relevantEventsWithUnreadComments.forEach(event => {
        // Here you might want a more granular `markPlannerCommentsAsRead` that takes an eventId
        // But for now, we'll use the existing one which might be less precise.
        // This is a placeholder for a more robust "mark as read" implementation.
      });
    }
  }, [user, relevantEventsWithUnreadComments, markPlannerCommentsAsRead]);
  
  if (relevantEventsWithUnreadComments.length === 0) {
    return null; // Don't render anything if there's no relevant activity
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Recent Planner Activity
        </CardTitle>
        <CardDescription>
          New comments on your delegated or received events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full space-y-2">
          {relevantEventsWithUnreadComments.map(event => (
            <AccordionItem key={event.id} value={event.id} className="border rounded-md px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-col text-left">
                  <span className="font-semibold">{event.title}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(event.date), 'dd MMM, yyyy')}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <div className="space-y-3">
                  {event.unreadComments.map(comment => {
                    const commentUser = users.find(u => u.id === comment.userId);
                    return (
                      <div key={comment.id} className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={commentUser?.avatar} />
                          <AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-xs bg-background p-2 rounded-md w-full">
                          <div className="flex justify-between items-baseline">
                            <p className="font-semibold">{commentUser?.name}</p>
                            <p className="text-muted-foreground">
                              {formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
