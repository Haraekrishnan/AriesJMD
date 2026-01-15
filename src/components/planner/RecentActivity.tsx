
'use client';
import { useMemo, useState } from 'react';
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
    deletePlannerEvent,
  } = useAppContext();
  
  const router = useRouter();
  const { toast } = useToast();
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [justReplied, setJustReplied] = useState<Set<string>>(new Set());
  
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
  
  const filteredUnreadComments = unreadComments.filter(uc => !justReplied.has(uc.event.id + uc.day));

  if (!user || (filteredUnreadComments.length === 0 && pendingUpdates.length === 0)) {
    return null;
  }
  
  const handleMarkAsRead = (comment: Comment) => {
    const event = plannerEvents.find((e) => e.id === comment.eventId);
    const day = dailyPlannerComments.find((dc) =>
      Object.values(dc.comments || {}).some((c) => c?.id === comment.id)
    )?.day;
    
    if (event && day) {
      markSinglePlannerCommentAsRead(event.userId, day, comment.id);
    }
  };

  const handleAddComment = (eventId: string, day: string, eventUserId: string) => {
    const key = `${day}-${eventId}`;
    const text = newComments[key];
    if (!text?.trim()) return;
    
    addPlannerEventComment(eventUserId, day, eventId, text);
    setJustReplied(prev => new Set(prev).add(eventId + day));
    setNewComments((prev) => ({ ...prev, [key]: '' }));
  };
  
  const handleGoToEvent = (day: string, eventUserId: string) =>
    router.push(`/planner?userId=${eventUserId}&date=${day}`);

  const handleDeleteEvent = (event: PlannerEvent) => {
    deletePlannerEvent(event.id);
    toast({ variant: 'destructive', title: 'Event Deleted' });
  };
  
  return (
    <Card className="border-orange-500 dark:border-orange-400">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <MessageSquare className="h-5 w-5" />
          Delegated Event Report/Review
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* UNREAD COMMENTS */}
          {filteredUnreadComments.map(({ day, event, comment, delegatedBy, delegatedTo }) => {
            const commentUser = users.find((u) => u.id === comment.userId);
            // If the current user is the one who made the last comment, they are the 'sender' in this context.
            // The notification is for the other person.
            const isMyUpdate = user.id === comment.userId;
            const key = `${day}-${event.id}`;
            
            return (
              <div key={comment.id} className="p-4 border rounded-lg bg-muted/50">
                <p className="font-semibold text-sm">{event.title}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Event on {format(parseISO(day), 'dd MMM yyyy')} ·{' '}
                  {event.creatorId === event.userId
                    ? `Personal planning for ${delegatedTo?.name}`
                    : `Delegated to ${delegatedTo?.name} by ${delegatedBy?.name}`}
                </p>
                
                <div className="flex items-start gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={commentUser?.avatar} />
                    <AvatarFallback>
                      {commentUser?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="text-sm bg-background p-3 rounded-md w-full">
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
                
                <div className="mt-2">
                    {isMyUpdate ? null : ( // This is the user who RECEIVED the comment
                        isDelegatedByMe(event, user) ? ( // I am the delegator, receiving an update
                            <div className="flex justify-end mt-2 gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleGoToEvent(day, event.userId)}><Calendar className="mr-2 h-4 w-4" /> Go to Event</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleMarkAsRead(comment)}><CheckCircle className="mr-2 h-4 w-4" /> Mark as Read</Button>
                            </div>
                        ) : ( // I am the delegated-to person, receiving a query
                            <div className="relative mt-2">
                              <Textarea
                                  value={newComments[key] || ''}
                                  onChange={(e) => setNewComments((prev) => ({ ...prev, [key]: e.target.value }))}
                                  placeholder={`Reply to ${commentUser?.name}...`}
                                  className="pr-10 text-sm bg-background"
                                  rows={1}
                              />
                              <Button
                                  size="icon"
                                  variant="ghost"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => handleAddComment(event.id, day, event.userId)}
                                  disabled={!newComments[key]?.trim()}
                              >
                                  <Send className="h-4 w-4" />
                              </Button>
                            </div>
                        )
                    )}
                </div>

              </div>
            );
          })}
          
          {/* PENDING UPDATES */}
          {pendingUpdates.length > 0 && (
            <div className="space-y-2">
                <Accordion type="single" collapsible>
                    <AccordionItem value="pending-updates">
                        <AccordionTrigger className="font-semibold text-sm">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                Pending Event Updates ({pendingUpdates.length})
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 space-y-2">
                        {pendingUpdates.map(({ day, event, delegatedTo }) => {
                            const key = `${day}-${event.id}`;
                            const isCreatorView = event.creatorId === user.id;

                            return (
                            <div
                                key={key}
                                className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/30"
                            >
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex flex-col">
                                        <p className="font-semibold text-sm">{event.title}</p>
                                        <p className="text-xs">
                                        {isCreatorView ? (
                                            <>
                                            No update from{' '}
                                            <span className="font-medium">{delegatedTo?.name}</span>{' '}
                                            for {format(parseISO(day), 'dd MMM, yyyy')}.
                                            </>
                                        ) : (
                                            <>
                                            You have not updated this event for{' '}
                                            {format(parseISO(day), 'dd MMM, yyyy')}.
                                            </>
                                        )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                        size="sm"
                                        variant="secondary"
                                        className="border-gray-400 text-gray-600 hover:bg-gray-100"
                                        onClick={() => dismissPendingUpdate(event.id, day)}
                                        >
                                        Dismiss
                                        </Button>
                                        {user?.role === 'Admin' && (
                                            <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to permanently delete "{event.title}"? This will remove it for all users.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteEvent(event)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="relative mt-2">
                                <Textarea
                                    rows={1}
                                    className="text-xs pr-10 bg-white dark:bg-card"
                                    placeholder={
                                    isCreatorView
                                        ? `Ask ${delegatedTo?.name || 'them'} for an update...`
                                        : 'Add an update for this event...'
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
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleAddComment(event.id, day, event.userId)}
                                    disabled={!newComments[key]?.trim()}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                                </div>
                            </div>
                            );
                        })}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function isDelegatedByMe(event: PlannerEvent, user: User | null): boolean {
    if (!user) return false;
    return event.creatorId === user.id && event.creatorId !== event.userId;
}
