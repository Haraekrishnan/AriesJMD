'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { format, formatDistanceToNow, parseISO, isPast, isToday, isSameDay } from 'date-fns';
import { MessageSquare, Calendar, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import type { Comment, PlannerEvent, User } from '@/lib/types';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { Textarea } from '../ui/textarea';

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
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  
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
    
    // --- DELEGATOR PENDING UPDATES ---
    const myDelegatedEvents = plannerEvents.filter(
      (e) =>
        e.creatorId === user.id &&
        e.userId !== user.id &&
        isPast(parseISO(e.date)) &&
        userMap.has(e.userId)
    );
    
    myDelegatedEvents.forEach((event) => {
      const eventStart = parseISO(event.date);
      const expanded = getExpandedPlannerEvents(eventStart, event.userId);
      
      const pastInstances = expanded.filter((instance) => {
        const d = instance.eventDate;
        // Only check for past dates, not today
        const isRelevantPastDay = isPast(d) && !isToday(d);
        if (!isRelevantPastDay) return false;
        
        // For 'once' events, only the exact date of the event is relevant
        if (event.frequency === 'once') {
            return isSameDay(d, eventStart);
        }

        // For recurring events, only check dates from the event's start date onwards
        return d.getTime() >= eventStart.getTime();
      });
      
      pastInstances.forEach((instance) => {
        const dayStr = format(instance.eventDate, 'yyyy-MM-dd');
        
        const dc = dailyPlannerComments.find(
          (x) => x.id === `${dayStr}_${event.userId}`
        );
        
        const commentsForEvent = dc
          ? Object.values(dc.comments || {}).filter((c) => c.eventId === event.id)
          : [];
        
        const assigneeCommented = commentsForEvent.some(
          (c) => c.userId === event.userId
        );
        
        const isDismissed =
          user.dismissedPendingUpdates?.[`${event.id}_${dayStr}`];
          
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
    
    // --- ASSIGNEE PENDING UPDATES (for events delegated TO me) ---
    const assignedEvents = plannerEvents.filter(
      (e) =>
        e.userId === user.id &&
        e.creatorId !== user.id &&
        isPast(parseISO(e.date)) &&
        userMap.has(e.creatorId)
    );
    
    assignedEvents.forEach((event) => {
      const eventStart = parseISO(event.date);
      const expanded = getExpandedPlannerEvents(eventStart, event.userId);
      
      const pastInstances = expanded.filter((instance) => {
        const d = instance.eventDate;
        const isRelevantPastDay = isPast(d) && !isToday(d);
         if (!isRelevantPastDay) return false;
        
        if (event.frequency === 'once') {
            return isSameDay(d, eventStart);
        }

        return d.getTime() >= eventStart.getTime();
      });
      
      pastInstances.forEach((instance) => {
        const dayStr = format(instance.eventDate, 'yyyy-MM-dd');
        
        const dc = dailyPlannerComments.find(
          (x) => x.id === `${dayStr}_${event.userId}`
        );
        
        const commentsForEvent = dc
          ? Object.values(dc.comments || {}).filter((c) => c.eventId === event.id)
          : [];
        
        const assigneeCommented = commentsForEvent.some(
          (c) => c.userId === event.userId
        );
        
        const isDismissed =
          user.dismissedPendingUpdates?.[`${event.id}_${dayStr}`];
          
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
    
    // Sort unread comments (newest first)
    const sortedUnread = allUnread.sort(
      (a, b) => parseISO(b.comment.date).getTime() - parseISO(a.comment.date).getTime()
    );
    
    // Remove duplicate pending entries per (day + event)
    const dedupedPending = [
      ...new Map(
        allPendingUpdates.map((item) => [`${item.day}-${item.event.id}`, item])
      ).values(),
    ];
    
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
  
  if (!user || (unreadComments.length === 0 && pendingUpdates.length === 0)) {
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
    dismissPendingUpdate(eventId, day);
    setNewComments((prev) => ({ ...prev, [key]: '' }));
  };
  
  const handleGoToEvent = (day: string, eventUserId: string) =>
    router.push(`/schedule?userId=${eventUserId}&date=${day}`);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Delegated Event Report/Review
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* UNREAD COMMENTS */}
          {unreadComments.map(({ day, event, comment, delegatedBy, delegatedTo }) => {
            const commentUser = users.find((u) => u.id === comment.userId);
            
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
                
                <div className="flex justify-end mt-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGoToEvent(day, event.userId)}
                  >
                    <Calendar className="mr-2 h-4 w-4" /> Go to Event
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleMarkAsRead(comment)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark as Read
                  </Button>
                </div>
              </div>
            );
          })}
          
          {/* PENDING UPDATES */}
          {pendingUpdates.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Pending Event Updates
              </h4>
              
              {pendingUpdates.map(({ day, event, delegatedTo }) => {
                const key = `${day}-${event.id}`;
                const isCreatorView = event.creatorId === user.id;
                
                return (
                  <div
                    key={key}
                    className="mt-2 p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/30"
                  >
                    {/* TOP ROW: text left, buttons right */}
                    <div className="flex justify-between items-start w-full">
                      {/* LEFT SIDE: title + message */}
                      <div className="flex flex-col">
                        <p className="font-semibold text-sm">{event.title}</p>
                        
                        <p className="text-xs">
                          {isCreatorView ? (
                            <>
                              No update from{' '}
                              <span className="font-medium">
                                {delegatedTo?.name}
                              </span>{' '}
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
                      
                      {/* RIGHT SIDE: buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-400 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleGoToEvent(day, event.userId)}
                        >
                          Review
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-red-400 text-red-600 hover:bg-red-50"
                          onClick={() => dismissPendingUpdate(event.id, day)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                    
                    {/* TEXTAREA ROW */}
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
                        onClick={() => handleAddComment(event.id, day, event.userId)}
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
        </div>
      </CardContent>
    </Card>
  );
}
