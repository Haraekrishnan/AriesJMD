'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  formatDistanceToNow,
  parseISO,
  startOfDay,
  subDays,
  isAfter,
} from 'date-fns';
import {
  MessageSquare,
  Calendar,
  CheckCircle,
  Send,
  Trash2,
} from 'lucide-react';

import { useAppContext } from '@/contexts/app-provider';
import type { Comment, PlannerEvent, User } from '@/lib/types';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

interface UnreadCommentInfo {
  day: string;
  event: PlannerEvent;
  comment: Comment;
  delegatedTo?: User;
}

interface PendingUpdateInfo {
  day: string;
  event: PlannerEvent;
  delegatedTo?: User;
}

/* ------------------------------------------------------------------ */
/* COMPONENT */
/* ------------------------------------------------------------------ */

export default function RecentPlannerActivity() {
  const {
    user,
    users,
    plannerEvents,
    dailyPlannerComments,
    getExpandedPlannerEvents,
    markSinglePlannerCommentAsRead,
    dismissPendingUpdate,
    addPlannerEventComment,
    deletePlannerEvent,
  } = useAppContext();

  const router = useRouter();
  const { toast } = useToast();

  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  /* ------------------------------------------------------------------ */
  /* DATA */
  /* ------------------------------------------------------------------ */

  const { unread, pending } = useMemo(() => {
    if (!user) return { unread: [], pending: [] };

    const unreadList: UnreadCommentInfo[] = [];
    const pendingList: PendingUpdateInfo[] = [];

    // ---------- UNREAD COMMENTS ----------
    dailyPlannerComments.forEach((dayBlock) => {
      if (!dayBlock?.day || !dayBlock.comments) return;

      Object.values(dayBlock.comments).forEach((comment) => {
        if (!comment || comment.userId === user.id) return;

        const event = plannerEvents.find((e) => e.id === comment.eventId);
        if (!event) return;

        const isParticipant =
          event.creatorId === user.id || event.userId === user.id;

        if (isParticipant && !comment.viewedBy?.[user.id]) {
          unreadList.push({
            day: dayBlock.day,
            event,
            comment,
            delegatedTo: users.find((u) => u.id === event.userId),
          });
        }
      });
    });

    unreadList.sort(
      (a, b) =>
        parseISO(b.comment.date).getTime() -
        parseISO(a.comment.date).getTime()
    );

    // ---------- PENDING UPDATES ----------
    const delegatedEvents = plannerEvents.filter(
      (e) =>
        e.creatorId !== e.userId &&
        (e.creatorId === user.id || e.userId === user.id)
    );

    delegatedEvents.forEach((event) => {
      const today = startOfDay(new Date());
      const start = subDays(today, 30);
      const end = subDays(today, 1);

      if (isAfter(parseISO(event.date), end)) return;

      const expanded = getExpandedPlannerEvents(start, end, event.userId);

      expanded
        .filter((i) => i.event.id === event.id)
        .forEach((instance) => {
          const day = format(instance.eventDate, 'yyyy-MM-dd');
          const key = `${event.id}_${day}`;

          const dc = dailyPlannerComments.find(
            (d) => d.id === `${day}_${event.userId}`
          );

          const assigneeCommented = dc
            ? Object.values(dc.comments || {}).some(
                (c) => c.eventId === event.id && c.userId === event.userId
              )
            : false;

          if (!assigneeCommented && !user.dismissedPendingUpdates?.[key]) {
            pendingList.push({
              day,
              event,
              delegatedTo: users.find((u) => u.id === event.userId),
            });
          }
        });
    });

    return { unread: unreadList, pending: pendingList };
  }, [
    user,
    users,
    plannerEvents,
    dailyPlannerComments,
    getExpandedPlannerEvents,
  ]);

  const visibleUnread = unread.filter((u) => !actioned.has(u.comment.id));
  const visiblePending = pending.filter(
    (p) => !actioned.has(`${p.day}-${p.event.id}`)
  );

  if (!user || (!visibleUnread.length && !visiblePending.length)) {
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* HANDLERS */
  /* ------------------------------------------------------------------ */

  const goToEvent = (day: string, userId: string) =>
    router.push(`/planner?userId=${userId}&date=${day}`);

  const markRead = (comment: Comment, day: string, eventUserId: string) => {
    markSinglePlannerCommentAsRead(eventUserId, day, comment.id);
    setActioned((s) => new Set(s).add(comment.id));
  };

  const sendComment = (
    eventId: string,
    day: string,
    eventUserId: string,
    originalId?: string
  ) => {
    const key = `${day}-${eventId}`;
    const text = newComments[key];
    if (!text?.trim()) return;

    addPlannerEventComment(eventUserId, day, eventId, text);
    setNewComments((p) => ({ ...p, [key]: '' }));
    setActioned((s) => new Set(s).add(originalId || key));
  };

  const removeEvent = (event: PlannerEvent) => {
    deletePlannerEvent(event.id);
    toast({ variant: 'destructive', title: 'Event deleted' });
  };

  /* ------------------------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------------------------ */

  return (
    <Card className="bg-white dark:bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base font-semibold">
              Delegated Event Review
            </CardTitle>
          </div>

          {visiblePending.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {visiblePending.length} Pending
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          Comments and pending updates on delegated tasks
        </p>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ================= UNREAD COMMENTS ================= */}
        {visibleUnread.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Unread Comments ({visibleUnread.length})
            </h3>

            {visibleUnread.map(({ day, event, comment, delegatedTo }) => {
              const author = users.find((u) => u.id === comment.userId);
              const key = `${day}-${event.id}`;

              return (
                <div
                  key={comment.id}
                  className="rounded-lg border bg-muted/30 p-3 space-y-2"
                >
                  <p className="text-sm font-medium">{event.title}</p>

                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={author?.avatar} />
                      <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 bg-background rounded p-3 text-sm">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">{author?.name}</span>
                        <span>
                          {formatDistanceToNow(parseISO(comment.date), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p>{comment.text}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => goToEvent(day, event.userId)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      View
                    </Button>

                    <Textarea
                      rows={1}
                      className="max-w-xs text-xs"
                      placeholder="Reply…"
                      value={newComments[key] || ''}
                      onChange={(e) =>
                        setNewComments((p) => ({
                          ...p,
                          [key]: e.target.value,
                        }))
                      }
                    />

                    {/* SEND */}
<Button
  size="icon"
  className="
    bg-blue-600 text-white
    hover:bg-blue-700
    active:bg-blue-800
  "
  disabled={!newComments[key]?.trim()}
  onClick={() =>
    sendComment(event.id, day, event.userId, comment.id)
  }
>
  <Send className="h-4 w-4" />
</Button>


                    {/* MARK READ */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        markRead(comment, day, event.userId)
                      }
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ================= PENDING UPDATES ================= */}
        {visiblePending.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium">
              Pending Updates ({visiblePending.length})
            </h3>

            {visiblePending.map(({ day, event, delegatedTo }) => {
              const key = `${day}-${event.id}`;

              return (
                <div
                  key={key}
                  className="rounded-lg border bg-muted/30 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Awaiting update from {delegatedTo?.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* DISMISS */}
                      <Button
                        size="sm"
                        className="
                          border border-border
                          bg-muted/40
                          text-muted-foreground
                          hover:bg-muted
                          hover:text-foreground
                        "
                        onClick={() =>
                          dismissPendingUpdate(event.id, day)
                        }
                      >
                        Dismiss
                      </Button>

                      {/* DELETE */}
                      {user.role === 'Admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="
                                text-red-600
                                hover:bg-red-50
                                hover:text-red-700
                                dark:hover:bg-red-900/30
                              "
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Event?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeEvent(event)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Textarea
                      rows={1}
                      className="text-xs pr-10"
                      placeholder="Request an update…"
                      value={newComments[key] || ''}
                      onChange={(e) =>
                        setNewComments((p) => ({
                          ...p,
                          [key]: e.target.value,
                        }))
                      }
                    />

                    {/* SEND */}
<Button
  size="icon"
  className="
    absolute right-1 top-1/2 -translate-y-1/2
    bg-blue-600 text-white
    hover:bg-blue-700
    active:bg-blue-800
  "
  disabled={!newComments[key]?.trim()}
  onClick={() =>
    sendComment(event.id, day, event.userId)
  }
>
  <Send className="h-4 w-4" />
</Button>

                  </div>
                </div>
              );
            })}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
