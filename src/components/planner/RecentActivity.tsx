'use client';
import { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { format, formatDistanceToNow, parseISO, isPast, isToday, startOfDay, subDays, isAfter } from 'date-fns';
import { MessageSquare, Calendar, CheckCircle, AlertTriangle, Send, Trash2 } from 'lucide-react';
import type { Comment, PlannerEvent, User } from '@/lib/types';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { Textarea } from '../ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

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

export default function RecentActivity() {
  const {
    user,
    dailyPlannerComments,
    plannerEvents,
    users,
    markSinglePlannerCommentAsRead,
    getExpandedPlannerEvents,
    dismissPendingUpdate,
    addPlannerEventComment,
    deletePlannerEvent,
  } = useAppContext();
  
  const router = useRouter();
  const { toast } = useToast();
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [actionedItems, setActionedItems] = useState<Set<string>>(new Set());
  
  const { unreadComments, pendingUpdates } = useMemo(() => {
    if (!user) return { unreadComments: [], pendingUpdates: [] };
    
    const allUnread: UnreadCommentInfo[] = [];
    const allPendingUpdates: PendingUpdateInfo[] = [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    
    // --- UNREAD COMMENTS ---
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
    
    // --- PENDING UPDATES ---
    const delegatedEvents = plannerEvents.filter(e => e.creatorId !== e.userId && (e.creatorId === user.id || e.userId === user.id));

    delegatedEvents.forEach(event => {
        const today = startOfDay(new Date());
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
  
  const handleGoToEvent = (day: string, eventUserId: string) =>
    router.push(`/planner?userId=${eventUserId}&date=${day}`);

  const handleDeleteEvent = (event: PlannerEvent) => {
    deletePlannerEvent(event.id);
    toast({ variant: 'destructive', title: 'Event Deleted' });
  };

  if (!user || (filteredUnreadComments.length === 0 && filteredPendingUpdates.length === 0)) {
    return null;
  }
  
  return (
    <Card className="rounded-xl border border-border bg-background shadow-md">
      <CardHeader className="px-4 py-3 border-b bg-muted/40">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
          Delegated activity
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-4 py-4">
        <div className="space-y-4">
          {filteredUnreadComments.length > 0 && (
            <Accordion type="single" collapsible defaultValue="new-replies">
              <AccordionItem value="new-replies" className="border-none">
                <AccordionTrigger className="px-0 py-2 text-sm font-medium hover:no-underline data-[state=open]:text-foreground">
                  New Replies ({filteredUnreadComments.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {filteredUnreadComments.map(({ day, event, comment, delegatedBy, delegatedTo }) => {
                    const commentUser = users.find((u) => u.id === comment.userId);
                    const key = comment.id;
                    const isCreatorViewingReply = event.creatorId === user.id && comment.userId !== user.id;

                    return (
                        <div key={comment.id} className="relative p-4 rounded-lg bg-background border border-blue-500/30 shadow-sm before:absolute before:left-0 before:top-3 before:h-[calc(100%-1.5rem)] before:w-0.5 before:rounded-full before:bg-blue-400/70">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Event on {format(parseISO(day), 'dd MMM yyyy')} ·{' '}
                          {event.creatorId === event.userId
                            ? `Personal planning for ${delegatedTo?.name}`
                            : `Delegated to ${delegatedTo?.name} by ${delegatedBy?.name}`}
                        </p>
                        
                        <div className="flex items-start gap-2 mt-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={commentUser?.avatar} />
                            <AvatarFallback>
                              {commentUser?.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm bg-muted p-3 rounded-md w-full">
                            <div className="flex justify-between text-xs">
                              <strong>{commentUser?.name}</strong>
                              <span>
                                {formatDistanceToNow(parseISO(comment.date), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          {isCreatorViewingReply ? (
                            <div className="flex justify-end items-center gap-2">
                                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => handleGoToEvent(day, event.userId)}><Calendar className="mr-2 h-4 w-4" /> Go to Event</Button>
                                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => handleMarkAsRead(comment)}><CheckCircle className="mr-2 h-4 w-4" /> Mark as Read</Button>
                                <Accordion type="single" collapsible className="w-auto">
                                    <AccordionItem value="reply" className="border-none">
                                      <AccordionTrigger className="p-2 text-xs hover:no-underline rounded-sm hover:bg-muted">Reply</AccordionTrigger>
                                      <AccordionContent className="pt-2">
                                        <div className="mt-3 rounded-lg bg-muted/40 p-2">
                                          <div className="relative">
                                            <Textarea
                                                value={newComments[key] || ''}
                                                onChange={(e) => setNewComments((prev) => ({ ...prev, [key]: e.target.value }))}
                                                placeholder={`Reply to ${commentUser?.name}...`}
                                                className="text-sm resize-none rounded-full pl-4 pr-10 py-2 bg-background focus:bg-background transition-colors"
                                                rows={1}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                                onClick={() => handleAddComment(event.id, day, event.userId, comment.id)}
                                                disabled={!newComments[key]?.trim()}
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-lg bg-muted/40 p-2">
                              <div className="relative">
                                <Textarea
                                    value={newComments[key] || ''}
                                    onChange={(e) => setNewComments((prev) => ({ ...prev, [key]: e.target.value }))}
                                    placeholder={`Reply to ${commentUser?.name}...`}
                                    className="text-sm resize-none rounded-full pl-4 pr-10 py-2 bg-background focus:bg-background transition-colors"
                                    rows={1}
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddComment(event.id, day, event.userId, comment.id)} disabled={!newComments[key]?.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMarkAsRead(comment)}>
                                        <CheckCircle className="h-4 w-4"/>
                                    </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          
          {filteredUnreadComments.length > 0 && filteredPendingUpdates.length > 0 && <Separator />}

          {filteredPendingUpdates.length > 0 && (
             <Accordion type="single" collapsible defaultValue="pending-updates">
                <AccordionItem value="pending-updates" className="border-none">
                  <AccordionTrigger className="px-0 py-2 text-sm font-medium hover:no-underline data-[state=open]:text-foreground">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Pending follow-ups ({filteredPendingUpdates.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {filteredPendingUpdates.map(({ day, event, delegatedTo }) => {
                        const key = `${day}-${event.id}`;
                        const isCreatorView = event.creatorId === user.id;

                        return (
                        <div key={key} className="relative rounded-xl bg-white dark:bg-card border border-yellow-400/40 shadow">
                           <div className="flex items-center justify-between px-4 py-2 rounded-t-xl bg-yellow-50 dark:bg-yellow-900/40 border-b">
                                <div className="flex items-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-300">
                                    <AlertTriangle className="h-4 w-4" />
                                    Pending follow-up
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" className="text-xs h-auto py-1 text-muted-foreground hover:text-foreground" onClick={() => dismissPendingUpdate(event.id, day)}>Dismiss</Button>
                                </div>
                            </div>
                            <div className="px-4 py-3 space-y-1">
                                <p className="text-sm font-semibold">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                {isCreatorView ? (
                                    <>
                                    No update from <span className="font-medium">{delegatedTo?.name}</span> · {format(parseISO(day), 'dd MMM yyyy')}
                                    </>
                                ) : (
                                    <>
                                    You have not updated this event for {format(parseISO(day), 'dd MMM yyyy')}
                                    </>
                                )}
                                </p>
                            </div>
                            <div className="px-3 py-3 border-t bg-muted/30 rounded-b-xl">
                              <div className="relative">
                                <Textarea
                                    rows={1}
                                    className="rounded-full bg-background pl-4 pr-10 py-2 text-sm border focus:ring-2 focus:ring-yellow-400/40"
                                    placeholder={
                                      isCreatorView
                                          ? `Ask for an update…`
                                          : 'Add an update for this event…'
                                    }
                                    value={newComments[key] || ''}
                                    onChange={(e) =>
                                    setNewComments((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                    }))
                                    }
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
        </div>
      </CardContent>
    </Card>
  );
}
