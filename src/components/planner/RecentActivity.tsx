
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { format, formatDistanceToNow, isSameDay, parseISO } from 'date-fns';
import { MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import type { Comment, PlannerEvent, User } from '@/lib/types';
import { Button } from '../ui/button';

interface RecentPlannerActivityProps {
    onDateSelect: (date: Date) => void;
    setCurrentMonth: (date: Date) => void;
}

interface UnreadCommentInfo {
    day: string;
    event: PlannerEvent;
    comment: Comment;
    delegatedTo?: User;
    delegatedBy?: User;
}

export default function RecentPlannerActivity({ onDateSelect, setCurrentMonth }: RecentPlannerActivityProps) {
  const { user, dailyPlannerComments, plannerEvents, users, markSinglePlannerCommentAsRead } = useAppContext();

  const unreadComments = useMemo(() => {
    if (!user) return [];

    const allUnread: UnreadCommentInfo[] = [];

    dailyPlannerComments.forEach(dayComment => {
      if (!dayComment || !dayComment.day || !dayComment.comments) return;

      const eventsOnDay = plannerEvents.filter(e => e.date && isSameDay(parseISO(e.date), parseISO(dayComment.day)));
      if (eventsOnDay.length === 0) return;

      const commentsArray = Array.isArray(dayComment.comments) ? dayComment.comments : Object.values(dayComment.comments);
      
      commentsArray.forEach(comment => {
        if (!comment) return;

        const eventForComment = eventsOnDay.find(e => e.id === comment.eventId);
        if (!eventForComment) return;

        const isParticipant = eventForComment.creatorId === user.id || eventForComment.userId === user.id;
        const isUnreadFromOther = comment.userId !== user.id && !comment.viewedBy?.[user.id];

        if (isParticipant && isUnreadFromOther) {
            allUnread.push({
                day: dayComment.day,
                event: eventForComment,
                comment: comment,
                delegatedBy: users.find(u => u.id === eventForComment.creatorId),
                delegatedTo: users.find(u => u.id === eventForComment.userId),
            });
        }
      });
    });

    return allUnread.sort((a,b) => parseISO(b.comment.date).getTime() - parseISO(a.comment.date).getTime());
  }, [user, dailyPlannerComments, plannerEvents, users]);

  if (unreadComments.length === 0) {
    return null;
  }

  const handleMarkAsRead = (comment: Comment) => {
    if (comment.eventId) {
      const event = plannerEvents.find(e => e.id === comment.eventId);
      const day = dailyPlannerComments.find(dc => dc.comments && Object.values(dc.comments).some(c => c && c.id === comment.id))?.day;
      if (event && day) {
        markSinglePlannerCommentAsRead(event.userId, day, comment.id);
      }
    }
  };

  const handleGoToEvent = (day: string) => {
    const eventDate = parseISO(day);
    onDateSelect(eventDate);
    setCurrentMonth(eventDate);
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
         <div className="space-y-4">
            {unreadComments.map(({ day, event, comment, delegatedBy, delegatedTo }) => {
                const commentUser = users.find(u => u.id === comment.userId);
                return (
                    <div key={comment.id} className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="font-semibold text-sm">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    Event on {format(parseISO(day), 'dd MMM, yyyy')} &middot;
                                    {event.creatorId === event.userId ? ` Personal planning for ${delegatedTo?.name}` : ` Delegated to ${delegatedTo?.name} by ${delegatedBy?.name}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <Avatar className="h-8 w-8">
                            <AvatarImage src={commentUser?.avatar} />
                            <AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm bg-background p-3 rounded-md w-full">
                            <div className="flex justify-between items-baseline">
                                <p className="font-semibold">{commentUser?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}
                                </p>
                            </div>
                            <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-2 gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleGoToEvent(day)}><Calendar className="mr-2 h-4 w-4"/> Go to Event</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleMarkAsRead(comment)}>
                               <CheckCircle className="mr-2 h-4 w-4"/> Mark as Read
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
}
