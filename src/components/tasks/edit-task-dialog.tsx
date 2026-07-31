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
import { uploadFile } from '@/lib/storage';

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

const urlRegex = /(https?:\/\/[^\s]+)/g;

const LinkifiedText = ({ text }: { text: string }) => {
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, index) =>
        urlRegex.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {part}
          </a>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export default function EditTaskDialog({ isOpen, setIsOpen, task }: EditTaskDialogProps) {
  const { user, users, tasks, updateTask, deleteTask, archiveTask, unarchiveTask, getAssignableUsers, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, requestTaskReassignment } = useAppContext();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const taskToDisplay = useMemo(() => tasks.find(t => t.id === task.id) || task, [tasks, task]);

  const creator = useMemo(() => users.find(u => u.id === taskToDisplay.creatorId), [users, taskToDisplay.creatorId]);
  const assignees = useMemo(() => users.filter(u => taskToDisplay.assigneeIds?.includes(u.id)), [users, taskToDisplay.assigneeIds]);
  const pendingAssignee = useMemo(() => users.find(u => u.id === taskToDisplay.pendingAssigneeId), [users, taskToDisplay.pendingAssigneeId]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });

  const isCompleted = taskToDisplay.status === 'Done';
  const isAdmin = user?.role === 'Admin';
  const isCreator = user?.id === taskToDisplay.creatorId;
  
  const canEditCoreFields = isCreator || isAdmin;
  const canEditDueDate = isCreator || isAdmin;
  const canReassign = (user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Supervisor' || user?.role === 'Senior Safety Supervisor' || user?.role === 'Store in Charge') && (!isCompleted || isAdmin);
  
  const assignableUsers = useMemo(() => {
    return getAssignableUsers().map(u => ({value: u.id, label: u.name}));
  }, [getAssignableUsers]);

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
      setAttachment(null);
      markTaskAsViewed(taskToDisplay.id);
    }
  }, [taskToDisplay, form, isOpen, markTaskAsViewed]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleRequestStatusChange = async (newStatus: TaskStatus) => {
    if (!user) return;
  
    const requiresAttachment = taskToDisplay.requiresAttachmentForCompletion;
    const hasExistingAttachment = !!taskToDisplay.attachment;
    const hasNewAttachment = !!attachment;
  
    if (newStatus === 'Done' && requiresAttachment && !hasExistingAttachment && !hasNewAttachment) {
      toast({
        variant: 'destructive',
        title: 'Attachment required',
        description: 'Please upload a file before marking this task as completed.',
      });
      return;
    }
  
    let uploadedAttachment: { name: string; url: string } | undefined = undefined;
  
    try {
      if (hasNewAttachment) {
        toast({ title: 'Uploading file...', description: `Uploading ${attachment.name} to Cloudinary.` });
        const url = await uploadFile(attachment, `tasks/${taskToDisplay.id}/${attachment.name}`);
        uploadedAttachment = { name: attachment.name, url };
        toast({ title: 'Upload Successful' });
      }
  
      let commentText = newComment.trim();
      if (!commentText) {
          if (newStatus === 'In Progress') commentText = 'Task started.';
          else if (newStatus === 'Done') commentText = 'Task completed.';
      }
  
      await requestTaskStatusChange(
        taskToDisplay.id,
        newStatus,
        commentText,
        uploadedAttachment || taskToDisplay.attachment || undefined
      );
  
      setAttachment(null);
      setNewComment('');
      if (newStatus !== 'In Progress') {
        setIsOpen(false);
      }
  
      toast({ title: 'Status Updated', description: `Task marked as "${newStatus}".` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not update task status.' });
    }
  };
  
  const handleApprovalAction = (action: 'approve' | 'return') => {
    if (!newComment.trim()) {
        toast({ variant: 'destructive', title: 'Comment required' });
        return;
    }
    if (action === 'approve') {
        approveTaskStatusChange(taskToDisplay.id, newComment);
    } else {
        returnTaskStatusChange(taskToDisplay.id, newComment);
    }
    setNewComment('');
    setIsOpen(false);
  };

  const onSubmit = (data: TaskFormValues) => {
    if (!user) return;
    const hasAssigneeChanged = JSON.stringify(data.assigneeIds.sort()) !== JSON.stringify(taskToDisplay.assigneeIds.sort());

    if (hasAssigneeChanged) {
        if (!newComment.trim()) {
            toast({ variant: 'destructive', title: 'Comment Required', description: 'A comment is required when reassigning a task.' });
            return;
        }
        const newAssigneeId = data.assigneeIds[0];
        requestTaskReassignment(task.id, newAssigneeId, newComment);
        toast({ title: 'Reassignment Requested' });
    } else { 
        updateTask({ 
            ...taskToDisplay, 
            ...data, 
            dueDate: data.dueDate.toISOString(),
            status: (isAdmin && isCompleted) ? 'To Do' : taskToDisplay.status,
            completionDate: (isAdmin && isCompleted) ? undefined : taskToDisplay.completionDate,
            approvalState: (isAdmin && isCompleted) ? 'none' : taskToDisplay.approvalState
        });
        toast({ title: 'Task Updated' });
    }
    
    setNewComment('');
    setIsOpen(false);
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
    setIsOpen(false);
  };
  
  const isAssignee = useMemo(() => user?.id && taskToDisplay.assigneeIds?.includes(user.id), [user, taskToDisplay]);

  const commentsArray = Array.isArray(taskToDisplay.comments) 
    ? taskToDisplay.comments 
    : Object.values(taskToDisplay.comments || {});

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    addComment(taskToDisplay.id, newComment);
    setNewComment('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[95vh] p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <div className="p-8 pb-4">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-2">
                        {taskToDisplay.title}
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                        Created by <span className="font-bold">{creator?.name}</span> &middot; ID: <span className="font-black text-blue-600 uppercase tracking-widest">{taskToDisplay.id.slice(-8).toUpperCase()}</span>
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <Badge variant="outline" className="bg-slate-50 text-slate-900 font-black border-2 text-[10px] tracking-widest px-3 py-1 uppercase">
                        {taskToDisplay.status === 'Done' ? 'COMPLETED' : taskToDisplay.status}
                    </Badge>
                </div>
            </div>
            {taskToDisplay.approvalState === 'status_pending' && (
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <BellRing className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-xs font-black uppercase tracking-widest text-blue-800">Approval Pending</AlertTitle>
                    <AlertDescription className="text-xs font-bold text-blue-700">Awaiting final approval from the creator.</AlertDescription>
                </Alert>
            )}
        </div>

        <div className="flex-1 overflow-hidden grid md:grid-cols-2 gap-0">
            {/* LEFT COLUMN: METADATA FORM */}
            <div className="p-8 pt-4 overflow-y-auto border-r bg-white">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title</Label>
                        <Input {...form.register('title')} disabled={!canEditCoreFields} className="font-bold h-11 border-2 focus-visible:ring-primary/20" />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Description</Label>
                        <div className="p-4 text-sm min-h-[10rem] border-2 rounded-lg bg-slate-50/50 whitespace-pre-wrap leading-relaxed font-medium">
                            <LinkifiedText text={taskToDisplay.description} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reference Link / Folder</Label>
                        <Input {...form.register('link')} disabled={!canEditCoreFields} placeholder="https://drive.google.com/..." className="h-10 border-2" />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Assignees</Label>
                        <Controller
                            control={form.control}
                            name="assigneeIds"
                            render={({ field }) => (
                                <Popover modal={false}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-auto min-h-12 text-left p-2 border-2" disabled={!canReassign}>
                                            <div className="flex flex-wrap gap-1.5">
                                                {field.value.length > 0 ? field.value.map(id => {
                                                    const user = users.find(u => u.id === id);
                                                    return (
                                                        <Badge key={id} variant="secondary" className="h-7 px-2 font-bold flex items-center gap-1.5 border shadow-sm">
                                                            <Avatar className="h-4 w-4 border shadow-inner">
                                                                <AvatarImage src={user?.avatar} />
                                                                <AvatarFallback>{user?.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            {user?.name}
                                                        </Badge>
                                                    )
                                                }) : <span className="text-muted-foreground font-medium">Select staff...</span>}
                                            </div>
                                            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                                        <Command>
                                            <CommandInput placeholder="Search staff..." />
                                            <CommandList className="max-h-72 overflow-y-auto">
                                                <CommandEmpty>No results found.</CommandEmpty>
                                                <CommandGroup>
                                                    {assignableUsers.map(option => {
                                                        const isSelected = field.value.includes(option.value);
                                                        const isLocked = users.find(u => u.id === option.value)?.status === 'locked';
                                                        return (
                                                            <CommandItem
                                                                key={option.value}
                                                                disabled={isLocked}
                                                                onSelect={() => {
                                                                    if (isLocked) return;
                                                                    field.onChange(isSelected ? field.value.filter(id => id !== option.value) : [...field.value, option.value]);
                                                                }}
                                                                className={cn(isLocked && "opacity-50")}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                                                {option.label}
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deadline</Label>
                            <Controller control={form.control} name="dueDate"
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild disabled={!canEditDueDate}>
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
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</Label>
                            <Controller control={form.control} name="priority"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEditCoreFields}>
                                        <SelectTrigger className="h-10 border-2 font-bold uppercase"><SelectValue placeholder="Set priority" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low" className="font-bold">LOW</SelectItem>
                                            <SelectItem value="Medium" className="font-bold">MEDIUM</SelectItem>
                                            <SelectItem value="High" className="font-bold text-destructive">HIGH</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    { (canEditCoreFields || canReassign) && (
                        <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all">
                            UPDATE TASK METADATA
                        </Button>
                    )}
                </form>
            </div>

            {/* RIGHT COLUMN: INTERACTION & HISTORY */}
            <div className="p-8 pt-4 flex flex-col gap-4 bg-slate-50/30">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> INTERACTION & HISTORY
                </h3>
                
                <ScrollArea className="flex-1 h-72 border-2 rounded-xl bg-slate-100/50 shadow-inner p-4">
                    <div className="space-y-4">
                        {commentsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((comment, index) => {
                            const author = users.find(u => u.id === comment.userId);
                            return (
                                <div key={index} className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <Avatar className="h-8 w-8 border shadow-sm shrink-0">
                                        <AvatarImage src={author?.avatar} />
                                        <AvatarFallback>{author?.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 bg-white p-3 rounded-xl border shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-black text-[10px] uppercase text-blue-600 tracking-widest">{author?.name}</span>
                                            <span className="text-[8px] font-bold text-slate-400">{formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-900 leading-tight">
                                            <LinkifiedText text={comment.text} />
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        {commentsArray.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-2">
                                <MessageSquare className="h-10 w-10 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No conversation history</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="relative group">
                    <Textarea 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        placeholder="Add to the log..." 
                        className="pr-12 min-h-[80px] rounded-xl border-2 font-bold text-sm bg-white focus:bg-white transition-colors"
                    />
                    <Button 
                        type="button" 
                        size="icon" 
                        className="absolute right-2 bottom-2 h-9 w-9 bg-blue-600 hover:bg-blue-700 shadow-md active:scale-90 transition-all" 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim()}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-2">
                    {taskToDisplay.approvalState === 'status_pending' && isApprover && (
                        <div className="flex gap-2">
                            <Button onClick={() => handleApprovalAction('approve')} className="flex-1 bg-green-600 hover:bg-green-700 font-bold uppercase text-[10px] tracking-widest"><ThumbsUp className="mr-2 h-3.5 w-3.5" /> APPROVE</Button>
                            <Button onClick={() => handleApprovalAction('return')} className="flex-1 font-bold uppercase text-[10px] tracking-widest" variant="destructive"><ThumbsDown className="mr-2 h-3.5 w-3.5" /> RETURN</Button>
                        </div>
                    )}
                    {isAssignee && !isCompleted && !taskToDisplay.isArchived && (
                        <Button onClick={() => handleRequestStatusChange(taskToDisplay.status === 'In Progress' ? 'Done' : 'In Progress')} className="w-full h-11 font-black uppercase tracking-widest bg-slate-900">
                            {taskToDisplay.status === 'In Progress' ? 'MARK AS COMPLETED' : 'START TASK'}
                        </Button>
                    )}
                </div>
            </div>
        </div>

        <DialogFooter className="p-4 px-8 border-t bg-slate-50/50 flex justify-between items-center">
            <div>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-red-600 font-black uppercase text-[10px] tracking-widest hover:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> DELETE TASK
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Task?</AlertDialogTitle><AlertDialogDescription>This will permanently erase all data. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600">Delete Permanently</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Button variant="outline" className="font-bold text-[10px] uppercase tracking-widest h-9" onClick={() => setIsOpen(false)}>CLOSE DETAILS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}