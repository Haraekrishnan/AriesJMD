
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { format, formatDistanceToNow, isSameDay, parseISO } from 'date-fns';
import { MessageSquare, Calendar } from 'lucide-react';
import type { Comment, PlannerEvent } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface RecentPlannerActivityProps {
    onDateSelect: (date: Date) => void;
    selectedUserId: string;
}

export default function RecentPlannerActivity({ onDateSelect, selectedUserId }: RecentPlannerActivityProps) {
  const { user, dailyPlannerComments, plannerEvents, users } = useAppContext();

  const unreadCommentsByDay = useMemo(() => {
    if (!user) return [];

    const grouped: { [day: string]: { comments: Comment[], events: PlannerEvent[] } } = {};

    dailyPlannerComments.forEach(dayComment => {
      if (!dayComment || !dayComment.day) return;
      if (dayComment.plannerUserId !== selectedUserId) return;

      const dayEvents = plannerEvents.filter(e => {
        if (!e.date) return false;
        return isSameDay(parseISO(e.date), parseISO(dayComment.day)) && e.userId === dayComment.plannerUserId;
      });

      if (dayEvents.length === 0) return;

      const unread = (Array.isArray(dayComment.comments) ? dayComment.comments : Object.values(dayComment.comments)).filter(c => {
          if (!c || c.userId === user.id) return false;
          // Check if user is a participant of the event the comment is on
          const event = dayEvents.find(e => e.id === c.eventId);
          if (!event) return false;
          const isParticipant = event.creatorId === user.id || event.userId === user.id;
          return isParticipant && !c.viewedBy?.[user.id];
      });

      if (unread.length > 0) {
        if (!grouped[dayComment.day]) {
          grouped[dayComment.day] = { comments: [], events: [] };
        }
        
        unread.forEach(comment => {
            const eventForComment = dayEvents.find(e => e.id === comment.eventId);
            if(eventForComment && !grouped[dayComment.day].events.some(e => e.id === eventForComment.id)) {
                grouped[dayComment.day].events.push(eventForComment);
            }
        });

        grouped[dayComment.day].comments.push(...unread);
      }
    });

    return Object.entries(grouped).map(([day, data]) => ({ day, ...data }))
      .sort((a,b) => parseISO(b.day).getTime() - parseISO(a.day).getTime());

  }, [user, dailyPlannerComments, plannerEvents, selectedUserId]);

  if (unreadCommentsByDay.length === 0) {
    return null;
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
          {unreadCommentsByDay.map(({ day, comments, events }) => (
            <AccordionItem key={day} value={day} className="border rounded-md px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-col text-left">
                  <span className="font-semibold flex items-center gap-2">
                    <Button variant="link" className="p-0 h-auto" onClick={() => onDateSelect(parseISO(day))}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(parseISO(day), 'dd MMM, yyyy')}
                    </Button>
                    <Badge variant="destructive">{comments.length}</Badge>
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-4">
                {events.map(event => {
                    const eventComments = comments.filter(c => c.eventId === event.id);
                    if (eventComments.length === 0) return null;

                    return (
                        <div key={event.id} className="p-2 bg-muted/50 rounded-md">
                            <h4 className="font-semibold text-sm mb-2">{event.title}</h4>
                            <div className="space-y-3">
                            {eventComments.map(comment => {
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
                        </div>
                    )
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
