'use client';
import * as React from "react";
import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { CalendarIcon, Send, ThumbsUp, ThumbsDown, Paperclip, Upload, X, BellRing, CheckCircle, Clock, UserRoundCog, Trash2, ArrowRight, Check, ChevronsUpDown, Download, Archive, Undo2, MessageSquare } from 'lucide-react';
import type { Task, TaskStatus, Role, Comment } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

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

const statusVariantMap: Record<string, "success" | "secondary" | "default" | "destructive"> = {
  'Done': 'success',
  'To Do': 'secondary',
  'In Progress': 'default',
  'Pending Approval': 'secondary',
};

export default function EditTaskDialog({ isOpen, setIsOpen, task }: EditTaskDialogProps) {
  const { user, users, tasks, updateTask, deleteTask, addComment, markTaskAsViewed } = useAppContext();
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
  const canEdit = isCreator || isAdmin;

  useEffect(() => {
    if (taskToDisplay && isOpen) {
      form.reset({
        title: taskToDisplay.title,
        description: taskToDisplay.description,
        assigneeIds: taskToDisplay.assigneeIds || [],
        dueDate: new Date(taskToDisplay.dueDate),
        priority: taskToDisplay.priority,
        link: taskToDisplay.link || '',
      });
      setNewComment('');
      markTaskAsViewed(taskToDisplay.id);
    }
  }, [taskToDisplay, form, isOpen, markTaskAsViewed]);

  const onSubmit = (data: TaskFormValues) => {
    updateTask({ 
        ...taskToDisplay, 
        ...data, 
        dueDate: data.dueDate.toISOString(),
    });
    toast({ title: 'Changes Saved' });
    setIsOpen(false);
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
    setIsOpen(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    addComment(taskToDisplay.id, newComment);
    setNewComment('');
  };

  const commentsArray = useMemo(() => {
    const arr = Array.isArray(taskToDisplay.comments) 
      ? taskToDisplay.comments 
      : Object.values(taskToDisplay.comments || {});
    return [...arr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [taskToDisplay.comments]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <div className="p-6 border-b bg-muted/5">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
                Task Details: <span className="uppercase text-primary">{taskToDisplay.title}</span>
            </DialogTitle>
            <div className="flex justify-between items-center mt-2">
                <p className="text-xs font-semibold text-muted-foreground">
                    Assigned by <span className="font-bold text-foreground">{creator?.name}</span> to{' '}
                    <span className="font-bold text-foreground">{assignees.map(a => a.name).join(', ')}</span>
                </p>
                <Badge variant="outline" className="font-mono text-[10px] font-black uppercase tracking-widest text-blue-600 border-blue-200 bg-blue-50 px-2 py-0.5">
                    ID: {taskToDisplay.id.toUpperCase()}
                </Badge>
            </div>
        </div>

        <div className="flex-1 overflow-hidden grid md:grid-cols-[1fr,400px]">
            {/* LEFT COLUMN: EDIT FORM */}
            <ScrollArea className="p-6 border-r">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-bold text-sm">Title</Label>
                        <Input {...form.register('title')} disabled={!canEdit} className="h-11 border-2 focus-visible:ring-primary/20" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-sm">Description</Label>
                        <Textarea {...form.register('description')} disabled={!canEdit} rows={4} className="border-2 focus-visible:ring-primary/20 bg-muted/5" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-sm">Attachment</Label>
                        <Input {...form.register('link')} disabled={!canEdit} placeholder="Add link or file path..." className="border-2 bg-muted/5" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-sm">Assignee(s)</Label>
                        <div className="flex flex-wrap gap-2 p-2 border-2 rounded-md bg-muted/5">
                            {assignees.map(a => (
                                <Badge key={a.id} variant="secondary" className="flex items-center gap-1.5 h-7 px-2 font-bold shadow-sm border">
                                    <Avatar className="h-4 w-4">
                                        <AvatarImage src={a.avatar} />
                                        <AvatarFallback>{a.name[0]}</AvatarFallback>
                                    </Avatar>
                                    {a.name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* INDIVIDUAL ASSIGNEE STATUS */}
                    <div className="space-y-2">
                        <Label className="font-bold text-sm">Assignee Status</Label>
                        <div className="border-2 rounded-lg bg-card overflow-hidden">
                            {assignees.map((a) => {
                                const subtask = taskToDisplay.subtasks?.[a.id];
                                const status = subtask?.status || 'To Do';
                                return (
                                    <div key={a.id} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border-2">
                                                <AvatarImage src={a.avatar} />
                                                <AvatarFallback>{a.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-bold text-slate-800">{a.name}</span>
                                        </div>
                                        <Badge variant={statusVariantMap[status] || 'secondary'} className="h-6 px-3 uppercase text-[10px] font-black">
                                            {status}
                                        </Badge>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-sm">Due Date</Label>
                            <Controller control={form.control} name="dueDate"
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild disabled={!canEdit}>
                                            <Button variant="outline" className="w-full justify-start text-left h-10 border-2 font-bold">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover>
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-sm">Priority</Label>
                            <Controller control={form.control} name="priority"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                                        <SelectTrigger className="h-10 border-2 font-bold"><SelectValue placeholder="Set priority" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low" className="font-bold">Low</SelectItem>
                                            <SelectItem value="Medium" className="font-bold">Medium</SelectItem>
                                            <SelectItem value="High" className="font-bold text-destructive">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest active:scale-[0.98] transition-all shadow-md">
                        Save Changes
                    </Button>
                </form>
            </ScrollArea>

            {/* RIGHT COLUMN: CHAT HISTORY */}
            <div className="flex flex-col bg-muted/5 overflow-hidden">
                <div className="p-4 border-b bg-card">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" /> Comments & Activity
                    </h3>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">
                        {commentsArray.map((comment, index) => {
                            const author = users.find(u => u.id === comment.userId);
                            return (
                                <div key={index} className="flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-2">
                                    <Avatar className="h-9 w-9 border shadow-sm shrink-0">
                                        <AvatarImage src={author?.avatar} />
                                        <AvatarFallback>{author?.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 bg-white p-4 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="font-black text-[11px] uppercase text-primary tracking-widest">{author?.name}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground">{formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                                            {comment.text}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        {commentsArray.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                                <MessageSquare className="h-12 w-12" />
                                <p className="text-xs font-black uppercase tracking-widest">No conversation history</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-card">
                    <div className="relative">
                        <Textarea 
                            value={newComment} 
                            onChange={(e) => setNewComment(e.target.value)} 
                            placeholder="Add a comment... (required for status changes)" 
                            className="pr-12 min-h-[100px] border-2 rounded-xl text-sm font-semibold bg-white focus:bg-white transition-colors"
                        />
                        <Button 
                            type="button" 
                            size="icon" 
                            className="absolute right-3 bottom-3 h-8 w-8 bg-primary hover:bg-primary/90 shadow-md active:scale-90 transition-all rounded-lg" 
                            onClick={handleAddComment} 
                            disabled={!newComment.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t bg-muted/10 flex justify-end items-center gap-3">
            {isAdmin && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="h-9 px-4 font-black text-xs uppercase tracking-widest">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently erase this task and all its data. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <Button variant="outline" className="h-9 px-6 font-bold text-xs uppercase tracking-widest" onClick={() => setIsOpen(false)}>
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
