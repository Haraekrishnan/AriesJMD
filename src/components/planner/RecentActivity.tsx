
'use client';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { format, formatDistanceToNow, parseISO, isAfter, subDays } from 'date-fns';
import { MessageSquare, AlertTriangle, Send } from 'lucide-react';
import type { Comment, PlannerEvent, User } from '@/lib/types';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface UnreadCommentInfo {
  type: 'comment';
  day: string;
  event: PlannerEvent;
  comment: Comment;
  delegatedTo?: User;
  delegatedBy?: User;
}

interface PendingUpdateInfo {
  type: 'pending_update';
  day: string;
  event: PlannerEvent;
  delegatedTo?: User;
}

export default function RecentPlannerActivity() {
  const {
    user,
    dailyPlannerComments,
    plannerEvents,
    users,
    markSinglePlannerCommentAsRead,
    getExpandedPlannerEvents,
    dismissPendingUpdate,
    addPlannerEventComment,
  } = useAppContext();
  
  const router = useRouter();
  const { toast } = useToast();
  const [actionedItems, setActionedItems] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  
  const { unreadComments, pendingUpdates } = useMemo(() => {
    if (!user) return { unreadComments: [], pendingUpdates: [] };
    
    const allUnread: UnreadCommentInfo[] = [];
    const allPendingUpdates: PendingUpdateInfo[] = [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    
    (dailyPlannerComments || []).forEach((dayComment) => {
      if (!dayComment?.day || !dayComment.comments) return;
      
      const comments = Array.isArray(dayComment.comments)
        ? dayComment.comments
        : Object.values(dayComment.comments || {});
        
      comments.forEach((comment) => {
        if (!comment) return;
        
        const eventForComment = plannerEvents.find((e) => e.id === comment.eventId);
        if (!eventForComment || !userMap.has(eventForComment.userId)) return;
        
        const isParticipant =
          eventForComment.creatorId === user.id || eventForComment.userId === user.id;
          
        const isUnreadFromOther =
          comment.userId !== user.id && !comment.viewedBy?.[user.id];
          
        if (isParticipant && isUnreadFromOther) {
          allUnread.push({
            type: 'comment',
            day: dayComment.day,
            event: eventForComment,
            comment,
            delegatedBy: users.find((u) => u.id === eventForComment.creatorId),
            delegatedTo: users.find((u) => u.id === eventForComment.userId),
          });
        }
      });
    });
    
    const delegatedEvents = plannerEvents.filter(e => e.creatorId !== e.userId && (e.creatorId === user.id || e.userId === user.id));

    delegatedEvents.forEach(event => {
        const today = new Date();
        const startDate = subDays(today, 30); 
        const endDate = subDays(today, 1); 

        if (isAfter(parseISO(event.date), endDate)) return;

        const expanded = getExpandedPlannerEvents(startDate, endDate, event.userId);
        
        const relevantInstances = expanded.filter(instance => instance.event.id === event.id);

        relevantInstances.forEach(instance => {
            const dayStr = format(instance.eventDate, 'yyyy-MM-dd');
            
            const isCreatorView = event.creatorId === user.id;
            const isAssigneeView = event.userId === user.id;

            if (!isCreatorView && !isAssigneeView) return;

            const dc = dailyPlannerComments.find(d => d.id === `${dayStr}_${event.userId}`);
            const assigneeCommented = dc && Object.values(dc.comments || {}).some(c => c.eventId === event.id && c.userId === event.userId);
            
            const isDismissed = user.dismissedPendingUpdates?.[`${event.id}_${dayStr}`];

            if (!assigneeCommented && !isDismissed) {
                allPendingUpdates.push({
                    type: 'pending_update',
                    day: dayStr,
                    event,
                    delegatedTo: users.find((u) => u.id === event.userId),
                });
            }
        });
    });
    
    const sortedUnread = allUnread.sort(
      (a, b) => parseISO(b.comment.date).getTime() - parseISO(a.comment.date).getTime()
    );
    
    const dedupedPending = [
      ...new Map(
        allPendingUpdates.map((item) => [`${item.day}-${item.event.id}`, item])
      ).values(),
    ].sort((a,b) => parseISO(b.day).getTime() - parseISO(a.day).getTime());
    
    return {
      unreadComments: sortedUnread,
      pendingUpdates: dedupedPending,
    };
  }, [
    user,
    dailyPlannerComments,
    plannerEvents,
    users,
    getExpandedPlannerEvents,
  ]);

  const filteredUnreadComments = useMemo(() => 
    unreadComments.filter(uc => !actionedItems.has(uc.comment.id))
  , [unreadComments, actionedItems]);
  
  const filteredPendingUpdates = useMemo(() =>
    pendingUpdates.filter(pu => !actionedItems.has(`${pu.day}-${pu.event.id}`))
  , [pendingUpdates, actionedItems]);

  const handleMarkAsRead = useCallback((comment: Comment) => {
    const event = plannerEvents.find((e) => e.id === comment.eventId);
    const day = dailyPlannerComments.find((dc) =>
      dc.comments && Object.values(dc.comments).some((c) => c?.id === comment.id)
    )?.day;
    
    if (event && day) {
      markSinglePlannerCommentAsRead(event.userId, day, comment.id);
      setActionedItems(prev => new Set(prev).add(comment.id));
    }
  }, [plannerEvents, dailyPlannerComments, markSinglePlannerCommentAsRead]);

  const handleAddComment = useCallback((eventId: string, day: string, eventUserId: string, originalCommentId?: string) => {
    const key = originalCommentId || `${day}-${eventId}`;
    const text = newComments[key];
    if (!text?.trim()) return;
    
    addPlannerEventComment(eventUserId, day, eventId, text);
    
    setActionedItems(prev => new Set(prev).add(key));
    setNewComments((prev) => ({ ...prev, [key]: '' }));
  }, [newComments, addPlannerEventComment]);
  
  if (!user || (unreadComments.length === 0 && pendingUpdates.length === 0)) {
    return null;
  }

  return (
    <Card className="rounded-xl border bg-background shadow-sm">
      <CardHeader className="px-4 py-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Recent delegated activity
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {filteredUnreadComments.length === 0 && filteredPendingUpdates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No delegated activity right now.
          </p>
        ) : (
          <>
            {filteredUnreadComments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  New Replies ({filteredUnreadComments.length})
                </h4>
                {filteredUnreadComments.map(({ day, event, comment, delegatedTo }) => {
                  const commentUser = users.find((u) => u.id === comment.userId);
                  const key = comment.id;
                  
                  return (
                    <div key={comment.id} className="rounded-lg border bg-card px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    Reply from <span className="font-medium">{commentUser?.name}</span> · {formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => handleMarkAsRead(comment)}>Mark as Read</Button>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={commentUser?.avatar} />
                                <AvatarFallback>{commentUser?.name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm bg-muted/50 p-2 rounded-md w-full">
                                <p className="whitespace-pre-wrap">{comment.text}</p>
                            </div>
                        </div>

                        <div className="relative mt-2">
                            <Textarea
                                rows={1}
                                className="resize-none rounded-md bg-muted pl-3 pr-9 py-2 text-sm"
                                placeholder="Reply..."
                                value={newComments[key] || ''}
                                onChange={(e) => setNewComments((prev) => ({ ...prev, [key]: e.target.value }))}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1/2 -translate-y-1/2"
                                onClick={() => handleAddComment(event.id, day, event.userId, comment.id)}
                                disabled={!newComments[key]?.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {filteredUnreadComments.length > 0 && filteredPendingUpdates.length > 0 && <Separator />}
            
            {filteredPendingUpdates.length > 0 && (
              <Accordion type="single" collapsible defaultValue="pending" className="w-full">
                <AccordionItem value="pending" className="border-none">
                  <AccordionTrigger className="px-0 py-2 text-sm font-medium hover:no-underline data-[state=open]:text-foreground">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Pending follow-ups ({filteredPendingUpdates.length})
                    </h4>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-3">
                    {filteredPendingUpdates.map(({ day, event, delegatedTo }) => {
                      const key = `${day}-${event.id}`;
                      const isCreatorView = event.creatorId === user.id;

                      return (
                        <div
                          key={key}
                          className="relative p-4 rounded-lg bg-background border border-muted shadow-sm before:absolute before:left-0 before:top-3 before:h-[calc(100%-1.5rem)] before:w-0.5 before:rounded-full before:bg-yellow-400/70"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">{event.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                No update from <span className="font-medium">{delegatedTo?.name}</span> ·
                                {format(parseISO(day), 'dd MMM yyyy')}
                                </p>
                            </div>
                            <div className="flex items-center">
                                <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => dismissPendingUpdate(event.id, day)}
                                >
                                Dismiss
                                </Button>
                            </div>
                          </div>
                          <div className="mt-3 rounded-lg bg-muted/40 p-2">
                            <div className="relative">
                              <Textarea
                                rows={1}
                                className="text-sm resize-none rounded-full pl-4 pr-10 py-2 bg-background focus:bg-background transition-colors"
                                placeholder={isCreatorView ? 'Ask for an update…' : 'Add an update for this event…'}
                                value={newComments[key] || ''}
                                onChange={(e) => setNewComments((prev) => ({ ...prev, [key]: e.target.value }))}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                onClick={() => handleAddComment(event.id, day, event.userId)}
                                disabled={!newComments[key]?.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
