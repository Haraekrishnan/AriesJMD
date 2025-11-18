'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import {
  format,
  formatDistanceToNow,
  parseISO,
  isPast,
  isToday,
} from 'date-fns';
import {
  MessageSquare,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';
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

interface MyPendingUpdateInfo {
  type: 'my_pending_update';
  day: string;
  event: PlannerEvent;
  delegatedBy?: User;
}

export default function RecentPlannerActivity() {
  const {
    user,
    dailyPlannerComments,
    plannerEvents,
    users,
    markSinglePlannerCommentAsRead,
    dismissPendingUpdate,
    addPlannerEventComment,
  } = useAppContext();

  const router = useRouter();
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  const { unreadComments, pendingUpdates, myPendingUpdates } = useMemo(() => {
    if (!user)
      return { unreadComments: [], pendingUpdates: [], myPendingUpdates: [] };

    const allUnread: UnreadCommentInfo[] = [];
    const allPendingUpdates: PendingUpdateInfo[] = [];
    const myAllPendingUpdates: MyPendingUpdateInfo[] = [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // ------------------------------------------------------------------
    // 1. UNREAD COMMENTS (for events I'm involved in)
    // ------------------------------------------------------------------
    dailyPlannerComments.forEach((dayComment) => {
      if (!dayComment || !dayComment.day || !dayComment.comments) return;

      const comments = Array.isArray(dayComment.comments)
        ? dayComment.comments
        : Object.values(dayComment.comments || {});

      comments.forEach((comment) => {
        if (!comment) return;

        const eventForComment = plannerEvents.find(
          (e) => e.id === comment.eventId
        );
        if (!eventForComment || !userMap.has(eventForComment.userId)) return;

        const isParticipant =
          eventForComment.creatorId === user.id ||
          eventForComment.userId === user.id;

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

    // ------------------------------------------------------------------
    // 2. DELEGATOR VIEW – events I delegated to others (pending updates)
    // ------------------------------------------------------------------
    const myDelegatedEvents = plannerEvents.filter(
      (e) =>
        e.creatorId === user.id && e.userId !== user.id && userMap.has(e.userId)
    );

    myDelegatedEvents.forEach((event) => {
      const eventDate = parseISO(event.date);

      // Only care once the event date is in the past (not today)
      if (isPast(eventDate) && !isToday(eventDate)) {
        const dayStr = format(eventDate, 'yyyy-MM-dd');

        const dayCommentData = dailyPlannerComments.find(
          (dc) => dc.id === `${dayStr}_${event.userId}`
        );

        const commentsForEvent = dayCommentData
          ? Object.values(dayCommentData.comments || {}).filter(
              (c: any) => c && c.eventId === event.id
            )
          : [];

        const assigneeCommented = commentsForEvent.some(
          (c: any) => c.userId === event.userId
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
      }
    });

    // ------------------------------------------------------------------
    // 3. ASSIGNEE VIEW – events delegated TO ME (my pending updates)
    // ------------------------------------------------------------------
    const eventsDelegatedToMe = plannerEvents.filter(
      (e) => e.userId === user.id && e.creatorId !== user.id
    );

    eventsDelegatedToMe.forEach((event) => {
      const eventDate = parseISO(event.date);

      if (isPast(eventDate) && !isToday(eventDate)) {
        const dayStr = format(eventDate, 'yyyy-MM-dd');

        const dayCommentData = dailyPlannerComments.find(
          (dc) => dc.id === `${dayStr}_${user.id}`
        );

        const commentsForEvent = dayCommentData
          ? Object.values(dayCommentData.comments || {}).filter(
              (c: any) => c && c.eventId === event.id
            )
          : [];

        const iCommented = commentsForEvent.some(
          (c: any) => c.userId === user.id
        );

        if (!iCommented) {
          myAllPendingUpdates.push({
            type: 'my_pending_update',
            day: dayStr,
            event,
            delegatedBy: users.find((u) => u.id === event.creatorId),
          });
        }
      }
    });

    return {
      unreadComments: allUnread.sort(
        (a, b) =>
          parseISO(b.comment.date).getTime() -
          parseISO(a.comment.date).getTime()
      ),
      // Deduplicate by day+event
      pendingUpdates: [
        ...new Map(
          allPendingUpdates.map((item) => [`${item.day}-${item.event.id}`, item])
        ).values(),
      ],
      myPendingUpdates: [
        ...new Map(
          myAllPendingUpdates.map((item) => [
            `${item.day}-${item.event.id}`,
            item,
          ])
        ).values(),
      ],
    };
  }, [user, dailyPlannerComments, plannerEvents, users]);

  // If nothing to show, hide the whole card
  if (
    unreadComments.length === 0 &&
    pendingUpdates.length === 0 &&
    myPendingUpdates.length === 0
  ) {
    return null;
  }

  const handleMarkAsRead = (comment: Comment) => {
    if (comment.eventId) {
      const event = plannerEvents.find((e) => e.id === comment.eventId);
      const day = dailyPlannerComments.find(
        (dc) =>
          dc.comments &&
          Object.values(dc.comments).some((c: any) => c && c.id === comment.id)
      )?.day;

      if (event && day) {
        markSinglePlannerCommentAsRead(event.userId, day, comment.id);
      }
    }
  };

  const handleAddComment = (eventId: string, day: string, userId: string) => {
    const commentKey = `${day}-${eventId}`;
    const commentText = newComments[commentKey];
    if (!commentText || !commentText.trim()) return;

    addPlannerEventComment(userId, day, eventId, commentText);
    dismissPendingUpdate(eventId, day);
    setNewComments((prev) => ({ ...prev, [commentKey]: '' }));
  };

  const handleGoToEvent = (day: string, eventUserId: string) => {
    router.push(`/schedule?userId=${eventUserId}&date=${day}`);
  };

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
          {/* 1. My pending updates (events delegated TO me) */}
          {myPendingUpdates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Action
                Required: Your Pending Updates
              </h4>
              {myPendingUpdates.map(({ day, event, delegatedBy }) => (
                <div
                  key={`${day}-${event.id}`}
                  className="p-3 border rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{event.title}</p>
                      <p className="text-xs">
                        Update needed for{' '}
                        {format(parseISO(day), 'dd MMM, yyyy')}. Delegated by{' '}
                        <span className="font-medium">
                          {delegatedBy?.name}
                        </span>
                        .
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGoToEvent(day, event.userId)}
                    >
                      Add Update
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Pending updates from my team (events I delegated) */}
          {pendingUpdates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Pending Event Updates from Your Team
              </h4>
              {pendingUpdates.map(({ day, event, delegatedTo }) => {
                const commentKey = `${day}-${event.id}`;
                return (
                  <div
                    key={`${day}-${event.id}`}
                    className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{event.title}</p>
                        <p className="text-xs">
                          No comment from{' '}
                          <span className="font-medium">
                            {delegatedTo?.name}
                          </span>{' '}
                          for {format(parseISO(day), 'dd MMM, yyyy')}.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGoToEvent(day, event.userId)}
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            dismissPendingUpdate(event.id, day)
                          }
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <Textarea
                        value={newComments[commentKey] || ''}
                        onChange={(e) =>
                          setNewComments((prev) => ({
                            ...prev,
                            [commentKey]: e.target.value,
                          }))
                        }
                        placeholder={`Ask ${delegatedTo?.name} for an update...`}
                        className="pr-10 text-xs bg-white dark:bg-card"
                        rows={1}
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() =>
                          handleAddComment(event.id, day, event.userId)
                        }
                        disabled={
                          !newComments[commentKey] ||
                          !newComments[commentKey].trim()
                        }
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Unread comments on planner events */}
          {unreadComments.map(
            ({ day, event, comment, delegatedBy, delegatedTo }) => {
              const commentUser = users.find((u) => u.id === comment.userId);
              const targetUserId = event.userId;

              return (
                <div
                  key={comment.id}
                  className="p-4 border rounded-lg bg-muted/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Event on {format(parseISO(day), 'dd MMM, yyyy')}{' '}
                        &middot;
                        {event.creatorId === event.userId
                          ? ` Personal planning for ${delegatedTo?.name}`
                          : ` Delegated to ${delegatedTo?.name} by ${delegatedBy?.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={commentUser?.avatar} />
                      <AvatarFallback>
                        {commentUser?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm bg-background p-3 rounded-md w-full">
                      <div className="flex justify-between items-baseline">
                        <p className="font-semibold">{commentUser?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(comment.date), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <p className="text-foreground/80 mt-1 whitespace-pre-wrap">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGoToEvent(day, targetUserId)}
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
            }
          )}
        </div>
      </CardContent>
    </Card>
  );
}
