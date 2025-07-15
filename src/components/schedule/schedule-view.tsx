'use client';
import { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, formatDistanceToNow, isPast, startOfDay, addDays, eachDayOfInterval } from 'date-fns';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Edit, Trash2, Send } from 'lucide-react';
import type { Comment, PlannerEvent } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface ScheduleViewProps {
    selectedUserId: string;
}

export default function ScheduleView({ selectedUserId }: ScheduleViewProps) {
    const { 
        user, users, getExpandedPlannerEvents, deletePlannerEvent,
        dailyPlannerComments, addDailyPlannerComment,
    } = useAppContext();
    const { toast } = useToast();
    const [dailyComment, setDailyComment] = useState('');
    const [commentDay, setCommentDay] = useState<Date | null>(null);

    const today = startOfDay(new Date());
    const thirtyDaysFromNow = addDays(today, 30);
    const dateRange = eachDayOfInterval({ start: today, end: thirtyDaysFromNow });

    const expandedEvents = useMemo(() => {
        const eventsByDate: Record<string, PlannerEvent[]> = {};
        dateRange.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = getExpandedPlannerEvents(day, selectedUserId);
            eventsByDate[dayKey] = dayEvents;
        });
        return eventsByDate;
    }, [dateRange, getExpandedPlannerEvents, selectedUserId]);

    const handleAddDailyComment = useCallback((day: Date) => {
        if (!dailyComment.trim() || !day) return;
        addDailyPlannerComment(selectedUserId, day, dailyComment);
        setDailyComment('');
        setCommentDay(null);
    }, [dailyComment, selectedUserId, addDailyPlannerComment]);
    
    const handleDeleteEvent = (event: PlannerEvent) => {
        deletePlannerEvent(event.id);
        toast({ variant: 'destructive', title: 'Event Deleted' });
    };

    return (
        <ScrollArea className="flex-1 -m-4 p-4">
          <div className="space-y-4">
            {dateRange.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = expandedEvents[dayKey] || [];
              const dayComments = dailyPlannerComments.find(dpc => dpc.day === dayKey && dpc.plannerUserId === selectedUserId)?.comments || [];

              return (
                <Card key={dayKey}>
                  <CardHeader>
                    <CardTitle>{format(day, 'EEEE, LLL d')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dayEvents.length === 0 && dayComments.length === 0 && (
                        <p className="text-sm text-muted-foreground">No events or notes for this day.</p>
                    )}
                    {dayEvents.map(event => {
                        const creator = users.find(u => u.id === event.creatorId);
                        const canModifyEvent = user?.id === event.creatorId || user?.role === 'Admin';
                        return (
                            <div key={event.id} className="p-3 border rounded-md bg-muted/50">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold">{event.title}</p>
                                    {canModifyEvent && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Delete Event?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the event "{event.title}"?</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEvent(event)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">Created by <Avatar className="h-4 w-4"><AvatarImage src={creator?.avatar}/><AvatarFallback>{creator?.name.charAt(0)}</AvatarFallback></Avatar> {creator?.name}</div>
                            </div>
                        )
                    })}
                     {dayComments.map(comment => {
                        const commentUser = users.find(u => u.id === comment.userId);
                        return (
                             <div key={comment.id} className="flex items-start gap-2 group">
                                <Avatar className="h-7 w-7"><AvatarImage src={commentUser?.avatar}/><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                <div className="bg-background p-2 rounded-md w-full text-sm border">
                                    <div className="flex justify-between items-baseline"><p className="font-semibold text-xs">{commentUser?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.date), { addSuffix: true })}</p></div>
                                    <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{comment.text}</p>
                                </div>
                            </div>
                        )
                    })}
                  </CardContent>
                  <CardFooter>
                     <div className="relative w-full">
                        <Textarea 
                            onFocus={() => setCommentDay(day)}
                            onChange={(e) => setDailyComment(e.target.value)} 
                            placeholder="Add a daily note..." 
                            className="pr-12 text-sm"
                            rows={1}
                        />
                        {isSameDay(day, commentDay || new Date()) && (
                            <Button type="button" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => handleAddDailyComment(day)} disabled={!dailyComment.trim()}><Send className="h-4 w-4" /></Button>
                        )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
    );
}