
'use client';
import { useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { format, formatDistanceToNow, isSameDay, parseISO } from 'date-fns';
import { MessageSquare, Calendar } from 'lucide-react';
import { getExpandedPlannerEvents } from '@/contexts/app-provider';
import { PlannerEvent } from '@/lib/types';
import { Badge } from '../ui/badge';


export default function RecentPlannerActivity() {
  const { user, dailyPlannerComments, plannerEvents, users } = useAppContext();

  const unreadCommentsByDay = useMemo(() => {
    if (!user) return [];

    const grouped: { [day: string]: { comments: any[], events: any[] } } = {};

    dailyPlannerComments.forEach(dayComment => {
      const dayEvents = plannerEvents.filter(e => {
        const eventDate = parseISO(e.date);
        return isSameDay(eventDate, parseISO(dayComment.day)) && (e.creatorId === user.id || e.userId === user.id);
      });

      if (dayEvents.length === 0) return;

      const unread = (Array.isArray(dayComment.comments) ? dayComment.comments : Object.values(dayComment.comments)).filter(c => c && !c.viewedBy?.[user.id] && c.userId !== user.id);
      
      if (unread.length > 0) {
        if (!grouped[dayComment.day]) {
          grouped[dayComment.day] = { comments: [], events: [] };
        }
        dayEvents.forEach(event => {
            if (!grouped[dayComment.day].events.some(e => e.id === event.id)) {
                grouped[dayComment.day].events.push(event);
            }
        });
        grouped[dayComment.day].comments.push(...unread);
      }
    });

    return Object.entries(grouped).map(([day, data]) => ({ day, ...data }))
      .sort((a,b) => parseISO(b.day).getTime() - parseISO(a.day).getTime());

  }, [user, dailyPlannerComments, plannerEvents, users]);


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
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(day), 'dd MMM, yyyy')}
                    <Badge variant="destructive">{comments.length}</Badge>
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <div className="space-y-3">
                  {comments.map(comment => {
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

    