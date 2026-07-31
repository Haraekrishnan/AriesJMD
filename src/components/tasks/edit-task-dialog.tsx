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
import { format, formatDistanceToNow, startOfDay, parseISO, isValid } from 'date-fns';
import { CalendarIcon, Send, ThumbsUp, ThumbsDown, Paperclip, Upload, X, BellRing, CheckCircle, Clock, UserRoundCog, Trash2, ArrowRight, Check, ChevronsUpDown, Download, Archive, Undo2 } from 'lucide-react';
import type { Task, Priority, TaskStatus, Role, Comment, ApprovalState, Subtask } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Link from 'next/link';
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
  const { user, users, tasks, updateTask, deleteTask, archiveTask, unarchiveTask, getAssignableUsers, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment } = useAppContext();
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
  
    // Validate: required file missing
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
      // Step 1: Upload to Cloudinary if new file exists
      if (hasNewAttachment) {
        toast({
          title: 'Uploading file...',
          description: `Uploading ${attachment.name} to Cloudinary.`,
        });
  
        const url = await uploadFile(attachment, `tasks/${taskToDisplay.id}/${attachment.name}`);
        uploadedAttachment = {
          name: attachment.name,
          url: url,
        };
  
        toast({
          title: 'Upload Successful',
          description: `${attachment.name} uploaded successfully.`,
        });
      }
  
      let commentText = newComment.trim();
      if (!commentText) {
          if (newStatus === 'In Progress') commentText = 'Task started.';
          else if (newStatus === 'Done') commentText = 'Task completed.';
      }
  
      // Step 2: Proceed with status change
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
  
      toast({
        title: 'Status Updated',
        description: `Task marked as "${newStatus}".`,
      });
    } catch (error) {
      console.error('Error while changing task status:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update the task status. Please try again.',
      });
    }
  };
  
  const handleApprovalAction = (action: 'approve' | 'return') => {
    if (!newComment.trim()) {
        toast({ variant: 'destructive', title: 'Comment required', description: 'Please provide a comment for your decision.' });
        return;
    }
    if (action === 'approve') {
        approveTaskStatusChange(taskToDisplay.id, newComment);
    } else {
        returnTaskStatusChange(taskToDisplay.id, newComment);
        toast({ title: 'Task Returned', description: 'The task has been returned to the assignee.' });
    }
    setNewComment('');
    if (setIsOpen) setIsOpen(false);
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
        const newAssignee = users.find(u => u.id === newAssigneeId);
        if (!newAssignee) return;
        
        requestTaskReassignment(task.id, newAssigneeId, newComment);
        toast({ title: 'Reassignment Requested', description: 'Your request has been sent for approval.' });

    } else { 
        const updatedData: Partial<Task> = {
            ...data,
            dueDate: data.dueDate.toISOString(),
        };

        if (isAdmin && isCompleted) {
            updatedData.status = 'To Do';
            updatedData.completionDate = undefined;
            updatedData.approvalState = 'none';
        }
        updateTask({ ...taskToDisplay, ...updatedData });
        toast({ title: 'Task Updated', description: `"${data.title}" has been successfully updated.` });
    }
    
    setNewComment('');
    if (setIsOpen) setIsOpen(false);
  };

  const handleDeleteTask = () => {
    deleteTask(taskToDisplay.id);
    if (setIsOpen) setIsOpen(false);
  };
  
  const isApprover = useMemo(() => {
    if (!user) return false;
    return user.id === taskToDisplay.creatorId;
  }, [user, taskToDisplay]);


  const isAssignee = useMemo(() => user?.id && taskToDisplay.assigneeIds?.includes(user.id), [user, taskToDisplay]);
  const mySubtask = useMemo(() => user && taskToDisplay.subtasks?.[user.id], [user, taskToDisplay]);

  const renderActionButtons = () => {
    if (taskToDisplay.isArchived) {
        if (isAdmin || isCreator) {
            return (
                <Button onClick={() => { unarchiveTask(taskToDisplay.id); setIsOpen(false); }} variant="outline" className="w-full text-blue-600 border-blue-200">
                    <Undo2 className="mr-2 h-4 w-4" /> BRING BACK TO REOPEN
                </Button>
            );
        }
        return <p className="text-center text-xs font-bold text-muted-foreground uppercase bg-muted p-2 rounded">Task Archived</p>;
    }

    if (taskToDisplay.approvalState === 'status_pending') {
        if (isApprover) {
            return (
                <div className='flex gap-2'>
                    <Button onClick={() => handleApprovalAction('approve')} className="w-full bg-green-600 hover:bg-green-700"><ThumbsUp className="mr-2 h-4 w-4" /> Approve</Button>
                    <Button onClick={() => handleApprovalAction('return')} className="w-full" variant="destructive"><ThumbsDown className="mr-2 h-4 w-4" /> Return</Button>
                </div>
            )
        }
        return <p className='text-sm text-center text-muted-foreground p-2 bg-muted rounded-md'>Awaiting approval from {users.find(u => u.id === taskToDisplay.creatorId)?.name || 'manager'}</p>
    }
    if (isAssignee && !isCompleted) {
        if (mySubtask?.status === 'To Do') {
            return <Button onClick={() => handleRequestStatusChange('In Progress')} className="w-full">Mark as Started</Button>
        }
        if (mySubtask?.status === 'In Progress') {
            return <Button onClick={() => handleRequestStatusChange('Done')} className="w-full">Mark as Completed</Button>
        }
    }
    
    if (isCompleted && !taskToDisplay.isArchived) {
        return (
            <Button onClick={() => { archiveTask(taskToDisplay.id); setIsOpen(false); }} variant="outline" className="w-full">
                <Archive className="mr-2 h-4 w-4" /> Move to Archive
            </Button>
        )
    }

    return null;
  };

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
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[95vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            <div className="flex-1">
                <DialogTitle className="text-xl font-black uppercase tracking-tight">
                    {taskToDisplay.title}
                    {taskToDisplay.isArchived && <Badge className="ml-3 bg-slate-900 text-white font-black text-[10px] h-5 py-0 px-2 tracking-[0.2em] border-none">ARCHIVED</Badge>}
                </DialogTitle>
                <DialogDescription className="mt-1">
                    Created by <span className='font-semibold'>{creator?.name}</span> &middot; ID: <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1 rounded">{taskToDisplay.id.slice(-8).toUpperCase()}</span>
                </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
                <Badge variant={taskToDisplay.status === 'Done' ? 'success' : 'secondary'}>{taskToDisplay.status.toUpperCase()}</Badge>
                {taskToDisplay.completionDate && <span className="text-[9px] font-bold text-muted-foreground italic">DONE: {format(parseISO(taskToDisplay.completionDate), 'dd MMM')}</span>}
            </div>
          </div>
          {taskToDisplay.approvalState === 'status_pending' && (
             <Alert variant="default" className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <BellRing className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Approval Pending</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                    This task is awaiting final approval from the creator.
                </AlertDescription>
            </Alert>
          )}
           {taskToDisplay.status === 'Pending Approval' && taskToDisplay.pendingAssigneeId && (
            <Alert variant="default" className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <UserRoundCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Reassignment Request</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                   Request to reassign task to <span className='font-semibold'>{pendingAssignee?.name}</span>. Please review comments and approve or return.
                </AlertDescription>
            </Alert>
          )}
           {isAssignee && taskToDisplay.approvalState === 'returned' && (
            <Alert variant="destructive" className="mt-2">
                <BellRing className="h-4 w-4" />
                <AlertTitle>Task Returned</AlertTitle>
                <AlertDescription>
                  This task was returned by the approver. Please see comments for details and resubmit.
                </AlertDescription>
            </Alert>
          )}
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 flex-1 overflow-y-auto p-1">
            <div className="pr-4 space-y-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Title</Label>
                  <Input {...form.register('title')} placeholder="Task title" disabled={!canEditCoreFields} className="font-bold h-10 border-2" />
                </div>
                
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Full Description</Label>
                  <div className="p-4 text-sm min-h-[10rem] border-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 whitespace-pre-wrap leading-relaxed">
                      <LinkifiedText text={taskToDisplay.description} />
                  </div>
                </div>

                <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block" htmlFor="link">Reference Link / Folder</Label>
                    {canEditCoreFields ? (
                        <Input id="link" {...form.register('link')} disabled={!canEditCoreFields} placeholder="https://drive.google.com/..." className="h-9 text-xs" />
                    ) : (
                        taskToDisplay.link ? (
                             <div className="mt-1">
                                <Button asChild variant="secondary" size="sm" className="w-full justify-start h-10">
                                    <a href={taskToDisplay.link} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> OPEN REFERENCE FOLDER
                                    </a>
                                </Button>
                            </div>
                        ) : <p className="text-xs text-muted-foreground italic px-2">No reference link provided.</p>
                    )}
                    {form.formState.errors.link && <p className="text-xs text-destructive">{form.formState.errors.link.message}</p>}
                </div>


                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Current Assignees</Label>
                    <Controller
                        control={form.control}
                        name="assigneeIds"
                        render={({ field }) => (
                            <Popover modal={false}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-start h-auto min-h-12 text-left p-2 border-2" disabled={!canReassign}>
                                <div className="flex flex-wrap gap-1.5">
                                    {field.value.length > 0 ? (
                                    field.value.map(id => {
                                        const user = users.find(u => u.id === id);
                                        return (
                                            <Badge key={id} variant="secondary" className="h-7 px-2 font-bold flex items-center gap-1.5 border">
                                                <Avatar className="h-4 w-4">
                                                    <AvatarImage src={user?.avatar} />
                                                    <AvatarFallback>{user?.name[0]}</AvatarFallback>
                                                </Avatar>
                                                {user?.name}
                                            </Badge>
                                        )
                                    })
                                    ) : (
                                    <span className="text-muted-foreground font-medium">Select staff...</span>
                                    )}
                                </div>
                                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-[--radix-popover-trigger-width] p-0" 
                              align="start"
                              onWheel={(e) => e.stopPropagation()}
                            >
                                <Command>
                                <CommandInput placeholder="Search staff..." />
                                <CommandList className="max-h-72 overflow-y-auto">
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    <CommandGroup>
                                    {assignableUsers.map(option => {
                                        const isSelected = field.value.includes(option.value);
                                        const userOption = users.find(u => u.id === option.value);
                                        const isLocked = userOption?.status === 'locked';
                                        return (
                                        <CommandItem
                                            key={option.value}
                                            disabled={isLocked}
                                            onSelect={() => {
                                            if(isLocked) return;
                                            if (isSelected) {
                                                field.onChange(field.value.filter(id => id !== option.value));
                                            } else {
                                                field.onChange([...field.value, option.value]);
                                            }
                                            }}
                                            className={cn(isLocked && "text-muted-foreground cursor-not-allowed")}
                                        >
                                            <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                            <span className="font-bold">{option.label}</span>
                                            {isLocked && <Badge variant="destructive" className="ml-auto h-4 py-0 text-[8px] font-black">LOCKED</Badge>}
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
                     {form.formState.errors.assigneeIds && <p className="text-xs text-destructive">{form.formState.errors.assigneeIds.message}</p>}
                </div>
                
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Deadline</Label>
                    <Controller control={form.control} name="dueDate"
                        render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild disabled={!canEditDueDate}>
                            <Button variant="outline" className={cn('w-full justify-start text-left h-10 border-2 font-bold', !field.value && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'dd-MM-yyyy') : <span>Pick date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover>
                        )}
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Priority</Label>
                    <Controller control={form.control} name="priority"
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canEditCoreFields}>
                            <SelectTrigger className="h-10 border-2 font-bold uppercase tracking-tight"><SelectValue placeholder="Set priority" /></SelectTrigger>
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

                { (canEditCoreFields || canReassign) && <Button type="submit" className="w-full h-12 font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">Update Task Metadata</Button> }
              </form>
            </div>

            <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Interaction & History
                </h3>
                <ScrollArea className="flex-1 h-72 pr-4 border-2 rounded-xl bg-slate-50 dark:bg-slate-900/20 shadow-inner">
                    <div className="space-y-4 p-4">
                        {commentsArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((comment, index) => {
                            const commentUser = users.find(u => u.id === comment.userId);
                            return (
                                <div key={index} className={cn("flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2")}>
                                    <Avatar className="h-8 w-8 border shadow-sm">
                                        <AvatarImage src={commentUser?.avatar} />
                                        <AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border shadow-sm w-full">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-black text-[10px] uppercase text-primary tracking-widest">{commentUser?.name}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground">{formatDistanceToNow(new Date(comment.date), { addSuffix: true })}</p>
                                        </div>
                                        <p className="text-xs font-bold text-foreground leading-relaxed"><LinkifiedText text={comment.text} /></p>
                                    </div>
                                </div>
                            )
                        })}
                        {commentsArray.length === 0 && <p className="text-xs font-bold text-center text-muted-foreground/50 py-12 italic uppercase tracking-widest">No conversation history.</p>}
                    </div>
                </ScrollArea>
                
                {taskToDisplay.attachment && (
                  <div className="p-3 border-2 border-dashed rounded-xl bg-blue-50/30 dark:bg-blue-900/10">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-blue-600 block mb-2">Final Deliverable</Label>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 truncate">
                            <Paperclip className="h-4 w-4 text-blue-500 shrink-0"/>
                            <span className="text-xs font-bold truncate">{taskToDisplay.attachment.name}</span>
                        </div>
                        <Button asChild size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest border-2 shrink-0">
                             <a href={taskToDisplay.attachment.url} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-3.5 w-3.5" /> DOWNLOAD
                            </a>
                        </Button>
                    </div>
                  </div>
                )}
                
                {taskToDisplay.requiresAttachmentForCompletion && isAssignee && taskToDisplay.status === 'In Progress' && (
                  <div className="p-4 border-2 rounded-xl bg-muted/20 border-dashed">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Upload Deliverable</Label>
                    {!attachment && !taskToDisplay.attachment &&
                      <div className="relative">
                        <Button asChild variant="outline" className="w-full h-14 border-2 border-dashed hover:bg-muted font-bold text-xs uppercase tracking-widest">
                            <Label htmlFor="file-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-5 w-5"/> SELECT COMPLETION FILE
                            </Label>
                        </Button>
                        <Input id="file-upload" type="file" onChange={handleFileChange} className="hidden" accept=".jpg, .jpeg, .png, .pdf"/>
                      </div>
                    }
                    {attachment && (
                      <div className="flex items-center justify-between p-3 rounded-lg border-2 bg-card text-sm font-bold shadow-sm">
                          <div className="flex items-center gap-2 truncate">
                              <Paperclip className="h-4 w-4 text-primary"/>
                              <span className="truncate">{attachment.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setAttachment(null)}><X className="h-4 w-4"/></Button>
                      </div>
                    )}
                  </div>
                )}
                 <div className="relative group">
                    <Textarea 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        placeholder={isCompleted ? "Discussion closed..." : "Add to the log..."} 
                        className="pr-12 min-h-[80px] rounded-xl border-2 font-bold text-sm bg-muted/10 group-focus-within:bg-card transition-colors"
                        disabled={isCompleted && !isAdmin}
                    />
                    <Button 
                        type="button" 
                        size="icon" 
                        className="absolute right-2 bottom-2 h-9 w-9 bg-primary hover:bg-primary/90 shadow-lg active:scale-95 transition-all" 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim()}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <div className="pt-2">
                    {renderActionButtons()}
                </div>
            </div>
        </div>
        <DialogFooter className="justify-between pt-4 mt-auto border-t">
            <div className="flex gap-2">
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive font-black uppercase text-[10px] tracking-widest hover:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> DELETE TASK
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>This action will permanently delete the task and its entire history. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-white hover:bg-destructive/90">Delete Task</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Button variant="outline" className="font-bold text-[10px] uppercase tracking-widest" onClick={() => setIsOpen(false)}>CLOSE DETAILS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
