
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { eachDayOfInterval, endOfMonth, startOfMonth, format, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, isValid, parseISO, isToday, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Edit, Trash2, Send, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Separator } from '../ui/separator';
import type { Comment, PlannerEvent, User, DailyPlannerComment } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditEventDialog from './EditEventDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PlannerCalendarProps {
    selectedUserId: string;
}

const MAX_EVENTS_VISIBLE = 2;

export default function PlannerCalendar({ selectedUserId }: PlannerCalendarProps) {
    const {
        user, users, getExpandedPlannerEvents, deletePlannerEvent,
        addPlannerEventComment,
        dailyPlannerComments,
        markPlannerCommentsAsRead,
        can
    } = useAppContext();
    const { toast } = useToast();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
    const [newComments, setNewComments] = useState<Record<string, string>>({});
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

    const expandedEvents = useMemo(
        () => getExpandedPlannerEvents(currentMonth, selectedUserId),
        [getExpandedPlannerEvents, currentMonth, selectedUserId]
    );
    
    const viewingUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

    const calendarGrid = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);
    
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
        const allComments = Array.isArray(dayCommentsData.comments) ? dayCommentsData.comments : Object.values(dayCommentsData.comments);
        return allComments.filter(c => c.eventId === eventId);
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
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
    };

    const toggleExpandDay = (day: Date) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dayKey)) {
                newSet.delete(dayKey);
            } else {
                newSet.add(dayKey);
            }
            return newSet;
        });
    };
    
    useEffect(() => {
      if(selectedDate && dayCommentsData) {
        markPlannerCommentsAsRead(selectedUserId, selectedDate);
      }
    }, [selectedDate, selectedUserId, dayCommentsData, markPlannerCommentsAsRead]);

    return (
        <>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-8 flex-1">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-2xl font-bold">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                        <div className="flex gap-2">
                           <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                           <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                           <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
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
                                    <div key={index} className={cn("relative min-h-[120px] p-1 border-b border-r flex flex-col", !isSameMonth(day, currentMonth) && "bg-muted/50 text-muted-foreground", isToday(day) && "bg-blue-50 dark:bg-blue-900/20")}>
                                        <button onClick={() => setSelectedDate(day)} className={cn("absolute top-1 right-1 h-6 w-6 rounded-full text-xs flex items-center justify-center", isSameDay(day, selectedDate || new Date()) && "bg-primary text-primary-foreground")}>
                                            {format(day, 'd')}
                                        </button>
                                        <div className="space-y-1 mt-8 flex-1">
                                            {visibleEvents.map(event => {
                                                const creator = users.find(u => u.id === event.creatorId);
                                                const isDelegated = event.creatorId !== event.userId;
                                                return (
                                                <div key={event.id} onClick={() => { setSelectedDate(day); }} className="p-1 rounded-sm text-xs cursor-pointer bg-accent/50 hover:bg-accent">
                                                    <p className="font-semibold truncate">{event.title}</p>
                                                    <p className="text-muted-foreground truncate">{isDelegated ? `Delegated by: ${creator?.name}` : 'My Planning'}</p>
                                                </div>
                                            )})}
                                        </div>
                                        {dayEvents.length > MAX_EVENTS_VISIBLE && (
                                            <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-auto self-start" onClick={() => toggleExpandDay(day)}>
                                                {isExpanded ? "Show less" : `+${dayEvents.length - MAX_EVENTS_VISIBLE} more`}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Daily Notepad</CardTitle>
                        <CardDescription>{selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {selectedDayEvents.length > 0 ? selectedDayEvents.map((event) => {
                                    const creator = users.find(u => u.id === event.creatorId);
                                    const canModifyEvent = user?.id === event.creatorId || user?.role === 'Admin';
                                    const eventDate = event.date ? parseISO(event.date) : null;
                                    const isEventInPast = eventDate ? isPast(eventDate) : true;
                                    const isDelegated = event.creatorId !== event.userId;
                                    const eventComments = getCommentsForEvent(event.id);
                                    
                                    return (
                                        <div key={event.id} className="border rounded-lg p-3 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{event.title}</p>
                                                    <p className="text-xs text-muted-foreground">{event.description}</p>
                                                     <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                        {isDelegated ? `Delegated by: ` : 'My Planning'}
                                                        {isDelegated && creator && (
                                                            <><Avatar className="h-4 w-4"><AvatarImage src={creator?.avatar}/><AvatarFallback>{creator?.name.charAt(0)}</AvatarFallback></Avatar> {creator?.name}</>
                                                        )}
                                                    </div>
                                                </div>
                                                {canModifyEvent && (!isEventInPast || user?.role === 'Admin') && (
                                                    <div className="flex">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingEvent(event)}><Edit className="h-4 w-4"/></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Delete Event?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the event "{event.title}"?</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEvent(event)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </div>
                                            <Accordion type="single" collapsible className="w-full">
                                                <AccordionItem value={event.id} className="border-none">
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
                                                                        <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                                        <div className="text-xs bg-muted p-2 rounded-md w-full">
                                                                            <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}</p></div>
                                                                            <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            {eventComments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No comments for this event.</p>}
                                                            <div className="relative pt-2">
                                                                <Textarea value={newComments[event.id] || ''} onChange={(e) => setNewComments(prev => ({ ...prev, [event.id]: e.target.value }))} placeholder="Add a comment..." className="pr-10 text-xs" rows={1} />
                                                                <Button type="button" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => handleAddComment(event.id)} disabled={!newComments[event.id] || !newComments[event.id].trim()}><Send className="h-4 w-4" /></Button>
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
            {editingEvent && <EditEventDialog isOpen={!!editingEvent} setIsOpen={() => setEditingEvent(null)} event={editingEvent} />}
        </>
    );
}
