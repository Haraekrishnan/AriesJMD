'use client';

import * as React from "react";
import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { 
  Bell,
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  MessageSquare,
  Paperclip,
  X,
} from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DatePickerInput } from "../ui/date-picker-input";

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  assigneeIds: z.array(z.string()).min(1, 'Please select at least one assignee'),
  dueDate: z.date({ required_error: 'Due date is required' }),
  priority: z.enum(['Low', 'Medium', 'High']),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  task: Task;
}

export default function EditTaskDialog({ isOpen, setIsOpen, task }: EditTaskDialogProps) {
  const { user, users } = useAuth();
  const { 
    tasks, updateTask, deleteTask,
    requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, 
    addComment, markTaskAsViewed 
  } = useTask();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');

  const taskToDisplay = useMemo(() => tasks.find(t => t.id === task.id) || task, [tasks, task]);

  const creator = useMemo(() => users.find(u => u.id === taskToDisplay.creatorId), [users, taskToDisplay.creatorId]);
  const assignees = useMemo(() => users.filter(u => taskToDisplay.assigneeIds?.includes(u.id)), [users, taskToDisplay.assigneeIds]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  const isAdmin = user?.role === 'Admin';
  const isCreator = user?.id === taskToDisplay.creatorId;
  const isApprover = isCreator || isAdmin;
  const isCompleted = taskToDisplay.status === 'Done' || taskToDisplay.status === 'Completed';

  const canEditMetadata = isAdmin || isCreator;

  useEffect(() => {
    if (taskToDisplay && isOpen) {
      form.reset({
        title: (taskToDisplay.title || ''),
        description: (taskToDisplay.description || ''),
        assigneeIds: taskToDisplay.assigneeIds || [],
        dueDate: taskToDisplay.dueDate ? new Date(taskToDisplay.dueDate) : new Date(),
        priority: taskToDisplay.priority || 'Medium',
        link: taskToDisplay.link || '',
      });
      setNewComment('');
      markTaskAsViewed(taskToDisplay.id);
    }
  }, [taskToDisplay, form, isOpen, markTaskAsViewed]);

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    addComment(taskToDisplay.id, newComment);
    setNewComment('');
  };
  
  const handleRequestStatusChange = async (newStatus: TaskStatus) => {
    if (!user) return;
    try {
      let commentText = newComment.trim();
      if (!commentText) {
          if (newStatus === 'In Progress') commentText = 'Task started.';
          else if (newStatus === 'Done') commentText = 'Task completed.';
      }
      await requestTaskStatusChange(taskToDisplay.id, newStatus, commentText);
      setNewComment('');
      toast({ title: 'Task Updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update failed' });
    }
  };
  
  const handleApprovalAction = (action: 'approve' | 'return') => {
    if (!newComment.trim()) {
        toast({ variant: 'destructive', title: 'Comment required for feedback.' });
        return;
    }
    if (action === 'approve') {
        approveTaskStatusChange(taskToDisplay.id, newComment);
        toast({ title: 'Task Approved' });
    } else {
        returnTaskStatusChange(taskToDisplay.id, newComment);
        toast({ title: 'Task Returned' });
    }
    setNewComment('');
    setIsOpen(false);
  };

  const onSubmit = (data: TaskFormValues) => {
    updateTask({ ...taskToDisplay, ...data, dueDate: data.dueDate.toISOString() });
    toast({ title: 'Task Updated' });
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
    setIsOpen(false);
  };

  const isAssignee = useMemo(() => user?.id && taskToDisplay.assigneeIds?.includes(user.id), [user, taskToDisplay]);
  const mySubtask = useMemo(() => user && taskToDisplay.subtasks?.[user.id], [user, taskToDisplay]);
  
  const commentsArray = useMemo(() => {
    const list = Array.isArray(taskToDisplay.comments) 
      ? taskToDisplay.comments 
      : Object.values(taskToDisplay.comments || {});
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [taskToDisplay.comments]);

  const shortId = useMemo(() => (taskToDisplay.id || '').slice(-6).toUpperCase(), [taskToDisplay.id]);

  const statusVariantMap: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'> = {
    'To Do': 'secondary',
    'In Progress': 'warning',
    'In Review': 'default',
    'Done': 'success',
    'Completed': 'success',
    'Pending Approval': 'warning',
    'Overdue': 'destructive'
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[95vw] md:max-w-6xl w-full h-auto max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
        
        {/* --- HEADER (Left Aligned for Professional Look) --- */}
        <DialogHeader className="p-8 pb-4 bg-white border-b relative shrink-0 flex flex-col items-start">
          <div className="flex items-center justify-start gap-3 mb-2">
              <div className="bg-[#E9F0FE] text-[#1E40AF] px-2 py-0.5 rounded font-mono font-bold text-[10px] border border-[#BFDBFE]">
                  ID: {shortId}
              </div>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  TASK DETAILS: {taskToDisplay.title}
              </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            ASSIGNED BY <span className="text-slate-600">{creator?.name?.toUpperCase()}</span> TO <span className="text-slate-600">{assignees.map(a => a.name?.toUpperCase()).join(', ')}</span>
          </DialogDescription>
          <div className="mt-4">
              <Badge className="h-8 px-6 rounded-md font-black text-[11px] uppercase tracking-[0.15em] shadow-sm pointer-events-none bg-[#2563EB] hover:bg-[#2563EB]">
                {taskToDisplay.status}
              </Badge>
          </div>
        </DialogHeader>

        {/* --- BODY (Two Column Grid) --- */}
        <div className="flex-1 overflow-y-auto visible-scrollbar">
            <div className="p-8">
                {/* Status-specific Alerts or Top-Level Actions */}
                {taskToDisplay.status === 'Pending Approval' && isApprover && (
                    <div className="grid grid-cols-2 gap-4 mb-8 animate-in fade-in slide-in-from-top-2">
                        <Button className="bg-[#10B981] hover:bg-[#059669] text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-lg" onClick={() => handleApprovalAction('approve')}>
                            <ThumbsUp className="mr-2 h-4 w-4" /> Final Approve
                        </Button>
                        <Button className="bg-[#EF4444] hover:bg-[#DC2626] text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-lg" onClick={() => handleApprovalAction('return')}>
                            <ThumbsDown className="mr-2 h-4 w-4" /> Return Back
                        </Button>
                    </div>
                )}

                {isAssignee && !isCompleted && taskToDisplay.status !== 'Pending Approval' && (
                    <Button className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] h-14 rounded-xl text-xs mb-8 shadow-lg transition-all active:scale-95" onClick={() => handleRequestStatusChange(mySubtask?.status === 'To Do' ? 'In Progress' : 'Done')}>
                        {mySubtask?.status === 'To Do' ? 'START WORK STREAM' : 'SUBMIT FOR FINAL APPROVAL'}
                    </Button>
                )}

                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* LEFT COLUMN: Metadata Form */}
                    <div className="w-full md:w-1/2 space-y-6">
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Task Title</Label>
                                <div className="p-3 border-2 border-slate-100 rounded-lg bg-slate-50 font-bold text-slate-800 text-sm uppercase">
                                    {taskToDisplay.title}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</Label>
                                <div className="p-4 border-2 border-slate-100 rounded-xl bg-white font-medium text-slate-600 text-sm leading-relaxed min-h-[120px]">
                                    {taskToDisplay.description}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Resource Attachments</Label>
                                <div className="flex items-center gap-2">
                                    <Input {...form.register('link')} disabled={!canEditMetadata} placeholder="Add external link..." className="h-10 bg-slate-50 border-slate-200 text-xs italic" />
                                    {taskToDisplay.link && (
                                        <Button asChild size="icon" variant="outline" className="shrink-0 h-10 w-10 border-2">
                                            <a href={taskToDisplay.link} target="_blank" rel="noopener noreferrer"><Paperclip className="h-4 w-4"/></a>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assignee Status Tracker</Label>
                                <div className="space-y-2">
                                    {assignees.map(a => {
                                        const sub = taskToDisplay.subtasks?.[a.id];
                                        const status = sub?.status || 'To Do';
                                        return (
                                            <div key={a.id} className="flex justify-between items-center p-3 border-2 border-slate-50 rounded-lg bg-white shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border-2 border-slate-100">
                                                        <AvatarImage src={a.avatar} />
                                                        <AvatarFallback className="font-black text-[10px]">{a.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{a.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{a.role}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={cn(
                                                    "h-5 px-2 rounded-sm text-[9px] font-black tracking-widest uppercase border-2",
                                                    status === 'Done' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                )}>
                                                    {status}
                                                </Badge>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Deadline</Label>
                                    <Controller
                                        name="dueDate"
                                        control={form.control}
                                        render={({ field }) => (
                                            <DatePickerInput value={field.value} onChange={field.onChange} disabled={!canEditMetadata} />
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Priority Level</Label>
                                    <Controller
                                        name="priority"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!canEditMetadata}>
                                                <SelectTrigger className="h-10 bg-slate-50 border-slate-200 font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Low">Low</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>

                            {canEditMetadata && (
                                <Button type="submit" className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.1em] text-[11px] h-12 rounded-lg">
                                    UPDATE TASK METADATA
                                </Button>
                            )}
                        </form>
                    </div>

                    {/* RIGHT COLUMN: Interaction Log */}
                    <div className="w-full md:w-1/2 p-6 rounded-2xl bg-[#F8FAFC] border-2 border-slate-100 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-slate-400" />
                                <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                    Interaction Log
                                </h3>
                            </div>
                            <Badge variant="outline" className="font-black text-[9px] h-5 border-slate-200 text-slate-400 bg-white">
                                {commentsArray.length} ENTRIES
                            </Badge>
                        </div>

                        <ScrollArea className="flex-1 pr-4 mb-6">
                            <div className="space-y-6">
                                {commentsArray.map((c, index) => {
                                    const author = users.find(u => u.id === c.userId);
                                    return (
                                        <div key={c.id || index} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                                                <AvatarImage src={author?.avatar} />
                                                <AvatarFallback className="font-black text-xs">{author?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1.5 min-w-0">
                                                <div className="flex justify-between items-baseline gap-2">
                                                    <span className="font-black text-[#2563EB] text-[11px] uppercase tracking-wider">{author?.name}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold italic shrink-0">
                                                        {c.date ? formatDistanceToNow(new Date(c.date), { addSuffix: true }) : ''}
                                                    </span>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60">
                                                    <p className="text-[13px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{c.text}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>

                        <div className="relative mt-auto">
                            <Textarea 
                                placeholder="Add an update or reply..." 
                                className="bg-white border-2 border-slate-200 pr-14 min-h-[120px] text-sm font-bold focus-visible:ring-blue-100 rounded-xl shadow-sm" 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                            />
                            <Button 
                                size="icon" 
                                className="absolute right-3 bottom-3 h-9 w-9 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white shadow-lg transition-all disabled:bg-slate-300" 
                                onClick={handleAddComment} 
                                disabled={!newComment.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- FOOTER --- */}
        <DialogFooter className="p-4 bg-slate-50 border-t flex justify-between items-center w-full px-8 shrink-0">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-black uppercase tracking-widest text-[10px] h-10">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                        <AlertDialogDescription>This action will wipe all history and comments for this task. It cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-white font-bold">Confirm Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Button variant="outline" onClick={() => setIsOpen(false)} className="h-10 px-10 font-black uppercase tracking-[0.2em] border-2 text-[10px] hover:bg-white shadow-sm">
                Close Interface
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
