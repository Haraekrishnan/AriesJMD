'use client';

import { useMemo, useState } from 'react';
import styles from './delegated-review.module.css';
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
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';

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
  } = useAuth();
  const {
    plannerEvents,
    dailyPlannerComments,
    getExpandedPlannerEvents,
    markSinglePlannerCommentAsRead,
    dismissPendingUpdate,
    addPlannerEventComment,
    deletePlannerEvent,
  } = usePlanner();

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
        e.creatorId === user.id
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
    <Card className={styles.review}>
      <CardHeader className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.headingIcon}><MessageSquare aria-hidden="true" /></span>
          <div>
            <CardTitle className={styles.title}>Delegated Event Review</CardTitle>
            <p className={styles.subtitle}>Follow up on pending updates and respond to your team's comments.</p>
          </div>
        </div>
        <div className={styles.counts} aria-label="Review summary">
          <span className={styles.pendingCount}><strong>{visiblePending.length}</strong> Pending updates</span>
          <span className={styles.unreadCount}><strong>{visibleUnread.length}</strong> Unread comments</span>
        </div>
      </CardHeader>
      <CardContent className={styles.content}>

        {/* ================= UNREAD COMMENTS ================= */}
        {visibleUnread.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Unread Comments ({visibleUnread.length})
            </h3>

            {visibleUnread.map(({ day, event, comment, delegatedTo }) => {
              const author = users.find((u) => u.id === comment.userId);
              const key = `${day}-${event.id}`;

              return (
                <div
                  key={comment.id}
                  className={styles.item}
                >
                  <p className="text-sm font-medium">
                    {event.title}
                    <span className="text-[10px] text-muted-foreground font-normal ml-2">({format(parseISO(day), 'dd MMM')})</span>
                  </p>

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

                  <div className={styles.replyActions}>
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
                      className={styles.replyInput}
                      aria-label={"Reply to " + event.title}
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
                      aria-label="Send reply"
                      size="icon"
                      className="bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                      disabled={!newComments[key]?.trim()}
                      onClick={() =>
                        sendComment(event.id, day, event.userId, comment.id)
                      }
                    >
                      <Send className="h-4 w-4" />
                    </Button>


                    {/* MARK READ */}
                    <Button
                      aria-label="Mark comment as read"
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
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Pending Updates ({visiblePending.length})
            </h3>

            {visiblePending.map(({ day, event, delegatedTo }) => {
              const key = `${day}-${event.id}`;

              return (
                <div
                  key={key}
                  className={styles.item}
                >
                  <div className={styles.itemHeader}>
                    <div>
                      <p className={styles.eventTitle}>{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Awaiting update for <span className="font-semibold text-foreground">{format(parseISO(day), 'PPP')}</span> from {delegatedTo?.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => goToEvent(day, event.userId)}><Calendar className="mr-1 h-4 w-4" />View event</Button>
                      {/* DISMISS */}
                      <Button
                        size="sm"
                        className="border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                              aria-label={"Delete " + event.title}
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30"
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

                  <div className={styles.composer}>
                    <Textarea
                      rows={1}
                      className={styles.updateInput}
                      aria-label={"Request an update on " + event.title}
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
                      size="sm"
                      className={styles.sendButton}
                      disabled={!newComments[key]?.trim()}
                      onClick={() =>
                        sendComment(event.id, day, event.userId)
                      }
                    >
                      <Send className="h-4 w-4" /> Request update
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
