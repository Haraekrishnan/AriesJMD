
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  eachDayOfInterval, endOfMonth, startOfMonth, format,
  isSameDay, getDate, isPast, isValid, parseISO, isToday,
  isSameMonth, startOfWeek, endOfWeek, startOfDay, addMonths, subMonths
} from 'date-fns';
import { ref, update } from "firebase/database";
import { rtdb } from "@/lib/rtdb";
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Edit, Trash2, Send, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { PlannerEvent } from '@/lib/types';
import EditEventDialog from './EditEventDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';


interface PlannerCalendarProps {
  selectedUserId: string;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

const MAX_EVENTS_VISIBLE = 2;

const eventColors = [
    'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
    'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
    'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
    'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200',
    'bg-pink-100 dark:bg-pink-900/40 border-pink-300 dark:border-pink-700 text-pink-800 dark:text-pink-200',
    'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200',
    'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200',
];

const personalPlanningColor = 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';

const creatorColorMap = new Map<string, string>();
let colorIndex = 0;

const getColorForCreator = (creatorId: string) => {
    if (!creatorColorMap.has(creatorId)) {
        creatorColorMap.set(creatorId, eventColors[colorIndex % eventColors.length]);
        colorIndex++;
    }
    return creatorColorMap.get(creatorId);
};


export default function PlannerCalendar({
  selectedUserId,
  selectedDate,
  setSelectedDate,
  currentMonth: externalCurrentMonth,
  setCurrentMonth: setExternalCurrentMonth
}: PlannerCalendarProps) {
  const { user, users } = useAuth();
  const {
      getExpandedPlannerEvents, deletePlannerEvent,
      addPlannerEventComment, dailyPlannerComments, markSinglePlannerCommentAsRead
  } = usePlanner();

  const { toast } = useToast();
  const [internalCurrentMonth, setInternalCurrentMonth] = useState(externalCurrentMonth);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Sync month externally
  useEffect(() => {
    setInternalCurrentMonth(externalCurrentMonth);
  }, [externalCurrentMonth]);

  // When selectedDate changes (e.g., "Go to Event" clicked)
  useEffect(() => {
    if (selectedDate && !isSameMonth(selectedDate, internalCurrentMonth)) {
      const newMonth = startOfMonth(selectedDate);
      setInternalCurrentMonth(newMonth);
      if(setExternalCurrentMonth) setExternalCurrentMonth(newMonth);
    }
    
    // Smooth scroll to calendar
    const calendarElement = document.getElementById("planner-calendar-section");
    if (calendarElement && selectedDate) {
      calendarElement.scrollIntoView({ behavior: "smooth" });

      // Temporary highlight animation
      const dayKey = format(selectedDate, 'yyyy-MM-dd');
      const el = document.querySelector(`[data-date="${dayKey}"]`);
      if (el) {
        el.classList.add("animate-pulse", "bg-blue-100", "dark:bg-blue-900/50");
        setTimeout(() => el.classList.remove("animate-pulse", "bg-blue-100", "dark:bg-blue-900/50"), 1500);
      }
    }
  }, [selectedDate, setExternalCurrentMonth, internalCurrentMonth]);

  const expandedEvents = useMemo(
    () => getExpandedPlannerEvents(internalCurrentMonth, selectedUserId),
    [getExpandedPlannerEvents, internalCurrentMonth, selectedUserId]
  );

  const viewingUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(internalCurrentMonth);
    const monthEnd = endOfMonth(internalCurrentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [internalCurrentMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return expandedEvents.filter(event => isSameDay(event.eventDate, selectedDate as Date));
  }, [expandedEvents, selectedDate]);

  const dayCommentsData = useMemo(() => {
    if (!selectedDate) return null;
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const dayCommentId = `${dayStr}_${selectedUserId}`;
    return dailyPlannerComments.find(c => c.id === dayCommentId) || null;
  }, [dailyPlannerComments, selectedDate, selectedUserId]);

  const getCommentsForEvent = (eventId: string) => {
    if (!dayCommentsData || !dayCommentsData.comments) return [];
    const allComments = Array.isArray(dayCommentsData.comments)
      ? dayCommentsData.comments
      : Object.values(dayCommentsData.comments);
    return allComments.filter(c => c && c.eventId === eventId);
  };

  const handleAddComment = (eventId: string) => {
    const commentText = newComments[eventId];
    if (!commentText || !commentText.trim() || !selectedDate) return;
    addPlannerEventComment(selectedUserId, format(selectedDate, 'yyyy-MM-dd'), eventId, commentText);
    setNewComments(prev => ({ ...prev, [eventId]: '' }));
  };

  const handleDeleteEvent = (event: PlannerEvent) => {
    deletePlannerEvent(event.id);
    toast({ variant: 'destructive', title: 'Event Deleted' });
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const changeMonth = (amount: number) => {
    const newMonth = addMonths(internalCurrentMonth, amount);
    const today = startOfMonth(new Date());
  
    // ❌ Block future months
    if (newMonth > today) return;
  
    setInternalCurrentMonth(newMonth);
    setExternalCurrentMonth(newMonth);
  
    // ✅ Always select a valid past date
    setSelectedDate(startOfMonth(newMonth));
  };
   

  const handleTodayClick = () => {
    const today = new Date();
    setInternalCurrentMonth(today);
    setExternalCurrentMonth(today);
    setSelectedDate(today);
  };

  const toggleExpandDay = (day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) newSet.delete(dayKey);
      else newSet.add(dayKey);
      return newSet;
    });
  };
  
  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    if (!user) return;
  
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayCommentId = `${dayStr}_${selectedUserId}`;
    const commentsForDay = dailyPlannerComments.find(c => c.id === dayCommentId);
  
    if (commentsForDay && commentsForDay.comments) {
      const updates: { [key: string]: any } = {};
      Object.entries(commentsForDay.comments).forEach(([key, comment]) => {
        if (comment && comment.userId !== user.id && !comment.viewedBy?.[user.id]) {
          const path = `dailyPlannerComments/${dayCommentId}/comments/${key}/viewedBy/${user.id}`;
          updates[path] = true;
        }
      });
      if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates);
      }
    }
  };

  return (
    <>
      <div id="planner-calendar-section" className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-8 flex-1">
        {/* MONTHLY VIEW */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-2xl font-bold">{format(internalCurrentMonth, 'MMMM yyyy')}</CardTitle>
                 <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTodayClick}>Today</Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 border-t border-l">
              {daysOfWeek.map(day => (
                <div key={day} className="p-2 text-center font-semibold text-sm border-b border-r text-muted-foreground">{day}</div>
              ))}

              {calendarGrid.map((day, index) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayEvents = expandedEvents.filter(event => isSameDay(event.eventDate, day));
                const isExpanded = expandedDays.has(dayKey);
                const visibleEvents = isExpanded ? dayEvents : dayEvents.slice(0, MAX_EVENTS_VISIBLE);

                return (
                  <div
                    key={index}
                    data-date={dayKey}
                    className={cn(
                      "relative min-h-[120px] p-1 border-b border-r flex flex-col transition-colors duration-200",
                      !isSameMonth(day, internalCurrentMonth) && "bg-muted/50 text-muted-foreground",
                      isToday(day) && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                  >
                    <button
                      onClick={() => handleDateSelect(day)}
                      className={cn(
                        "absolute top-1 right-1 h-6 w-6 rounded-full text-xs flex items-center justify-center",
                        selectedDate && isSameDay(day, selectedDate) && "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(day, 'd')}
                    </button>

                    <div className="space-y-1 mt-8 flex-1">
                      {visibleEvents.map(event => {
                        const creator = users.find(u => u.id === event.event.creatorId);
                        const isDelegated = event.event.creatorId !== event.event.userId;
                        const eventColor = isDelegated ? getColorForCreator(event.event.creatorId) : personalPlanningColor;

                        return (
                          <div
                            key={event.event.id}
                            onClick={() => {
                              handleDateSelect(day);
                              if (user && event?.event.id) {
                                update(ref(rtdb, `plannerEvents/${event.event.id}/viewedBy`), {
                                  [user.id]: true
                                });
                              }
                            }}
                            className={cn("p-1.5 rounded-sm text-xs cursor-pointer border-l-4", eventColor)}
                          >
                            <p className="font-semibold truncate">{event.event.title}</p>
                            <p className="text-muted-foreground truncate">
                              {isDelegated ? `Delegated by: ${creator?.name}` : 'My Planning'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {dayEvents.length > MAX_EVENTS_VISIBLE && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs mt-auto self-start"
                        onClick={() => toggleExpandDay(day)}
                      >
                        {isExpanded ? "Show less" : `+${dayEvents.length - MAX_EVENTS_VISIBLE} more`}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* DAILY NOTEPAD */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Daily Notepad</CardTitle>
            <CardDescription>
              {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {selectedDayEvents.length > 0 ? selectedDayEvents.map(event => {
                  const creator = users.find(u => u.id === event.event.creatorId);
                  const canModifyEvent = user?.id === event.event.creatorId || user?.role === 'Admin';
                  const eventDate = event.event.date ? parseISO(event.event.date) : null;
                  const isEventInPast = eventDate ? isPast(startOfDay(eventDate)) && !isToday(eventDate) : true;
                  const isDelegated = event.event.creatorId !== event.event.userId;
                  const eventComments = getCommentsForEvent(event.event.id);
                  const eventColor = isDelegated ? getColorForCreator(event.event.creatorId) : personalPlanningColor;

                  return (
                    <div key={event.event.id} className={cn("border rounded-lg p-3 space-y-2 border-l-4", eventColor)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{event.event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.event.description}</p>
                          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            {isDelegated ? `Delegated by:` : 'My Planning'}
                            {isDelegated && creator && (
                              <>
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={creator?.avatar} />
                                  <AvatarFallback>{creator?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {creator?.name}
                              </>
                            )}
                          </div>
                        </div>
                        {canModifyEvent && (!isEventInPast || user?.role === 'Admin') && (
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingEvent(event.event);
                                if (user && event?.event.id) {
                                  update(ref(rtdb, `plannerEvents/${event.event.id}/viewedBy`), {
                                    [user.id]: true
                                  });
                                }
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the event "{event.event.title}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteEvent(event.event)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value={event.event.id} className="border-none">
                          <AccordionTrigger className="p-0 text-xs text-blue-600 hover:no-underline">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> Comments ({eventComments.length})
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2">
                            <div className="space-y-2">
                              {eventComments.map(comment => {
                                const commentUser = users.find(u => u.id === comment.userId);
                                return (
                                  <div key={comment.id} className="flex items-start gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={commentUser?.avatar} />
                                      <AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-xs bg-muted p-2 rounded-md w-full">
                                      <div className="flex justify-between items-baseline">
                                        <p className="font-semibold">{commentUser?.name}</p>
                                        <p className="text-muted-foreground">
                                          {formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}
                                        </p>
                                      </div>
                                      <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              {eventComments.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-2">No comments for this event.</p>
                              )}
                              <div className="relative pt-2">
                                <Textarea
                                  value={newComments[event.event.id] || ''}
                                  onChange={(e) => setNewComments(prev => ({ ...prev, [event.event.id]: e.target.value }))}
                                  placeholder="Add a comment..."
                                  className="pr-10 text-xs"
                                  rows={1}
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => handleAddComment(event.event.id)}
                                  disabled={!newComments[event.event.id] || !newComments[event.event.id].trim()}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  );
                }) : (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-sm text-muted-foreground">No events scheduled for this day.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {editingEvent && (
        <EditEventDialog isOpen={!!editingEvent} setIsOpen={() => setEditingEvent(null)} event={editingEvent} />
      )}
    </>
  );
}
