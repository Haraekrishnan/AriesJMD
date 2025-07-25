
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { eachDayOfInterval, endOfMonth, startOfMonth, format, isSameDay, getDay, isSunday, isSaturday, startOfWeek, endOfWeek, isSameMonth, isToday, isPast } from 'date-fns';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Edit, Trash2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Separator } from '../ui/separator';
import type { Comment, PlannerEvent, User } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditEventDialog from './EditEventDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface PlannerCalendarProps {
    selectedUserId: string;
}

export default function PlannerCalendar({ selectedUserId }: PlannerCalendarProps) {
    const {
        user, users, getExpandedPlannerEvents, deletePlannerEvent,
        dailyPlannerComments, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment,
        markPlannerCommentsAsRead, can
    } = useAppContext();
    const { toast } = useToast();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
    const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
    const [dailyComment, setDailyComment] = useState('');

    useEffect(() => {
        if (selectedDate && user) {
            markPlannerCommentsAsRead(selectedUserId, selectedDate);
        }
    }, [selectedDate, selectedUserId, user, markPlannerCommentsAsRead]);

    useEffect(() => {
        setEditingComment(null);
        setDailyComment('');
    }, [selectedDate, selectedUserId]);

    const expandedEvents = useMemo(
        () => getExpandedPlannerEvents(currentMonth, selectedUserId),
        [getExpandedPlannerEvents, currentMonth, selectedUserId]
    );
    
    const viewingUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);
    const isMyOwnPlanner = user?.id === selectedUserId;

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
    
    const selectedDayComments = useMemo(() => {
        if (!selectedDate) return [];
        const dayKey = `${format(selectedDate, 'yyyy-MM-dd')}_${selectedUserId}`;
        const entry = dailyPlannerComments.find(dpc => dpc.id === dayKey);
        return entry?.comments ? Object.values(entry.comments).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
    }, [dailyPlannerComments, selectedDate, selectedUserId]);
    
     const getSubordinateChain = useCallback((userId: string, allUsers: User[]): Set<string> => {
        const subordinates = new Set<string>();
        const queue = [userId];
        while(queue.length > 0) {
            const currentId = queue.shift()!;
            const directReports = allUsers.filter(u => u.supervisorId === currentId);
            directReports.forEach(report => {
                if (!subordinates.has(report.id)) {
                    subordinates.add(report.id);
                    queue.push(report.id);
                }
            });
        }
        return subordinates;
    }, []);

    const canModifyDailyComments = useMemo(() => {
        if (!user || !viewingUser) return false;
        if (isMyOwnPlanner) return true;
        if (user.role === 'Admin' || user.role === 'Project Coordinator') return true;

        if (user.role === 'Supervisor') {
            const subordinateIds = getSubordinateChain(user.id, users);
            return subordinateIds.has(viewingUser.id);
        }

        return false;
    }, [user, viewingUser, isMyOwnPlanner, users, getSubordinateChain]);

    const handleAddDailyComment = useCallback(() => {
        if (!dailyComment.trim() || !selectedDate) return;
        addDailyPlannerComment(selectedUserId, selectedDate, dailyComment);
        setDailyComment('');
    }, [dailyComment, selectedDate, selectedUserId, addDailyPlannerComment]);

    const handleSaveEditedComment = useCallback(() => {
        if (!editingComment || !selectedDate) return;
        const dayKey = `${format(selectedDate, 'yyyy-MM-dd')}_${selectedUserId}`;
        updateDailyPlannerComment(editingComment.id, dayKey, editingComment.text);
        setEditingComment(null);
    }, [editingComment, selectedDate, selectedUserId, updateDailyPlannerComment]);
    
    const handleDeleteEvent = (event: PlannerEvent) => {
        deletePlannerEvent(event.id);
        toast({ variant: 'destructive', title: 'Event Deleted' });
    };

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const changeMonth = (amount: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
    };

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
                                const dayEvents = expandedEvents.filter(event => isSameDay(event.eventDate, day));
                                return (
                                    <div key={index} className={cn("relative min-h-[120px] p-1 border-b border-r", !isSameMonth(day, currentMonth) && "bg-muted/50 text-muted-foreground", isToday(day) && "bg-blue-50 dark:bg-blue-900/20")}>
                                        <button onClick={() => setSelectedDate(day)} className={cn("absolute top-1 right-1 h-6 w-6 rounded-full text-xs flex items-center justify-center", isSameDay(day, selectedDate || new Date()) && "bg-primary text-primary-foreground")}>
                                            {format(day, 'd')}
                                        </button>
                                        <div className="space-y-1 mt-8">
                                            {dayEvents.map(event => {
                                                const creator = users.find(u => u.id === event.creatorId);
                                                return (
                                                <div key={event.id} onClick={() => { setSelectedDate(day); setEditingEvent(event);}} className="p-1 rounded-sm text-xs cursor-pointer bg-accent/50 hover:bg-accent">
                                                    <p className="font-semibold truncate">{event.title}</p>
                                                    <p className="text-muted-foreground truncate">{creator?.name}</p>
                                                </div>
                                            )})}
                                        </div>
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
                            {selectedDayEvents.length > 0 && (
                                <>
                                <div className="space-y-2">
                                    {selectedDayEvents.map((event) => {
                                        const creator = users.find(u => u.id === event.creatorId);
                                        const canModifyEvent = user?.id === event.creatorId || can.manage_planner;
                                        const isEventInPast = isPast(new Date(event.date));
                                        return (
                                            <div key={event.id} className="p-3 border rounded-md bg-muted/50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold">{event.title}</p>
                                                        <p className="text-xs text-muted-foreground">{event.description}</p>
                                                    </div>
                                                    {canModifyEvent && !isEventInPast && (
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
                                                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">Created by <Avatar className="h-4 w-4"><AvatarImage src={creator?.avatar}/><AvatarFallback>{creator?.name.charAt(0)}</AvatarFallback></Avatar> {creator?.name}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <Separator className="my-4"/>
                                </>
                            )}
                            <div className="space-y-3">
                                {selectedDayComments.map((comment) => {
                                    const commentUser = users.find(u => u.id === comment.userId);
                                    const canModify = user?.id === comment.userId || user?.role === 'Admin';
                                    const isEditing = editingComment?.id === comment.id;
                                    return (
                                        <div key={comment.id} className="flex items-start gap-2 group">
                                            <Avatar className="h-7 w-7"><AvatarImage src={commentUser?.avatar}/><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div className="bg-muted p-2 rounded-md w-full text-sm">
                                                <div className="flex justify-between items-baseline"><p className="font-semibold text-xs">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{format(new Date(comment.date), 'p')}</p></div>
                                                {isEditing ? (
                                                    <div className='mt-2 space-y-2'>
                                                        <Textarea value={editingComment.text} onChange={(e) => setEditingComment({...editingComment, text: e.target.value})} className="bg-background"/>
                                                        <div className='flex gap-2'><Button size="sm" onClick={handleSaveEditedComment}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}>Cancel</Button></div>
                                                    </div>
                                                ) : (
                                                    <div className='flex justify-between items-start'>
                                                        <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                                                        {canModify && <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingComment(comment)}><Edit className="h-3 w-3"/></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3"/></Button></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Delete comment?</AlertDialogTitle><AlertDialogDescription>This action is permanent.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => selectedDate && deleteDailyPlannerComment(comment.id, `${format(selectedDate, 'yyyy-MM-dd')}_${selectedUserId}`)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {selectedDayEvents.length === 0 && selectedDayComments.length === 0 && (
                                    <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                                        <p className="text-sm text-muted-foreground">No events or notes for this day.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    {canModifyDailyComments && (
                        <CardFooter>
                            <div className="relative w-full">
                                <Textarea value={dailyComment} onChange={(e) => setDailyComment(e.target.value)} placeholder="Add a comment for the day..." className="pr-12 text-sm"/>
                                <Button type="button" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handleAddDailyComment} disabled={!dailyComment.trim()}><Send className="h-4 w-4" /></Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
            {editingEvent && <EditEventDialog isOpen={!!editingEvent} setIsOpen={() => setEditingEvent(null)} event={editingEvent} />}
        </>
    );
}
