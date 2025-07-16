

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, formatDistanceToNow, isPast, startOfDay } from 'date-fns';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Edit, Trash2, Send } from 'lucide-react';
import { Separator } from '../ui/separator';
import type { Comment, PlannerEvent } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditEventDialog from './EditEventDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlannerCalendarProps {
    selectedUserId: string;
}

export default function PlannerCalendar({ selectedUserId }: PlannerCalendarProps) {
    const { 
        user, users, getExpandedPlannerEvents, deletePlannerEvent,
        dailyPlannerComments, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment,
        markPlannerCommentsAsRead, unreadPlannerCommentDays 
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

    const eventDays = useMemo(() => expandedEvents.map(event => event.eventDate), [expandedEvents]);

    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        return expandedEvents.filter(event => isSameDay(event.eventDate, selectedDate as Date));
    }, [expandedEvents, selectedDate]);
    
    const selectedDayComments = useMemo(() => {
        if (!selectedDate) return [];
        const dayKey = format(selectedDate, 'yyyy-MM-dd');
        const entry = dailyPlannerComments.find(dpc => dpc.day === dayKey && dpc.plannerUserId === selectedUserId);
        return entry?.comments ? Object.values(entry.comments).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
    }, [dailyPlannerComments, selectedDate, selectedUserId]);

    const notificationDays = useMemo(() => unreadPlannerCommentDays.map(d => new Date(d)), [unreadPlannerCommentDays]);
    
    const viewingUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);
    const isMyOwnPlanner = user?.id === selectedUserId;

    const canModifyDailyComments = useMemo(() => {
        if (!user || !viewingUser) return false;
        return user.role === 'Admin' || user.role === 'Manager' || (user.role === 'Supervisor' && viewingUser.supervisorId === user.id) || isMyOwnPlanner;
    }, [user, viewingUser, isMyOwnPlanner]);

    const handleAddDailyComment = useCallback(() => {
        if (!dailyComment.trim() || !selectedDate) return;
        addDailyPlannerComment(selectedUserId, selectedDate, dailyComment);
        setDailyComment('');
    }, [dailyComment, selectedDate, selectedUserId, addDailyPlannerComment]);

    const handleSaveEditedComment = useCallback(() => {
        if (!editingComment || !selectedDate) return;
        updateDailyPlannerComment(editingComment.id, selectedUserId, format(selectedDate, 'yyyy-MM-dd'), editingComment.text);
        setEditingComment(null);
    }, [editingComment, selectedDate, selectedUserId, updateDailyPlannerComment]);
    
    const handleDeleteEvent = (event: PlannerEvent) => {
        deletePlannerEvent(event.id);
        toast({ variant: 'destructive', title: 'Event Deleted' });
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                <Card className="lg:col-span-2">
                    <CardContent className="p-0 sm:p-2">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            modifiers={{ event: eventDays, notification: notificationDays }}
                            modifiersStyles={{
                                event: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' },
                                notification: { color: 'hsl(var(--destructive-foreground))', backgroundColor: 'hsl(var(--destructive))' },
                            }}
                            className="w-full"
                        />
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
                                <div className="space-y-2">
                                    {selectedDayEvents.map((event) => {
                                        const creator = users.find(u => u.id === event.creatorId);
                                        const canModifyEvent = user?.id === event.creatorId || user?.role === 'Admin';
                                        const isEventInPast = isPast(startOfDay(new Date(event.date)));
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
                            )}
                            <Separator className="my-4"/>
                            <div className="space-y-3">
                                {selectedDayComments.map((comment) => {
                                    const commentUser = users.find(u => u.id === comment.userId);
                                    const canModify = user?.id === comment.userId || user?.role === 'Admin';
                                    const isEditing = editingComment?.id === comment.id;
                                    return (
                                        <div key={comment.id} className="flex items-start gap-2 group">
                                            <Avatar className="h-7 w-7"><AvatarImage src={commentUser?.avatar}/><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div className="bg-muted p-2 rounded-md w-full text-sm">
                                                <div className="flex justify-between items-baseline"><p className="font-semibold text-xs">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.date), { addSuffix: true })}</p></div>
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
                                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => selectedDate && deleteDailyPlannerComment(comment.id, selectedUserId, format(selectedDate, 'yyyy-MM-dd'))}>Delete</AlertDialogAction></AlertDialogFooter>
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
                                        <p className="text-sm text-muted-foreground">No events or notes.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        {canModifyDailyComments && (
                            <div className="relative w-full">
                                <Textarea value={dailyComment} onChange={(e) => setDailyComment(e.target.value)} placeholder="Add a comment for the day..." className="pr-12 text-sm"/>
                                <Button type="button" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handleAddDailyComment} disabled={!dailyComment.trim()}><Send className="h-4 w-4" /></Button>
                            </div>
                        )}
                    </CardFooter>
                </Card>
            </div>
            {editingEvent && <EditEventDialog isOpen={!!editingEvent} setIsOpen={() => setEditingEvent(null)} event={editingEvent} />}
        </>
    );
}
