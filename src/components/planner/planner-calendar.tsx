'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  isSameMonth, startOfWeek, endOfWeek, startOfDay, addMonths, subMonths, getDay
} from 'date-fns';
import { ref, update } from "firebase/database";
import { rtdb } from "@/lib/rtdb";
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Edit, Trash2, Send, ChevronLeft, ChevronRight, MessageSquare, PlusCircle, Download, FileSpreadsheet, Calendar as CalendarIcon, Clock, Lock, Unlock } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { PlannerEvent, Comment, User, Role } from '@/lib/types';
import EditEventDialog from './EditEventDialog';
import EventInstanceDialog from './EventInstanceDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface PlannerCalendarProps {
  selectedUserId: string;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

const eventColors = [
    'bg-blue-100 border-blue-300 text-blue-900',
    'bg-green-100 border-green-300 text-green-900',
    'bg-yellow-100 border-yellow-300 text-yellow-900',
    'bg-purple-100 border-purple-300 text-purple-900',
    'bg-pink-100 border-pink-300 text-pink-900',
    'bg-indigo-100 border-indigo-300 text-indigo-900',
    'bg-teal-100 border-teal-300 text-teal-900',
];

const personalPlanningColor = 'bg-slate-100 border-slate-300 text-slate-900';

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
  currentMonth,
  setCurrentMonth
}: PlannerCalendarProps) {
  const { user, users } = useAuth();
  const {
      getExpandedPlannerEvents, deletePlannerEvent,
      addPlannerEventComment, dailyPlannerComments,
      deletePlannerDailyNote, lockDailyPlanning, unlockDailyPlanning
  } = usePlanner();

  const { toast } = useToast();
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
  const [viewingInstance, setViewingInstance] = useState<{ event: PlannerEvent, date: Date } | null>(null);
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const expandedEvents = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return getExpandedPlannerEvents(monthStart, monthEnd, selectedUserId);
  }, [getExpandedPlannerEvents, currentMonth, selectedUserId]);

  const viewingUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

  const handleAddComment = (day: Date, eventId: string) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const commentText = newComments[`${dayStr}-${eventId}`];
    if (!commentText || !commentText.trim()) return;
    addPlannerEventComment(selectedUserId, dayStr, eventId, commentText);
    setNewComments(prev => ({ ...prev, [`${dayStr}-${eventId}`]: '' }));
    toast({ title: "Comment Added" });
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(format(currentMonth, 'MMM yyyy'));

    sheet.columns = [
      { header: 'DATE', key: 'date', width: 15 },
      { header: 'DAY', key: 'day', width: 12 },
      { header: 'PLANNED EVENTS', key: 'events', width: 40 },
      { header: 'NOTES / NOTEPAD', key: 'notes', width: 50 },
    ];

    daysInMonth.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEvents = expandedEvents.filter(e => isSameDay(e.eventDate, day));
      const dayCommentsData = dailyPlannerComments.find(c => c.id === `${dayStr}_${selectedUserId}`);
      const comments = dayCommentsData?.comments ? Object.values(dayCommentsData.comments) : [];

      const eventsText = dayEvents.map(e => `[${e.event.title}]`).join(', ');
      const notesText = comments.map(c => `${users.find(u => u.id === c.userId)?.name}: ${c.text}`).join('\n');

      const row = sheet.addRow({
        date: format(day, 'dd-MMM-yyyy'),
        day: format(day, 'EEEE'),
        events: eventsText,
        notes: notesText,
      });

      const isWeekendDay = getDay(day) === 0;
      if (isWeekendDay) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        });
      }

      row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.font = { name: 'Calibri', size: 11 };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Planner_${viewingUser?.name}_${format(currentMonth, 'yyyy_MM')}.xlsx`);
  };

  const canUnlock = (plannerUserId: string) => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'Project Coordinator') return true;
    
    // Check if the current user is the supervisor of the planner's owner
    const owner = users.find(u => u.id === plannerUserId);
    return owner?.supervisorId === user.id;
  };

  return (
    <Card className="flex-1 flex flex-col overflow-hidden border-2 shadow-sm">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-background border rounded-md p-1 shadow-sm">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-4 font-black text-lg uppercase tracking-tight min-w-[150px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="font-bold">Today</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportExcel} className="font-bold border-2">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export to Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <TooltipProvider>
          <div className="h-full flex flex-col">
            <div className="overflow-x-auto flex-1 relative">
              <Table className="border-collapse">
                <TableHeader className="sticky top-0 z-20 bg-muted/90 backdrop-blur-sm shadow-sm">
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="w-40 border-r border-black font-black text-black text-center uppercase tracking-wider text-[11px]">Date</TableHead>
                    <TableHead className="w-32 border-r border-black font-black text-black text-center uppercase tracking-wider text-[11px]">Day</TableHead>
                    <TableHead className="min-w-[300px] border-r border-black font-black text-black uppercase tracking-wider text-[11px] px-4">Planned Events & Activities</TableHead>
                    <TableHead className="border-black font-black text-black uppercase tracking-wider text-[11px] px-4">Daily Notepad / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daysInMonth.map((day) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const dayEvents = expandedEvents.filter(e => isSameDay(e.eventDate, day));
                    const dayCommentId = `${dayStr}_${selectedUserId}`;
                    const dayCommentsData = dailyPlannerComments.find(c => c.id === dayCommentId);
                    const isSunday = getDay(day) === 0;
                    const isCurrentDay = isToday(day);
                    const isLocked = !!dayCommentsData?.isLocked;

                    return (
                      <TableRow 
                        key={dayStr} 
                        className={cn(
                          "border-b border-slate-300 hover:bg-blue-50/30 transition-colors group h-16",
                          isSunday && "bg-yellow-50/50 dark:bg-yellow-900/10",
                          isCurrentDay && "bg-blue-50/60 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-500/20"
                        )}
                      >
                        <TableCell className={cn("text-center border-r border-slate-300 p-0")}>
                           <div className={cn(
                             "w-full h-full flex flex-col items-center justify-center font-black text-sm",
                             isCurrentDay ? "text-blue-700" : "text-black"
                           )}>
                             {format(day, 'dd-MMM-yyyy')}
                           </div>
                        </TableCell>
                        <TableCell className="text-center border-r border-slate-300">
                          <span className={cn(
                            "font-black uppercase text-[10px] tracking-widest",
                            isSunday ? "text-red-600" : "text-slate-600"
                          )}>
                            {format(day, 'EEEE')}
                          </span>
                        </TableCell>
                        <TableCell className="border-r border-slate-300 p-2 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            {dayEvents.map(eventInstance => {
                                const isDelegated = eventInstance.event.creatorId !== eventInstance.event.userId;
                                const eventColor = isDelegated ? getColorForCreator(eventInstance.event.creatorId) : personalPlanningColor;
                                const creator = users.find(u => u.id === eventInstance.event.creatorId);
                                
                                const eventComments = Object.values(dayCommentsData?.comments || {}).filter(c => c.eventId === eventInstance.event.id);
                                const commentCount = eventComments.length;

                                return (
                                  <div key={eventInstance.event.id} className="relative">
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "h-auto py-1 px-2 flex flex-col items-start border-2 cursor-pointer hover:shadow-sm transition-all",
                                        eventColor
                                      )}
                                      onClick={() => setViewingInstance({ event: eventInstance.event, date: day })}
                                    >
                                      <div className="flex items-center gap-1 w-full justify-between">
                                        <span className="font-black text-[11px] uppercase leading-none">{eventInstance.event.title}</span>
                                        {commentCount > 0 && (
                                            <div className="flex items-center gap-0.5 ml-2 text-[9px] opacity-70">
                                                <MessageSquare className="h-2.5 w-2.5" />
                                                {commentCount}
                                            </div>
                                        )}
                                      </div>
                                      {isDelegated && (
                                        <span className="text-[9px] font-bold opacity-70 mt-0.5">By: {creator?.name.split(' ')[0]}</span>
                                      )}
                                    </Badge>
                                  </div>
                                );
                            })}
                            {!isLocked && (
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-dashed"
                                    onClick={() => {
                                        toast({ title: "Quick Add", description: `Please use the "Add Planning" button at the top for ${format(day, 'PP')}.` });
                                    }}
                                    >
                                    <PlusCircle className="h-3 w-3 text-primary" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Add Event for {format(day, 'dd MMM')}</p></TooltipContent>
                                </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-2 align-top">
                          <div className="space-y-2">
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Notes {isLocked && "(Locked)"}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {!isLocked && user?.id === selectedUserId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[9px] font-black uppercase tracking-widest"
                                            onClick={() => lockDailyPlanning(selectedUserId, dayStr)}
                                        >
                                            <Lock className="mr-1 h-3 w-3" /> Lock
                                        </Button>
                                    )}
                                    {isLocked && canUnlock(selectedUserId) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700"
                                            onClick={() => unlockDailyPlanning(selectedUserId, dayStr)}
                                        >
                                            <Unlock className="mr-1 h-3 w-3" /> Unlock
                                        </Button>
                                    )}
                                </div>
                             </div>

                             {dayCommentsData?.comments && Object.values(dayCommentsData.comments).filter(c => c.eventId === 'daily').map((comment) => {
                               const author = users.find(u => u.id === comment.userId);
                               const isAuthor = user?.id === comment.userId;
                               return (
                                 <div key={comment.id} className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 group/note">
                                    <Avatar className="h-6 w-6 border">
                                      <AvatarImage src={author?.avatar} />
                                      <AvatarFallback className="text-[10px]">{author?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-baseline mb-0.5">
                                        <span className="text-[10px] font-black uppercase text-slate-500 truncate">{author?.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-400">{formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}</span>
                                            {!isLocked && isAuthor && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 text-destructive opacity-0 group-hover/note:opacity-100 transition-opacity"
                                                    onClick={() => deletePlannerDailyNote(selectedUserId, dayStr, comment.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                      </div>
                                      <p className="text-[11px] font-bold text-black dark:text-white leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                                    </div>
                                 </div>
                               );
                             })}
                             
                             {!isLocked && (
                                <div className="relative mt-2 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
                                    <Textarea 
                                    placeholder="Type daily note..." 
                                    className="min-h-[40px] h-10 py-2 pr-10 text-[11px] font-bold bg-white/80 focus:bg-white resize-none border-2"
                                    value={newComments[`${dayStr}-daily`] || ''}
                                    onChange={(e) => setNewComments(prev => ({ ...prev, [`${dayStr}-daily`]: e.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddComment(day, 'daily');
                                        }
                                    }}
                                    />
                                    <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute right-1 top-1 h-8 w-8 text-blue-600 hover:text-blue-700"
                                    onClick={() => handleAddComment(day, 'daily')}
                                    disabled={!newComments[`${dayStr}-daily`]?.trim()}
                                    >
                                    <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                             )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="shrink-0 border-t bg-[#f8fafc] p-2 px-6 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
               <div className="flex gap-6">
                 <span className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-sm"></div> Delegated Tasks</span>
                 <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded-sm"></div> Personal Planning</span>
                 <span className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-50 border border-yellow-300 rounded-sm"></div> Non-Working / Holiday</span>
               </div>
               <div>
                  WORKSPACE: {viewingUser?.name.toUpperCase()} &middot; {format(currentMonth, 'MMMM yyyy')}
               </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>

      {editingEvent && (
        <EditEventDialog 
          isOpen={!!editingEvent} 
          setIsOpen={() => setEditingEvent(null)} 
          event={editingEvent} 
        />
      )}

      {viewingInstance && (
          <EventInstanceDialog
            isOpen={!!viewingInstance}
            setIsOpen={() => setViewingInstance(null)}
            event={viewingInstance.event}
            date={viewingInstance.date}
            plannerUserId={selectedUserId}
            onEdit={setEditingEvent}
          />
      )}
    </Card>
  );
}
